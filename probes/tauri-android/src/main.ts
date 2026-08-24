import { invoke, isTauri } from "@tauri-apps/api/core";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { fetch as nativeFetch } from "@tauri-apps/plugin-http";
import Database from "@tauri-apps/plugin-sql";
import { Client, Stronghold } from "@tauri-apps/plugin-stronghold";
import "./styles.css";

type ProbeState = "idle" | "running" | "passed" | "failed" | "cancelled";

interface HostInfo {
  appVersion: string;
  appLocalDataDir: string;
  os: string;
  architecture: string;
}

interface ProbeResult {
  detail: string;
  evidence?: string;
}

const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("Probe root element is missing");
}

app.innerHTML = `
  <header class="topbar">
    <div class="brand-mark" aria-hidden="true"><span></span></div>
    <div>
      <p class="eyebrow">M0 / CAPABILITY PROBE</p>
      <h1>A.U.T.O Android 迁移探针</h1>
    </div>
    <span id="runtime-badge" class="runtime-badge">检测中</span>
  </header>

  <section class="hero">
    <p class="hero-kicker">独立宿主可行性</p>
    <h2>先证明五项原生能力，再迁移创作台。</h2>
    <p>本页不读取真实项目或 API Key。所有写入都使用探针专属数据库、文件和演示密钥。</p>
    <div class="hero-actions">
      <button id="run-all" class="button button-primary" type="button">运行自动探针</button>
      <button id="reset-results" class="button button-quiet" type="button">清空结果</button>
    </div>
  </section>

  <section class="probe-list" aria-label="能力探针">
    <article class="probe-card" data-probe="host">
      <div class="probe-index">01</div>
      <div class="probe-copy">
        <div class="probe-title-row">
          <h3>原生宿主</h3>
          <span class="probe-state" data-state="idle">待运行</span>
        </div>
        <p>确认当前页面运行在 Tauri，并读取应用版本、系统架构和本地数据目录。</p>
        <pre class="probe-output" aria-live="polite">尚无证据</pre>
      </div>
      <button class="probe-run" type="button" data-run="host">运行</button>
    </article>

    <article class="probe-card" data-probe="http">
      <div class="probe-index">02</div>
      <div class="probe-copy">
        <div class="probe-title-row">
          <h3>原生 HTTP 流式与取消</h3>
          <span class="probe-state" data-state="idle">待运行</span>
        </div>
        <p>通过 Tauri HTTP 插件读取分块响应；记录首包、块数、字节数和取消终态。</p>
        <label class="field">
          <span>测试地址</span>
          <input id="http-endpoint" type="url" value="https://httpbin.org/stream/20" spellcheck="false" />
        </label>
        <pre class="probe-output" aria-live="polite">尚无证据</pre>
      </div>
      <div class="probe-actions">
        <button class="probe-run" type="button" data-run="http">运行</button>
        <button id="cancel-http" class="probe-cancel" type="button" disabled>取消</button>
      </div>
    </article>

    <article class="probe-card" data-probe="sqlite">
      <div class="probe-index">03</div>
      <div class="probe-copy">
        <div class="probe-title-row">
          <h3>SQLite 事务存储</h3>
          <span class="probe-state" data-state="idle">待运行</span>
        </div>
        <p>执行版本化迁移、UPSERT 和读回校验，为项目/对话/产物统一存储提供证据。</p>
        <pre class="probe-output" aria-live="polite">尚无证据</pre>
      </div>
      <button class="probe-run" type="button" data-run="sqlite">运行</button>
    </article>

    <article class="probe-card" data-probe="stronghold">
      <div class="probe-index">04</div>
      <div class="probe-copy">
        <div class="probe-title-row">
          <h3>Stronghold 密钥存储</h3>
          <span class="probe-state" data-state="idle">待运行</span>
        </div>
        <p>写入并读回演示密钥，只显示长度和匹配结果，绝不输出密钥正文。</p>
        <div class="field-grid">
          <label class="field">
            <span>探针口令</span>
            <input id="vault-password" type="password" value="auto-card-studio-probe" autocomplete="off" />
          </label>
          <label class="field">
            <span>演示密钥</span>
            <input id="probe-secret" type="password" value="not-a-real-api-key" autocomplete="off" />
          </label>
        </div>
        <pre class="probe-output" aria-live="polite">尚无证据</pre>
      </div>
      <button class="probe-run" type="button" data-run="stronghold">运行</button>
    </article>

    <article class="probe-card" data-probe="file">
      <div class="probe-index">05</div>
      <div class="probe-copy">
        <div class="probe-title-row">
          <h3>文件往返与系统选择器</h3>
          <span class="probe-state" data-state="idle">待运行</span>
        </div>
        <p>先在应用目录完成 JSON 写入/读回，再单独验证 Android 文件导入与导出选择器。</p>
        <pre class="probe-output" aria-live="polite">尚无证据</pre>
      </div>
      <div class="probe-actions">
        <button class="probe-run" type="button" data-run="file">内部往返</button>
        <button id="import-file" class="probe-secondary" type="button">导入</button>
        <button id="export-file" class="probe-secondary" type="button">导出</button>
      </div>
    </article>
  </section>

  <footer class="footnote">
    <span>PROBE ONLY</span>
    <p>本骨架可随时删除；它不会成为项目、产物或密钥的正式事实源。</p>
  </footer>
`;

const stateLabels: Record<ProbeState, string> = {
  idle: "待运行",
  running: "运行中",
  passed: "通过",
  failed: "失败",
  cancelled: "已取消",
};

let httpAbortController: AbortController | null = null;

function probeCard(id: string): HTMLElement {
  const card = document.querySelector<HTMLElement>(`[data-probe="${id}"]`);
  if (!card) throw new Error(`Unknown probe: ${id}`);
  return card;
}

function setProbeState(id: string, state: ProbeState, detail: string): void {
  const card = probeCard(id);
  const stateNode = card.querySelector<HTMLElement>(".probe-state");
  const output = card.querySelector<HTMLElement>(".probe-output");
  if (!stateNode || !output) throw new Error(`Probe UI is incomplete: ${id}`);
  stateNode.dataset.state = state;
  stateNode.textContent = stateLabels[state];
  output.textContent = detail;
}

function readableError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "未知错误";
  }
}

async function executeProbe(
  id: string,
  operation: () => Promise<ProbeResult>,
): Promise<boolean> {
  setProbeState(id, "running", "正在收集证据…");
  try {
    const result = await operation();
    setProbeState(
      id,
      "passed",
      result.evidence ? `${result.detail}\n${result.evidence}` : result.detail,
    );
    return true;
  } catch (error) {
    const message = readableError(error);
    const cancelled = /abort|cancel|取消/i.test(message);
    setProbeState(id, cancelled ? "cancelled" : "failed", message);
    return false;
  }
}

async function runHostProbe(): Promise<ProbeResult> {
  if (!isTauri()) throw new Error("当前不是 Tauri 运行时；请使用 tauri dev 或 Android APK。");
  const info = await invoke<HostInfo>("host_info");
  return {
    detail: `Tauri ${info.appVersion} · ${info.os}/${info.architecture}`,
    evidence: `本地数据目录：${info.appLocalDataDir}\nWebView：${navigator.userAgent}`,
  };
}

async function runHttpProbe(): Promise<ProbeResult> {
  const endpoint = document.querySelector<HTMLInputElement>("#http-endpoint")?.value.trim();
  if (!endpoint) throw new Error("缺少测试地址");

  const cancelButton = document.querySelector<HTMLButtonElement>("#cancel-http");
  httpAbortController = new AbortController();
  if (cancelButton) cancelButton.disabled = false;

  const startedAt = performance.now();
  let firstChunkAt: number | null = null;
  let chunks = 0;
  let bytes = 0;

  try {
    const response = await nativeFetch(endpoint, {
      method: "GET",
      connectTimeout: 10_000,
      signal: httpAbortController.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);

    if (!response.body) {
      const body = await response.text();
      chunks = 1;
      bytes = new TextEncoder().encode(body).byteLength;
      firstChunkAt = performance.now();
    } else {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (firstChunkAt === null) firstChunkAt = performance.now();
        chunks += 1;
        bytes += value.byteLength;
        setProbeState(
          "http",
          "running",
          `已接收 ${chunks} 块 / ${bytes} bytes；点击“取消”可验证中断。`,
        );
      }
    }

    const finishedAt = performance.now();
    return {
      detail: `HTTP ${response.status} · ${chunks} 个读取块 · ${bytes} bytes`,
      evidence: `首包 ${Math.round((firstChunkAt ?? finishedAt) - startedAt)} ms · 总计 ${Math.round(finishedAt - startedAt)} ms`,
    };
  } finally {
    httpAbortController = null;
    if (cancelButton) cancelButton.disabled = true;
  }
}

async function runSqliteProbe(): Promise<ProbeResult> {
  const database = await Database.load("sqlite:probe.db");
  const revision = Date.now();
  const payload = JSON.stringify({ source: "m0-probe", revision });
  const updatedAt = new Date().toISOString();

  try {
    await database.execute(
      `INSERT INTO probe_records (id, revision, payload, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT(id) DO UPDATE SET
         revision = excluded.revision,
         payload = excluded.payload,
         updated_at = excluded.updated_at`,
      ["singleton", revision, payload, updatedAt],
    );
    const rows = await database.select<Array<{ revision: number; payload: string; updated_at: string }>>(
      "SELECT revision, payload, updated_at FROM probe_records WHERE id = $1",
      ["singleton"],
    );
    const row = rows[0];
    if (!row || Number(row.revision) !== revision || row.payload !== payload) {
      throw new Error("SQLite 读回内容与本轮写入不一致");
    }
    return {
      detail: `迁移、UPSERT、读回均成功 · revision ${revision}`,
      evidence: `记录时间：${row.updated_at}`,
    };
  } finally {
    await database.close();
  }
}

async function loadProbeStronghold(password: string): Promise<{ stronghold: Stronghold; client: Client }> {
  const vaultPath = await join(await appLocalDataDir(), "probe-vault.hold");
  const stronghold = await Stronghold.load(vaultPath, password);
  let client: Client;
  try {
    client = await stronghold.loadClient("auto-card-studio-probe");
  } catch {
    client = await stronghold.createClient("auto-card-studio-probe");
  }
  return { stronghold, client };
}

async function runStrongholdProbe(): Promise<ProbeResult> {
  const password = document.querySelector<HTMLInputElement>("#vault-password")?.value ?? "";
  const secret = document.querySelector<HTMLInputElement>("#probe-secret")?.value ?? "";
  if (password.length < 8) throw new Error("探针口令至少需要 8 个字符");
  if (!secret) throw new Error("演示密钥不能为空");

  const { stronghold, client } = await loadProbeStronghold(password);
  const store = client.getStore();
  const encoded = Array.from(new TextEncoder().encode(secret));
  await store.insert("demo-api-key", encoded);
  await stronghold.save();
  const restored = await store.get("demo-api-key");
  const restoredText = restored ? new TextDecoder().decode(restored) : "";
  await stronghold.unload();

  if (restoredText !== secret) throw new Error("Stronghold 读回内容与写入内容不一致");
  return {
    detail: `写入、保存、读回均成功 · ${encoded.length} bytes`,
    evidence: "正文未写入日志或页面输出",
  };
}

function probeArchive(): string {
  return JSON.stringify(
    {
      format: "auto-card-studio-platform-probe",
      version: 1,
      createdAt: new Date().toISOString(),
      payload: { message: "A.U.T.O Android file round-trip" },
    },
    null,
    2,
  );
}

async function runInternalFileProbe(): Promise<ProbeResult> {
  const path = await join(await appLocalDataDir(), "probe-roundtrip.json");
  const archive = probeArchive();
  await writeTextFile(path, archive);
  const restored = await readTextFile(path);
  if (restored !== archive) throw new Error("文件读回内容与写入内容不一致");
  return {
    detail: `JSON 写入、读回均成功 · ${new TextEncoder().encode(archive).byteLength} bytes`,
    evidence: `路径：${path}`,
  };
}

async function importProbeFile(): Promise<ProbeResult> {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (!selected) throw new Error("用户取消文件导入");
  const path = Array.isArray(selected) ? selected[0] : selected;
  if (!path) throw new Error("用户取消文件导入");
  const content = await readTextFile(path);
  JSON.parse(content);
  return {
    detail: `系统选择器导入成功 · ${new TextEncoder().encode(content).byteLength} bytes`,
    evidence: path,
  };
}

async function exportProbeFile(): Promise<ProbeResult> {
  const selected = await save({
    defaultPath: "auto-card-studio-probe.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (!selected) throw new Error("用户取消文件导出");
  const archive = probeArchive();
  await writeTextFile(selected, archive);
  return {
    detail: `系统选择器导出成功 · ${new TextEncoder().encode(archive).byteLength} bytes`,
    evidence: selected,
  };
}

const operations: Record<string, () => Promise<ProbeResult>> = {
  host: runHostProbe,
  http: runHttpProbe,
  sqlite: runSqliteProbe,
  stronghold: runStrongholdProbe,
  file: runInternalFileProbe,
};

async function runNamedProbe(id: string): Promise<boolean> {
  const operation = operations[id];
  if (!operation) throw new Error(`Unknown probe operation: ${id}`);
  return executeProbe(id, operation);
}

async function runAllProbes(): Promise<void> {
  const button = document.querySelector<HTMLButtonElement>("#run-all");
  if (button) button.disabled = true;
  try {
    for (const id of ["host", "sqlite", "stronghold", "file", "http"]) {
      await runNamedProbe(id);
    }
  } finally {
    if (button) button.disabled = false;
  }
}

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-run]")) {
  button.addEventListener("click", () => {
    void runNamedProbe(button.dataset.run ?? "");
  });
}

document.querySelector("#run-all")?.addEventListener("click", () => void runAllProbes());
document.querySelector("#cancel-http")?.addEventListener("click", () => httpAbortController?.abort("用户取消 HTTP 探针"));
document.querySelector("#import-file")?.addEventListener("click", () => {
  void executeProbe("file", importProbeFile);
});
document.querySelector("#export-file")?.addEventListener("click", () => {
  void executeProbe("file", exportProbeFile);
});
document.querySelector("#reset-results")?.addEventListener("click", () => {
  for (const id of Object.keys(operations)) setProbeState(id, "idle", "尚无证据");
});

const runtimeBadge = document.querySelector<HTMLElement>("#runtime-badge");
if (runtimeBadge) {
  runtimeBadge.textContent = isTauri() ? "TAURI" : "WEB PREVIEW";
  runtimeBadge.dataset.native = String(isTauri());
}
