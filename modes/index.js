import autoMode from './auto.js';
import simpleMode from './simple.js';
const MODE_KEY = 'auto-card-studio:mode:v1';
let currentMode = localStorage.getItem(MODE_KEY) === 'simple' ? 'simple' : 'auto';
const modes = { auto: autoMode, simple: simpleMode };
function installAutoSwitch() {
    const actions = document.querySelector('#auto-card-studio .acs-topbar-actions');
    if (!actions || actions.querySelector('[data-studio-mode-switch]')) return;
    const button = document.createElement('button'); button.type = 'button';
    button.className = 'acs-icon-button'; button.dataset.studioModeSwitch = '';
    button.title = 'AUTO 模式 · 切换到简洁模式'; button.setAttribute('aria-label', '切换到简洁模式');
    button.innerHTML = '<i class="fa-solid fa-right-left" aria-hidden="true"></i><span class="acs-visually-hidden">切换到简洁模式</span>';
    button.addEventListener('click', () => switchMode('simple'));
    actions.prepend(button);
}
export async function openStudioMode() {
    await modes[currentMode].open(switchMode);
    if (currentMode === 'auto') installAutoSwitch();
}
export async function switchMode(nextMode) {
    if (!(nextMode in modes) || nextMode === currentMode) return;
    if (modes[currentMode].isGenerating() || !modes[currentMode].close()) {
        window.toastr?.warning('请先停止当前生成，再切换模式。'); return;
    }
    const previousMode = currentMode;
    try {
        localStorage.setItem(MODE_KEY, nextMode); currentMode = nextMode;
        await openStudioMode();
    } catch (error) {
        currentMode = previousMode; localStorage.setItem(MODE_KEY, previousMode);
        window.toastr?.error(`模式切换失败：${error.message}`);
        await openStudioMode();
    }
}
window.__autoCardStudioOpenHandler = () => openStudioMode().catch(error => {
    console.error('[角色创作台] 打开模式失败', error); window.toastr?.error(error.message);
});
