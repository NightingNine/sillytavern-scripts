using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;

namespace AutoCardStudio.Host;

public sealed class ConnectionStore
{
    private readonly string _path;
    private readonly AtomicJsonFile _files = new();
    private readonly WindowsCredentialVault _vault;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public ConnectionStore(string dataRoot, WindowsCredentialVault vault)
    {
        _path = Path.Combine(Path.GetFullPath(dataRoot), "settings", "connections.json");
        _vault = vault;
    }

    public async Task InitializeAsync()
    {
        await _gate.WaitAsync();
        try
        {
            if (await _files.ReadRecoverableAsync<ConnectionDocument>(_path) is null)
            {
                await _files.WriteAtomicAsync(_path, new ConnectionDocument());
            }
        }
        finally { _gate.Release(); }
    }

    public async Task<ConnectionState> GetStateAsync()
    {
        await _gate.WaitAsync();
        try { return ToState(await RequireDocumentAsync()); }
        finally { _gate.Release(); }
    }

    public async Task<ConnectionState> UpsertAsync(UpsertConnectionRequest request)
    {
        await _gate.WaitAsync();
        try
        {
            var current = await RequireDocumentAsync();
            EnsureRevision(current, request.ExpectedRevision);
            var id = Guid.TryParse(request.Id, out var parsed) ? parsed.ToString("D") : Guid.NewGuid().ToString("D");
            var profile = NormalizeProfile(id, request);
            var profiles = current.Profiles.Where(item => item.Id != id).Append(profile).ToList();

            // 密钥写入失败时不提交连接文档，避免界面错误显示为已配置。
            if (request.ApiKey is not null)
            {
                if (string.IsNullOrWhiteSpace(request.ApiKey)) _vault.Delete(id);
                else _vault.Save(id, profile.Name, request.ApiKey.Trim());
            }

            var updated = current with
            {
                Revision = current.Revision + 1,
                ActiveProfileId = id,
                Profiles = profiles,
            };
            await _files.WriteAtomicAsync(_path, updated);
            return ToState(updated);
        }
        finally { _gate.Release(); }
    }

    public async Task<ConnectionState> ActivateAsync(string profileId, long expectedRevision)
    {
        await _gate.WaitAsync();
        try
        {
            var current = await RequireDocumentAsync();
            EnsureRevision(current, expectedRevision);
            if (!current.Profiles.Any(item => item.Id == profileId)) throw new KeyNotFoundException("连接不存在。");
            var updated = current with { Revision = current.Revision + 1, ActiveProfileId = profileId };
            await _files.WriteAtomicAsync(_path, updated);
            return ToState(updated);
        }
        finally { _gate.Release(); }
    }

    public async Task<ConnectionState> DeleteAsync(string profileId, long expectedRevision)
    {
        await _gate.WaitAsync();
        try
        {
            var current = await RequireDocumentAsync();
            EnsureRevision(current, expectedRevision);
            var profiles = current.Profiles.Where(item => item.Id != profileId).ToList();
            if (profiles.Count == current.Profiles.Count) throw new KeyNotFoundException("连接不存在。");
            _vault.Delete(profileId);
            var updated = current with
            {
                Revision = current.Revision + 1,
                ActiveProfileId = current.ActiveProfileId == profileId ? profiles.FirstOrDefault()?.Id ?? string.Empty : current.ActiveProfileId,
                Profiles = profiles,
            };
            await _files.WriteAtomicAsync(_path, updated);
            return ToState(updated);
        }
        finally { _gate.Release(); }
    }

    public async Task<ResolvedConnection> ResolveAsync(string? requestedProfileId = null)
    {
        await _gate.WaitAsync();
        try
        {
            var current = await RequireDocumentAsync();
            var id = string.IsNullOrWhiteSpace(requestedProfileId) ? current.ActiveProfileId : requestedProfileId;
            var profile = current.Profiles.FirstOrDefault(item => item.Id == id) ?? throw new InvalidOperationException("请先在设置中保存并启用一套模型连接。");
            return new ResolvedConnection(profile, _vault.Read(profile.Id));
        }
        finally { _gate.Release(); }
    }

    private async Task<ConnectionDocument> RequireDocumentAsync() =>
        await _files.ReadRecoverableAsync<ConnectionDocument>(_path) ?? throw new InvalidDataException("连接配置不可读取。");

    private ConnectionState ToState(ConnectionDocument document) => new(
        document.SchemaVersion,
        document.Revision,
        document.ActiveProfileId,
        document.Profiles.Select(profile => new ConnectionProfileView(profile, _vault.Exists(profile.Id))).ToList());

    private static ConnectionProfile NormalizeProfile(string id, UpsertConnectionRequest request)
    {
        var provider = request.Provider?.Trim().ToLowerInvariant() switch
        {
            "anthropic" => "anthropic",
            "gemini" => "gemini",
            _ => "openai",
        };
        var apiUrl = request.ApiUrl?.Trim() ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(apiUrl) && (!Uri.TryCreate(apiUrl, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https")))
            throw new InvalidDataException("接口地址必须是以 http:// 或 https:// 开头的完整地址。");
        var model = request.Model?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(model)) throw new InvalidDataException("模型名称不能为空。");
        var name = string.IsNullOrWhiteSpace(request.Name) ? model : request.Name.Trim();
        if (name.Length > 60) name = name[..60];
        return new ConnectionProfile(
            id,
            name,
            provider,
            apiUrl,
            model,
            request.OutputMode == "complete" ? "complete" : "stream",
            NormalizeParameters(request.Parameters),
            Math.Clamp(request.TimeoutSeconds ?? 180, 10, 1800));
    }

    private static ModelParameters NormalizeParameters(ModelParameters? parameters) => new(
        Math.Clamp(parameters?.MaxContextTokens ?? 2_000_000, 1_024, 10_000_000),
        ClampOptional(parameters?.MaxCompletionTokens, 1, 1_000_000),
        ClampOptional(parameters?.Temperature, 0, 2),
        ClampOptional(parameters?.TopP, 0, 1),
        ClampOptional(parameters?.TopK, 0, 10_000),
        ClampOptional(parameters?.FrequencyPenalty, -2, 2),
        ClampOptional(parameters?.PresencePenalty, -2, 2));

    private static double? ClampOptional(double? value, double minimum, double maximum) =>
        value is null || !double.IsFinite(value.Value) ? null : Math.Clamp(value.Value, minimum, maximum);

    private static void EnsureRevision(ConnectionDocument document, long expectedRevision)
    {
        if (document.Revision != expectedRevision) throw new ConnectionRevisionConflictException(document.Revision);
    }
}

public sealed class WindowsCredentialVault
{
    private const int CredTypeGeneric = 1;
    private const int CredPersistLocalMachine = 2;
    private const string TargetPrefix = "AutoCardStudio/Connection/";

    public void Save(string id, string displayName, string secret)
    {
        EnsureWindows();
        var bytes = Encoding.UTF8.GetBytes(secret);
        var blob = Marshal.AllocCoTaskMem(bytes.Length);
        try
        {
            Marshal.Copy(bytes, 0, blob, bytes.Length);
            var credential = new NativeCredential
            {
                Type = CredTypeGeneric,
                TargetName = TargetPrefix + id,
                CredentialBlobSize = bytes.Length,
                CredentialBlob = blob,
                Persist = CredPersistLocalMachine,
                UserName = string.IsNullOrWhiteSpace(displayName) ? "A.U.T.O" : displayName,
            };
            if (!CredWrite(ref credential, 0)) throw new Win32Exception(Marshal.GetLastWin32Error(), "Windows 凭据保存失败。");
        }
        finally
        {
            CryptographicOperations.ZeroMemory(bytes);
            Marshal.FreeCoTaskMem(blob);
        }
    }

    public string? Read(string id)
    {
        EnsureWindows();
        if (!CredRead(TargetPrefix + id, CredTypeGeneric, 0, out var pointer)) return null;
        try
        {
            var credential = Marshal.PtrToStructure<NativeCredential>(pointer);
            if (credential.CredentialBlob == IntPtr.Zero || credential.CredentialBlobSize <= 0) return string.Empty;
            var bytes = new byte[credential.CredentialBlobSize];
            Marshal.Copy(credential.CredentialBlob, bytes, 0, bytes.Length);
            try { return Encoding.UTF8.GetString(bytes); }
            finally { CryptographicOperations.ZeroMemory(bytes); }
        }
        finally { CredFree(pointer); }
    }

    public bool Exists(string id)
    {
        EnsureWindows();
        if (!CredRead(TargetPrefix + id, CredTypeGeneric, 0, out var pointer)) return false;
        CredFree(pointer);
        return true;
    }

    public void Delete(string id)
    {
        EnsureWindows();
        if (!CredDelete(TargetPrefix + id, CredTypeGeneric, 0))
        {
            var error = Marshal.GetLastWin32Error();
            if (error != 1168) throw new Win32Exception(error, "Windows 凭据删除失败。");
        }
    }

    private static void EnsureWindows()
    {
        if (!OperatingSystem.IsWindows()) throw new PlatformNotSupportedException("当前版本使用 Windows 凭据管理器保存 API 密钥。");
    }

    [DllImport("advapi32.dll", EntryPoint = "CredWriteW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CredWrite([In] ref NativeCredential credential, uint flags);

    [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CredRead(string target, int type, int flags, out IntPtr credentialPointer);

    [DllImport("advapi32.dll", EntryPoint = "CredDeleteW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CredDelete(string target, int type, int flags);

    [DllImport("advapi32.dll", SetLastError = true)]
    private static extern void CredFree(IntPtr credentialPointer);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct NativeCredential
    {
        public int Flags;
        public int Type;
        public string TargetName;
        public string? Comment;
        public long LastWritten;
        public int CredentialBlobSize;
        public IntPtr CredentialBlob;
        public int Persist;
        public int AttributeCount;
        public IntPtr Attributes;
        public string? TargetAlias;
        public string UserName;
    }
}

public sealed record ConnectionDocument
{
    public int SchemaVersion { get; init; } = 1;
    public long Revision { get; init; } = 1;
    public string ActiveProfileId { get; init; } = string.Empty;
    public IReadOnlyList<ConnectionProfile> Profiles { get; init; } = [];
}

public sealed record ConnectionProfile(string Id, string Name, string Provider, string ApiUrl, string Model, string OutputMode, ModelParameters Parameters, int TimeoutSeconds);
public sealed record ConnectionProfileView(ConnectionProfile Profile, bool HasSecret);
public sealed record ConnectionState(int SchemaVersion, long Revision, string ActiveProfileId, IReadOnlyList<ConnectionProfileView> Profiles);
public sealed record ResolvedConnection(ConnectionProfile Profile, string? ApiKey);
public sealed record UpsertConnectionRequest(long ExpectedRevision, string? Id, string? Name, string? Provider, string? ApiUrl, string? Model, string? OutputMode, ModelParameters? Parameters, int? TimeoutSeconds, string? ApiKey);

public sealed class ConnectionRevisionConflictException(long currentRevision) : Exception
{
    public long CurrentRevision { get; } = currentRevision;
}
