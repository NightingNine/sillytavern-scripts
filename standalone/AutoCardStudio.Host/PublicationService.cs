using System.Buffers.Binary;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace AutoCardStudio.Host;

public sealed class PublicationService(
    ProjectStore projects,
    ArtifactStore artifacts,
    ResourceStore resources,
    ConnectionStore connections,
    ModelGateway gateway,
    string dataRoot,
    ILogger<PublicationService> logger)
{
    private const int ReorgSchemaVersion = 2;
    private const int MaxAvatarBytes = 12 * 1024 * 1024;
    private readonly AtomicJsonFile _files = new();
    private readonly SemaphoreSlim _cacheGate = new(1, 1);
    private readonly string _projectsRoot = Path.Combine(Path.GetFullPath(dataRoot), "projects");

    public async Task<PublicationState> GetStateAsync(string projectId)
    {
        var state = await projects.GetStateAsync(projectId);
        var artifactState = await artifacts.GetStateAsync(state.Project.Id);
        var cache = await ReadCacheAsync(state.Project.Id);
        var choices = ResolveChoices(artifactState)
            .Select(item => new PublicationChoice(
                item.Version.Id, item.Key, item.Step, item.Identity, item.Version.DisplayName,
                item.Target.Kind, item.Target.Name, item.Version.Source))
            .ToList();
        var settings = cache?.Settings ?? new PublicationSettings(
            state.Project.Name,
            $"{state.Project.Name} · 世界书",
            "A.U.T.O 创作台",
            "中文",
            "第三人称",
            true);
        var cacheReady = cache is not null
            && cache.SchemaVersion == ReorgSchemaVersion
            && cache.Plan is not null;
        return new PublicationState(artifactState.Revision, choices, settings, cacheReady, cache?.UpdatedAt);
    }

    public async Task<PublicationPackage> BuildAsync(string projectId, BuildPublicationRequest request, CancellationToken cancellationToken)
    {
        var state = await projects.GetStateAsync(projectId);
        var artifactState = await artifacts.GetStateAsync(state.Project.Id);
        if (artifactState.Revision != request.ExpectedArtifactRevision)
            throw new PublicationRejectedException("artifact_revision_conflict", "产物库已变化，请重新打开发布页后再创建。", 409);

        var available = ResolveChoices(artifactState);
        var requested = request.SelectedVersionIds?.Where(id => !string.IsNullOrWhiteSpace(id)).ToHashSet(StringComparer.Ordinal) ?? [];
        if (requested.Count == 0) throw new PublicationRejectedException("publication_empty", "请至少勾选一项正式产物。", 400);
        var selected = available.Where(item => requested.Contains(item.Version.Id)).ToList();
        if (selected.Count != requested.Count)
            throw new PublicationRejectedException("publication_stale", "勾选内容中包含已经切换或删除的产物版本，请重新选择。", 409);

        var settings = NormalizeSettings(request.Settings, state.Project);
        var avatar = DecodeAvatar(request.AvatarPngBase64);
        var selectedWorldbook = selected.Where(item => item.Target.Kind == "worldbook").ToList();
        var signature = BuildSelectionSignature(selectedWorldbook);
        var warnings = new List<string>();
        var reorgMode = "not-required";
        JsonObject? acceptedPlan = null;
        IReadOnlyList<ReorgEntry> reorgEntries = [];

        if (selectedWorldbook.Count > 0)
        {
            var cache = await ReadCacheAsync(state.Project.Id);
            if (cache?.SchemaVersion == ReorgSchemaVersion && cache.SelectionSignature == signature && cache.Plan is JsonObject cachedPlan)
            {
                var cached = ValidateAndApply(cachedPlan, state.Project, settings.WorldbookName, selectedWorldbook);
                if (cached.Valid)
                {
                    acceptedPlan = cachedPlan;
                    reorgEntries = cached.Entries;
                    warnings.AddRange(cached.Warnings);
                    reorgMode = "cache";
                }
            }

            if (reorgEntries.Count == 0)
            {
                var generated = await GenerateReorgAsync(state.Project, settings.WorldbookName, selectedWorldbook, cancellationToken);
                acceptedPlan = generated.Plan;
                reorgEntries = generated.Entries;
                warnings.AddRange(generated.Warnings);
                reorgMode = generated.Mode;
            }
        }

        var regexes = BuildRegexScripts(selected, settings.IncludeOutputRegexBundle);
        var opening = ExtractOpening(selected.FirstOrDefault(item => item.Target.Kind == "opening")?.Version.Content, state.Project.Name);
        var worldbook = BuildStandaloneWorldbook(settings.WorldbookName, reorgEntries);
        var embeddedBook = BuildEmbeddedWorldbook(settings.WorldbookName, reorgEntries);
        var dossier = BuildDossier(state.Project, settings, selected, reorgMode, warnings);
        var card = BuildCharacterCard(state.Project, settings, opening, embeddedBook, regexes, selected, reorgMode);

        ValidateCoverage(selectedWorldbook, reorgEntries);
        ValidateWorldbookObject(worldbook);
        ValidateRegexes(regexes);
        ValidateCard(card);

        var jsonOptions = new JsonSerializerOptions { WriteIndented = true };
        var cardJson = card.ToJsonString(jsonOptions);
        var worldbookJson = worldbook.ToJsonString(jsonOptions);
        var regexJson = JsonSerializer.Serialize(regexes, jsonOptions);
        _ = JsonNode.Parse(cardJson) ?? throw new InvalidDataException("角色卡 JSON 复核失败。");
        _ = JsonNode.Parse(worldbookJson) ?? throw new InvalidDataException("世界书 JSON 复核失败。");
        _ = JsonNode.Parse(regexJson) ?? throw new InvalidDataException("正则 JSON 复核失败。");

        var safeName = SafeFileName(settings.CharacterName);
        var files = new Dictionary<string, byte[]>(StringComparer.Ordinal)
        {
            [$"{safeName}.character.json"] = Encoding.UTF8.GetBytes(cardJson),
            [$"{safeName}.worldbook.json"] = Encoding.UTF8.GetBytes(worldbookJson),
            [$"{safeName}.regex.json"] = Encoding.UTF8.GetBytes(regexJson),
            [$"{safeName}-创作档案.md"] = Encoding.UTF8.GetBytes(dossier),
        };
        if (avatar is not null)
        {
            var png = PngCharacterCard.Embed(avatar, cardJson);
            PngCharacterCard.Validate(png, cardJson);
            files[$"{safeName}.png"] = png;
        }
        var zip = BuildZip(files);
        ValidateZip(zip, files.Keys);

        await WriteCacheAsync(state.Project.Id, new PublicationCache(
            ReorgSchemaVersion,
            signature,
            acceptedPlan,
            settings,
            DateTimeOffset.UtcNow));
        logger.LogInformation(
            "Publication package created for project {ProjectId}, artifacts {ArtifactCount}, worldbook entries {EntryCount}, reorg {ReorgMode}, avatar {HasAvatar}",
            state.Project.Id, selected.Count, reorgEntries.Count, reorgMode, avatar is not null);
        return new PublicationPackage($"{safeName}-角色卡交付.zip", zip, reorgMode, warnings);
    }

    private async Task<GeneratedReorg> GenerateReorgAsync(
        StudioProject project,
        string worldbookName,
        IReadOnlyList<DeliveryArtifact> selected,
        CancellationToken cancellationToken)
    {
        var failures = new List<string>();
        for (var attempt = 0; attempt < 2; attempt++)
        {
            try
            {
                var preset = await resources.GetPresetAsync()
                    ?? throw new InvalidOperationException("未导入完整 A.U.T.O 预设");
                var connection = await connections.ResolveAsync();
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeout.CancelAfter(TimeSpan.FromSeconds(connection.Profile.TimeoutSeconds));
                var messages = BuildReorgMessages(
                    preset,
                    project,
                    worldbookName,
                    selected,
                    attempt == 0 ? string.Empty : string.Join("；", failures).Truncate(1200));
                var completion = await gateway.GenerateAsync(connection, messages, _ => Task.CompletedTask, timeout.Token);
                var plan = ParsePlan(completion.Text);
                var validation = ValidateAndApply(plan, project, worldbookName, selected);
                if (!validation.Valid)
                {
                    failures.AddRange(validation.Errors.Take(8));
                    continue;
                }
                return new GeneratedReorg(plan, validation.Entries, validation.Warnings, attempt == 0 ? "ai" : "ai-corrected");
            }
            catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                failures.Add("重组请求超时");
            }
            catch (Exception error) when (error is ModelGatewayException or InvalidDataException or InvalidOperationException or JsonException)
            {
                failures.Add(error.Message);
                logger.LogWarning(error, "Publication reorganization attempt {Attempt} failed for project {ProjectId}", attempt + 1, project.Id);
            }
        }

        // 两轮候选都不可用时按原交付目标完整分组；明确标记，不伪装成 AI 已重组。
        var fallback = BuildDefaultEntries(project, selected);
        var warnings = new List<string>
        {
            "AI 重组方案连续两次未通过，已使用本地安全分组完整交付所选产物。",
        };
        warnings.AddRange(failures.Take(4));
        return new GeneratedReorg(null, fallback, warnings, "safe-fallback");
    }

    private static IReadOnlyList<PromptMessage> BuildReorgMessages(
        ImportedPreset preset,
        StudioProject project,
        string worldbookName,
        IReadOnlyList<DeliveryArtifact> selected,
        string retryReason)
    {
        var messages = new List<PromptMessage>
        {
            new("system", "角色卡模板变量 {{char}} 与 {{user}} 必须原样保留。模型输出只是候选重组方案，不得编造本次结构报告之外的 blockId。", "发布安全约束"),
        };
        foreach (var prompt in preset.Prompts.OrderBy(item => item.Order))
        {
            if (AutoWorkflow.PlaceholderIds.Contains(prompt.Id)) continue;
            var workflow = AutoWorkflow.WorkflowPromptIds.Contains(prompt.Id);
            if (workflow && prompt.Id != AutoWorkflow.ReorganizationPromptId) continue;
            if (!workflow && !prompt.Enabled) continue;
            if (!string.IsNullOrWhiteSpace(prompt.Content)) messages.Add(new PromptMessage(prompt.Role, prompt.Content, prompt.Name));
        }
        messages.Add(new PromptMessage("user", BuildReorgContext(project, worldbookName, selected), "本次发布结构报告"));
        var instruction = new StringBuilder()
            .AppendLine("请立即执行预设中的世界书重组步骤（原 Step29）。")
            .AppendLine("只处理 STUDIO_REORG_CONTEXT 中本次已选产物；每个 blockId 必须且只能在 mappings 中使用一次。")
            .AppendLine("请严格输出 ```reorg_plan 代码块，其中只包含一个 JSON 对象。");
        if (!string.IsNullOrWhiteSpace(retryReason)) instruction.AppendLine($"上一次候选未通过：{retryReason}。请逐个核对 blockId 后重新输出。");
        messages.Add(new PromptMessage("user", instruction.ToString(), "执行重组"));
        return messages;
    }

    private static string BuildReorgContext(StudioProject project, string worldbookName, IReadOnlyList<DeliveryArtifact> selected)
    {
        var source = CreateSourceModel(selected);
        var entryPlan = selected.FirstOrDefault(item => item.Identity == "SOURCE_entry_plan")?.Version.Content;
        var lines = new List<string>
        {
            "<STUDIO_REORG_CONTEXT>",
            $"项目名称: {project.Name}",
            $"发布目标世界书: {worldbookName}",
            string.Empty,
            "# 世界书结构报告",
            $"源世界书: {SourceWorldbookName(project)}",
            $"条目: {source.Entries.Count} | 内容块: {source.Blocks.Count}",
            "说明: 每个 blockId 代表一项独立正式产物，必须且只能在 mappings 中使用一次。",
        };
        foreach (var entry in source.Entries)
        {
            lines.Add(string.Empty);
            lines.Add($"## {entry.Name}");
            lines.Add($"UID: {entry.Uid} | 状态: {(EntryEnabled(entry.Name) ? "启用" : "禁用")}");
            foreach (var block in entry.Blocks)
            {
                lines.Add($"[{block.BlockId}] {block.Type}");
                lines.Add($"  标签名: {block.Artifact.Identity}");
                lines.Add($"  来源: Step {block.Artifact.Step} · {block.Artifact.Version.DisplayName}");
                lines.Add($"  字符数: {block.Artifact.Version.Content.Length}");
            }
        }
        lines.AddRange([string.Empty, "# 当前条目规划表（SOURCE_entry_plan）", entryPlan ?? "尚未生成；请仅依据结构报告完整安排。", string.Empty, "</STUDIO_REORG_CONTEXT>"]);
        return string.Join('\n', lines);
    }

    private static JsonObject ParsePlan(string response)
    {
        var fence = Regex.Match(response ?? string.Empty, @"```\s*reorg_plan\s*(?<json>[\s\S]*?)```", RegexOptions.IgnoreCase);
        var source = fence.Success ? fence.Groups["json"].Value.Trim() : (response ?? string.Empty).Trim();
        try
        {
            return JsonNode.Parse(source) as JsonObject ?? throw new InvalidDataException("reorg_plan 必须是 JSON 对象。");
        }
        catch (JsonException)
        {
            var start = source.IndexOf('{');
            var end = source.LastIndexOf('}');
            if (start < 0 || end <= start) throw new InvalidDataException("模型回复中没有可解析的 reorg_plan JSON。");
            return JsonNode.Parse(source[start..(end + 1)]) as JsonObject ?? throw new InvalidDataException("reorg_plan 必须是 JSON 对象。");
        }
    }

    private static ReorgValidation ValidateAndApply(
        JsonObject plan,
        StudioProject project,
        string worldbookName,
        IReadOnlyList<DeliveryArtifact> selected)
    {
        var errors = new List<string>();
        var warnings = new List<string>();
        var source = CreateSourceModel(selected);
        var expected = source.Blocks.Keys.ToHashSet(StringComparer.Ordinal);
        if (plan["sourceWorldbook"]?.GetValue<string>() != SourceWorldbookName(project)) errors.Add("sourceWorldbook 与本次结构报告不一致");
        if (string.IsNullOrWhiteSpace(plan["targetWorldbook"]?.GetValue<string>())) errors.Add("targetWorldbook 缺失或为空");
        var mappings = plan["mappings"] as JsonArray;
        if (mappings is null || mappings.Count == 0) errors.Add("mappings 必须是非空数组");
        var actions = plan["blockActions"] as JsonArray;
        if (plan["blockActions"] is not null && actions is null) errors.Add("blockActions 必须是数组");

        var actionMap = new Dictionary<string, JsonObject>(StringComparer.Ordinal);
        foreach (var (node, index) in (actions ?? []).Select((node, index) => (node, index)))
        {
            if (node is not JsonObject action) { errors.Add($"blockActions[{index}] 必须是对象"); continue; }
            var id = action["blockId"]?.GetValue<string>() ?? string.Empty;
            if (!expected.Contains(id)) { errors.Add($"blockActions[{index}] 使用未知 blockId：{id}"); continue; }
            if (!actionMap.TryAdd(id, action)) { errors.Add($"blockActions[{index}] 重复设置 {id}"); continue; }
            var kind = action["action"]?.GetValue<string>();
            var block = source.Blocks[id];
            if (kind is not ("wrap" or "rename")) errors.Add($"blockActions[{index}].action 只允许 wrap 或 rename");
            if (kind == "wrap")
            {
                if (block.Type is not ("text" or "json")) errors.Add($"{id} 的 {block.Type} 内容不能 wrap");
                if (string.IsNullOrWhiteSpace(action["params"]?["wrapTagName"]?.GetValue<string>())) errors.Add($"{id} 缺少 wrapTagName");
            }
            if (kind == "rename")
            {
                if (block.Type is not ("xml_tag" or "unclosed_tag")) errors.Add($"{id} 的 {block.Type} 内容不能 rename");
                if (string.IsNullOrWhiteSpace(action["params"]?["newTagName"]?.GetValue<string>())) errors.Add($"{id} 缺少 newTagName");
            }
        }

        var used = new HashSet<string>(StringComparer.Ordinal);
        var names = new HashSet<string>(StringComparer.Ordinal);
        var acceptedMappings = new List<(JsonObject Mapping, List<SourceBlock> Blocks, int Index)>();
        foreach (var (node, index) in (mappings ?? []).Select((node, index) => (node, index)))
        {
            if (node is not JsonObject mapping) { errors.Add($"mappings[{index}] 必须是对象"); continue; }
            var name = mapping["targetEntryName"]?.GetValue<string>()?.Trim() ?? string.Empty;
            if (name.Length == 0) errors.Add($"mappings[{index}].targetEntryName 缺失或为空");
            else if (!names.Add(name)) warnings.Add($"条目名“{name}”重复");
            if (mapping["blockIds"] is not JsonArray ids || ids.Count == 0) { errors.Add($"mappings[{index}].blockIds 必须是非空数组"); continue; }
            var blocks = new List<SourceBlock>();
            foreach (var idNode in ids)
            {
                var id = idNode?.GetValue<string>() ?? string.Empty;
                if (!source.Blocks.TryGetValue(id, out var block)) errors.Add($"mappings[{index}] 包含未知 blockId：{id}");
                else if (!used.Add(id)) errors.Add($"blockId {id} 被重复引用");
                else blocks.Add(block);
            }
            if (mapping["attributes"] is not JsonObject attributes) errors.Add($"mappings[{index}].attributes 缺失或不是对象");
            else ValidateOverrides(attributes["overrides"], $"mappings[{index}]", errors, warnings);
            if (blocks.Count > 0) acceptedMappings.Add((mapping, blocks, index));
        }
        var missing = expected.Where(id => !used.Contains(id)).ToList();
        if (missing.Count > 0) errors.Add($"mappings 遗漏 {missing.Count} 个内容块：{string.Join(", ", missing)}");
        if (errors.Count > 0) return new ReorgValidation(false, errors, warnings, []);

        var ordered = acceptedMappings.OrderBy(item => ReadNumber(item.Mapping["attributes"]?["overrides"]?["order"]) ?? double.MaxValue).ThenBy(item => item.Index).ToList();
        var entries = ordered.Select((item, index) => BuildReorgEntry(project, item.Mapping, item.Blocks, actionMap, index)).ToList();
        return new ReorgValidation(true, errors, warnings, entries);
    }

    private static void ValidateOverrides(JsonNode? node, string path, List<string> errors, List<string> warnings)
    {
        if (node is null) return;
        if (node is not JsonObject values) { errors.Add($"{path}.attributes.overrides 必须是对象"); return; }
        ValidateEnum(values, "secondaryLogic", ["and_any", "and_all", "not_any", "not_all"], path, errors);
        ValidateEnum(values, "positionType", ["before_character_definition", "after_character_definition", "before_example_messages", "after_example_messages", "before_author_note", "after_author_note", "at_depth"], path, errors);
        ValidateEnum(values, "role", ["system", "user", "assistant"], path, errors);
        ValidateEnum(values, "strategyType", ["constant", "selective"], path, errors);
        foreach (var name in new[] { "keys", "keysSecondary" })
            if (values[name] is not null && (values[name] is not JsonArray array || array.Any(item => item is not JsonValue value || !value.TryGetValue<string>(out _))))
                errors.Add($"{path}.{name} 必须是字符串数组");
        if (values["enabled"] is JsonValue enabled && !enabled.TryGetValue<bool>(out _)) errors.Add($"{path}.enabled 必须是布尔值");
        foreach (var name in new[] { "depth", "order", "sticky", "cooldown", "delay" })
            if (values[name] is JsonValue value && (!value.TryGetValue<double>(out var number) || !double.IsFinite(number))) errors.Add($"{path}.{name} 必须是有限数字或 null");
        if (values["positionType"]?.GetValue<string>() == "at_depth" && (values["depth"] is null || values["role"] is null)) warnings.Add($"{path} 使用 at_depth 但未同时设置 depth 与 role，将使用默认值");
    }

    private static void ValidateEnum(JsonObject values, string name, string[] allowed, string path, List<string> errors)
    {
        if (values[name] is null) return;
        var value = values[name]?.GetValue<string>();
        if (value is null || !allowed.Contains(value, StringComparer.Ordinal)) errors.Add($"{path}.{name} 枚举值无效");
    }

    private static ReorgEntry BuildReorgEntry(
        StudioProject project,
        JsonObject mapping,
        IReadOnlyList<SourceBlock> blocks,
        IReadOnlyDictionary<string, JsonObject> actions,
        int index)
    {
        var overrides = mapping["attributes"]?["overrides"] as JsonObject ?? [];
        var content = string.Join("\n\n", blocks.Select(block => TransformBlock(block, actions.GetValueOrDefault(block.BlockId))));
        return new ReorgEntry(
            index,
            mapping["targetEntryName"]?.GetValue<string>()?.Trim() ?? $"重组条目 {index + 1}",
            ReadBool(overrides["enabled"]) ?? true,
            overrides["strategyType"]?.GetValue<string>() ?? "constant",
            ReadStrings(overrides["keys"]),
            overrides["secondaryLogic"]?.GetValue<string>() ?? "and_any",
            ReadStrings(overrides["keysSecondary"]),
            overrides["positionType"]?.GetValue<string>() ?? "after_character_definition",
            overrides["role"]?.GetValue<string>() ?? "system",
            ReadNumber(overrides["depth"]) ?? 0,
            ReadNumber(overrides["order"]) ?? 100 + index * 5,
            content,
            ReadNumber(overrides["sticky"]),
            ReadNumber(overrides["cooldown"]),
            ReadNumber(overrides["delay"]),
            blocks.Select(block => block.Artifact.Version.Id).ToList());
    }

    private static string TransformBlock(SourceBlock block, JsonObject? action)
    {
        var content = block.Artifact.Version.Content;
        var kind = action?["action"]?.GetValue<string>();
        if (kind == "wrap")
        {
            var tag = action?["params"]?["wrapTagName"]?.GetValue<string>()?.Trim();
            if (!string.IsNullOrWhiteSpace(tag)) return $"<{tag}>{content}</{tag}>";
        }
        var outputTag = block.Artifact.Identity;
        if (kind == "rename")
        {
            var next = action?["params"]?["newTagName"]?.GetValue<string>()?.Trim();
            if (!string.IsNullOrWhiteSpace(next))
            {
                var escaped = Regex.Escape(outputTag);
                content = Regex.Replace(content, $"<{escaped}(?=\\s|>)", $"<{next}");
                content = Regex.Replace(content, $"</{escaped}>", $"</{next}>");
                outputTag = next;
            }
        }
        if (block.Type == "unclosed_tag" && !Regex.IsMatch(content, $"</{Regex.Escape(outputTag)}>")) content += $"</{outputTag}>";
        return content;
    }

    private static IReadOnlyList<ReorgEntry> BuildDefaultEntries(StudioProject project, IReadOnlyList<DeliveryArtifact> selected)
    {
        return selected
            .GroupBy(item => item.Target.Name)
            .Select((group, index) => new ReorgEntry(
                index,
                group.Key,
                EntryEnabled(group.Key),
                "constant",
                [],
                "and_any",
                [],
                "before_character_definition",
                "system",
                4,
                1000 - index,
                string.Join("\n\n", group.Select(item => item.Version.Content)),
                null,
                null,
                null,
                group.Select(item => item.Version.Id).ToList()))
            .ToList();
    }

    private static SourceModel CreateSourceModel(IReadOnlyList<DeliveryArtifact> selected)
    {
        var entries = new List<SourceEntry>();
        var blocks = new Dictionary<string, SourceBlock>(StringComparer.Ordinal);
        foreach (var (group, uid) in selected.GroupBy(item => item.Target.Name).Select((group, uid) => (group, uid)))
        {
            var entryBlocks = new List<SourceBlock>();
            foreach (var (artifact, blockIndex) in group.Select((artifact, blockIndex) => (artifact, blockIndex)))
            {
                var block = new SourceBlock($"uid_{uid}_block_{blockIndex}", BlockType(artifact), artifact);
                entryBlocks.Add(block);
                blocks.Add(block.BlockId, block);
            }
            entries.Add(new SourceEntry(uid, group.Key, entryBlocks));
        }
        return new SourceModel(entries, blocks);
    }

    private static string BlockType(DeliveryArtifact artifact)
    {
        var content = artifact.Version.Content.Trim();
        var tag = Regex.Escape(artifact.Identity);
        if (Regex.IsMatch(content, $"<{tag}(?:\\s[^>]*)?>"))
            return Regex.IsMatch(content, $"</{tag}>") ? "xml_tag" : "unclosed_tag";
        try { _ = JsonNode.Parse(content); return "json"; }
        catch { return "text"; }
    }

    private static IReadOnlyList<DeliveryArtifact> ResolveChoices(ArtifactState state)
    {
        var result = new List<DeliveryArtifact>();
        foreach (var group in state.Groups)
        {
            var version = group.Versions.First(item => item.Id == group.SelectedVersionId);
            var target = ResolveDeliveryTarget(group.Identity, group.Step, group.Source, version.DisplayName);
            if (target is not null) result.Add(new DeliveryArtifact(group.Key, group.Step, group.Identity, version, target));
        }
        return result;
    }

    private static DeliveryTarget? ResolveDeliveryTarget(string identity, int step, string source, string displayName)
    {
        if (source == "manual") return new("worldbook", $"🧩{displayName}");
        var exact = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["WORLD_interaction_paradigm"] = "🕹️交互范式",
            ["WORLD_aesthetic_program"] = "🕹️美学纲领",
            ["WORLD_blueprint"] = "🧩世界蓝图",
            ["SOURCE_spatial_planning"] = "🗑️空间规划1️⃣",
            ["WORLD_narrative_core"] = "🕹️叙事指南核心",
            ["SOURCE_待变量化"] = "🗑️数据盘点3️⃣",
            ["SOURCE_待条件化"] = "🗑️数据盘点3️⃣",
            ["SOURCE_variable_system_planning"] = "🗑️变量体系规划2️⃣",
            ["WORLD_variable_update_guide"] = "🕹️更新指南2️⃣[mvu_update]",
            ["SOURCE_step19_plan"] = "🗑️条件显示规划3️⃣",
            ["WORLD_root_index"] = "🕹️世界根目录",
            ["SOURCE_statusbar_data_guide"] = "🗑️状态栏更新提示4️⃣",
            ["SYS_output_format"] = "🕹️输出格式[mvu_plot]",
            ["SOURCE_task_list"] = "🗑️副AI任务清单5️⃣",
            ["SOURCE_entry_plan"] = "🗑️条目规划表6️⃣",
            ["autotask_config"] = "[AutoTask配置-请勿修改]",
        };
        if (identity == "opening") return new("opening", "角色卡 · 其他开场");
        if (identity == "STATUSBAR_HTML") return new("character_regex_replace", "角色卡局部正则 · 🕹️显示状态栏（替换内容）");
        if (identity == "STATUSBAR_REGEX") return new("character_regex_find", "角色卡局部正则 · 🕹️显示状态栏（查找表达式）");
        if (exact.TryGetValue(identity, out var target)) return new("worldbook", target);
        if (identity.StartsWith("WORLD_implementation_mechanisms", StringComparison.Ordinal)) return new("worldbook", "🕹️实现机制");
        if (identity.StartsWith("WORLD_arc_framework_", StringComparison.Ordinal)) return new("worldbook", "🗑️弧光识别1️⃣");
        if (identity.StartsWith("WORLD_relationship_map", StringComparison.Ordinal)) return new("worldbook", "🧩关系图谱");
        if (identity.StartsWith("WORLD_generative_rules_", StringComparison.Ordinal)) return new("worldbook", "🧩生成规则");
        if (identity.StartsWith("WORLD_specific_instances_", StringComparison.Ordinal)) return new("worldbook", "🧩具体实例");
        if (identity.StartsWith("WORLD_lore_", StringComparison.Ordinal)) return new("worldbook", "🧩世界知识");
        if (identity.StartsWith("SOURCE_plot_graph_", StringComparison.Ordinal)) return new("worldbook", "🗑️情节图谱");
        if (identity.StartsWith("WORLD_dimension_", StringComparison.Ordinal)) return new("worldbook", "🧩维度内容");
        if (identity.StartsWith("WORLD_language_materials_", StringComparison.Ordinal)) return new("worldbook", "🧩语料库");
        if (identity.StartsWith("WORLD_scene_strategies_", StringComparison.Ordinal)) return new("worldbook", "🧩场景策略集");
        if (identity.StartsWith("WORLD_current_", StringComparison.Ordinal)) return new("worldbook", "🕹️当前变量");
        if (identity.StartsWith("SOURCE_condition_mapping_", StringComparison.Ordinal)) return new("worldbook", "🗑️条件地图2️⃣");
        if (identity.StartsWith("WORLD_main_characters_", StringComparison.Ordinal) || identity.StartsWith("SOURCE_main_characters_", StringComparison.Ordinal))
        {
            if (identity.EndsWith("_原点", StringComparison.Ordinal)) return new("worldbook", "🕹️主要角色-原点");
            if (identity.EndsWith("_画像", StringComparison.Ordinal)) return new("worldbook", "🧩主要角色-画像");
            if (identity.EndsWith("_状态", StringComparison.Ordinal)) return new("worldbook", "🗑️主要角色-状态2️⃣");
        }
        if (identity.StartsWith("SYS_task_", StringComparison.Ordinal) && step == 26) return new("worldbook", "🔇世界书提示词");
        if (identity.StartsWith("SYS_task_", StringComparison.Ordinal) && step == 27) return new("worldbook", "🔇变量提示词");
        if (step == 20 && identity.StartsWith("WORLD_", StringComparison.Ordinal)) return new("worldbook", $"🔢{identity[6..]}");
        if (step == 21 && identity.StartsWith("WORLD_", StringComparison.Ordinal)) return new("worldbook", "🔢其他条件展示内容");
        return null;
    }

    private static string BuildSelectionSignature(IReadOnlyList<DeliveryArtifact> selected)
    {
        var normalized = selected.OrderBy(item => item.Version.Id, StringComparer.Ordinal).Select(item => new
        {
            id = item.Version.Id,
            item.Identity,
            item.Step,
            item.Target.Kind,
            item.Target.Name,
        });
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(normalized))));
    }

    private async Task<PublicationCache?> ReadCacheAsync(string projectId)
    {
        await _cacheGate.WaitAsync();
        try { return await _files.ReadRecoverableAsync<PublicationCache>(CachePath(projectId)); }
        finally { _cacheGate.Release(); }
    }

    private async Task WriteCacheAsync(string projectId, PublicationCache cache)
    {
        await _cacheGate.WaitAsync();
        try
        {
            Directory.CreateDirectory(Path.Combine(_projectsRoot, projectId));
            await _files.WriteAtomicAsync(CachePath(projectId), cache);
        }
        finally { _cacheGate.Release(); }
    }

    private string CachePath(string projectId) => Path.Combine(_projectsRoot, projectId, "publication.json");

    private static PublicationSettings NormalizeSettings(PublicationSettings? value, StudioProject project)
    {
        var source = value ?? new PublicationSettings(project.Name, $"{project.Name} · 世界书", "A.U.T.O 创作台", "中文", "第三人称", true);
        return source with
        {
            CharacterName = NormalizeText(source.CharacterName, project.Name, 90),
            WorldbookName = NormalizeText(source.WorldbookName, $"{project.Name} · 世界书", 120),
            Creator = NormalizeText(source.Creator, "A.U.T.O 创作台", 80),
            Language = NormalizeText(source.Language, "中文", 30),
            Person = NormalizeText(source.Person, "第三人称", 30),
        };
    }

    private static string NormalizeText(string? value, string fallback, int maxLength)
    {
        var normalized = string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
        return normalized.Length > maxLength ? normalized[..maxLength] : normalized;
    }

    private static byte[]? DecodeAvatar(string? base64)
    {
        if (string.IsNullOrWhiteSpace(base64)) return null;
        var source = base64.Trim();
        var comma = source.IndexOf(',');
        if (source.StartsWith("data:", StringComparison.OrdinalIgnoreCase) && comma > 0) source = source[(comma + 1)..];
        byte[] bytes;
        try { bytes = Convert.FromBase64String(source); }
        catch (FormatException) { throw new PublicationRejectedException("avatar_invalid", "头像不是可读取的 PNG 数据。", 400); }
        if (bytes.Length > MaxAvatarBytes) throw new PublicationRejectedException("avatar_too_large", "PNG 头像不能超过 12 MB。", 400);
        try { PngCharacterCard.ValidateStructure(bytes); }
        catch (InvalidDataException error) { throw new PublicationRejectedException("avatar_invalid", error.Message, 400); }
        return bytes;
    }

    private static IReadOnlyList<JsonObject> BuildRegexScripts(IReadOnlyList<DeliveryArtifact> selected, bool includeBundle)
    {
        var scripts = new List<JsonObject>();
        var html = selected.FirstOrDefault(item => item.Target.Kind == "character_regex_replace");
        var find = selected.FirstOrDefault(item => item.Target.Kind == "character_regex_find");
        if (find is not null && html is null)
            throw new PublicationRejectedException("statusbar_incomplete", "已勾选状态栏查找表达式，但没有勾选状态栏界面。", 400);
        if (html is not null)
        {
            scripts.Add(RegexScript(
                Guid.NewGuid().ToString("D"),
                "🕹️显示状态栏",
                find?.Version.Content.Trim() ?? "<StatusPlaceHolderImpl/>",
                html.Version.Content.Trim(),
                [2],
                true,
                false,
                null));
        }

        if (includeBundle && selected.Any(item => item.Step == 24 && item.Identity == "SYS_output_format"))
        {
            foreach (var item in OutputRegexBundle())
                scripts.Add(RegexScript(item.Id, item.Name, item.Find, string.Empty, item.Placement, item.Display, item.Prompt, item.MinDepth));
        }
        return scripts;
    }

    private static JsonObject RegexScript(
        string id,
        string name,
        string find,
        string replace,
        int[] placement,
        bool display,
        bool prompt,
        int? minDepth)
    {
        // 酒馆卡片内部保存 camelCase 结构；display+prompt 同时开启等价于两个 Only 标志都关闭。
        return new JsonObject
        {
            ["id"] = id,
            ["scriptName"] = name,
            ["findRegex"] = find,
            ["replaceString"] = replace,
            ["trimStrings"] = new JsonArray(),
            ["placement"] = new JsonArray(placement.Select(value => (JsonNode?)value).ToArray()),
            ["disabled"] = false,
            ["markdownOnly"] = display && !prompt,
            ["promptOnly"] = prompt && !display,
            ["runOnEdit"] = true,
            ["substituteRegex"] = 0,
            ["minDepth"] = minDepth,
            ["maxDepth"] = null,
        };
    }

    private static IReadOnlyList<RegexBundleItem> OutputRegexBundle() =>
    [
        new("7ccce287-970f-48e2-a151-0dddc79d3ab2", "🕹️去除conception", "/<CONTEXT_conception>[\\s\\S]*?</CONTEXT_conception>/gs", [1, 2], true, true, null),
        new("139f6568-218c-40bc-9d05-53888efeab67", "🧩不发送剧情", "/<NARRATIVE>[\\s\\S]*?</NARRATIVE>/gs", [1, 2], false, true, 5),
        new("1f719870-73ce-4cee-aab9-ef32b587a427", "🧩不发送副剧情", "/<NARRATIVE_parallel>.*?</NARRATIVE_parallel>/gs", [1, 2], false, true, 5),
        new("0f340cb5-f1e6-4790-978a-53b63d7fad9c", "🕹️去除选择区", "/<CONTEXT_options>[\\s\\S]*?</CONTEXT_options>/gs", [1, 2], true, true, 2),
        new("f3284806-c7db-4508-90f3-454bd9a0e349", "🕹️隐藏摘要", "/<CONTEXT_summary>[\\s\\S]*?</CONTEXT_summary>/gs", [1, 2], true, false, null),
        new("4ce83bde-111d-4453-9e6d-afd7328bd017", "🕹️隐藏隐藏摘要", "/<CONTEXT_hidden_summary>[\\s\\S]*?</CONTEXT_hidden_summary>/gs", [1, 2], true, false, null),
        new("f4a96e51-622d-45cd-bbe9-2f69c2888b54", "🕹️隐藏变量更新", "/<UpdateVariable>[\\s\\S]*?</UpdateVariable>/gs", [1, 2], true, false, null),
        new("44f1f813-69ef-4262-bf3d-1bbc4ce071c0", "🕹️去除变量更新", "/<UpdateVariable>[\\s\\S]*?</UpdateVariable>/gs", [1], true, true, 2),
        new("1eb350ef-e06a-4e5c-9cef-237eb7e9aa6a", "🕹️去除状态栏", "/<STATUSBAR_DATA>[\\s\\S]*?</STATUSBAR_DATA>/gs", [1, 2], true, true, 3),
    ];

    private static JsonObject BuildStandaloneWorldbook(string name, IReadOnlyList<ReorgEntry> entries)
    {
        var objectEntries = new JsonObject();
        foreach (var entry in entries)
            objectEntries[entry.Uid.ToString()] = BuildWorldbookEntry(entry);
        return new JsonObject
        {
            ["name"] = name,
            ["entries"] = objectEntries,
        };
    }

    private static JsonObject BuildEmbeddedWorldbook(string name, IReadOnlyList<ReorgEntry> entries)
    {
        var result = new JsonArray();
        foreach (var entry in entries)
        {
            var position = Position(entry.PositionType);
            result.Add(new JsonObject
            {
                ["id"] = entry.Uid,
                ["keys"] = Strings(entry.Keys),
                ["secondary_keys"] = Strings(entry.SecondaryKeys),
                ["comment"] = entry.Name,
                ["content"] = entry.Content,
                ["constant"] = entry.StrategyType == "constant",
                ["selective"] = entry.StrategyType == "selective",
                ["insertion_order"] = entry.Order,
                ["enabled"] = entry.Enabled,
                ["position"] = position == 0 ? "before_char" : "after_char",
                ["use_regex"] = true,
                ["extensions"] = new JsonObject
                {
                    ["position"] = position,
                    ["exclude_recursion"] = false,
                    ["prevent_recursion"] = false,
                    ["delay_until_recursion"] = false,
                    ["display_index"] = entry.Uid,
                    ["probability"] = 100,
                    ["useProbability"] = true,
                    ["depth"] = entry.Depth,
                    ["selectiveLogic"] = SecondaryLogic(entry.SecondaryLogic),
                    ["role"] = Role(entry.Role),
                    ["sticky"] = entry.Sticky,
                    ["cooldown"] = entry.Cooldown,
                    ["delay"] = entry.Delay,
                    ["auto_card_studio"] = new JsonObject
                    {
                        ["artifact_version_ids"] = Strings(entry.ArtifactVersionIds),
                    },
                },
            });
        }
        return new JsonObject
        {
            ["name"] = name,
            ["description"] = "由 A.U.T.O 角色卡创作台生成",
            ["scan_depth"] = 2,
            ["token_budget"] = 25,
            ["recursive_scanning"] = false,
            ["extensions"] = new JsonObject(),
            ["entries"] = result,
        };
    }

    private static JsonObject BuildWorldbookEntry(ReorgEntry entry)
    {
        return new JsonObject
        {
            ["uid"] = entry.Uid,
            ["key"] = Strings(entry.Keys),
            ["keysecondary"] = Strings(entry.SecondaryKeys),
            ["comment"] = entry.Name,
            ["content"] = entry.Content,
            ["constant"] = entry.StrategyType == "constant",
            ["vectorized"] = false,
            ["selective"] = entry.StrategyType == "selective",
            ["selectiveLogic"] = SecondaryLogic(entry.SecondaryLogic),
            ["addMemo"] = true,
            ["order"] = entry.Order,
            ["position"] = Position(entry.PositionType),
            ["disable"] = !entry.Enabled,
            ["ignoreBudget"] = false,
            ["excludeRecursion"] = false,
            ["preventRecursion"] = false,
            ["delayUntilRecursion"] = false,
            ["probability"] = 100,
            ["useProbability"] = true,
            ["depth"] = entry.Depth,
            ["outletName"] = string.Empty,
            ["group"] = string.Empty,
            ["groupOverride"] = false,
            ["groupWeight"] = 100,
            ["scanDepth"] = null,
            ["caseSensitive"] = null,
            ["matchWholeWords"] = null,
            ["useGroupScoring"] = null,
            ["automationId"] = string.Empty,
            ["role"] = Role(entry.Role),
            ["sticky"] = entry.Sticky,
            ["cooldown"] = entry.Cooldown,
            ["delay"] = entry.Delay,
            ["triggers"] = new JsonArray(),
            ["displayIndex"] = entry.Uid,
            ["extensions"] = new JsonObject
            {
                ["auto_card_studio"] = new JsonObject
                {
                    ["artifact_version_ids"] = Strings(entry.ArtifactVersionIds),
                },
            },
        };
    }

    private static JsonObject BuildCharacterCard(
        StudioProject project,
        PublicationSettings settings,
        string opening,
        JsonObject embeddedBook,
        IReadOnlyList<JsonObject> regexes,
        IReadOnlyList<DeliveryArtifact> selected,
        string reorgMode)
    {
        var notes = new StringBuilder()
            .AppendLine("由 A.U.T.O 角色卡创作台独立版生成")
            .AppendLine($"项目：{project.Name}")
            .AppendLine($"更新时间：{DateTimeOffset.Now:yyyy-MM-dd HH:mm:ss zzz}")
            .AppendLine($"输出语言：{settings.Language}")
            .AppendLine($"叙事人称：{settings.Person}")
            .AppendLine($"发布重组：{reorgMode}")
            .AppendLine($"本次交付：{string.Join('、', selected.Select(item => item.Version.DisplayName))}")
            .AppendLine()
            .Append(project.Brief)
            .ToString();
        var regexArray = new JsonArray(regexes.Select(item => item.DeepClone()).ToArray());
        return new JsonObject
        {
            ["spec"] = "chara_card_v3",
            ["spec_version"] = "3.0",
            ["data"] = new JsonObject
            {
                ["name"] = settings.CharacterName,
                ["description"] = $"# {project.Name}\n\n{project.Brief}",
                ["personality"] = string.Empty,
                ["scenario"] = string.Empty,
                ["first_mes"] = opening,
                ["mes_example"] = string.Empty,
                ["creator_notes"] = notes,
                ["system_prompt"] = string.Empty,
                ["post_history_instructions"] = string.Empty,
                ["alternate_greetings"] = new JsonArray(),
                ["tags"] = new JsonArray("A.U.T.O", "独立创作台"),
                ["creator"] = settings.Creator,
                ["character_version"] = "1.0.0",
                ["character_book"] = embeddedBook.DeepClone(),
                ["extensions"] = new JsonObject
                {
                    ["regex_scripts"] = regexArray,
                    ["tavern_helper"] = new JsonObject
                    {
                        ["scripts"] = new JsonArray(),
                        ["variables"] = new JsonObject(),
                    },
                },
            },
        };
    }

    private static string ExtractOpening(string? content, string projectName)
    {
        if (string.IsNullOrWhiteSpace(content)) return $"欢迎来到「{projectName}」。";
        var wanted = new HashSet<string>(["NARRATIVE", "NARRATIVE_parallel", "CONTEXT_options", "CONTEXT_summary", "CONTEXT_hidden_summary", "UpdateVariable", "STATUSBAR_DATA"], StringComparer.Ordinal);
        var matches = Regex.Matches(content, @"<(?<tag>[A-Za-z][A-Za-z0-9_:-]*)\b[^>]*>[\s\S]*?</\k<tag>>")
            .Where(match => wanted.Contains(match.Groups["tag"].Value))
            .Select(match => match.Value.Trim())
            .ToList();
        return matches.Count > 0 ? string.Join("\n\n", matches) : content.Trim();
    }

    private static string BuildDossier(
        StudioProject project,
        PublicationSettings settings,
        IReadOnlyList<DeliveryArtifact> selected,
        string reorgMode,
        IReadOnlyList<string> warnings)
    {
        var text = new StringBuilder()
            .AppendLine($"# {project.Name}")
            .AppendLine()
            .AppendLine("## 创作母题")
            .AppendLine()
            .AppendLine(string.IsNullOrWhiteSpace(project.Brief) ? "未填写" : project.Brief)
            .AppendLine()
            .AppendLine("## 创作设置")
            .AppendLine()
            .AppendLine($"- 创作者：{settings.Creator}")
            .AppendLine($"- 输出语言：{settings.Language}")
            .AppendLine($"- 叙事人称：{settings.Person}")
            .AppendLine($"- 角色卡：{settings.CharacterName}")
            .AppendLine($"- 世界书：{settings.WorldbookName}")
            .AppendLine($"- 世界书重组：{reorgMode}");
        if (warnings.Count > 0)
        {
            text.AppendLine().AppendLine("## 发布提示").AppendLine();
            foreach (var warning in warnings) text.AppendLine($"- {warning}");
        }
        foreach (var step in selected.GroupBy(item => item.Step).OrderBy(item => item.Key))
        {
            text.AppendLine().AppendLine($"## Step {step.Key}").AppendLine();
            foreach (var item in step)
            {
                text.AppendLine($"### {item.Version.DisplayName}").AppendLine().AppendLine(item.Version.Content).AppendLine();
            }
        }
        return text.ToString();
    }

    private static void ValidateCoverage(IReadOnlyList<DeliveryArtifact> selected, IReadOnlyList<ReorgEntry> entries)
    {
        // 正文可能经过合法的 wrap/rename 变换，完整性应以已校验的版本 ID 映射为准。
        var expected = selected.Select(item => item.Version.Id).Order(StringComparer.Ordinal).ToList();
        var actual = entries.SelectMany(item => item.ArtifactVersionIds).Order(StringComparer.Ordinal).ToList();
        if (!expected.SequenceEqual(actual, StringComparer.Ordinal))
            throw new InvalidDataException("发布完整性复核失败：最终世界书没有逐项覆盖全部已选产物。");
    }

    private static void ValidateWorldbookObject(JsonObject worldbook)
    {
        if (worldbook["entries"] is not JsonObject entries) throw new InvalidDataException("世界书缺少 entries 对象。");
        foreach (var item in entries)
        {
            if (item.Value is not JsonObject entry || entry["uid"]?.GetValue<int>().ToString() != item.Key)
                throw new InvalidDataException("世界书 entries 对象键必须严格等于字符串化 uid。");
            if (string.IsNullOrWhiteSpace(entry["content"]?.GetValue<string>())) throw new InvalidDataException($"世界书条目 {item.Key} 正文为空。");
        }
    }

    private static void ValidateRegexes(IReadOnlyList<JsonObject> regexes)
    {
        var ids = new HashSet<string>(StringComparer.Ordinal);
        foreach (var script in regexes)
        {
            var id = script["id"]?.GetValue<string>() ?? string.Empty;
            if (id.Length == 0 || !ids.Add(id)) throw new InvalidDataException("角色卡局部正则 ID 缺失或重复。");
            foreach (var field in new[] { "scriptName", "findRegex", "replaceString", "trimStrings", "placement", "disabled", "markdownOnly", "promptOnly", "runOnEdit", "substituteRegex", "minDepth", "maxDepth" })
                if (!script.ContainsKey(field)) throw new InvalidDataException($"局部正则 {id} 缺少 {field}。");
        }
    }

    private static void ValidateCard(JsonObject card)
    {
        if (card["spec"]?.GetValue<string>() != "chara_card_v3" || card["spec_version"]?.GetValue<string>() != "3.0")
            throw new InvalidDataException("角色卡规范字段无效。");
        if (card["data"] is not JsonObject data) throw new InvalidDataException("角色卡缺少 data 对象。");
        foreach (var field in new[] { "name", "description", "personality", "scenario", "first_mes", "mes_example", "creator_notes", "system_prompt", "post_history_instructions", "alternate_greetings", "tags", "creator", "character_version", "extensions", "character_book" })
            if (!data.ContainsKey(field)) throw new InvalidDataException($"角色卡缺少 data.{field}。");
        if (string.IsNullOrWhiteSpace(data["name"]?.GetValue<string>())) throw new InvalidDataException("角色卡名称为空。");
        if (data["character_book"]?["entries"] is not JsonArray) throw new InvalidDataException("角色卡内嵌世界书 entries 必须是数组。");
        if (data["extensions"]?["regex_scripts"] is not JsonArray) throw new InvalidDataException("角色卡局部正则必须是数组。");
    }

    private static byte[] BuildZip(IReadOnlyDictionary<string, byte[]> files)
    {
        using var buffer = new MemoryStream();
        using (var archive = new ZipArchive(buffer, ZipArchiveMode.Create, leaveOpen: true, Encoding.UTF8))
        {
            foreach (var file in files)
            {
                var entry = archive.CreateEntry(file.Key, CompressionLevel.Optimal);
                using var output = entry.Open();
                output.Write(file.Value);
            }
        }
        return buffer.ToArray();
    }

    private static void ValidateZip(byte[] zip, IEnumerable<string> expectedNames)
    {
        using var buffer = new MemoryStream(zip, writable: false);
        using var archive = new ZipArchive(buffer, ZipArchiveMode.Read, leaveOpen: false, Encoding.UTF8);
        var names = archive.Entries.Select(item => item.FullName).Order(StringComparer.Ordinal).ToList();
        var expected = expectedNames.Order(StringComparer.Ordinal).ToList();
        if (!names.SequenceEqual(expected, StringComparer.Ordinal)) throw new InvalidDataException("ZIP 文件清单复核失败。");
        foreach (var entry in archive.Entries)
            if (entry.Length == 0) throw new InvalidDataException($"ZIP 中的 {entry.FullName} 为空。");
    }

    private static JsonArray Strings(IEnumerable<string> values) => new(values.Select(value => (JsonNode?)value).ToArray());
    private static int Position(string value) => value switch
    {
        "before_character_definition" => 0,
        "after_character_definition" => 1,
        "before_author_note" => 2,
        "after_author_note" => 3,
        "at_depth" => 4,
        "before_example_messages" => 5,
        "after_example_messages" => 6,
        _ => 1,
    };
    private static int Role(string value) => value switch { "user" => 1, "assistant" => 2, _ => 0 };
    private static int SecondaryLogic(string value) => value switch { "not_all" => 1, "not_any" => 2, "and_all" => 3, _ => 0 };
    private static string SafeFileName(string value)
    {
        var invalid = Path.GetInvalidFileNameChars().ToHashSet();
        var safe = new string(value.Select(character => invalid.Contains(character) || char.IsControl(character) ? '_' : character).ToArray()).Trim();
        return string.IsNullOrWhiteSpace(safe) ? "AUTO角色卡" : safe.Truncate(90);
    }

    private static string SourceWorldbookName(StudioProject project) => $"A.U.T.O 创作台·{project.Name}";
    private static bool EntryEnabled(string name) => name.StartsWith("🕹️", StringComparison.Ordinal) || name.StartsWith("🧩", StringComparison.Ordinal);
    private static double? ReadNumber(JsonNode? node) => node is JsonValue value && value.TryGetValue<double>(out var number) && double.IsFinite(number) ? number : null;
    private static bool? ReadBool(JsonNode? node) => node is JsonValue value && value.TryGetValue<bool>(out var result) ? result : null;
    private static IReadOnlyList<string> ReadStrings(JsonNode? node) => node is JsonArray array ? array.Select(item => item?.GetValue<string>() ?? string.Empty).Where(item => item.Length > 0).ToList() : [];

    private sealed record GeneratedReorg(JsonObject? Plan, IReadOnlyList<ReorgEntry> Entries, IReadOnlyList<string> Warnings, string Mode);
    private sealed record ReorgValidation(bool Valid, IReadOnlyList<string> Errors, IReadOnlyList<string> Warnings, IReadOnlyList<ReorgEntry> Entries);
    private sealed record DeliveryTarget(string Kind, string Name);
    private sealed record DeliveryArtifact(string Key, int Step, string Identity, ArtifactVersion Version, DeliveryTarget Target);
    private sealed record SourceBlock(string BlockId, string Type, DeliveryArtifact Artifact);
    private sealed record SourceEntry(int Uid, string Name, IReadOnlyList<SourceBlock> Blocks);
    private sealed record SourceModel(IReadOnlyList<SourceEntry> Entries, IReadOnlyDictionary<string, SourceBlock> Blocks);
    private sealed record RegexBundleItem(string Id, string Name, string Find, int[] Placement, bool Display, bool Prompt, int? MinDepth);
}

internal static class PublicationStringExtensions
{
    public static string Truncate(this string value, int max) => value.Length <= max ? value : value[..max];
}

public sealed record PublicationSettings(
    string CharacterName,
    string WorldbookName,
    string Creator,
    string Language,
    string Person,
    bool IncludeOutputRegexBundle);

public sealed record PublicationChoice(
    string VersionId,
    string ArtifactKey,
    int Step,
    string Identity,
    string DisplayName,
    string TargetKind,
    string TargetName,
    string Source);

public sealed record PublicationState(
    long ArtifactRevision,
    IReadOnlyList<PublicationChoice> Choices,
    PublicationSettings Settings,
    bool HasReusableReorgPlan,
    DateTimeOffset? LastPublishedAt);

public sealed record BuildPublicationRequest(
    long ExpectedArtifactRevision,
    IReadOnlyList<string> SelectedVersionIds,
    PublicationSettings? Settings,
    string? AvatarPngBase64 = null);

public sealed record PublicationPackage(
    string FileName,
    byte[] Content,
    string ReorgMode,
    IReadOnlyList<string> Warnings);

public sealed record PublicationCache(
    int SchemaVersion,
    string SelectionSignature,
    JsonObject? Plan,
    PublicationSettings Settings,
    DateTimeOffset UpdatedAt);

public sealed record ReorgEntry(
    int Uid,
    string Name,
    bool Enabled,
    string StrategyType,
    IReadOnlyList<string> Keys,
    string SecondaryLogic,
    IReadOnlyList<string> SecondaryKeys,
    string PositionType,
    string Role,
    double Depth,
    double Order,
    string Content,
    double? Sticky,
    double? Cooldown,
    double? Delay,
    IReadOnlyList<string> ArtifactVersionIds);

public sealed class PublicationRejectedException(string code, string message, int statusCode) : Exception(message)
{
    public string Code { get; } = code;
    public int StatusCode { get; } = statusCode;
}

public static class PngCharacterCard
{
    private static readonly byte[] Signature = [137, 80, 78, 71, 13, 10, 26, 10];

    public static byte[] Embed(byte[] source, string cardJson)
    {
        var chunks = ReadChunks(source);
        using var output = new MemoryStream(source.Length + cardJson.Length * 3);
        output.Write(Signature);
        var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(cardJson));
        foreach (var chunk in chunks)
        {
            if (chunk.Type == "IEND")
            {
                WriteChunk(output, "tEXt", Encoding.UTF8.GetBytes($"chara\0{base64}"));
                WriteChunk(output, "tEXt", Encoding.UTF8.GetBytes($"ccv3\0{base64}"));
            }
            if (chunk.Type == "tEXt" && IsCharacterTextChunk(chunk.Data)) continue;
            WriteChunk(output, chunk.Type, chunk.Data);
        }
        return output.ToArray();
    }

    public static void ValidateStructure(byte[] png) => _ = ReadChunks(png);

    public static void Validate(byte[] png, string expectedJson)
    {
        var chunks = ReadChunks(png);
        var text = chunks.Where(item => item.Type == "tEXt").Select(DecodeText).Where(item => item is not null).ToList();
        var ccv3 = text.LastOrDefault(item => item!.Value.Keyword.Equals("ccv3", StringComparison.OrdinalIgnoreCase));
        var chara = text.LastOrDefault(item => item!.Value.Keyword.Equals("chara", StringComparison.OrdinalIgnoreCase));
        if (ccv3 is null || chara is null) throw new InvalidDataException("PNG 缺少 chara 或 ccv3 角色卡元数据。");
        string decoded;
        try { decoded = Encoding.UTF8.GetString(Convert.FromBase64String(ccv3.Value.Text)); }
        catch (FormatException) { throw new InvalidDataException("PNG 的 ccv3 元数据不是有效 Base64。"); }
        if (!string.Equals(decoded, expectedJson, StringComparison.Ordinal)) throw new InvalidDataException("PNG 内角色数据与 JSON 角色卡不一致。");
        if (JsonNode.Parse(decoded)?["spec"]?.GetValue<string>() != "chara_card_v3") throw new InvalidDataException("PNG 内角色卡规范无效。");
    }

    private static IReadOnlyList<PngChunk> ReadChunks(byte[] png)
    {
        if (png.Length < Signature.Length + 12 || !png.AsSpan(0, Signature.Length).SequenceEqual(Signature))
            throw new InvalidDataException("头像不是结构有效的 PNG 文件。");
        var chunks = new List<PngChunk>();
        var offset = Signature.Length;
        var sawIhdr = false;
        var sawIend = false;
        while (offset < png.Length)
        {
            if (offset + 12 > png.Length) throw new InvalidDataException("PNG 数据块被截断。");
            var length = BinaryPrimitives.ReadUInt32BigEndian(png.AsSpan(offset, 4));
            if (length > int.MaxValue || offset + 12L + length > png.Length) throw new InvalidDataException("PNG 数据块长度无效。");
            var type = Encoding.ASCII.GetString(png, offset + 4, 4);
            var data = png.AsSpan(offset + 8, (int)length).ToArray();
            var storedCrc = BinaryPrimitives.ReadUInt32BigEndian(png.AsSpan(offset + 8 + (int)length, 4));
            var crcInput = new byte[4 + data.Length];
            Encoding.ASCII.GetBytes(type).CopyTo(crcInput, 0);
            data.CopyTo(crcInput, 4);
            if (Crc32(crcInput) != storedCrc) throw new InvalidDataException($"PNG 数据块 {type} 校验失败。");
            if (chunks.Count == 0 && type != "IHDR") throw new InvalidDataException("PNG 的第一个数据块不是 IHDR。");
            sawIhdr |= type == "IHDR";
            sawIend |= type == "IEND";
            chunks.Add(new PngChunk(type, data));
            offset += 12 + (int)length;
            if (type == "IEND") break;
        }
        if (!sawIhdr || !sawIend) throw new InvalidDataException("PNG 缺少 IHDR 或 IEND 数据块。");
        return chunks;
    }

    private static bool IsCharacterTextChunk(byte[] data)
    {
        var decoded = DecodeText(new PngChunk("tEXt", data));
        return decoded is not null && (decoded.Value.Keyword.Equals("chara", StringComparison.OrdinalIgnoreCase) || decoded.Value.Keyword.Equals("ccv3", StringComparison.OrdinalIgnoreCase));
    }

    private static (string Keyword, string Text)? DecodeText(PngChunk chunk)
    {
        var separator = Array.IndexOf(chunk.Data, (byte)0);
        if (separator <= 0) return null;
        return (Encoding.Latin1.GetString(chunk.Data, 0, separator), Encoding.Latin1.GetString(chunk.Data, separator + 1, chunk.Data.Length - separator - 1));
    }

    private static void WriteChunk(Stream output, string type, byte[] data)
    {
        Span<byte> length = stackalloc byte[4];
        BinaryPrimitives.WriteUInt32BigEndian(length, (uint)data.Length);
        output.Write(length);
        var typeBytes = Encoding.ASCII.GetBytes(type);
        output.Write(typeBytes);
        output.Write(data);
        var crcInput = new byte[typeBytes.Length + data.Length];
        typeBytes.CopyTo(crcInput, 0);
        data.CopyTo(crcInput, typeBytes.Length);
        Span<byte> crc = stackalloc byte[4];
        BinaryPrimitives.WriteUInt32BigEndian(crc, Crc32(crcInput));
        output.Write(crc);
    }

    private static uint Crc32(ReadOnlySpan<byte> data)
    {
        var crc = 0xFFFFFFFFu;
        foreach (var value in data)
        {
            crc ^= value;
            for (var bit = 0; bit < 8; bit++) crc = (crc & 1) != 0 ? (crc >> 1) ^ 0xEDB88320u : crc >> 1;
        }
        return ~crc;
    }

    private sealed record PngChunk(string Type, byte[] Data);
}
