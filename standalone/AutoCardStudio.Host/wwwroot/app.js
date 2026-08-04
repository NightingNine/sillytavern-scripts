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
  saveChain: Promise.resolve(),
  pendingPatch: {},
  generating: false,
  generationId: '',
  generationUserCommitted: false,
  optimisticTurnId: '',
  collapsedPhases: new Set(JSON.parse(localStorage.getItem('acs:collapsed-phases') || '[]')),
};

const elements = Object.fromEntries([
  'app', 'service-status', 'reload-button', 'close-button', 'project-menu-button', 'project-button-name',
  'progress-copy', 'step-rail', 'new-project-button', 'project-menu', 'project-menu-close', 'project-list',
  'step-number', 'step-title', 'step-goal', 'requirement-chip', 'station-label', 'guide-title',
  'guide-description', 'guide-prompts', 'brief-label', 'project-brief', 'save-status', 'project-name',
  'empty-state', 'turn-list', 'user-input', 'generation-hint', 'generate-button', 'stop-generation',
  'preset-summary', 'regex-summary', 'import-preset-button', 'import-regex-button', 'preset-file', 'regex-file',
  'connection-profile', 'connection-name', 'connection-provider', 'connection-url', 'connection-key',
  'connection-model', 'connection-output', 'connection-timeout', 'parameter-context', 'parameter-completion',
  'parameter-temperature', 'parameter-top-p', 'connection-secret-state', 'model-options', 'fetch-models',
  'save-connection', 'delete-connection',
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
  renderResourceSettings();
  renderConnectionSettings();
  renderGenerationAvailability();
  setSaveStatus('所有更改已保存', 'is-saved');
}

function applyState(payload) {
  state.index = payload.index;
  state.project = payload.project;
  state.step = payload.step;
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
  elements.step_number.textContent = String(step.number).padStart(2, '0');
  elements.step_title.textContent = step.name;
  elements.step_goal.textContent = step.goal;
  elements.requirement_chip.textContent = step.requirement;
  elements.station_label.textContent = `STATION ${String(step.number).padStart(2, '0')} · 创作航标`;
  elements.guide_title.textContent = step.guideTitle;
  elements.guide_description.textContent = step.goal;
  elements.brief_label.textContent = `本轮补充 · ${step.name}`;
  const prompts = [
    `这一步最需要确定的核心边界是什么？`,
    `哪些已有设计必须在“${step.name}”中保持一致？`,
  ];
  elements.guide_prompts.replaceChildren(...prompts.map(text => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
  renderTurns();
}

function renderTurns(streamText = null) {
  const turns = state.step?.turns || [];
  elements.empty_state.hidden = turns.length > 0 || streamText !== null;
  const items = turns.map(turn => createTurnElement(turn));
  if (streamText !== null) {
    items.push(createTurnElement({ role: 'assistant', content: streamText, state: 'streaming' }, true));
  }
  elements.turn_list.replaceChildren(...items);
}

function createTurnElement(turn, streaming = false) {
  const article = document.createElement('article');
  article.className = `turn${streaming ? ' is-streaming' : ''}`;
  article.dataset.role = turn.role === 'assistant' ? 'assistant' : 'user';
  const label = document.createElement('span');
  label.className = 'turn-meta';
  label.textContent = turn.role === 'assistant' ? 'A.U.T.O.' : '你';
  const content = document.createElement('div');
  content.textContent = turn.content || (streaming ? '正在连接模型…' : '');
  article.append(label, content);
  return article;
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
  elements.generation_hint.textContent = state.generating
    ? 'A.U.T.O 正在生成，当前项目与步骤已锁定'
    : !hasPreset
      ? '请先在设置中导入完整 A.U.T.O 预设'
      : !hasConnection
        ? '请先保存一套模型连接'
        : `${activeConnection()?.profile.name || '当前连接'} · ${activeConnection()?.profile.outputMode === 'complete' ? '非流式' : '流式'}`;
}

function activeConnection() {
  return (state.connections?.profiles || []).find(item => item.profile.id === state.connections.activeProfileId);
}

async function importResource(file, kind) {
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) { toast('文件超过 20 MB。', true); return; }
  try {
    const path = kind === 'preset' ? '/api/resources/preset' : '/api/resources/regexes';
    state.resources = await api(path, { method: 'POST', body: JSON.stringify({ fileName: file.name, content: await file.text() }) });
    renderResourceSettings();
    if (kind === 'preset' && !elements.connection_profile.value) fillConnectionForm('');
    renderGenerationAvailability();
    toast(kind === 'preset' ? `已导入“${state.resources.preset.name}”。` : `已导入 ${state.resources.regexes.total} 条正则。`);
  } catch (error) { toast(error.message, true); }
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
  if (state.generating) return;
  if (!state.resources?.preset || !activeConnection()) { renderGenerationAvailability(); return; }
  await flushPendingPatch();
  const step = STEPS[state.project.currentStep - 1];
  const input = elements.user_input.value.trim() || `请执行 Step ${step.number}「${step.name}」。`;
  const generationId = crypto.randomUUID();
  const optimisticTurn = {
    id: `optimistic-${generationId}`,
    role: 'user',
    content: input,
    createdAt: new Date().toISOString(),
  };
  state.generating = true;
  state.generationId = generationId;
  state.generationUserCommitted = false;
  state.optimisticTurnId = optimisticTurn.id;
  state.step.turns = [...(state.step.turns || []), optimisticTurn];
  elements.user_input.value = '';
  renderTurns('');
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
      }),
    });
    if (!response.ok || !response.body) throw new Error(`本地生成服务返回 ${response.status}`);
    await consumeGenerationStream(response.body, event => {
      if (event.generationId && event.generationId !== generationId) return;
      if (event.type === 'user_committed') {
        state.generationUserCommitted = true;
        state.step.turns = state.step.turns.map(turn => turn.id === state.optimisticTurnId ? event.turn : turn);
        state.step.revision = event.stepRevision;
      } else if (event.type === 'chunk') {
        appendStreamDelta(event.delta || '');
      } else if (event.type === 'completed') {
        terminal = true;
        state.step.turns = [...state.step.turns, event.turn];
        state.step.revision = event.stepRevision;
        renderTurns();
        scrollConversationToBottom();
        toast('本轮草案已生成。');
      } else if (event.type === 'cancelled') {
        terminal = true;
        if (event.turn) state.step.turns = [...state.step.turns, event.turn];
        if (event.stepRevision) state.step.revision = event.stepRevision;
        renderTurns();
        toast(event.message || '生成已停止。');
      } else if (event.type === 'failed') {
        terminal = true;
        if (!state.generationUserCommitted) state.step.turns = state.step.turns.filter(turn => turn.id !== state.optimisticTurnId);
        if (event.stepRevision) state.step.revision = event.stepRevision;
        renderTurns();
        toast(event.message || '生成失败。', true);
      }
    });
    if (!terminal) throw new Error('生成连接提前结束。');
  } catch (error) {
    if (!state.generationUserCommitted) state.step.turns = state.step.turns.filter(turn => turn.id !== state.optimisticTurnId);
    renderTurns();
    toast(error.message || '生成连接中断。', true);
  } finally {
    state.generating = false;
    state.generationId = '';
    state.optimisticTurnId = '';
    renderGenerationAvailability();
  }
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
  const conversation = document.querySelector('.conversation');
  const follow = conversation.scrollHeight - conversation.scrollTop - conversation.clientHeight < 80;
  const turn = elements.turn_list.querySelector('.turn.is-streaming');
  const content = turn?.querySelector('div');
  if (content) {
    if (content.textContent === '正在连接模型…') content.textContent = '';
    content.textContent += delta;
  }
  if (follow) scrollConversationToBottom();
}

function scrollConversationToBottom() {
  const conversation = document.querySelector('.conversation');
  conversation.scrollTop = conversation.scrollHeight;
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
    applyState(payload);
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
    const payload = await api(`/api/projects/${encodeURIComponent(projectId)}/activate`, { method: 'POST' });
    applyState(payload);
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
    applyState(payload);
    toast('项目已移入回收目录。');
  } catch (error) { toast(error.message, true); }
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
elements.reload_button.addEventListener('click', async () => {
  try {
    await flushPendingPatch();
    await loadState();
  } catch (error) { toast(error.message, true); }
});
elements.project_brief.addEventListener('input', () => queueProjectPatch({ brief: elements.project_brief.value }));
elements.project_brief.addEventListener('change', () => flushPendingPatch().catch(() => {}));
elements.project_name.addEventListener('input', () => queueProjectPatch({ name: elements.project_name.value }));
elements.project_name.addEventListener('change', () => flushPendingPatch().catch(() => {}));
elements.import_preset_button.addEventListener('click', () => elements.preset_file.click());
elements.import_regex_button.addEventListener('click', () => elements.regex_file.click());
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

loadState().then(() => {
  elements.app.setAttribute('aria-busy', 'false');
  elements.service_status.classList.add('is-ready');
  elements.service_status.querySelector('span').textContent = '独立环境已就绪';
}).catch(error => {
  elements.app.setAttribute('aria-busy', 'false');
  elements.service_status.querySelector('span').textContent = '本地资料读取失败';
  toast(error.message, true);
});
