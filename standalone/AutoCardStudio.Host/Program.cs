using System.Diagnostics;
using System.ComponentModel;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;

namespace AutoCardStudio.Host;

public static class Program
{
    private const string MutexName = @"Local\AutoCardStudio.Standalone.v1";
    private const string SessionCookie = "acs_session";

    public static async Task<int> Main(string[] args)
    {
        if (args.Contains("--self-test", StringComparer.OrdinalIgnoreCase))
        {
            var projectResult = await ProjectStoreSelfTest.RunAsync();
            if (projectResult != 0) return projectResult;
            var stage2Result = await Stage2SelfTest.RunAsync();
            return stage2Result == 0 ? await Stage3SelfTest.RunAsync() : stage2Result;
        }

        using var singleInstance = new Mutex(true, MutexName, out var ownsInstance);
        var runtimeDirectory = Path.Combine(Path.GetTempPath(), "AutoCardStudio");
        var instanceFile = Path.Combine(runtimeDirectory, "instance.json");

        if (!ownsInstance)
        {
            var suppressBrowser = args.Contains("--no-browser", StringComparer.OrdinalIgnoreCase);
            return TryOpenExistingInstance(instanceFile, suppressBrowser) ? 0 : 2;
        }

        Directory.CreateDirectory(runtimeDirectory);

        var executableDirectory = Path.GetDirectoryName(Environment.ProcessPath) ?? AppContext.BaseDirectory;
        var configuredDataDirectory = Environment.GetEnvironmentVariable("ACS_DATA_DIR");
        var dataDirectory = string.IsNullOrWhiteSpace(configuredDataDirectory)
            ? Path.Combine(executableDirectory, "data")
            : Path.GetFullPath(configuredDataDirectory);

        var sessionSecret = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            Args = args,
            ContentRootPath = AppContext.BaseDirectory,
            WebRootPath = Path.Combine(AppContext.BaseDirectory, "wwwroot"),
        });

        builder.Logging.ClearProviders();
        builder.Logging.AddSimpleConsole(options =>
        {
            options.SingleLine = true;
            options.TimestampFormat = "HH:mm:ss ";
        });
        builder.WebHost.ConfigureKestrel(options => options.Listen(IPAddress.Loopback, 0));

        var store = new ProjectStore(dataDirectory);
        var credentialVault = new WindowsCredentialVault();
        var resourceStore = new ResourceStore(dataDirectory);
        var connectionStore = new ConnectionStore(dataDirectory, credentialVault);
        builder.Services.AddSingleton(store);
        builder.Services.AddSingleton(resourceStore);
        builder.Services.AddSingleton(connectionStore);
        builder.Services.AddSingleton(credentialVault);
        builder.Services.AddHttpClient<ModelGateway>(client => client.Timeout = Timeout.InfiniteTimeSpan);
        builder.Services.AddSingleton<GenerationCoordinator>();

        var app = builder.Build();
        await store.InitializeAsync();
        await resourceStore.InitializeAsync();
        await connectionStore.InitializeAsync();
        var indexHtml = ReadEmbeddedWebAsset("index.html");
        var stylesCss = ReadEmbeddedWebAsset("styles.css");
        var appJavaScript = ReadEmbeddedWebAsset("app.js");

        // 本地接口仍需要会话校验，避免其他网页借浏览器访问本机服务。
        app.Use(async (context, next) =>
        {
            if (context.Request.Path == "/" &&
                CryptographicOperations.FixedTimeEquals(
                    System.Text.Encoding.UTF8.GetBytes(context.Request.Query["token"].ToString()),
                    System.Text.Encoding.UTF8.GetBytes(sessionSecret)))
            {
                context.Response.Cookies.Append(SessionCookie, sessionSecret, new CookieOptions
                {
                    HttpOnly = true,
                    SameSite = SameSiteMode.Strict,
                    Secure = false,
                    IsEssential = true,
                });
                context.Response.Redirect("/");
                return;
            }

            if (context.Request.Path.StartsWithSegments("/api"))
            {
                var cookie = context.Request.Cookies[SessionCookie] ?? string.Empty;
                var valid = cookie.Length == sessionSecret.Length &&
                    CryptographicOperations.FixedTimeEquals(
                        System.Text.Encoding.UTF8.GetBytes(cookie),
                        System.Text.Encoding.UTF8.GetBytes(sessionSecret));
                if (!valid)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsJsonAsync(new { code = "session_required", message = "本地会话已失效，请重新双击启动程序。" });
                    return;
                }
            }

            await next();
        });

        app.MapGet("/", () => Results.File(indexHtml, "text/html; charset=utf-8"));
        app.MapGet("/index.html", () => Results.File(indexHtml, "text/html; charset=utf-8"));
        app.MapGet("/styles.css", () => Results.File(stylesCss, "text/css; charset=utf-8"));
        app.MapGet("/app.js", () => Results.File(appJavaScript, "text/javascript; charset=utf-8"));

        // 只在自动验收显式开启；正式运行不会暴露或使用这个可控模型端点。
        if (Environment.GetEnvironmentVariable("ACS_ENABLE_MODEL_MOCK") == "1")
        {
            app.MapGet("/test-model/v1/models", () => Results.Ok(new { data = new[] { new { id = "auto-mock-model" } } }));
            app.MapPost("/test-model/v1/chat/completions", async (HttpContext context) =>
            {
                var body = await JsonNode.ParseAsync(context.Request.Body, cancellationToken: context.RequestAborted) as JsonObject;
                if (body?["stream"]?.GetValue<bool?>() == true)
                {
                    context.Response.ContentType = "text/event-stream";
                    foreach (var delta in new[] { "独立版", "流式生成", "验收成功。" })
                    {
                        var chunk = JsonSerializer.Serialize(new { choices = new[] { new { delta = new { content = delta }, finish_reason = (string?)null } } });
                        await context.Response.WriteAsync($"data: {chunk}\n\n", context.RequestAborted);
                        await context.Response.Body.FlushAsync(context.RequestAborted);
                        await Task.Delay(80, context.RequestAborted);
                    }
                    await context.Response.WriteAsync("data: {\"choices\":[{\"delta\":{},\"finish_reason\":\"stop\"}]}\n\ndata: [DONE]\n\n", context.RequestAborted);
                    return;
                }
                await context.Response.WriteAsJsonAsync(new { choices = new[] { new { message = new { content = "独立版非流式生成验收成功。" }, finish_reason = "stop" } } }, context.RequestAborted);
            });
        }

        app.MapGet("/api/health", () => Results.Ok(new
        {
            status = "ready",
            version = "0.3.0-stage3",
            dataDirectory,
        }));

        app.MapGet("/api/state", async (string? projectId, ProjectStore projectStore) =>
            Results.Ok(await projectStore.GetStateAsync(projectId)));

        app.MapGet("/api/resources", async (ResourceStore resources) => Results.Ok(await resources.GetStateAsync()));

        app.MapPost("/api/resources/preset", async (ImportFileRequest request, ResourceStore resources) =>
        {
            try { return Results.Ok(await resources.ImportPresetAsync(request)); }
            catch (Exception error) when (error is JsonException or InvalidDataException)
            {
                return Results.BadRequest(new { code = "invalid_preset", message = error.Message });
            }
        });

        app.MapPost("/api/resources/regexes", async (ImportFileRequest request, ResourceStore resources) =>
        {
            try { return Results.Ok(await resources.ImportRegexesAsync(request)); }
            catch (Exception error) when (error is JsonException or InvalidDataException)
            {
                return Results.BadRequest(new { code = "invalid_regex", message = error.Message });
            }
        });

        app.MapGet("/api/connections", async (ConnectionStore connections) => Results.Ok(await connections.GetStateAsync()));

        app.MapPost("/api/connections", async (UpsertConnectionRequest request, ConnectionStore connections) =>
        {
            try { return Results.Ok(await connections.UpsertAsync(request)); }
            catch (ConnectionRevisionConflictException conflict)
            {
                return Results.Conflict(new { code = "connection_revision_conflict", message = "连接设置已在其他页面变化，请重新载入。", currentRevision = conflict.CurrentRevision });
            }
            catch (Exception error) when (error is InvalidDataException or Win32Exception or PlatformNotSupportedException)
            {
                return Results.BadRequest(new { code = "connection_invalid", message = error.Message });
            }
        });

        app.MapPost("/api/connections/{profileId}/activate", async (string profileId, RevisionRequest request, ConnectionStore connections) =>
        {
            try { return Results.Ok(await connections.ActivateAsync(profileId, request.ExpectedRevision)); }
            catch (ConnectionRevisionConflictException conflict)
            {
                return Results.Conflict(new { code = "connection_revision_conflict", message = "连接设置已变化，请重新载入。", currentRevision = conflict.CurrentRevision });
            }
        });

        app.MapDelete("/api/connections/{profileId}", async (string profileId, long expectedRevision, ConnectionStore connections) =>
        {
            try { return Results.Ok(await connections.DeleteAsync(profileId, expectedRevision)); }
            catch (ConnectionRevisionConflictException conflict)
            {
                return Results.Conflict(new { code = "connection_revision_conflict", message = "连接设置已变化，请重新载入。", currentRevision = conflict.CurrentRevision });
            }
        });

        app.MapPost("/api/connections/{profileId}/models", async (string profileId, ConnectionStore connections, ModelGateway gateway, CancellationToken cancellationToken) =>
        {
            try { return Results.Ok(new { models = await gateway.GetModelsAsync(await connections.ResolveAsync(profileId), cancellationToken) }); }
            catch (ModelGatewayException error)
            {
                return Results.Json(new { code = error.Code, message = error.Message, retryable = error.Retryable }, statusCode: error.HttpStatus ?? 502);
            }
        });

        app.MapPost("/api/projects", async (CreateProjectRequest request, ProjectStore projectStore) =>
            Results.Ok(await projectStore.CreateProjectAsync(request.Name)));

        app.MapPatch("/api/projects/{projectId}", async (string projectId, UpdateProjectRequest request, ProjectStore projectStore) =>
        {
            try
            {
                return Results.Ok(await projectStore.UpdateProjectAsync(projectId, request));
            }
            catch (RevisionConflictException conflict)
            {
                return Results.Conflict(new
                {
                    code = "revision_conflict",
                    message = "项目已在其他页面发生变化，请重新载入后继续。",
                    currentRevision = conflict.CurrentRevision,
                });
            }
        });

        app.MapPost("/api/projects/{projectId}/activate", async (string projectId, ProjectStore projectStore) =>
            Results.Ok(await projectStore.ActivateProjectAsync(projectId)));

        app.MapDelete("/api/projects/{projectId}", async (string projectId, long expectedRevision, ProjectStore projectStore) =>
        {
            try
            {
                return Results.Ok(await projectStore.DeleteProjectAsync(projectId, expectedRevision));
            }
            catch (RevisionConflictException conflict)
            {
                return Results.Conflict(new
                {
                    code = "revision_conflict",
                    message = "删除前项目已经发生变化，请重新载入后确认。",
                    currentRevision = conflict.CurrentRevision,
                });
            }
        });

        app.MapPost("/api/projects/{projectId}/steps/{stepNumber:int}/conversations", async (
            string projectId, int stepNumber, ConversationMutationRequest request, ProjectStore projectStore) =>
        {
            try { return Results.Ok(await projectStore.CreateConversationAsync(projectId, stepNumber, request)); }
            catch (Exception error) when (IsStepMutationError(error)) { return StepMutationError(error); }
        });

        app.MapPost("/api/projects/{projectId}/steps/{stepNumber:int}/conversations/{conversationId}/activate", async (
            string projectId, int stepNumber, string conversationId, RevisionRequest request, ProjectStore projectStore) =>
        {
            try { return Results.Ok(await projectStore.ActivateConversationAsync(projectId, stepNumber, conversationId, request.ExpectedRevision)); }
            catch (Exception error) when (IsStepMutationError(error)) { return StepMutationError(error); }
        });

        app.MapPatch("/api/projects/{projectId}/steps/{stepNumber:int}/conversations/{conversationId}", async (
            string projectId, int stepNumber, string conversationId, ConversationMutationRequest request, ProjectStore projectStore) =>
        {
            try { return Results.Ok(await projectStore.RenameConversationAsync(projectId, stepNumber, conversationId, request)); }
            catch (Exception error) when (IsStepMutationError(error)) { return StepMutationError(error); }
        });

        app.MapDelete("/api/projects/{projectId}/steps/{stepNumber:int}/conversations/{conversationId}", async (
            string projectId, int stepNumber, string conversationId, long expectedRevision, ProjectStore projectStore) =>
        {
            try { return Results.Ok(await projectStore.DeleteConversationAsync(projectId, stepNumber, conversationId, expectedRevision)); }
            catch (Exception error) when (IsStepMutationError(error)) { return StepMutationError(error); }
        });

        app.MapPost("/api/projects/{projectId}/steps/{stepNumber:int}/conversations/{conversationId}/clear", async (
            string projectId, int stepNumber, string conversationId, RevisionRequest request, ProjectStore projectStore) =>
        {
            try { return Results.Ok(await projectStore.ClearConversationAsync(projectId, stepNumber, conversationId, request.ExpectedRevision)); }
            catch (Exception error) when (IsStepMutationError(error)) { return StepMutationError(error); }
        });

        app.MapPatch("/api/projects/{projectId}/steps/{stepNumber:int}/conversations/{conversationId}/turns/{turnId}", async (
            string projectId, int stepNumber, string conversationId, string turnId, TurnEditRequest request, ProjectStore projectStore) =>
        {
            try { return Results.Ok(await projectStore.EditTurnAsync(projectId, stepNumber, conversationId, turnId, request)); }
            catch (Exception error) when (IsStepMutationError(error)) { return StepMutationError(error); }
        });

        app.MapDelete("/api/projects/{projectId}/steps/{stepNumber:int}/conversations/{conversationId}/turns/{turnId}", async (
            string projectId, int stepNumber, string conversationId, string turnId, long expectedRevision, ProjectStore projectStore) =>
        {
            try { return Results.Ok(await projectStore.DeleteTurnAsync(projectId, stepNumber, conversationId, turnId, expectedRevision)); }
            catch (Exception error) when (IsStepMutationError(error)) { return StepMutationError(error); }
        });

        app.MapPost("/api/generations", async (GenerateStepRequest request, HttpContext context, GenerationCoordinator coordinator) =>
        {
            context.Response.StatusCode = StatusCodes.Status200OK;
            context.Response.ContentType = "text/event-stream; charset=utf-8";
            context.Response.Headers.CacheControl = "no-cache";
            context.Response.Headers.Append("X-Accel-Buffering", "no");
            var json = new JsonSerializerOptions(JsonSerializerDefaults.Web);
            await coordinator.RunAsync(request, async generationEvent =>
            {
                if (context.RequestAborted.IsCancellationRequested) return;
                try
                {
                    var payload = JsonSerializer.Serialize(generationEvent, json);
                    await context.Response.WriteAsync($"event: {generationEvent.Type}\ndata: {payload}\n\n", Encoding.UTF8, context.RequestAborted);
                    await context.Response.Body.FlushAsync(context.RequestAborted);
                }
                catch (Exception error) when (context.RequestAborted.IsCancellationRequested && error is IOException or OperationCanceledException)
                {
                    // 页面离开时不再写回 SSE；RequestAborted 仍会取消上游模型请求。
                }
            }, context.RequestAborted);
        });

        app.MapPost("/api/prompt-preview", async (PromptPreviewRequest request, GenerationCoordinator coordinator) =>
        {
            try { return Results.Ok(await coordinator.PreviewAsync(request)); }
            catch (StepRevisionConflictException conflict)
            {
                return Results.Conflict(new
                {
                    code = "step_revision_conflict",
                    message = "当前步骤已在其他页面变化，请重新载入。",
                    currentRevision = conflict.CurrentRevision,
                });
            }
            catch (GenerationRejectedException rejected)
            {
                return Results.BadRequest(new { code = rejected.Code, message = rejected.Message });
            }
        });

        app.MapPost("/api/generations/{generationId}/cancel", (string generationId, GenerationCoordinator coordinator) =>
            coordinator.Cancel(generationId)
                ? Results.Ok(new { status = "cancelling" })
                : Results.NotFound(new { code = "generation_not_found", message = "生成任务已经结束。" }));

        app.MapPost("/api/shutdown", (IHostApplicationLifetime lifetime) =>
        {
            _ = Task.Run(async () =>
            {
                await Task.Delay(180);
                lifetime.StopApplication();
            });
            return Results.Ok(new { status = "closing" });
        });

        app.MapFallback(() => Results.File(indexHtml, "text/html; charset=utf-8"));

        await app.StartAsync();
        var addressFeature = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>();
        var baseAddress = addressFeature?.Addresses.FirstOrDefault(address => address.StartsWith("http://127.0.0.1", StringComparison.OrdinalIgnoreCase))
            ?? addressFeature?.Addresses.FirstOrDefault()
            ?? throw new InvalidOperationException("本地服务未能取得监听地址。");

        var launchAddress = $"{baseAddress}/?token={sessionSecret}";
        await WriteInstanceFileAsync(instanceFile, new InstanceRecord(Environment.ProcessId, baseAddress, sessionSecret));

        if (!args.Contains("--no-browser", StringComparer.OrdinalIgnoreCase))
        {
            OpenBrowser(launchAddress);
        }

        try
        {
            await app.WaitForShutdownAsync();
        }
        finally
        {
            TryDeleteOwnedInstanceFile(instanceFile, Environment.ProcessId);
        }

        return 0;
    }

    private static bool TryOpenExistingInstance(string instanceFile, bool suppressBrowser)
    {
        try
        {
            if (!File.Exists(instanceFile)) return false;
            var record = JsonSerializer.Deserialize<InstanceRecord>(File.ReadAllText(instanceFile));
            if (record is null || record.ProcessId <= 0 || string.IsNullOrWhiteSpace(record.Url) || string.IsNullOrWhiteSpace(record.Token)) return false;
            Process.GetProcessById(record.ProcessId);
            if (!suppressBrowser) OpenBrowser($"{record.Url}/?token={record.Token}");
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static bool IsStepMutationError(Exception error) =>
        error is StepRevisionConflictException or InvalidDataException or InvalidOperationException or KeyNotFoundException;

    private static IResult StepMutationError(Exception error) => error switch
    {
        StepRevisionConflictException conflict => Results.Conflict(new
        {
            code = "step_revision_conflict",
            message = "当前步骤已在其他页面变化，请重新载入。",
            currentRevision = conflict.CurrentRevision,
        }),
        KeyNotFoundException => Results.NotFound(new { code = "step_item_not_found", message = error.Message }),
        _ => Results.BadRequest(new { code = "step_mutation_invalid", message = error.Message }),
    };

    private static void OpenBrowser(string url)
    {
        Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
    }

    private static byte[] ReadEmbeddedWebAsset(string fileName)
    {
        var resourceName = $"AutoCardStudio.Web.{fileName}";
        using var stream = typeof(Program).Assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException($"内置界面资源缺失：{fileName}");
        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        return buffer.ToArray();
    }

    private static async Task WriteInstanceFileAsync(string path, InstanceRecord record)
    {
        var tempPath = $"{path}.{Guid.NewGuid():N}.tmp";
        await File.WriteAllTextAsync(tempPath, JsonSerializer.Serialize(record));
        File.Move(tempPath, path, true);
    }

    private static void TryDeleteOwnedInstanceFile(string path, int processId)
    {
        try
        {
            if (!File.Exists(path)) return;
            var record = JsonSerializer.Deserialize<InstanceRecord>(File.ReadAllText(path));
            if (record?.ProcessId == processId) File.Delete(path);
        }
        catch
        {
            // 运行记录只用于再次打开页面，清理失败不会影响项目资料。
        }
    }

    private sealed record InstanceRecord(int ProcessId, string Url, string Token);
    private sealed record RevisionRequest(long ExpectedRevision);
}
