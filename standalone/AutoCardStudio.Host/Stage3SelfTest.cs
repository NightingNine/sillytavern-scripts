using System.Text.Json;

namespace AutoCardStudio.Host;

public static class Stage3SelfTest
{
    public static async Task<int> RunAsync()
    {
        var root = Path.Combine(Path.GetTempPath(), $"acs-stage3-test-{Guid.NewGuid():N}");
        try
        {
            var store = new ProjectStore(root);
            await store.InitializeAsync();
            var initial = await store.GetStateAsync();
            var legacyTurn = new StepTurn(Guid.NewGuid().ToString("D"), "user", "旧格式消息", DateTimeOffset.UtcNow);
            var stepPath = Path.Combine(root, "projects", initial.Project.Id, "steps", "01.json");
            var legacy = new
            {
                number = 1,
                revision = 7,
                status = "draft",
                turns = new[] { legacyTurn },
            };
            await File.WriteAllTextAsync(stepPath, JsonSerializer.Serialize(legacy, new JsonSerializerOptions(JsonSerializerDefaults.Web)));

            var migratedStore = new ProjectStore(root);
            await migratedStore.InitializeAsync();
            var migrated = await migratedStore.GetStateAsync();
            var defaultConversation = PromptAssembler.ActiveConversation(migrated.Step);
            if (migrated.Step.Revision != 7 || defaultConversation.Name != "默认对话" ||
                defaultConversation.Turns.Single().Content != "旧格式消息") return 40;

            var second = await migratedStore.CreateConversationAsync(
                migrated.Project.Id, 1, new ConversationMutationRequest(migrated.Step.Revision, "方案 B"));
            var secondConversation = PromptAssembler.ActiveConversation(second);
            if (second.Conversations.Count != 2 || secondConversation.Name != "方案 B") return 41;

            var retryUser = new StepTurn(Guid.NewGuid().ToString("D"), "user", "重试这条", DateTimeOffset.UtcNow);
            second = await migratedStore.AppendTurnAsync(migrated.Project.Id, 1, secondConversation.Id, second.Revision, retryUser);
            second = await migratedStore.AppendTurnAsync(
                migrated.Project.Id, 1, secondConversation.Id, second.Revision,
                new StepTurn(Guid.NewGuid().ToString("D"), "assistant", "旧回复", DateTimeOffset.UtcNow));
            second = await migratedStore.CompleteRetryAsync(
                migrated.Project.Id, 1, secondConversation.Id, retryUser.Id, second.Revision,
                new StepTurn(Guid.NewGuid().ToString("D"), "assistant", "新回复", DateTimeOffset.UtcNow));
            var retried = PromptAssembler.ActiveConversation(second).Turns;
            if (retried.Count != 2 || retried[1].Content != "新回复") return 42;

            second = await migratedStore.ActivateConversationAsync(migrated.Project.Id, 1, defaultConversation.Id, second.Revision);
            second = await migratedStore.RenameConversationAsync(
                migrated.Project.Id, 1, defaultConversation.Id, new ConversationMutationRequest(second.Revision, "初稿"));
            second = await migratedStore.EditTurnAsync(
                migrated.Project.Id, 1, defaultConversation.Id, legacyTurn.Id, new TurnEditRequest(second.Revision, "已编辑旧消息"));
            if (PromptAssembler.ActiveConversation(second).Turns.Single().Content != "已编辑旧消息") return 43;
            second = await migratedStore.DeleteTurnAsync(migrated.Project.Id, 1, defaultConversation.Id, legacyTurn.Id, second.Revision);
            second = await migratedStore.DeleteConversationAsync(migrated.Project.Id, 1, secondConversation.Id, second.Revision);
            try
            {
                await migratedStore.DeleteConversationAsync(migrated.Project.Id, 1, defaultConversation.Id, second.Revision);
                return 44;
            }
            catch (InvalidOperationException)
            {
                // 预期：最后一个对话只能清空。
            }

            second = await migratedStore.ClearConversationAsync(migrated.Project.Id, 1, defaultConversation.Id, second.Revision);
            var third = await migratedStore.CreateConversationAsync(
                migrated.Project.Id, 1, new ConversationMutationRequest(second.Revision, null));
            var thirdConversation = PromptAssembler.ActiveConversation(third);
            third = await migratedStore.AppendTurnAsync(
                migrated.Project.Id, 1, thirdConversation.Id, third.Revision,
                new StepTurn(Guid.NewGuid().ToString("D"), "user", "独立对话消息", DateTimeOffset.UtcNow));

            var reopened = new ProjectStore(root);
            await reopened.InitializeAsync();
            var restored = await reopened.GetStateAsync();
            if (restored.Step.Conversations.Count != 2 ||
                PromptAssembler.ActiveConversation(restored.Step).Turns.Single().Content != "独立对话消息" ||
                restored.Step.Conversations.Single(item => item.Id == defaultConversation.Id).Turns.Count != 0) return 45;
            try
            {
                await reopened.RenameConversationAsync(
                    restored.Project.Id, 1, restored.Step.ActiveConversationId,
                    new ConversationMutationRequest(1, "旧页面覆盖"));
                return 46;
            }
            catch (StepRevisionConflictException)
            {
                // 预期：旧 revision 不得覆盖多对话资料。
            }

            Console.WriteLine("Stage 3 migration and multi-conversation self-tests passed.");
            return 0;
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }
}
