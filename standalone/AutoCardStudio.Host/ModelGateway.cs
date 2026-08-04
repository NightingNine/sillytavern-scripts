using System.Net;
using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace AutoCardStudio.Host;

public sealed class ModelGateway(HttpClient httpClient)
{
    private readonly HttpClient _http = httpClient;
    private readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    public async Task<ModelCompletion> GenerateAsync(
        ResolvedConnection connection,
        IReadOnlyList<PromptMessage> messages,
        Func<string, Task> onDelta,
        CancellationToken cancellationToken)
    {
        using var request = BuildRequest(connection, messages);
        using var response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        if (!response.IsSuccessStatusCode) throw await CreateHttpErrorAsync(response, cancellationToken);

        var completion = connection.Profile.OutputMode == "stream"
            ? await ReadStreamAsync(connection.Profile.Provider, response, onDelta, cancellationToken)
            : await ReadCompleteAsync(connection.Profile.Provider, response, cancellationToken);
        if (string.IsNullOrWhiteSpace(completion.Text)) throw new ModelGatewayException("empty_response", "模型没有返回可用正文。", false);
        if (IsTruncated(completion.FinishReason)) throw new ModelGatewayException("response_truncated", "模型回复达到输出上限，未将不完整内容写入正式对话。", true);
        return completion;
    }

    public async Task<IReadOnlyList<string>> GetModelsAsync(ResolvedConnection connection, CancellationToken cancellationToken)
    {
        if (connection.Profile.Provider == "anthropic") return [];
        var uri = connection.Profile.Provider == "gemini"
            ? Combine(connection.Profile.ApiUrl, "https://generativelanguage.googleapis.com/v1beta", "models")
            : Combine(connection.Profile.ApiUrl, "https://api.openai.com/v1", "models");
        using var request = new HttpRequestMessage(HttpMethod.Get, uri);
        ApplyAuthentication(request, connection);
        using var response = await _http.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode) throw await CreateHttpErrorAsync(response, cancellationToken);
        var root = JsonNode.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        var source = root?["data"] as JsonArray ?? root?["models"] as JsonArray ?? [];
        return source.OfType<JsonObject>()
            .Select(item => item["id"]?.GetValue<string>() ?? item["name"]?.GetValue<string>() ?? string.Empty)
            .Select(name => name.StartsWith("models/", StringComparison.Ordinal) ? name[7..] : name)
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Order(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private HttpRequestMessage BuildRequest(ResolvedConnection connection, IReadOnlyList<PromptMessage> messages)
    {
        var profile = connection.Profile;
        var request = profile.Provider switch
        {
            "anthropic" => BuildAnthropicRequest(connection, messages),
            "gemini" => BuildGeminiRequest(connection, messages),
            _ => BuildOpenAiRequest(connection, messages),
        };
        ApplyAuthentication(request, connection);
        return request;
    }

    private HttpRequestMessage BuildOpenAiRequest(ResolvedConnection connection, IReadOnlyList<PromptMessage> messages)
    {
        var profile = connection.Profile;
        var uri = Combine(profile.ApiUrl, "https://api.openai.com/v1", "chat/completions");
        var body = new JsonObject
        {
            ["model"] = profile.Model,
            ["stream"] = profile.OutputMode == "stream",
            ["messages"] = new JsonArray(messages.Select(message => (JsonNode)new JsonObject
            {
                ["role"] = message.Role,
                ["content"] = message.Content,
            }).ToArray()),
        };
        AddParameters(body, profile.Parameters, "max_tokens");
        return JsonRequest(HttpMethod.Post, uri, body);
    }

    private HttpRequestMessage BuildAnthropicRequest(ResolvedConnection connection, IReadOnlyList<PromptMessage> messages)
    {
        var profile = connection.Profile;
        var uri = Combine(profile.ApiUrl, "https://api.anthropic.com/v1", "messages");
        var system = string.Join("\n\n", messages.Where(message => message.Role == "system").Select(message => message.Content));
        var chat = messages.Where(message => message.Role != "system").Select(message => (JsonNode)new JsonObject
        {
            ["role"] = message.Role == "assistant" ? "assistant" : "user",
            ["content"] = message.Content,
        }).ToArray();
        var body = new JsonObject
        {
            ["model"] = profile.Model,
            ["max_tokens"] = (int)(profile.Parameters.MaxCompletionTokens ?? 4096),
            ["stream"] = profile.OutputMode == "stream",
            ["messages"] = new JsonArray(chat),
        };
        if (!string.IsNullOrWhiteSpace(system)) body["system"] = system;
        AddSampling(body, profile.Parameters);
        return JsonRequest(HttpMethod.Post, uri, body);
    }

    private HttpRequestMessage BuildGeminiRequest(ResolvedConnection connection, IReadOnlyList<PromptMessage> messages)
    {
        var profile = connection.Profile;
        var action = profile.OutputMode == "stream" ? "streamGenerateContent?alt=sse" : "generateContent";
        var uri = Combine(profile.ApiUrl, "https://generativelanguage.googleapis.com/v1beta", $"models/{Uri.EscapeDataString(profile.Model)}:{action}");
        var system = string.Join("\n\n", messages.Where(message => message.Role == "system").Select(message => message.Content));
        var contents = messages.Where(message => message.Role != "system").Select(message => (JsonNode)new JsonObject
        {
            ["role"] = message.Role == "assistant" ? "model" : "user",
            ["parts"] = new JsonArray(new JsonObject { ["text"] = message.Content }),
        }).ToArray();
        var generation = new JsonObject();
        AddGeminiParameters(generation, profile.Parameters);
        var body = new JsonObject
        {
            ["contents"] = new JsonArray(contents),
            ["generationConfig"] = generation,
        };
        if (!string.IsNullOrWhiteSpace(system))
        {
            body["systemInstruction"] = new JsonObject { ["parts"] = new JsonArray(new JsonObject { ["text"] = system }) };
        }
        return JsonRequest(HttpMethod.Post, uri, body);
    }

    private void ApplyAuthentication(HttpRequestMessage request, ResolvedConnection connection)
    {
        if (string.IsNullOrWhiteSpace(connection.ApiKey)) return;
        switch (connection.Profile.Provider)
        {
            case "anthropic":
                request.Headers.TryAddWithoutValidation("x-api-key", connection.ApiKey);
                request.Headers.TryAddWithoutValidation("anthropic-version", "2023-06-01");
                break;
            case "gemini":
                request.Headers.TryAddWithoutValidation("x-goog-api-key", connection.ApiKey);
                break;
            default:
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", connection.ApiKey);
                break;
        }
    }

    private async Task<ModelCompletion> ReadCompleteAsync(string provider, HttpResponseMessage response, CancellationToken cancellationToken)
    {
        var root = JsonNode.Parse(await response.Content.ReadAsStringAsync(cancellationToken));
        return provider switch
        {
            "anthropic" => new ModelCompletion(
                string.Concat((root?["content"] as JsonArray ?? []).OfType<JsonObject>().Select(item => item["text"]?.GetValue<string>() ?? string.Empty)),
                root?["stop_reason"]?.GetValue<string>()),
            "gemini" => ExtractGemini(root),
            _ => new ModelCompletion(
                root?["choices"]?[0]?["message"]?["content"]?.GetValue<string>() ?? string.Empty,
                root?["choices"]?[0]?["finish_reason"]?.GetValue<string>()),
        };
    }

    private async Task<ModelCompletion> ReadStreamAsync(string provider, HttpResponseMessage response, Func<string, Task> onDelta, CancellationToken cancellationToken)
    {
        var result = new StringBuilder();
        string? finishReason = null;
        await foreach (var data in ReadSseDataAsync(response, cancellationToken))
        {
            if (data == "[DONE]") break;
            var root = JsonNode.Parse(data);
            string delta;
            switch (provider)
            {
                case "anthropic":
                    delta = root?["type"]?.GetValue<string>() == "content_block_delta"
                        ? root?["delta"]?["text"]?.GetValue<string>() ?? string.Empty
                        : string.Empty;
                    finishReason ??= root?["delta"]?["stop_reason"]?.GetValue<string>() ?? root?["stop_reason"]?.GetValue<string>();
                    break;
                case "gemini":
                    var gemini = ExtractGemini(root);
                    delta = gemini.Text;
                    finishReason ??= gemini.FinishReason;
                    break;
                default:
                    delta = root?["choices"]?[0]?["delta"]?["content"]?.GetValue<string>() ?? string.Empty;
                    finishReason ??= root?["choices"]?[0]?["finish_reason"]?.GetValue<string>();
                    break;
            }
            if (string.IsNullOrEmpty(delta)) continue;
            result.Append(delta);
            await onDelta(delta);
        }
        return new ModelCompletion(result.ToString(), finishReason);
    }

    private static async IAsyncEnumerable<string> ReadSseDataAsync(HttpResponseMessage response, [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);
        var data = new StringBuilder();
        while (await reader.ReadLineAsync(cancellationToken) is { } line)
        {
            if (line.Length == 0)
            {
                if (data.Length > 0)
                {
                    yield return data.ToString();
                    data.Clear();
                }
                continue;
            }
            if (!line.StartsWith("data:", StringComparison.Ordinal)) continue;
            if (data.Length > 0) data.Append('\n');
            data.Append(line[5..].TrimStart());
        }
        if (data.Length > 0) yield return data.ToString();
    }

    private static ModelCompletion ExtractGemini(JsonNode? root)
    {
        var parts = root?["candidates"]?[0]?["content"]?["parts"] as JsonArray ?? [];
        return new ModelCompletion(
            string.Concat(parts.OfType<JsonObject>().Select(item => item["text"]?.GetValue<string>() ?? string.Empty)),
            root?["candidates"]?[0]?["finishReason"]?.GetValue<string>());
    }

    private static HttpRequestMessage JsonRequest(HttpMethod method, string uri, JsonObject body) => new(method, uri)
    {
        Content = new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json"),
    };

    private static string Combine(string configuredBase, string defaultBase, string suffix)
    {
        var baseUrl = string.IsNullOrWhiteSpace(configuredBase) ? defaultBase : configuredBase.Trim();
        baseUrl = baseUrl.TrimEnd('/');
        if (baseUrl.EndsWith('/' + suffix, StringComparison.OrdinalIgnoreCase)) return baseUrl;
        if (suffix == "models" && baseUrl.EndsWith("/chat/completions", StringComparison.OrdinalIgnoreCase)) baseUrl = baseUrl[..^17];
        return $"{baseUrl}/{suffix}";
    }

    private static void AddParameters(JsonObject body, ModelParameters parameters, string maxTokenName)
    {
        if (parameters.MaxCompletionTokens is not null) body[maxTokenName] = (int)parameters.MaxCompletionTokens.Value;
        AddSampling(body, parameters);
        if (parameters.FrequencyPenalty is not null) body["frequency_penalty"] = parameters.FrequencyPenalty;
        if (parameters.PresencePenalty is not null) body["presence_penalty"] = parameters.PresencePenalty;
        if (parameters.TopK is not null) body["top_k"] = parameters.TopK;
    }

    private static void AddSampling(JsonObject body, ModelParameters parameters)
    {
        if (parameters.Temperature is not null) body["temperature"] = parameters.Temperature;
        if (parameters.TopP is not null) body["top_p"] = parameters.TopP;
        if (parameters.TopK is not null) body["top_k"] = parameters.TopK;
    }

    private static void AddGeminiParameters(JsonObject body, ModelParameters parameters)
    {
        if (parameters.MaxCompletionTokens is not null) body["maxOutputTokens"] = (int)parameters.MaxCompletionTokens.Value;
        if (parameters.Temperature is not null) body["temperature"] = parameters.Temperature;
        if (parameters.TopP is not null) body["topP"] = parameters.TopP;
        if (parameters.TopK is not null) body["topK"] = parameters.TopK;
    }

    private static bool IsTruncated(string? finishReason) => finishReason is not null && (
        finishReason.Equals("length", StringComparison.OrdinalIgnoreCase) ||
        finishReason.Equals("max_tokens", StringComparison.OrdinalIgnoreCase) ||
        finishReason.Equals("MAX_TOKENS", StringComparison.OrdinalIgnoreCase));

    private static async Task<ModelGatewayException> CreateHttpErrorAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var detail = ExtractErrorMessage(body);
        var (code, retryable, message) = response.StatusCode switch
        {
            HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden => ("authentication", false, "模型服务拒绝了身份验证，请检查 API 密钥和权限。"),
            HttpStatusCode.TooManyRequests => ("rate_limited", true, "模型服务当前请求过多，请稍后重试。"),
            HttpStatusCode.RequestTimeout or HttpStatusCode.GatewayTimeout => ("upstream_timeout", true, "模型服务响应超时。"),
            HttpStatusCode.BadRequest when detail.Contains("context", StringComparison.OrdinalIgnoreCase) => ("context_limit", false, "发送内容超过模型上下文限制。"),
            >= HttpStatusCode.InternalServerError => ("upstream_service", true, "模型服务暂时不可用。"),
            _ => ("upstream_error", false, $"模型服务返回 HTTP {(int)response.StatusCode}。"),
        };
        return new ModelGatewayException(code, string.IsNullOrWhiteSpace(detail) ? message : $"{message} {detail}", retryable, (int)response.StatusCode);
    }

    private static string ExtractErrorMessage(string body)
    {
        try
        {
            var root = JsonNode.Parse(body);
            var message = root?["error"]?["message"]?.GetValue<string>() ?? root?["message"]?.GetValue<string>() ?? string.Empty;
            return message.Length > 500 ? message[..500] + "…" : message;
        }
        catch { return string.Empty; }
    }
}

public sealed record PromptMessage(string Role, string Content, string? Name = null);
public sealed record ModelCompletion(string Text, string? FinishReason);

public sealed class ModelGatewayException(string code, string message, bool retryable, int? httpStatus = null) : Exception(message)
{
    public string Code { get; } = code;
    public bool Retryable { get; } = retryable;
    public int? HttpStatus { get; } = httpStatus;
}
