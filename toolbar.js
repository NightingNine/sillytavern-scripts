// Own the launcher container; quick replies and TavernHelper own their .qr--buttons.
const ID = 'auto-card-studio-extension-shortcut';
const FALLBACK_ID = 'auto-card-studio-extension-shortcuts';

function installShortcut() {
    const form = document.querySelector('#send_form');
    if (!form) return;
    const bar = form.querySelector('#qr--bar');
    let container = document.getElementById(FALLBACK_ID);
    if (!container) {
        container = document.createElement('div');
        container.id = FALLBACK_ID;
        container.style.cssText = 'display:flex;flex:0 0 auto;gap:4px;align-items:center;justify-content:center;order:1;';
    }
    if (bar && container.parentElement !== bar) bar.append(container);
    else if (!bar && container.parentElement !== form) form.prepend(container);
    let button = document.getElementById(ID);
    if (!button) {
        button = document.createElement('button');
        button.id = ID;
        button.type = 'button';
        button.className = 'menu_button interactable';
        button.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;margin:0;padding:2px 6px;min-width:28px;font-size:13px;line-height:1.4;';
        button.textContent = '🔨';
        button.title = '打开 A.U.T.O 角色卡创作台';
        button.setAttribute('aria-label', button.title);
        button.addEventListener('click', () => window.__autoCardStudioOpenHandler?.());
    }
    if (button.parentElement !== container) container.append(button);
}

const observer = new MutationObserver(installShortcut);
observer.observe(document.body, { childList: true, subtree: true });
installShortcut();
window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
