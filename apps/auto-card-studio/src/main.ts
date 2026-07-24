import {
  BrowserProjectFilePort,
  StubModelGateway,
  createProjectFilePort,
  createSecretStore,
  createStudioRepository,
  platformFetch,
} from "./adapters.ts";
import {
  WorkspaceRecoveryRequiredError,
  activeProject,
  artifactKey,
  createProjectArchive,
  parseProjectArchive,
  safeFileStem,
  selectedArtifacts,
  stepState,
  type ArtifactVersion,
  type StudioSnapshot,
} from "./core.ts";
import {
  collectDeliveryArtifacts,
  createCharacterCardExport,
  defaultDeliveryKeys,
} from "./delivery.ts";
import { ModelGatewayRouter, OpenAICompatibleGateway } from "./model.ts";
import {
  AUTO_WORKFLOW_PROFILE,
  AUTO_WORKFLOW_SAMPLING,
  AUTO_WORKFLOW_SOURCE,
} from "./profile.ts";
import {
  DEFAULT_MODEL_SETTINGS,
  type ModelSettings,
  type SecretStatus,
} from "./ports.ts";
import { StudioKernel } from "./workflow.ts";
import {
  WORKFLOW_PHASES,
  WORKFLOW_STEPS,
  artifactDisplayName,
  stepDefinition,
} from "./workflow-config.ts";
import { getCurrentWindow } from "@tauri-apps/api/window";

type ViewName = "studio" | "artifacts" | "projects" | "settings" | "delivery";

const appNode = document.querySelector<HTMLElement>("#app");
if (!appNode) throw new Error("应用根节点不存在。");
const app: HTMLElement = appNode;

const repository = createStudioRepository();
const settingsRepository = repository;
const secretStore = createSecretStore();
const filePort = createProjectFilePort();
const stubGateway = new StubModelGateway(12);
let modelSettings: ModelSettings = { ...DEFAULT_MODEL_SETTINGS };
let secretStatus: SecretStatus = secretStore.status();
const compatibleGateway = new OpenAICompatibleGateway({
  settings: () => modelSettings,
  secretStore,
  sampling: AUTO_WORKFLOW_SAMPLING,
  fetcher: platformFetch,
});
const gateway = new ModelGatewayRouter({
  settings: () => modelSettings,
  stub: stubGateway,
  compatible: compatibleGateway,
});
const kernel = new StudioKernel({ repository, gateway, profile: AUTO_WORKFLOW_PROFILE });

let snapshot: StudioSnapshot | null = null;
let activeView: ViewName = "studio";
let busy = false;
let generating = false;
let streamDraft = "";
let generationController: AbortController | null = null;
let notice: { tone: "info" | "success" | "warning" | "error"; message: string } | null = null;
let deliveryKeys = new Set<string>();
let lastDeliveryProjectId = "";
let deliverySelectionCustomized = false;
let mobileFlowOpen = false;
let overviewCollapsed = true;
const mobileLayoutQuery = window.matchMedia("(max-width: 760px)");

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "尚未保存";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function setNotice(message: string, tone: typeof notice extends infer _T ? "info" | "success" | "warning" | "error" : never = "info"): void {
  notice = { tone, message };
}

function currentProject() {
  if (!snapshot) throw new Error("工作区尚未打开。");
  return activeProject(snapshot);
}

function requirementLabel(value: string): string {
  return value === "required" ? "必做" : value === "advanced" ? "复杂卡" : "建议";
}

function phaseIcon(id: string): string {
  return ({
    concept: "◎",
    entity: "◆",
    "state-machine": "⌘",
    writing: "✎",
    variables: "≋",
    summary: "≡",
    output: "▣",
    autotask: "⚙",
    delivery: "↗",
  } as Record<string, string>)[id] ?? "◇";
}

function renderStepButtons(steps: typeof WORKFLOW_STEPS, project = currentProject()): string {
  return steps.map((step) => {
    const state = stepState(project, step.number);
    const active = step.number === project.currentStep;
    return `
      <button class="step-link ${active ? "is-active" : ""} is-${state.status}"
        data-action="step" data-step="${step.number}" aria-current="${active ? "step" : "false"}">
        <span class="step-node">${String(step.number).padStart(2, "0")}</span>
        <strong>${escapeHtml(step.name)}</strong>
        <i aria-hidden="true"></i>
      </button>`;
  }).join("");
}

function renderStepRail(project = currentProject(), grouped = false): string {
  if (!grouped) return renderStepButtons(WORKFLOW_STEPS, project);
  return WORKFLOW_PHASES.map((phase) => {
    const [start, end] = phase.range;
    const steps = WORKFLOW_STEPS.filter((step) => step.number >= start && step.number <= end);
    const accepted = steps.filter((step) => stepState(project, step.number).status === "accepted").length;
    const current = project.currentStep >= start && project.currentStep <= end;
    return `
      <section class="phase-group ${current ? "is-current" : ""}">
        <div class="phase-heading">
          <span class="phase-icon">${phaseIcon(phase.id)}</span>
          <b>${escapeHtml(phase.label)}</b>
          <small>${accepted}/${steps.length}</small>
        </div>
        <div class="phase-steps">${renderStepButtons(steps, project)}</div>
      </section>`;
  }).join("");
}

function renderTopbar(project = currentProject()): string {
  const accepted = WORKFLOW_STEPS.filter((step) => stepState(project, step.number).status === "accepted").length;
  const inspectorOpen = activeView === "artifacts" || activeView === "settings" || activeView === "delivery";
  return `
    <header class="topbar">
      <button class="brand" data-action="view" data-view="studio" aria-label="返回创作台">
        <span class="brand-mark">A</span>
        <span><small>L3 / CHARACTER FORGE</small><b>A.U.T.O 角色卡创作台</b></span>
      </button>
      <button class="project-chip" data-action="view" data-view="projects">
        <span class="status-dot"></span>
        <span class="project-chip-copy"><small>当前项目</small><b>${escapeHtml(project.name)}</b></span>
        <span class="chevron">⌄</span>
      </button>
      <div class="top-progress" title="已确认步骤">
        <span style="--progress:${accepted / 29}"></span>
        <b>${accepted}</b><small>/29</small>
      </div>
      <nav class="topbar-actions" aria-label="创作台工具">
        <button class="icon-button mobile-only tour-button" data-action="open-guide" aria-label="打开新手引导" title="打开新手引导">◉</button>
        <button class="icon-button mobile-only" data-action="check-update" aria-label="检查更新" title="检查更新">↻</button>
        <button class="icon-button mobile-only" data-action="export-project" aria-label="导出项目" title="导出项目">▰</button>
        <button class="icon-button mobile-only" data-action="import-project" aria-label="导入项目" title="导入项目">⇥</button>
        <button class="icon-button mobile-only ${inspectorOpen ? "is-active" : ""}" data-action="toggle-inspector"
          aria-label="打开项目检查器" aria-expanded="${inspectorOpen}" title="项目检查器">▥</button>
        <button class="icon-button mobile-only" data-action="close-app" aria-label="关闭创作台" title="关闭创作台">×</button>
        <button class="icon-button desktop-only" data-action="view" data-view="settings" aria-label="设置">⚙</button>
      </nav>
    </header>`;
}

function renderNotice(): string {
  if (!notice) return "";
  return `<div class="notice is-${notice.tone}" role="status">
    <span>${escapeHtml(notice.message)}</span>
    <button data-action="dismiss-notice" aria-label="关闭">×</button>
  </div>`;
}

function renderStudio(project = currentProject()): string {
  const definition = stepDefinition(project.currentStep);
  const state = stepState(project);
  const selected = selectedArtifacts(project, project.currentStep);
  const hasAssistant = state.turns.some((turn) => turn.role === "assistant");
  const accepted = state.status === "accepted";
  const compactOverview = mobileLayoutQuery.matches && overviewCollapsed;
  return `
    <section class="studio-view ${compactOverview ? "is-overview-collapsed" : ""}">
      <header class="stage-heading">
        <div class="stage-heading-copy">
          <div class="stage-title-line">
            <p class="step-kicker">PHASE ${String(definition.number).padStart(2, "0")} / 29</p>
            <h1>${escapeHtml(definition.name)}</h1>
            <em class="requirement is-${definition.requirement}">${requirementLabel(definition.requirement)}</em>
          </div>
          <p>${escapeHtml(definition.goal)}</p>
        </div>
        <div class="stage-heading-actions">
          <span class="state-pill is-${state.status}">${accepted ? "已确认" : state.status === "draft" ? "有草稿" : "待开始"}</span>
          <details class="stage-guide">
            <summary aria-label="查看本步骤说明">?</summary>
            <div>
              <small>创作航标</small>
              <h2>${escapeHtml(definition.guide.title)}</h2>
              <p>${escapeHtml(definition.guide.description)}</p>
              <ol>${definition.guide.prompts.map((prompt) => `<li>${escapeHtml(prompt)}</li>`).join("")}</ol>
              <button class="text-button" data-action="use-placeholder">使用示例作为输入</button>
            </div>
          </details>
          <button class="stage-icon-button" data-action="clear-conversation" aria-label="清空本步对话"
            title="清空本步对话" ${state.turns.length ? "" : "disabled"}>■</button>
          <button class="stage-icon-button overview-toggle" data-action="toggle-overview"
            aria-expanded="${!compactOverview}" aria-controls="creative-brief" aria-label="${compactOverview ? "展开创作概览" : "收起创作概览"}"
            title="${compactOverview ? "展开创作概览" : "收起创作概览"}">${compactOverview ? "⌄" : "⌃"}</button>
        </div>
      </header>

      <section class="brief-panel" id="creative-brief">
        <div class="brief-panel-heading">
          <span>创作母题</span>
          <small>贯穿全部 29 个阶段</small>
        </div>
        <textarea id="quick-brief" rows="3" aria-label="创作母题"
          placeholder="描述世界、主控角色、核心体验、边界与参考作品">${escapeHtml(project.brief)}</textarea>
        <button class="brief-save" data-action="save-brief">保存概览</button>
      </section>

      <section class="conversation" aria-label="当前步骤会话">
        ${state.turns.length ? state.turns.map((turn) => `
          <article class="message is-${turn.role}">
            <header>
              <span>${turn.role === "assistant" ? "A.U.T.O" : "创作者"}</span>
              <small>${formatTime(turn.updatedAt)}</small>
              <div class="message-actions">
                ${turn.role === "assistant" ? `<button data-action="extract-turn" data-id="${turn.id}">提取产物</button>` : `<button data-action="retry-turn" data-id="${turn.id}">重试</button>`}
                <button data-action="edit-turn" data-id="${turn.id}">编辑</button>
                <button data-action="delete-turn" data-id="${turn.id}">删除</button>
              </div>
            </header>
            <pre>${escapeHtml(turn.content)}</pre>
          </article>`).join("") : `
          <div class="empty-conversation">
            <span class="empty-glyph">◎</span>
            <small>STATION ${String(definition.number).padStart(2, "0")} · 创作航标</small>
            <h2>${escapeHtml(definition.guide.title)}</h2>
            <p>${escapeHtml(definition.guide.description)}</p>
            <div class="empty-guide">
              <b>可以从这些问题开始</b>
              <ol>${definition.guide.prompts.map((prompt) => `<li>${escapeHtml(prompt)}</li>`).join("")}</ol>
            </div>
          </div>`}
        ${generating ? `<article class="message is-assistant is-streaming"><header><span>A.U.T.O · 正在生成</span><button data-action="cancel-generation">停止</button></header><pre id="stream-draft">${escapeHtml(streamDraft || "正在连接模型…")}</pre></article>` : ""}
      </section>

      <section class="composer">
        <label for="composer-input">本轮补充 · ${escapeHtml(definition.name)}</label>
        <textarea id="composer-input" rows="3" placeholder="${escapeHtml(definition.guide.placeholder)}" ${generating ? "disabled" : ""}></textarea>
        <div class="composer-footer">
          <div>
            <button class="text-button" data-action="prompt-preview">预览上下文</button>
            <button class="text-button" data-action="clear-conversation" ${state.turns.length ? "" : "disabled"}>清空本步对话</button>
          </div>
          <button class="primary-button send-button" data-action="generate" ${generating || busy ? "disabled" : ""}>
            <span>${modelSettings.mode === "stub" ? "离线演示生成" : "发送给模型"}</span><i>↑</i>
          </button>
        </div>
        <div class="mobile-composer-actions">
          <button data-action="view" data-view="artifacts"><span>◇</span>产物<em>${selected.length}</em></button>
          <button data-action="prompt-preview"><span>▤</span>提示词</button>
          ${generating
            ? `<button class="is-danger" data-action="cancel-generation"><span>■</span>停止</button>`
            : `<button class="is-primary" data-action="generate" ${busy ? "disabled" : ""}><span>✦</span>生成</button>`}
          <button class="is-confirm ${accepted ? "is-accepted" : ""}" data-action="accept-step"
            ${!selected.length || busy ? "disabled" : ""}><span>${accepted ? "✓" : "→"}</span>下一站</button>
        </div>
        ${hasAssistant && !selected.length ? `<small class="composer-warning">回复中尚未识别到正式产物，可继续对话或在产物检查器手动添加。</small>` : ""}
      </section>
      <section class="step-actions desktop-step-actions">
        <button class="secondary-button" data-action="view" data-view="artifacts">查看本步产物 <span>${selected.length}</span></button>
        <button class="confirm-button ${accepted ? "is-confirmed" : ""}" data-action="accept-step"
          ${!selected.length || busy ? "disabled" : ""}>${accepted ? "✓ 已确认本步骤" : "确认本步骤产物"}</button>
      </section>
    </section>`;
}

function artifactGroups(project = currentProject()): Array<{
  key: string;
  step: number;
  identity: string;
  versions: ArtifactVersion[];
  selectedId: string;
}> {
  const groups = new Map<string, ArtifactVersion[]>();
  for (const version of project.artifacts.versions) {
    const key = artifactKey(version.step, version.identity);
    const items = groups.get(key) ?? [];
    items.push(version);
    groups.set(key, items);
  }
  return [...groups.entries()].map(([key, versions]) => ({
    key,
    step: versions[0].step,
    identity: versions[0].identity,
    versions,
    selectedId: project.artifacts.selectedVersionIds[key] ?? "",
  })).sort((left, right) => left.step - right.step || left.identity.localeCompare(right.identity, "zh-CN"));
}

function renderArtifacts(project = currentProject()): string {
  const groups = artifactGroups(project);
  const currentOnly = groups.filter((group) => group.step === project.currentStep);
  return `
    <section class="panel-view">
      <div class="panel-heading">
        <div><small>ARTIFACT VAULT</small><h1>独立产物库</h1><p>对话和产物彼此独立。编辑会创建新版本，不会改写历史消息。</p></div>
        <button class="secondary-button" data-action="go-current-artifacts">只看 Step ${project.currentStep}</button>
      </div>
      <div class="vault-summary">
        <span><b>${groups.length}</b><small>产物身份</small></span>
        <span><b>${project.artifacts.versions.length}</b><small>全部版本</small></span>
        <span><b>${selectedArtifacts(project).filter((item) => item.accepted).length}</b><small>已确认</small></span>
      </div>
      <details class="manual-artifact">
        <summary>＋ 手动添加当前步骤产物</summary>
        <div>
          <label>产物身份<input id="manual-identity" placeholder="例如 WORLD_example"></label>
          <label>产物正文<textarea id="manual-content" rows="6" placeholder="粘贴完整 XML 或代码内容"></textarea></label>
          <button class="primary-button" data-action="add-artifact">保存为新版本</button>
        </div>
      </details>
      <div class="artifact-list" id="artifact-list">
        ${groups.length ? groups.map((group) => {
          const selected = group.versions.find((version) => version.id === group.selectedId) ?? group.versions.at(-1)!;
          const hidden = project.context.hiddenArtifactKeys.includes(group.key);
          return `
            <article class="artifact-card ${selected.accepted ? "is-accepted" : ""}" data-step-group="${group.step}">
              <header>
                <span class="artifact-step">STEP ${String(group.step).padStart(2, "0")}</span>
                <div><h2>${escapeHtml(artifactDisplayName(group.identity, group.step))}</h2><code>${escapeHtml(group.identity)}</code></div>
                <span class="version-badge">${group.versions.length} 版</span>
              </header>
              <div class="artifact-toolbar">
                <label>当前版本
                  <select data-action="select-artifact">
                    ${group.versions.map((version, index) => `<option value="${version.id}" ${version.id === selected.id ? "selected" : ""}>v${index + 1} · ${formatTime(version.updatedAt)}${version.accepted ? " · 已确认" : ""}</option>`).join("")}
                  </select>
                </label>
                <label class="switch"><input type="checkbox" data-action="toggle-artifact-context" data-key="${escapeHtml(group.key)}" ${hidden ? "" : "checked"}><span></span>送入上下文</label>
              </div>
              <pre>${escapeHtml(selected.content)}</pre>
              <footer>
                <span>${selected.source === "generated" ? "AI 生成" : selected.source === "manual" ? "手动修订" : "旧数据迁移"} · ${selected.content.length.toLocaleString()} 字符</span>
                <div><button data-action="edit-artifact" data-id="${selected.id}">编辑为新版本</button><button class="danger-text" data-action="delete-artifact" data-id="${selected.id}">删除此版本</button></div>
              </footer>
            </article>`;
        }).join("") : `
          <div class="empty-panel"><span>◇</span><h2>产物库还是空的</h2><p>完成生成后，符合当前步骤规则的 XML 与代码围栏会自动成为新版本。</p></div>`}
      </div>
      ${currentOnly.length ? "" : `<p class="subtle-note">当前 Step ${project.currentStep} 还没有产物。</p>`}
    </section>`;
}

function renderProjects(project = currentProject()): string {
  if (!snapshot) return "";
  return `
    <section class="panel-view">
      <div class="panel-heading">
        <div><small>PROJECT LIBRARY</small><h1>项目库</h1><p>每个项目拥有独立的 29 步会话、产物版本与导出设置。</p></div>
        <button class="primary-button" data-action="create-project">＋ 新建项目</button>
      </div>
      <div class="project-grid">
        ${snapshot.projects.map((item) => {
          const accepted = WORKFLOW_STEPS.filter((step) => stepState(item, step.number).status === "accepted").length;
          return `<article class="project-card ${item.id === project.id ? "is-active" : ""}">
            <header><span class="project-monogram">${escapeHtml(item.name.slice(0, 1).toUpperCase())}</span><div><h2>${escapeHtml(item.name)}</h2><small>${accepted}/29 已确认 · Step ${item.currentStep}</small></div></header>
            <p>${escapeHtml(item.brief || "尚未填写创作母题")}</p>
            <footer>
              <button data-action="switch-project" data-id="${item.id}" ${item.id === project.id ? "disabled" : ""}>${item.id === project.id ? "当前项目" : "打开"}</button>
              <button class="danger-text" data-action="delete-project" data-id="${item.id}" ${snapshot!.projects.length <= 1 ? "disabled" : ""}>删除</button>
            </footer>
          </article>`;
        }).join("")}
      </div>
      <section class="settings-section">
        <header><div><small>CURRENT PROJECT</small><h2>项目信息与成品名称</h2></div></header>
        <div class="form-grid">
          <label>项目名称<input id="project-name" value="${escapeHtml(project.name)}"></label>
          <label>角色卡名称<input id="character-name" value="${escapeHtml(project.output.characterName)}"></label>
          <label class="span-two">创作母题<textarea id="project-brief" rows="5">${escapeHtml(project.brief)}</textarea></label>
          <label class="span-two">世界书名称<input id="worldbook-name" value="${escapeHtml(project.output.worldbookName)}"></label>
        </div>
        <div class="button-row"><button class="primary-button" data-action="save-project">保存项目信息</button></div>
      </section>
      <section class="settings-section">
        <header><div><small>PORTABLE BACKUP</small><h2>项目导入与导出</h2></div><p>导出包含当前项目的 29 步、会话和产物版本，不包含 API Key 与模型连接。</p></header>
        <div class="button-row">
          <button class="secondary-button" data-action="export-project">导出项目备份</button>
          <button class="secondary-button" data-action="import-project">导入为新项目</button>
        </div>
      </section>
    </section>`;
}

function renderSettings(project = currentProject()): string {
  const preset = snapshot!.resources.preset;
  const status = secretStatus;
  return `
    <section class="panel-view">
      <div class="panel-heading">
        <div><small>SETTINGS & RESOURCES</small><h1>模型与资源</h1><p>真实模型密钥只进入加密密钥仓，不进入项目、日志或导出文件。</p></div>
      </div>
      <section class="settings-section">
        <header><div><small>MODEL GATEWAY</small><h2>生成模型</h2></div><span class="resource-state">${modelSettings.mode === "stub" ? "离线演示" : "OpenAI-compatible"}</span></header>
        <div class="form-grid">
          <label>运行模式<select id="model-mode"><option value="stub" ${modelSettings.mode === "stub" ? "selected" : ""}>离线演示模型</option><option value="openai-compatible" ${modelSettings.mode === "openai-compatible" ? "selected" : ""}>OpenAI-compatible API</option></select></label>
          <label>模型名称<input id="model-name" value="${escapeHtml(modelSettings.model)}" placeholder="例如 gpt-5-mini"></label>
          <label class="span-two">API Base URL<input id="model-base-url" value="${escapeHtml(modelSettings.baseUrl)}" placeholder="https://api.openai.com/v1"></label>
          <label>请求超时（秒）<input id="model-timeout" type="number" min="5" max="600" value="${Math.round(modelSettings.timeoutMs / 1000)}"></label>
        </div>
        <div class="button-row"><button class="primary-button" data-action="save-model">保存模型设置</button><button class="secondary-button" data-action="test-model" ${status.unlocked && status.hasApiKey ? "" : "disabled"}>测试连接</button></div>
      </section>
      <section class="settings-section">
        <header><div><small>ENCRYPTED SECRET</small><h2>API Key 密钥仓</h2></div><span class="resource-state is-${status.unlocked ? "ok" : "muted"}">${!status.supported ? "浏览器预览不可用" : status.unlocked ? (status.hasApiKey ? "已解锁 · 已保存" : "已解锁") : "已锁定"}</span></header>
        <div class="form-grid">
          <label>本机密钥仓口令<input id="vault-passphrase" type="password" autocomplete="current-password" placeholder="至少 8 个字符"></label>
          <label>API Key<input id="api-key" type="password" autocomplete="off" placeholder="${status.hasApiKey ? "已保存；留空不会覆盖" : "sk-…"}"></label>
        </div>
        <div class="button-row">
          <button class="secondary-button" data-action="unlock-vault" ${!status.supported ? "disabled" : ""}>解锁</button>
          <button class="primary-button" data-action="save-api-key" ${status.unlocked ? "" : "disabled"}>保存 Key</button>
          <button class="secondary-button" data-action="lock-vault" ${status.unlocked ? "" : "disabled"}>锁定</button>
          <button class="danger-button" data-action="delete-api-key" ${status.hasApiKey ? "" : "disabled"}>删除 Key</button>
        </div>
      </section>
      <section class="settings-section">
        <header><div><small>A.U.T.O RESOURCE</small><h2>工作流预设与独立正则</h2></div><span class="resource-state is-ok">${preset.regexCount} 条正则</span></header>
        <div class="resource-card">
          <div><b>${escapeHtml(preset.name)}</b><small>${escapeHtml(preset.sourceFileName)} · ${preset.promptCount} prompts</small><code>SHA-256 ${escapeHtml(preset.sourceSha256)}</code></div>
          <span>${preset.raw ? "用户导入" : "应用内置"}</span>
        </div>
        ${snapshot!.resources.compatibilityNotes.map((item) => `<p class="compat-note">${escapeHtml(item)}</p>`).join("")}
        <div class="button-row">
          <button class="secondary-button" data-action="import-preset">导入 A.U.T.O 预设</button>
          <button class="secondary-button" data-action="restore-preset" ${preset.raw ? "" : "disabled"}>恢复内置预设</button>
        </div>
        <p class="subtle-note">导入仅解析数据，不执行预设中的脚本或未知表达式；未知字段会随资源原样保留。</p>
      </section>
      <section class="settings-section">
        <header><div><small>PROMPT PREFERENCES</small><h2>当前项目提示偏好</h2></div></header>
        <div class="form-grid">
          <label>AI 称呼<input id="pref-ai-role" value="${escapeHtml(project.preferences.aiRole)}"></label>
          <label>创作者称呼<input id="pref-creator-role" value="${escapeHtml(project.preferences.creatorRole)}"></label>
          <label>目标字数<input id="pref-word-count" value="${escapeHtml(project.preferences.wordCount)}"></label>
          <label>语言<input id="pref-language" value="${escapeHtml(project.preferences.language)}"></label>
          <label>叙事人称<input id="pref-person" value="${escapeHtml(project.preferences.person)}"></label>
        </div>
        <div class="button-row"><button class="primary-button" data-action="save-preferences">保存提示偏好</button></div>
      </section>
      <section class="diagnostic-strip">
        <span><b>Schema</b> v${snapshot!.schemaVersion}</span>
        <span><b>Workspace revision</b> ${snapshot!.revision}</span>
        <span><b>Profile</b> ${escapeHtml(preset.profileVersion)}</span>
        <span><b>Storage</b> ${escapeHtml(repository.label)}</span>
      </section>
    </section>`;
}

function syncDeliveryKeys(project = currentProject()): void {
  if (lastDeliveryProjectId !== project.id) {
    lastDeliveryProjectId = project.id;
    deliverySelectionCustomized = false;
  }
  if (!deliverySelectionCustomized) deliveryKeys = new Set(defaultDeliveryKeys(project));
}

function renderDelivery(project = currentProject()): string {
  syncDeliveryKeys(project);
  const items = collectDeliveryArtifacts(project);
  const selectedCount = items.filter((item) => deliveryKeys.has(item.key)).length;
  return `
    <section class="panel-view">
      <div class="panel-heading">
        <div><small>ST-COMPATIBLE DELIVERY</small><h1>创建角色卡成品</h1><p>导出 SillyTavern Character Card V3 JSON，内含世界书、开场白、状态栏与输出正则。</p></div>
        <span class="delivery-count">${selectedCount} / ${items.length}</span>
      </div>
      <div class="delivery-toolbar">
        <button data-action="delivery-select-accepted">只选已确认</button>
        <button data-action="delivery-select-all">全选</button>
        <button data-action="delivery-select-none">清空</button>
      </div>
      <div class="delivery-list">
        ${items.length ? items.map((item) => `
          <label class="delivery-item ${item.artifact.accepted ? "" : "is-draft"}">
            <input type="checkbox" data-action="delivery-toggle" data-key="${escapeHtml(item.key)}" ${deliveryKeys.has(item.key) ? "checked" : ""}>
            <span class="delivery-check">✓</span>
            <span><b>${escapeHtml(artifactDisplayName(item.artifact.identity, item.artifact.step))}</b><small>Step ${item.artifact.step} · 写入 ${escapeHtml(item.target.name)}</small></span>
            <em>${item.artifact.accepted ? "已确认" : "草稿"}</em>
          </label>`).join("") : `<div class="empty-panel"><span>◇</span><h2>还没有可交付产物</h2><p>完成任一步生成并确认产物后，它们会出现在这里。</p></div>`}
      </div>
      <section class="delivery-summary">
        <div><small>EXPORT FORMAT</small><b>SillyTavern Character Card V3 · JSON</b><p>API Key、密钥仓口令、模型端点和完整预设正文不会进入成品。</p></div>
        <button class="primary-button export-button" data-action="export-card" ${selectedCount ? "" : "disabled"}>导出角色卡 JSON <span>↗</span></button>
      </section>
    </section>`;
}

function renderMobileProjectPanel(project = currentProject()): string {
  if (!snapshot) return "";
  return `
    <section class="mobile-project-panel">
      <header>
        <small>PROJECT LIBRARY</small>
        <h2>项目库</h2>
        <p>项目、会话与产物均独立保存在本机。</p>
      </header>
      <div class="mobile-project-list">
        ${snapshot.projects.map((item) => {
          const accepted = WORKFLOW_STEPS.filter((step) => stepState(item, step.number).status === "accepted").length;
          return `
            <article class="${item.id === project.id ? "is-active" : ""}">
              <button data-action="switch-project" data-id="${item.id}" ${item.id === project.id ? "disabled" : ""}>
                <span>${escapeHtml(item.name.slice(0, 1).toUpperCase())}</span>
                <b>${escapeHtml(item.name)}</b>
                <small>${accepted}/29 · Step ${item.currentStep}</small>
              </button>
              <button class="danger-text" data-action="delete-project" data-id="${item.id}"
                ${snapshot!.projects.length <= 1 ? "disabled" : ""} aria-label="删除 ${escapeHtml(item.name)}">×</button>
            </article>`;
        }).join("")}
      </div>
      <button class="mobile-new-project" data-action="create-project">＋ 新建项目</button>
      <details class="mobile-project-editor">
        <summary>编辑当前项目</summary>
        <div>
          <label>项目名称<input id="project-name" value="${escapeHtml(project.name)}"></label>
          <label>角色卡名称<input id="character-name" value="${escapeHtml(project.output.characterName)}"></label>
          <label>世界书名称<input id="worldbook-name" value="${escapeHtml(project.output.worldbookName)}"></label>
          <label>创作母题<textarea id="project-brief" rows="4">${escapeHtml(project.brief)}</textarea></label>
          <button class="primary-button" data-action="save-project">保存项目信息</button>
        </div>
      </details>
      <footer>
        <button data-action="export-project">导出备份</button>
        <button data-action="import-project">导入项目</button>
      </footer>
    </section>`;
}

function renderMobileRail(project = currentProject()): string {
  const accepted = WORKFLOW_STEPS.filter((step) => stepState(project, step.number).status === "accepted").length;
  const projectMenuOpen = activeView === "projects";
  return `
    <aside class="step-rail mobile-step-rail ${mobileFlowOpen ? "is-expanded" : ""} ${projectMenuOpen ? "is-project-menu" : ""}">
      <div class="mobile-rail-head">
        <div><small>${projectMenuOpen ? "PROJECT" : "WORKFLOW"}</small><b>${projectMenuOpen ? "项目库" : "29 步创作路径"}</b></div>
        <button class="mobile-rail-toggle" data-action="toggle-flow" aria-expanded="${mobileFlowOpen}" aria-label="${mobileFlowOpen ? "收起流程" : "展开流程"}">
          <span>${mobileFlowOpen ? "‹" : "☷"}</span><em>${project.currentStep}</em>
        </button>
      </div>
      ${projectMenuOpen ? renderMobileProjectPanel(project) : `
        <section class="rail-project">
          <label>当前项目</label>
          <button data-action="view" data-view="projects">
            <span>▰</span><b>${escapeHtml(project.name)}</b><i>›</i>
          </button>
          <div><small>${accepted} / 29</small><small>${Math.round(accepted / 29 * 100)}%</small></div>
          <progress max="29" value="${accepted}">${accepted}/29</progress>
        </section>
        <nav class="phase-rail">${renderStepRail(project, true)}</nav>
        <button class="rail-new-project" data-action="create-project">＋ 新建项目</button>`}
    </aside>`;
}

function renderMobileInspector(project = currentProject()): string {
  const view = activeView === "settings" || activeView === "delivery" ? activeView : "artifacts";
  const contents = view === "settings"
    ? renderSettings(project)
    : view === "delivery"
      ? renderDelivery(project)
      : renderArtifacts(project);
  return `
    <aside class="mobile-inspector" aria-label="项目检查器">
      <nav class="inspector-tabs" aria-label="检查器标签">
        <button class="${view === "artifacts" ? "is-active" : ""}" data-action="view" data-view="artifacts">产物</button>
        <button class="${view === "settings" ? "is-active" : ""}" data-action="view" data-view="settings">设置</button>
        <button class="${view === "delivery" ? "is-active" : ""}" data-action="view" data-view="delivery">发布</button>
      </nav>
      <div class="inspector-body">${contents}</div>
    </aside>`;
}

function viewContent(): string {
  if (activeView === "artifacts") return renderArtifacts();
  if (activeView === "projects") return renderProjects();
  if (activeView === "settings") return renderSettings();
  if (activeView === "delivery") return renderDelivery();
  return renderStudio();
}

function render(): void {
  if (!snapshot) return;
  const project = currentProject();
  const mobile = mobileLayoutQuery.matches;
  const inspectorOpen = activeView === "artifacts" || activeView === "settings" || activeView === "delivery";
  if (!mobile) mobileFlowOpen = false;
  app.innerHTML = `
    <div class="app-shell ${mobileFlowOpen ? "is-mobile-flow-open" : ""} ${inspectorOpen ? "is-mobile-inspector-open" : ""}">
      ${renderTopbar(project)}
      ${renderNotice()}
      ${mobile ? `
        <div class="workspace mobile-workspace">
          ${renderMobileRail(project)}
          <main class="content-area">${renderStudio(project)}</main>
          ${inspectorOpen ? renderMobileInspector(project) : ""}
          ${(mobileFlowOpen || inspectorOpen) ? `<button class="mobile-scrim" data-action="close-mobile-panel" aria-label="关闭面板"></button>` : ""}
        </div>` : `
        <div class="workspace">
          <aside class="step-rail">
            <div class="rail-heading"><small>WORKFLOW</small><b>29 步创作路径</b></div>
            <nav>${renderStepRail(project)}</nav>
          </aside>
          <main class="content-area">${viewContent()}</main>
        </div>`}
    </div>`;
  // 重绘后把当前步骤带回可视区域，纵向流程轨道不会跳回 Step 1。
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(".step-link.is-active")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
}

async function runAction(action: () => Promise<unknown>, success?: string): Promise<void> {
  if (busy) return;
  busy = true;
  try {
    await action();
    snapshot = kernel.snapshot();
    if (success) setNotice(success, "success");
  } catch (error) {
    setNotice((error as Error)?.message || String(error), "error");
  } finally {
    busy = false;
    render();
  }
}

function elementValue(id: string): string {
  return (document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`#${id}`)?.value ?? "").trim();
}

function openTextEditor(title: string, value: string, label = "正文"): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <section class="modal-dialog">
        <header><div><small>EDITOR</small><h2>${escapeHtml(title)}</h2></div><button data-close aria-label="关闭">×</button></header>
        <label>${escapeHtml(label)}<textarea rows="18">${escapeHtml(value)}</textarea></label>
        <footer><button class="secondary-button" data-close>取消</button><button class="primary-button" data-save>保存</button></footer>
      </section>`;
    const textarea = overlay.querySelector("textarea")!;
    const close = (result: string | null) => {
      overlay.remove();
      resolve(result);
    };
    overlay.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => close(null)));
    overlay.querySelector("[data-save]")?.addEventListener("click", () => close(textarea.value));
    document.body.append(overlay);
    textarea.focus();
  });
}

async function generate(input?: string): Promise<void> {
  if (generating || busy) return;
  const composer = document.querySelector<HTMLTextAreaElement>("#composer-input");
  const text = input ?? composer?.value ?? "";
  generating = true;
  streamDraft = "";
  generationController = new AbortController();
  render();
  try {
    const outcome = await kernel.generateStep({
      input: text,
      signal: generationController.signal,
      onDraft: (draft) => {
        streamDraft = draft;
        const node = document.querySelector<HTMLElement>("#stream-draft");
        if (node) {
          node.textContent = draft;
          node.scrollIntoView({ block: "end", behavior: "smooth" });
        }
      },
    });
    snapshot = outcome.snapshot;
    setNotice(
      outcome.status === "cancelled"
        ? "已停止生成；流式草稿没有写入正式项目。"
        : `已保存回复，并提取 ${outcome.artifactCount} 项正式产物。`,
      outcome.status === "cancelled" ? "warning" : "success",
    );
  } catch (error) {
    setNotice((error as Error)?.message || String(error), "error");
  } finally {
    generating = false;
    generationController = null;
    streamDraft = "";
    render();
  }
}

async function importProjectFile(): Promise<void> {
  const selected = await filePort.importProject();
  if (selected.status === "cancelled") return;
  const parsed = parseProjectArchive(selected.contents, snapshot!.resources);
  await kernel.importProject({ project: parsed.project, archiveDigest: parsed.digest });
  lastDeliveryProjectId = "";
}

async function exportProjectFile(): Promise<void> {
  const project = currentProject();
  const contents = createProjectArchive(snapshot!, new Date().toISOString());
  await filePort.exportProject({
    suggestedName: `${safeFileStem(project.name)}.auto-card-studio.json`,
    contents,
  });
}

async function importPresetFile(): Promise<void> {
  const selected = await filePort.importProject();
  if (selected.status === "cancelled") return;
  await kernel.importPreset(selected.contents, selected.name);
}

async function exportCard(): Promise<void> {
  const output = createCharacterCardExport({
    snapshot: snapshot!,
    selectedKeys: [...deliveryKeys],
    exportedAt: new Date().toISOString(),
  });
  const saved = await filePort.exportProject({ suggestedName: output.fileName, contents: output.contents });
  if (saved.status === "saved") {
    setNotice(`已导出 ${output.artifactCount} 项产物、${output.worldbookCount} 个世界书条目：${saved.name}`, "success");
  }
}

app.addEventListener("change", (event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  const action = target.dataset.action;
  if (action === "select-artifact") {
    void runAction(() => kernel.selectArtifact(target.value), "已切换正式版本。");
  }
  if (action === "toggle-artifact-context") {
    const project = currentProject();
    const key = target.dataset.key || "";
    const hidden = new Set(project.context.hiddenArtifactKeys);
    if ((target as HTMLInputElement).checked) hidden.delete(key);
    else hidden.add(key);
    void runAction(() => kernel.updateContext({ hiddenArtifactKeys: [...hidden] }), "上下文范围已更新。");
  }
  if (action === "delivery-toggle") {
    const key = target.dataset.key || "";
    if ((target as HTMLInputElement).checked) deliveryKeys.add(key);
    else deliveryKeys.delete(key);
    deliverySelectionCustomized = true;
    render();
  }
});

app.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!button) return;
  const action = button.dataset.action;

  if (action === "view") {
    activeView = button.dataset.view as ViewName;
    mobileFlowOpen = activeView === "projects";
    render();
    return;
  }
  if (action === "toggle-flow") {
    if (mobileFlowOpen) {
      mobileFlowOpen = false;
      if (activeView === "projects") activeView = "studio";
    } else {
      activeView = "studio";
      mobileFlowOpen = true;
    }
    render();
    return;
  }
  if (action === "toggle-inspector") {
    const inspectorOpen = activeView === "artifacts" || activeView === "settings" || activeView === "delivery";
    activeView = inspectorOpen ? "studio" : "artifacts";
    mobileFlowOpen = false;
    render();
    return;
  }
  if (action === "close-mobile-panel") {
    activeView = "studio";
    mobileFlowOpen = false;
    render();
    return;
  }
  if (action === "dismiss-notice") {
    notice = null;
    render();
    return;
  }
  if (action === "toggle-overview") {
    overviewCollapsed = !overviewCollapsed;
    const studio = button.closest<HTMLElement>(".studio-view");
    studio?.classList.toggle("is-overview-collapsed", overviewCollapsed);
    button.setAttribute("aria-expanded", String(!overviewCollapsed));
    button.setAttribute("aria-label", overviewCollapsed ? "展开创作概览" : "收起创作概览");
    button.setAttribute("title", overviewCollapsed ? "展开创作概览" : "收起创作概览");
    button.textContent = overviewCollapsed ? "⌄" : "⌃";
    return;
  }
  if (action === "open-guide") {
    const guide = document.querySelector<HTMLDetailsElement>(".stage-guide");
    if (guide) {
      guide.open = true;
      guide.querySelector<HTMLElement>("summary")?.focus();
    }
    return;
  }
  if (action === "check-update") {
    setNotice("Android 测试版通过安装新版 APK 更新；当前应用不执行脚本热更新。", "info");
    render();
    return;
  }
  if (action === "close-app") {
    void getCurrentWindow().close().catch((error) => {
      setNotice(`暂时无法关闭应用：${(error as Error).message}`, "error");
      render();
    });
    return;
  }
  if (action === "step") {
    const step = Number(button.dataset.step);
    activeView = "studio";
    mobileFlowOpen = false;
    void runAction(() => kernel.navigateStep(step), `已切换到 Step ${step}。`);
    return;
  }
  if (action === "use-placeholder") {
    const textarea = document.querySelector<HTMLTextAreaElement>("#composer-input");
    if (textarea) {
      textarea.value = stepDefinition(currentProject().currentStep).guide.placeholder;
      textarea.focus();
    }
    return;
  }
  if (action === "save-brief") {
    const project = currentProject();
    void runAction(() => kernel.updateProject({
      name: project.name,
      brief: elementValue("quick-brief"),
      characterName: project.output.characterName,
      worldbookName: project.output.worldbookName,
    }), "创作母题已保存。");
    return;
  }
  if (action === "generate") {
    void generate();
    return;
  }
  if (action === "cancel-generation") {
    generationController?.abort();
    return;
  }
  if (action === "accept-step") {
    void runAction(() => kernel.acceptStep(), `Step ${currentProject().currentStep} 已确认。`);
    return;
  }
  if (action === "clear-conversation") {
    if (window.confirm("只清空当前步骤会话？独立产物库不会受到影响。")) {
      void runAction(() => kernel.clearStepConversation(), "当前步骤会话已清空，产物仍保留。");
    }
    return;
  }
  if (action === "prompt-preview") {
    try {
      const preview = kernel.previewPrompt(elementValue("composer-input"));
      const summary = [
        `总计约 ${preview.trace.characters.toLocaleString()} 字符 · ${preview.messages.length} 条消息`,
        preview.trace.omitted.length ? `已按完整块移除：${preview.trace.omitted.join("、")}` : "没有裁剪上下文块",
        "",
        ...preview.messages.map((message, index) => (
          `${index + 1}. [${message.role}] ${message.name || "未命名"} · ${message.content.length.toLocaleString()} 字符`
        )),
      ].join("\n");
      void openTextEditor("本轮上下文清单", summary, "只读摘要");
    } catch (error) {
      setNotice((error as Error).message, "error");
      render();
    }
    return;
  }
  if (action === "edit-turn") {
    const state = stepState(currentProject());
    const turn = state.turns.find((item) => item.id === button.dataset.id);
    if (!turn) return;
    void openTextEditor("编辑会话消息", turn.content).then((value) => {
      if (value !== null) void runAction(() => kernel.editTurn(turn.id, value), "消息已更新；产物版本未改变。");
    });
    return;
  }
  if (action === "delete-turn") {
    if (window.confirm("删除这条会话消息？独立产物版本不会删除。")) {
      void runAction(() => kernel.deleteTurn(button.dataset.id || ""), "消息已删除；产物版本未改变。");
    }
    return;
  }
  if (action === "extract-turn") {
    void runAction(() => kernel.extractTurnArtifacts(button.dataset.id || ""), "已从历史回复提取为新产物版本。");
    return;
  }
  if (action === "retry-turn") {
    const turn = stepState(currentProject()).turns.find((item) => item.id === button.dataset.id);
    if (turn) void generate(turn.content);
    return;
  }
  if (action === "add-artifact") {
    void runAction(() => kernel.addManualArtifact(elementValue("manual-identity"), elementValue("manual-content")), "手动产物已保存为新版本。");
    return;
  }
  if (action === "edit-artifact") {
    const artifact = currentProject().artifacts.versions.find((item) => item.id === button.dataset.id);
    if (!artifact) return;
    void openTextEditor(`编辑 ${artifactDisplayName(artifact.identity, artifact.step)}`, artifact.content).then((value) => {
      if (value !== null) void runAction(() => kernel.editArtifact(artifact.id, value), "已创建并选中新产物版本。");
    });
    return;
  }
  if (action === "delete-artifact") {
    if (window.confirm("删除这个产物版本？若它是当前版本，将自动选择上一版。")) {
      void runAction(() => kernel.deleteArtifact(button.dataset.id || ""), "产物版本已删除。");
    }
    return;
  }
  if (action === "go-current-artifacts") {
    document.querySelector(`[data-step-group="${currentProject().currentStep}"]`)?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (action === "create-project") {
    void openTextEditor("新建项目", "", "项目名称").then((name) => {
      if (name?.trim()) void runAction(() => kernel.createProject({ name }), "新项目已创建。");
    });
    return;
  }
  if (action === "switch-project") {
    void runAction(async () => {
      await kernel.switchProject(button.dataset.id || "");
      lastDeliveryProjectId = "";
      deliverySelectionCustomized = false;
    }, "项目已切换。");
    return;
  }
  if (action === "delete-project") {
    if (window.confirm("删除这个项目及其本地会话、产物和备份入口？此操作不可撤销，建议先导出项目备份。")) {
      void runAction(() => kernel.deleteProject(button.dataset.id || ""), "项目已删除。");
    }
    return;
  }
  if (action === "save-project") {
    const project = currentProject();
    void runAction(() => kernel.updateProject({
      name: elementValue("project-name"),
      brief: elementValue("project-brief"),
      characterName: elementValue("character-name"),
      worldbookName: elementValue("worldbook-name"),
      preferences: project.preferences,
    }), "项目信息已保存。");
    return;
  }
  if (action === "export-project") {
    void runAction(exportProjectFile, "项目备份已导出。");
    return;
  }
  if (action === "import-project") {
    void runAction(importProjectFile, "项目已作为新项目导入。");
    return;
  }
  if (action === "save-model") {
    void runAction(async () => {
      const timeoutSeconds = Number(elementValue("model-timeout"));
      modelSettings = await settingsRepository.saveModelSettings({
        mode: elementValue("model-mode") === "openai-compatible" ? "openai-compatible" : "stub",
        baseUrl: elementValue("model-base-url"),
        model: elementValue("model-name"),
        timeoutMs: Math.max(5_000, timeoutSeconds * 1000),
        updatedAt: new Date().toISOString(),
      });
    }, "模型设置已保存。");
    return;
  }
  if (action === "unlock-vault") {
    void runAction(async () => { secretStatus = await secretStore.unlock(elementValue("vault-passphrase")); }, "密钥仓已解锁。");
    return;
  }
  if (action === "save-api-key") {
    void runAction(async () => { secretStatus = await secretStore.saveApiKey(elementValue("api-key")); }, "API Key 已写入加密密钥仓。");
    return;
  }
  if (action === "lock-vault") {
    void runAction(async () => { secretStatus = await secretStore.lock(); }, "密钥仓已锁定。");
    return;
  }
  if (action === "delete-api-key") {
    if (window.confirm("从本机加密密钥仓删除 API Key？")) {
      void runAction(async () => { secretStatus = await secretStore.removeApiKey(); }, "API Key 已删除。");
    }
    return;
  }
  if (action === "test-model") {
    void runAction(async () => {
      const result = await compatibleGateway.testConnection(modelSettings);
      setNotice(`连接成功：${result.endpoint} · ${result.elapsedMs} ms`, "success");
    });
    return;
  }
  if (action === "import-preset") {
    void runAction(importPresetFile, "预设已验证并导入；未知字段已保留。");
    return;
  }
  if (action === "restore-preset") {
    void runAction(() => kernel.restoreEmbeddedPreset(), "已恢复应用内置的 A.U.T.O v2.0 资源。");
    return;
  }
  if (action === "save-preferences") {
    const project = currentProject();
    void runAction(() => kernel.updateProject({
      name: project.name,
      brief: project.brief,
      characterName: project.output.characterName,
      worldbookName: project.output.worldbookName,
      preferences: {
        aiRole: elementValue("pref-ai-role"),
        creatorRole: elementValue("pref-creator-role"),
        wordCount: elementValue("pref-word-count"),
        language: elementValue("pref-language"),
        person: elementValue("pref-person"),
      },
    }), "提示偏好已保存。");
    return;
  }
  if (action === "delivery-select-accepted") {
    deliveryKeys = new Set(defaultDeliveryKeys(currentProject()));
    deliverySelectionCustomized = true;
    render();
    return;
  }
  if (action === "delivery-select-all") {
    deliveryKeys = new Set(collectDeliveryArtifacts(currentProject()).map((item) => item.key));
    deliverySelectionCustomized = true;
    render();
    return;
  }
  if (action === "delivery-select-none") {
    deliveryKeys.clear();
    deliverySelectionCustomized = true;
    render();
    return;
  }
  if (action === "export-card") {
    void runAction(exportCard);
  }
});

async function bootstrap(): Promise<void> {
  try {
    modelSettings = await settingsRepository.loadModelSettings().catch(() => ({ ...DEFAULT_MODEL_SETTINGS }));
    snapshot = await kernel.open();
    deliveryKeys = new Set(defaultDeliveryKeys(currentProject()));
    lastDeliveryProjectId = currentProject().id;
    render();
  } catch (error) {
    if (!(error instanceof WorkspaceRecoveryRequiredError)) {
      app.innerHTML = `<div class="fatal-screen"><span>!</span><h1>无法打开本地工作区</h1><p>${escapeHtml((error as Error).message)}</p></div>`;
      return;
    }
    app.innerHTML = `<div class="fatal-screen recovery-screen">
      <span>↺</span><h1>检测到可恢复备份</h1>
      <p>当前主工程无法验证。可恢复到 revision ${error.backupRevision}；损坏主档不会被当作空项目覆盖。</p>
      <button class="primary-button" id="recover-workspace">恢复上一份有效备份</button>
    </div>`;
    document.querySelector("#recover-workspace")?.addEventListener("click", () => {
      void kernel.recoverWorkspace().then((value) => {
        snapshot = value;
        setNotice(`已恢复 revision ${value.revision}。`, "success");
        render();
      }, (recoveryError) => {
        app.innerHTML = `<div class="fatal-screen"><span>!</span><h1>备份恢复失败</h1><p>${escapeHtml((recoveryError as Error).message)}</p></div>`;
      });
    });
  }
}

void bootstrap();
mobileLayoutQuery.addEventListener("change", () => render());

// 浏览器预览没有文件系统密钥仓；保留类型引用可帮助打包阶段发现错误适配器。
void (filePort instanceof BrowserProjectFilePort);
void AUTO_WORKFLOW_SOURCE;
