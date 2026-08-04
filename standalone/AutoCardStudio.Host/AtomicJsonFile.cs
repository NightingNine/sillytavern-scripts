using System.Text.Json;
using System.Text.Json.Serialization;

namespace AutoCardStudio.Host;

/// <summary>统一负责 JSON 的安全读取和原子替换，避免不同资料库各自实现一套写入逻辑。</summary>
public sealed class AtomicJsonFile
{
    public JsonSerializerOptions Options { get; } = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public async Task<T?> ReadRecoverableAsync<T>(string path)
    {
        var current = await TryReadAsync<T>(path);
        if (current is not null) return current;

        var previousPath = $"{path}.previous";
        var previous = await TryReadAsync<T>(previousPath);
        if (previous is null) return default;

        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.Copy(previousPath, path, true);
        return previous;
    }

    public async Task<T?> TryReadAsync<T>(string path)
    {
        try
        {
            if (!File.Exists(path)) return default;
            await using var stream = File.OpenRead(path);
            return await JsonSerializer.DeserializeAsync<T>(stream, Options);
        }
        catch (JsonException)
        {
            return default;
        }
        catch (IOException)
        {
            return default;
        }
    }

    public async Task WriteAtomicAsync<T>(string path, T value)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var tempPath = $"{path}.{Guid.NewGuid():N}.tmp";
        var previousPath = $"{path}.previous";

        try
        {
            await using (var stream = new FileStream(tempPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 32 * 1024, FileOptions.WriteThrough))
            {
                await JsonSerializer.SerializeAsync(stream, value, Options);
                await stream.FlushAsync();
                stream.Flush(true);
            }

            if (await TryReadAsync<T>(tempPath) is null) throw new InvalidDataException("写入后的资料校验失败。");
            if (File.Exists(path)) File.Replace(tempPath, path, previousPath, true);
            else File.Move(tempPath, path);
        }
        finally
        {
            if (File.Exists(tempPath)) File.Delete(tempPath);
        }
    }

    public static async Task WriteOriginalAsync(string path, string content)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        if (File.Exists(path)) return;
        await File.WriteAllTextAsync(path, content);
    }
}
