namespace AutoCardStudio.Host;

public static class Stage4SelfTest
{
    public static async Task<int> RunAsync()
    {
        var root = Path.Combine(Path.GetTempPath(), $"acs-stage4-test-{Guid.NewGuid():N}");
        try
        {
            var projects = new ProjectStore(root);
            var artifacts = new ArtifactStore(root);
            var references = new ReferenceWorldbookStore(root);
            await projects.InitializeAsync();
            await references.InitializeAsync();
            var initial = await projects.GetStateAsync();

            const string firstResponse = """
                <WORLD_main_characters_精灵王女_原点>原点一</WORLD_main_characters_精灵王女_原点>
                <WORLD_main_characters_精灵王女_画像>画像一</WORLD_main_characters_精灵王女_画像>
                <WORLD_main_characters_精灵王女_状态>状态一</WORLD_main_characters_精灵王女_状态>
                """;
            var captured = await artifacts.CaptureAsync(initial.Project.Id, 5, firstResponse, "generated");
            if (captured.Added != 3 || captured.State.Groups.Count != 3) return 50;

            const string secondPortrait = "<WORLD_main_characters_精灵王女_画像>画像二</WORLD_main_characters_精灵王女_画像>";
            captured = await artifacts.CaptureAsync(initial.Project.Id, 5, secondPortrait, "generated");
            var portrait = captured.State.Groups.Single(group => group.Identity.EndsWith("_画像", StringComparison.Ordinal));
            if (portrait.Versions.Count != 2 || portrait.SelectedVersionId != portrait.Versions[1].Id) return 51;
            var duplicate = await artifacts.CaptureAsync(initial.Project.Id, 5, secondPortrait, "manual-conversation", captured.State.Revision);
            if (duplicate.Added != 0 || duplicate.Reused != 1 || duplicate.State.Groups.Single(group => group.Key == portrait.Key).Versions.Count != 2) return 52;

            var manual = await artifacts.CreateManualAsync(initial.Project.Id,
                new CreateManualArtifactRequest(duplicate.State.Revision, 8, "自建参考设施", "设施正文"));
            if (manual.Groups.Count != 4 || manual.Groups.Single(group => group.Source == "manual").DisplayName != "自建参考设施") return 53;

            // 当前会话已经包含的产物在自动模式下不重复发送；明确开启后才再次发送。
            var currentProject = initial.Project with { CurrentStep = 5 };
            var conversation = new[] { new StepTurn("turn", "assistant", secondPortrait, DateTimeOffset.UtcNow) };
            var context = await artifacts.GetContextAsync(currentProject, 5, conversation);
            if (context.Any(item => item.Identity.EndsWith("_画像", StringComparison.Ordinal)) || context.Any(item => item.Step == 8)) return 54;
            var forced = await artifacts.SetContextModeAsync(initial.Project.Id, portrait.Key, new ArtifactContextRequest(manual.Revision, "on"));
            context = await artifacts.GetContextAsync(currentProject, 5, conversation);
            if (!context.Any(item => item.Identity.EndsWith("_画像", StringComparison.Ordinal))) return 55;
            context = await artifacts.GetContextAsync(currentProject with { IncludeFutureArtifacts = true }, 5, conversation);
            if (!context.Any(item => item.Step == 8 && item.IsFuture)) return 56;

            const string worldbookJson = """
                {
                  "name": "验收资料",
                  "entries": {
                    "0": { "uid": 0, "comment": "常驻规则", "content": "常驻正文", "constant": true },
                    "1": { "uid": 1, "comment": "天使资料", "content": "关键词正文", "key": ["天使"], "keysecondary": ["圣堂"], "selectiveLogic": 3 },
                    "2": { "uid": 2, "comment": "关闭条目", "content": "不应发送", "constant": true, "disable": true }
                  }
                }
                """;
            var referenceState = await references.ImportAsync(initial.Project.Id, new ImportFileRequest("验收资料.json", worldbookJson));
            if (referenceState.Books.Count != 1 || !referenceState.ProjectBooks.Single().Value.Enabled) return 57;
            var active = await references.GetActiveEntriesAsync(initial.Project.Id, "没有关键词");
            if (active.Count != 1 || active[0].EntryName != "常驻规则") return 58;
            active = await references.GetActiveEntriesAsync(initial.Project.Id, "天使出现了");
            if (active.Any(item => item.EntryName == "天使资料")) return 59;
            active = await references.GetActiveEntriesAsync(initial.Project.Id, "天使走进圣堂");
            if (!active.Any(item => item.EntryName == "天使资料") || active.Any(item => item.EntryName == "关闭条目")) return 60;

            const string updatedWorldbookJson = """
                {
                  "name": "验收资料",
                  "entries": {
                    "0": { "uid": 0, "comment": "常驻规则", "content": "常驻正文已同步", "constant": true },
                    "1": { "uid": 1, "comment": "天使资料", "content": "关键词正文", "key": ["天使"], "keysecondary": ["圣堂"], "selectiveLogic": 3 }
                  }
                }
                """;
            var originalBookId = referenceState.Books[0].Id;
            referenceState = await references.ImportAsync(initial.Project.Id, new ImportFileRequest("验收资料.json", updatedWorldbookJson));
            if (referenceState.Books.Count != 1 || referenceState.Books[0].Id != originalBookId ||
                !(await references.GetActiveEntriesAsync(initial.Project.Id, "无关键词")).Any(item => item.Content == "常驻正文已同步")) return 61;

            var book = referenceState.Books[0];
            referenceState = await references.SetBookEnabledAsync(initial.Project.Id, book.Id,
                new ReferenceToggleRequest(referenceState.ProjectRevision, false));
            if ((await references.GetActiveEntriesAsync(initial.Project.Id, "天使走进圣堂")).Count != 0) return 62;

            // 产物内容与附属资料使用两个明确区块，避免参考资料伪装成正式产物。
            var preset = new ImportedPreset("test", DateTimeOffset.UtcNow, 2, "test.json", "hash",
                [new PresetPrompt(AutoWorkflow.StepPromptIds[4], "Step 5", "system", "执行步骤", true, 0)],
                new ModelParameters(100_000, 1_000, null, null, null, null, null));
            var prompt = PromptAssembler.Build(preset, currentProject, [], 5, "天使走进圣堂", [], context,
                [new ActiveReferenceEntry(book.Id, book.Name, "entry", "天使资料", "关键词正文", "keyword")]);
            if (!prompt.Any(item => item.Name == "项目上下文与正式产物" && item.Content.Contains("画像二")) ||
                !prompt.Any(item => item.Name == "附属世界书（本轮激活）" && item.Content.Contains("只供设计参考"))) return 63;

            // 删除或编辑对话不参与产物存储；重新打开后版本仍完整存在。
            var reopened = new ArtifactStore(root);
            var restored = await reopened.GetStateAsync(initial.Project.Id);
            if (restored.Groups.Single(group => group.Key == portrait.Key).Versions.Count != 2 || restored.Revision != forced.Revision) return 64;

            Console.WriteLine("Stage 4 artifact, context and reference-worldbook self-tests passed.");
            return 0;
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }
}
