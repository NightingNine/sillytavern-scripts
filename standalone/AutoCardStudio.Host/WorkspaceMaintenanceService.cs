using System.IO.Compression;
using System.Security.Cryptography;
using System.Text.Json;

namespace AutoCardStudio.Host;

/// <summary>集中处理独立版工作区的诊断、备份、恢复和清理，所有路径都限制在 data 目录内。</summary>
public sealed class WorkspaceMaintenanceService
{
    private const int BackupSchemaVersion = 1;
    private readonly string _dataRoot;
    private readonly string _backupRoot;
    private readonly WindowsCredentialVault _credentialVault;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    public WorkspaceMaintenanceService(string dataRoot, WindowsCredentialVault credentialVault)
    {
        _dataRoot = Path.GetFullPath(dataRoot);
        _backupRoot = Path.Combine(_dataRoot, "backups");
        _credentialVault = credentialVault;
    }

    public async Task InitializeAsync()
    {
        Directory.CreateDirectory(_dataRoot);
        Directory.CreateDirectory(_backupRoot);
        await _gate.WaitAsync();
        try
        {
            var dailyName = $"automatic-{DateTimeOffset.Now:yyyyMMdd}.zip";
            if (!File.Exists(Path.Combine(_backupRoot, dailyName)))
                await CreateBackupUnsafeAsync(dailyName, "automatic");
            PruneAutomaticBackupsUnsafe(7);
        }
        finally { _gate.Release(); }
    }

    public async Task<MaintenanceState> GetStateAsync()
    {
        await _gate.WaitAsync();
        try
        {
            var diagnosis = await DiagnoseUnsafeAsync();
            return new MaintenanceState(_dataRoot, diagnosis, await ListBackupsUnsafeAsync());
        }
        finally { _gate.Release(); }
    }

    public async Task<BackupInfo> CreateBackupAsync()
    {
        await _gate.WaitAsync();
        try
        {
            var name = $"manual-{DateTimeOffset.Now:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}.zip";
            return await CreateBackupUnsafeAsync(name, "manual");
        }
        finally { _gate.Release(); }
    }

    public async Task<BackupDownload> GetBackupAsync(string requestedName)
    {
        await _gate.WaitAsync();
        try
        {
            var path = RequireBackupPath(requestedName);
            var info = await InspectBackupUnsafeAsync(path, true);
            return new BackupDownload(info, await File.ReadAllBytesAsync(path));
        }
        finally { _gate.Release(); }
    }

    public async Task<RestoreResult> RestoreAsync(string requestedName)
    {
        await _gate.WaitAsync();
        var stagingRoot = Path.Combine(Path.GetTempPath(), $"acs-restore-{Guid.NewGuid():N}");
        var rollbackRoot = Path.Combine(Path.GetTempPath(), $"acs-rollback-{Guid.NewGuid():N}");
        try
        {
            var backupPath = RequireBackupPath(requestedName);
            var source = await InspectBackupUnsafeAsync(backupPath, true);
            await CreateBackupUnsafeAsync($"before-restore-{DateTimeOffset.Now:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}.zip", "recovery");

            Directory.CreateDirectory(stagingRoot);
            await ExtractVerifiedUnsafeAsync(backupPath, source.Manifest!, stagingRoot);
            Directory.CreateDirectory(rollbackRoot);

            var currentItems = Directory.EnumerateFileSystemEntries(_dataRoot)
                .Where(path => !PathsEqual(path, _backupRoot)).ToList();
            foreach (var path in currentItems) MoveEntry(path, Path.Combine(rollbackRoot, Path.GetFileName(path)));

            try
            {
                foreach (var path in Directory.EnumerateFileSystemEntries(stagingRoot))
                    MoveEntry(path, Path.Combine(_dataRoot, Path.GetFileName(path)));
            }
            catch
            {
                foreach (var path in Directory.EnumerateFileSystemEntries(_dataRoot).Where(path => !PathsEqual(path, _backupRoot)).ToList())
                    DeleteEntry(path);
                foreach (var path in Directory.EnumerateFileSystemEntries(rollbackRoot).ToList())
                    MoveEntry(path, Path.Combine(_dataRoot, Path.GetFileName(path)));
                throw;
            }

            return new RestoreResult(source, true, "备份已恢复。为避免旧页面继续使用恢复前的数据，创作台将自动关闭，请重新双击 A.U.T.O.exe。 ");
        }
        finally
        {
            TryDeleteDirectory(stagingRoot);
            TryDeleteDirectory(rollbackRoot);
            _gate.Release();
        }
    }

    public async Task<ClearResult> ClearAsync()
    {
        await _gate.WaitAsync();
        try
        {
            var recovery = await CreateBackupUnsafeAsync($"before-clear-{DateTimeOffset.Now:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}.zip", "recovery");
            foreach (var profileId in await ReadConnectionIdsUnsafeAsync()) _credentialVault.Delete(profileId);
            foreach (var path in Directory.EnumerateFileSystemEntries(_dataRoot).Where(path => !PathsEqual(path, _backupRoot)).ToList())
                DeleteEntry(path);
            return new ClearResult(recovery, true, "独立版资料已清空，恢复点保留在 data/backups。创作台将自动关闭，请重新启动。 ");
        }
        finally { _gate.Release(); }
    }

    private async Task<BackupInfo> CreateBackupUnsafeAsync(string fileName, string kind)
    {
        Directory.CreateDirectory(_backupRoot);
        var finalPath = Path.Combine(_backupRoot, fileName);
        var temporaryPath = finalPath + ".tmp";
        var entries = new List<BackupEntry>();
        try
        {
            await using (var output = new FileStream(temporaryPath, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.None))
            {
                using var archive = new ZipArchive(output, ZipArchiveMode.Create, true);
                foreach (var file in EnumerateBackupFiles())
                {
                    var relative = NormalizeRelative(Path.GetRelativePath(_dataRoot, file));
                    var bytes = await ReadSharedAsync(file);
                    var entry = archive.CreateEntry("data/" + relative, CompressionLevel.Optimal);
                    await using (var target = entry.Open()) await target.WriteAsync(bytes);
                    entries.Add(new BackupEntry(relative, bytes.LongLength, Sha256(bytes)));
                }

                var manifest = new BackupManifest(BackupSchemaVersion, DateTimeOffset.UtcNow, kind, entries);
                var manifestEntry = archive.CreateEntry("manifest.json", CompressionLevel.Optimal);
                await using var manifestStream = manifestEntry.Open();
                await JsonSerializer.SerializeAsync(manifestStream, manifest, _json);
            }
            File.Move(temporaryPath, finalPath);
            return await InspectBackupUnsafeAsync(finalPath, true);
        }
        finally { if (File.Exists(temporaryPath)) File.Delete(temporaryPath); }
    }

    private IEnumerable<string> EnumerateBackupFiles() => Directory.EnumerateFiles(_dataRoot, "*", SearchOption.AllDirectories)
        .Where(path => !IsWithin(path, _backupRoot) && !path.EndsWith(".tmp", StringComparison.OrdinalIgnoreCase))
        .OrderBy(path => path, StringComparer.OrdinalIgnoreCase);

    private async Task<IReadOnlyList<BackupInfo>> ListBackupsUnsafeAsync()
    {
        var result = new List<BackupInfo>();
        foreach (var path in Directory.EnumerateFiles(_backupRoot, "*.zip").OrderByDescending(File.GetLastWriteTimeUtc))
        {
            try { result.Add(await InspectBackupUnsafeAsync(path, false)); }
            catch { result.Add(new BackupInfo(Path.GetFileName(path), "invalid", File.GetLastWriteTimeUtc(path), new FileInfo(path).Length, 0, false, null)); }
        }
        return result;
    }

    private async Task<BackupInfo> InspectBackupUnsafeAsync(string path, bool verifyFiles)
    {
        using var archive = ZipFile.OpenRead(path);
        var manifestEntry = archive.GetEntry("manifest.json") ?? throw new InvalidDataException("备份缺少 manifest.json。");
        BackupManifest manifest;
        await using (var stream = manifestEntry.Open())
            manifest = await JsonSerializer.DeserializeAsync<BackupManifest>(stream, _json) ?? throw new InvalidDataException("备份清单不可读取。");
        if (manifest.SchemaVersion != BackupSchemaVersion) throw new InvalidDataException("备份版本不受支持。");
        if (verifyFiles)
        {
            foreach (var item in manifest.Files)
            {
                ValidateRelative(item.Path);
                var entry = archive.GetEntry("data/" + NormalizeRelative(item.Path)) ?? throw new InvalidDataException($"备份缺少文件：{item.Path}");
                await using var stream = entry.Open();
                using var memory = new MemoryStream();
                await stream.CopyToAsync(memory);
                var bytes = memory.ToArray();
                if (bytes.LongLength != item.Size || !string.Equals(Sha256(bytes), item.Sha256, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidDataException($"备份文件校验失败：{item.Path}");
            }
        }
        return new BackupInfo(Path.GetFileName(path), manifest.Kind, manifest.CreatedAt, new FileInfo(path).Length, manifest.Files.Count, true, verifyFiles ? manifest : null);
    }

    private async Task ExtractVerifiedUnsafeAsync(string backupPath, BackupManifest manifest, string stagingRoot)
    {
        using var archive = ZipFile.OpenRead(backupPath);
        foreach (var item in manifest.Files)
        {
            ValidateRelative(item.Path);
            var target = Path.GetFullPath(Path.Combine(stagingRoot, item.Path.Replace('/', Path.DirectorySeparatorChar)));
            if (!IsWithin(target, stagingRoot)) throw new InvalidDataException("备份包含越界路径。");
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            var entry = archive.GetEntry("data/" + NormalizeRelative(item.Path)) ?? throw new InvalidDataException($"备份缺少文件：{item.Path}");
            await using var source = entry.Open();
            await using var output = new FileStream(target, FileMode.CreateNew, FileAccess.Write, FileShare.None);
            await source.CopyToAsync(output);
        }
    }

    private async Task<WorkspaceDiagnosis> DiagnoseUnsafeAsync()
    {
        var files = EnumerateBackupFiles().ToList();
        var invalidJson = new List<string>();
        foreach (var file in files.Where(path => path.EndsWith(".json", StringComparison.OrdinalIgnoreCase)))
        {
            try
            {
                await using var stream = File.OpenRead(file);
                await JsonDocument.ParseAsync(stream);
            }
            catch (Exception error) when (error is JsonException or IOException)
            {
                invalidJson.Add(NormalizeRelative(Path.GetRelativePath(_dataRoot, file)));
            }
        }
        var projectCount = 0;
        try
        {
            var indexPath = Path.Combine(_dataRoot, "projects", "index.json");
            await using var stream = File.OpenRead(indexPath);
            using var document = await JsonDocument.ParseAsync(stream);
            projectCount = document.RootElement.GetProperty("projects").GetArrayLength();
        }
        catch { /* 具体文件会在 invalidJson 中报告，首次启动则保持 0。 */ }
        return new WorkspaceDiagnosis(
            invalidJson.Count == 0 ? "healthy" : "attention",
            projectCount,
            files.Count,
            files.Sum(path => new FileInfo(path).Length),
            invalidJson);
    }

    private async Task<IReadOnlyList<string>> ReadConnectionIdsUnsafeAsync()
    {
        try
        {
            var path = Path.Combine(_dataRoot, "settings", "connections.json");
            await using var stream = File.OpenRead(path);
            var document = await JsonSerializer.DeserializeAsync<ConnectionDocument>(stream, _json);
            return document?.Profiles.Select(item => item.Id).Where(id => Guid.TryParse(id, out _)).ToList() ?? [];
        }
        catch { return []; }
    }

    private string RequireBackupPath(string requestedName)
    {
        var name = Path.GetFileName(requestedName ?? string.Empty);
        if (!string.Equals(name, requestedName, StringComparison.Ordinal) || !name.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("备份名称无效。");
        var path = Path.GetFullPath(Path.Combine(_backupRoot, name));
        if (!IsWithin(path, _backupRoot) || !File.Exists(path)) throw new FileNotFoundException("备份不存在。");
        return path;
    }

    private void PruneAutomaticBackupsUnsafe(int keep)
    {
        foreach (var path in Directory.EnumerateFiles(_backupRoot, "automatic-*.zip").OrderByDescending(File.GetLastWriteTimeUtc).Skip(keep)) File.Delete(path);
    }

    private static async Task<byte[]> ReadSharedAsync(string path)
    {
        await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
        using var memory = new MemoryStream();
        await stream.CopyToAsync(memory);
        return memory.ToArray();
    }

    private static string Sha256(byte[] value) => Convert.ToHexString(SHA256.HashData(value)).ToLowerInvariant();
    private static string NormalizeRelative(string path) => path.Replace('\\', '/');
    private static void ValidateRelative(string path)
    {
        if (string.IsNullOrWhiteSpace(path) || Path.IsPathRooted(path) || path.Split('/', '\\').Any(part => part is "" or "." or ".."))
            throw new InvalidDataException("备份包含无效路径。");
    }
    private static bool IsWithin(string path, string root)
    {
        var fullPath = Path.GetFullPath(path).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        var fullRoot = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        return fullPath.StartsWith(fullRoot, StringComparison.OrdinalIgnoreCase);
    }
    private static bool PathsEqual(string left, string right) => string.Equals(Path.GetFullPath(left).TrimEnd('\\', '/'), Path.GetFullPath(right).TrimEnd('\\', '/'), StringComparison.OrdinalIgnoreCase);
    private static void MoveEntry(string source, string target) { if (Directory.Exists(source)) Directory.Move(source, target); else File.Move(source, target); }
    private static void DeleteEntry(string path) { if (Directory.Exists(path)) Directory.Delete(path, true); else if (File.Exists(path)) File.Delete(path); }
    private static void TryDeleteDirectory(string path) { try { if (Directory.Exists(path)) Directory.Delete(path, true); } catch { } }
}

public sealed record BackupEntry(string Path, long Size, string Sha256);
public sealed record BackupManifest(int SchemaVersion, DateTimeOffset CreatedAt, string Kind, IReadOnlyList<BackupEntry> Files);
public sealed record BackupInfo(string Name, string Kind, DateTimeOffset CreatedAt, long Size, int FileCount, bool Valid, BackupManifest? Manifest);
public sealed record BackupDownload(BackupInfo Info, byte[] Content);
public sealed record WorkspaceDiagnosis(string Status, int ProjectCount, int FileCount, long TotalBytes, IReadOnlyList<string> InvalidJsonFiles);
public sealed record MaintenanceState(string DataDirectory, WorkspaceDiagnosis Diagnosis, IReadOnlyList<BackupInfo> Backups);
public sealed record RestoreResult(BackupInfo Backup, bool RequiresRestart, string Message);
public sealed record ClearResult(BackupInfo RecoveryBackup, bool RequiresRestart, string Message);
