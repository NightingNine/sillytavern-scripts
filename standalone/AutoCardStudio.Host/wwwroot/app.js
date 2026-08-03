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
  saveChain: Promise.resolve(),
  pendingPatch: {},
  collapsedPhases: new Set(JSON.parse(localStorage.getItem('acs:collapsed-phases') || '[]')),
};

const elements = Object.fromEntries([
  'app', 'service-status', 'reload-button', 'close-button', 'project-menu-button', 'project-button-name',
  'progress-copy', 'step-rail', 'new-project-button', 'project-menu', 'project-menu-close', 'project-list',
  'step-number', 'step-title', 'step-goal', 'requirement-chip', 'station-label', 'guide-title',
  'guide-description', 'guide-prompts', 'brief-label', 'project-brief', 'save-status', 'project-name',
  'modal-backdrop', 'confirm-modal', 'confirm-title', 'confirm-message', 'confirm-cancel', 'confirm-accept', 'toast-region',
].map(id => [id.replaceAll('-', '_'), document.getElementById(id)]));

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: options.body ? { 'Content-Type': 'application/json', ...(options.headers || {}) } : options.headers,
    ...options,
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
  const payload = await api(`/api/state${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`);
  applyState(payload);
  setSaveStatus('所有更改已保存', 'is-saved');
}

function applyState(payload) {
  state.index = payload.index;
  state.project = payload.project;
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
  elements.brief_label.textContent = `创作母题 · ${step.name}`;
  const prompts = [
    `这一步最需要确定的核心边界是什么？`,
    `哪些已有设计必须在“${step.name}”中保持一致？`,
  ];
  elements.guide_prompts.replaceChildren(...prompts.map(text => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
  document.querySelector('.conversation').scrollTop = 0;
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

function togglePhase(phaseId) {
  if (state.collapsedPhases.has(phaseId)) state.collapsedPhases.delete(phaseId);
  else state.collapsedPhases.add(phaseId);
  localStorage.setItem('acs:collapsed-phases', JSON.stringify([...state.collapsedPhases]));
  renderSteps();
}

async function selectStep(number) {
  if (number === state.project.currentStep) return;
  try {
    // 先落盘输入框中的待保存内容，再切换步骤，避免快速操作互相覆盖。
    await flushPendingPatch();
    await persistPatch({ currentStep: number });
    renderSteps();
    renderCurrentStep();
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

async function createProject() {
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
  if (projectId === state.project.id) { toggleProjectMenu(false); return; }
  try {
    await flushPendingPatch();
    const payload = await api(`/api/projects/${encodeURIComponent(projectId)}/activate`, { method: 'POST' });
    applyState(payload);
    toggleProjectMenu(false);
  } catch (error) { toast(error.message, true); }
}

async function deleteProject(projectSummary) {
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
elements.close_button.addEventListener('click', async () => {
  const accepted = await confirmAction('关闭创作台？', '会先等待当前保存完成，再停止本地服务。', '保存并关闭');
  if (!accepted) return;
  try {
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
