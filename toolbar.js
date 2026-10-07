// Keep the native extension launcher available when quick replies rebuild their bar.
const ID = 'auto-card-studio-extension-shortcut';
const FALLBACK_ID = 'auto-card-studio-extension-shortcuts';

function installShortcut() {
    const form = document.querySelector('#send_form');
    if (!form) return;
    let container = document.querySelector('#qr--bar .qr--buttons');
    if (!container) {
        container = document.getElementById(FALLBACK_ID);
        if (!container) {
            container = document.createElement('div');
            container.id = FALLBACK_ID;
            container.className = 'qr--buttons';
            container.style.cssText = 'display:flex;gap:4px;width:100%;justify-content:center;';
            form.prepend(container);
        }
    }
    let button = document.getElementById(ID);
    if (!button) {
        button = document.createElement('button');
        button.id = ID;
        button.type = 'button';
        button.className = 'qr--button menu_button';
        button.textContent = '🔨';
        button.title = '打开 A.U.T.O 角色卡创作台';
        button.setAttribute('aria-label', button.title);
        button.addEventListener('click', () => window.__autoCardStudioOpenHandler?.());
    }
    if (button.parentElement !== container) container.append(button);
    if (container.id !== FALLBACK_ID) document.getElementById(FALLBACK_ID)?.remove();
}

const observer = new MutationObserver(installShortcut);
observer.observe(document.body, { childList: true, subtree: true });
installShortcut();
window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
