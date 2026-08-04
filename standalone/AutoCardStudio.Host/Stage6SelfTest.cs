namespace AutoCardStudio.Host;

public static class Stage6SelfTest
{
    public static async Task<int> RunAsync()
    {
        var root = Path.Combine(Path.GetTempPath(), $"acs-stage6-test-{Guid.NewGuid():N}");
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

            Console.WriteLine("Stage 6 self-test passed.");
            return 0;
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }
}
