using System.Text.RegularExpressions;

namespace AutoCardStudio.Host;

public sealed class ArtifactStore
{
    private const int SchemaVersion = 1;
    private readonly string _projectsRoot;
    private readonly AtomicJsonFile _files = new();
    private readonly SemaphoreSlim _gate = new(1, 1);

    public ArtifactStore(string dataRoot) => _projectsRoot = Path.Combine(Path.GetFullPath(dataRoot), "projects");

    public async Task<ArtifactState> GetStateAsync(string projectId)
    {
        await _gate.WaitAsync();
        try { return ToState(await ReadVaultUnsafeAsync(projectId)); }
        finally { _gate.Release(); }
    }

    public async Task<ArtifactAppendResult> CaptureAsync(string projectId, int stepNumber, string content, string source, long? expectedRevision = null)
    {
        var blocks = ArtifactExtractor.Extract(content, stepNumber);
        if (blocks.Count == 0) return new ArtifactAppendResult(await GetStateAsync(projectId), 0, 0);
        await _gate.WaitAsync();
        try
        {
            var vault = await ReadVaultUnsafeAsync(projectId);
            if (expectedRevision is not null) EnsureRevision(vault, expectedRevision.Value);
            var versions = vault.Versions.ToList();
            var selected = new Dictionary<string, string>(vault.SelectedVersionIds, StringComparer.Ordinal);
            var added = 0;
            var reused = 0;
            var now = DateTimeOffset.UtcNow;
            foreach (var block in blocks)
            {
                var key = ArtifactKey(stepNumber, block.Identity);
                var existing = versions.LastOrDefault(item =>
                    item.Step == stepNumber && item.Identity == block.Identity && item.Content == block.Content);
                if (existing is not null)
                {
                    selected[key] = existing.Id;
                    reused++;
                    continue;
                }
                var version = new ArtifactVersion(
                    Guid.NewGuid().ToString("D"), stepNumber, block.Identity, block.Content,
                    ArtifactNames.DisplayName(block.Identity, stepNumber), source, now, now);
                versions.Add(version);
                selected[key] = version.Id;
                added++;
            }
            var updated = vault with
            {
                Revision = vault.Revision + 1,
                Versions = versions,
                SelectedVersionIds = selected,
                UpdatedAt = now,
            };
            await WriteVaultUnsafeAsync(projectId, updated);
            return new ArtifactAppendResult(ToState(updated), added, reused);
        }
        finally { _gate.Release(); }
    }

    public async Task<ArtifactState> CreateManualAsync(string projectId, CreateManualArtifactRequest request)
    {
        var step = Math.Clamp(request.Step, 1, 29);
        var name = NormalizeName(request.Name);
        var content = NormalizeContent(request.Content);
        await _gate.WaitAsync();
        try
        {
            var vault = await ReadVaultUnsafeAsync(projectId);
            EnsureRevision(vault, request.ExpectedRevision);
            var now = DateTimeOffset.UtcNow;
            var identity = $"MANUAL_{Guid.NewGuid():N}";
            var version = new ArtifactVersion(Guid.NewGuid().ToString("D"), step, identity, content, name, "manual", now, now);
            var selected = new Dictionary<string, string>(vault.SelectedVersionIds, StringComparer.Ordinal)
            {
                [ArtifactKey(step, identity)] = version.Id,
            };
            var updated = vault with
            {
                Revision = vault.Revision + 1,
                Versions = vault.Versions.Append(version).ToList(),
                SelectedVersionIds = selected,
                UpdatedAt = now,
            };
            await WriteVaultUnsafeAsync(projectId, updated);
            return ToState(updated);
        }
        finally { _gate.Release(); }
    }

    public async Task<ArtifactState> SelectVersionAsync(string projectId, string key, string versionId, ArtifactRevisionRequest request)
    {
        await _gate.WaitAsync();
        try
        {
            var vault = await ReadVaultUnsafeAsync(projectId);
            EnsureRevision(vault, request.ExpectedRevision);
            var version = vault.Versions.FirstOrDefault(item => item.Id == versionId)
                ?? throw new KeyNotFoundException("产物版本不存在。");
            if (ArtifactKey(version.Step, version.Identity) != key) throw new InvalidDataException("产物版本不属于这个产物。");
            var selected = vault.SelectedVersionIds.ToDictionary(item => item.Key, item => item.Value, StringComparer.Ordinal);
            selected[key] = version.Id;
            var updated = vault with { Revision = vault.Revision + 1, SelectedVersionIds = selected, UpdatedAt = DateTimeOffset.UtcNow };
            await WriteVaultUnsafeAsync(projectId, updated);
            return ToState(updated);
        }
        finally { _gate.Release(); }
    }

    public async Task<ArtifactState> EditVersionAsync(string projectId, string versionId, EditArtifactVersionRequest request)
    {
        var content = NormalizeContent(request.Content);
        await _gate.WaitAsync();
        try
        {
            var vault = await ReadVaultUnsafeAsync(projectId);
            EnsureRevision(vault, request.ExpectedRevision);
            var target = vault.Versions.FirstOrDefault(item => item.Id == versionId)
                ?? throw new KeyNotFoundException("产物版本不存在。");
            var group = vault.Versions.Where(item => item.Step == target.Step && item.Identity == target.Identity).ToList();
            if (group[^1].Id != versionId) throw new InvalidOperationException("历史版本只读；请先切回最新版再编辑。");
            var displayName = target.Source == "manual" && !string.IsNullOrWhiteSpace(request.Name)
                ? NormalizeName(request.Name)
                : target.DisplayName;
            var updatedVersions = vault.Versions.Select(item => item.Id == versionId
                ? item with { Content = content, DisplayName = displayName, UpdatedAt = DateTimeOffset.UtcNow }
                : item).ToList();
            var updated = vault with { Revision = vault.Revision + 1, Versions = updatedVersions, UpdatedAt = DateTimeOffset.UtcNow };
            await WriteVaultUnsafeAsync(projectId, updated);
            return ToState(updated);
        }
        finally { _gate.Release(); }
    }

    public async Task<ArtifactState> SetContextModeAsync(string projectId, string key, ArtifactContextRequest request)
    {
        var mode = request.Mode.Trim().ToLowerInvariant();
        if (mode is not ("auto" or "on" or "off")) throw new InvalidDataException("上下文模式必须是 auto、on 或 off。");
        await _gate.WaitAsync();
        try
        {
            var vault = await ReadVaultUnsafeAsync(projectId);
            EnsureRevision(vault, request.ExpectedRevision);
            if (!vault.Versions.Any(item => ArtifactKey(item.Step, item.Identity) == key)) throw new KeyNotFoundException("产物不存在。");
            var modes = vault.ContextModes.ToDictionary(item => item.Key, item => item.Value, StringComparer.Ordinal);
            modes[key] = mode;
            var updated = vault with { Revision = vault.Revision + 1, ContextModes = modes, UpdatedAt = DateTimeOffset.UtcNow };
            await WriteVaultUnsafeAsync(projectId, updated);
            return ToState(updated);
        }
        finally { _gate.Release(); }
    }

    public async Task<ArtifactState> DeleteGroupAsync(string projectId, string key, long expectedRevision)
    {
        await _gate.WaitAsync();
        try
        {
            var vault = await ReadVaultUnsafeAsync(projectId);
            EnsureRevision(vault, expectedRevision);
            var versions = vault.Versions.Where(item => ArtifactKey(item.Step, item.Identity) != key).ToList();
            if (versions.Count == vault.Versions.Count) throw new KeyNotFoundException("产物不存在。");
            var selected = new Dictionary<string, string>(vault.SelectedVersionIds, StringComparer.Ordinal);
            var modes = new Dictionary<string, string>(vault.ContextModes, StringComparer.Ordinal);
            selected.Remove(key);
            modes.Remove(key);
            var updated = vault with
            {
                Revision = vault.Revision + 1,
                Versions = versions,
                SelectedVersionIds = selected,
                ContextModes = modes,
                UpdatedAt = DateTimeOffset.UtcNow,
            };
            await WriteVaultUnsafeAsync(projectId, updated);
            return ToState(updated);
        }
        finally { _gate.Release(); }
    }

    public async Task<IReadOnlyList<ArtifactContextItem>> GetContextAsync(
        StudioProject project,
        int currentStep,
        IReadOnlyList<StepTurn> activeConversation)
    {
        await _gate.WaitAsync();
        try
        {
            var vault = await ReadVaultUnsafeAsync(project.Id);
            var items = new List<ArtifactContextItem>();
            foreach (var group in ToState(vault).Groups.OrderBy(item => item.Step).ThenBy(item => item.CreatedAt))
            {
                if (group.Step > currentStep && !project.IncludeFutureArtifacts) continue;
                var selected = group.Versions.First(item => item.Id == group.SelectedVersionId);
                if (group.ContextMode == "off") continue;
                var duplicated = group.Step == currentStep && activeConversation.Any(turn => turn.Content.Contains(selected.Content, StringComparison.Ordinal));
                if (group.ContextMode == "auto" && duplicated) continue;
                items.Add(new ArtifactContextItem(group.Step, group.Identity, group.DisplayName, selected.Content, group.Step > currentStep));
            }
            return items;
        }
        finally { _gate.Release(); }
    }

    private async Task<ArtifactVault> ReadVaultUnsafeAsync(string projectId)
    {
        var path = VaultPath(projectId);
        var stored = await _files.ReadRecoverableAsync<ArtifactVault>(path);
        if (stored is null) return EmptyVault(projectId);
        var versions = (stored.Versions ?? []).Where(item => item.Step is >= 1 and <= 29 && !string.IsNullOrWhiteSpace(item.Identity) && !string.IsNullOrWhiteSpace(item.Content)).ToList();
        var selected = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var group in versions.GroupBy(item => ArtifactKey(item.Step, item.Identity)))
        {
            var requested = stored.SelectedVersionIds?.GetValueOrDefault(group.Key);
            selected[group.Key] = group.Any(item => item.Id == requested) ? requested! : group.Last().Id;
        }
        var modes = (stored.ContextModes ?? new Dictionary<string, string>())
            .Where(item => selected.ContainsKey(item.Key) && item.Value is "auto" or "on" or "off")
            .ToDictionary(item => item.Key, item => item.Value, StringComparer.Ordinal);
        return stored with
        {
            SchemaVersion = SchemaVersion,
            ProjectId = projectId,
            Revision = Math.Max(1, stored.Revision),
            Versions = versions,
            SelectedVersionIds = selected,
            ContextModes = modes,
        };
    }

    private Task WriteVaultUnsafeAsync(string projectId, ArtifactVault vault)
    {
        Directory.CreateDirectory(Path.Combine(_projectsRoot, projectId));
        return _files.WriteAtomicAsync(VaultPath(projectId), vault);
    }

    private static ArtifactState ToState(ArtifactVault vault)
    {
        var groups = vault.Versions
            .GroupBy(item => ArtifactKey(item.Step, item.Identity))
            .Select(group =>
            {
                var ordered = group.OrderBy(item => item.CreatedAt).ToList();
                var selected = vault.SelectedVersionIds.GetValueOrDefault(group.Key);
                if (!ordered.Any(item => item.Id == selected)) selected = ordered[^1].Id;
                var latest = ordered[^1];
                return new ArtifactGroupState(
                    group.Key, latest.Step, latest.Identity, latest.DisplayName, latest.Source,
                    vault.ContextModes.GetValueOrDefault(group.Key, "auto"), selected!, ordered,
                    ordered[0].CreatedAt, latest.UpdatedAt);
            })
            .OrderBy(item => item.Step)
            .ThenBy(item => item.CreatedAt)
            .ToList();
        return new ArtifactState(vault.Revision, groups);
    }

    private static ArtifactVault EmptyVault(string projectId) => new(
        SchemaVersion, projectId, 1, [], new Dictionary<string, string>(), new Dictionary<string, string>(), DateTimeOffset.UtcNow);
    private string VaultPath(string projectId) => Path.Combine(_projectsRoot, projectId, "artifacts.json");
    public static string ArtifactKey(int step, string identity) => $"{step}:{identity}";
    private static string NormalizeName(string? value)
    {
        var normalized = value?.Trim() ?? string.Empty;
        if (normalized.Length == 0) throw new InvalidDataException("产物名称不能为空。");
        return normalized.Length > 100 ? normalized[..100] : normalized;
    }
    private static string NormalizeContent(string? value)
    {
        var normalized = value?.Trim() ?? string.Empty;
        if (normalized.Length == 0) throw new InvalidDataException("产物正文不能为空。");
        if (normalized.Length > 2_000_000) throw new InvalidDataException("单项产物超过 200 万字符。");
        return normalized;
    }
    private static void EnsureRevision(ArtifactVault vault, long expected)
    {
        if (vault.Revision != expected) throw new ArtifactRevisionConflictException(vault.Revision);
    }
}

public static class ArtifactExtractor
{
    private sealed record Rule(HashSet<string>? Tags = null, string[]? Prefixes = null, Regex[]? Patterns = null, string[]? Fences = null, bool Statusbar = false, string[]? RecoverableFences = null);
    private sealed record RawBlock(string Tag, string Content, int Start, int End, string Language = "", bool Recovered = false);

    private static readonly IReadOnlyDictionary<int, Rule> Rules = new Dictionary<int, Rule>
    {
        [1] = Tags("WORLD_interaction_paradigm", "WORLD_aesthetic_program"),
        [2] = Prefixes("WORLD_implementation_mechanisms"),
        [3] = Prefixes("WORLD_arc_framework_"),
        [4] = Tags("WORLD_blueprint"),
        [5] = new(Patterns: [new(@"^WORLD_main_characters_.+_(?:原点|画像|状态)$"), new(@"^SOURCE_main_characters_.+_状态$")], RecoverableFences: ["mai_ori", "mai_por", "mai_sta"]),
        [6] = Prefixes("WORLD_relationship_map"),
        [7] = Prefixes("WORLD_generative_rules_"),
        [8] = Prefixes("WORLD_specific_instances_"),
        [9] = Prefixes("WORLD_lore_"),
        [10] = Tags("SOURCE_spatial_planning"),
        [11] = Prefixes("SOURCE_plot_graph_"),
        [12] = Prefixes("WORLD_dimension_"),
        [13] = Tags("WORLD_narrative_core"),
        [14] = Prefixes("WORLD_language_materials_"),
        [15] = Prefixes("WORLD_scene_strategies_"),
        [16] = Tags("SOURCE_待变量化", "SOURCE_待条件化"),
        [17] = Tags("SOURCE_variable_system_planning"),
        [18] = new(Prefixes: ["WORLD_current_", "SOURCE_condition_mapping_"], Fences: ["schema"]),
        [19] = Tags("WORLD_variable_update_guide", "SOURCE_step19_plan"),
        [20] = Prefixes("WORLD_"),
        [21] = Prefixes("WORLD_"),
        [22] = Tags("WORLD_root_index"),
        [23] = new(Tags: new(["SOURCE_statusbar_data_guide"]), Statusbar: true),
        [24] = Tags("SYS_output_format"),
        [25] = Tags("SOURCE_task_list"),
        [26] = Prefixes("SYS_task_"),
        [27] = Prefixes("SYS_task_"),
        [28] = new(Tags: new(["SOURCE_entry_plan"]), Fences: ["autotask_config"]),
        [29] = new(Fences: ["opening"]),
    };

    public static IReadOnlyList<ExtractedArtifact> Extract(string text, int stepNumber)
    {
        if (!Rules.TryGetValue(stepNumber, out var rule)) return [];
        var xml = ExtractXml(text).Where(item => Matches(item.Tag, rule)).ToList();
        xml.AddRange(RecoverMalformedFences(text, rule, xml));
        var fences = ExtractFences(text).Where(item => rule.Fences?.Contains(item.Language) == true).ToList();
        if (rule.Statusbar)
        {
            foreach (var block in ExtractFences(text))
            {
                var tag = block.Content.Contains("<body", StringComparison.OrdinalIgnoreCase) && block.Content.Contains("</body>", StringComparison.OrdinalIgnoreCase)
                    ? "STATUSBAR_HTML"
                    : block.Content.Contains("<SOURCE_statusbar_data_guide", StringComparison.Ordinal)
                        ? "SOURCE_statusbar_data_guide"
                        : block.Content.Contains("<STATUSBAR_DATA>", StringComparison.Ordinal) && block.Content.Contains("</STATUSBAR_DATA>", StringComparison.Ordinal)
                            ? "STATUSBAR_REGEX"
                            : string.Empty;
                if (tag.Length > 0 && !xml.Any(item => item.Tag == tag)) fences.Add(block with { Tag = tag });
            }
        }
        var blocks = xml.Concat(fences).OrderBy(item => item.Start).ThenBy(item => item.End).ToList();
        return blocks.Select(block =>
        {
            var identity = block.Tag;
            if (stepNumber == 18 && block.Tag == "schema")
            {
                var current = blocks.FirstOrDefault(item => item.Tag.StartsWith("WORLD_current_", StringComparison.Ordinal));
                var root = current?.Tag["WORLD_current_".Length..] ?? Regex.Match(block.Content, @"^\s*([^#\s][^:\r\n]*?)\s*:\s*z\.object\s*\(", RegexOptions.Multiline).Groups[1].Value.Trim();
                identity = root.Length > 0 ? $"schema_{root}" : "schema";
            }
            return new ExtractedArtifact(identity, block.Content.Trim());
        }).Where(item => item.Content.Length > 0).ToList();
    }

    private static Rule Tags(params string[] tags) => new(new(tags));
    private static Rule Prefixes(params string[] prefixes) => new(Prefixes: prefixes);
    private static bool Matches(string tag, Rule rule) =>
        rule.Tags?.Contains(tag) == true || rule.Prefixes?.Any(tag.StartsWith) == true || rule.Patterns?.Any(pattern => pattern.IsMatch(tag)) == true;

    private static IReadOnlyList<RawBlock> ExtractXml(string text)
    {
        var source = text ?? string.Empty;
        var blocks = new List<RawBlock>();
        var stacks = new Dictionary<string, Stack<int>>(StringComparer.Ordinal);
        foreach (Match match in Regex.Matches(source, @"<(\/)?([A-Za-z][A-Za-z0-9_:\-\u4e00-\u9fff]*)(?:\s[^>]*)?>"))
        {
            var closing = match.Groups[1].Success;
            var tag = match.Groups[2].Value;
            if (!closing)
            {
                if (!stacks.TryGetValue(tag, out var stack)) stacks[tag] = stack = new Stack<int>();
                stack.Push(match.Index);
            }
            else if (stacks.TryGetValue(tag, out var stack) && stack.Count > 0)
            {
                var start = stack.Pop();
                var end = match.Index + match.Length;
                blocks.Add(new RawBlock(tag, source[start..end], start, end));
            }
        }
        return blocks;
    }

    private static IReadOnlyList<RawBlock> ExtractFences(string text)
    {
        var source = text ?? string.Empty;
        var blocks = new List<RawBlock>();
        foreach (Match match in Regex.Matches(source, @"```([^\r\n`]*)\r?\n([\s\S]*?)```"))
        {
            var language = match.Groups[1].Value.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()?.ToLowerInvariant() ?? string.Empty;
            var value = match.Groups[2].Value;
            var leading = value.Length - value.TrimStart().Length;
            var trailing = value.Length - value.TrimEnd().Length;
            var start = match.Groups[2].Index + leading;
            var end = match.Groups[2].Index + Math.Max(leading, value.Length - trailing);
            blocks.Add(new RawBlock(language.Length > 0 ? language : "code", source[start..end], start, end, language));
        }
        return blocks;
    }

    private static IReadOnlyList<RawBlock> RecoverMalformedFences(string text, Rule rule, IReadOnlyList<RawBlock> existing)
    {
        if (rule.RecoverableFences is null) return [];
        var recovered = new List<RawBlock>();
        foreach (var fence in ExtractFences(text).Where(item => rule.RecoverableFences.Contains(item.Language)))
        {
            var open = Regex.Match(fence.Content, @"^<([A-Za-z][A-Za-z0-9_:\-\u4e00-\u9fff]*)(?:\s[^>]*)?>");
            if (!open.Success) continue;
            var tag = open.Groups[1].Value;
            if (!Matches(tag, rule) || Regex.IsMatch(fence.Content, $@"</{Regex.Escape(tag)}\s*>")) continue;
            if (existing.Any(item => item.Tag == tag && item.Start >= fence.Start && item.End <= fence.End)) continue;
            recovered.Add(fence with { Tag = tag, Content = $"{fence.Content.TrimEnd()}\n</{tag}>", Recovered = true });
        }
        return recovered;
    }
}

public static class ArtifactNames
{
    private static readonly IReadOnlyDictionary<string, string> Exact = new Dictionary<string, string>
    {
        ["WORLD_interaction_paradigm"] = "交互范式", ["WORLD_aesthetic_program"] = "美学纲领", ["WORLD_blueprint"] = "世界蓝图",
        ["SOURCE_spatial_planning"] = "空间规划", ["WORLD_narrative_core"] = "叙事指南核心", ["SOURCE_待变量化"] = "数据盘点 · 待变量化",
        ["SOURCE_待条件化"] = "数据盘点 · 待条件化", ["SOURCE_variable_system_planning"] = "变量体系规划",
        ["WORLD_variable_update_guide"] = "变量更新指南", ["SOURCE_step19_plan"] = "条件显示规划", ["WORLD_root_index"] = "世界根目录",
        ["SOURCE_statusbar_data_guide"] = "状态栏数据指南", ["STATUSBAR_HTML"] = "状态栏界面", ["STATUSBAR_REGEX"] = "状态栏数据正则",
        ["SYS_output_format"] = "输出格式", ["SOURCE_task_list"] = "副 AI 任务清单", ["SOURCE_entry_plan"] = "世界书条目规划表",
        ["autotask_config"] = "AutoTask 配置", ["opening"] = "正式开场白",
    };
    private static readonly (string Prefix, string Name)[] Prefixes =
    [
        ("WORLD_implementation_mechanisms", "实现机制"), ("WORLD_arc_framework_", "弧光识别"), ("WORLD_relationship_map", "角色关系图谱"),
        ("WORLD_generative_rules_", "世界生成规则"), ("WORLD_specific_instances_", "世界具体实例"), ("WORLD_lore_", "世界知识"),
        ("SOURCE_plot_graph_", "情节图谱"), ("WORLD_dimension_", "叙事维度内容"), ("WORLD_language_materials_", "语料库"),
        ("WORLD_scene_strategies_", "场景策略集"), ("WORLD_current_", "当前变量"), ("SOURCE_condition_mapping_", "条件映射"),
    ];

    public static string DisplayName(string identity, int step)
    {
        if (Exact.TryGetValue(identity, out var exact)) return exact;
        if (identity.StartsWith("WORLD_main_characters_") || identity.StartsWith("SOURCE_main_characters_"))
            return $"主要角色 · {Suffix(Regex.Replace(identity, @"^(?:WORLD|SOURCE)_main_characters_", string.Empty))}";
        if (identity.StartsWith("schema_")) return $"变量结构定义 · {Suffix(identity[7..])}";
        foreach (var (prefix, name) in Prefixes)
            if (identity.StartsWith(prefix)) return identity.Length == prefix.Length ? name : $"{name} · {Suffix(identity[prefix.Length..])}";
        if (identity.StartsWith("SYS_task_")) return $"Step {step} 任务提示词 · {Suffix(identity[9..])}";
        return $"Step {step} 产物";
    }

    private static string Suffix(string value) => Regex.Replace(value.Trim('_'), "_+", " · ");
}

public sealed record ExtractedArtifact(string Identity, string Content);
public sealed record ArtifactVault(int SchemaVersion, string ProjectId, long Revision, IReadOnlyList<ArtifactVersion> Versions, IReadOnlyDictionary<string, string> SelectedVersionIds, IReadOnlyDictionary<string, string> ContextModes, DateTimeOffset UpdatedAt);
public sealed record ArtifactVersion(string Id, int Step, string Identity, string Content, string DisplayName, string Source, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record ArtifactState(long Revision, IReadOnlyList<ArtifactGroupState> Groups);
public sealed record ArtifactGroupState(string Key, int Step, string Identity, string DisplayName, string Source, string ContextMode, string SelectedVersionId, IReadOnlyList<ArtifactVersion> Versions, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record ArtifactContextItem(int Step, string Identity, string DisplayName, string Content, bool IsFuture);
public sealed record ArtifactAppendResult(ArtifactState State, int Added, int Reused);
public sealed record CreateManualArtifactRequest(long ExpectedRevision, int Step, string Name, string Content);
public sealed record CaptureArtifactRequest(long ExpectedRevision, int Step, string Content);
public sealed record EditArtifactVersionRequest(long ExpectedRevision, string Content, string? Name = null);
public sealed record ArtifactContextRequest(long ExpectedRevision, string Mode);
public sealed record ArtifactRevisionRequest(long ExpectedRevision);
public sealed class ArtifactRevisionConflictException(long currentRevision) : Exception { public long CurrentRevision { get; } = currentRevision; }
