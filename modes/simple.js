import { SIMPLE_STORAGE_KEY, fields, normalizeSimpleState, buildSimpleRequest } from './simple-state.js';
let state;
try { state = normalizeSimpleState(JSON.parse(localStorage.getItem(SIMPLE_STORAGE_KEY) || '{}')); }
catch (error) { console.warn('[角色创作台] 简洁模式存储读取失败', error); state = normalizeSimpleState(); }
let root, busy = false, generationId = null;
const errorToast = error => window.toastr?.error(error.message || String(error), '角色创作台');
function save() { localStorage.setItem(SIMPLE_STORAGE_KEY, JSON.stringify(state)); }
function renderTurns() {
    const turns = root.querySelector('[data-turns]'); turns.replaceChildren();
    for (const turn of state.turns) {
        const article = document.createElement('article'), label = document.createElement('strong'), text = document.createElement('div');
        label.textContent = turn.role === 'user' ? state.definitions.creatorRole : state.definitions.aiRole;
        text.textContent = turn.content; article.append(label, text); turns.append(article);
    }
    root.querySelector('[data-status]').textContent = busy ? '正在生成…' : '使用当前酒馆 API 连接';
    for (const selector of ['[data-generate]', '[data-switch]', '[data-clear]', '[data-input]']) root.querySelector(selector).disabled = busy;
    root.querySelector('[data-stop]').hidden = !busy;
    for (const control of root.querySelectorAll('[data-definition]')) control.disabled = busy;
    turns.scrollTop = turns.scrollHeight;
}
async function generate() {
    if (busy || !state.draft.trim()) return;
    const helper = window.TavernHelper;
    if (!helper?.generateRaw) return errorToast(new Error('请先启用酒馆助手扩展。'));
    busy = true; generationId = `card-studio-simple-${crypto.randomUUID()}`;
    const request = buildSimpleRequest(state, generationId), userInput = state.draft;
    renderTurns();
    try {
        const response = await helper.generateRaw(request);
        if (typeof response !== 'string') throw new Error('生成接口未返回文本。');
        state.turns.push({ role: 'user', content: userInput }, { role: 'assistant', content: response });
        state.draft = ''; root.querySelector('[data-input]').value = ''; save();
    } catch (error) { errorToast(error); }
    finally { busy = false; generationId = null; renderTurns(); }
}
function build(onSwitch) {
    const style = document.createElement('style');
    style.textContent = `
    #acs-simple-mode{position:fixed;inset:24px;z-index:3100;color:#eee5d9;background:#292722;border:1px solid #59534b;border-radius:18px;box-shadow:0 20px 80px #000a;display:grid;grid-template-rows:auto minmax(0,1fr);font:15px/1.6 system-ui,sans-serif}
    #acs-simple-mode[hidden]{display:none}#acs-simple-mode *{box-sizing:border-box}
    #acs-simple-mode header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 24px;border-bottom:1px solid #59534b}
    #acs-simple-mode h1{margin:0;font-size:22px}#acs-simple-mode header small{color:#c6ae96}
    #acs-simple-mode button{font:inherit;padding:7px 12px;border-radius:8px;border:1px solid #726455;background:#38352f;color:inherit;cursor:pointer}#acs-simple-mode button:disabled{opacity:.5;cursor:default}
    #acs-simple-mode .simple-layout{display:grid;grid-template-columns:340px minmax(0,1fr);min-height:0}
    #acs-simple-mode aside{padding:20px;overflow:auto;border-right:1px solid #59534b}
    #acs-simple-mode label{display:grid;gap:6px;margin-bottom:16px;font-size:14px}
    #acs-simple-mode input,#acs-simple-mode textarea{width:100%;font:16px/1.6 system-ui,sans-serif;color:#eee5d9;background:#302e29;border:1px solid #59534b;border-radius:8px;padding:9px 12px;resize:vertical}
    #acs-simple-mode main{display:grid;grid-template-rows:minmax(0,1fr) auto;min-height:0}
    #acs-simple-mode [data-turns]{overflow:auto;padding:24px}#acs-simple-mode article{padding:16px;margin-bottom:16px;background:#302e29;border-radius:12px}
    #acs-simple-mode article strong{color:#dab18a}#acs-simple-mode article div{white-space:pre-wrap;overflow-wrap:anywhere;font-size:16px;margin-top:8px}
    #acs-simple-mode .simple-composer{padding:18px 24px;border-top:1px solid #59534b}#acs-simple-mode .simple-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}#acs-simple-mode [data-status]{flex:1;color:#c6ae96;font-size:13px}
    #acs-simple-mode [data-generate]{background:#78503b}#acs-simple-mode [hidden]{display:none!important}
    @media(max-width:760px){#acs-simple-mode{inset:0;border-radius:0}#acs-simple-mode header{padding:12px}#acs-simple-mode h1{font-size:18px}#acs-simple-mode .simple-layout{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(120px,35%) minmax(0,1fr)}#acs-simple-mode aside{border-right:0;border-bottom:1px solid #59534b;padding:12px}#acs-simple-mode [data-turns]{padding:12px}#acs-simple-mode .simple-composer{padding:12px}}
    `;
    document.head.append(style);
    root = document.createElement('section'); root.id = 'acs-simple-mode'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'acs-simple-title');
    root.innerHTML = `<header><div><small>简洁模式</small><h1 id="acs-simple-title">角色创作台</h1></div><div><button type="button" data-switch title="切换到 AUTO 模式" aria-label="切换到 AUTO 模式"><i class="fa-solid fa-right-left" aria-hidden="true"></i> AUTO 模式</button> <button type="button" data-close aria-label="关闭创作台"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div></header><div class="simple-layout"><aside aria-label="基础系统提示词"></aside><main><div data-turns aria-live="polite"></div><div class="simple-composer"><textarea data-input rows="3" aria-label="创作要求" placeholder="描述想创作的角色，或提出修改要求"></textarea><div class="simple-actions"><span data-status></span><button type="button" data-clear>清空对话</button><button type="button" data-stop hidden>停止</button><button type="button" data-generate>生成</button></div></div></main></div>`;
    for (const [key, label, , multiline] of fields) {
        const wrapper = document.createElement('label'); wrapper.textContent = label;
        const input = document.createElement(multiline ? 'textarea' : 'input'); if (multiline) input.rows = 4;
        input.dataset.definition = key; input.value = state.definitions[key];
        input.addEventListener('input', () => { state.definitions[key] = input.value; try { save(); } catch (e) { errorToast(e); } });
        wrapper.append(input); root.querySelector('aside').append(wrapper);
    }
    const input = root.querySelector('[data-input]'); input.value = state.draft;
    input.addEventListener('input', () => { state.draft = input.value; try { save(); } catch (e) { errorToast(e); } });
    root.querySelector('[data-switch]').addEventListener('click', () => onSwitch('auto'));
    root.querySelector('[data-close]').addEventListener('click', close);
    root.querySelector('[data-generate]').addEventListener('click', generate);
    root.querySelector('[data-stop]').addEventListener('click', () => window.TavernHelper?.stopGenerationById?.(generationId));
    root.querySelector('[data-clear]').addEventListener('click', () => { if (busy) return; state.turns = []; try { save(); } catch (e) { errorToast(e); } renderTurns(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !root.hidden) close(); });
    document.body.append(root); renderTurns();
}
function close() {
    if (busy) { window.toastr?.warning('请先停止当前生成。'); return false; }
    if (root) root.hidden = true;
    return true;
}
export default {
    open(onSwitch) { if (!root) build(onSwitch); root.hidden = false; root.querySelector('[data-input]').focus(); },
    close, isGenerating: () => busy,
};
