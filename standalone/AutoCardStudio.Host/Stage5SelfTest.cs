using System.IO.Compression;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging.Abstractions;

namespace AutoCardStudio.Host;

public static class Stage5SelfTest
{
    public static async Task<int> RunAsync()
    {
        var root = Path.Combine(Path.GetTempPath(), $"acs-stage5-test-{Guid.NewGuid():N}");
        try
        {
            var projects = new ProjectStore(root);
            var artifacts = new ArtifactStore(root);
            var resources = new ResourceStore(root);
            var connections = new ConnectionStore(root, new WindowsCredentialVault());
            await projects.InitializeAsync();
            await resources.InitializeAsync();
            await connections.InitializeAsync();
            var initial = await projects.GetStateAsync();

            await artifacts.CaptureAsync(initial.Project.Id, 4,
                "<WORLD_blueprint>世界蓝图验收正文</WORLD_blueprint>", "generated");
            await artifacts.CaptureAsync(initial.Project.Id, 24,
                "<SYS_output_format>输出格式验收正文</SYS_output_format>", "generated");
            await artifacts.CaptureAsync(initial.Project.Id, 29,
                "```opening\n<NARRATIVE>开场验收正文</NARRATIVE>\n```", "generated");

            using var http = new HttpClient { Timeout = Timeout.InfiniteTimeSpan };
            var publication = new PublicationService(
                projects,
                artifacts,
                resources,
                connections,
                new ModelGateway(http),
                root,
                NullLogger<PublicationService>.Instance);
            var publicationState = await publication.GetStateAsync(initial.Project.Id);
            if (publicationState.Choices.Count != 3 || publicationState.ArtifactRevision < 2) return 70;

            const string onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
            var package = await publication.BuildAsync(initial.Project.Id, new BuildPublicationRequest(
                publicationState.ArtifactRevision,
                publicationState.Choices.Select(item => item.VersionId).ToList(),
                publicationState.Settings with { CharacterName = "阶段五验收卡", IncludeOutputRegexBundle = true },
                onePixelPng),
                CancellationToken.None);
            if (package.ReorgMode != "safe-fallback" || package.Warnings.Count == 0) return 71;

            using var zipStream = new MemoryStream(package.Content, writable: false);
            using var zip = new ZipArchive(zipStream, ZipArchiveMode.Read);
            var names = zip.Entries.Select(item => item.FullName).ToHashSet(StringComparer.Ordinal);
            var expected = new[]
            {
                "阶段五验收卡.character.json",
                "阶段五验收卡.worldbook.json",
                "阶段五验收卡.regex.json",
                "阶段五验收卡-创作档案.md",
                "阶段五验收卡.png",
            };
            if (!expected.All(names.Contains)) return 72;

            var card = JsonNode.Parse(await ReadTextAsync(zip, "阶段五验收卡.character.json")) as JsonObject;
            if (card?["spec"]?.GetValue<string>() != "chara_card_v3") return 73;
            if (card["data"]?["extensions"]?["regex_scripts"] is not JsonArray regexes || regexes.Count != 9) return 74;
            if (regexes.Any(item => item?["scriptName"] is null || item?["find_regex"] is not null)) return 75;
            if (card["data"]?["character_book"]?["entries"] is not JsonArray embedded || embedded.Count != 2) return 76;

            var worldbook = JsonNode.Parse(await ReadTextAsync(zip, "阶段五验收卡.worldbook.json")) as JsonObject;
            if (worldbook?["entries"] is not JsonObject entries || entries.Count != 2) return 77;
            foreach (var entry in entries)
                if (entry.Value?["uid"]?.GetValue<int>().ToString() != entry.Key) return 78;
            var combined = string.Join('\n', entries.Select(item => item.Value?["content"]?.GetValue<string>()));
            if (!combined.Contains("世界蓝图验收正文", StringComparison.Ordinal) || !combined.Contains("输出格式验收正文", StringComparison.Ordinal)) return 79;
            if (combined.Contains("开场验收正文", StringComparison.Ordinal)) return 80;

            var pngEntry = zip.GetEntry("阶段五验收卡.png")!;
            await using var pngStream = pngEntry.Open();
            using var pngBuffer = new MemoryStream();
            await pngStream.CopyToAsync(pngBuffer);
            PngCharacterCard.Validate(pngBuffer.ToArray(), await ReadTextAsync(zip, "阶段五验收卡.character.json"));

            // 用可控模型回放合法 reorg_plan，并确认第二次发布直接复用缓存。
            await resources.ImportPresetAsync(new ImportFileRequest("stage5-preset.json", BuildPresetJson()));
            var connectionState = await connections.GetStateAsync();
            await connections.UpsertAsync(new UpsertConnectionRequest(
                connectionState.Revision,
                null,
                "阶段五可控模型",
                "openai",
                "http://stage5.test/v1",
                "stage5-model",
                "complete",
                new ModelParameters(100_000, 4_096, 0, 1, null, 0, 0),
                30,
                null));
            var handler = new ReorgPlanHandler(initial.Project.Name);
            using var aiHttp = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
            var aiPublication = new PublicationService(
                projects, artifacts, resources, connections, new ModelGateway(aiHttp), root,
                NullLogger<PublicationService>.Instance);
            var aiPackage = await aiPublication.BuildAsync(initial.Project.Id, new BuildPublicationRequest(
                publicationState.ArtifactRevision,
                publicationState.Choices.Select(item => item.VersionId).ToList(),
                publicationState.Settings with { CharacterName = "阶段五AI重组卡" }), CancellationToken.None);
            if (aiPackage.ReorgMode != "ai" || handler.RequestCount != 1) return 81;
            using (var aiZipStream = new MemoryStream(aiPackage.Content, writable: false))
            using (var aiZip = new ZipArchive(aiZipStream, ZipArchiveMode.Read))
            {
                var aiWorldbook = JsonNode.Parse(await ReadTextAsync(aiZip, "阶段五AI重组卡.worldbook.json"));
                var aiContent = string.Join('\n', (aiWorldbook?["entries"] as JsonObject ?? [])
                    .Select(item => item.Value?["content"]?.GetValue<string>()));
                if (!aiContent.Contains("<RENAMED_0>", StringComparison.Ordinal)
                    || !aiContent.Contains("<RENAMED_1>", StringComparison.Ordinal)
                    || aiContent.Contains("<WORLD_blueprint>", StringComparison.Ordinal)
                    || aiContent.Contains("<SYS_output_format>", StringComparison.Ordinal))
                {
                    Console.Error.WriteLine("Stage 5 rename-action regression check failed.");
                    return 82;
                }
            }
            var cachedPackage = await aiPublication.BuildAsync(initial.Project.Id, new BuildPublicationRequest(
                publicationState.ArtifactRevision,
                publicationState.Choices.Select(item => item.VersionId).ToList(),
                publicationState.Settings with { CharacterName = "阶段五缓存卡" }), CancellationToken.None);
            if (cachedPackage.ReorgMode != "cache" || handler.RequestCount != 1) return 83;

            Console.WriteLine("Stage 5 publication, package and PNG self-tests passed.");
            return 0;
        }
        finally
        {
            var fullRoot = Path.GetFullPath(root);
            var tempRoot = Path.GetFullPath(Path.GetTempPath());
            if (fullRoot.StartsWith(tempRoot, StringComparison.OrdinalIgnoreCase) && Directory.Exists(fullRoot)) Directory.Delete(fullRoot, true);
        }
    }

    private static async Task<string> ReadTextAsync(ZipArchive zip, string name)
    {
        var entry = zip.GetEntry(name) ?? throw new InvalidDataException($"ZIP 缺少 {name}");
        await using var stream = entry.Open();
        using var reader = new StreamReader(stream);
        return await reader.ReadToEndAsync();
    }

    private static string BuildPresetJson()
    {
        var ids = AutoWorkflow.StepPromptIds.Append(AutoWorkflow.ReorganizationPromptId).ToList();
        var prompts = new JsonArray(ids.Select((id, index) => (JsonNode)new JsonObject
        {
            ["identifier"] = id,
            ["name"] = id == AutoWorkflow.ReorganizationPromptId ? "世界书重组" : $"步骤 {index + 1}",
            ["role"] = "system",
            ["content"] = id == AutoWorkflow.ReorganizationPromptId ? "请输出 reorg_plan。" : "步骤提示词。",
        }).ToArray());
        var order = new JsonArray(ids.Select(id => (JsonNode)new JsonObject
        {
            ["identifier"] = id,
            ["enabled"] = true,
        }).ToArray());
        return new JsonObject
        {
            ["name"] = "阶段五验收预设",
            ["prompts"] = prompts,
            ["prompt_order"] = new JsonArray(new JsonObject { ["character_id"] = 100001, ["order"] = order }),
        }.ToJsonString();
    }

    private sealed class ReorgPlanHandler(string projectName) : HttpMessageHandler
    {
        public int RequestCount { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            RequestCount++;
            var plan = new JsonObject
            {
                ["sourceWorldbook"] = $"A.U.T.O 创作台·{projectName}",
                ["targetWorldbook"] = "阶段五 AI 重组世界书",
                ["mappings"] = new JsonArray(new JsonObject
                {
                    ["targetEntryName"] = "🧩AI 合并条目",
                    ["blockIds"] = new JsonArray("uid_0_block_0", "uid_1_block_0"),
                    ["attributes"] = new JsonObject
                    {
                        ["overrides"] = new JsonObject
                        {
                            ["enabled"] = true,
                            ["strategyType"] = "constant",
                            ["positionType"] = "before_character_definition",
                            ["order"] = 100,
                        },
                    },
                }),
                ["blockActions"] = new JsonArray(
                    new JsonObject
                    {
                        ["blockId"] = "uid_0_block_0",
                        ["action"] = "rename",
                        ["params"] = new JsonObject { ["newTagName"] = "RENAMED_0" },
                    },
                    new JsonObject
                    {
                        ["blockId"] = "uid_1_block_0",
                        ["action"] = "rename",
                        ["params"] = new JsonObject { ["newTagName"] = "RENAMED_1" },
                    }),
            };
            var content = $"```reorg_plan\n{plan.ToJsonString()}\n```";
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(JsonSerializer.Serialize(new
                {
                    choices = new[] { new { message = new { content }, finish_reason = "stop" } },
                }), Encoding.UTF8, "application/json"),
            };
            return Task.FromResult(response);
        }
    }
}
