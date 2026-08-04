using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace AutoCardStudio.Host;

public sealed class ReferenceWorldbookStore
{
    private const int MaxImportCharacters = 10 * 1024 * 1024;
    private readonly string _libraryPath;
    private readonly string _projectsRoot;
    private readonly string _importRoot;
    private readonly AtomicJsonFile _files = new();
    private readonly SemaphoreSlim _gate = new(1, 1);

    public ReferenceWorldbookStore(string dataRoot)
    {
        var root = Path.GetFullPath(dataRoot);
        _libraryPath = Path.Combine(root, "resources", "reference-worldbooks", "library.json");
        _projectsRoot = Path.Combine(root, "projects");
        _importRoot = Path.Combine(root, "imports", "reference-worldbooks");
    }

    public Task InitializeAsync()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_libraryPath)!);
        Directory.CreateDirectory(_importRoot);
        return Task.CompletedTask;
    }

    public async Task<ReferenceWorldbookState> GetStateAsync(string projectId)
    {
        await _gate.WaitAsync();
        try
        {
            var library = await ReadLibraryUnsafeAsync();
            var selection = await ReadSelectionUnsafeAsync(projectId, library);
            return new ReferenceWorldbookState(library.Revision, selection.Revision, library.Books, selection.Books);
        }
        finally { _gate.Release(); }
    }

    public async Task<ReferenceWorldbookState> ImportAsync(string projectId, ImportFileRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Content)) throw new InvalidDataException("世界书文件为空。");
        if (request.Content.Length > MaxImportCharacters) throw new InvalidDataException("世界书文件超过 10 MB。");
        var root = JsonNode.Parse(request.Content) ?? throw new InvalidDataException("世界书 JSON 无法解析。");
        var hash = Sha256(request.Content);
        var normalized = NormalizeBook(root, request.FileName, hash);
        await _gate.WaitAsync();
        try
        {
            var library = await ReadLibraryUnsafeAsync();
            var identical = library.Books.FirstOrDefault(item => item.SourceSha256 == hash);
            var sameSource = identical ?? library.Books.FirstOrDefault(item =>
                string.Equals(item.SourceFileName, normalized.SourceFileName, StringComparison.OrdinalIgnoreCase));
            var book = identical ?? (sameSource is null ? normalized : normalized with { Id = sameSource.Id });
            if (identical is null)
            {
                // 同一文件名重新导入视为同步快照，保留书本 ID，避免各项目失去选择关系。
                var syncedBooks = sameSource is null
                    ? library.Books.Append(book).ToList()
                    : library.Books.Select(item => item.Id == sameSource.Id ? book : item).ToList();
                library = library with { Revision = library.Revision + 1, Books = syncedBooks, UpdatedAt = DateTimeOffset.UtcNow };
                await _files.WriteAtomicAsync(_libraryPath, library);
                await ArchiveOriginalUnsafeAsync(request.FileName, hash, request.Content);
            }

            var selection = await ReadSelectionUnsafeAsync(projectId, library);
            var books = selection.Books.ToDictionary(item => item.Key, item => item.Value, StringComparer.Ordinal);
            var previous = books.GetValueOrDefault(book.Id);
            books[book.Id] = new ReferenceBookSelection(
                true,
                book.Entries.ToDictionary(
                    item => item.Id,
                    item => previous?.Entries.GetValueOrDefault(item.Id, item.SourceEnabled) ?? item.SourceEnabled,
                    StringComparer.Ordinal));
            selection = selection with { Revision = selection.Revision + 1, Books = books, UpdatedAt = DateTimeOffset.UtcNow };
            await WriteSelectionUnsafeAsync(projectId, selection);
            return new ReferenceWorldbookState(library.Revision, selection.Revision, library.Books, selection.Books);
        }
        finally { _gate.Release(); }
    }

    public async Task<ReferenceWorldbookState> SetBookEnabledAsync(string projectId, string bookId, ReferenceToggleRequest request)
    {
        await _gate.WaitAsync();
        try
        {
            var library = await ReadLibraryUnsafeAsync();
            var book = library.Books.FirstOrDefault(item => item.Id == bookId) ?? throw new KeyNotFoundException("附属世界书不存在。");
            var selection = await ReadSelectionUnsafeAsync(projectId, library);
            EnsureRevision(selection, request.ExpectedRevision);
            var books = selection.Books.ToDictionary(item => item.Key, item => item.Value, StringComparer.Ordinal);
            var current = books.GetValueOrDefault(bookId) ?? new ReferenceBookSelection(false, book.Entries.ToDictionary(item => item.Id, item => item.SourceEnabled));
            books[bookId] = current with { Enabled = request.Enabled };
            var updated = selection with { Revision = selection.Revision + 1, Books = books, UpdatedAt = DateTimeOffset.UtcNow };
            await WriteSelectionUnsafeAsync(projectId, updated);
            return new ReferenceWorldbookState(library.Revision, updated.Revision, library.Books, updated.Books);
        }
        finally { _gate.Release(); }
    }

    public async Task<ReferenceWorldbookState> SetEntryEnabledAsync(string projectId, string bookId, string entryId, ReferenceToggleRequest request)
    {
        await _gate.WaitAsync();
        try
        {
            var library = await ReadLibraryUnsafeAsync();
            var book = library.Books.FirstOrDefault(item => item.Id == bookId) ?? throw new KeyNotFoundException("附属世界书不存在。");
            if (!book.Entries.Any(item => item.Id == entryId)) throw new KeyNotFoundException("世界书条目不存在。");
            var selection = await ReadSelectionUnsafeAsync(projectId, library);
            EnsureRevision(selection, request.ExpectedRevision);
            var books = selection.Books.ToDictionary(item => item.Key, item => item.Value, StringComparer.Ordinal);
            var current = books.GetValueOrDefault(bookId) ?? new ReferenceBookSelection(false, book.Entries.ToDictionary(item => item.Id, item => item.SourceEnabled));
            var entries = current.Entries.ToDictionary(item => item.Key, item => item.Value, StringComparer.Ordinal);
            entries[entryId] = request.Enabled;
            books[bookId] = current with { Entries = entries };
            var updated = selection with { Revision = selection.Revision + 1, Books = books, UpdatedAt = DateTimeOffset.UtcNow };
            await WriteSelectionUnsafeAsync(projectId, updated);
            return new ReferenceWorldbookState(library.Revision, updated.Revision, library.Books, updated.Books);
        }
        finally { _gate.Release(); }
    }

    public async Task<ReferenceWorldbookState> DeleteAsync(string projectId, string bookId, long expectedLibraryRevision)
    {
        await _gate.WaitAsync();
        try
        {
            var library = await ReadLibraryUnsafeAsync();
            if (library.Revision != expectedLibraryRevision) throw new ReferenceLibraryConflictException(library.Revision);
            var books = library.Books.Where(item => item.Id != bookId).ToList();
            if (books.Count == library.Books.Count) throw new KeyNotFoundException("附属世界书不存在。");
            library = library with { Revision = library.Revision + 1, Books = books, UpdatedAt = DateTimeOffset.UtcNow };
            await _files.WriteAtomicAsync(_libraryPath, library);
            var selection = await ReadSelectionUnsafeAsync(projectId, library);
            return new ReferenceWorldbookState(library.Revision, selection.Revision, library.Books, selection.Books);
        }
        finally { _gate.Release(); }
    }

    public async Task<IReadOnlyList<ActiveReferenceEntry>> GetActiveEntriesAsync(string projectId, string userInput)
    {
        await _gate.WaitAsync();
        try
        {
            var library = await ReadLibraryUnsafeAsync();
            var selection = await ReadSelectionUnsafeAsync(projectId, library);
            var active = new List<ActiveReferenceEntry>();
            foreach (var book in library.Books)
            {
                if (!selection.Books.TryGetValue(book.Id, out var bookState) || !bookState.Enabled) continue;
                foreach (var entry in book.Entries)
                {
                    if (!bookState.Entries.GetValueOrDefault(entry.Id, entry.SourceEnabled)) continue;
                    if (Matches(entry.Activation, userInput)) active.Add(new ActiveReferenceEntry(book.Id, book.Name, entry.Id, entry.Name, entry.Content, entry.Activation.Type));
                }
            }
            return active;
        }
        finally { _gate.Release(); }
    }

    private async Task<ReferenceWorldbookLibrary> ReadLibraryUnsafeAsync() =>
        await _files.ReadRecoverableAsync<ReferenceWorldbookLibrary>(_libraryPath)
        ?? new ReferenceWorldbookLibrary(1, [], DateTimeOffset.UtcNow);

    private async Task<ReferenceProjectSelection> ReadSelectionUnsafeAsync(string projectId, ReferenceWorldbookLibrary library)
    {
        var stored = await _files.ReadRecoverableAsync<ReferenceProjectSelection>(SelectionPath(projectId));
        if (stored is null) return new ReferenceProjectSelection(1, new Dictionary<string, ReferenceBookSelection>(), DateTimeOffset.UtcNow);
        var knownBooks = library.Books.Select(item => item.Id).ToHashSet(StringComparer.Ordinal);
        var books = stored.Books.Where(item => knownBooks.Contains(item.Key)).ToDictionary(item => item.Key, item => item.Value, StringComparer.Ordinal);
        return stored with { Revision = Math.Max(1, stored.Revision), Books = books };
    }

    private Task WriteSelectionUnsafeAsync(string projectId, ReferenceProjectSelection selection)
    {
        Directory.CreateDirectory(Path.Combine(_projectsRoot, projectId));
        return _files.WriteAtomicAsync(SelectionPath(projectId), selection);
    }

    private string SelectionPath(string projectId) => Path.Combine(_projectsRoot, projectId, "reference-worldbooks.json");

    private async Task ArchiveOriginalUnsafeAsync(string fileName, string hash, string content)
    {
        var safe = string.Concat(Path.GetFileNameWithoutExtension(fileName).Select(character => Path.GetInvalidFileNameChars().Contains(character) ? '_' : character));
        if (string.IsNullOrWhiteSpace(safe)) safe = "worldbook";
        await AtomicJsonFile.WriteOriginalAsync(Path.Combine(_importRoot, $"{safe}-{hash[..12]}.json"), content);
    }

    private static ReferenceWorldbook NormalizeBook(JsonNode root, string fileName, string hash)
    {
        var objectRoot = root as JsonObject;
        var source = objectRoot?["entries"] ?? objectRoot?["data"]?["entries"] ?? root;
        IEnumerable<JsonNode?> entries = source switch
        {
            JsonArray array => array,
            JsonObject obj => obj.Select(item => item.Value),
            _ => [],
        };
        var normalized = entries.OfType<JsonObject>().Select((entry, index) => NormalizeEntry(entry, index)).Where(item => item is not null).Cast<ReferenceWorldbookEntry>().ToList();
        if (normalized.Count == 0) throw new InvalidDataException("世界书中没有可用的正文条目。");
        var name = objectRoot?["name"]?.GetValue<string>()?.Trim();
        if (string.IsNullOrWhiteSpace(name)) name = Path.GetFileNameWithoutExtension(fileName);
        if (string.IsNullOrWhiteSpace(name)) name = "未命名附属世界书";
        return new ReferenceWorldbook(Guid.NewGuid().ToString("D"), name, Path.GetFileName(fileName), hash, DateTimeOffset.UtcNow, normalized);
    }

    private static ReferenceWorldbookEntry? NormalizeEntry(JsonObject entry, int index)
    {
        var content = entry["content"]?.GetValue<string>()?.Trim() ?? string.Empty;
        if (content.Length == 0) return null;
        var uid = NodeText(entry["uid"] ?? entry["id"]);
        var keys = StringList(entry["strategy"]?["keys"] ?? entry["activation"]?["keys"] ?? entry["key"] ?? entry["keys"]);
        var secondary = StringList(entry["strategy"]?["keys_secondary"]?["keys"] ?? entry["activation"]?["secondaryKeys"] ?? entry["keysecondary"] ?? entry["secondary_keys"]);
        var explicitType = NodeText(entry["strategy"]?["type"] ?? entry["activation"]?["type"]).ToLowerInvariant();
        var constant = explicitType == "constant" || ReadBool(entry["constant"]) || ReadBool(entry["alwaysActive"]);
        var activation = new ReferenceActivation(
            constant ? "constant" : "keyword", keys, secondary,
            NormalizeSecondaryLogic(entry["strategy"]?["keys_secondary"]?["logic"] ?? entry["activation"]?["secondaryLogic"] ?? entry["selectiveLogic"] ?? entry["extensions"]?["selectiveLogic"]),
            ReadBool(entry["caseSensitive"] ?? entry["activation"]?["caseSensitive"] ?? entry["extensions"]?["case_sensitive"]),
            ReadBool(entry["matchWholeWords"] ?? entry["activation"]?["matchWholeWords"] ?? entry["extensions"]?["match_whole_words"]));
        var name = entry["name"]?.GetValue<string>()?.Trim() ?? entry["comment"]?.GetValue<string>()?.Trim();
        if (string.IsNullOrWhiteSpace(name)) name = keys.Count > 0 ? string.Join("、", keys) : $"条目 {index + 1}";
        var stable = Sha256($"{uid}|{name}|{index}|{content}")[..20];
        return new ReferenceWorldbookEntry(stable, uid, name, content, !(ReadBool(entry["disable"]) || entry["enabled"]?.GetValue<bool?>() == false), activation);
    }

    private static bool Matches(ReferenceActivation activation, string userInput)
    {
        if (activation.Type == "constant") return true;
        if (activation.Keys.Count == 0 || string.IsNullOrWhiteSpace(userInput)) return false;
        if (!activation.Keys.Any(key => KeywordMatches(userInput, key, activation))) return false;
        if (activation.SecondaryKeys.Count == 0) return true;
        var matches = activation.SecondaryKeys.Select(key => KeywordMatches(userInput, key, activation)).ToList();
        return activation.SecondaryLogic switch
        {
            "and_all" => matches.All(value => value),
            "not_all" => !matches.All(value => value),
            "not_any" => !matches.Any(value => value),
            _ => matches.Any(value => value),
        };
    }

    private static bool KeywordMatches(string input, string keyword, ReferenceActivation activation)
    {
        keyword = keyword.Trim();
        if (keyword.Length == 0) return false;
        var regexLiteral = Regex.Match(keyword, @"^/([\s\S]*)/([ims]*)$");
        if (regexLiteral.Success)
        {
            var options = RegexOptions.None;
            if (regexLiteral.Groups[2].Value.Contains('i')) options |= RegexOptions.IgnoreCase;
            if (regexLiteral.Groups[2].Value.Contains('m')) options |= RegexOptions.Multiline;
            if (regexLiteral.Groups[2].Value.Contains('s')) options |= RegexOptions.Singleline;
            try { return Regex.IsMatch(input, regexLiteral.Groups[1].Value, options, TimeSpan.FromMilliseconds(200)); }
            catch (Exception error) when (error is ArgumentException or RegexMatchTimeoutException) { return false; }
        }
        var comparison = activation.CaseSensitive ? StringComparison.Ordinal : StringComparison.OrdinalIgnoreCase;
        if (!activation.MatchWholeWords || keyword.Any(char.IsWhiteSpace)) return input.Contains(keyword, comparison);
        var optionsForWord = activation.CaseSensitive ? RegexOptions.None : RegexOptions.IgnoreCase;
        return Regex.IsMatch(input, $@"(?:^|\W){Regex.Escape(keyword)}(?:$|\W)", optionsForWord, TimeSpan.FromMilliseconds(200));
    }

    private static IReadOnlyList<string> StringList(JsonNode? node) => node switch
    {
        JsonArray array => array.Select(NodeText).Select(item => item.Trim()).Where(item => item.Length > 0).ToList(),
        JsonValue value => NodeText(value).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
        _ => [],
    };
    private static string NormalizeSecondaryLogic(JsonNode? node)
    {
        var raw = NodeText(node).ToLowerInvariant();
        if (int.TryParse(raw, out var number)) return number switch { 1 => "not_all", 2 => "not_any", 3 => "and_all", _ => "and_any" };
        return raw is "and_all" or "not_all" or "not_any" ? raw : "and_any";
    }
    private static string NodeText(JsonNode? node)
    {
        if (node is null) return string.Empty;
        if (node is JsonValue value)
        {
            if (value.TryGetValue<string>(out var text)) return text ?? string.Empty;
            if (value.TryGetValue<int>(out var number)) return number.ToString();
            if (value.TryGetValue<long>(out var longNumber)) return longNumber.ToString();
        }
        return node.ToJsonString();
    }
    private static bool ReadBool(JsonNode? node) => node is JsonValue value && value.TryGetValue<bool>(out var result) && result;
    private static void EnsureRevision(ReferenceProjectSelection selection, long expected)
    {
        if (selection.Revision != expected) throw new ReferenceSelectionConflictException(selection.Revision);
    }
    private static string Sha256(string content) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(content))).ToLowerInvariant();
}

public sealed record ReferenceWorldbookLibrary(long Revision, IReadOnlyList<ReferenceWorldbook> Books, DateTimeOffset UpdatedAt);
public sealed record ReferenceWorldbook(string Id, string Name, string SourceFileName, string SourceSha256, DateTimeOffset ImportedAt, IReadOnlyList<ReferenceWorldbookEntry> Entries);
public sealed record ReferenceWorldbookEntry(string Id, string Uid, string Name, string Content, bool SourceEnabled, ReferenceActivation Activation);
public sealed record ReferenceActivation(string Type, IReadOnlyList<string> Keys, IReadOnlyList<string> SecondaryKeys, string SecondaryLogic, bool CaseSensitive, bool MatchWholeWords);
public sealed record ReferenceProjectSelection(long Revision, IReadOnlyDictionary<string, ReferenceBookSelection> Books, DateTimeOffset UpdatedAt);
public sealed record ReferenceBookSelection(bool Enabled, IReadOnlyDictionary<string, bool> Entries);
public sealed record ReferenceWorldbookState(long LibraryRevision, long ProjectRevision, IReadOnlyList<ReferenceWorldbook> Books, IReadOnlyDictionary<string, ReferenceBookSelection> ProjectBooks);
public sealed record ActiveReferenceEntry(string BookId, string BookName, string EntryId, string EntryName, string Content, string ActivationType);
public sealed record ReferenceToggleRequest(long ExpectedRevision, bool Enabled);
public sealed class ReferenceSelectionConflictException(long currentRevision) : Exception { public long CurrentRevision { get; } = currentRevision; }
public sealed class ReferenceLibraryConflictException(long currentRevision) : Exception { public long CurrentRevision { get; } = currentRevision; }
