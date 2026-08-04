using System.Collections.Concurrent;
using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;

namespace AutoCardStudio.Host;

public sealed class GenerationCoordinator(
    ProjectStore projects,
    ResourceStore resources,
    ConnectionStore connections,
    ModelGateway gateway,
    ILogger<GenerationCoordinator> logger)
{
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _active = new(StringComparer.Ordinal);

    public bool Cancel(string generationId)
    {
        if (!_active.TryGetValue(generationId, out var source)) return false;
        source.Cancel();
        return true;
    }

    public async Task<PromptPreviewResponse> PreviewAsync(PromptPreviewRequest request)
    {
        var preset = await resources.GetPresetAsync()
            ?? throw new GenerationRejectedException("preset_required", "请先在设置中导入完整的 A.U.T.O 预设。");
        var regexes = await resources.GetRegexesAsync();
        var snapshot = await projects.GetGenerationSnapshotAsync(request.ProjectId, request.StepNumber);
        if (snapshot.Step.Revision != request.ExpectedStepRevision)
            throw new StepRevisionConflictException(snapshot.Step.Revision);

        var conversation = PromptAssembler.ActiveConversation(snapshot.Step);
        if (!string.IsNullOrWhiteSpace(request.ConversationId) && conversation.Id != request.ConversationId.Trim())
            throw new GenerationRejectedException("conversation_changed", "当前对话已经切换，请重新查看提示词。");

        var input = string.IsNullOrWhiteSpace(request.UserInput)
            ? $"请执行 Step {request.StepNumber}。"
            : request.UserInput.Trim();
        var messages = PromptAssembler.Build(preset, snapshot.Project, conversation.Turns, request.StepNumber, input, regexes);
        var items = messages.Select((message, index) => new PromptPreviewItem(
            index + 1,
            message.Role,
            message.Name ?? "未命名消息",
            message.Content,
            EstimateTokens(message.Content))).ToList();
        return new PromptPreviewResponse(conversation.Id, conversation.Name, items, items.Sum(item => item.EstimatedTokens));
    }

    public async Task RunAsync(GenerateStepRequest request, Func<GenerationEvent, Task> emit, CancellationToken clientCancellation)
    {
        var generationId = string.IsNullOrWhiteSpace(request.GenerationId) ? Guid.NewGuid().ToString("D") : request.GenerationId.Trim();
        using var cancellation = CancellationTokenSource.CreateLinkedTokenSource(clientCancellation);
        if (!_active.TryAdd(generationId, cancellation))
        {
            await emit(new GenerationEvent("failed", Code: "generation_exists", Message: "该生成任务已经在运行。"));
            return;
        }

        var timer = Stopwatch.StartNew();
        var draft = new StringBuilder();
        StepData? committedStep = null;
        var targetConversationId = request.ConversationId?.Trim() ?? string.Empty;
        var retryUserTurnId = request.RetryTurnId?.Trim();
        var retrying = !string.IsNullOrWhiteSpace(retryUserTurnId);
        try
        {
            var preset = await resources.GetPresetAsync() ?? throw new GenerationRejectedException("preset_required", "请先在设置中导入完整的 A.U.T.O 预设。");
            var regexes = await resources.GetRegexesAsync();
            var connection = await connections.ResolveAsync(request.ConnectionId);
            cancellation.CancelAfter(TimeSpan.FromSeconds(connection.Profile.TimeoutSeconds));

            var snapshot = await projects.GetGenerationSnapshotAsync(request.ProjectId, request.StepNumber);
            if (snapshot.Step.Revision != request.ExpectedStepRevision)
                throw new StepRevisionConflictException(snapshot.Step.Revision);
            var conversation = PromptAssembler.ActiveConversation(snapshot.Step);
            if (string.IsNullOrWhiteSpace(targetConversationId)) targetConversationId = conversation.Id;
            if (snapshot.Step.ActiveConversationId != targetConversationId)
                throw new GenerationRejectedException("conversation_changed", "当前对话已经切换，请重新发送。");
            if (request.StepNumber == 1 && string.IsNullOrWhiteSpace(snapshot.Project.Brief))
                throw new GenerationRejectedException("brief_required", "请先写下一两句创作母题，再开始第一阶段。");

            IReadOnlyList<StepTurn> history = conversation.Turns;
            string userInput;
            if (retrying)
            {
                var latestUser = conversation.Turns.LastOrDefault(turn => turn.Role == "user");
                if (latestUser?.Id != retryUserTurnId)
                    throw new GenerationRejectedException("retry_not_latest", "只能重试当前对话中最新的用户输入。");
                var userIndex = conversation.Turns.ToList().FindIndex(turn => turn.Id == retryUserTurnId);
                history = conversation.Turns.Take(userIndex).ToList();
                userInput = latestUser!.Content;
            }
            else
            {
                userInput = string.IsNullOrWhiteSpace(request.UserInput)
                    ? $"请执行 Step {request.StepNumber}。"
                    : request.UserInput.Trim();
            }
            var messages = PromptAssembler.Build(preset, snapshot.Project, history, request.StepNumber, userInput, regexes);
            EnsureContextBudget(messages, connection.Profile.Parameters);

            if (retrying)
            {
                committedStep = snapshot.Step;
                await emit(new GenerationEvent("retry_started", generationId, ConversationId: targetConversationId, StepRevision: committedStep.Revision));
            }
            else
            {
                var userTurn = new StepTurn(Guid.NewGuid().ToString("D"), "user", userInput, DateTimeOffset.UtcNow);
                committedStep = await projects.AppendTurnAsync(request.ProjectId, request.StepNumber, targetConversationId, snapshot.Step.Revision, userTurn);
                await emit(new GenerationEvent("user_committed", generationId, Turn: userTurn, ConversationId: targetConversationId, StepRevision: committedStep.Revision));
            }

            logger.LogInformation(
                "Generation {GenerationId} started for project {ProjectId}, step {Step}, provider {Provider}, model {Model}, messages {MessageCount}",
                generationId, request.ProjectId, request.StepNumber, connection.Profile.Provider, connection.Profile.Model, messages.Count);

            var completion = await gateway.GenerateAsync(connection, messages, async delta =>
            {
                draft.Append(delta);
                await emit(new GenerationEvent("chunk", generationId, Delta: delta));
            }, cancellation.Token);

            var content = ProcessResponse(completion.Text, regexes, "display");
            var assistantTurn = new StepTurn(Guid.NewGuid().ToString("D"), "assistant", content, DateTimeOffset.UtcNow, completion.Text);
            committedStep = retrying
                ? await projects.CompleteRetryAsync(request.ProjectId, request.StepNumber, targetConversationId, retryUserTurnId!, committedStep.Revision, assistantTurn)
                : await projects.AppendTurnAsync(request.ProjectId, request.StepNumber, targetConversationId, committedStep.Revision, assistantTurn);
            await emit(new GenerationEvent("completed", generationId, Turn: assistantTurn, ConversationId: targetConversationId, StepRevision: committedStep.Revision, FinishReason: completion.FinishReason));
            logger.LogInformation(
                "Generation {GenerationId} completed in {ElapsedMs} ms, response hash {ResponseHash}",
                generationId, timer.ElapsedMilliseconds, Fingerprint(completion.Text));
        }
        catch (OperationCanceledException)
        {
            if (draft.Length > 0 && committedStep is not null)
            {
                try
                {
                    var regexes = await resources.GetRegexesAsync();
                    var raw = draft.ToString();
                    var partial = new StepTurn(Guid.NewGuid().ToString("D"), "assistant", ProcessResponse(raw, regexes, "display"), DateTimeOffset.UtcNow, raw, "cancelled_partial");
                    committedStep = retrying
                        ? await projects.CompleteRetryAsync(request.ProjectId, request.StepNumber, targetConversationId, retryUserTurnId!, committedStep.Revision, partial)
                        : await projects.AppendTurnAsync(request.ProjectId, request.StepNumber, targetConversationId, committedStep.Revision, partial);
                    await emit(new GenerationEvent("cancelled", generationId, Turn: partial, ConversationId: targetConversationId, StepRevision: committedStep.Revision, Message: "生成已停止，已保存收到的部分内容。"));
                }
                catch (Exception saveError)
                {
                    logger.LogWarning(saveError, "Generation {GenerationId} partial response could not be saved", generationId);
                    await emit(new GenerationEvent("cancelled", generationId, Message: "生成已停止，部分草稿未能保存。"));
                }
            }
            else
            {
                await emit(new GenerationEvent("cancelled", generationId, ConversationId: targetConversationId, StepRevision: committedStep?.Revision, Message: "生成已停止。"));
            }
        }
        catch (StepRevisionConflictException conflict)
        {
            await emit(new GenerationEvent("failed", generationId, Code: "step_revision_conflict", Message: "当前步骤已在其他页面变化，请重新载入。", StepRevision: conflict.CurrentRevision));
        }
        catch (GenerationRejectedException rejected)
        {
            await emit(new GenerationEvent("failed", generationId, Code: rejected.Code, Message: rejected.Message));
        }
        catch (ModelGatewayException gatewayError)
        {
            logger.LogWarning(
                "Generation {GenerationId} failed with {Code}, HTTP {Status}, retryable {Retryable}",
                generationId, gatewayError.Code, gatewayError.HttpStatus, gatewayError.Retryable);
            await emit(new GenerationEvent("failed", generationId, Code: gatewayError.Code, Message: gatewayError.Message, StepRevision: committedStep?.Revision, Retryable: gatewayError.Retryable));
        }
        catch (Exception error)
        {
            logger.LogError(error, "Generation {GenerationId} failed unexpectedly", generationId);
            await emit(new GenerationEvent("failed", generationId, Code: "generation_failed", Message: "生成失败，请检查连接设置后重试。", StepRevision: committedStep?.Revision));
        }
        finally
        {
            _active.TryRemove(generationId, out _);
        }
    }

    private static void EnsureContextBudget(IReadOnlyList<PromptMessage> messages, ModelParameters parameters)
    {
        // 当前阶段没有供应商 tokenizer，中文按约 3 字符/token 保守估算并明确作为估算值。
        var inputTokens = messages.Sum(message => EstimateTokens(message.Content));
        var outputTokens = Math.Max(0, (int)(parameters.MaxCompletionTokens ?? 0));
        if (inputTokens + outputTokens > parameters.MaxContextTokens)
            throw new GenerationRejectedException("context_limit", $"预计需要 {inputTokens + outputTokens:N0} tokens，超过当前设置的 {parameters.MaxContextTokens:N0} tokens 上限。");
    }

    private static int EstimateTokens(string content) => Math.Max(1, (Encoding.UTF8.GetByteCount(content) + 5) / 6);

    private static string ProcessResponse(string raw, IReadOnlyList<StudioRegex> regexes, string destination)
    {
        var output = ResponseRegexProcessor.Process(raw, regexes, "output");
        return ResponseRegexProcessor.Process(output, regexes, destination);
    }

    private static string Fingerprint(string content) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(content)))[..16];
}

public static class PromptAssembler
{
    private const string MacroGuard = "角色卡模板变量 {{char}} 与 {{user}} 必须原样保留；它们是最终角色卡运行时模板，不代表当前创作台中的真实姓名。";

    public static IReadOnlyList<PromptMessage> Build(
        ImportedPreset preset,
        StudioProject project,
        IReadOnlyList<StepTurn> conversationTurns,
        int stepNumber,
        string userInput,
        IReadOnlyList<StudioRegex> regexes)
    {
        var currentPromptId = AutoWorkflow.StepPromptIds[stepNumber - 1];
        var messages = new List<PromptMessage> { new("system", MacroGuard, "角色卡模板变量保护") };
        foreach (var prompt in preset.Prompts.OrderBy(prompt => prompt.Order))
        {
            if (AutoWorkflow.PlaceholderIds.Contains(prompt.Id)) continue;
            var workflowPrompt = AutoWorkflow.WorkflowPromptIds.Contains(prompt.Id);
            if (workflowPrompt && prompt.Id != currentPromptId) continue;
            if (!workflowPrompt && !prompt.Enabled) continue;
            if (string.IsNullOrWhiteSpace(prompt.Content)) continue;
            messages.Add(new PromptMessage(prompt.Role, prompt.Content, prompt.Name));
        }

        messages.Add(new PromptMessage("user", BuildProjectContext(project, stepNumber), "项目上下文"));
        foreach (var turn in conversationTurns)
        {
            var content = turn.Role == "assistant" && !string.IsNullOrEmpty(turn.RawContent)
                ? ProcessForPrompt(turn.RawContent, regexes)
                : turn.Content;
            if (!string.IsNullOrWhiteSpace(content)) messages.Add(new PromptMessage(turn.Role == "assistant" ? "assistant" : "user", content, "当前会话"));
        }
        messages.Add(new PromptMessage("user", userInput, "本轮输入"));
        return messages;
    }

    public static StepConversation ActiveConversation(StepData step) =>
        step.Conversations.FirstOrDefault(item => item.Id == step.ActiveConversationId)
        ?? step.Conversations.FirstOrDefault()
        ?? throw new InvalidDataException("当前步骤没有可用对话。");

    private static string BuildProjectContext(StudioProject project, int stepNumber) => $"""
        <STUDIO_PROJECT_CONTEXT>
        # 项目
        名称：{project.Name}

        # 创作母题
        {project.Brief}

        # 当前任务
        请执行 Step {stepNumber}，延续同一步骤内已经提交的对话；不要把过程说明伪装成已经确认的正式事实。
        </STUDIO_PROJECT_CONTEXT>
        """;

    private static string ProcessForPrompt(string raw, IReadOnlyList<StudioRegex> regexes)
    {
        var output = ResponseRegexProcessor.Process(raw, regexes, "output");
        return ResponseRegexProcessor.Process(output, regexes, "prompt");
    }
}

public sealed record GenerateStepRequest(
    string GenerationId,
    string ProjectId,
    int StepNumber,
    long ExpectedStepRevision,
    string UserInput,
    string? ConnectionId = null,
    string? ConversationId = null,
    string? RetryTurnId = null);

public sealed record PromptPreviewRequest(
    string ProjectId,
    int StepNumber,
    long ExpectedStepRevision,
    string UserInput,
    string? ConversationId = null);

public sealed record PromptPreviewItem(int Index, string Role, string Name, string Content, int EstimatedTokens);

public sealed record PromptPreviewResponse(
    string ConversationId,
    string ConversationName,
    IReadOnlyList<PromptPreviewItem> Messages,
    int EstimatedTokens);

public sealed record GenerationEvent(
    string Type,
    string? GenerationId = null,
    string? Delta = null,
    StepTurn? Turn = null,
    string? ConversationId = null,
    long? StepRevision = null,
    string? Code = null,
    string? Message = null,
    bool? Retryable = null,
    string? FinishReason = null);

public sealed class GenerationRejectedException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}
