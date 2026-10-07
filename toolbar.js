// Own the launcher container; quick replies and TavernHelper own their .qr--buttons.
const ID = 'auto-card-studio-extension-shortcut';
const FALLBACK_ID = 'auto-card-studio-extension-shortcuts';

function installShortcut() {
    const form = document.querySelector('#send_form');
    if (!form) return;
    const bar = form.querySelector('#qr--bar');
    const row = bar?.querySelector(':scope > .qr--buttons') || bar;
    let container = document.getElementById(FALLBACK_ID);
    if (!container) {
        container = document.createElement('div');
        container.id = FALLBACK_ID;
        container.style.cssText = 'display:contents;';
    }
    if (row && container.parentElement !== row) row.append(container);
    else if (!bar && container.parentElement !== form) form.prepend(container);
    let button = document.getElementById(ID);
    if (!button) {
        button = document.createElement('button');
        button.id = ID;
        button.type = 'button';
        button.className = 'qr--button menu_button interactable';
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
