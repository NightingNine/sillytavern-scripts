using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace AutoCardStudio.Host;

public static class AutoWorkflow
{
    public static readonly string[] StepPromptIds =
    [
        "9376366e-bf35-446f-babe-438959ccc452", "94e2bf01-18df-4be8-9377-aa12d53e654a", "487bb55b-da3f-4ee7-8f6d-0c23b5591bc2",
        "ac469228-bd1a-444b-a61e-fa91bea00042", "91be7e14-4169-4e4e-b0b2-c4a32c8809f0", "e9b91a84-50d3-40db-b642-084797782bc6",
        "bb9bb9b7-3b3d-4b1a-8eb9-0a23ed3d799d", "2eeba189-911a-4d15-bf46-7caba49581b7", "835fe974-b281-4077-9ef1-10ad92ce65ba",
        "07688972-a290-4b22-a210-3f9df7ef0781", "430d57cf-d2ea-46ce-b83d-624ca2300f2b", "6ab76630-4988-4dcb-a1b7-2e2635ec7a00",
        "c6a34ba6-393f-48c7-993d-86c47de6a35c", "324e85a9-0fc1-4e8b-85cf-1ff9851f5b03", "35ea2ccc-99c5-4731-a25a-0693614b07fa",
        "d491235e-9535-48b0-8b15-6c0e777114fb", "60b1db7c-30d4-4a86-bd41-67e13c5084e0", "dace3da4-0f0d-4c81-8e7c-02db7e716acf",
        "5255b750-60b7-4f53-ad3b-3a950452d0f1", "d8f77e8f-ab6c-486f-a422-c136d7d5cb95", "db7539c5-8920-4899-bbdc-9c0d910beb43",
        "5472b214-c260-4ce8-97c2-7e9831cce93d", "d6d362c4-5556-4bd0-a08c-067afb3424b1", "268aa2ec-491c-4232-827d-8dbe291d4917",
        "829abf27-660e-4df4-8925-d7041bfd2868", "3a430168-7280-44ed-ab33-a0e8e4bbaf35", "ca6d2266-d37f-4596-bd2b-b61ac0f7ba49",
        "4c520657-a4b7-460f-95cf-96c1931c4cdc", "0b166044-370f-428d-ba4c-35531287b921",
    ];

    public const string ReorganizationPromptId = "bdc8f3a0-37a3-415a-b01d-b91359b79104";

    public static readonly HashSet<string> PlaceholderIds = new(StringComparer.Ordinal)
    {
        "worldInfoBefore", "personaDescription", "charDescription", "charPersonality",
        "scenario", "worldInfoAfter", "dialogueExamples", "chatHistory",
    };

    public static readonly HashSet<string> WorkflowPromptIds = new(
        StepPromptIds.Append(ReorganizationPromptId), StringComparer.Ordinal);
}

public sealed class ResourceStore
{
    private const int MaxImportCharacters = 20 * 1024 * 1024;
    private readonly string _resourceRoot;
    private readonly string _importRoot;
    private readonly string _presetPath;
    private readonly string _regexPath;
    private readonly AtomicJsonFile _files = new();
    private readonly SemaphoreSlim _gate = new(1, 1);

    public ResourceStore(string dataRoot)
    {
        _resourceRoot = Path.Combine(Path.GetFullPath(dataRoot), "resources");
        _importRoot = Path.Combine(Path.GetFullPath(dataRoot), "imports");
        _presetPath = Path.Combine(_resourceRoot, "auto-preset.json");
        _regexPath = Path.Combine(_resourceRoot, "response-regexes.json");
    }

    public Task InitializeAsync()
    {
        Directory.CreateDirectory(_resourceRoot);
        Directory.CreateDirectory(Path.Combine(_importRoot, "presets"));
        Directory.CreateDirectory(Path.Combine(_importRoot, "regexes"));
        return Task.CompletedTask;
    }

    public async Task<ResourceState> GetStateAsync()
    {
        await _gate.WaitAsync();
        try { return await ReadStateUnsafeAsync(); }
        finally { _gate.Release(); }
    }

    public async Task<ImportedPreset?> GetPresetAsync()
    {
        await _gate.WaitAsync();
        try { return await _files.ReadRecoverableAsync<ImportedPreset>(_presetPath); }
        finally { _gate.Release(); }
    }

    public async Task<IReadOnlyList<StudioRegex>> GetRegexesAsync()
    {
        await _gate.WaitAsync();
        try { return await _files.ReadRecoverableAsync<List<StudioRegex>>(_regexPath) ?? []; }
        finally { _gate.Release(); }
    }

    public async Task<ResourceState> ImportPresetAsync(ImportFileRequest request)
    {
        ValidateImport(request);
        var normalized = NormalizePreset(request.Content, request.FileName, out var embeddedRegexes);
        await _gate.WaitAsync();
        try
        {
            await ArchiveOriginalAsync("presets", request.FileName, normalized.SourceSha256, request.Content);
            await _files.WriteAtomicAsync(_presetPath, normalized);
            if (embeddedRegexes.Count > 0)
            {
                await _files.WriteAtomicAsync(_regexPath, embeddedRegexes);
            }
            return await ReadStateUnsafeAsync();
        }
        finally { _gate.Release(); }
    }

    public async Task<ResourceState> ImportRegexesAsync(ImportFileRequest request)
    {
        ValidateImport(request);
        var hash = Sha256(request.Content);
        var regexes = NormalizeRegexes(JsonNode.Parse(request.Content), hash);
        if (regexes.Count == 0) throw new InvalidDataException("文件中没有找到可导入的正则条目。");
        await _gate.WaitAsync();
        try
        {
            await ArchiveOriginalAsync("regexes", request.FileName, hash, request.Content);
            await _files.WriteAtomicAsync(_regexPath, regexes);
            return await ReadStateUnsafeAsync();
        }
        finally { _gate.Release(); }
    }

    private async Task<ResourceState> ReadStateUnsafeAsync()
    {
        var preset = await _files.ReadRecoverableAsync<ImportedPreset>(_presetPath);
        var regexes = await _files.ReadRecoverableAsync<List<StudioRegex>>(_regexPath) ?? [];
        return new ResourceState(
            preset is null ? null : new PresetSummary(preset.Name, preset.Prompts.Count, preset.ImportedAt, preset.SourceFileName, preset.SourceSha256, preset.Settings),
            new RegexSummary(regexes.Count, regexes.Count(item => !item.Disabled)));
    }

    private async Task ArchiveOriginalAsync(string kind, string fileName, string hash, string content)
    {
        var safeName = string.Concat(Path.GetFileNameWithoutExtension(fileName).Select(character => Path.GetInvalidFileNameChars().Contains(character) ? '_' : character));
        if (string.IsNullOrWhiteSpace(safeName)) safeName = kind;
        var path = Path.Combine(_importRoot, kind, $"{safeName}-{hash[..12]}.json");
        await AtomicJsonFile.WriteOriginalAsync(path, content);
    }

    private static ImportedPreset NormalizePreset(string content, string fileName, out List<StudioRegex> embeddedRegexes)
    {
        var root = JsonNode.Parse(content) as JsonObject ?? throw new InvalidDataException("预设 JSON 顶层必须是对象。");
        var promptPool = root["prompts"] as JsonArray ?? throw new InvalidDataException("文件中没有找到 SillyTavern 预设 prompts。");
        var orderGroups = root["prompt_order"] as JsonArray ?? throw new InvalidDataException("预设中没有找到 prompt_order。");
        var activeOrder = orderGroups
            .OfType<JsonObject>()
            .Select(item => item["order"] as JsonArray)
            .Where(item => item is not null)
            .OrderByDescending(item => item!.Count)
            .FirstOrDefault() ?? throw new InvalidDataException("预设中没有找到当前使用的 prompt_order。");

        var order = activeOrder.OfType<JsonObject>()
            .Select((item, index) => new
            {
                Id = item["identifier"]?.GetValue<string>() ?? string.Empty,
                Enabled = item["enabled"]?.GetValue<bool?>() != false,
                Index = index,
            })
            .Where(item => !string.IsNullOrWhiteSpace(item.Id))
            .ToDictionary(item => item.Id, StringComparer.Ordinal);

        var prompts = promptPool.OfType<JsonObject>()
            .Select((item, sourceIndex) =>
            {
                var id = item["identifier"]?.GetValue<string>() ?? item["id"]?.GetValue<string>() ?? string.Empty;
                if (!order.TryGetValue(id, out var state)) return null;
                return new PresetPrompt(
                    id,
                    item["name"]?.GetValue<string>() ?? id ?? $"条目 {sourceIndex + 1}",
                    NormalizeRole(item["role"]?.GetValue<string>()),
                    item["content"]?.GetValue<string>() ?? string.Empty,
                    state.Enabled,
                    state.Index);
            })
            .Where(item => item is not null)
            .Cast<PresetPrompt>()
            .OrderBy(item => item.Order)
            .ToList();

        var present = prompts.Select(item => item.Id).ToHashSet(StringComparer.Ordinal);
        var missing = AutoWorkflow.WorkflowPromptIds.Where(id => !present.Contains(id)).ToList();
        if (missing.Count > 0) throw new InvalidDataException($"该文件不是完整的 A.U.T.O 预设：缺少 {missing.Count} 个步骤条目。");

        var hash = Sha256(content);
        var settings = new ModelParameters(
            ReadNumber(root, "openai_max_context") ?? 2_000_000,
            ReadNumber(root, "openai_max_tokens"),
            ReadNumber(root, "temperature"),
            ReadNumber(root, "top_p"),
            ReadNumber(root, "top_k"),
            ReadNumber(root, "frequency_penalty"),
            ReadNumber(root, "presence_penalty"));
        embeddedRegexes = NormalizeRegexes(root["extensions"]?["regex_scripts"], hash);
        return new ImportedPreset(
            root["name"]?.GetValue<string>() ?? Path.GetFileNameWithoutExtension(fileName) ?? "A.U.T.O 预设",
            DateTimeOffset.UtcNow,
            2,
            Path.GetFileName(fileName),
            hash,
            prompts,
            settings);
    }

    private static List<StudioRegex> NormalizeRegexes(JsonNode? raw, string sourceHash)
    {
        var source = raw switch
        {
            JsonArray array => array,
            JsonObject obj when obj["extensions"]?["regex_scripts"] is JsonArray nested => nested,
            JsonObject obj when obj["regex_scripts"] is JsonArray direct => direct,
            JsonObject obj when obj["findRegex"] is not null || obj["find_regex"] is not null => new JsonArray(obj.DeepClone()),
            _ => [],
        };
        return source.OfType<JsonObject>().Select((item, index) =>
        {
            var modern = item["findRegex"] is not null;
            var placements = modern
                ? (item["placement"] as JsonArray)?.Select(value => value?.GetValue<int>() ?? -1).Where(value => value >= 0).ToList() ?? []
                : item["source"]?["ai_output"]?.GetValue<bool?>() == true ? [2] : [];
            return new StudioRegex(
                item["id"]?.GetValue<string>() ?? $"acs-imported-regex-{sourceHash[..12]}-{index}",
                item["scriptName"]?.GetValue<string>() ?? item["script_name"]?.GetValue<string>() ?? $"正则 {index + 1}",
                modern ? item["disabled"]?.GetValue<bool?>() == true : item["enabled"]?.GetValue<bool?>() == false,
                item["findRegex"]?.GetValue<string>() ?? item["find_regex"]?.GetValue<string>() ?? string.Empty,
                item["replaceString"]?.GetValue<string>() ?? item["replace_string"]?.GetValue<string>() ?? string.Empty,
                (item["trimStrings"] as JsonArray ?? item["trim_strings"] as JsonArray)?.Select(value => value?.GetValue<string>() ?? string.Empty).ToList() ?? [],
                placements,
                modern ? item["markdownOnly"]?.GetValue<bool?>() == true : item["destination"]?["display"]?.GetValue<bool?>() == true,
                modern ? item["promptOnly"]?.GetValue<bool?>() == true : item["destination"]?["prompt"]?.GetValue<bool?>() == true);
        }).ToList();
    }

    private static void ValidateImport(ImportFileRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Content)) throw new InvalidDataException("导入文件为空。");
        if (request.Content.Length > MaxImportCharacters) throw new InvalidDataException("导入文件超过 20 MB。");
    }

    private static string NormalizeRole(string? role) => role is "assistant" or "user" ? role : "system";
    private static double? ReadNumber(JsonObject root, string key) => root[key] is JsonValue value && value.TryGetValue<double>(out var number) && double.IsFinite(number) ? number : null;
    private static string Sha256(string content) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(content))).ToLowerInvariant();
}

public static class ResponseRegexProcessor
{
    public static string Process(string input, IEnumerable<StudioRegex> scripts, string mode)
    {
        var output = input;
        foreach (var script in scripts.Where(script => ShouldRun(script, mode)))
        {
            try
            {
                foreach (var trim in script.TrimStrings) output = output.Replace(trim, string.Empty, StringComparison.Ordinal);
                var (pattern, options, replaceFirstOnly) = Parse(script.FindRegex);
                var regex = new Regex(pattern, options, TimeSpan.FromSeconds(2));
                output = replaceFirstOnly ? regex.Replace(output, script.ReplaceString, 1) : regex.Replace(output, script.ReplaceString);
            }
            catch (Exception error) when (error is ArgumentException or RegexMatchTimeoutException)
            {
                // 单条不兼容正则不能让整轮生成丢失，后续诊断阶段会展示未执行条目。
            }
        }
        return output;
    }

    private static bool ShouldRun(StudioRegex script, string mode)
    {
        if (script.Disabled || string.IsNullOrWhiteSpace(script.FindRegex) || !script.Placement.Contains(2)) return false;
        return mode switch
        {
            "display" => script.MarkdownOnly,
            "prompt" => script.PromptOnly,
            _ => !script.MarkdownOnly && !script.PromptOnly,
        };
    }

    private static (string Pattern, RegexOptions Options, bool ReplaceFirstOnly) Parse(string source)
    {
        if (!source.StartsWith('/')) return (source, RegexOptions.None, false);
        var slash = source.LastIndexOf('/');
        if (slash <= 0) return (source, RegexOptions.None, false);
        var flags = source[(slash + 1)..];
        var options = RegexOptions.None;
        if (flags.Contains('i')) options |= RegexOptions.IgnoreCase;
        if (flags.Contains('m')) options |= RegexOptions.Multiline;
        if (flags.Contains('s')) options |= RegexOptions.Singleline;
        return (source[1..slash], options, !flags.Contains('g'));
    }
}

public sealed record ImportFileRequest(string FileName, string Content);
public sealed record ImportedPreset(string Name, DateTimeOffset ImportedAt, int ImportFormatVersion, string SourceFileName, string SourceSha256, IReadOnlyList<PresetPrompt> Prompts, ModelParameters Settings);
public sealed record PresetPrompt(string Id, string Name, string Role, string Content, bool Enabled, int Order);
public sealed record ModelParameters(double MaxContextTokens, double? MaxCompletionTokens, double? Temperature, double? TopP, double? TopK, double? FrequencyPenalty, double? PresencePenalty);
public sealed record StudioRegex(string Id, string ScriptName, bool Disabled, string FindRegex, string ReplaceString, IReadOnlyList<string> TrimStrings, IReadOnlyList<int> Placement, bool MarkdownOnly, bool PromptOnly);
public sealed record ResourceState(PresetSummary? Preset, RegexSummary Regexes);
public sealed record PresetSummary(string Name, int PromptCount, DateTimeOffset ImportedAt, string SourceFileName, string SourceSha256, ModelParameters Settings);
public sealed record RegexSummary(int Total, int Enabled);
