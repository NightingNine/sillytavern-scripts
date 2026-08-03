using System.Diagnostics;
using System.Net;
using System.Security.Cryptography;
using System.Text.Json;
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
            return await ProjectStoreSelfTest.RunAsync();
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
        builder.Services.AddSingleton(store);

        var app = builder.Build();
        await store.InitializeAsync();
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

        app.MapGet("/api/health", () => Results.Ok(new
        {
            status = "ready",
            version = "0.1.0-stage1",
            dataDirectory,
        }));

        app.MapGet("/api/state", async (string? projectId, ProjectStore projectStore) =>
            Results.Ok(await projectStore.GetStateAsync(projectId)));

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
}
