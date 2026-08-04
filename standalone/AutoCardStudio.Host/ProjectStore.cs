namespace AutoCardStudio.Host;

public sealed class ProjectStore
{
    private const int SchemaVersion = 1;
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

    public async Task<StepData> AppendTurnAsync(string projectId, int stepNumber, long expectedRevision, StepTurn turn)
    {
        await _gate.WaitAsync();
        try
        {
            _ = await RequireProjectAsync(projectId);
            var current = await RequireStepAsync(projectId, stepNumber);
            if (current.Revision != expectedRevision) throw new StepRevisionConflictException(current.Revision);

            var turns = current.Turns.ToList();
            turns.Add(turn);
            var updated = new StepData
            {
                Number = current.Number,
                Revision = current.Revision + 1,
                Status = "draft",
                Turns = turns,
            };
            await _files.WriteAtomicAsync(StepPath(projectId, stepNumber), updated);
            return updated;
        }
        finally
        {
            _gate.Release();
        }
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
            await _files.WriteAtomicAsync(StepPath(project.Id, step), new StepData { Number = step });
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
        var step = await _files.ReadRecoverableAsync<StepData>(StepPath(projectId, stepNumber))
            ?? new StepData { Number = stepNumber };
        return new StepData
        {
            Number = stepNumber,
            Revision = Math.Max(1, step.Revision),
            Status = step.Status is "draft" or "accepted" ? step.Status : "idle",
            Turns = step.Turns ?? [],
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
public sealed record StudioProject(string Id, string Name, string Brief, int CurrentStep, long Revision, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed class StepData
{
    public int Number { get; init; }
    public long Revision { get; init; } = 1;
    public string Status { get; init; } = "idle";
    public IReadOnlyList<StepTurn> Turns { get; init; } = [];
}

public sealed record StepTurn(
    string Id,
    string Role,
    string Content,
    DateTimeOffset CreatedAt,
    string? RawContent = null,
    string State = "committed");
public sealed record StudioState(AppIndex Index, StudioProject Project, StepData Step);
public sealed record GenerationSnapshot(StudioProject Project, StepData Step);
public sealed record CreateProjectRequest(string? Name);
public sealed record UpdateProjectRequest(long ExpectedRevision, string? Name = null, string? Brief = null, int? CurrentStep = null);

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
