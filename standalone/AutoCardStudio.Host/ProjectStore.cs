using System.Text.Json.Serialization;

namespace AutoCardStudio.Host;

public sealed class ProjectStore
{
    private const int SchemaVersion = 3;
    private readonly string _dataRoot;
    private readonly string _projectsRoot;
    private readonly string _trashRoot;
    private readonly string _indexPath;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly AtomicJsonFile _files = new();

    public ProjectStore(string dataRoot)
    {
        _dataRoot = Path.GetFullPath(dataRoot);
        _projectsRoot = Path.Combine(_dataRoot, "projects");
        _trashRoot = Path.Combine(_dataRoot, "trash", "projects");
        _indexPath = Path.Combine(_projectsRoot, "index.json");
    }

    public async Task InitializeAsync()
    {
        await _gate.WaitAsync();
        try
        {
            Directory.CreateDirectory(_projectsRoot);
            Directory.CreateDirectory(_trashRoot);

            var index = await _files.ReadRecoverableAsync<AppIndex>(_indexPath);
            if (index is null)
            {
                var project = await CreateProjectFilesAsync("未命名项目");
                index = BuildIndex(project, [project]);
                await _files.WriteAtomicAsync(_indexPath, index);
                return;
            }

            var projects = new List<StudioProject>();
            foreach (var summary in index.Projects)
            {
                var project = await _files.ReadRecoverableAsync<StudioProject>(ProjectPath(summary.Id));
                if (project is not null) projects.Add(NormalizeProject(project));
            }

            if (projects.Count == 0)
            {
                var project = await CreateProjectFilesAsync("未命名项目");
                projects.Add(project);
            }

            var active = projects.FirstOrDefault(project => project.Id == index.ActiveProjectId) ?? projects[0];
            await _files.WriteAtomicAsync(_indexPath, BuildIndex(active, projects));
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<StudioState> GetStateAsync(string? projectId = null)
    {
        await _gate.WaitAsync();
        try
        {
            var index = await RequireIndexAsync();
            var targetId = string.IsNullOrWhiteSpace(projectId) ? index.ActiveProjectId : projectId;
            var project = await RequireProjectAsync(targetId);
            return new StudioState(index, project, await RequireStepAsync(project.Id, project.CurrentStep));
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<StudioState> CreateProjectAsync(string? requestedName)
    {
        await _gate.WaitAsync();
        try
        {
            var index = await RequireIndexAsync();
            var name = UniqueName(NormalizeName(requestedName), index.Projects.Select(project => project.Name));
            var project = await CreateProjectFilesAsync(name);
            var projects = await LoadProjectsAsync(index);
            projects.Add(project);
            var nextIndex = BuildIndex(project, projects);
            await _files.WriteAtomicAsync(_indexPath, nextIndex);
            return new StudioState(nextIndex, project, await RequireStepAsync(project.Id, project.CurrentStep));
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<StudioState> UpdateProjectAsync(string projectId, UpdateProjectRequest request)
    {
        await _gate.WaitAsync();
        try
        {
            var index = await RequireIndexAsync();
            var current = await RequireProjectAsync(projectId);
            EnsureRevision(current, request.ExpectedRevision);

            var projects = await LoadProjectsAsync(index);
            var otherNames = projects.Where(project => project.Id != projectId).Select(project => project.Name);
            var nextName = request.Name is null ? current.Name : UniqueName(NormalizeName(request.Name), otherNames);
            var nextBrief = request.Brief is null ? current.Brief : request.Brief.Trim().Length > 20000 ? request.Brief.Trim()[..20000] : request.Brief.Trim();
            var nextStep = request.CurrentStep is null ? current.CurrentStep : Math.Clamp(request.CurrentStep.Value, 1, 29);
            var now = DateTimeOffset.UtcNow;
            var updated = current with
            {
                Name = nextName,
                Brief = nextBrief,
                CurrentStep = nextStep,
                IncludeFutureArtifacts = request.IncludeFutureArtifacts ?? current.IncludeFutureArtifacts,
                Revision = current.Revision + 1,
                UpdatedAt = now,
            };

            await _files.WriteAtomicAsync(ProjectPath(projectId), updated);
            projects = projects.Select(project => project.Id == projectId ? updated : project).ToList();
            var nextIndex = BuildIndex(updated, projects);
            await _files.WriteAtomicAsync(_indexPath, nextIndex);
            return new StudioState(nextIndex, updated, await RequireStepAsync(updated.Id, updated.CurrentStep));
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<StudioState> ActivateProjectAsync(string projectId)
    {
        await _gate.WaitAsync();
        try
        {
            var index = await RequireIndexAsync();
            var project = await RequireProjectAsync(projectId);
            var projects = await LoadProjectsAsync(index);
            var nextIndex = BuildIndex(project, projects);
            await _files.WriteAtomicAsync(_indexPath, nextIndex);
            return new StudioState(nextIndex, project, await RequireStepAsync(project.Id, project.CurrentStep));
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<StudioState> DeleteProjectAsync(string projectId, long expectedRevision)
    {
        await _gate.WaitAsync();
        try
        {
            var index = await RequireIndexAsync();
            var project = await RequireProjectAsync(projectId);
            EnsureRevision(project, expectedRevision);

            var sourceDirectory = ProjectDirectory(projectId);
            var trashName = $"{DateTimeOffset.UtcNow:yyyyMMdd-HHmmss}-{projectId}";
            var trashDirectory = Path.Combine(_trashRoot, trashName);
            Directory.Move(sourceDirectory, trashDirectory);

            var projects = (await LoadProjectsAsync(index)).Where(item => item.Id != projectId).ToList();
            if (projects.Count == 0)
            {
                projects.Add(await CreateProjectFilesAsync("未命名项目"));
            }

            var active = projects.FirstOrDefault(item => item.Id == index.ActiveProjectId) ?? projects[0];
            var nextIndex = BuildIndex(active, projects);
            await _files.WriteAtomicAsync(_indexPath, nextIndex);
            return new StudioState(nextIndex, active, await RequireStepAsync(active.Id, active.CurrentStep));
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<ProjectTransferBundle> ExportProjectAsync(string projectId)
    {
        await _gate.WaitAsync();
        try
        {
            var project = await RequireProjectAsync(projectId);
            var steps = new List<StepData>();
            for (var number = 1; number <= 29; number++) steps.Add(await RequireStepAsync(projectId, number));
            var artifacts = await _files.ReadRecoverableAsync<ArtifactVault>(Path.Combine(ProjectDirectory(projectId), "artifacts.json"));
            var selection = await _files.ReadRecoverableAsync<ReferenceProjectSelection>(Path.Combine(ProjectDirectory(projectId), "reference-worldbooks.json"));
            var libraryPath = Path.Combine(_dataRoot, "resources", "reference-worldbooks", "library.json");
            var library = await _files.ReadRecoverableAsync<ReferenceWorldbookLibrary>(libraryPath);
            var selectedBookIds = selection?.Books.Keys.ToHashSet(StringComparer.Ordinal) ?? [];
            var referenceBooks = (library?.Books ?? []).Where(book => selectedBookIds.Contains(book.Id)).ToList();
            return new ProjectTransferBundle(
                "auto-card-studio-project",
                1,
                DateTimeOffset.UtcNow,
                project,
                steps,
                artifacts,
                selection,
                referenceBooks);
        }
        finally { _gate.Release(); }
    }

    public async Task<StudioState> ImportProjectAsync(ProjectTransferBundle bundle)
    {
        if (bundle is null || bundle.Project is null || bundle.Steps is null || bundle.Format != "auto-card-studio-project" || bundle.SchemaVersion != 1)
            throw new InvalidDataException("不是受支持的 A.U.T.O 独立版项目文件。");
        if (bundle.Steps.Count != 29 || bundle.Steps.Any(step => step is null) || !bundle.Steps.Select(step => step.Number).ToHashSet().SetEquals(Enumerable.Range(1, 29)))
            throw new InvalidDataException("项目文件必须包含完整的 29 个创作步骤。");

        await _gate.WaitAsync();
        string? temporaryDirectory = null;
        string? finalDirectory = null;
        try
        {
            var index = await RequireIndexAsync();
            var projects = await LoadProjectsAsync(index);
            var newId = Guid.NewGuid().ToString("D");
            var now = DateTimeOffset.UtcNow;
            var importedName = UniqueName($"{NormalizeName(bundle.Project.Name)}（导入）", projects.Select(item => item.Name));
            var importedBrief = bundle.Project.Brief ?? string.Empty;
            if (importedBrief.Length > 20000) importedBrief = importedBrief[..20000];
            var imported = new StudioProject(
                newId,
                importedName,
                importedBrief,
                Math.Clamp(bundle.Project.CurrentStep, 1, 29),
                1,
                now,
                now,
                bundle.Project.IncludeFutureArtifacts);

            temporaryDirectory = Path.Combine(_projectsRoot, $".import-{Guid.NewGuid():N}.tmp");
            finalDirectory = ProjectDirectory(newId);
            Directory.CreateDirectory(Path.Combine(temporaryDirectory, "steps"));
            await _files.WriteAtomicAsync(Path.Combine(temporaryDirectory, "project.json"), imported);
            foreach (var source in bundle.Steps.OrderBy(step => step.Number))
            {
                var normalized = NormalizeStep(source, source.Number);
                await _files.WriteAtomicAsync(Path.Combine(temporaryDirectory, "steps", $"{source.Number:00}.json"), normalized);
            }

            if (bundle.Artifacts is not null)
            {
                var artifacts = bundle.Artifacts with { ProjectId = newId, Revision = Math.Max(1, bundle.Artifacts.Revision), UpdatedAt = now };
                await _files.WriteAtomicAsync(Path.Combine(temporaryDirectory, "artifacts.json"), artifacts);
            }

            var (books, selection) = await MergeImportedReferenceBooksUnsafeAsync(bundle.ReferenceBooks ?? [], bundle.ReferenceSelection, now);
            if (selection is not null)
                await _files.WriteAtomicAsync(Path.Combine(temporaryDirectory, "reference-worldbooks.json"), selection);

            Directory.Move(temporaryDirectory, finalDirectory);
            temporaryDirectory = null;
            if (books is not null)
            {
                var libraryPath = Path.Combine(_dataRoot, "resources", "reference-worldbooks", "library.json");
                await _files.WriteAtomicAsync(libraryPath, books);
            }

            projects.Add(imported);
            var nextIndex = BuildIndex(imported, projects);
            await _files.WriteAtomicAsync(_indexPath, nextIndex);
            return new StudioState(nextIndex, imported, await RequireStepAsync(newId, imported.CurrentStep));
        }
        catch
        {
            if (temporaryDirectory is not null && Directory.Exists(temporaryDirectory)) Directory.Delete(temporaryDirectory, true);
            if (finalDirectory is not null && Directory.Exists(finalDirectory)) Directory.Delete(finalDirectory, true);
            throw;
        }
        finally { _gate.Release(); }
    }

    private async Task<(ReferenceWorldbookLibrary? Library, ReferenceProjectSelection? Selection)> MergeImportedReferenceBooksUnsafeAsync(
        IReadOnlyList<ReferenceWorldbook> importedBooks,
        ReferenceProjectSelection? importedSelection,
        DateTimeOffset now)
    {
        if (importedSelection is null) return (null, null);
        var libraryPath = Path.Combine(_dataRoot, "resources", "reference-worldbooks", "library.json");
        var current = await _files.ReadRecoverableAsync<ReferenceWorldbookLibrary>(libraryPath)
            ?? new ReferenceWorldbookLibrary(1, [], now);
        var books = current.Books.ToList();
        var idMap = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var imported in importedBooks)
        {
            var existing = books.FirstOrDefault(book => book.SourceSha256 == imported.SourceSha256);
            if (existing is not null)
            {
                idMap[imported.Id] = existing.Id;
                continue;
            }
            var id = books.Any(book => book.Id == imported.Id) ? Guid.NewGuid().ToString("D") : imported.Id;
            books.Add(imported with { Id = id, ImportedAt = now });
            idMap[imported.Id] = id;
        }

        var selections = new Dictionary<string, ReferenceBookSelection>(StringComparer.Ordinal);
        foreach (var pair in importedSelection.Books)
        {
            if (idMap.TryGetValue(pair.Key, out var mappedId)) selections[mappedId] = pair.Value;
            else if (books.Any(book => book.Id == pair.Key)) selections[pair.Key] = pair.Value;
        }
        var changed = books.Count != current.Books.Count;
        var library = changed ? new ReferenceWorldbookLibrary(current.Revision + 1, books, now) : current;
        return (library, new ReferenceProjectSelection(1, selections, now));
    }

    public async Task<GenerationSnapshot> GetGenerationSnapshotAsync(string projectId, int stepNumber)
    {
        await _gate.WaitAsync();
        try
        {
            var project = await RequireProjectAsync(projectId);
            var step = await RequireStepAsync(projectId, stepNumber);
            return new GenerationSnapshot(project, step);
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<StepData> CreateConversationAsync(string projectId, int stepNumber, ConversationMutationRequest request)
    {
        await _gate.WaitAsync();
        try
        {
            return await MutateStepUnsafeAsync(projectId, stepNumber, request.ExpectedRevision, current =>
            {
                var now = DateTimeOffset.UtcNow;
                var conversation = NewConversation(NormalizeConversationName(request.Name, NextConversationName(current)), now);
                return CopyStep(current,
                    activeConversationId: conversation.Id,
                    conversations: current.Conversations.Append(conversation).ToList());
            });
        }
        finally { _gate.Release(); }
    }

    public async Task<StepData> ActivateConversationAsync(string projectId, int stepNumber, string conversationId, long expectedRevision)
    {
        await _gate.WaitAsync();
        try
        {
            return await MutateStepUnsafeAsync(projectId, stepNumber, expectedRevision, current =>
            {
                RequireConversation(current, conversationId);
                return CopyStep(current, activeConversationId: conversationId);
            });
        }
        finally { _gate.Release(); }
    }

    public async Task<StepData> RenameConversationAsync(string projectId, int stepNumber, string conversationId, ConversationMutationRequest request)
    {
        await _gate.WaitAsync();
        try
        {
            return await MutateStepUnsafeAsync(projectId, stepNumber, request.ExpectedRevision, current =>
            {
                var target = RequireConversation(current, conversationId);
                var name = NormalizeConversationName(request.Name, null);
                var updated = target with { Name = name, UpdatedAt = DateTimeOffset.UtcNow };
                return CopyStep(current, conversations: ReplaceConversation(current, updated));
            });
        }
        finally { _gate.Release(); }
    }

    public async Task<StepData> DeleteConversationAsync(string projectId, int stepNumber, string conversationId, long expectedRevision)
    {
        await _gate.WaitAsync();
        try
        {
            return await MutateStepUnsafeAsync(projectId, stepNumber, expectedRevision, current =>
            {
                if (current.Conversations.Count <= 1) throw new InvalidOperationException("每个步骤至少保留一个对话，可以改用“清空对话”。");
                var index = current.Conversations.ToList().FindIndex(item => item.Id == conversationId);
                if (index < 0) throw new KeyNotFoundException("对话不存在。");
                var conversations = current.Conversations.Where(item => item.Id != conversationId).ToList();
                var activeId = current.ActiveConversationId == conversationId
                    ? conversations[Math.Min(index, conversations.Count - 1)].Id
                    : current.ActiveConversationId;
                var status = conversations.Any(item => item.Turns.Count > 0) ? current.Status : "idle";
                return CopyStep(current, status: status, activeConversationId: activeId, conversations: conversations);
            });
        }
        finally { _gate.Release(); }
    }

    public async Task<StepData> ClearConversationAsync(string projectId, int stepNumber, string conversationId, long expectedRevision)
    {
        await _gate.WaitAsync();
        try
        {
            return await MutateStepUnsafeAsync(projectId, stepNumber, expectedRevision, current =>
            {
                var target = RequireConversation(current, conversationId);
                var updated = target with { Turns = [], UpdatedAt = DateTimeOffset.UtcNow };
                var conversations = ReplaceConversation(current, updated);
                var status = conversations.Any(item => item.Turns.Count > 0) ? current.Status : "idle";
                return CopyStep(current, status: status, conversations: conversations);
            });
        }
        finally { _gate.Release(); }
    }

    public async Task<StepData> EditTurnAsync(string projectId, int stepNumber, string conversationId, string turnId, TurnEditRequest request)
    {
        await _gate.WaitAsync();
        try
        {
            return await MutateStepUnsafeAsync(projectId, stepNumber, request.ExpectedRevision, current =>
            {
                var target = RequireConversation(current, conversationId);
                var content = request.Content?.Trim() ?? string.Empty;
                if (content.Length == 0) throw new InvalidDataException("对话内容不能为空。");
                var found = false;
                var turns = target.Turns.Select(turn =>
                {
                    if (turn.Id != turnId) return turn;
                    found = true;
                    return turn with { Content = content, RawContent = null, EditedAt = DateTimeOffset.UtcNow };
                }).ToList();
                if (!found) throw new KeyNotFoundException("消息不存在。");
                var updated = target with { Turns = turns, UpdatedAt = DateTimeOffset.UtcNow };
                return CopyStep(current, status: "draft", conversations: ReplaceConversation(current, updated));
            });
        }
        finally { _gate.Release(); }
    }

    public async Task<StepData> DeleteTurnAsync(string projectId, int stepNumber, string conversationId, string turnId, long expectedRevision)
    {
        await _gate.WaitAsync();
        try
        {
            return await MutateStepUnsafeAsync(projectId, stepNumber, expectedRevision, current =>
            {
                var target = RequireConversation(current, conversationId);
                var turns = target.Turns.Where(turn => turn.Id != turnId).ToList();
                if (turns.Count == target.Turns.Count) throw new KeyNotFoundException("消息不存在。");
                var updated = target with { Turns = turns, UpdatedAt = DateTimeOffset.UtcNow };
                var conversations = ReplaceConversation(current, updated);
                var status = conversations.Any(item => item.Turns.Count > 0) ? "draft" : "idle";
                return CopyStep(current, status: status, conversations: conversations);
            });
        }
        finally { _gate.Release(); }
    }

    public async Task<StepData> AppendTurnAsync(string projectId, int stepNumber, string conversationId, long expectedRevision, StepTurn turn)
    {
        await _gate.WaitAsync();
        try
        {
            return await MutateStepUnsafeAsync(projectId, stepNumber, expectedRevision, current =>
            {
                EnsureActiveConversation(current, conversationId);
                var target = RequireConversation(current, conversationId);
                var updated = target with { Turns = target.Turns.Append(turn).ToList(), UpdatedAt = DateTimeOffset.UtcNow };
                return CopyStep(current, status: "draft", conversations: ReplaceConversation(current, updated));
            });
        }
        finally { _gate.Release(); }
    }

    public async Task<StepData> CompleteRetryAsync(
        string projectId,
        int stepNumber,
        string conversationId,
        string userTurnId,
        long expectedRevision,
        StepTurn assistantTurn)
    {
        await _gate.WaitAsync();
        try
        {
            return await MutateStepUnsafeAsync(projectId, stepNumber, expectedRevision, current =>
            {
                EnsureActiveConversation(current, conversationId);
                var target = RequireConversation(current, conversationId);
                var latestUser = target.Turns.LastOrDefault(turn => turn.Role == "user");
                if (latestUser?.Id != userTurnId) throw new InvalidOperationException("只能重试当前对话中最新的用户输入。");
                var userIndex = target.Turns.ToList().FindIndex(turn => turn.Id == userTurnId);
                var turns = target.Turns.Take(userIndex + 1).Append(assistantTurn).ToList();
                var updated = target with { Turns = turns, UpdatedAt = DateTimeOffset.UtcNow };
                return CopyStep(current, status: "draft", conversations: ReplaceConversation(current, updated));
            });
        }
        finally { _gate.Release(); }
    }

    private async Task<StepData> MutateStepUnsafeAsync(
        string projectId,
        int stepNumber,
        long expectedRevision,
        Func<StepData, StepData> mutate)
    {
        _ = await RequireProjectAsync(projectId);
        var current = await RequireStepAsync(projectId, stepNumber);
        if (current.Revision != expectedRevision) throw new StepRevisionConflictException(current.Revision);
        var changed = mutate(current);
        var updated = new StepData
        {
            Number = current.Number,
            Revision = current.Revision + 1,
            Status = changed.Status,
            ActiveConversationId = changed.ActiveConversationId,
            Conversations = changed.Conversations,
        };
        await _files.WriteAtomicAsync(StepPath(projectId, stepNumber), updated);
        return updated;
    }

    private static StepData CopyStep(
        StepData current,
        string? status = null,
        string? activeConversationId = null,
        IReadOnlyList<StepConversation>? conversations = null) => new()
    {
        Number = current.Number,
        Revision = current.Revision,
        Status = status ?? current.Status,
        ActiveConversationId = activeConversationId ?? current.ActiveConversationId,
        Conversations = conversations ?? current.Conversations,
    };

    private static IReadOnlyList<StepConversation> ReplaceConversation(StepData step, StepConversation replacement) =>
        step.Conversations.Select(item => item.Id == replacement.Id ? replacement : item).ToList();

    private static StepConversation RequireConversation(StepData step, string conversationId) =>
        step.Conversations.FirstOrDefault(item => item.Id == conversationId) ?? throw new KeyNotFoundException("对话不存在。");

    private static void EnsureActiveConversation(StepData step, string conversationId)
    {
        if (step.ActiveConversationId != conversationId)
            throw new InvalidOperationException("生成目标已不是当前对话，请重新发送。");
    }

    private static string NormalizeConversationName(string? requested, string? fallback)
    {
        var name = string.IsNullOrWhiteSpace(requested) ? fallback?.Trim() ?? string.Empty : requested.Trim();
        if (name.Length == 0) throw new InvalidDataException("对话名称不能为空。");
        return name.Length > 60 ? name[..60] : name;
    }

    private static string NextConversationName(StepData step)
    {
        var numbers = step.Conversations
            .Select(item => System.Text.RegularExpressions.Regex.Match(item.Name.Trim(), @"^对话\s*(\d+)$"))
            .Where(match => match.Success && int.TryParse(match.Groups[1].Value, out _))
            .Select(match => int.Parse(match.Groups[1].Value));
        return $"对话 {Math.Max(1, numbers.DefaultIfEmpty(1).Max()) + 1}";
    }

    private static StepConversation NewConversation(string name, DateTimeOffset? now = null, IReadOnlyList<StepTurn>? turns = null)
    {
        var timestamp = now ?? DateTimeOffset.UtcNow;
        return new StepConversation(Guid.NewGuid().ToString("D"), name, turns ?? [], timestamp, timestamp);
    }

    private async Task<StudioProject> CreateProjectFilesAsync(string name)
    {
        var now = DateTimeOffset.UtcNow;
        var project = new StudioProject(Guid.NewGuid().ToString("D"), name, string.Empty, 1, 1, now, now);
        Directory.CreateDirectory(ProjectDirectory(project.Id));
        Directory.CreateDirectory(StepsDirectory(project.Id));
        await _files.WriteAtomicAsync(ProjectPath(project.Id), project);

        for (var step = 1; step <= 29; step++)
        {
            var conversation = NewConversation("默认对话", now);
            await _files.WriteAtomicAsync(StepPath(project.Id, step), new StepData
            {
                Number = step,
                ActiveConversationId = conversation.Id,
                Conversations = [conversation],
            });
        }

        return project;
    }

    private async Task<AppIndex> RequireIndexAsync() =>
        await _files.ReadRecoverableAsync<AppIndex>(_indexPath) ?? throw new InvalidDataException("项目索引不可读取。");

    private async Task<StudioProject> RequireProjectAsync(string projectId)
    {
        if (!Guid.TryParse(projectId, out _)) throw new KeyNotFoundException("项目不存在。");
        return await _files.ReadRecoverableAsync<StudioProject>(ProjectPath(projectId)) ?? throw new KeyNotFoundException("项目不存在。");
    }

    private async Task<StepData> RequireStepAsync(string projectId, int stepNumber)
    {
        if (stepNumber is < 1 or > 29) throw new KeyNotFoundException("创作步骤不存在。");
        var step = await _files.ReadRecoverableAsync<StepData>(StepPath(projectId, stepNumber));
        var normalized = NormalizeStep(step, stepNumber);
        if (step is null || step.Conversations is null || step.Conversations.Count == 0)
        {
            // 立即落盘迁移，确保旧格式生成出的默认对话 ID 在后续命令中保持稳定。
            await _files.WriteAtomicAsync(StepPath(projectId, stepNumber), normalized);
        }
        return normalized;
    }

    private static StepData NormalizeStep(StepData? source, int stepNumber)
    {
        var now = DateTimeOffset.UtcNow;
        var conversations = (source?.Conversations ?? [])
            .Where(item => item is not null)
            .Select((item, index) => new StepConversation(
                Guid.TryParse(item.Id, out var id) ? id.ToString("D") : Guid.NewGuid().ToString("D"),
                NormalizeConversationName(item.Name, $"对话 {index + 1}"),
                item.Turns ?? [],
                item.CreatedAt == default ? now : item.CreatedAt,
                item.UpdatedAt == default ? item.CreatedAt == default ? now : item.CreatedAt : item.UpdatedAt))
            .ToList();
        if (conversations.Count == 0)
        {
            // 旧版顶层 turns 自动进入默认对话；不改变消息 ID、角色、正文和顺序。
            conversations.Add(NewConversation("默认对话", now, source?.LegacyTurns ?? []));
        }
        var activeId = conversations.Any(item => item.Id == source?.ActiveConversationId)
            ? source!.ActiveConversationId
            : conversations[0].Id;
        var hasTurns = conversations.Any(item => item.Turns.Count > 0);
        var status = source?.Status is "draft" or "accepted" ? source.Status : hasTurns ? "draft" : "idle";
        if (!hasTurns && status == "draft") status = "idle";
        return new StepData
        {
            Number = stepNumber,
            Revision = Math.Max(1, source?.Revision ?? 1),
            Status = status,
            ActiveConversationId = activeId,
            Conversations = conversations,
        };
    }

    private async Task<List<StudioProject>> LoadProjectsAsync(AppIndex index)
    {
        var projects = new List<StudioProject>();
        foreach (var summary in index.Projects)
        {
            var project = await _files.ReadRecoverableAsync<StudioProject>(ProjectPath(summary.Id));
            if (project is not null) projects.Add(NormalizeProject(project));
        }
        return projects;
    }

    private static void EnsureRevision(StudioProject project, long expectedRevision)
    {
        if (project.Revision != expectedRevision) throw new RevisionConflictException(project.Revision);
    }

    private static StudioProject NormalizeProject(StudioProject project) => project with
    {
        Name = NormalizeName(project.Name),
        Brief = project.Brief ?? string.Empty,
        CurrentStep = Math.Clamp(project.CurrentStep, 1, 29),
        Revision = Math.Max(1, project.Revision),
    };

    private static string NormalizeName(string? name)
    {
        var normalized = string.IsNullOrWhiteSpace(name) ? "未命名项目" : name.Trim();
        return normalized.Length > 80 ? normalized[..80] : normalized;
    }

    private static string UniqueName(string name, IEnumerable<string> names)
    {
        var used = new HashSet<string>(names, StringComparer.OrdinalIgnoreCase);
        if (!used.Contains(name)) return name;
        for (var suffix = 2; ; suffix++)
        {
            var candidate = $"{name}（{suffix}）";
            if (!used.Contains(candidate)) return candidate;
        }
    }

    private static AppIndex BuildIndex(StudioProject active, IEnumerable<StudioProject> projects) => new(
        SchemaVersion,
        active.Id,
        projects
            .OrderByDescending(project => project.UpdatedAt)
            .Select(project => new ProjectSummary(project.Id, project.Name, project.CurrentStep, project.Revision, project.UpdatedAt))
            .ToList());

    private string ProjectDirectory(string projectId) => Path.Combine(_projectsRoot, projectId);
    private string ProjectPath(string projectId) => Path.Combine(ProjectDirectory(projectId), "project.json");
    private string StepsDirectory(string projectId) => Path.Combine(ProjectDirectory(projectId), "steps");
    private string StepPath(string projectId, int step) => Path.Combine(StepsDirectory(projectId), $"{step:00}.json");

}

public sealed record AppIndex(int SchemaVersion, string ActiveProjectId, IReadOnlyList<ProjectSummary> Projects);
public sealed record ProjectSummary(string Id, string Name, int CurrentStep, long Revision, DateTimeOffset UpdatedAt);
public sealed record StudioProject(
    string Id,
    string Name,
    string Brief,
    int CurrentStep,
    long Revision,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    bool IncludeFutureArtifacts = false);
public sealed class StepData
{
    public int Number { get; init; }
    public long Revision { get; init; } = 1;
    public string Status { get; init; } = "idle";
    public string ActiveConversationId { get; init; } = string.Empty;
    public IReadOnlyList<StepConversation> Conversations { get; init; } = [];

    // 阶段 2 的旧文件把消息直接放在步骤顶层；仅用于读取迁移，写回新格式时保持 null。
    [JsonPropertyName("turns")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IReadOnlyList<StepTurn>? LegacyTurns { get; init; }
}

public sealed record StepConversation(
    string Id,
    string Name,
    IReadOnlyList<StepTurn> Turns,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record StepTurn(
    string Id,
    string Role,
    string Content,
    DateTimeOffset CreatedAt,
    string? RawContent = null,
    string State = "committed",
    DateTimeOffset? EditedAt = null);
public sealed record StudioState(AppIndex Index, StudioProject Project, StepData Step);
public sealed record GenerationSnapshot(StudioProject Project, StepData Step);
public sealed record ProjectTransferBundle(
    string Format,
    int SchemaVersion,
    DateTimeOffset ExportedAt,
    StudioProject Project,
    IReadOnlyList<StepData> Steps,
    ArtifactVault? Artifacts,
    ReferenceProjectSelection? ReferenceSelection,
    IReadOnlyList<ReferenceWorldbook> ReferenceBooks);
public sealed record CreateProjectRequest(string? Name);
public sealed record UpdateProjectRequest(
    long ExpectedRevision,
    string? Name = null,
    string? Brief = null,
    int? CurrentStep = null,
    bool? IncludeFutureArtifacts = null);
public sealed record ConversationMutationRequest(long ExpectedRevision, string? Name = null);
public sealed record TurnEditRequest(long ExpectedRevision, string Content);

public sealed class RevisionConflictException(long currentRevision) : Exception
{
    public long CurrentRevision { get; } = currentRevision;
}

public sealed class StepRevisionConflictException(long currentRevision) : Exception
{
    public long CurrentRevision { get; } = currentRevision;
}

public static class ProjectStoreSelfTest
{
    public static async Task<int> RunAsync()
    {
        var root = Path.Combine(Path.GetTempPath(), $"acs-store-test-{Guid.NewGuid():N}");
        try
        {
            var store = new ProjectStore(root);
            await store.InitializeAsync();
            var initial = await store.GetStateAsync();
            var updated = await store.UpdateProjectAsync(initial.Project.Id, new UpdateProjectRequest(initial.Project.Revision, "测试项目", "测试母题", 8));
            var reopened = new ProjectStore(root);
            await reopened.InitializeAsync();
            var restored = await reopened.GetStateAsync();
            if (restored.Project.Name != "测试项目" || restored.Project.Brief != "测试母题" || restored.Project.CurrentStep != 8) return 10;

            try
            {
                await reopened.UpdateProjectAsync(restored.Project.Id, new UpdateProjectRequest(1, "冲突写入"));
                return 11;
            }
            catch (RevisionConflictException)
            {
                // 预期：旧 revision 必须被拒绝。
            }

            Console.WriteLine("ProjectStore self-test passed.");
            return 0;
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }
}
