import studio from './auto.js';
const MODE_KEY = 'auto-card-studio:mode:v1';
let firstOpen = true;
function installSwitch() {
    const actions = document.querySelector('#auto-card-studio .acs-topbar-actions');
    if (!actions || actions.querySelector('[data-studio-mode-switch]')) return;
    const button = document.createElement('button'); button.type = 'button';
    button.className = 'acs-icon-button'; button.dataset.studioModeSwitch = '';
    button.innerHTML = '<i class="fa-solid fa-right-left" aria-hidden="true"></i>';
    button.addEventListener('click', () => switchMode(studio.getMode() === 'simple' ? 'auto' : 'simple'));
    actions.prepend(button);
    button.title = studio.getMode() === 'simple' ? '简洁模式 · 切换到 AUTO 模式' : 'AUTO 模式 · 切换到简洁模式';
    button.setAttribute('aria-label', button.title);
}
export async function openStudioMode() {
    await studio.open();
    if (firstOpen) {
        firstOpen = false;
        const remembered = localStorage.getItem(MODE_KEY);
        if (remembered === 'auto' || remembered === 'simple') await studio.setMode(remembered);
    }
    installSwitch();
}
export async function switchMode(nextMode) {
    if (studio.isGenerating()) { window.toastr?.warning('请先停止当前生成，再切换模式。'); return; }
    await studio.setMode(nextMode);
}
window.__autoCardStudioOpenHandler = () => openStudioMode().catch(error => {
    console.error('[角色创作台] 打开模式失败', error); window.toastr?.error(error.message);
});
