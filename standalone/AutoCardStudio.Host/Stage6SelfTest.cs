namespace AutoCardStudio.Host;

public static class Stage6SelfTest
{
    public static async Task<int> RunAsync()
    {
        var root = Path.Combine(Path.GetTempPath(), $"acs-stage6-test-{Guid.NewGuid():N}");
        var transferRoot = Path.Combine(Path.GetTempPath(), $"acs-stage6-transfer-{Guid.NewGuid():N}");
        try
        {
            Directory.CreateDirectory(Path.Combine(root, "projects"));
            var indexPath = Path.Combine(root, "projects", "index.json");
            await File.WriteAllTextAsync(indexPath, "{\"schemaVersion\":3,\"activeProjectId\":\"demo\",\"projects\":[]}");

            var service = new WorkspaceMaintenanceService(root, new WindowsCredentialVault());
            await service.InitializeAsync();
            var initial = await service.GetStateAsync();
            if (initial.Diagnosis.Status != "healthy" || initial.Backups.Count != 1) return 60;

            var manual = await service.CreateBackupAsync();
            await File.WriteAllTextAsync(indexPath, "{broken");
            var broken = await service.GetStateAsync();
            if (broken.Diagnosis.Status != "attention" || broken.Diagnosis.InvalidJsonFiles.Count != 1) return 61;

            var restored = await service.RestoreAsync(manual.Name);
            if (!restored.RequiresRestart || (await service.GetStateAsync()).Diagnosis.Status != "healthy") return 62;

            try
            {
                await service.GetBackupAsync("../outside.zip");
                return 63;
            }
            catch (InvalidDataException)
            {
                // 预期：备份下载和恢复都只能访问 data/backups 下的文件。
            }

            var cleared = await service.ClearAsync();
            if (!cleared.RequiresRestart || Directory.Exists(Path.Combine(root, "projects")) || !Directory.Exists(Path.Combine(root, "backups"))) return 64;

            var projects = new ProjectStore(transferRoot);
            await projects.InitializeAsync();
            var original = await projects.GetStateAsync();
            original = await projects.UpdateProjectAsync(original.Project.Id, new UpdateProjectRequest(original.Project.Revision, "往返项目", "迁移母题", 5));
            var conversation = original.Step.Conversations[0];
            await projects.AppendTurnAsync(original.Project.Id, 5, conversation.Id, original.Step.Revision,
                new StepTurn(Guid.NewGuid().ToString("D"), "user", "保留这条对话", DateTimeOffset.UtcNow));
            var artifacts = new ArtifactStore(transferRoot);
            await artifacts.CreateManualAsync(original.Project.Id, new CreateManualArtifactRequest(1, 5, "迁移产物", "保留这项产物"));

            var files = new AtomicJsonFile();
            var bookId = Guid.NewGuid().ToString("D");
            var entryId = Guid.NewGuid().ToString("D");
            var book = new ReferenceWorldbook(bookId, "迁移资料", "reference.json", "stage6-hash", DateTimeOffset.UtcNow,
                [new ReferenceWorldbookEntry(entryId, "1", "常驻条目", "保留这项资料", true, new ReferenceActivation("constant", [], [], "and", false, false))]);
            await files.WriteAtomicAsync(Path.Combine(transferRoot, "resources", "reference-worldbooks", "library.json"),
                new ReferenceWorldbookLibrary(1, [book], DateTimeOffset.UtcNow));
            await files.WriteAtomicAsync(Path.Combine(transferRoot, "projects", original.Project.Id, "reference-worldbooks.json"),
                new ReferenceProjectSelection(1, new Dictionary<string, ReferenceBookSelection> { [bookId] = new(true, new Dictionary<string, bool> { [entryId] = true }) }, DateTimeOffset.UtcNow));

            var bundle = await projects.ExportProjectAsync(original.Project.Id);
            var imported = await projects.ImportProjectAsync(bundle);
            if (imported.Project.Id == original.Project.Id || imported.Project.Name != "往返项目（导入）" || imported.Project.CurrentStep != 5) return 65;
            if (imported.Step.Conversations[0].Turns.Single().Content != "保留这条对话") return 66;
            var importedArtifact = (await artifacts.GetStateAsync(imported.Project.Id)).Groups.Single();
            if (importedArtifact.Versions.Single(version => version.Id == importedArtifact.SelectedVersionId).Content != "保留这项产物") return 67;
            var references = await new ReferenceWorldbookStore(transferRoot).GetStateAsync(imported.Project.Id);
            if (!references.ProjectBooks.TryGetValue(bookId, out var importedBook) || !importedBook.Enabled || !importedBook.Entries.GetValueOrDefault(entryId)) return 68;

            Console.WriteLine("Stage 6 self-test passed.");
            return 0;
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
            if (Directory.Exists(transferRoot)) Directory.Delete(transferRoot, true);
        }
    }
}
