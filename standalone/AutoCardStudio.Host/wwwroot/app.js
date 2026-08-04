const PHASES = [
  { id: 'concept', label: '概念设计层', range: [1, 3] },
  { id: 'entity', label: '实体内容设计层', range: [4, 9] },
  { id: 'state-machine', label: '状态机设计层', range: [10, 12] },
  { id: 'writing', label: '描写设计层', range: [13, 15] },
  { id: 'variables', label: '变量设计层', range: [16, 21] },
  { id: 'summary', label: '汇总层', range: [22, 22] },
  { id: 'output', label: '输出设计层', range: [23, 24] },
  { id: 'autotask', label: 'AUTOTASK 配置', range: [25, 28] },
  { id: 'delivery', label: '启动与交付', range: [29, 29] },
];

const STEP_SOURCE = [
  ['交互范式和美学纲领', '确定角色卡允许什么、拒绝什么，以及这段体验最终要呈现怎样的审美质感。', '先定下这段体验的方向'],
  ['实现机制', '把核心体验拆成可被剧情持续执行的机制与切面。', '找出体验持续发生的办法'],
  ['弧光识别', '识别人物、关系、组织或世界状态从起点到终点的变化轨迹。', '画出变化发生的轨迹'],
  ['世界蓝图', '搭建世界的身份、支柱、边界与整体运行轮廓。', '搭起世界能够运行的骨架'],
  ['主要角色', '建立主要角色的原点、画像、当前状态与核心张力。', '让主要角色真正站到台前'],
  ['关系图谱', '定义角色与世界实体之间可推动叙事的关系网络。', '建立可导航的树状目录'],
  ['生成规则', '为可重复生成的角色、地点、事件或细节建立一致的推演规则。', '规定新内容怎样被生成'],
  ['具体实例', '把生成规则落成世界中真实存在的实体、地点、组织与概念。', '用具体实例检验规则'],
  ['世界知识', '补充能让叙事有据可依、可被角色实际使用的背景知识。', '补齐角色真正用得上的知识'],
  ['空间规划设计', '规划世界内容如何分层、分区，并明确各部分之间的边界。', '规划需要哪些状态机'],
  ['情节图谱', '把关键事件、条件、分支和回路组织为可游玩的情节网络。', '设计单个状态机的拓扑'],
  ['维度内容', '逐一填充空间规划中的叙事维度，让它们能够独立运作。', '逐一填充每个叙事维度'],
  ['叙事指南核心', '确定叙事者的身份、态度、镜头与处理场景的核心方法。', '确定叙事者怎样观察世界'],
  ['语料库', '建立符合角色与世界气质的措辞、意象、句式和表达素材。', '设计特殊而稳定的语言模式'],
  ['场景策略集', '为高频或关键场景准备可复用、可变化的描写策略。', '为关键场景准备写法'],
  ['数据盘点', '识别哪些叙事信息需要成为变量，哪些应继续留在静态设定中。', '决定哪些信息需要被持续记录'],
  ['变量体系规划', '规划变量簇、层级、职责和相互依赖关系。', '给变量分组并划清职责'],
  ['具体变量设计', '为每个变量定义类型、初值、范围、联动与展示引用。', '把每一个变量定义清楚'],
  ['变量汇总与路由', '汇总变量结构，并规定剧情变化如何被路由到对应变量。', '让剧情变化准确流向变量'],
  ['条件显示配置', '定义哪些变量状态会触发哪些世界书内容。', '规定内容在什么条件下出现'],
  ['条件展示内容', '编写由变量条件唤起的具体知识、场景与实例内容。', '编写条件触发后的实际内容'],
  ['世界根目录', '建立运行时索引，让模型能找到庞大世界书中的正确内容。', '建立世界书的运行时导航'],
  ['设计状态栏', '设计与体验一致的状态栏界面、数据区和正则捕获方式。', '设计玩家一眼能读懂的状态栏'],
  ['设计回复格式', '规定正文、摘要、选项、变量更新与状态栏的最终输出结构。', '规定模型每轮回复的装配顺序'],
  ['副AI任务清单', '识别适合交给副 AI 独立执行的任务与触发时机。', '挑出适合交给副 AI 的工作'],
  ['世界书提示词', '为副 AI 编写读取和维护世界书内容的任务提示词。', '教副 AI 怎样维护世界知识'],
  ['变量提示词', '编写遵循 MVU 语法的变量更新任务提示词。', '教副 AI 安全地更新变量'],
  ['配置与条目设计', '规划最终世界书条目、激活策略、位置与读取关系。', '把设计成果装进正确的条目'],
  ['开场白和变量初始值', '用已完成的世界设定生成正式开场，并给出完整变量初始树。', '用开场把整个世界启动起来'],
];

const REQUIRED = new Set([1, 4, 5, 13, 24, 29]);
const RECOMMENDED = new Set([2, 6, 7, 8, 9, 15]);
const STEPS = STEP_SOURCE.map(([name, goal, guideTitle], index) => ({
  number: index + 1,
  name,
  goal,
  guideTitle,
  phase: PHASES.find(phase => index + 1 >= phase.range[0] && index + 1 <= phase.range[1]).id,
  requirement: REQUIRED.has(index + 1) ? '必做' : RECOMMENDED.has(index + 1) ? '建议' : '复杂卡',
}));

const state = {
  index: null,
  project: null,
  step: null,
  resources: null,
  connections: null,
  artifacts: { revision: 1, groups: [] },
  publication: null,
  publicationProjectId: '',
  publicationSelectedVersionIds: new Set(),
  referenceWorldbooks: { libraryRevision: 1, projectRevision: 1, books: [], projectBooks: {} },
  saveChain: Promise.resolve(),
  pendingPatch: {},
  generating: false,
  generationId: '',
  generationConversationId: '',
  generationRetryTurnId: '',
  generationUserCommitted: false,
  optimisticTurnId: '',
  conversationRenameId: '',
  promptPreview: null,
  artifactScope: 'all',
  artifactQuery: '',
  referenceManagerBookId: '',
  referenceManagerEntryId: '',
  maintenance: null,
  previewTurnIds: new Set(),
  resourceEditor: null,
  resourceKind: 'prompts',
  resourceEditingPromptId: '',
  collapsedPhases: new Set(JSON.parse(localStorage.getItem('acs:collapsed-phases') || '[]')),
};

let conversationScrollContextKey = '';
let conversationAutoFollow = true;
let conversationLastScrollTop = 0;
let conversationScrollSyncing = false;

const elements = Object.fromEntries([
  'app', 'service-status', 'reload-button', 'maintenance-button', 'mobile-inspector-button', 'mobile-panel-scrim', 'close-button', 'left-splitter', 'right-splitter', 'project-menu-button', 'project-button-name',
  'progress-copy', 'step-rail', 'new-project-button', 'project-menu', 'project-menu-close', 'project-list',
  'step-number', 'step-title', 'step-goal', 'requirement-chip', 'station-label', 'guide-title',
  'guide-description', 'guide-prompts', 'brief-label', 'project-brief', 'save-status', 'project-name',
  'empty-state', 'turn-list', 'user-input', 'generation-hint', 'generate-button', 'stop-generation',
  'conversation-manager-toggle', 'active-conversation-name', 'conversation-count', 'conversation-menu',
  'conversation-menu-count', 'conversation-list', 'new-conversation-name', 'create-conversation',
  'clear-conversation', 'conversation-nav', 'previous-turn-top', 'latest-turn-bottom',
  'preset-summary', 'regex-summary', 'import-preset-button', 'import-regex-button', 'preset-file', 'regex-file',
  'open-resource-manager', 'resource-drawer', 'close-resource-manager', 'resource-entry-list',
  'resource-editor-modal', 'resource-editor-title', 'resource-editor-content', 'close-resource-editor',
  'cancel-resource-editor', 'save-resource-editor',
  'connection-profile', 'connection-name', 'connection-provider', 'connection-url', 'connection-key',
  'connection-model', 'connection-output', 'connection-timeout', 'parameter-context', 'parameter-completion',
  'parameter-temperature', 'parameter-top-p', 'connection-secret-state', 'model-options', 'fetch-models',
  'save-connection', 'delete-connection',
  'conversation-font-value', 'conversation-font-size', 'conversation-font-decrease', 'conversation-font-increase',
  'future-artifacts-toggle', 'artifact-count', 'artifact-list', 'artifact-search', 'create-artifact',
  'manual-artifact-modal', 'manual-artifact-step', 'manual-artifact-name', 'manual-artifact-content',
  'close-manual-artifact', 'cancel-manual-artifact', 'save-manual-artifact',
  'reference-worldbook-summary', 'reference-worldbook-list', 'import-worldbook-button', 'worldbook-file',
  'reference-manager-modal', 'reference-manager-title', 'reference-manager-search', 'reference-manager-count',
  'reference-manager-entries', 'reference-manager-content', 'close-reference-manager',
  'maintenance-summary', 'maintenance-health', 'open-maintenance', 'maintenance-modal', 'maintenance-location',
  'close-maintenance', 'diagnosis-status', 'diagnosis-projects', 'diagnosis-files', 'diagnosis-size',
  'diagnosis-detail', 'refresh-maintenance', 'create-backup', 'backup-list', 'clear-workspace',
  'export-project', 'import-project', 'project-import-file',
  'publication-cache-status', 'publication-character-name', 'publication-worldbook-name',
  'publication-creator', 'publication-language', 'publication-person', 'publication-avatar',
  'publication-avatar-name', 'publication-selection-count', 'publication-select-all',
  'publication-select-none', 'publication-choice-list', 'publication-output-regex',
  'publication-build-status', 'publication-build',
  'prompt-preview-button', 'prompt-preview-modal', 'prompt-preview-title', 'prompt-preview-summary',
  'prompt-preview-list', 'copy-prompt-preview', 'close-prompt-preview',
  'modal-backdrop', 'confirm-modal', 'confirm-title', 'confirm-message', 'confirm-cancel', 'confirm-accept', 'toast-region',
].map(id => [id.replaceAll('-', '_'), document.getElementById(id)]));

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json', ...(options.headers || {}) } : options.headers,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `本地服务返回 ${response.status}`);
    error.code = payload.code;
    error.status = response.status;
    throw error;
  }
  return payload;
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let amount = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && amount >= 1024; index += 1) {
    amount /= 1024;
    unit = units[index];
  }
  return `${amount >= 10 ? amount.toFixed(0) : amount.toFixed(1)} ${unit}`;
}

const PANEL_WIDTH_KEYS = { left: 'acs:rail-width', right: 'acs:inspector-width' };

function defaultPanelWidths() {
  return window.innerWidth <= 1150 ? { left: 240, right: 300 } : { left: 300, right: 360 };
}

function normalizedPanelWidths(left, right) {
  const total = elements.left_splitter.parentElement.clientWidth || window.innerWidth;
  const compact = total <= 1150;
  const minimumCenter = compact ? 320 : 420;
  const minimumLeft = compact ? 190 : 220;
  const minimumRight = compact ? 230 : 280;
  const maximumLeft = Math.min(500, total - minimumCenter - minimumRight);
  const nextLeft = Math.max(minimumLeft, Math.min(maximumLeft, Number(left) || defaultPanelWidths().left));
  const maximumRight = Math.min(620, total - minimumCenter - nextLeft);
  const nextRight = Math.max(minimumRight, Math.min(maximumRight, Number(right) || defaultPanelWidths().right));
  return { left: Math.round(nextLeft), right: Math.round(nextRight) };
}

function applyPanelWidths(left, right, persist = false) {
  if (window.innerWidth <= 820) return;
  const widths = normalizedPanelWidths(left, right);
  const workspace = elements.left_splitter.parentElement;
  workspace.style.setProperty('--rail-width', `${widths.left}px`);
  workspace.style.setProperty('--inspector-width', `${widths.right}px`);
  elements.left_splitter.setAttribute('aria-valuenow', String(widths.left));
  elements.right_splitter.setAttribute('aria-valuenow', String(widths.right));
  if (persist) {
    localStorage.setItem(PANEL_WIDTH_KEYS.left, String(widths.left));
    localStorage.setItem(PANEL_WIDTH_KEYS.right, String(widths.right));
  }
  return widths;
}

function currentPanelWidths() {
  const styles = getComputedStyle(elements.left_splitter.parentElement);
  return {
    left: parseFloat(styles.getPropertyValue('--rail-width')) || defaultPanelWidths().left,
    right: parseFloat(styles.getPropertyValue('--inspector-width')) || defaultPanelWidths().right,
  };
}

function resetPanelWidths() {
  localStorage.removeItem(PANEL_WIDTH_KEYS.left);
  localStorage.removeItem(PANEL_WIDTH_KEYS.right);
  const defaults = defaultPanelWidths();
  applyPanelWidths(defaults.left, defaults.right, false);
}

function initializePanelSplitter(splitter, side) {
  splitter.setAttribute('aria-valuemin', side === 'left' ? '190' : '230');
  splitter.setAttribute('aria-valuemax', side === 'left' ? '500' : '620');
  splitter.addEventListener('pointerdown', event => {
    if (window.innerWidth <= 820) return;
    event.preventDefault();
    splitter.setPointerCapture(event.pointerId);
    splitter.classList.add('is-dragging');
    document.body.classList.add('is-resizing-panels');
  });
  splitter.addEventListener('pointermove', event => {
    if (!splitter.hasPointerCapture(event.pointerId)) return;
    const rect = splitter.parentElement.getBoundingClientRect();
    const widths = currentPanelWidths();
    if (side === 'left') applyPanelWidths(event.clientX - rect.left, widths.right, false);
    else applyPanelWidths(widths.left, rect.right - event.clientX, false);
  });
  const finish = event => {
    if (!splitter.hasPointerCapture(event.pointerId)) return;
    splitter.releasePointerCapture(event.pointerId);
    splitter.classList.remove('is-dragging');
    document.body.classList.remove('is-resizing-panels');
    const widths = currentPanelWidths();
    applyPanelWidths(widths.left, widths.right, true);
  };
  splitter.addEventListener('pointerup', finish);
  splitter.addEventListener('pointercancel', finish);
  splitter.addEventListener('dblclick', resetPanelWidths);
  splitter.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') { resetPanelWidths(); return; }
    const widths = currentPanelWidths();
    const movement = event.key === 'ArrowRight' ? 10 : -10;
    if (side === 'left') applyPanelWidths(widths.left + movement, widths.right, true);
    else applyPanelWidths(widths.left, widths.right - movement, true);
  });
}

function initializePanelLayout() {
  initializePanelSplitter(elements.left_splitter, 'left');
  initializePanelSplitter(elements.right_splitter, 'right');
  const defaults = defaultPanelWidths();
  applyPanelWidths(localStorage.getItem(PANEL_WIDTH_KEYS.left) || defaults.left, localStorage.getItem(PANEL_WIDTH_KEYS.right) || defaults.right);
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth <= 820) return;
      setMobileInspectorOpen(false);
      const widths = currentPanelWidths();
      applyPanelWidths(widths.left, widths.right, false);
    }, 80);
  });
}

function setMobileInspectorOpen(open) {
  const inspector = document.querySelector('.inspector');
  inspector.classList.toggle('is-mobile-open', open);
  elements.mobile_panel_scrim.hidden = !open;
  elements.mobile_inspector_button.setAttribute('aria-expanded', String(open));
}

function toggleMobileInspector() {
  const inspector = document.querySelector('.inspector');
  setMobileInspectorOpen(!inspector.classList.contains('is-mobile-open'));
}

async function loadState(projectId = '') {
  setSaveStatus('正在读取本地资料…', 'is-saving');
  const [payload, resources, connections] = await Promise.all([
    api(`/api/state${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
    api('/api/resources'),
    api('/api/connections'),
  ]);
  applyState(payload);
  state.resources = resources;
  state.connections = connections;
  await loadPublicationState();
  renderResourceSettings();
  renderConnectionSettings();
  renderGenerationAvailability();
  setSaveStatus('所有更改已保存', 'is-saved');
}

function applyState(payload) {
  state.index = payload.index;
  state.project = payload.project;
  state.step = payload.step;
  if (payload.artifacts) state.artifacts = payload.artifacts;
  if (payload.referenceWorldbooks) state.referenceWorldbooks = payload.referenceWorldbooks;
  renderAll();
}

function renderAll() {
  elements.project_button_name.textContent = state.project.name;
  // 保存请求返回时，保留用户仍在输入但尚未提交的新值。
  elements.project_name.value = state.pendingPatch.name ?? state.project.name;
  elements.project_brief.value = state.pendingPatch.brief ?? state.project.brief ?? '';
  elements.progress_copy.textContent = '0 / 29';
  renderSteps();
  renderCurrentStep();
  renderProjectList();
  renderArtifacts();
  renderReferenceWorldbooks();
  renderPublicationChoices();
  renderGenerationAvailability();
}

function renderSteps() {
  elements.step_rail.replaceChildren(...PHASES.map(phase => {
    const section = document.createElement('section');
    section.className = `phase${state.collapsedPhases.has(phase.id) ? ' is-collapsed' : ''}`;
    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'phase-header';
    header.innerHTML = `<strong>${escapeHtml(phase.label)}</strong><span>${phase.range[1] - phase.range[0] + 1} 步</span>`;
    header.addEventListener('click', () => togglePhase(phase.id));
    const steps = document.createElement('div');
    steps.className = 'phase-steps';
    STEPS.filter(step => step.phase === phase.id).forEach(step => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `step-button${step.number === state.project.currentStep ? ' is-active' : ''}`;
      button.innerHTML = `<span class="step-index">${String(step.number).padStart(2, '0')}</span><span class="step-name">${escapeHtml(step.name)}</span><span class="step-badge">${step.requirement}</span>`;
      button.addEventListener('click', () => selectStep(step.number));
      steps.append(button);
    });
    section.append(header, steps);
    return section;
  }));
}

function renderCurrentStep() {
  const step = STEPS[state.project.currentStep - 1];
  const conversation = activeConversation();
  const scrollContextKey = `${state.project.id}:${step.number}:${conversation.id}`;
  const contextChanged = scrollContextKey !== conversationScrollContextKey;
  if (contextChanged) {
    conversationScrollContextKey = scrollContextKey;
    conversationAutoFollow = true;
  }
  const scroller = document.querySelector('.conversation');
  const preservedScrollTop = scroller?.scrollTop || 0;
  const shouldFollowBottom = conversationAutoFollow;
  conversationScrollSyncing = true;
  elements.step_number.textContent = String(step.number).padStart(2, '0');
  elements.step_title.textContent = step.name;
  elements.step_goal.textContent = step.goal;
  elements.requirement_chip.textContent = step.requirement;
  elements.station_label.textContent = `STATION ${String(step.number).padStart(2, '0')} · 创作航标`;
  elements.guide_title.textContent = step.guideTitle;
  elements.guide_description.textContent = step.goal;
  elements.brief_label.textContent = `本轮补充 · ${step.name}`;
  const includesFuture = state.project.includeFutureArtifacts === true;
  elements.future_artifacts_toggle.textContent = includesFuture ? '包含后序' : '不含后序';
  elements.future_artifacts_toggle.setAttribute('aria-pressed', String(includesFuture));
  elements.future_artifacts_toggle.title = includesFuture
    ? '当前会发送本步骤之后已开启的正式产物；点击关闭'
    : '当前只发送本步骤及之前已开启的正式产物；点击开启';
  const prompts = [
    `这一步最需要确定的核心边界是什么？`,
    `哪些已有设计必须在“${step.name}”中保持一致？`,
  ];
  elements.guide_prompts.replaceChildren(...prompts.map(text => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
  renderConversationManager();
  renderTurns();
  elements.clear_conversation.disabled = state.generating || conversation.turns.length === 0;
  elements.clear_conversation.title = conversation.turns.length ? `清空“${conversation.name}”` : '当前对话没有消息';
  elements.conversation_nav.hidden = conversation.turns.length === 0;
  requestAnimationFrame(() => {
    if (!scroller) { conversationScrollSyncing = false; return; }
    if (shouldFollowBottom) scrollConversationToBottom({ force: true });
    else scroller.scrollTop = Math.min(preservedScrollTop, Math.max(0, scroller.scrollHeight - scroller.clientHeight));
    conversationLastScrollTop = scroller.scrollTop;
    conversationAutoFollow = shouldFollowBottom;
    conversationScrollSyncing = false;
  });
}

function renderTurns(streamText = null) {
  const storedTurns = activeConversation().turns || [];
  const retryIndex = state.generationRetryTurnId
    ? storedTurns.findIndex(turn => turn.id === state.generationRetryTurnId)
    : -1;
  const turns = retryIndex >= 0 ? storedTurns.slice(0, retryIndex + 1) : storedTurns;
  elements.empty_state.hidden = turns.length > 0 || streamText !== null;
  let latestUserId = '';
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    if (turns[index].role === 'user') { latestUserId = turns[index].id; break; }
  }
  const items = turns.map(turn => createTurnElement(turn, false, turn.id === latestUserId));
  if (streamText !== null) {
    items.push(createTurnElement({ id: 'stream-draft', role: 'assistant', content: streamText, state: 'streaming' }, true));
  }
  elements.turn_list.replaceChildren(...items);
}

function createTurnElement(turn, streaming = false, isLatestUser = false) {
  const article = document.createElement('article');
  article.className = `turn${streaming ? ' is-streaming' : ''}`;
  article.dataset.role = turn.role === 'assistant' ? 'assistant' : 'user';
  if (turn.id) article.dataset.turnId = turn.id;
  const header = document.createElement('div');
  header.className = 'turn-header';
  const label = document.createElement('span');
  label.className = 'turn-meta';
  label.textContent = turn.role === 'assistant' ? 'A.U.T.O.' : '你';
  const actions = document.createElement('span');
  actions.className = 'turn-actions';
  const htmlPreview = !streaming && turn.role === 'assistant' ? extractHtmlPreview(turn.content) : '';
  if (!streaming) {
    const edit = turnAction('✎', '编辑这条消息', () => beginTurnEdit(turn.id));
    edit.disabled = state.generating;
    actions.append(edit);
    if (htmlPreview) {
      const previewing = state.previewTurnIds.has(turn.id);
      const preview = turnAction(previewing ? '源码' : '预览', previewing ? '返回消息源码' : '在安全沙箱中预览 HTML', () => {
        if (previewing) state.previewTurnIds.delete(turn.id);
        else state.previewTurnIds.add(turn.id);
        renderTurns();
      });
      actions.append(preview);
    }
    if (turn.role === 'assistant') {
      const capture = turnAction('＋ 产物', '从这条 AI 回复加入正式产物', () => captureTurnArtifacts(turn));
      capture.disabled = state.generating;
      actions.append(capture);
    }
    if (isLatestUser) {
      const retry = turnAction('↻ 重试', '重新生成这条输入', () => retryLatestUserInput(turn.id));
      retry.disabled = state.generating;
      actions.append(retry);
    }
    const remove = turnAction('⌫', turn.role === 'assistant' ? '删除这条 AI 回复' : '删除这条用户消息', () => deleteConversationTurn(turn));
    remove.classList.add('is-delete');
    remove.disabled = state.generating;
    actions.append(remove);
  }
  header.append(label, actions);
  const content = document.createElement('div');
  content.className = 'turn-content';
  if (htmlPreview && state.previewTurnIds.has(turn.id)) {
    article.classList.add('is-html-preview');
    content.classList.add('is-previewing');
    const frame = document.createElement('iframe');
    frame.className = 'turn-preview-frame';
    frame.title = 'HTML 安全预览';
    frame.setAttribute('sandbox', '');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.srcdoc = sanitizeHtmlPreview(htmlPreview);
    content.append(frame);
  } else {
    content.textContent = turn.content || (streaming ? '正在连接模型…' : '');
  }
  article.append(header, content);
  return article;
}

function extractHtmlPreview(content) {
  const source = String(content || '');
  const htmlFence = /```(?:html|htm)\s*([\s\S]*?)```/i.exec(source);
  if (htmlFence) {
    const styles = [...source.matchAll(/```css\s*([\s\S]*?)```/gi)].map(match => match[1]).join('\n');
    return styles ? `<style>${styles}</style>\n${htmlFence[1]}` : htmlFence[1];
  }
  const start = source.search(/<!doctype\s+html|<html\b|<body\b/i);
  return start >= 0 ? source.slice(start) : '';
}

function sanitizeHtmlPreview(source) {
  const parsed = new DOMParser().parseFromString(source, 'text/html');
  parsed.querySelectorAll('script, iframe, object, embed, link, base, meta[http-equiv], frame, frameset').forEach(node => node.remove());
  parsed.querySelectorAll('*').forEach(node => {
    for (const attribute of [...node.attributes]) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || ['src', 'srcset', 'href', 'action', 'formaction', 'ping'].includes(name)) node.removeAttribute(attribute.name);
      if (name === 'style') node.setAttribute('style', sanitizePreviewCss(attribute.value));
    }
  });
  parsed.querySelectorAll('style').forEach(style => { style.textContent = sanitizePreviewCss(style.textContent || ''); });
  const policy = parsed.createElement('meta');
  policy.setAttribute('http-equiv', 'Content-Security-Policy');
  policy.setAttribute('content', "default-src 'none'; style-src 'unsafe-inline'; img-src data: blob:; font-src 'none'; connect-src 'none'; media-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'");
  parsed.head.prepend(policy);
  return `<!doctype html>${parsed.documentElement.outerHTML}`;
}

function sanitizePreviewCss(source) {
  return String(source || '')
    .replace(/@import[\s\S]*?(?:;|$)/gi, '')
    .replace(/url\s*\(\s*(['"]?)(?!data:|blob:)[\s\S]*?\1\s*\)/gi, 'none');
}

function turnAction(label, title, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'turn-action';
  button.textContent = label;
  button.title = title;
  button.setAttribute('aria-label', title);
  button.addEventListener('click', action);
  return button;
}

async function captureTurnArtifacts(turn) {
  if (state.generating || turn.role !== 'assistant') return;
  try {
    const result = await api(`/api/projects/${encodeURIComponent(state.project.id)}/artifacts/capture`, {
      method: 'POST',
      body: JSON.stringify({
        expectedRevision: state.artifacts.revision,
        step: state.project.currentStep,
        content: turn.content,
      }),
    });
    state.artifacts = result.state;
    renderArtifacts();
    if (result.added > 0) toast(`已加入 ${result.added} 项正式产物。`);
    else if (result.reused > 0) toast(`内容已存在，已选中对应的 ${result.reused} 项产物版本。`);
    else toast('这条回复中没有识别到当前步骤规定的正式产物。', true);
  } catch (error) {
    toast(error.message, true);
    if (error.code === 'artifact_revision_conflict') await refreshArtifacts().catch(() => {});
  }
}

function activeConversation(step = state.step) {
  const conversations = step?.conversations || [];
  return conversations.find(item => item.id === step.activeConversationId) || conversations[0] || { id: '', name: '默认对话', turns: [] };
}

function replaceActiveConversation(updatedConversation) {
  state.step.conversations = state.step.conversations.map(item => item.id === updatedConversation.id ? updatedConversation : item);
}

function nextConversationName() {
  const numbers = (state.step?.conversations || [])
    .map(item => /^对话\s*(\d+)$/.exec(String(item.name || '').trim()))
    .filter(Boolean)
    .map(match => Number(match[1]))
    .filter(Number.isFinite);
  return `对话 ${Math.max(1, ...numbers) + 1}`;
}

function setConversationMenuOpen(open) {
  elements.conversation_menu.hidden = !open;
  elements.conversation_manager_toggle.setAttribute('aria-expanded', String(open));
  if (!open) state.conversationRenameId = '';
}

function renderConversationManager() {
  const current = activeConversation();
  const conversations = state.step?.conversations || [];
  elements.active_conversation_name.textContent = current.name;
  elements.conversation_count.textContent = String(conversations.length);
  elements.conversation_menu_count.textContent = `${conversations.length} 个`;
  elements.conversation_manager_toggle.title = `本步骤对话：${current.name}（共 ${conversations.length} 个）`;
  elements.new_conversation_name.placeholder = nextConversationName();
  elements.new_conversation_name.disabled = state.generating;
  elements.create_conversation.disabled = state.generating;
  elements.conversation_list.replaceChildren(...conversations.map(conversation => {
    const row = document.createElement('div');
    row.className = `conversation-row${conversation.id === current.id ? ' is-active' : ''}`;
    if (state.conversationRenameId === conversation.id) {
      const form = document.createElement('div');
      form.className = 'conversation-rename-form';
      const input = document.createElement('input');
      input.value = conversation.name;
      input.maxLength = 60;
      input.setAttribute('aria-label', '对话名称');
      const save = document.createElement('button');
      save.type = 'button';
      save.textContent = '保存';
      save.addEventListener('click', () => renameConversation(conversation.id, input.value));
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = '取消';
      cancel.addEventListener('click', () => { state.conversationRenameId = ''; renderConversationManager(); });
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter') { event.preventDefault(); renameConversation(conversation.id, input.value); }
        if (event.key === 'Escape') { state.conversationRenameId = ''; renderConversationManager(); }
      });
      form.append(input, save, cancel);
      row.append(form);
      requestAnimationFrame(() => { input.focus(); input.select(); });
      return row;
    }
    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'conversation-switch';
    select.disabled = state.generating || conversation.id === current.id;
    select.innerHTML = `<strong>${escapeHtml(conversation.name)}</strong><small>${conversation.turns.length} 条消息 · ${formatTime(conversation.updatedAt)}</small>`;
    select.addEventListener('click', () => activateConversation(conversation.id));
    const rename = document.createElement('button');
    rename.type = 'button';
    rename.className = 'conversation-row-action';
    rename.textContent = '✎';
    rename.title = '重命名';
    rename.disabled = state.generating;
    rename.addEventListener('click', () => { state.conversationRenameId = conversation.id; renderConversationManager(); });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'conversation-row-action is-delete';
    remove.textContent = '⌫';
    remove.disabled = state.generating || conversations.length <= 1;
    remove.title = conversations.length <= 1 ? '最后一个对话不能删除' : '删除对话';
    remove.addEventListener('click', () => deleteConversation(conversation));
    row.append(select, rename, remove);
    return row;
  }));
}

function stepApiPath(conversationId = '') {
  const base = `/api/projects/${encodeURIComponent(state.project.id)}/steps/${state.project.currentStep}/conversations`;
  return conversationId ? `${base}/${encodeURIComponent(conversationId)}` : base;
}

async function applyStepMutation(request, successMessage = '') {
  try {
    state.step = await request();
    state.conversationRenameId = '';
    renderCurrentStep();
    if (successMessage) toast(successMessage);
    return true;
  } catch (error) {
    toast(error.message, true);
    if (error.code === 'step_revision_conflict') await loadState(state.project.id).catch(() => {});
    return false;
  }
}

async function createConversation() {
  if (state.generating) return;
  const name = elements.new_conversation_name.value.trim() || nextConversationName();
  const succeeded = await applyStepMutation(() => api(stepApiPath(), {
    method: 'POST',
    body: JSON.stringify({ expectedRevision: state.step.revision, name }),
  }), `已创建并切换到“${name}”。`);
  if (succeeded) {
    elements.new_conversation_name.value = '';
    setConversationMenuOpen(false);
    elements.user_input.focus();
  }
}

async function activateConversation(conversationId) {
  if (state.generating || conversationId === state.step.activeConversationId) return;
  const target = state.step.conversations.find(item => item.id === conversationId);
  const succeeded = await applyStepMutation(() => api(`${stepApiPath(conversationId)}/activate`, {
    method: 'POST',
    body: JSON.stringify({ expectedRevision: state.step.revision }),
  }), target ? `已切换到“${target.name}”。` : '对话已切换。');
  if (succeeded) setConversationMenuOpen(false);
}

async function renameConversation(conversationId, requestedName) {
  if (state.generating) return;
  const name = String(requestedName || '').trim();
  if (!name) { toast('对话名称不能为空。', true); return; }
  await applyStepMutation(() => api(stepApiPath(conversationId), {
    method: 'PATCH',
    body: JSON.stringify({ expectedRevision: state.step.revision, name }),
  }), `对话已命名为“${name}”。`);
}

async function deleteConversation(conversation) {
  if (state.generating) return;
  if (!await confirmAction(`删除“${conversation.name}”？`, `将删除其中 ${conversation.turns.length} 条消息。之后建立的正式产物不会受影响。`, '删除对话')) return;
  const succeeded = await applyStepMutation(() => api(`${stepApiPath(conversation.id)}?expectedRevision=${state.step.revision}`, { method: 'DELETE' }), `“${conversation.name}”已删除。`);
  if (succeeded) setConversationMenuOpen(false);
}

async function clearCurrentConversation() {
  if (state.generating) return;
  const conversation = activeConversation();
  if (!conversation.turns.length) return;
  if (!await confirmAction(`清空“${conversation.name}”？`, '只会清空当前对话，本步骤的其他对话都会保留。', '清空对话')) return;
  await applyStepMutation(() => api(`${stepApiPath(conversation.id)}/clear`, {
    method: 'POST',
    body: JSON.stringify({ expectedRevision: state.step.revision }),
  }), `“${conversation.name}”已清空。`);
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '刚刚';
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function renderProjectList() {
  elements.project_list.replaceChildren(...state.index.projects.map(project => {
    const row = document.createElement('div');
    row.className = `project-list-item${project.id === state.project.id ? ' is-active' : ''}`;
    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'project-list-item';
    select.innerHTML = `<span><strong>${escapeHtml(project.name)}</strong><small>当前步骤 ${String(project.currentStep).padStart(2, '0')} · revision ${project.revision}</small></span>`;
    select.addEventListener('click', () => activateProject(project.id));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'project-delete';
    remove.title = '删除项目';
    remove.textContent = '⌫';
    remove.addEventListener('click', event => {
      event.stopPropagation();
      deleteProject(project);
    });
    row.replaceChildren(select, remove);
    return row;
  }));
}

function renderResourceSettings() {
  if (!state.resources) return;
  const preset = state.resources.preset;
  elements.preset_summary.textContent = preset
    ? `${preset.name} · ${preset.promptCount} 个有效条目`
    : '尚未导入 A.U.T.O 预设';
  const regexes = state.resources.regexes;
  elements.regex_summary.textContent = `${regexes.enabled}/${regexes.total} 条正则启用`;
}

function renderConnectionSettings(preferredId = null) {
  if (!state.connections) return;
  const profiles = state.connections.profiles || [];
  const selectedId = preferredId ?? state.connections.activeProfileId ?? '';
  elements.connection_profile.replaceChildren(
    new Option('＋ 新建连接', ''),
    ...profiles.map(item => new Option(item.profile.name, item.profile.id)),
  );
  elements.connection_profile.value = profiles.some(item => item.profile.id === selectedId) ? selectedId : '';
  fillConnectionForm(elements.connection_profile.value);
}

function fillConnectionForm(profileId) {
  const item = (state.connections?.profiles || []).find(candidate => candidate.profile.id === profileId);
  const profile = item?.profile;
  const defaults = state.resources?.preset?.settings || {};
  elements.connection_name.value = profile?.name || '';
  elements.connection_provider.value = profile?.provider || 'openai';
  elements.connection_url.value = profile?.apiUrl || '';
  elements.connection_key.value = '';
  elements.connection_key.placeholder = item?.hasSecret ? '已安全保存；留空保持不变' : '填写后保存到 Windows 凭据管理器';
  elements.connection_model.value = profile?.model || '';
  elements.connection_output.value = profile?.outputMode || 'stream';
  elements.connection_timeout.value = profile?.timeoutSeconds || 180;
  elements.parameter_context.value = profile?.parameters?.maxContextTokens || defaults.maxContextTokens || 2000000;
  elements.parameter_completion.value = numberInputValue(profile?.parameters?.maxCompletionTokens ?? defaults.maxCompletionTokens);
  elements.parameter_temperature.value = numberInputValue(profile?.parameters?.temperature ?? defaults.temperature);
  elements.parameter_top_p.value = numberInputValue(profile?.parameters?.topP ?? defaults.topP);
  elements.connection_secret_state.textContent = item?.hasSecret ? '密钥已保存' : '未保存密钥';
  elements.delete_connection.disabled = !profile;
}

function numberInputValue(value) {
  return Number.isFinite(Number(value)) ? String(value) : '';
}

function optionalNumber(element) {
  return element.value.trim() === '' ? null : Number(element.value);
}

function renderGenerationAvailability() {
  const hasPreset = Boolean(state.resources?.preset);
  const hasConnection = Boolean(state.connections?.profiles?.some(item => item.profile.id === state.connections.activeProfileId));
  elements.generate_button.disabled = state.generating || !hasPreset || !hasConnection;
  elements.generate_button.hidden = state.generating;
  elements.stop_generation.hidden = !state.generating;
  elements.user_input.disabled = state.generating;
  elements.project_brief.disabled = state.generating;
  elements.prompt_preview_button.disabled = state.generating || !hasPreset;
  elements.future_artifacts_toggle.disabled = state.generating;
  elements.clear_conversation.disabled = state.generating || activeConversation().turns.length === 0;
  elements.generation_hint.textContent = state.generating
    ? 'A.U.T.O 正在生成，当前项目与步骤已锁定'
    : !hasPreset
      ? '请先在设置中导入完整 A.U.T.O 预设'
      : !hasConnection
        ? '请先保存一套模型连接'
        : `${activeConnection()?.profile.name || '当前连接'} · ${activeConnection()?.profile.outputMode === 'complete' ? '非流式' : '流式'}`;
}

async function openPromptPreview() {
  if (state.generating || !state.resources?.preset) return;
  try {
    const conversation = activeConversation();
    state.promptPreview = await api('/api/prompt-preview', {
      method: 'POST',
      body: JSON.stringify({
        projectId: state.project.id,
        stepNumber: state.project.currentStep,
        expectedStepRevision: state.step.revision,
        conversationId: conversation.id,
        userInput: elements.user_input.value.trim()
          || `请执行 Step ${state.project.currentStep}「${STEPS[state.project.currentStep - 1].name}」。`,
      }),
    });
    renderPromptPreview();
    elements.modal_backdrop.hidden = false;
    elements.prompt_preview_modal.hidden = false;
    elements.close_prompt_preview.focus();
  } catch (error) {
    toast(error.message, true);
    if (error.code === 'step_revision_conflict') await loadState(state.project.id).catch(() => {});
  }
}

function renderPromptPreview() {
  const preview = state.promptPreview;
  if (!preview) return;
  elements.prompt_preview_title.textContent = `本轮发送内容 · ${preview.conversationName}`;
  elements.prompt_preview_summary.textContent = `${preview.messages.length} 条消息 · 约 ${Number(preview.estimatedTokens).toLocaleString('zh-CN')} tokens`;
  elements.prompt_preview_list.replaceChildren(...preview.messages.map((message, index) => {
    const details = document.createElement('details');
    details.className = 'prompt-preview-item';
    details.open = index === preview.messages.length - 1;
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      elements.prompt_preview_list.querySelectorAll('details[open]').forEach(item => {
        if (item !== details) item.open = false;
      });
    });
    const summary = document.createElement('summary');
    const number = document.createElement('span');
    number.className = 'prompt-preview-index';
    number.textContent = String(message.index).padStart(2, '0');
    const role = document.createElement('span');
    role.className = 'prompt-preview-role';
    role.textContent = message.role.toUpperCase();
    const name = document.createElement('strong');
    name.textContent = message.name;
    const tokens = document.createElement('small');
    tokens.textContent = `≈ ${Number(message.estimatedTokens).toLocaleString('zh-CN')} tokens`;
    const content = document.createElement('pre');
    content.className = 'prompt-preview-content';
    content.textContent = message.content;
    summary.append(number, role, name, tokens);
    details.append(summary, content);
    return details;
  }));
}

function closePromptPreview() {
  elements.prompt_preview_modal.hidden = true;
  elements.modal_backdrop.hidden = true;
}

async function copyPromptPreview() {
  if (!state.promptPreview) return;
  const content = state.promptPreview.messages
    .map(message => `# ${message.index}. ${message.role.toUpperCase()} · ${message.name}\n\n${message.content}`)
    .join('\n\n---\n\n');
  try {
    await navigator.clipboard.writeText(content);
    toast('完整消息队列已复制。');
  } catch {
    toast('浏览器未允许复制，请展开条目后手动复制。', true);
  }
}

function activeConnection() {
  return (state.connections?.profiles || []).find(item => item.profile.id === state.connections.activeProfileId);
}

function applyConversationFontSize(value) {
  const size = Math.max(12, Math.min(20, Number(value) || 15));
  document.documentElement.style.setProperty('--conversation-font-size', `${size}px`);
  elements.conversation_font_size.value = String(size);
  elements.conversation_font_value.textContent = `${size} px`;
  localStorage.setItem('acs:conversation-font-size', String(size));
}

function changeConversationFontSize(delta) {
  applyConversationFontSize(Number(elements.conversation_font_size.value) + delta);
}

async function importResource(file, kind) {
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) { toast('文件超过 20 MB。', true); return; }
  try {
    const path = kind === 'preset' ? '/api/resources/preset' : '/api/resources/regexes';
    state.resources = await api(path, { method: 'POST', body: JSON.stringify({ fileName: file.name, content: await file.text() }) });
    if (!elements.resource_drawer.hidden) state.resourceEditor = await api('/api/resources/editor');
    renderResourceSettings();
    if (!elements.resource_drawer.hidden) renderResourceManager();
    if (kind === 'preset' && !elements.connection_profile.value) fillConnectionForm('');
    renderGenerationAvailability();
    toast(kind === 'preset' ? `已导入“${state.resources.preset.name}”。` : `已导入 ${state.resources.regexes.total} 条正则。`);
  } catch (error) { toast(error.message, true); }
}

async function openResourceManager() {
  if (window.innerWidth <= 820) setMobileInspectorOpen(false);
  elements.modal_backdrop.hidden = false;
  elements.resource_drawer.hidden = false;
  try {
    state.resourceEditor = await api('/api/resources/editor');
    renderResourceManager();
  } catch (error) { toast(error.message, true); }
}

function closeResourceManager() {
  if (!elements.resource_editor_modal.hidden) closeResourceEditor();
  elements.resource_drawer.hidden = true;
  elements.modal_backdrop.hidden = true;
}

function renderResourceManager() {
  document.querySelectorAll('[data-resource-kind]').forEach(button => button.classList.toggle('is-active', button.dataset.resourceKind === state.resourceKind));
  const items = state.resourceKind === 'prompts' ? state.resourceEditor?.prompts || [] : state.resourceEditor?.regexes || [];
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'resource-entry-empty';
    empty.textContent = state.resourceKind === 'prompts'
      ? '预设中没有可单独管理的辅助条目。29 个工作流步骤会固定随对应阶段发送。'
      : '尚未导入正则条目。';
    elements.resource_entry_list.replaceChildren(empty);
    return;
  }
  elements.resource_entry_list.replaceChildren(...items.map(item => {
    const row = document.createElement('div');
    row.className = `resource-entry${state.resourceKind === 'prompts' ? ' is-editable' : ''}`;
    if (state.resourceKind === 'prompts') {
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.setAttribute('aria-label', `查看并编辑预设条目：${item.name}`);
      row.addEventListener('click', () => openResourceEditor(item.id));
      row.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openResourceEditor(item.id); }
      });
    }
    const copy = document.createElement('div');
    copy.className = 'resource-entry-copy';
    const name = state.resourceKind === 'prompts' ? item.name : item.scriptName;
    const meta = state.resourceKind === 'prompts'
      ? `${String(item.role || 'system').toUpperCase()} · 约 ${Math.ceil(String(item.content || '').length / 3.5)} tokens`
      : (item.findRegex || '无查找表达式');
    copy.innerHTML = `<strong>${escapeHtml(name)}</strong><small>${escapeHtml(meta)}</small>`;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    const enabled = state.resourceKind === 'prompts' ? item.enabled !== false : !item.disabled;
    toggle.className = `reference-switch${enabled ? ' is-on' : ''}`;
    toggle.setAttribute('aria-label', enabled ? '条目已启用' : '条目已停用');
    toggle.addEventListener('click', event => {
      event.stopPropagation();
      updateResourceEntry(item, !enabled);
    });
    row.append(copy, toggle);
    return row;
  }));
}

async function updateResourceEntry(item, enabled) {
  try {
    const path = state.resourceKind === 'prompts'
      ? `/api/resources/prompts/${encodeURIComponent(item.id)}`
      : `/api/resources/regexes/${encodeURIComponent(item.id)}`;
    const body = state.resourceKind === 'prompts'
      ? { expectedRevision: state.resourceEditor.revision, name: item.name, role: item.role, content: item.content, enabled }
      : { expectedRevision: state.resourceEditor.revision, name: item.scriptName, findRegex: item.findRegex, replaceString: item.replaceString, enabled };
    state.resourceEditor = await api(path, { method: 'PATCH', body: JSON.stringify(body) });
    state.resources = await api('/api/resources');
    if (state.resourceKind === 'regexes') {
      const projection = await api(`/api/state?projectId=${encodeURIComponent(state.project.id)}`);
      applyState(projection);
    }
    renderResourceSettings();
    renderResourceManager();
    toast(enabled ? '条目已启用。' : '条目已停用。');
  } catch (error) {
    toast(error.message, true);
    if (error.code === 'resource_revision_conflict') {
      state.resourceEditor = await api('/api/resources/editor').catch(() => state.resourceEditor);
      renderResourceManager();
    }
  }
}

function openResourceEditor(promptId) {
  const prompt = state.resourceEditor?.prompts?.find(item => item.id === promptId);
  if (!prompt) return;
  state.resourceEditingPromptId = promptId;
  elements.resource_editor_title.textContent = prompt.name || '未命名预设条目';
  elements.resource_editor_content.value = prompt.content || '';
  elements.resource_editor_modal.hidden = false;
  requestAnimationFrame(() => elements.resource_editor_content.focus({ preventScroll: true }));
}

function closeResourceEditor() {
  state.resourceEditingPromptId = '';
  elements.resource_editor_modal.hidden = true;
  if (elements.resource_drawer.hidden) elements.modal_backdrop.hidden = true;
}

async function saveResourceEditor() {
  const prompt = state.resourceEditor?.prompts?.find(item => item.id === state.resourceEditingPromptId);
  if (!prompt) return;
  elements.save_resource_editor.disabled = true;
  try {
    state.resourceEditor = await api(`/api/resources/prompts/${encodeURIComponent(prompt.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        expectedRevision: state.resourceEditor.revision,
        name: prompt.name,
        role: prompt.role,
        content: elements.resource_editor_content.value,
        enabled: prompt.enabled !== false,
      }),
    });
    closeResourceEditor();
    renderResourceManager();
    toast('预设条目已保存。');
  } catch (error) {
    toast(error.message, true);
    if (error.code === 'resource_revision_conflict') state.resourceEditor = await api('/api/resources/editor').catch(() => state.resourceEditor);
  } finally { elements.save_resource_editor.disabled = false; }
}

const ARTIFACT_CATEGORY_STEPS = {
  story: [1, 2, 3], characters: [5, 6], world: [4, 7, 8, 9],
  narrative: [10, 11, 12, 13, 14, 15], variables: [16, 17, 18, 19, 20, 21, 22],
  production: [23, 24, 25, 26, 27, 28, 29],
};

function selectedArtifactVersion(group) {
  return group.versions.find(version => version.id === group.selectedVersionId) || group.versions.at(-1);
}

function artifactContextIsOn(group, version = selectedArtifactVersion(group)) {
  if (group.contextMode === 'off') return false;
  if (group.contextMode === 'on') return true;
  if (group.step !== state.project.currentStep) return true;
  return !activeConversation().turns.some(turn => String(turn.content || '').includes(version?.content || ''));
}

function artifactMatchesFilter(group) {
  if (state.artifactScope === 'current' && group.step !== state.project.currentStep) return false;
  if (!['all', 'current'].includes(state.artifactScope) && !ARTIFACT_CATEGORY_STEPS[state.artifactScope]?.includes(group.step)) return false;
  const query = state.artifactQuery.trim().toLocaleLowerCase();
  if (!query) return true;
  return `${group.displayName} ${group.identity} step ${group.step} s${String(group.step).padStart(2, '0')}`.toLocaleLowerCase().includes(query);
}

function renderArtifacts() {
  const groups = state.artifacts?.groups || [];
  elements.artifact_count.textContent = `${groups.length} 个产物`;
  document.querySelectorAll('[data-artifact-scope]').forEach(button => button.classList.toggle('is-active', button.dataset.artifactScope === state.artifactScope));
  const filtered = groups.filter(artifactMatchesFilter);
  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'artifact-empty';
    empty.textContent = groups.length ? '没有符合当前筛选条件的产物。' : '生成包含正式标签的阶段草案，或点击“自建产物”后，内容会保存在这里。';
    elements.artifact_list.replaceChildren(empty);
    return;
  }
  elements.artifact_list.replaceChildren(...filtered.map((group, index) => {
    const version = selectedArtifactVersion(group);
    const details = document.createElement('details');
    details.className = 'artifact-card';
    details.open = filtered.length === 1 || index === 0;
    const summary = document.createElement('summary');
    const context = document.createElement('button');
    context.type = 'button';
    context.className = `artifact-context-switch${artifactContextIsOn(group, version) ? ' is-on' : ''}`;
    context.title = group.contextMode === 'auto'
      ? (artifactContextIsOn(group, version) ? '自动开启：会发送当前选中版本' : '自动关闭：当前对话已经包含同一产物')
      : (group.contextMode === 'on' ? '已强制发送；点击关闭' : '已关闭；点击开启');
    context.setAttribute('aria-label', context.title);
    context.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation();
      setArtifactContext(group, artifactContextIsOn(group, version) ? 'off' : 'on');
    });
    const title = document.createElement('span');
    title.className = 'artifact-title';
    const name = document.createElement('strong');
    name.textContent = group.displayName;
    const meta = document.createElement('small');
    meta.textContent = `S${String(group.step).padStart(2, '0')} · ${group.source === 'manual' ? '自建' : group.identity}`;
    title.append(name, meta);
    const label = document.createElement('span');
    label.className = 'artifact-version-label';
    label.textContent = `${group.versions.findIndex(item => item.id === version.id) + 1}/${group.versions.length}`;
    const chevron = document.createElement('span');
    chevron.className = 'artifact-chevron';
    chevron.textContent = '⌄';
    summary.append(context, title, label, chevron);

    const editor = document.createElement('div');
    editor.className = 'artifact-editor';
    const toolbar = document.createElement('div');
    toolbar.className = 'artifact-editor-toolbar';
    const select = document.createElement('select');
    group.versions.forEach((item, versionIndex) => select.append(new Option(`版本 ${versionIndex + 1} · ${new Date(item.createdAt).toLocaleString('zh-CN')}`, item.id)));
    select.value = version.id;
    select.addEventListener('change', () => selectArtifactVersion(group, select.value));
    const copy = document.createElement('button');
    copy.type = 'button'; copy.textContent = '复制';
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(textarea.value); toast('产物正文已复制。'); }
      catch { toast('浏览器未允许复制。', true); }
    });
    const save = document.createElement('button');
    save.type = 'button'; save.textContent = '保存';
    const latest = group.versions.at(-1)?.id === version.id;
    save.disabled = !latest;
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = '删除'; remove.className = 'is-danger';
    remove.addEventListener('click', () => deleteArtifactGroup(group));
    toolbar.append(select, copy, save, remove);
    let nameInput = null;
    if (group.source === 'manual') {
      nameInput = document.createElement('input');
      nameInput.className = 'text-field artifact-name-editor';
      nameInput.value = group.displayName;
      nameInput.maxLength = 100;
      nameInput.readOnly = !latest;
    }
    const textarea = document.createElement('textarea');
    textarea.value = version.content;
    textarea.readOnly = !latest;
    save.addEventListener('click', () => saveArtifactVersion(version.id, textarea.value, nameInput?.value));
    editor.append(toolbar);
    if (nameInput) editor.append(nameInput);
    editor.append(textarea);
    details.append(summary, editor);
    return details;
  }));
}

async function refreshArtifacts() {
  state.artifacts = await api(`/api/projects/${encodeURIComponent(state.project.id)}/artifacts`);
  renderArtifacts();
  await loadPublicationState({ preserveFields: true });
}

async function applyArtifactMutation(operation, successMessage) {
  try {
    state.artifacts = await operation();
    renderArtifacts();
    await loadPublicationState({ preserveFields: true });
    if (successMessage) toast(successMessage);
    return true;
  } catch (error) {
    toast(error.message, true);
    if (error.code === 'artifact_revision_conflict') await refreshArtifacts().catch(() => {});
    return false;
  }
}

async function loadPublicationState({ preserveFields = false } = {}) {
  if (!state.project?.id) return;
  const previous = state.publication;
  const previousIds = new Set(previous?.choices?.map(item => item.versionId) || []);
  const sameProject = state.publicationProjectId === state.project.id;
  const publication = await api(`/api/projects/${encodeURIComponent(state.project.id)}/publication`);
  const nextIds = publication.choices.map(item => item.versionId);
  if (!sameProject || !previous) {
    state.publicationSelectedVersionIds = new Set(nextIds);
  } else {
    state.publicationSelectedVersionIds = new Set(nextIds.filter(id =>
      state.publicationSelectedVersionIds.has(id) || !previousIds.has(id)));
  }
  state.publication = publication;
  state.publicationProjectId = state.project.id;
  if (!preserveFields || !sameProject) {
    elements.publication_character_name.value = publication.settings.characterName;
    elements.publication_worldbook_name.value = publication.settings.worldbookName;
    elements.publication_creator.value = publication.settings.creator;
    elements.publication_language.value = publication.settings.language;
    elements.publication_person.value = publication.settings.person;
    elements.publication_output_regex.checked = publication.settings.includeOutputRegexBundle !== false;
    elements.publication_avatar.value = '';
    elements.publication_avatar_name.textContent = '可选 PNG 头像';
  }
  elements.publication_cache_status.textContent = publication.hasReusableReorgPlan ? '重组方案可复用' : '发布时自动重组';
  renderPublicationChoices();
}

function renderPublicationChoices() {
  if (!elements.publication_choice_list) return;
  const choices = state.publication?.choices || [];
  if (choices.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'publication-choice-empty';
    empty.textContent = '还没有可交付的正式产物。先在步骤中生成产物，或从“产物”页新建一项。';
    elements.publication_choice_list.replaceChildren(empty);
  } else {
    elements.publication_choice_list.replaceChildren(...choices.map(choice => {
      const label = document.createElement('label');
      label.className = 'publication-choice';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = state.publicationSelectedVersionIds.has(choice.versionId);
      input.addEventListener('change', () => {
        if (input.checked) state.publicationSelectedVersionIds.add(choice.versionId);
        else state.publicationSelectedVersionIds.delete(choice.versionId);
        updatePublicationSelection();
      });
      const copy = document.createElement('span');
      copy.className = 'publication-choice-copy';
      const name = document.createElement('strong');
      name.textContent = choice.displayName;
      const destination = document.createElement('small');
      destination.textContent = `写入：${choice.targetName}`;
      copy.append(name, destination);
      const step = document.createElement('span');
      step.className = 'publication-choice-step';
      step.textContent = `S${String(choice.step).padStart(2, '0')}`;
      label.append(input, copy, step);
      return label;
    }));
  }
  updatePublicationSelection();
}

function updatePublicationSelection() {
  const choices = state.publication?.choices || [];
  const selected = choices.filter(item => state.publicationSelectedVersionIds.has(item.versionId));
  elements.publication_selection_count.textContent = `${selected.length} / ${choices.length}`;
  const hasOutputFormat = selected.some(item => item.step === 24 && item.identity === 'SYS_output_format');
  elements.publication_output_regex.disabled = !hasOutputFormat;
  elements.publication_build.disabled = selected.length === 0;
}

function selectPublicationChoices(mode) {
  const choices = state.publication?.choices || [];
  state.publicationSelectedVersionIds = new Set(mode === 'all' ? choices.map(item => item.versionId) : []);
  renderPublicationChoices();
}

async function buildPublicationPackage() {
  if (!state.publication || elements.publication_build.disabled) return;
  const selectedVersionIds = [...state.publicationSelectedVersionIds];
  const characterName = elements.publication_character_name.value.trim();
  const worldbookName = elements.publication_worldbook_name.value.trim();
  if (!characterName || !worldbookName) { toast('请填写角色卡名称和世界书名称。', true); return; }
  const accepted = await confirmAction(
    '创建角色卡交付包？',
    `将用 ${selectedVersionIds.length} 项正式产物创建“${characterName}”。AI 重组不写入普通步骤对话。`,
    '创建 ZIP');
  if (!accepted) return;

  const avatar = elements.publication_avatar.files?.[0];
  if (avatar && avatar.size > 12 * 1024 * 1024) { toast('PNG 头像不能超过 12 MB。', true); return; }
  elements.publication_build.disabled = true;
  elements.publication_build.textContent = '正在创建…';
  elements.publication_build_status.textContent = '正在重组、校验并打包';
  try {
    const avatarPngBase64 = avatar ? await fileAsBase64(avatar) : null;
    const response = await fetch(`/api/projects/${encodeURIComponent(state.project.id)}/publication/build`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedArtifactRevision: state.publication.artifactRevision,
        selectedVersionIds,
        settings: {
          characterName,
          worldbookName,
          creator: elements.publication_creator.value.trim(),
          language: elements.publication_language.value.trim(),
          person: elements.publication_person.value.trim(),
          includeOutputRegexBundle: elements.publication_output_regex.checked,
        },
        avatarPngBase64,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const error = new Error(payload.message || `创建失败（${response.status}）`);
      error.code = payload.code;
      throw error;
    }
    const blob = await response.blob();
    const fileName = responseFileName(response.headers.get('Content-Disposition')) || `${characterName}-角色卡交付.zip`;
    downloadBrowserBlob(blob, fileName);
    const mode = response.headers.get('X-AUTO-Reorg-Mode') || 'unknown';
    const warningCount = Number(response.headers.get('X-AUTO-Warning-Count') || 0);
    elements.publication_build_status.textContent = mode === 'safe-fallback' ? '交付包已创建 · 已安全补齐' : '交付包已创建';
    toast(warningCount > 0 ? `ZIP 已下载；${warningCount} 条发布提示已写入创作档案。` : '角色卡交付 ZIP 已下载。');
    await loadPublicationState({ preserveFields: true });
  } catch (error) {
    elements.publication_build_status.textContent = '创建未完成';
    toast(error.message, true);
    if (error.code === 'artifact_revision_conflict' || error.code === 'publication_stale') await loadPublicationState({ preserveFields: true }).catch(() => {});
  } finally {
    elements.publication_build.textContent = '创建 ZIP';
    updatePublicationSelection();
  }
}

function fileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',').pop() || '');
    reader.onerror = () => reject(new Error('头像文件读取失败。'));
    reader.readAsDataURL(file);
  });
}

function responseFileName(disposition) {
  const encoded = String(disposition || '').match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) try { return decodeURIComponent(encoded); } catch { return encoded; }
  return String(disposition || '').match(/filename="?([^";]+)"?/i)?.[1] || '';
}

function downloadBrowserBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function selectArtifactVersion(group, versionId) {
  return applyArtifactMutation(() => api(`/api/projects/${encodeURIComponent(state.project.id)}/artifacts/${encodeURIComponent(group.key)}/versions/${encodeURIComponent(versionId)}/select`, {
    method: 'POST', body: JSON.stringify({ expectedRevision: state.artifacts.revision }),
  }), '已切换产物版本；后续上下文将使用这个版本。');
}

function setArtifactContext(group, mode) {
  return applyArtifactMutation(() => api(`/api/projects/${encodeURIComponent(state.project.id)}/artifacts/${encodeURIComponent(group.key)}/context`, {
    method: 'PATCH', body: JSON.stringify({ expectedRevision: state.artifacts.revision, mode }),
  }), mode === 'off' ? '该产物已从 AI 上下文关闭。' : '该产物已加入 AI 上下文。');
}

function saveArtifactVersion(versionId, content, name) {
  if (!String(content || '').trim()) { toast('产物正文不能为空。', true); return; }
  return applyArtifactMutation(() => api(`/api/projects/${encodeURIComponent(state.project.id)}/artifacts/versions/${encodeURIComponent(versionId)}`, {
    method: 'PATCH', body: JSON.stringify({ expectedRevision: state.artifacts.revision, content, name: name || null }),
  }), '产物已保存。');
}

async function deleteArtifactGroup(group) {
  if (!await confirmAction('删除整项产物？', `“${group.displayName}”的 ${group.versions.length} 个版本都会移除，对话记录不受影响。`, '删除产物')) return;
  return applyArtifactMutation(() => api(`/api/projects/${encodeURIComponent(state.project.id)}/artifacts/${encodeURIComponent(group.key)}?expectedRevision=${state.artifacts.revision}`, { method: 'DELETE' }), '产物及其版本历史已删除。');
}

function openManualArtifact() {
  elements.manual_artifact_step.replaceChildren(...STEPS.map(step => new Option(`Step ${step.number} · ${step.name}`, String(step.number))));
  elements.manual_artifact_step.value = String(state.project.currentStep);
  elements.manual_artifact_name.value = '';
  elements.manual_artifact_content.value = '';
  elements.modal_backdrop.hidden = false;
  elements.manual_artifact_modal.hidden = false;
  elements.manual_artifact_name.focus();
}

function closeManualArtifact() {
  elements.manual_artifact_modal.hidden = true;
  elements.modal_backdrop.hidden = true;
}

async function saveManualArtifact() {
  const name = elements.manual_artifact_name.value.trim();
  const content = elements.manual_artifact_content.value.trim();
  if (!name || !content) { toast('请填写产物名称和正文。', true); return; }
  const saved = await applyArtifactMutation(() => api(`/api/projects/${encodeURIComponent(state.project.id)}/artifacts/manual`, {
    method: 'POST',
    body: JSON.stringify({ expectedRevision: state.artifacts.revision, step: Number(elements.manual_artifact_step.value), name, content }),
  }), '自建产物已保存，并会遵守产物上下文开关。');
  // 保存失败时保留用户输入，避免长文本因弹窗关闭而丢失。
  if (saved) closeManualArtifact();
}

function referenceBookState(book) {
  return state.referenceWorldbooks?.projectBooks?.[book.id] || { enabled: false, entries: {} };
}

function activationSummary(entry) {
  if (entry.activation.type === 'constant') return '常驻 · 每轮发送';
  return entry.activation.keys?.length ? `关键词：${entry.activation.keys.join('、')}` : '关键词未设置 · 不会激活';
}

function renderReferenceWorldbooks() {
  const books = state.referenceWorldbooks?.books || [];
  const enabled = books.filter(book => referenceBookState(book).enabled).length;
  elements.reference_worldbook_summary.textContent = `${enabled}/${books.length} 本启用`;
  if (!books.length) {
    const empty = document.createElement('div');
    empty.className = 'artifact-empty';
    empty.textContent = '尚未导入附属世界书。导入后的资料由所有项目共用，但每个项目独立启用。';
    elements.reference_worldbook_list.replaceChildren(empty);
    return;
  }
  elements.reference_worldbook_list.replaceChildren(...books.map(book => {
    const card = document.createElement('article');
    card.className = 'reference-book';
    const header = document.createElement('header');
    const copy = document.createElement('div'); copy.className = 'reference-book-copy';
    const title = document.createElement('strong'); title.textContent = book.name;
    const meta = document.createElement('small'); meta.textContent = `${book.entries.length} 条 · ${book.sourceFileName}`;
    copy.append(title, meta);
    const controls = document.createElement('div'); controls.className = 'reference-book-controls';
    const manage = document.createElement('button'); manage.type = 'button'; manage.textContent = '☷'; manage.title = '管理条目';
    manage.addEventListener('click', () => openReferenceManager(book.id));
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'is-danger'; remove.textContent = '⌫'; remove.title = '从全局资料库删除';
    remove.addEventListener('click', () => deleteReferenceBook(book));
    const toggle = document.createElement('button'); toggle.type = 'button';
    toggle.className = `reference-switch${referenceBookState(book).enabled ? ' is-on' : ''}`;
    toggle.setAttribute('aria-label', referenceBookState(book).enabled ? '当前项目已启用' : '当前项目未启用');
    toggle.addEventListener('click', () => toggleReferenceBook(book));
    controls.append(manage, remove, toggle);
    header.append(copy, controls); card.append(header); return card;
  }));
}

async function applyReferenceMutation(operation, successMessage) {
  try {
    state.referenceWorldbooks = await operation();
    renderReferenceWorldbooks();
    if (!elements.reference_manager_modal.hidden) renderReferenceManager();
    if (successMessage) toast(successMessage);
    return true;
  } catch (error) {
    toast(error.message, true);
    if (String(error.code || '').includes('reference_')) await refreshReferenceWorldbooks().catch(() => {});
    return false;
  }
}

async function refreshReferenceWorldbooks() {
  state.referenceWorldbooks = await api(`/api/projects/${encodeURIComponent(state.project.id)}/reference-worldbooks`);
  renderReferenceWorldbooks();
}

function toggleReferenceBook(book) {
  const enabled = !referenceBookState(book).enabled;
  return applyReferenceMutation(() => api(`/api/projects/${encodeURIComponent(state.project.id)}/reference-worldbooks/${encodeURIComponent(book.id)}`, {
    method: 'PATCH', body: JSON.stringify({ expectedRevision: state.referenceWorldbooks.projectRevision, enabled }),
  }), enabled ? `已在当前项目启用“${book.name}”。` : `已在当前项目关闭“${book.name}”。`);
}

function toggleReferenceEntry(book, entry) {
  const bookState = referenceBookState(book);
  const enabled = !(bookState.entries?.[entry.id] ?? entry.sourceEnabled);
  return applyReferenceMutation(() => api(`/api/projects/${encodeURIComponent(state.project.id)}/reference-worldbooks/${encodeURIComponent(book.id)}/entries/${encodeURIComponent(entry.id)}`, {
    method: 'PATCH', body: JSON.stringify({ expectedRevision: state.referenceWorldbooks.projectRevision, enabled }),
  }), enabled ? '该条目已在当前项目启用。' : '该条目已在当前项目关闭。');
}

async function importReferenceWorldbook(file) {
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { toast('世界书文件超过 10 MB。', true); return; }
  const content = await file.text();
  await applyReferenceMutation(() => api(`/api/projects/${encodeURIComponent(state.project.id)}/reference-worldbooks/import`, {
    method: 'POST', body: JSON.stringify({ fileName: file.name, content }),
  }), `已导入“${file.name}”，并在当前项目启用。`);
}

async function deleteReferenceBook(book) {
  if (!await confirmAction('从全局资料库删除？', `“${book.name}”由所有项目共用。删除不会影响正式产物，也不会删除原始导入文件。`, '删除全局资料')) return;
  await applyReferenceMutation(() => api(`/api/projects/${encodeURIComponent(state.project.id)}/reference-worldbooks/${encodeURIComponent(book.id)}?expectedLibraryRevision=${state.referenceWorldbooks.libraryRevision}`, { method: 'DELETE' }), '附属世界书已从全局资料库删除。');
}

function openReferenceManager(bookId) {
  const book = state.referenceWorldbooks.books.find(item => item.id === bookId);
  if (!book) return;
  state.referenceManagerBookId = bookId;
  if (!book.entries.some(entry => entry.id === state.referenceManagerEntryId)) state.referenceManagerEntryId = book.entries[0]?.id || '';
  elements.reference_manager_search.value = '';
  elements.modal_backdrop.hidden = false;
  elements.reference_manager_modal.hidden = false;
  renderReferenceManager();
  elements.reference_manager_search.focus();
}

function closeReferenceManager() {
  elements.reference_manager_modal.hidden = true;
  elements.modal_backdrop.hidden = true;
}

function renderReferenceManager() {
  const book = state.referenceWorldbooks.books.find(item => item.id === state.referenceManagerBookId);
  if (!book) { closeReferenceManager(); return; }
  elements.reference_manager_title.textContent = book.name;
  const query = elements.reference_manager_search.value.trim().toLocaleLowerCase();
  const filtered = book.entries.filter(entry => `${entry.name} ${entry.content} ${(entry.activation.keys || []).join(' ')} ${(entry.activation.secondaryKeys || []).join(' ')}`.toLocaleLowerCase().includes(query));
  elements.reference_manager_count.textContent = `${filtered.length}/${book.entries.length} 条`;
  if (!filtered.some(entry => entry.id === state.referenceManagerEntryId)) state.referenceManagerEntryId = filtered[0]?.id || '';
  elements.reference_manager_entries.replaceChildren(...filtered.map(entry => {
    const row = document.createElement('div');
    row.className = `reference-entry-row${entry.id === state.referenceManagerEntryId ? ' is-active' : ''}`;
    row.tabIndex = 0;
    const copy = document.createElement('span');
    const title = document.createElement('strong'); title.textContent = entry.name;
    const meta = document.createElement('small'); meta.textContent = activationSummary(entry);
    copy.append(title, meta);
    const bookState = referenceBookState(book);
    const enabled = bookState.entries?.[entry.id] ?? entry.sourceEnabled;
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = `reference-switch${enabled ? ' is-on' : ''}`;
    toggle.setAttribute('aria-label', enabled ? '条目已启用' : '条目未启用');
    toggle.addEventListener('click', event => { event.stopPropagation(); toggleReferenceEntry(book, entry); });
    row.addEventListener('click', () => { state.referenceManagerEntryId = entry.id; renderReferenceManager(); });
    row.addEventListener('keydown', event => { if (event.key === 'Enter') { state.referenceManagerEntryId = entry.id; renderReferenceManager(); } });
    row.append(copy, toggle); return row;
  }));
  const entry = book.entries.find(item => item.id === state.referenceManagerEntryId);
  if (!entry) {
    elements.reference_manager_content.textContent = '没有符合搜索条件的条目。';
    return;
  }
  const detail = document.createElement('div'); detail.className = 'reference-entry-detail';
  const title = document.createElement('h3'); title.textContent = entry.name;
  const meta = document.createElement('div'); meta.className = 'reference-entry-detail-meta';
  [activationSummary(entry), entry.activation.secondaryKeys?.length ? `次关键词：${entry.activation.secondaryKeys.join('、')}` : '', entry.activation.matchWholeWords ? '整词匹配' : '', entry.activation.caseSensitive ? '区分大小写' : ''].filter(Boolean).forEach(text => { const chip = document.createElement('span'); chip.textContent = text; meta.append(chip); });
  const content = document.createElement('pre'); content.textContent = entry.content;
  detail.append(title, meta, content); elements.reference_manager_content.replaceChildren(detail);
}

async function saveConnection() {
  const currentId = elements.connection_profile.value || null;
  const body = {
    expectedRevision: state.connections.revision,
    id: currentId,
    name: elements.connection_name.value,
    provider: elements.connection_provider.value,
    apiUrl: elements.connection_url.value,
    model: elements.connection_model.value,
    outputMode: elements.connection_output.value,
    timeoutSeconds: Number(elements.connection_timeout.value) || 180,
    apiKey: elements.connection_key.value.trim() || null,
    parameters: {
      maxContextTokens: Number(elements.parameter_context.value) || 2000000,
      maxCompletionTokens: optionalNumber(elements.parameter_completion),
      temperature: optionalNumber(elements.parameter_temperature),
      topP: optionalNumber(elements.parameter_top_p),
      topK: null,
      frequencyPenalty: null,
      presencePenalty: null,
    },
  };
  try {
    state.connections = await api('/api/connections', { method: 'POST', body: JSON.stringify(body) });
    renderConnectionSettings(state.connections.activeProfileId);
    renderGenerationAvailability();
    toast('连接已保存并启用。');
  } catch (error) { toast(error.message, true); }
}

async function selectConnection(profileId) {
  if (!profileId) { fillConnectionForm(''); return; }
  try {
    state.connections = await api(`/api/connections/${encodeURIComponent(profileId)}/activate`, {
      method: 'POST',
      body: JSON.stringify({ expectedRevision: state.connections.revision }),
    });
    renderConnectionSettings(profileId);
    renderGenerationAvailability();
  } catch (error) { toast(error.message, true); await reloadConnectionState(); }
}

async function deleteConnection() {
  const id = elements.connection_profile.value;
  if (!id) return;
  if (!await confirmAction('删除模型连接？', '普通配置与 Windows 凭据中的密钥都会删除，不影响项目和对话。', '删除连接')) return;
  try {
    state.connections = await api(`/api/connections/${encodeURIComponent(id)}?expectedRevision=${state.connections.revision}`, { method: 'DELETE' });
    renderConnectionSettings();
    renderGenerationAvailability();
    toast('模型连接已删除。');
  } catch (error) { toast(error.message, true); }
}

async function reloadConnectionState() {
  state.connections = await api('/api/connections');
  renderConnectionSettings();
  renderGenerationAvailability();
}

async function fetchModels() {
  const id = elements.connection_profile.value;
  if (!id) { toast('请先保存连接，再获取模型列表。', true); return; }
  elements.fetch_models.disabled = true;
  try {
    const payload = await api(`/api/connections/${encodeURIComponent(id)}/models`, { method: 'POST' });
    elements.model_options.replaceChildren(...payload.models.map(model => new Option(model, model)));
    toast(payload.models.length ? `已获取 ${payload.models.length} 个模型。` : '该接口没有提供模型列表，请手动填写。');
  } catch (error) { toast(error.message, true); }
  finally { elements.fetch_models.disabled = false; }
}

function togglePhase(phaseId) {
  if (state.collapsedPhases.has(phaseId)) state.collapsedPhases.delete(phaseId);
  else state.collapsedPhases.add(phaseId);
  localStorage.setItem('acs:collapsed-phases', JSON.stringify([...state.collapsedPhases]));
  renderSteps();
}

async function selectStep(number) {
  if (number === state.project.currentStep) return;
  if (state.generating) { toast('请先停止当前生成，再切换步骤。', true); return; }
  try {
    // 先落盘输入框中的待保存内容，再切换步骤，避免快速操作互相覆盖。
    await flushPendingPatch();
    await persistPatch({ currentStep: number });
    renderSteps();
    renderCurrentStep();
    document.querySelector('.conversation').scrollTop = 0;
  } catch { /* persistPatch 已负责提示错误 */ }
}

function persistPatch(patch) {
  state.saveChain = state.saveChain.then(async () => {
    setSaveStatus('正在保存…', 'is-saving');
    try {
      const payload = await api(`/api/projects/${encodeURIComponent(state.project.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ expectedRevision: state.project.revision, ...patch }),
      });
      applyState(payload);
      setSaveStatus('所有更改已保存', 'is-saved');
      return payload;
    } catch (error) {
      setSaveStatus(error.message, 'is-error');
      if (error.code === 'revision_conflict') toast('项目已在其他页面变化，正在重新载入。', true);
      else toast(error.message, true);
      await loadState().catch(() => {});
      throw error;
    }
  });
  return state.saveChain;
}

let projectPatchTimer;
function queueProjectPatch(patch) {
  Object.assign(state.pendingPatch, patch);
  clearTimeout(projectPatchTimer);
  setSaveStatus('等待保存…', 'is-saving');
  projectPatchTimer = setTimeout(() => flushPendingPatch().catch(() => {}), 500);
}

function flushPendingPatch() {
  clearTimeout(projectPatchTimer);
  const patch = { ...state.pendingPatch };
  state.pendingPatch = {};
  if (!Object.keys(patch).length) return state.saveChain;
  return persistPatch(patch);
}

async function generateCurrentStep() {
  return runGeneration();
}

async function retryLatestUserInput(turnId) {
  if (state.generating) return;
  const conversation = activeConversation();
  const latestUser = [...conversation.turns].reverse().find(turn => turn.role === 'user');
  if (!latestUser || latestUser.id !== turnId) {
    toast('只能重试当前对话中最新的用户输入。', true);
    renderCurrentStep();
    return;
  }
  return runGeneration(turnId);
}

async function runGeneration(retryTurnId = '') {
  if (state.generating) return;
  if (!state.resources?.preset || !activeConnection()) { renderGenerationAvailability(); return; }
  await flushPendingPatch();
  const step = STEPS[state.project.currentStep - 1];
  const conversation = activeConversation();
  const retryTurn = retryTurnId ? conversation.turns.find(turn => turn.id === retryTurnId) : null;
  const input = retryTurn?.content || elements.user_input.value.trim() || `请执行 Step ${step.number}「${step.name}」。`;
  const generationId = crypto.randomUUID();
  const optimisticTurn = retryTurnId ? null : {
      id: `optimistic-${generationId}`,
      role: 'user',
      content: input,
      createdAt: new Date().toISOString(),
    };
  state.generating = true;
  state.generationId = generationId;
  state.generationConversationId = conversation.id;
  state.generationRetryTurnId = retryTurnId;
  state.generationUserCommitted = false;
  state.optimisticTurnId = optimisticTurn?.id || '';
  if (optimisticTurn) {
    replaceActiveConversation({ ...conversation, turns: [...conversation.turns, optimisticTurn] });
    elements.user_input.value = '';
  }
  renderTurns('');
  renderConversationManager();
  renderGenerationAvailability();
  scrollConversationToBottom();

  let terminal = false;
  try {
    const response = await fetch('/api/generations', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationId,
        projectId: state.project.id,
        stepNumber: step.number,
        expectedStepRevision: state.step.revision,
        userInput: input,
        connectionId: state.connections.activeProfileId,
        conversationId: conversation.id,
        retryTurnId: retryTurnId || null,
      }),
    });
    if (!response.ok || !response.body) throw new Error(`本地生成服务返回 ${response.status}`);
    await consumeGenerationStream(response.body, event => {
      if (event.generationId && event.generationId !== generationId) return;
      if (event.conversationId && event.conversationId !== state.generationConversationId) return;
      if (event.type === 'user_committed') {
        state.generationUserCommitted = true;
        const current = activeConversation();
        replaceActiveConversation({ ...current, turns: current.turns.map(turn => turn.id === state.optimisticTurnId ? event.turn : turn) });
        state.step.revision = event.stepRevision;
      } else if (event.type === 'retry_started') {
        state.generationUserCommitted = true;
      } else if (event.type === 'chunk') {
        appendStreamDelta(event.delta || '');
      } else if (event.type === 'completed') {
        terminal = true;
        applyCompletedAssistantTurn(event.turn, retryTurnId);
        state.step.revision = event.stepRevision;
        state.generationRetryTurnId = '';
        renderTurns();
        refreshArtifacts().catch(error => toast(`产物列表刷新失败：${error.message}`, true));
        if (conversationAutoFollow) scrollConversationToBottom();
        toast(retryTurnId ? '最新输入已重新生成。' : '本轮草案已生成。');
      } else if (event.type === 'cancelled') {
        terminal = true;
        if (event.turn) applyCompletedAssistantTurn(event.turn, retryTurnId);
        if (event.stepRevision) state.step.revision = event.stepRevision;
        state.generationRetryTurnId = '';
        renderTurns();
        refreshArtifacts().catch(error => toast(`产物列表刷新失败：${error.message}`, true));
        toast(event.message || '生成已停止。');
      } else if (event.type === 'failed') {
        terminal = true;
        if (!state.generationUserCommitted && state.optimisticTurnId) removeOptimisticTurn();
        if (event.stepRevision) state.step.revision = event.stepRevision;
        state.generationRetryTurnId = '';
        renderTurns();
        toast(event.message || '生成失败。', true);
      }
    });
    if (!terminal) throw new Error('生成连接提前结束。');
  } catch (error) {
    if (!state.generationUserCommitted && state.optimisticTurnId) removeOptimisticTurn();
    state.generationRetryTurnId = '';
    renderTurns();
    toast(error.message || '生成连接中断。', true);
  } finally {
    state.generating = false;
    state.generationId = '';
    state.generationConversationId = '';
    state.generationRetryTurnId = '';
    state.optimisticTurnId = '';
    renderConversationManager();
    renderTurns();
    renderGenerationAvailability();
  }
}

function applyCompletedAssistantTurn(turn, retryTurnId) {
  const conversation = activeConversation();
  const retryIndex = retryTurnId ? conversation.turns.findIndex(item => item.id === retryTurnId) : -1;
  // 后端已按稳定消息 ID 校验；前端仍保护异常事件，避免找不到目标时误清空整段对话。
  const turns = retryIndex >= 0
    ? [...conversation.turns.slice(0, retryIndex + 1), turn]
    : [...conversation.turns, turn];
  replaceActiveConversation({ ...conversation, turns, updatedAt: new Date().toISOString() });
}

function removeOptimisticTurn() {
  const conversation = activeConversation();
  replaceActiveConversation({ ...conversation, turns: conversation.turns.filter(turn => turn.id !== state.optimisticTurnId) });
}

async function consumeGenerationStream(stream, onEvent) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done }).replaceAll('\r\n', '\n');
    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const type = block.split('\n').find(line => line.startsWith('event:'))?.slice(6).trim();
      const data = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
      if (!data) continue;
      const event = JSON.parse(data);
      if (!event.type && type) event.type = type;
      onEvent(event);
    }
    if (done) break;
  }
}

function appendStreamDelta(delta) {
  const turn = elements.turn_list.querySelector('.turn.is-streaming');
  const content = turn?.querySelector('.turn-content');
  if (content) {
    if (content.textContent === '正在连接模型…') content.textContent = '';
    content.textContent += delta;
  }
  scrollConversationToBottom();
}

function isConversationNearBottom(conversation) {
  return conversation.scrollHeight - conversation.clientHeight - conversation.scrollTop <= 80;
}

function handleConversationScroll(event) {
  const conversation = event.currentTarget;
  const currentTop = conversation.scrollTop;
  if (!conversationScrollSyncing) {
    if (currentTop < conversationLastScrollTop - 1) conversationAutoFollow = false;
    else if (isConversationNearBottom(conversation)) conversationAutoFollow = true;
  }
  conversationLastScrollTop = currentTop;
}

function scrollConversationToBottom({ force = false, behavior = 'auto' } = {}) {
  const conversation = document.querySelector('.conversation');
  if (!conversation || (!force && !conversationAutoFollow)) return;
  conversation.scrollTo({ top: conversation.scrollHeight, behavior });
  conversationLastScrollTop = conversation.scrollTop;
}

function scrollToPreviousTurnTop() {
  const conversation = document.querySelector('.conversation');
  const turns = [...elements.turn_list.querySelectorAll('.turn')];
  if (!conversation || !turns.length) return;
  const bounds = conversation.getBoundingClientRect();
  const stored = Number(conversation.dataset.previousTurnIndex);
  let currentIndex;
  if (Number.isInteger(stored) && stored >= 0 && stored < turns.length) {
    currentIndex = stored;
  } else {
    currentIndex = turns.findIndex(turn => turn.getBoundingClientRect().top >= bounds.top + 8);
    if (currentIndex < 0) currentIndex = turns.length;
  }
  const targetIndex = Math.max(0, currentIndex - 1);
  conversation.dataset.previousTurnIndex = String(targetIndex);
  const targetBounds = turns[targetIndex].getBoundingClientRect();
  const maximum = Math.max(0, conversation.scrollHeight - conversation.clientHeight);
  conversationAutoFollow = false;
  conversation.scrollTo({
    top: Math.max(0, Math.min(maximum, conversation.scrollTop + targetBounds.top - bounds.top - 10)),
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}

function scrollToLatestTurnBottom() {
  const conversation = document.querySelector('.conversation');
  const latest = elements.turn_list.querySelector('.turn:last-child');
  if (!conversation || !latest) return;
  delete conversation.dataset.previousTurnIndex;
  conversationAutoFollow = true;
  const bounds = conversation.getBoundingClientRect();
  const turnBounds = latest.getBoundingClientRect();
  const maximum = Math.max(0, conversation.scrollHeight - conversation.clientHeight);
  conversation.scrollTo({
    top: Math.max(0, Math.min(maximum, conversation.scrollTop + turnBounds.bottom - bounds.bottom + 10)),
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}

function beginTurnEdit(turnId) {
  if (state.generating) return;
  const turn = activeConversation().turns.find(item => item.id === turnId);
  const article = [...elements.turn_list.querySelectorAll('.turn')].find(item => item.dataset.turnId === turnId);
  const content = article?.querySelector('.turn-content');
  const actions = article?.querySelector('.turn-actions');
  if (!turn || !article || !content || !actions) return;
  const articleRect = article.getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  article.style.width = `${articleRect.width}px`;
  article.style.maxWidth = '100%';
  article.classList.add('is-editing');
  const editor = document.createElement('textarea');
  editor.className = 'turn-editor';
  editor.value = turn.content;
  editor.style.height = `${Math.max(contentRect.height, turn.role === 'user' ? 88 : 120)}px`;
  editor.setAttribute('aria-label', turn.role === 'user' ? '编辑用户消息' : '编辑 AI 回复');
  content.replaceWith(editor);
  actions.replaceChildren();
  const cancel = turnAction('取消', '取消编辑', () => renderCurrentStep());
  const save = turnAction('保存', '保存修改', () => saveTurnEdit(turnId, editor.value));
  actions.append(cancel, save);
  editor.addEventListener('keydown', event => {
    if (event.key === 'Escape') renderCurrentStep();
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') saveTurnEdit(turnId, editor.value);
  });
  editor.focus();
  editor.setSelectionRange(editor.value.length, editor.value.length);
}

async function saveTurnEdit(turnId, content) {
  if (!String(content || '').trim()) { toast('对话内容不能为空。', true); return; }
  const conversation = activeConversation();
  await applyStepMutation(() => api(`${stepApiPath(conversation.id)}/turns/${encodeURIComponent(turnId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ expectedRevision: state.step.revision, content }),
  }), '消息已保存；未来的正式产物不会随对话修改。');
}

async function deleteConversationTurn(turn) {
  if (state.generating) return;
  const roleName = turn.role === 'assistant' ? 'AI 回复' : '用户消息';
  if (!await confirmAction(`删除这条${roleName}？`, '只删除当前对话中的这条消息，不会自动删除相邻消息或未来的正式产物。', '删除消息')) return;
  const conversation = activeConversation();
  await applyStepMutation(() => api(`${stepApiPath(conversation.id)}/turns/${encodeURIComponent(turn.id)}?expectedRevision=${state.step.revision}`, {
    method: 'DELETE',
  }), `已删除这条${roleName}。`);
}

async function stopGeneration() {
  if (!state.generationId) return;
  try { await api(`/api/generations/${encodeURIComponent(state.generationId)}/cancel`, { method: 'POST' }); }
  catch (error) { if (error.status !== 404) toast(error.message, true); }
}

async function createProject() {
  if (state.generating) { toast('请先停止当前生成，再新建项目。', true); return; }
  try {
    await flushPendingPatch();
    const payload = await api('/api/projects', { method: 'POST', body: JSON.stringify({ name: '未命名项目' }) });
    await loadState(payload.project.id);
    toggleProjectMenu(false);
    toast(`已创建“${payload.project.name}”`);
    document.querySelector('[data-tab="settings"]').click();
    elements.project_name.focus();
    elements.project_name.select();
  } catch (error) { toast(error.message, true); }
}

async function activateProject(projectId) {
  if (state.generating) { toast('请先停止当前生成，再切换项目。', true); return; }
  if (projectId === state.project.id) { toggleProjectMenu(false); return; }
  try {
    await flushPendingPatch();
    await api(`/api/projects/${encodeURIComponent(projectId)}/activate`, { method: 'POST' });
    await loadState(projectId);
    toggleProjectMenu(false);
  } catch (error) { toast(error.message, true); }
}

async function deleteProject(projectSummary) {
  if (state.generating) { toast('请先停止当前生成，再删除项目。', true); return; }
  const accepted = await confirmAction('删除项目？', `“${projectSummary.name}”将移入 data/trash，不会立即永久删除。`, '删除项目');
  if (!accepted) return;
  try {
    if (projectSummary.id === state.project.id) await flushPendingPatch();
    const expectedRevision = projectSummary.id === state.project.id ? state.project.revision : projectSummary.revision;
    const payload = await api(`/api/projects/${encodeURIComponent(projectSummary.id)}?expectedRevision=${expectedRevision}`, { method: 'DELETE' });
    await loadState(payload.project.id);
    toast('项目已移入回收目录。');
  } catch (error) { toast(error.message, true); }
}

async function loadMaintenanceState(renderModal = true) {
  const maintenance = await api('/api/maintenance');
  state.maintenance = maintenance;
  const diagnosis = maintenance.diagnosis;
  const healthy = diagnosis.status === 'healthy';
  elements.maintenance_health.textContent = healthy ? '正常' : '需处理';
  elements.maintenance_summary.textContent = `${diagnosis.projectCount} 个项目 · ${diagnosis.fileCount} 个资料文件 · ${maintenance.backups.length} 份备份`;
  if (!renderModal) return maintenance;

  elements.maintenance_location.textContent = maintenance.dataDirectory;
  elements.diagnosis_status.textContent = healthy ? '结构正常' : '发现异常';
  elements.diagnosis_projects.textContent = String(diagnosis.projectCount);
  elements.diagnosis_files.textContent = String(diagnosis.fileCount);
  elements.diagnosis_size.textContent = formatBytes(diagnosis.totalBytes);
  elements.diagnosis_detail.textContent = healthy
    ? '全部 JSON 资料均可解析。诊断不会显示对话、产物、提示词和 API 密钥正文。'
    : `以下 JSON 文件不可解析：${diagnosis.invalidJsonFiles.join('、')}`;
  renderBackups(maintenance.backups);
  return maintenance;
}

function renderBackups(backups) {
  if (!backups.length) {
    const empty = document.createElement('p');
    empty.className = 'backup-empty';
    empty.textContent = '还没有本机备份。';
    elements.backup_list.replaceChildren(empty);
    return;
  }
  elements.backup_list.replaceChildren(...backups.map(backup => {
    const row = document.createElement('article');
    row.className = 'backup-item';
    const copy = document.createElement('div');
    const kindNames = { automatic: '每日自动', manual: '手动', recovery: '恢复点' };
    copy.innerHTML = `<strong>${escapeHtml(backup.name)}</strong><small>${kindNames[backup.kind] || '未知'} · ${new Date(backup.createdAt).toLocaleString()} · ${formatBytes(backup.size)} · ${backup.fileCount} 个文件${backup.valid ? '' : ' · 已损坏'}</small>`;
    const download = document.createElement('button');
    download.type = 'button';
    download.className = 'backup-download';
    download.textContent = '下载';
    download.disabled = !backup.valid;
    download.addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = `/api/maintenance/backups/${encodeURIComponent(backup.name)}`;
      link.download = backup.name;
      link.click();
    });
    const restore = document.createElement('button');
    restore.type = 'button';
    restore.className = 'is-restore';
    restore.textContent = '恢复';
    restore.disabled = !backup.valid;
    restore.addEventListener('click', () => restoreBackup(backup));
    row.append(copy, download, restore);
    return row;
  }));
}

async function openMaintenance() {
  if (window.innerWidth <= 820) setMobileInspectorOpen(false);
  elements.modal_backdrop.hidden = false;
  elements.maintenance_modal.hidden = false;
  elements.diagnosis_status.textContent = '检查中';
  try { await loadMaintenanceState(true); }
  catch (error) { toast(error.message, true); }
}

function closeMaintenance() {
  elements.maintenance_modal.hidden = true;
  elements.modal_backdrop.hidden = true;
}

async function createWorkspaceBackup() {
  elements.create_backup.disabled = true;
  try {
    await flushPendingPatch();
    const backup = await api('/api/maintenance/backups', { method: 'POST' });
    toast(`备份已创建：${backup.name}`);
    await loadMaintenanceState(true);
  } catch (error) { toast(error.message, true); }
  finally { elements.create_backup.disabled = false; }
}

async function restoreBackup(backup) {
  const accepted = await confirmAction('恢复这份备份？', `将用“${backup.name}”替换当前独立版资料。\n恢复前会自动保存当前资料，完成后创作台会关闭。`, '恢复并关闭');
  if (!accepted) return;
  try {
    const result = await api(`/api/maintenance/backups/${encodeURIComponent(backup.name)}/restore`, { method: 'POST' });
    document.body.innerHTML = `<main style="display:grid;height:100vh;place-items:center;background:#1d1b18;color:#cec5b9;font-family:system-ui"><div style="max-width:520px;padding:24px;text-align:center"><h1>备份已恢复</h1><p>${escapeHtml(result.message)}</p></div></main>`;
  } catch (error) { toast(error.message, true); }
}

async function clearWorkspace() {
  const first = await confirmAction('清空独立版资料？', '会删除所有项目、产物、导入资源、连接配置与对应凭据。SillyTavern 和脚本版不受影响。', '继续确认');
  if (!first) return;
  const second = await confirmAction('最后确认', '操作前会在 data/backups 建立恢复点；完成后创作台自动关闭。确定清空吗？', '创建恢复点并清空');
  if (!second) return;
  try {
    const result = await api('/api/maintenance/clear', { method: 'POST' });
    document.body.innerHTML = `<main style="display:grid;height:100vh;place-items:center;background:#1d1b18;color:#cec5b9;font-family:system-ui"><div style="max-width:520px;padding:24px;text-align:center"><h1>独立版资料已清空</h1><p>${escapeHtml(result.message)}</p></div></main>`;
  } catch (error) { toast(error.message, true); }
}

async function exportCurrentProject() {
  try {
    await flushPendingPatch();
    const link = document.createElement('a');
    link.href = `/api/projects/${encodeURIComponent(state.project.id)}/export`;
    link.download = '';
    link.click();
    toast('当前项目正在导出；文件不包含 API 密钥。');
  } catch (error) { toast(error.message, true); }
}

async function importProjectFile(file) {
  if (!file) return;
  if (file.size > 50 * 1024 * 1024) { toast('项目文件超过 50 MB。', true); return; }
  elements.import_project.disabled = true;
  try {
    const payload = await api('/api/projects/import', {
      method: 'POST',
      body: JSON.stringify({ fileName: file.name, content: await file.text() }),
    });
    closeMaintenance();
    await loadState(payload.project.id);
    toast(`已导入为项目副本“${payload.project.name}”。`);
  } catch (error) { toast(error.message, true); }
  finally { elements.import_project.disabled = false; }
}

function toggleProjectMenu(force) {
  const open = typeof force === 'boolean' ? force : elements.project_menu.hidden;
  elements.project_menu.hidden = !open;
  elements.project_menu_button.setAttribute('aria-expanded', String(open));
}

function setSaveStatus(message, className = '') {
  elements.save_status.textContent = message;
  elements.save_status.className = `save-status ${className}`.trim();
}

function toast(message, isError = false) {
  const item = document.createElement('div');
  item.className = `toast${isError ? ' is-error' : ''}`;
  item.textContent = message;
  elements.toast_region.append(item);
  setTimeout(() => item.remove(), 3600);
}

function confirmAction(title, message, acceptLabel = '确认') {
  elements.confirm_title.textContent = title;
  elements.confirm_message.textContent = message;
  elements.confirm_accept.textContent = acceptLabel;
  elements.modal_backdrop.hidden = false;
  elements.confirm_modal.hidden = false;
  return new Promise(resolve => {
    const finish = value => {
      elements.modal_backdrop.hidden = true;
      elements.confirm_modal.hidden = true;
      elements.confirm_cancel.onclick = null;
      elements.confirm_accept.onclick = null;
      resolve(value);
    };
    elements.confirm_cancel.onclick = () => finish(false);
    elements.confirm_accept.onclick = () => finish(true);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(item => item.classList.toggle('is-active', item === tab));
  document.querySelectorAll('.tab-panel').forEach(panel => { panel.hidden = panel.dataset.panel !== tab.dataset.tab; });
}));

elements.project_menu_button.addEventListener('click', () => toggleProjectMenu());
elements.project_menu_close.addEventListener('click', () => toggleProjectMenu(false));
elements.new_project_button.addEventListener('click', createProject);
elements.conversation_manager_toggle.addEventListener('click', () => {
  setConversationMenuOpen(elements.conversation_menu.hidden);
});
elements.create_conversation.addEventListener('click', createConversation);
elements.new_conversation_name.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    createConversation();
  }
});
elements.clear_conversation.addEventListener('click', clearCurrentConversation);
elements.previous_turn_top.addEventListener('click', scrollToPreviousTurnTop);
elements.latest_turn_bottom.addEventListener('click', scrollToLatestTurnBottom);
document.querySelector('.conversation').addEventListener('scroll', handleConversationScroll, { passive: true });
document.addEventListener('pointerdown', event => {
  if (!elements.conversation_menu.hidden && !event.target.closest('.conversation-manager')) {
    setConversationMenuOpen(false);
  }
});
elements.reload_button.addEventListener('click', async () => {
  try {
    await flushPendingPatch();
    await loadState();
  } catch (error) { toast(error.message, true); }
});
elements.mobile_inspector_button.addEventListener('click', toggleMobileInspector);
elements.mobile_panel_scrim.addEventListener('click', () => setMobileInspectorOpen(false));
elements.maintenance_button.addEventListener('click', openMaintenance);
elements.open_maintenance.addEventListener('click', openMaintenance);
elements.close_maintenance.addEventListener('click', closeMaintenance);
elements.refresh_maintenance.addEventListener('click', () => loadMaintenanceState(true).catch(error => toast(error.message, true)));
elements.create_backup.addEventListener('click', createWorkspaceBackup);
elements.clear_workspace.addEventListener('click', clearWorkspace);
elements.export_project.addEventListener('click', exportCurrentProject);
elements.import_project.addEventListener('click', () => elements.project_import_file.click());
elements.project_import_file.addEventListener('change', async event => {
  await importProjectFile(event.currentTarget.files?.[0]);
  event.currentTarget.value = '';
});
elements.project_brief.addEventListener('input', () => queueProjectPatch({ brief: elements.project_brief.value }));
elements.project_brief.addEventListener('change', () => flushPendingPatch().catch(() => {}));
elements.project_name.addEventListener('input', () => queueProjectPatch({ name: elements.project_name.value }));
elements.project_name.addEventListener('change', () => flushPendingPatch().catch(() => {}));
elements.import_preset_button.addEventListener('click', () => elements.preset_file.click());
elements.import_regex_button.addEventListener('click', () => elements.regex_file.click());
elements.open_resource_manager.addEventListener('click', openResourceManager);
elements.close_resource_manager.addEventListener('click', closeResourceManager);
document.querySelectorAll('[data-resource-kind]').forEach(button => button.addEventListener('click', () => {
  state.resourceKind = button.dataset.resourceKind;
  renderResourceManager();
}));
elements.close_resource_editor.addEventListener('click', closeResourceEditor);
elements.cancel_resource_editor.addEventListener('click', closeResourceEditor);
elements.save_resource_editor.addEventListener('click', saveResourceEditor);
elements.preset_file.addEventListener('change', async event => {
  await importResource(event.currentTarget.files?.[0], 'preset');
  event.currentTarget.value = '';
});
elements.regex_file.addEventListener('change', async event => {
  await importResource(event.currentTarget.files?.[0], 'regex');
  event.currentTarget.value = '';
});
elements.connection_profile.addEventListener('change', event => selectConnection(event.target.value));
elements.save_connection.addEventListener('click', saveConnection);
elements.delete_connection.addEventListener('click', deleteConnection);
elements.fetch_models.addEventListener('click', fetchModels);
elements.conversation_font_size.addEventListener('input', event => applyConversationFontSize(event.target.value));
elements.conversation_font_decrease.addEventListener('click', () => changeConversationFontSize(-1));
elements.conversation_font_increase.addEventListener('click', () => changeConversationFontSize(1));
elements.future_artifacts_toggle.addEventListener('click', async () => {
  if (state.generating) return;
  try {
    await flushPendingPatch();
    await persistPatch({ includeFutureArtifacts: state.project.includeFutureArtifacts !== true });
    toast(state.project.includeFutureArtifacts ? '已包含后序产物。' : '已恢复为只发送当前及之前的产物。');
  } catch { /* persistPatch 已提示 */ }
});
document.querySelectorAll('[data-artifact-scope]').forEach(button => button.addEventListener('click', () => {
  state.artifactScope = button.dataset.artifactScope;
  renderArtifacts();
}));
elements.artifact_search.addEventListener('input', event => { state.artifactQuery = event.target.value; renderArtifacts(); });
elements.create_artifact.addEventListener('click', openManualArtifact);
elements.close_manual_artifact.addEventListener('click', closeManualArtifact);
elements.cancel_manual_artifact.addEventListener('click', closeManualArtifact);
elements.save_manual_artifact.addEventListener('click', saveManualArtifact);
elements.import_worldbook_button.addEventListener('click', () => elements.worldbook_file.click());
elements.worldbook_file.addEventListener('change', async event => {
  await importReferenceWorldbook(event.currentTarget.files?.[0]);
  event.currentTarget.value = '';
});
elements.close_reference_manager.addEventListener('click', closeReferenceManager);
elements.reference_manager_search.addEventListener('input', renderReferenceManager);
elements.publication_select_all.addEventListener('click', () => selectPublicationChoices('all'));
elements.publication_select_none.addEventListener('click', () => selectPublicationChoices('none'));
elements.publication_build.addEventListener('click', buildPublicationPackage);
elements.publication_output_regex.addEventListener('change', updatePublicationSelection);
elements.publication_avatar.addEventListener('change', event => {
  const file = event.currentTarget.files?.[0];
  if (file && file.type && file.type !== 'image/png') {
    event.currentTarget.value = '';
    elements.publication_avatar_name.textContent = '可选 PNG 头像';
    toast('头像必须是 PNG 文件。', true);
    return;
  }
  elements.publication_avatar_name.textContent = file?.name || '可选 PNG 头像';
});
elements.prompt_preview_button.addEventListener('click', openPromptPreview);
elements.copy_prompt_preview.addEventListener('click', copyPromptPreview);
elements.close_prompt_preview.addEventListener('click', closePromptPreview);
elements.modal_backdrop.addEventListener('click', () => {
  if (!elements.confirm_modal.hidden) return;
  if (!elements.prompt_preview_modal.hidden) closePromptPreview();
  else if (!elements.manual_artifact_modal.hidden) closeManualArtifact();
  else if (!elements.reference_manager_modal.hidden) closeReferenceManager();
  else if (!elements.maintenance_modal.hidden) closeMaintenance();
  else if (!elements.resource_editor_modal.hidden) closeResourceEditor();
  else if (!elements.resource_drawer.hidden) closeResourceManager();
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !elements.confirm_modal.hidden) return;
  if (!elements.prompt_preview_modal.hidden) closePromptPreview();
  else if (!elements.manual_artifact_modal.hidden) closeManualArtifact();
  else if (!elements.reference_manager_modal.hidden) closeReferenceManager();
  else if (!elements.maintenance_modal.hidden) closeMaintenance();
  else if (!elements.resource_editor_modal.hidden) closeResourceEditor();
  else if (!elements.resource_drawer.hidden) closeResourceManager();
});
elements.generate_button.addEventListener('click', generateCurrentStep);
elements.stop_generation.addEventListener('click', stopGeneration);
elements.close_button.addEventListener('click', async () => {
  const accepted = await confirmAction('关闭创作台？', '会先等待当前保存完成，再停止本地服务。', '保存并关闭');
  if (!accepted) return;
  try {
    if (state.generating) await stopGeneration();
    await flushPendingPatch();
    await api('/api/shutdown', { method: 'POST' });
    document.body.innerHTML = '<main style="display:grid;height:100vh;place-items:center;background:#1d1b18;color:#cec5b9;font-family:system-ui"><div style="text-align:center"><h1>A.U.T.O 已安全关闭</h1><p>现在可以关闭此页面。</p></div></main>';
  } catch (error) { toast(error.message, true); }
});

initializePanelLayout();
applyConversationFontSize(localStorage.getItem('acs:conversation-font-size') || 15);
loadState().then(() => {
  elements.app.setAttribute('aria-busy', 'false');
  elements.service_status.classList.add('is-ready');
  elements.service_status.querySelector('span').textContent = '独立环境已就绪';
  loadMaintenanceState(false).catch(() => {
    elements.maintenance_health.textContent = '不可用';
    elements.maintenance_summary.textContent = '数据诊断暂时不可读取';
  });
}).catch(error => {
  elements.app.setAttribute('aria-busy', 'false');
  elements.service_status.querySelector('span').textContent = '本地资料读取失败';
  toast(error.message, true);
});
