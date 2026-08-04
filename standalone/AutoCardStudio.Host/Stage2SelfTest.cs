using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoCardStudio.Host;

public static class Stage2SelfTest
{
    public static async Task<int> RunAsync()
    {
        var root = Path.Combine(Path.GetTempPath(), $"acs-stage2-test-{Guid.NewGuid():N}");
        var credentialId = Guid.NewGuid().ToString("D");
        var vault = new WindowsCredentialVault();
        try
        {
            var resources = new ResourceStore(root);
            await resources.InitializeAsync();
            var presetText = BuildPresetFixture();
            var resourceState = await resources.ImportPresetAsync(new ImportFileRequest("AUTO-test.json", presetText));
            if (resourceState.Preset?.PromptCount != 30 || resourceState.Regexes.Total != 1) return 20;
            var standaloneRegex = new JsonArray(new JsonObject
            {
                ["id"] = "standalone-regex",
                ["scriptName"] = "独立正则自检",
                ["findRegex"] = "/SECRET/g",
                ["replaceString"] = "",
                ["placement"] = new JsonArray(2),
            }).ToJsonString();
            resourceState = await resources.ImportRegexesAsync(new ImportFileRequest("regex-test.json", standaloneRegex));
            if (resourceState.Regexes.Total != 1 ||
                !Directory.EnumerateFiles(Path.Combine(root, "imports", "presets"), "*.json").Any() ||
                !Directory.EnumerateFiles(Path.Combine(root, "imports", "regexes"), "*.json").Any()) return 31;

            vault.Save(credentialId, "A.U.T.O 自检", "stage2-secret");
            if (vault.Read(credentialId) != "stage2-secret") return 21;
            vault.Delete(credentialId);
            if (vault.Exists(credentialId)) return 22;

            var connections = new ConnectionStore(root, vault);
            await connections.InitializeAsync();
            var connectionState = await connections.UpsertAsync(new UpsertConnectionRequest(
                1, credentialId, "自检连接", "openai", "https://mock.example/v1", "mock-model", "stream",
                new ModelParameters(100_000, 1024, 0.7, 0.9, null, null, null), 30, "stage2-secret"));
            var resolved = await connections.ResolveAsync();
            if (!connectionState.Profiles.Single().HasSecret || resolved.ApiKey != "stage2-secret") return 23;

            var projectStore = new ProjectStore(root);
            await projectStore.InitializeAsync();
            var initial = await projectStore.GetStateAsync();
            var userTurn = new StepTurn(Guid.NewGuid().ToString("D"), "user", "测试输入", DateTimeOffset.UtcNow);
            var step = await projectStore.AppendTurnAsync(initial.Project.Id, 1, initial.Step.Revision, userTurn);
            var reopened = new ProjectStore(root);
            await reopened.InitializeAsync();
            var restored = await reopened.GetStateAsync();
            if (step.Revision != 2 || restored.Step.Turns.Single().Content != "测试输入") return 24;
            var ready = await projectStore.UpdateProjectAsync(
                restored.Project.Id,
                new UpdateProjectRequest(restored.Project.Revision, Brief: "测试母题"));

            var preset = await resources.GetPresetAsync() ?? throw new InvalidDataException();
            var messages = PromptAssembler.Build(preset, ready.Project, ready.Step, 1, "继续", await resources.GetRegexesAsync());
            if (!messages.Any(message => message.Content.Contains("STEP-CONTENT-01", StringComparison.Ordinal)) ||
                messages.Any(message => message.Content.Contains("STEP-CONTENT-02", StringComparison.Ordinal))) return 25;

            var handler = new FakeModelHandler();
            var gateway = new ModelGateway(new HttpClient(handler));
            var deltas = new StringBuilder();
            var streamed = await gateway.GenerateAsync(resolved, [new PromptMessage("user", "hello")], delta => { deltas.Append(delta); return Task.CompletedTask; }, CancellationToken.None);
            if (streamed.Text != "流式成功" || deltas.ToString() != "流式成功") return 26;

            foreach (var provider in new[] { "openai", "anthropic", "gemini" })
            {
                var profile = resolved.Profile with { Provider = provider, OutputMode = "complete", ApiUrl = $"https://{provider}.example/v1" };
                var completion = await gateway.GenerateAsync(new ResolvedConnection(profile, "key"), [new PromptMessage("user", "hello")], _ => Task.CompletedTask, CancellationToken.None);
                if (completion.Text != $"{provider}-ok") return 27;
            }

            // 取消必须真正传递到网络层，避免“停止”只停界面、后台仍继续生成。
            var cancellableGateway = new ModelGateway(new HttpClient(new CancellableModelHandler()));
            using (var cancellation = new CancellationTokenSource(TimeSpan.FromMilliseconds(50)))
            {
                try
                {
                    await cancellableGateway.GenerateAsync(resolved, [new PromptMessage("user", "cancel")], _ => Task.CompletedTask, cancellation.Token);
                    return 28;
                }
                catch (OperationCanceledException) when (cancellation.IsCancellationRequested)
                {
                    // 预期路径。
                }
            }

            var generationId = Guid.NewGuid().ToString("D");
            var events = new List<GenerationEvent>();
            var userCommitted = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            var coordinator = new GenerationCoordinator(
                projectStore,
                resources,
                connections,
                new ModelGateway(new HttpClient(new CancellableModelHandler())),
                NullLogger<GenerationCoordinator>.Instance);
            var generationTask = coordinator.RunAsync(
                new GenerateStepRequest(generationId, ready.Project.Id, 1, ready.Step.Revision, "协调器取消测试"),
                generationEvent =>
                {
                    lock (events) events.Add(generationEvent);
                    if (generationEvent.Type == "user_committed") userCommitted.TrySetResult();
                    return Task.CompletedTask;
                },
                CancellationToken.None);
            await userCommitted.Task.WaitAsync(TimeSpan.FromSeconds(2));
            if (!coordinator.Cancel(generationId)) return 29;
            await generationTask.WaitAsync(TimeSpan.FromSeconds(2));
            lock (events)
            {
                if (!events.Any(item => item.Type == "cancelled") || events.Any(item => item.Type == "completed")) return 30;
            }

            await connections.DeleteAsync(resolved.Profile.Id, connectionState.Revision);
            Console.WriteLine("Stage 2 resource, credential, prompt, persistence and gateway self-tests passed.");
            return 0;
        }
        finally
        {
            try { vault.Delete(credentialId); } catch { }
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    private static string BuildPresetFixture()
    {
        var prompts = new JsonArray();
        var order = new JsonArray();
        var ids = AutoWorkflow.StepPromptIds.Append(AutoWorkflow.ReorganizationPromptId).ToList();
        for (var index = 0; index < ids.Count; index++)
        {
            prompts.Add(new JsonObject
            {
                ["identifier"] = ids[index],
                ["name"] = $"Step {index + 1}",
                ["role"] = "system",
                ["content"] = $"STEP-CONTENT-{index + 1:00}",
            });
            order.Add(new JsonObject { ["identifier"] = ids[index], ["enabled"] = true });
        }
        prompts.Add(new JsonObject { ["identifier"] = "orphan", ["content"] = "不能导入" });
        return new JsonObject
        {
            ["name"] = "A.U.T.O 自检预设",
            ["prompts"] = prompts,
            ["prompt_order"] = new JsonArray(new JsonObject { ["character_id"] = 100001, ["order"] = order }),
            ["openai_max_context"] = 100000,
            ["openai_max_tokens"] = 1024,
            ["extensions"] = new JsonObject
            {
                ["regex_scripts"] = new JsonArray(new JsonObject
                {
                    ["id"] = "test-regex",
                    ["scriptName"] = "自检正则",
                    ["findRegex"] = "/SECRET/g",
                    ["replaceString"] = "",
                    ["placement"] = new JsonArray(2),
                }),
            },
        }.ToJsonString();
    }

    private sealed class FakeModelHandler : HttpMessageHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var body = request.Content is null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken);
            if (body.Contains("\"stream\":true", StringComparison.Ordinal))
            {
                const string sse = "data: {\"choices\":[{\"delta\":{\"content\":\"流式\"},\"finish_reason\":null}]}\n\ndata: {\"choices\":[{\"delta\":{\"content\":\"成功\"},\"finish_reason\":\"stop\"}]}\n\ndata: [DONE]\n\n";
                return Response(sse, "text/event-stream");
            }
            if (request.RequestUri?.Host.StartsWith("anthropic", StringComparison.Ordinal) == true)
                return Response("{\"content\":[{\"type\":\"text\",\"text\":\"anthropic-ok\"}],\"stop_reason\":\"end_turn\"}");
            if (request.RequestUri?.Host.StartsWith("gemini", StringComparison.Ordinal) == true)
                return Response("{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"gemini-ok\"}]},\"finishReason\":\"STOP\"}]}");
            return Response("{\"choices\":[{\"message\":{\"content\":\"openai-ok\"},\"finish_reason\":\"stop\"}]}");
        }

        private static HttpResponseMessage Response(string content, string mediaType = "application/json") => new(HttpStatusCode.OK)
        {
            Content = new StringContent(content, Encoding.UTF8, mediaType),
        };
    }

    private sealed class CancellableModelHandler : HttpMessageHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken);
            throw new InvalidOperationException("取消令牌未能中止请求。");
        }
    }
}
