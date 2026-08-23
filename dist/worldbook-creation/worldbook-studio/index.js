// 世界书创作台 v0.1.0 · 酒馆助手单文件脚本
// 酒馆助手脚本运行在隐藏 iframe 中，界面和持久化入口均显式指向主页面。
const hostWindow = window.parent;
const document = hostWindow.document;
const localStorage = hostWindow.localStorage;
const jQuery = hostWindow.jQuery;
const toastr = hostWindow.toastr || globalThis.toastr;
const HostEvent = hostWindow.Event;
const HostBlob = hostWindow.Blob;
const HostURL = hostWindow.URL;
const requestAnimationFrame = hostWindow.requestAnimationFrame.bind(hostWindow);
const structuredClone = hostWindow.structuredClone.bind(hostWindow);

const VERSION = '0.1.0';
const RUNTIME_KEY = '__WORLDBOOK_STUDIO_RUNTIME__';
const STYLE_ID = 'worldbook-studio-runtime-style';
let helper = null;
const world_names = [];

const POSITION_TO_NUMBER = {
    before_character_definition: 0,
    after_character_definition: 1,
    before_author_note: 2,
    after_author_note: 3,
    at_depth: 4,
    before_example_messages: 5,
    after_example_messages: 6,
    outlet: 7,
};
const NUMBER_TO_POSITION = Object.fromEntries(Object.entries(POSITION_TO_NUMBER).map(([key, value]) => [value, key]));
const ROLE_TO_NUMBER = { system: 0, user: 1, assistant: 2 };
const NUMBER_TO_ROLE = { 0: 'system', 1: 'user', 2: 'assistant' };
const LOGIC_TO_NUMBER = { and_any: 0, not_all: 1, not_any: 2, and_all: 3 };
const NUMBER_TO_LOGIC = { 0: 'and_any', 1: 'not_all', 2: 'not_any', 3: 'and_all' };

async function waitForTavernHelper(timeout = 12000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
        if (globalThis.TavernHelper?.getWorldbookNames) return globalThis.TavernHelper;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('未检测到酒馆助手世界书接口，请确认酒馆助手已启用。');
}

function keywordText(value) {
    return typeof value === 'string' ? value : String(value ?? '');
}

function sameKeywords(current, original) {
    return JSON.stringify((current || []).map(keywordText)) === JSON.stringify((original || []).map(keywordText));
}

// 界面继续使用熟悉的 SillyTavern 字段名；__helper 保存未编辑字段，回写时不会丢数据。
function helperEntryToInternal(entry, index) {
    const extra = entry.extra || {};
    const strategy = entry.strategy || {};
    const secondary = strategy.keys_secondary || {};
    const position = entry.position || {};
    const recursion = entry.recursion || {};
    return {
        uid: Number(entry.uid),
        comment: entry.name || '',
        content: entry.content || '',
        disable: entry.enabled === false,
        constant: strategy.type === 'constant',
        vectorized: strategy.type === 'vectorized',
        key: (strategy.keys || []).map(keywordText),
        keysecondary: (secondary.keys || []).map(keywordText),
        position: POSITION_TO_NUMBER[position.type] ?? 0,
        role: ROLE_TO_NUMBER[position.role] ?? 0,
        depth: Number(position.depth ?? 4),
        order: Number(position.order ?? 100),
        outletName: extra.outletName ?? extra.outlet_name ?? '',
        selectiveLogic: LOGIC_TO_NUMBER[secondary.logic] ?? 0,
        probability: Number(entry.probability ?? 100),
        useProbability: true,
        scanDepth: strategy.scan_depth === 'same_as_global' ? null : Number(strategy.scan_depth),
        caseSensitive: extra.caseSensitive === true,
        matchWholeWords: extra.matchWholeWords === true,
        excludeRecursion: recursion.prevent_incoming === true,
        preventRecursion: recursion.prevent_outgoing === true,
        ignoreBudget: extra.ignoreBudget === true,
        group: extra.group || '',
        groupWeight: Number(extra.groupWeight ?? 100),
        automationId: extra.automationId || '',
        displayIndex: Number(extra.displayIndex ?? index),
        __helper: structuredClone(entry),
    };
}

function internalEntryToHelper(entry) {
    const source = entry.__helper || {};
    const originalPrimary = source.strategy?.keys || [];
    const originalSecondary = source.strategy?.keys_secondary?.keys || [];
    const extra = {
        ...(source.extra || {}),
        outletName: entry.outletName || '',
        caseSensitive: entry.caseSensitive === true,
        matchWholeWords: entry.matchWholeWords === true,
        ignoreBudget: entry.ignoreBudget === true,
        group: entry.group || '',
        groupWeight: Number(entry.groupWeight ?? 100),
        automationId: entry.automationId || '',
        displayIndex: Number(entry.displayIndex ?? entry.uid),
    };
    return {
        ...source,
        uid: Number(entry.uid),
        name: entry.comment || '',
        enabled: !entry.disable,
        strategy: {
            ...(source.strategy || {}),
            type: entry.vectorized ? 'vectorized' : entry.constant ? 'constant' : 'selective',
            keys: sameKeywords(entry.key, originalPrimary) ? originalPrimary : (entry.key || []),
            keys_secondary: {
                ...(source.strategy?.keys_secondary || {}),
                logic: NUMBER_TO_LOGIC[entry.selectiveLogic] || 'and_any',
                keys: sameKeywords(entry.keysecondary, originalSecondary) ? originalSecondary : (entry.keysecondary || []),
            },
            scan_depth: entry.scanDepth == null ? 'same_as_global' : Number(entry.scanDepth),
        },
        position: {
            ...(source.position || {}),
            type: NUMBER_TO_POSITION[entry.position] || 'before_character_definition',
            role: NUMBER_TO_ROLE[entry.role] || 'system',
            depth: Number(entry.depth ?? 4),
            order: Number(entry.order ?? 100),
        },
        content: entry.content || '',
        probability: Number(entry.probability ?? 100),
        recursion: {
            prevent_incoming: entry.excludeRecursion === true,
            prevent_outgoing: entry.preventRecursion === true,
            delay_until: source.recursion?.delay_until ?? null,
        },
        effect: {
            sticky: source.effect?.sticky ?? null,
            cooldown: source.effect?.cooldown ?? null,
            delay: source.effect?.delay ?? null,
        },
        extra,
    };
}

function helperEntriesToData(entries) {
    const mapped = entries.map(helperEntryToInternal);
    return { entries: Object.fromEntries(mapped.map(entry => [String(entry.uid), entry])) };
}

function dataToHelperEntries(data) {
    return Object.values(data?.entries || {})
        .sort((a, b) => (a.displayIndex ?? a.uid) - (b.displayIndex ?? b.uid))
        .map(internalEntryToHelper);
}

async function updateWorldInfoList() {
    world_names.splice(0, world_names.length, ...helper.getWorldbookNames().map(String).sort((a, b) => a.localeCompare(b, 'zh-CN')));
}

async function loadWorldInfo(name) {
    return helperEntriesToData(await helper.getWorldbook(name));
}

async function saveWorldInfo(name, data) {
    await helper.replaceWorldbook(name, dataToHelperEntries(data), { render: 'immediate' });
}

async function createNewWorldInfo(name) {
    const created = await helper.createWorldbook(name, []);
    await updateWorldInfoList();
    return created;
}

async function deleteWorldInfo(name) {
    const deleted = await helper.deleteWorldbook(name);
    await updateWorldInfoList();
    return deleted;
}

function createWorldInfoEntry(_name, data) {
    const entries = Object.values(data.entries || {});
    const uid = Math.max(-1, ...entries.map(entry => Number(entry.uid))) + 1;
    const entry = helperEntryToInternal({
        uid,
        name: '',
        enabled: true,
        strategy: { type: 'selective', keys: [], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' },
        position: { type: 'before_character_definition', role: 'system', depth: 4, order: 100 },
        content: '',
        probability: 100,
        recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
        effect: { sticky: null, cooldown: null, delay: null },
        extra: { displayIndex: entries.length },
    }, entries.length);
    data.entries[String(uid)] = entry;
    return entry;
}

async function moveWorldInfoEntry(sourceName, targetName, uid, { deleteOriginal = false } = {}) {
    const source = await loadWorldInfo(sourceName);
    const target = await loadWorldInfo(targetName);
    const original = source.entries[String(uid)];
    if (!original) throw new Error(`找不到 UID ${uid} 的条目`);
    const copy = createWorldInfoEntry(targetName, target);
    Object.assign(copy, structuredClone(original), { uid: copy.uid, displayIndex: Object.keys(target.entries).length - 1 });
    target.entries[String(copy.uid)] = copy;
    await saveWorldInfo(targetName, target);
    if (deleteOriginal) {
        delete source.entries[String(uid)];
        await saveWorldInfo(sourceName, source);
    }
}

async function importWorldInfo(file) {
    const response = await helper.importRawWorldbook(file.name, await file.text());
    if (response && 'ok' in response && !response.ok) throw new Error(`导入失败：${response.status}`);
    await updateWorldInfoList();
}

async function replaceCurrentBindings(oldName, newName) {
    const warnings = [];
    try {
        const globals = helper.getGlobalWorldbookNames?.() || [];
        if (globals.includes(oldName)) await helper.rebindGlobalWorldbooks(globals.map(name => name === oldName ? newName : name));
    } catch { warnings.push('全局世界书'); }
    try {
        const current = helper.getCharWorldbookNames?.('current');
        if (current?.primary === oldName || current?.additional?.includes(oldName)) {
            await helper.rebindCharWorldbooks('current', {
                primary: current.primary === oldName ? newName : current.primary,
                additional: (current.additional || []).map(name => name === oldName ? newName : name),
            });
        }
    } catch { warnings.push('当前角色卡'); }
    try {
        if (helper.getChatWorldbookName?.('current') === oldName) await helper.rebindChatWorldbook('current', newName);
    } catch { warnings.push('当前聊天'); }
    return warnings;
}

async function renameWorldInfo(oldName, data, newName) {
    if (helper.getWorldbookNames().includes(newName)) throw new Error('已经存在同名世界书');
    await helper.createWorldbook(newName, dataToHelperEntries(data));
    const warnings = await replaceCurrentBindings(oldName, newName);
    const deleted = await helper.deleteWorldbook(oldName);
    if (!deleted) throw new Error('新世界书已创建，但旧世界书删除失败');
    await updateWorldInfoList();
    if (warnings.length) toastr.warning(`已完成重命名，但未能检查：${warnings.join('、')}。`);
}

async function getTokenCountAsync(content) {
    const counter = hostWindow.SillyTavern?.getContext?.().getTokenCountAsync;
    return typeof counter === 'function' ? counter(content) : Math.ceil(String(content).length / 2);
}

const STUDIO_CSS = ":root {\n    --wbs-bg: #1e1c19;\n    --wbs-panel: #292722;\n    --wbs-panel-2: #302e29;\n    --wbs-line: #59534b;\n    --wbs-line-soft: rgba(232, 224, 212, .12);\n    --wbs-text: #e8e2d8;\n    --wbs-soft: #d0c8bd;\n    --wbs-muted: #aba297;\n    --wbs-copper: #d97757;\n    --wbs-violet: #b7a3cf;\n    --wbs-gold: #d3ad72;\n    --wbs-green: #93bd91;\n    --wbs-red: #d9847f;\n}\n\nbody.wbs-open { overflow: hidden; }\nbody.wbs-resizing, body.wbs-resizing * { cursor: col-resize !important; user-select: none !important; }\n.wbs-overlay { position: fixed; inset: 0; z-index: 99999; width: 100vw; height: 100vh; height: 100dvh; padding: clamp(8px, 1.4vw, 24px); color: var(--wbs-text); background: rgba(17, 15, 13, .72); backdrop-filter: blur(14px); font: 14px/1.45 Inter, \"Noto Sans SC\", \"Microsoft YaHei UI\", \"Microsoft YaHei\", system-ui, sans-serif; }\n.wbs-app { position: relative; isolation: isolate; height: 100%; display: grid; grid-template-rows: 74px minmax(0, 1fr) 46px; overflow: hidden; background: radial-gradient(circle at 88% 8%, rgba(183, 163, 207, .08), transparent 27%), radial-gradient(circle at 10% 84%, rgba(217, 119, 87, .07), transparent 25%), #2b2925; border: 1px solid rgba(217, 202, 182, .22); border-radius: 22px; box-shadow: 0 28px 80px rgba(10, 9, 8, .42); }\n.wbs-app::before { position: absolute; inset: 0; z-index: -1; background-image: linear-gradient(rgba(232, 224, 212, .025) 1px, transparent 1px), linear-gradient(90deg, rgba(232, 224, 212, .025) 1px, transparent 1px); background-size: 42px 42px; content: \"\"; mask-image: linear-gradient(to bottom, #000, transparent 72%); pointer-events: none; }\n.wbs-app button, .wbs-app input, .wbs-app textarea, .wbs-app select { font: inherit; }\n.wbs-app button { color: var(--wbs-text); background: #302c26; border: 1px solid var(--wbs-line); border-radius: 10px; padding: 8px 11px; cursor: pointer; transition: border-color .15s, background .15s, transform .15s; }\n.wbs-app button:hover:not(:disabled) { border-color: #796353; background: #3a342d; }\n.wbs-app button:active:not(:disabled) { transform: translateY(1px); }\n.wbs-app button:focus-visible, .wbs-app input:focus-visible, .wbs-app textarea:focus-visible, .wbs-app select:focus-visible { outline: 2px solid var(--wbs-copper); outline-offset: 2px; }\n.wbs-app button:disabled { opacity: .42; cursor: default; }\n.wbs-app .wbs-primary { background: #493127; border-color: #81513e; }\n.wbs-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 0 20px 0 26px; border-bottom: 1px solid var(--wbs-line); background: #24211d; }\n.wbs-brand { display: flex; align-items: center; gap: 13px; min-width: 235px; }\n.wbs-brand small, .wbs-phase small, .wbs-drawer-head small { display: block; color: var(--wbs-copper); font: 700 10px/1.2 ui-monospace, monospace; letter-spacing: .18em; }\n.wbs-brand h1 { margin: 2px 0 0; font-family: \"STKaiti\", \"KaiTi\", serif; font-size: 24px; font-weight: 600; letter-spacing: .04em; }\n.wbs-mark { width: 36px; height: 36px; display: grid; place-items: center; color: var(--wbs-gold); border: 1px solid #6d5943; border-radius: 50% 42% 50% 42%; transform: rotate(-7deg); }\n.wbs-mark i { transform: rotate(7deg); }\n.wbs-header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }\n.wbs-icon { width: 38px; height: 38px; padding: 0 !important; display: inline-grid; place-items: center; }\n.wbs-save-state { margin-right: 8px; padding: 7px 10px; color: var(--wbs-green); background: #2c3129; border-radius: 999px; font-size: 12px; white-space: nowrap; }\n.wbs-save-state.dirty { color: #e3b07c; background: #392e24; }\n.wbs-save-state i { margin-right: 5px; font-size: 8px; }\n.wbs-workspace { --wbs-left-width: clamp(230px, 17vw, 360px); --wbs-right-width: clamp(300px, 24vw, 480px); display: grid; grid-template-columns: var(--wbs-left-width) 8px minmax(360px, 1fr) 8px var(--wbs-right-width); min-height: 0; }\n.wbs-left, .wbs-right { min-height: 0; background: #292722; }\n.wbs-left { display: flex; flex-direction: column; padding: 18px 14px 12px; }\n.wbs-right { min-width: 0; }\n.wbs-resizer { position: relative; z-index: 8; min-width: 8px; cursor: col-resize; background: #292722; outline: 0; touch-action: none; }\n.wbs-resizer::before { position: absolute; inset: 0 3px; background: var(--wbs-line); content: \"\"; transition: inset .14s, background .14s, box-shadow .14s; }\n.wbs-resizer span { position: absolute; top: 50%; left: 50%; width: 3px; height: 34px; border-radius: 999px; background: rgba(232, 224, 212, .14); opacity: 0; transform: translate(-50%, -50%); transition: opacity .14s, height .14s, background .14s; }\n.wbs-resizer:hover::before, .wbs-resizer:focus-visible::before, .wbs-resizer.dragging::before { inset: 0 2px; background: rgba(217, 119, 87, .42); box-shadow: 0 0 10px rgba(217, 119, 87, .16); }\n.wbs-resizer:hover span, .wbs-resizer:focus-visible span, .wbs-resizer.dragging span { height: 48px; background: var(--wbs-copper); opacity: .9; }\n.wbs-project-label { margin-bottom: 7px; color: var(--wbs-muted); font-size: 11px; font-weight: 700; letter-spacing: .08em; }\n.wbs-world-row { display: grid; grid-template-columns: minmax(0, 1fr) 38px; gap: 7px; }\n.wbs-world-row select, .wbs-app input, .wbs-app textarea, .wbs-app select { width: 100%; box-sizing: border-box; color: var(--wbs-text); background: #211f1b; border: 1px solid var(--wbs-line); border-radius: 9px; padding: 9px 10px; }\n.wbs-world-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 7px; }\n.wbs-progress { height: 3px; margin: 16px 0; overflow: hidden; background: #3b3731; border-radius: 2px; }\n.wbs-progress span { display: block; height: 100%; background: linear-gradient(90deg, var(--wbs-copper), var(--wbs-gold)); transition: width .25s; }\n.wbs-list-head { display: flex; justify-content: space-between; margin-bottom: 9px; }\n.wbs-list-head span { color: var(--wbs-muted); font: 11px ui-monospace, monospace; }\n.wbs-search { min-height: 38px; display: grid; grid-template-columns: 18px minmax(0, 1fr); align-items: center; gap: 7px; padding: 0 10px; background: #302e29; border: 1px solid var(--wbs-line-soft); border-radius: 9px; transition: border-color .14s, background .14s, box-shadow .14s; }\n.wbs-search:hover { border-color: var(--wbs-line); background: #34312c; }\n.wbs-search:focus-within { border-color: rgba(217, 119, 87, .58); background: #34312c; box-shadow: 0 0 0 3px rgba(217, 119, 87, .1); }\n.wbs-search i { color: var(--wbs-muted); font-size: 11px; text-align: center; }\n#worldbook-studio-overlay .wbs-search input { min-width: 0; min-height: 36px; padding: 0 !important; border: 0 !important; outline: 0 !important; background: transparent !important; box-shadow: none !important; color: var(--wbs-text-soft) !important; font-size: 11px; }\n.wbs-filters { display: flex; gap: 5px; margin: 9px 0; overflow-x: auto; }\n.wbs-filters button { padding: 5px 9px; border-radius: 999px; color: var(--wbs-muted); font-size: 11px; white-space: nowrap; }\n.wbs-filters button.active { color: #f0c2a4; border-color: #89543e; background: #452f26; }\n.wbs-entry-list { min-height: 0; flex: 1; overflow: auto; padding-right: 3px; }\n.wbs-entry { position: relative; display: grid; grid-template-columns: 14px minmax(0, 1fr) auto auto; align-items: center; gap: 9px; min-height: 37px; margin-bottom: 2px; padding: 5px 8px; border: 0; border-radius: 9px; cursor: pointer; }\n.wbs-entry-list.batch-mode .wbs-entry { grid-template-columns: 22px 14px minmax(0, 1fr) auto auto; }\n.wbs-entry-list.batch-mode .wbs-entry.checked { background: rgba(217, 119, 87, .11); box-shadow: inset 2px 0 0 var(--wbs-copper); }\n.wbs-entry:hover { color: var(--wbs-text); background: rgba(255, 255, 255, .025); }\n.wbs-entry.selected { background: linear-gradient(90deg, rgba(217, 119, 87, .18), rgba(56, 53, 47, .28)); box-shadow: none; }\n.wbs-entry.checked { border-color: #725344; }\n.wbs-check { width: 22px; height: 26px; display: grid; padding: 0 !important; place-items: center; background: transparent !important; border: 0 !important; }\n.wbs-check-box { width: 14px; height: 14px; display: grid; place-items: center; border: 1px solid rgba(232, 224, 212, .28); border-radius: 4px; background: #2b2925; color: transparent; box-shadow: inset 0 1px 2px rgba(10, 9, 8, .28); transition: border-color .14s, background .14s, color .14s, box-shadow .14s, transform .14s; }\n.wbs-check:hover .wbs-check-box { border-color: rgba(217, 119, 87, .65); background: #38352f; }\n.wbs-check[aria-pressed=\"true\"] .wbs-check-box { border-color: var(--wbs-copper); background: var(--wbs-copper); color: #261b16; box-shadow: 0 0 0 3px rgba(217, 119, 87, .11); }\n.wbs-check:active .wbs-check-box { transform: scale(.9); }\n.wbs-check-box i { font-size: 8px; }\n.wbs-check:focus-visible { outline: 0 !important; }\n.wbs-check:focus-visible .wbs-check-box { outline: 2px solid var(--wbs-copper); outline-offset: 2px; }\n.wbs-entry-state { width: 12px; height: 12px; border: 1px solid currentColor; border-radius: 50%; transition: color .14s, background .14s, box-shadow .14s; }\n.wbs-entry-state.keyword { color: #8eb98d; background: #8eb98d; box-shadow: 0 0 0 3px rgba(89, 132, 91, .22), 0 0 8px rgba(142, 185, 141, .32); }\n.wbs-entry-state.constant { color: #75a7d8; background: #75a7d8; box-shadow: 0 0 0 3px rgba(69, 111, 153, .22), 0 0 8px rgba(117, 167, 216, .32); }\n.wbs-entry-state.disabled { color: #615d56; background: #45423d; box-shadow: none; }\n.wbs-entry-copy { min-width: 0; }\n.wbs-entry-copy strong, .wbs-entry-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.wbs-entry-copy strong { font-size: 13px; }\n.wbs-entry-copy small { margin-top: 2px; color: var(--wbs-muted); font-size: 10px; }\n.wbs-index { color: #756e65; font: 10px ui-monospace, monospace; }\n.wbs-badge { min-width: 18px; padding: 1px 5px; color: #efb18c; background: #4a3025; border-radius: 999px; text-align: center; font-size: 10px; }\n.wbs-empty { padding: 28px 12px; color: var(--wbs-muted); text-align: center; }\n.wbs-left-footer { display: grid; grid-template-columns: 1fr auto; gap: 7px; padding-top: 10px; }\n.wbs-main { min-width: 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden; background: #302e29; }\n.wbs-phase { height: 48px; display: flex; align-items: center; gap: 13px; padding: 0 24px; border-bottom: 1px solid var(--wbs-line); }\n.wbs-phase span { margin-left: auto; padding: 4px 9px; color: var(--wbs-muted); background: #27241f; border-radius: 999px; font-size: 11px; }\n.wbs-editor-scroll { min-height: 0; display: flex; flex-direction: column; flex: 1; gap: 15px; overflow: hidden; padding: 22px 25px; }\n.wbs-field { display: block; }\n.wbs-field > span { display: flex; justify-content: space-between; margin-bottom: 7px; font-weight: 700; }\n.wbs-field > span small { color: var(--wbs-muted); font-weight: 400; }\n.wbs-field textarea { resize: vertical; }\n.wbs-content-field { min-height: 250px; display: flex; flex-direction: column; flex: 1; }\n.wbs-content-field textarea { min-height: 240px; flex: 1; resize: none; font-family: \"Microsoft YaHei UI\", sans-serif; line-height: 1.7; }\n.wbs-empty-state { margin: auto; padding: 30px; text-align: center; }\n.wbs-empty-state > i { color: var(--wbs-copper); font-size: 32px; }\n.wbs-empty-state h2 { margin-bottom: 5px; font-family: \"STKaiti\", serif; }\n.wbs-empty-state p { color: var(--wbs-muted); }\n.wbs-tabs { height: 48px; display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid var(--wbs-line); }\n.wbs-tabs button { position: relative; border: 0; border-radius: 0; background: transparent; color: var(--wbs-muted); }\n.wbs-tabs button.active { color: var(--wbs-text); }\n.wbs-tabs button.active::after { content: \"\"; position: absolute; left: 22%; right: 22%; bottom: 0; height: 2px; background: var(--wbs-copper); }\n.wbs-tabs b { margin-left: 4px; color: var(--wbs-copper); }\n.wbs-settings-scroll { height: calc(100% - 48px); min-width: 0; overflow-y: auto; overflow-x: hidden; padding: 14px; }\n.wbs-settings-group { margin-bottom: 12px; padding: 14px; background: #302c27; border: 1px solid #433d36; border-radius: 12px; }\n.wbs-settings-group h3 { margin: 0 0 12px; color: #c8bdb0; font-size: 12px; letter-spacing: .06em; }\n.wbs-settings-group > label:not(.wbs-toggle-row) { display: block; margin-top: 10px; color: var(--wbs-muted); font-size: 11px; }\n.wbs-settings-group > label input, .wbs-settings-group > label select { margin-top: 5px; }\n.wbs-settings-group > label > .wbs-select { margin-top: 5px; }\n.wbs-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }\n.wbs-grid-2 label { margin-top: 10px; color: var(--wbs-muted); font-size: 11px; }\n.wbs-grid-2 input { margin-top: 5px; }\n.wbs-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 8px 0; cursor: pointer; }\n.wbs-toggle-row span strong, .wbs-toggle-row span small { display: block; }\n.wbs-toggle-row span small { margin-top: 2px; color: var(--wbs-muted); font-size: 10px; }\n.wbs-toggle-row input { position: absolute; opacity: 0; pointer-events: none; }\n.wbs-toggle-row i { position: relative; width: 32px; height: 18px; flex: 0 0 auto; background: #575149; border-radius: 999px; }\n.wbs-toggle-row i::after { content: \"\"; position: absolute; top: 3px; left: 3px; width: 12px; height: 12px; background: #aaa298; border-radius: 50%; transition: left .15s, background .15s; }\n.wbs-toggle-row input:checked + i { background: #48624b; }\n.wbs-toggle-row input:checked + i::after { left: 17px; background: #a8d4a4; }\n.wbs-danger-zone { display: grid; gap: 7px; }\n.wbs-danger-zone h3 { grid-column: 1 / -1; }\n.wbs-danger-zone button:last-child { color: #e29a8f; }\n.wbs-side-empty { padding: 20px; color: var(--wbs-muted); }\n.wbs-footer { display: flex; align-items: center; padding: 0 16px 0 24px; background: #24211d; border-top: 1px solid var(--wbs-line); }\n.wbs-footer [data-role=\"stats\"] { display: flex; gap: 20px; color: var(--wbs-muted); font-size: 11px; }\n.wbs-drawer { position: absolute; top: 74px; right: clamp(8px, 1.4vw, 24px); bottom: 46px; width: min(420px, calc(100vw - 40px)); padding: 20px; box-sizing: border-box; overflow: auto; background: #24211df5; border-left: 1px solid #5c4e43; box-shadow: -24px 0 60px #0007; transform: translateX(110%); transition: transform .2s ease; }\n.wbs-drawer.open { transform: translateX(0); }\n.wbs-drawer-head { display: flex; align-items: center; justify-content: space-between; }\n.wbs-drawer-head h2 { margin: 3px 0 0; font-family: \"STKaiti\", serif; }\n.wbs-drawer-copy { color: var(--wbs-muted); }\n.wbs-issue-list { display: grid; gap: 8px; }\n.wbs-issue { display: grid; grid-template-columns: 22px 1fr; gap: 10px; width: 100%; text-align: left; }\n.wbs-issue span strong, .wbs-issue span small { display: block; }\n.wbs-issue span small { margin-top: 4px; color: var(--wbs-muted); }\n.wbs-issue.error > i { color: var(--wbs-red); }.wbs-issue.warning > i { color: #d99a61; }.wbs-issue.suggestion > i { color: var(--wbs-gold); }\n.wbs-clean { padding: 38px 12px; color: var(--wbs-muted); text-align: center; }.wbs-clean > i { color: var(--wbs-green); font-size: 30px; }\n\n/* 统一创作台内的滚动条，避免系统紫色或亮色滚动条破坏视觉。 */\n.wbs-app * { scrollbar-width: thin; scrollbar-color: #7b5a48 #24211d; }\n.wbs-app *::-webkit-scrollbar { width: 8px; height: 8px; }\n.wbs-app *::-webkit-scrollbar-track { background: #24211d; border-radius: 99px; }\n.wbs-app *::-webkit-scrollbar-thumb { background: #665348; border: 2px solid #24211d; border-radius: 99px; }\n.wbs-app *::-webkit-scrollbar-thumb:hover { background: #8b624e; }\n\n/* 世界书选择器使用自绘列表，替代系统原生下拉菜单。 */\n.wbs-world-row { position: relative; align-items: stretch; }\n.wbs-world-picker { position: relative; min-width: 0; z-index: 30; }\n.wbs-world-trigger { width: 100%; height: 42px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 12px !important; overflow: hidden; background: linear-gradient(180deg, #342f29, #2b2823) !important; border-color: #544b42 !important; box-shadow: inset 0 1px #ffffff08, 0 5px 18px #0002; }\n.wbs-world-trigger > span { min-width: 0; display: flex; align-items: center; gap: 9px; }\n.wbs-world-trigger > span > i { color: var(--wbs-gold); }\n.wbs-world-trigger b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 650; }\n.wbs-world-chevron { color: #8f857a; font-size: 10px; transition: transform .18s; }\n.wbs-world-picker.open .wbs-world-trigger { border-color: #9c6248 !important; box-shadow: 0 0 0 3px #d4774f1f, inset 0 1px #ffffff0a; }\n.wbs-world-picker.open .wbs-world-chevron { transform: rotate(180deg); }\n.wbs-world-popover { position: absolute; top: calc(100% + 8px); left: 0; width: min(390px, calc(100vw - 42px)); padding: 9px; visibility: hidden; opacity: 0; transform: translateY(-6px) scale(.985); transform-origin: top left; background: #25221eee; border: 1px solid #635348; border-radius: 14px; box-shadow: 0 18px 55px #000b, inset 0 1px #ffffff0a; backdrop-filter: blur(14px); pointer-events: none; transition: opacity .15s, transform .15s, visibility .15s; }\n.wbs-world-picker.open .wbs-world-popover { visibility: visible; opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }\n.wbs-world-search { height: 38px; display: flex; align-items: center; gap: 9px; padding: 0 11px; background: #191815; border: 1px solid #443e37; border-radius: 10px; }\n.wbs-world-search:focus-within { border-color: #a36348; box-shadow: 0 0 0 3px #d4774f18; }\n.wbs-world-search i { color: #8d8277; }\n.wbs-world-search input { height: 100%; padding: 0 !important; border: 0 !important; outline: 0 !important; background: transparent !important; box-shadow: none !important; }\n.wbs-world-options { max-height: min(480px, 58vh); overflow: auto; margin-top: 8px; padding-right: 2px; }\n.wbs-world-option { width: 100%; min-height: 38px; display: grid; grid-template-columns: 29px minmax(0, 1fr) 18px; align-items: center; gap: 8px; margin-bottom: 3px; padding: 7px 9px !important; text-align: left; background: transparent !important; border-color: transparent !important; border-radius: 9px !important; }\n.wbs-world-option:hover { background: #39322b !important; border-color: #50453c !important; }\n.wbs-world-option.selected { color: #f0c4aa; background: linear-gradient(90deg, #4b3025, #3b3029) !important; border-color: #79503e !important; box-shadow: inset 3px 0 var(--wbs-copper); }\n.wbs-world-ordinal { color: #796f65; font: 9px ui-monospace, monospace; letter-spacing: .08em; }\n.wbs-world-option-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.wbs-world-option > i { color: var(--wbs-copper); font-size: 11px; }\n.wbs-world-empty { padding: 28px 12px; color: var(--wbs-muted); text-align: center; font-size: 12px; }\n\n/* 与 AUTO 创作台相同：用插件 ID 作用域压住酒馆全局主题。 */\n#worldbook-studio-overlay input,\n#worldbook-studio-overlay textarea,\n#worldbook-studio-overlay select { min-height: 38px; color: var(--wbs-text) !important; caret-color: var(--wbs-copper); background-color: #34312c !important; background-image: none; border: 1px solid var(--wbs-line); box-shadow: none; transition: border-color .14s, background-color .14s, box-shadow .14s; }\n#worldbook-studio-overlay input:hover,\n#worldbook-studio-overlay textarea:hover,\n#worldbook-studio-overlay select:hover { border-color: rgba(217, 119, 87, .46); background-color: #3b3832 !important; }\n#worldbook-studio-overlay input:focus,\n#worldbook-studio-overlay textarea:focus,\n#worldbook-studio-overlay select:focus { outline: 0 !important; border-color: rgba(217, 119, 87, .58) !important; background-color: #3b3832 !important; box-shadow: 0 0 0 3px rgba(217, 119, 87, .1) !important; }\n.wbs-app input::placeholder, .wbs-app textarea::placeholder { color: #766f67; opacity: 1; }\n.wbs-app input:disabled, .wbs-app textarea:disabled, .wbs-app select:disabled { color: #746e67; background: #211f1c; border-color: #39352f; opacity: .75; }\n.wbs-app select { appearance: none; padding-right: 36px; color-scheme: dark; background-color: #34312c !important; background-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='m1 1 5 5 5-5' fill='none' stroke='%23d97757' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5'/%3E%3C/svg%3E\") !important; background-position: right 12px center !important; background-size: 11px 7px !important; background-repeat: no-repeat !important; }\n.wbs-app select option { color: var(--wbs-text); background: #292621; }\n\n/* 全局自定义下拉框：原生 select 仅保留表单值，展开层完全由创作台接管。 */\n.wbs-native-select { position: absolute !important; width: 1px !important; height: 1px !important; margin: -1px !important; padding: 0 !important; overflow: hidden !important; clip: rect(0 0 0 0) !important; white-space: nowrap !important; border: 0 !important; opacity: 0 !important; pointer-events: none !important; }\n.wbs-select { position: relative; width: 100%; min-width: 0; margin-top: 6px; font-weight: 400; letter-spacing: 0; }\n.wbs-select-trigger { width: 100%; min-height: 38px; display: grid !important; grid-template-columns: minmax(0, 1fr) 24px; align-items: center; gap: 8px; padding: 8px 7px 8px 11px !important; color: #ded7cf !important; text-align: left; background: #34312c !important; border: 1px solid var(--wbs-line) !important; border-radius: 9px !important; box-shadow: none !important; transition: border-color .14s, background .14s, box-shadow .14s !important; }\n.wbs-select-trigger > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.wbs-select-trigger > i { width: 24px; height: 22px; display: grid; place-items: center; color: var(--wbs-copper); font-size: 9px; transition: transform .16s ease; }\n.wbs-select-trigger:hover { color: #f0e8df !important; background: #3b3832 !important; border-color: rgba(217, 119, 87, .46) !important; }\n.wbs-select.open .wbs-select-trigger { background: #3b3832 !important; border-color: rgba(217, 119, 87, .62) !important; box-shadow: 0 0 0 3px rgba(217, 119, 87, .1) !important; }\n.wbs-select.open .wbs-select-trigger > i { transform: rotate(180deg); }\n.wbs-select-menu { position: absolute; z-index: 80; top: calc(100% + 5px); left: 0; right: 0; max-height: 220px; display: none; overflow-x: hidden; overflow-y: auto; padding: 5px; background: rgba(36, 33, 29, .98); border: 1px solid rgba(217, 176, 124, .28); border-radius: 10px; box-shadow: 0 16px 38px rgba(0, 0, 0, .48), inset 0 1px rgba(255, 255, 255, .025); backdrop-filter: blur(12px); scrollbar-width: thin; scrollbar-color: #765442 transparent; animation: wbs-select-in .14s ease-out; }\n.wbs-select.open .wbs-select-menu { display: grid; gap: 2px; }\n.wbs-select-menu button { width: 100%; min-height: 32px; display: grid !important; grid-template-columns: minmax(0, 1fr) 20px; align-items: center; gap: 8px; padding: 6px 7px 6px 9px !important; color: #c9c1b8 !important; text-align: left; background: transparent !important; border: 0 !important; border-radius: 7px !important; box-shadow: none !important; }\n.wbs-select-menu button > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.wbs-select-menu button > i { visibility: hidden; color: var(--wbs-copper); font-size: 9px; }\n.wbs-select-menu button:hover, .wbs-select-menu button:focus-visible { color: #f1e8df !important; outline: 0 !important; background: rgba(217, 119, 87, .09) !important; }\n.wbs-select-menu button[aria-selected=\"true\"] { color: #f2c5ae !important; background: linear-gradient(90deg, rgba(103, 62, 45, .72), rgba(67, 52, 43, .62)) !important; box-shadow: inset 2px 0 var(--wbs-copper) !important; }\n.wbs-select-menu button[aria-selected=\"true\"] > i { visibility: visible; }\n.wbs-select-menu button:disabled { color: #69635c !important; cursor: not-allowed; }\n@keyframes wbs-select-in { from { opacity: 0; transform: translateY(-4px) scale(.99); } to { opacity: 1; transform: translateY(0) scale(1); } }\n.wbs-app input[type=\"number\"] { appearance: textfield; font-family: ui-monospace, \"Cascadia Mono\", monospace; font-variant-numeric: tabular-nums; }\n.wbs-app input[type=\"number\"]::-webkit-inner-spin-button, .wbs-app input[type=\"number\"]::-webkit-outer-spin-button { margin: 0; appearance: none; }\n\n/* 中间区域直接复刻 AUTO 的舞台、字段栈和产物编辑器层次。 */\n.wbs-main { background: #302e29; }\n.wbs-editor-scroll { gap: 15px; padding: 18px 28px 20px; scrollbar-color: var(--wbs-line) transparent; }\n.wbs-field > span { min-height: 20px; align-items: center; color: #ddd5cc; font-size: 12px; letter-spacing: .02em; }\n.wbs-field > span small { padding-left: 12px; color: #817a72; font-size: 10px; letter-spacing: 0; }\n.wbs-field > input, .wbs-field > textarea { padding: 10px 11px; border-radius: 9px; font-size: 12px; }\n#worldbook-studio-overlay .wbs-field > input,\n#worldbook-studio-overlay .wbs-field > textarea:not([name=\"content\"]) { background: #34312c !important; border: 1px solid var(--wbs-line) !important; color: var(--wbs-text) !important; box-shadow: none !important; }\nbody #worldbook-studio-overlay .wbs-editor-scroll .wbs-field textarea[name=\"key\"],\nbody #worldbook-studio-overlay .wbs-editor-scroll .wbs-field textarea[name=\"keysecondary\"] { background-color: #34312c !important; background-image: none !important; border-color: var(--wbs-line) !important; }\n#worldbook-studio-overlay .wbs-field > input:hover,\n#worldbook-studio-overlay .wbs-field > textarea:not([name=\"content\"]):hover { background: #3b3832 !important; border-color: rgba(217, 119, 87, .46) !important; }\n#worldbook-studio-overlay .wbs-field > input:focus,\n#worldbook-studio-overlay .wbs-field > textarea:not([name=\"content\"]):focus { outline: 0 !important; background: #3b3832 !important; border-color: rgba(217, 119, 87, .58) !important; box-shadow: 0 0 0 3px rgba(217, 119, 87, .1) !important; }\n.wbs-field > textarea[name=\"key\"], .wbs-field > textarea[name=\"keysecondary\"] { min-height: 58px; line-height: 1.55; resize: vertical; }\n.wbs-content-field { min-height: 300px; margin-top: 0; padding: 0; overflow: hidden; background: #2d2b27; border: 1px solid var(--wbs-line-soft); border-radius: 12px; box-shadow: 0 6px 22px rgba(10, 9, 8, .12); }\n.wbs-content-field::before { display: none; }\n.wbs-content-field > span { flex: 0 0 auto; min-height: 42px; margin: 0; padding: 10px 12px; border-bottom: 1px solid var(--wbs-line-soft); background: #2d2b27; }\n#worldbook-studio-overlay .wbs-content-field textarea { display: block; width: 100%; min-height: 260px; max-height: none; flex: 1; margin: 0; overflow: auto; padding: 15px 16px; resize: none; border: 0 !important; border-radius: 0; outline: 0 !important; background: #302e29 !important; color: #f0e9df !important; box-shadow: none !important; font-family: Inter, \"Noto Sans SC\", \"Microsoft YaHei\", system-ui, sans-serif; font-size: 12px; font-weight: 450; line-height: 1.78; letter-spacing: .008em; white-space: pre-wrap; word-break: break-word; tab-size: 2; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }\n#worldbook-studio-overlay .wbs-content-field textarea:hover { background: #302e29 !important; }\n#worldbook-studio-overlay .wbs-content-field textarea:focus { background: #34312c !important; box-shadow: inset 2px 0 0 rgba(217, 119, 87, .72) !important; }\n#worldbook-studio-overlay .wbs-content-field textarea::selection { color: #fff8ee; background: rgba(217, 119, 87, .3); }\n\n/* 右栏保持工具面板的紧凑节奏，数值与选择字段不再像大片灰条。 */\n.wbs-settings-scroll { padding: 13px; background: #292722; scrollbar-color: var(--wbs-line) transparent; }\n.wbs-settings-group { position: relative; width: 100%; max-width: 100%; min-width: 0; margin-bottom: 10px; padding: 13px; overflow: hidden; background: #35322d; border-color: var(--wbs-line-soft); box-shadow: none; }\n.wbs-settings-group h3 { display: flex; align-items: center; gap: 8px; margin-bottom: 11px; color: #cfc4b8; }\n.wbs-settings-group h3::before { content: \"\"; width: 5px; height: 5px; background: var(--wbs-copper); border-radius: 50%; box-shadow: 0 0 0 3px #d4774f18; }\n.wbs-settings-group > label:not(.wbs-toggle-row), .wbs-grid-2 label { color: #91887e; font-weight: 600; letter-spacing: .02em; }\n.wbs-settings-group > label input, .wbs-settings-group > label select, .wbs-grid-2 input { margin-top: 6px; min-height: 36px; padding-top: 8px; padding-bottom: 8px; color: #ded7cf; font-weight: 400; letter-spacing: 0; }\n.wbs-grid-2 { gap: 9px; }\n.wbs-toggle-row { min-height: 38px; margin: 3px -4px; padding: 5px 6px; border-radius: 8px; transition: background .15s; }\n.wbs-toggle-row:hover { background: #37322c; }\n.wbs-toggle-row i { width: 34px; height: 20px; border: 1px solid #686057; box-shadow: inset 0 2px 4px #0004; }\n.wbs-toggle-row i::after { top: 3px; left: 3px; width: 12px; height: 12px; border: 1px solid #c0b7ae44; box-shadow: 0 2px 4px #0005; }\n.wbs-toggle-row input:checked + i { background: #4c684f; border-color: #6d8c6d; }\n.wbs-toggle-row input:checked + i::after { left: 17px; background: #b4ddb0; }\n.wbs-toggle-row input:focus-visible + i { outline: 2px solid var(--wbs-copper); outline-offset: 2px; }\n.wbs-danger-zone button { display: flex; align-items: center; justify-content: flex-start; gap: 8px; background: #2a2722; }\n.wbs-meta-fields > label { display: grid !important; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 2px 8px; }\n.wbs-meta-fields > label > small { color: var(--wbs-muted); font-size: 8px; font-weight: 400; text-align: right; }\n.wbs-meta-fields > label > input,\n.wbs-meta-fields > label > textarea { grid-column: 1 / -1; width: 100%; min-width: 0; margin-top: 5px; }\n#worldbook-studio-overlay .wbs-meta-fields textarea { min-height: 54px; padding: 9px; resize: vertical; background: #34312c !important; border-color: var(--wbs-line) !important; color: var(--wbs-text) !important; font-size: 11px; line-height: 1.5; }\n.wbs-settings-scroll input,\n.wbs-settings-scroll select,\n.wbs-settings-scroll textarea { max-width: 100%; min-width: 0; }\n\n/* 搜索框只保留一层轮廓，禁止宿主主题给内部 input 再铺浅色底。 */\n#worldbook-studio-overlay .wbs-search,\n#worldbook-studio-overlay .wbs-world-search { background: rgba(30, 28, 25, .34); }\n#worldbook-studio-overlay .wbs-search:hover,\n#worldbook-studio-overlay .wbs-world-search:hover,\n#worldbook-studio-overlay .wbs-search:focus-within,\n#worldbook-studio-overlay .wbs-world-search:focus-within { background: rgba(30, 28, 25, .58); }\nbody #worldbook-studio-overlay .wbs-search > input[data-role=\"search\"],\nbody #worldbook-studio-overlay .wbs-world-search > input[data-role=\"world-search\"] { min-height: 0; height: 100%; margin: 0; padding: 0 !important; border: 0 !important; border-radius: 0 !important; outline: 0 !important; background: transparent !important; background-color: transparent !important; background-image: none !important; box-shadow: none !important; }\nbody #worldbook-studio-overlay .wbs-search > input[data-role=\"search\"]:hover,\nbody #worldbook-studio-overlay .wbs-search > input[data-role=\"search\"]:focus,\nbody #worldbook-studio-overlay .wbs-world-search > input[data-role=\"world-search\"]:hover,\nbody #worldbook-studio-overlay .wbs-world-search > input[data-role=\"world-search\"]:focus { border: 0 !important; outline: 0 !important; background: transparent !important; box-shadow: none !important; }\n\n/* 插件自有弹窗：沿用 AUTO 创作台浮层、字段与危险操作语言。 */\n.wbs-modal-layer { position: absolute; inset: 0; z-index: 120; display: none; place-items: center; padding: 20px; }\n.wbs-modal-layer.open { display: grid; }\n.wbs-modal-scrim { position: absolute; inset: 0; width: 100%; height: 100%; padding: 0 !important; border: 0 !important; border-radius: 0 !important; background: rgba(12, 10, 8, .7) !important; backdrop-filter: blur(6px); cursor: default !important; }\n.wbs-modal { position: relative; width: min(520px, calc(100vw - 40px)); max-height: min(720px, calc(100vh - 40px)); display: grid; grid-template-rows: auto auto minmax(0, 1fr) auto; overflow: hidden; color: var(--wbs-text); background: linear-gradient(145deg, #38352f, #302d28 72%); border: 1px solid rgba(217, 176, 124, .34); border-radius: 16px; box-shadow: 0 30px 90px rgba(0, 0, 0, .58); animation: wbs-modal-in .18s ease-out; }\n.wbs-modal.danger { border-color: rgba(217, 132, 127, .4); }\n.wbs-modal-head { display: grid; grid-template-columns: 38px minmax(0, 1fr) 34px; align-items: center; gap: 11px; padding: 17px 18px 14px; border-bottom: 1px solid var(--wbs-line-soft); }\n.wbs-modal-mark { width: 36px; height: 36px; display: grid; place-items: center; color: var(--wbs-copper); background: rgba(217, 119, 87, .1); border: 1px solid rgba(217, 119, 87, .24); border-radius: 10px; }\n.wbs-modal.danger .wbs-modal-mark { color: var(--wbs-red); background: rgba(217, 132, 127, .1); border-color: rgba(217, 132, 127, .28); }\n.wbs-modal-head small { display: block; color: var(--wbs-copper); font: 700 8px/1.2 ui-monospace, monospace; letter-spacing: .16em; }\n.wbs-modal-head h2 { margin: 4px 0 0; font-family: \"Noto Serif SC\", \"Songti SC\", Georgia, serif; font-size: 20px; font-weight: 550; }\n.wbs-modal-close { width: 34px; height: 34px; display: grid; padding: 0 !important; place-items: center; color: var(--wbs-muted) !important; background: transparent !important; border-color: transparent !important; }\n.wbs-modal-description { margin: 0; padding: 13px 18px 0; color: var(--wbs-muted); font-size: 11px; line-height: 1.65; }\n.wbs-modal-content { min-height: 0; overflow: auto; padding: 15px 18px 18px; }\n.wbs-modal-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 18px 16px; border-top: 1px solid var(--wbs-line-soft); background: rgba(43, 41, 37, .48); }\n.wbs-modal-actions button { min-height: 36px; padding: 7px 13px; font-size: 10px; }\n.wbs-modal-actions .wbs-modal-confirm { border-color: rgba(217, 119, 87, .48); background: rgba(217, 119, 87, .14); color: #f0d8cd; }\n.wbs-modal-actions .wbs-modal-confirm.danger { border-color: rgba(217, 132, 127, .48); background: rgba(217, 132, 127, .13); color: #f0c1bd; }\n.wbs-modal-field { display: grid; gap: 7px; color: var(--wbs-muted); font: 700 9px/1.3 ui-monospace, monospace; letter-spacing: .08em; }\n.wbs-modal-field + .wbs-modal-field, .wbs-modal-choice { margin-top: 12px; }\n#worldbook-studio-overlay .wbs-modal-field input,\n#worldbook-studio-overlay .wbs-modal-field select { width: 100%; min-height: 40px; padding: 9px 10px; border-radius: 9px; color: var(--wbs-text) !important; background-color: #292722 !important; }\n.wbs-modal-field > .wbs-select { margin-top: 0; font-family: inherit; letter-spacing: 0; }\n.wbs-modal-field .wbs-select-trigger { min-height: 40px; background: #292722 !important; }\n.wbs-modal-choice { display: block; cursor: pointer; }\n.wbs-modal-choice > input, .wbs-batch-options input { position: absolute; opacity: 0; pointer-events: none; }\n.wbs-modal-choice > span { display: grid; grid-template-columns: 28px minmax(0, 1fr); padding: 11px; border: 1px solid var(--wbs-line-soft); border-radius: 10px; background: #35322d; }\n.wbs-modal-choice > span > i { grid-row: 1 / 3; color: var(--wbs-violet); align-self: center; }\n.wbs-modal-choice strong, .wbs-modal-choice small { display: block; }\n.wbs-modal-choice strong { color: var(--wbs-soft); font-size: 11px; }\n.wbs-modal-choice small { margin-top: 3px; color: var(--wbs-muted); font-size: 9px; }\n.wbs-modal-choice > input:checked + span { border-color: rgba(183, 163, 207, .42); background: rgba(183, 163, 207, .1); }\n.wbs-batch-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }\n.wbs-batch-options label { min-width: 0; cursor: pointer; }\n.wbs-batch-options label > span { min-height: 88px; display: grid; grid-template-rows: 24px auto auto; align-content: start; padding: 11px; border: 1px solid var(--wbs-line-soft); border-radius: 10px; background: #35322d; transition: border-color .14s, background .14s, transform .14s; }\n.wbs-batch-options label:hover > span { border-color: var(--wbs-line); background: #3b3832; transform: translateY(-1px); }\n.wbs-batch-options label i { color: var(--wbs-copper); }\n.wbs-batch-options label strong { color: var(--wbs-soft); font-size: 11px; }\n.wbs-batch-options label small { margin-top: 3px; color: var(--wbs-muted); font-size: 9px; line-height: 1.45; }\n.wbs-batch-options input:checked + span { border-color: rgba(217, 119, 87, .48); background: rgba(217, 119, 87, .11); box-shadow: 0 0 0 3px rgba(217, 119, 87, .07); }\n.wbs-batch-options label.danger i { color: var(--wbs-red); }\n.wbs-batch-options label.danger input:checked + span { border-color: rgba(217, 132, 127, .48); background: rgba(217, 132, 127, .1); }\n@keyframes wbs-modal-in { from { opacity: 0; transform: translateY(8px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }\n\n@media (max-width: 1050px) {\n    .wbs-header-actions button:not(.wbs-primary):not(.wbs-icon) { width: 38px; overflow: hidden; white-space: nowrap; color: transparent; }\n    .wbs-header-actions button i { color: var(--wbs-text); }\n    .wbs-workspace { --wbs-left-width: 230px; --wbs-right-width: 285px; grid-template-columns: var(--wbs-left-width) 8px minmax(360px, 1fr) 8px var(--wbs-right-width); overflow-x: auto; }\n}\n@media (max-width: 760px) {\n    .wbs-overlay { padding: 0; }\n    .wbs-app { border: 0; border-radius: 0; grid-template-rows: 62px minmax(0, 1fr) 42px; }\n    .wbs-brand small, .wbs-save-state, .wbs-header-actions button:not(.wbs-primary):not(.wbs-icon) { display: none; }\n    .wbs-brand { min-width: 0; }.wbs-brand h1 { font-size: 19px; }\n    .wbs-workspace { --wbs-left-width: 220px; --wbs-right-width: 280px; grid-template-columns: var(--wbs-left-width) 8px minmax(330px, 1fr) 8px var(--wbs-right-width); }\n    .wbs-editor-scroll { padding: 16px; }.wbs-footer [data-role=\"stats\"] span:nth-child(n+3) { display: none; }\n    .wbs-drawer { top: 62px; right: 0; bottom: 42px; }\n}\n@media (prefers-reduced-motion: reduce) { .wbs-app *, .wbs-drawer { transition: none !important; } }\n";

const ID = 'worldbook-studio';
const LAST_WORLD_KEY = `${ID}:last-world`;
const POSITION_LABELS = {
    0: '角色定义之前',
    1: '角色定义之后',
    2: '作者注释顶部',
    3: '作者注释底部',
    4: '指定深度',
    5: '示例消息顶部',
    6: '示例消息底部',
    7: '命名出口',
};

const state = {
    root: null,
    worldName: '',
    data: null,
    selectedUid: null,
    selectedUids: new Set(),
    batchMode: false,
    query: '',
    filter: 'all',
    dirty: false,
    undo: null,
    conflicts: [],
    tokenTimer: null,
    worldPickerOpen: false,
    worldQuery: '',
    modalClose: null,
};

function escapeHtml(value = '') {
    const node = document.createElement('div');
    node.textContent = String(value);
    return node.innerHTML;
}

function getEntries() {
    return state.data?.entries ? Object.values(state.data.entries) : [];
}

function getEntry(uid = state.selectedUid) {
    return state.data?.entries?.[String(uid)] ?? null;
}

function entryTitle(entry) {
    return entry?.comment?.trim() || entry?.key?.[0] || `未命名条目 #${entry?.uid ?? '?'}`;
}

function splitKeywords(value) {
    return String(value).split(/[,，\n]/).map(item => item.trim()).filter(Boolean);
}

function snapshot() {
    return {
        worldName: state.worldName,
        data: structuredClone(state.data),
        selectedUid: state.selectedUid,
        description: '恢复上一次操作',
    };
}

function setUndo(description) {
    state.undo = { ...snapshot(), description };
    renderHeader();
}

function markDirty() {
    state.dirty = true;
    renderHeader();
    renderEntryList();
}

function sortedEntries() {
    const query = state.query.trim().toLocaleLowerCase();
    return getEntries()
        .filter(entry => {
            if (state.filter === 'enabled' && entry.disable) return false;
            if (state.filter === 'disabled' && !entry.disable) return false;
            if (state.filter === 'constant' && !entry.constant) return false;
            if (state.filter === 'conflict' && !state.conflicts.some(item => item.uids.includes(entry.uid))) return false;
            if (!query) return true;
            return [entryTitle(entry), entry.content, ...(entry.key || []), ...(entry.keysecondary || [])]
                .join('\n').toLocaleLowerCase().includes(query);
        })
        .sort((a, b) => (a.displayIndex ?? a.uid) - (b.displayIndex ?? b.uid));
}

function buildShell() {
    const root = document.createElement('section');
    root.id = `${ID}-overlay`;
    root.className = 'wbs-overlay';
    root.innerHTML = `
        <div class="wbs-app" role="dialog" aria-modal="true" aria-label="世界书创作台">
            <header class="wbs-header">
                <div class="wbs-brand">
                    <span class="wbs-mark"><i class="fa-solid fa-book-open"></i></span>
                    <div><small>LORE / WORKBENCH</small><h1>世界书创作台</h1></div>
                </div>
                <div class="wbs-header-actions">
                    <span class="wbs-save-state" data-role="save-state"></span>
                    <button data-action="undo"><i class="fa-solid fa-rotate-left"></i> 撤销</button>
                    <button data-action="check"><i class="fa-solid fa-shield-halved"></i> 冲突检查</button>
                    <button data-action="import"><i class="fa-solid fa-file-import"></i> 导入</button>
                    <button data-action="export"><i class="fa-solid fa-file-export"></i> 导出</button>
                    <button class="wbs-primary" data-action="save"><i class="fa-solid fa-floppy-disk"></i> 保存更改</button>
                    <button class="wbs-icon" data-action="close" aria-label="关闭"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </header>
            <div class="wbs-workspace">
                <aside class="wbs-left">
                    <div class="wbs-project-label">当前世界书</div>
                    <div class="wbs-world-row">
                        <div class="wbs-world-picker" data-role="world-picker">
                            <button class="wbs-world-trigger" data-action="toggle-world-picker" aria-haspopup="listbox" aria-expanded="false">
                                <span><i class="fa-solid fa-book-bookmark"></i><b data-role="world-name">尚无世界书</b></span>
                                <i class="fa-solid fa-chevron-down wbs-world-chevron"></i>
                            </button>
                            <div class="wbs-world-popover">
                                <label class="wbs-world-search"><i class="fa-solid fa-magnifying-glass"></i><input data-role="world-search" placeholder="搜索世界书…" autocomplete="off"></label>
                                <div class="wbs-world-options" data-role="world-options" role="listbox"></div>
                            </div>
                        </div>
                        <button class="wbs-icon" data-action="rename-world" title="重命名"><i class="fa-solid fa-pen"></i></button>
                    </div>
                    <div class="wbs-world-actions">
                        <button data-action="new-world"><i class="fa-solid fa-folder-plus"></i> 新建</button>
                        <button data-action="delete-world"><i class="fa-solid fa-trash"></i> 删除</button>
                    </div>
                    <div class="wbs-progress"><span data-role="progress-bar"></span></div>
                    <div class="wbs-list-head">
                        <strong>条目列表</strong><span data-role="entry-count"></span>
                    </div>
                    <label class="wbs-search"><i class="fa-solid fa-magnifying-glass"></i><input data-role="search" placeholder="搜索标题、关键词或内容"></label>
                    <div class="wbs-filters" data-role="filters">
                        <button class="active" data-filter="all">全部</button><button data-filter="enabled">启用</button>
                        <button data-filter="constant">常驻</button><button data-filter="conflict">冲突</button>
                    </div>
                    <div class="wbs-entry-list" data-role="entry-list"></div>
                    <div class="wbs-left-footer">
                        <button class="wbs-primary" data-action="new-entry"><i class="fa-solid fa-plus"></i> 新建条目</button>
                        <button data-action="cancel-batch" hidden><i class="fa-solid fa-xmark"></i> 取消</button>
                        <button data-action="batch"><i class="fa-solid fa-list-check"></i> <span data-role="batch-label">批量操作</span></button>
                    </div>
                </aside>
                <div class="wbs-resizer" data-resize="left" role="separator" aria-label="调整条目列表宽度" aria-orientation="vertical" tabindex="0"><span></span></div>
                <main class="wbs-main" data-role="editor"></main>
                <div class="wbs-resizer" data-resize="right" role="separator" aria-label="调整条目设置宽度" aria-orientation="vertical" tabindex="0"><span></span></div>
                <aside class="wbs-right" data-role="settings"></aside>
            </div>
            <footer class="wbs-footer">
                <div data-role="stats"></div>
            </footer>
            <input type="file" data-role="file-input" accept=".json,.png" hidden>
            <div class="wbs-drawer" data-role="drawer" aria-hidden="true"></div>
            <div class="wbs-modal-layer" data-role="modal" aria-hidden="true"></div>
        </div>`;
    document.body.append(root);
    state.root = root;
    restorePaneWidths();
    bindShellEvents();
}

function bindShellEvents() {
    state.root.addEventListener('click', handleClick);
    state.root.addEventListener('input', handleInput);
    state.root.addEventListener('change', handleChange);
    state.root.querySelector('[data-role="file-input"]').addEventListener('change', handleImport);
    state.root.querySelectorAll('[data-resize]').forEach(handle => {
        handle.addEventListener('pointerdown', startPaneResize);
        handle.addEventListener('keydown', resizePaneWithKeyboard);
    });
    document.addEventListener('keydown', handleKeydown);
}

function restorePaneWidths() {
    const workspace = state.root.querySelector('.wbs-workspace');
    const left = Number(localStorage.getItem(`${ID}:left-width`));
    const right = Number(localStorage.getItem(`${ID}:right-width`));
    if (left >= 220) workspace.style.setProperty('--wbs-left-width', `${left}px`);
    if (right >= 280) workspace.style.setProperty('--wbs-right-width', `${right}px`);
    requestAnimationFrame(() => {
        if (left >= 220) setPaneWidth('left', left);
        if (right >= 280) setPaneWidth('right', right);
    });
}

function paneLimits(workspace) {
    const width = workspace.getBoundingClientRect().width;
    const left = workspace.querySelector('.wbs-left').getBoundingClientRect().width;
    const right = workspace.querySelector('.wbs-right').getBoundingClientRect().width;
    return {
        left: { min: 220, max: Math.max(220, Math.min(520, width - right - 430)) },
        right: { min: 280, max: Math.max(280, Math.min(620, width - left - 430)) },
    };
}

function setPaneWidth(side, width) {
    const workspace = state.root?.querySelector('.wbs-workspace');
    if (!workspace) return;
    const limits = paneLimits(workspace)[side];
    const next = Math.round(Math.min(limits.max, Math.max(limits.min, width)));
    workspace.style.setProperty(`--wbs-${side}-width`, `${next}px`);
    localStorage.setItem(`${ID}:${side}-width`, String(next));
}

function startPaneResize(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    const side = handle.dataset.resize;
    const pane = state.root.querySelector(side === 'left' ? '.wbs-left' : '.wbs-right');
    const startX = event.clientX;
    const startWidth = pane.getBoundingClientRect().width;
    handle.classList.add('dragging');
    document.body.classList.add('wbs-resizing');
    const move = moveEvent => setPaneWidth(side, startWidth + (moveEvent.clientX - startX) * (side === 'left' ? 1 : -1));
    const stop = () => {
        handle.classList.remove('dragging');
        document.body.classList.remove('wbs-resizing');
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', stop);
        document.removeEventListener('pointercancel', stop);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop);
    document.addEventListener('pointercancel', stop);
}

function resizePaneWithKeyboard(event) {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const side = event.currentTarget.dataset.resize;
    const pane = state.root.querySelector(side === 'left' ? '.wbs-left' : '.wbs-right');
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    setPaneWidth(side, pane.getBoundingClientRect().width + direction * 16 * (side === 'left' ? 1 : -1));
}

function renderWorldSelect() {
    const picker = state.root.querySelector('[data-role="world-picker"]');
    picker.classList.toggle('open', state.worldPickerOpen);
    picker.querySelector('[data-action="toggle-world-picker"]').setAttribute('aria-expanded', String(state.worldPickerOpen));
    picker.querySelector('[data-role="world-name"]').textContent = state.worldName || '尚无世界书';
    renderWorldOptions();
}

function renderWorldOptions() {
    const list = state.root.querySelector('[data-role="world-options"]');
    const query = state.worldQuery.trim().toLocaleLowerCase();
    const names = world_names.filter(name => !query || name.toLocaleLowerCase().includes(query));
    list.replaceChildren();
    if (!names.length) {
        const empty = document.createElement('div');
        empty.className = 'wbs-world-empty';
        empty.textContent = world_names.length ? '没有匹配的世界书' : '还没有世界书';
        list.append(empty);
        return;
    }
    names.forEach((name, index) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = `wbs-world-option ${name === state.worldName ? 'selected' : ''}`;
        item.dataset.action = 'select-world';
        item.dataset.world = name;
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(name === state.worldName));
        item.innerHTML = `<span class="wbs-world-ordinal">${String(index + 1).padStart(2, '0')}</span><span class="wbs-world-option-name"></span>${name === state.worldName ? '<i class="fa-solid fa-check"></i>' : ''}`;
        item.querySelector('.wbs-world-option-name').textContent = name;
        list.append(item);
    });
}

function centerCurrentWorldOption() {
    const list = state.root?.querySelector('[data-role="world-options"]');
    const selected = list?.querySelector('.wbs-world-option.selected');
    if (!list || !selected) return;
    const listRect = list.getBoundingClientRect();
    const selectedRect = selected.getBoundingClientRect();
    list.scrollTop += selectedRect.top + selectedRect.height / 2 - (listRect.top + listRect.height / 2);
}

function renderHeader() {
    if (!state.root) return;
    const status = state.root.querySelector('[data-role="save-state"]');
    status.className = `wbs-save-state ${state.dirty ? 'dirty' : ''}`;
    status.innerHTML = state.dirty
        ? '<i class="fa-solid fa-circle"></i> 有未保存更改'
        : '<i class="fa-solid fa-circle-check"></i> 已保存';
    state.root.querySelector('[data-action="undo"]').disabled = !state.undo;
    state.root.querySelector('[data-action="save"]').disabled = !state.dirty || !state.data;
}

function renderEntryList() {
    const list = state.root.querySelector('[data-role="entry-list"]');
    const entries = sortedEntries();
    list.classList.toggle('batch-mode', state.batchMode);
    state.root.querySelector('[data-role="entry-count"]').textContent = `${entries.length}/${getEntries().length}`;
    const batchButton = state.root.querySelector('[data-action="batch"]');
    const newEntryButton = state.root.querySelector('[data-action="new-entry"]');
    const cancelBatchButton = state.root.querySelector('[data-action="cancel-batch"]');
    newEntryButton.hidden = state.batchMode;
    cancelBatchButton.hidden = !state.batchMode;
    batchButton.classList.toggle('wbs-primary', state.batchMode);
    batchButton.disabled = state.batchMode && state.selectedUids.size === 0;
    batchButton.querySelector('[data-role="batch-label"]').textContent = state.batchMode ? `确认 · ${state.selectedUids.size}` : '批量操作';
    state.root.querySelector('[data-role="progress-bar"]').style.width = `${getEntries().length ? (getEntries().filter(x => !x.disable).length / getEntries().length) * 100 : 0}%`;
    if (!entries.length) {
        list.innerHTML = '<div class="wbs-empty">没有符合条件的条目。<br>可以新建条目或调整筛选。</div>';
        return;
    }
    list.innerHTML = entries.map((entry, index) => {
        const conflictCount = state.conflicts.filter(item => item.uids.includes(entry.uid)).length;
        const stateClass = entry.disable ? 'disabled' : entry.constant ? 'constant' : 'keyword';
        return `<article class="wbs-entry ${entry.uid === state.selectedUid && !state.batchMode ? 'selected' : ''} ${state.selectedUids.has(entry.uid) ? 'checked' : ''}" data-uid="${entry.uid}">
            ${state.batchMode ? `<button class="wbs-check" data-action="toggle-select" data-uid="${entry.uid}" aria-label="选择条目" aria-pressed="${state.selectedUids.has(entry.uid)}"><span class="wbs-check-box"><i class="fa-solid fa-check"></i></span></button>` : ''}
            <span class="wbs-entry-state ${stateClass}"></span>
            <div class="wbs-entry-copy"><strong>${escapeHtml(entryTitle(entry))}</strong><small>${entry.constant ? '常驻' : (entry.key || []).slice(0, 3).join(' · ') || '无关键词'} · UID ${entry.uid}</small></div>
            ${conflictCount ? `<span class="wbs-badge">${conflictCount}</span>` : ''}<span class="wbs-index">${String(index + 1).padStart(2, '0')}</span>
        </article>`;
    }).join('');
}

function renderEditor() {
    const editor = state.root.querySelector('[data-role="editor"]');
    const entry = getEntry();
    if (!entry) {
        editor.innerHTML = `<div class="wbs-empty-state"><i class="fa-solid fa-feather-pointed"></i><h2>选择一个条目开始编辑</h2><p>主要内容会显示在这里，详细触发选项位于右侧。</p><button class="wbs-primary" data-action="new-entry">新建第一个条目</button></div>`;
        renderSettings();
        return;
    }
    editor.innerHTML = `
        <div class="wbs-phase"><small>ENTRY / ${String(entry.uid).padStart(3, '0')}</small><strong>条目内容</strong><span>${entry.disable ? '已停用' : '编辑中'}</span></div>
        <div class="wbs-editor-scroll">
            <label class="wbs-field wbs-content-field"><span>条目内容 <small data-role="content-meta">正在统计…</small></span><textarea name="content" placeholder="输入发送给模型的世界设定内容…">${escapeHtml(entry.content || '')}</textarea></label>
        </div>`;
    updateTokenCount(entry.content || '');
}

function option(value, label, selected) {
    return `<option value="${value}" ${String(value) === String(selected) ? 'selected' : ''}>${label}</option>`;
}

function toggle(name, label, checked, help = '') {
    return `<label class="wbs-toggle-row"><span><strong>${label}</strong>${help ? `<small>${help}</small>` : ''}</span><input type="checkbox" name="${name}" ${checked ? 'checked' : ''}><i></i></label>`;
}

// 原生 select 的展开面板无法稳定套用主题，因此保留它负责表单数据，外层使用插件自有交互界面。
function enhanceSelects(scope = state.root) {
    scope?.querySelectorAll('select:not([data-wbs-enhanced])').forEach(select => {
        select.dataset.wbsEnhanced = 'true';
        select.classList.add('wbs-native-select');
        const wrapper = document.createElement('div');
        wrapper.className = 'wbs-select';
        wrapper.innerHTML = `
            <button type="button" class="wbs-select-trigger" aria-haspopup="listbox" aria-expanded="false">
                <span>${escapeHtml(select.selectedOptions[0]?.textContent || '')}</span><i class="fa-solid fa-chevron-down"></i>
            </button>
            <div class="wbs-select-menu" role="listbox" aria-label="${escapeHtml(select.name || '选择选项')}">
                ${[...select.options].map((item, index) => `<button type="button" role="option" data-select-index="${index}" aria-selected="${item.selected}" ${item.disabled ? 'disabled' : ''}><span>${escapeHtml(item.textContent)}</span><i class="fa-solid fa-check"></i></button>`).join('')}
            </div>`;
        select.after(wrapper);
        wrapper.prepend(select);
        wrapper.querySelector('.wbs-select-trigger').addEventListener('keydown', event => {
            if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
            event.preventDefault();
            openCustomSelect(wrapper);
            const options = [...wrapper.querySelectorAll('[data-select-index]:not(:disabled)')];
            (event.key === 'ArrowDown' ? options[0] : options.at(-1))?.focus();
        });
        wrapper.querySelectorAll('[data-select-index]').forEach(optionButton => optionButton.addEventListener('keydown', event => {
            const options = [...wrapper.querySelectorAll('[data-select-index]:not(:disabled)')];
            const index = options.indexOf(event.currentTarget);
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus();
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                closeCustomSelects();
                wrapper.querySelector('.wbs-select-trigger')?.focus();
            }
        }));
    });
}

function closeCustomSelects(except = null) {
    state.root?.querySelectorAll('.wbs-select.open').forEach(wrapper => {
        if (wrapper === except) return;
        wrapper.classList.remove('open');
        wrapper.querySelector('.wbs-select-trigger')?.setAttribute('aria-expanded', 'false');
    });
}

function openCustomSelect(wrapper) {
    closeCustomSelects(wrapper);
    wrapper.classList.add('open');
    wrapper.querySelector('.wbs-select-trigger')?.setAttribute('aria-expanded', 'true');
    wrapper.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}

function renderSettings() {
    const panel = state.root.querySelector('[data-role="settings"]');
    const entry = getEntry();
    if (!entry) {
        panel.innerHTML = '<div class="wbs-side-empty">条目设置</div>';
        return;
    }
    panel.innerHTML = `
        <div class="wbs-tabs"><button class="active">条目设置</button><button data-action="show-conflicts">检查结果 ${state.conflicts.length ? `<b>${state.conflicts.length}</b>` : ''}</button></div>
        <div class="wbs-settings-scroll">
            <section class="wbs-settings-group wbs-meta-fields"><h3>基础信息</h3>
                <label>条目标题<small>仅用于管理，不发送给模型</small><input name="comment" value="${escapeHtml(entry.comment || '')}" placeholder="例如：北境王国概况"></label>
                <label>主关键词<small>用逗号或换行分隔</small><textarea name="key" rows="2" placeholder="北境, 霜原王国">${escapeHtml((entry.key || []).join(', '))}</textarea></label>
                <label>次关键词<small>与主关键词共同决定是否触发</small><textarea name="keysecondary" rows="2" placeholder="王国, 地理">${escapeHtml((entry.keysecondary || []).join(', '))}</textarea></label>
            </section>
            <section class="wbs-settings-group"><h3>触发状态</h3>
                ${toggle('enabled', '启用条目', !entry.disable, '停用后不会参与世界书扫描')}
                ${toggle('constant', '常驻条目', entry.constant, '无需关键词，始终尝试插入')}
                ${toggle('vectorized', '向量匹配', entry.vectorized, '允许向量扩展检索此条目')}
            </section>
            <section class="wbs-settings-group"><h3>插入方式</h3>
                <label>插入位置<select name="position">${Object.entries(POSITION_LABELS).map(([value, label]) => option(value, label, entry.position)).join('')}</select></label>
                <div class="wbs-grid-2"><label>深度<input type="number" name="depth" value="${entry.depth ?? 4}" min="0"></label><label>顺序<input type="number" name="order" value="${entry.order ?? 100}"></label></div>
                <label>消息角色<select name="role">${option(0, '系统', entry.role)}${option(1, '用户', entry.role)}${option(2, '助手', entry.role)}</select></label>
                <label>命名出口<input name="outletName" value="${escapeHtml(entry.outletName || '')}" placeholder="仅在使用命名出口时填写"></label>
            </section>
            <section class="wbs-settings-group"><h3>匹配规则</h3>
                <label>次关键词逻辑<select name="selectiveLogic">${option(0, '任一匹配', entry.selectiveLogic)}${option(3, '全部匹配', entry.selectiveLogic)}${option(1, '非全部匹配', entry.selectiveLogic)}${option(2, '全部不匹配', entry.selectiveLogic)}</select></label>
                <div class="wbs-grid-2"><label>概率 %<input type="number" name="probability" value="${entry.probability ?? 100}" min="0" max="100"></label><label>扫描深度<input type="number" name="scanDepth" value="${entry.scanDepth ?? ''}" min="0" placeholder="继承"></label></div>
                ${toggle('caseSensitive', '区分大小写', entry.caseSensitive === true)}
                ${toggle('matchWholeWords', '全词匹配', entry.matchWholeWords === true)}
            </section>
            <section class="wbs-settings-group"><h3>递归与分组</h3>
                ${toggle('excludeRecursion', '不被递归触发', entry.excludeRecursion)}
                ${toggle('preventRecursion', '阻止后续递归', entry.preventRecursion)}
                ${toggle('ignoreBudget', '忽略世界书预算', entry.ignoreBudget)}
                <label>分组<input name="group" value="${escapeHtml(entry.group || '')}" placeholder="可选分组名称"></label>
                <div class="wbs-grid-2"><label>分组权重<input type="number" name="groupWeight" value="${entry.groupWeight ?? 100}"></label><label>自动化 ID<input name="automationId" value="${escapeHtml(entry.automationId || '')}"></label></div>
            </section>
            <section class="wbs-settings-group wbs-danger-zone"><h3>条目操作</h3>
                <button data-action="duplicate-entry"><i class="fa-regular fa-copy"></i> 在本书复制</button>
                <button data-action="transfer"><i class="fa-solid fa-arrow-right-arrow-left"></i> 复制或移动到其他世界书</button>
                <button data-action="delete-entry"><i class="fa-solid fa-trash"></i> 删除条目</button>
            </section>
        </div>`;
    enhanceSelects(panel);
}

function renderStats() {
    const entries = getEntries();
    state.root.querySelector('[data-role="stats"]').innerHTML = state.data
        ? `<span>${entries.length} 个条目</span><span>${entries.filter(x => !x.disable).length} 个启用</span><span>${entries.filter(x => x.constant).length} 个常驻</span><span>${state.conflicts.length} 个检查结果</span>`
        : '<span>请选择或新建世界书</span>';
}

function renderAll() {
    renderWorldSelect();
    renderHeader();
    renderEntryList();
    renderEditor();
    renderSettings();
    renderStats();
}

async function selectWorld(name, { force = false } = {}) {
    if (!force && state.dirty && !await confirmDiscard()) {
        renderWorldSelect();
        return;
    }
    state.worldName = name || '';
    state.data = name ? structuredClone(await loadWorldInfo(name)) : null;
    state.selectedUid = getEntries()[0]?.uid ?? null;
    state.selectedUids.clear();
    state.batchMode = false;
    state.dirty = false;
    state.undo = null;
    state.conflicts = [];
    if (name) localStorage.setItem(LAST_WORLD_KEY, name);
    renderAll();
}

async function updateTokenCount(content) {
    clearTimeout(state.tokenTimer);
    state.tokenTimer = setTimeout(async () => {
        const meta = state.root?.querySelector('[data-role="content-meta"]');
        if (!meta) return;
        try {
            meta.textContent = `${content.length} 字符 · 约 ${await getTokenCountAsync(content)} tokens`;
        } catch {
            meta.textContent = `${content.length} 字符`;
        }
    }, 250);
}

function updateEntryField(target) {
    const entry = getEntry();
    if (!entry || !target.name) return;
    const arrayFields = ['key', 'keysecondary'];
    const nullableNumberFields = ['scanDepth'];
    const numericFields = ['position', 'depth', 'order', 'role', 'selectiveLogic', 'probability', 'groupWeight'];
    const invertedFields = ['enabled'];
    if (arrayFields.includes(target.name)) entry[target.name] = splitKeywords(target.value);
    else if (nullableNumberFields.includes(target.name)) entry[target.name] = target.value === '' ? null : Number(target.value);
    else if (numericFields.includes(target.name)) entry[target.name] = Number(target.value);
    else if (invertedFields.includes(target.name)) entry.disable = !target.checked;
    else if (target.type === 'checkbox') entry[target.name] = target.checked;
    else entry[target.name] = target.value;
    markDirty();
    if (target.name === 'content') updateTokenCount(target.value);
    if (['comment', 'key', 'constant', 'enabled'].includes(target.name)) renderEntryList();
}

async function save() {
    if (!state.data || !state.dirty) return;
    try {
        const saved = structuredClone(state.data);
        await saveWorldInfo(state.worldName, saved, true);
        state.data = structuredClone(await loadWorldInfo(state.worldName));
        state.dirty = false;
        toastr.success('世界书已保存', '世界书创作台');
        renderAll();
    } catch (error) {
        console.error('[世界书创作台] 保存失败', error);
        toastr.error('保存失败，当前草稿仍然保留。');
    }
}

function showStudioModal({ title, description = '', content = '', confirmLabel = '确认', tone = 'default' }) {
    return new Promise(resolve => {
        state.modalClose?.(null);
        const layer = state.root.querySelector('[data-role="modal"]');
        layer.className = 'wbs-modal-layer open';
        layer.setAttribute('aria-hidden', 'false');
        layer.innerHTML = `
            <button class="wbs-modal-scrim" type="button" data-modal-dismiss aria-label="关闭弹窗"></button>
            <form class="wbs-modal ${tone === 'danger' ? 'danger' : ''}" role="dialog" aria-modal="true" aria-labelledby="wbs-modal-title">
                <header class="wbs-modal-head">
                    <span class="wbs-modal-mark"><i class="fa-solid ${tone === 'danger' ? 'fa-triangle-exclamation' : 'fa-diamond'}"></i></span>
                    <div><small>WORLDBOOK / ACTION</small><h2 id="wbs-modal-title">${escapeHtml(title)}</h2></div>
                    <button class="wbs-modal-close" type="button" data-modal-dismiss aria-label="关闭"><i class="fa-solid fa-xmark"></i></button>
                </header>
                ${description ? `<p class="wbs-modal-description">${escapeHtml(description)}</p>` : ''}
                <div class="wbs-modal-content">${content}</div>
                <footer class="wbs-modal-actions">
                    <button type="button" data-modal-dismiss>取消</button>
                    <button class="wbs-modal-confirm ${tone === 'danger' ? 'danger' : ''}" type="submit">${escapeHtml(confirmLabel)}</button>
                </footer>
            </form>`;
        const form = layer.querySelector('form');
        let settled = false;
        const close = value => {
            if (settled) return;
            settled = true;
            layer.className = 'wbs-modal-layer';
            layer.setAttribute('aria-hidden', 'true');
            layer.replaceChildren();
            state.modalClose = null;
            resolve(value);
        };
        state.modalClose = close;
        enhanceSelects(form);
        layer.querySelectorAll('[data-modal-dismiss]').forEach(button => button.addEventListener('click', () => close(null)));
        form.addEventListener('submit', event => {
            event.preventDefault();
            close(Object.fromEntries(new FormData(form).entries()));
        });
        requestAnimationFrame(() => form.querySelector('input, select, textarea, button[type="submit"]')?.focus());
    });
}

async function askConfirm(title, description, options = {}) {
    return Boolean(await showStudioModal({ title, description, ...options }));
}

async function askInput(title, description, { value = '', placeholder = '', confirmLabel = '确认' } = {}) {
    const result = await showStudioModal({
        title,
        description,
        confirmLabel,
        content: `<label class="wbs-modal-field"><span>名称</span><input name="value" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" autocomplete="off" required></label>`,
    });
    return result?.value?.trim() || null;
}

async function confirmDiscard() {
    if (!state.dirty) return true;
    return askConfirm('有未保存的更改', '继续操作会放弃当前条目的草稿。', { confirmLabel: '放弃更改', tone: 'danger' });
}

function selectEntry(uid) {
    if (!getEntry(uid)) return;
    state.selectedUid = Number(uid);
    renderEntryList();
    renderEditor();
    renderSettings();
}

function createEntry() {
    if (!state.data) return toastr.warning('请先新建或选择一个世界书。');
    setUndo('撤销新建条目');
    const entry = createWorldInfoEntry(state.worldName, state.data);
    entry.displayIndex = getEntries().length - 1;
    entry.comment = '新条目';
    state.selectedUid = entry.uid;
    markDirty();
    renderAll();
    requestAnimationFrame(() => state.root.querySelector('[name="comment"]')?.select());
}

async function deleteEntries(uids) {
    if (!uids.length) return;
    const accepted = await askConfirm('删除条目', `将删除选中的 ${uids.length} 个条目。保存前仍可撤销。`, { confirmLabel: `删除 ${uids.length} 个条目`, tone: 'danger' });
    if (!accepted) return;
    setUndo('撤销删除条目');
    uids.forEach(uid => delete state.data.entries[String(uid)]);
    state.selectedUids.clear();
    state.selectedUid = getEntries()[0]?.uid ?? null;
    markDirty();
    renderAll();
}

function findConflicts() {
    const entries = getEntries();
    const issues = [];
    const normalize = value => String(value).trim().toLocaleLowerCase();
    const add = (severity, title, detail, uids) => issues.push({ severity, title, detail, uids: [...new Set(uids)] });
    for (const entry of entries) {
        if (entry.disable) continue;
        if (!entry.content?.trim()) add('error', '启用条目没有内容', entryTitle(entry), [entry.uid]);
        if (!entry.constant && !(entry.key || []).some(key => key.trim())) add('error', '条目无法触发', `${entryTitle(entry)}既非常驻，也没有主关键词。`, [entry.uid]);
        if (entry.useProbability !== false && Number(entry.probability) === 0) add('warning', '触发概率为 0', entryTitle(entry), [entry.uid]);
    }
    const active = entries.filter(entry => !entry.disable);
    for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
            const a = active[i]; const b = active[j];
            const aKeys = new Set((a.key || []).map(normalize).filter(Boolean));
            const bKeys = new Set((b.key || []).map(normalize).filter(Boolean));
            const exact = [...aKeys].filter(key => bKeys.has(key));
            if (exact.length) add('error', '主关键词完全重复', `“${exact.join('、')}”同时用于“${entryTitle(a)}”和“${entryTitle(b)}”。`, [a.uid, b.uid]);
            const contained = [...aKeys].some(x => [...bKeys].some(y => x !== y && (x.includes(y) || y.includes(x))));
            if (contained) add('warning', '关键词存在包含关系', `“${entryTitle(a)}”与“${entryTitle(b)}”可能同时触发。`, [a.uid, b.uid]);
            const union = new Set([...aKeys, ...bKeys]);
            const overlap = [...aKeys].filter(key => bKeys.has(key)).length;
            if (!exact.length && union.size && overlap / union.size > 0.5) add('suggestion', '关键词集合高度重叠', `“${entryTitle(a)}”与“${entryTitle(b)}”的关键词重合超过一半。`, [a.uid, b.uid]);
            if (entryTitle(a).toLocaleLowerCase() === entryTitle(b).toLocaleLowerCase()) add('warning', '条目标题重复', entryTitle(a), [a.uid, b.uid]);
        }
    }
    if (active.filter(entry => entry.constant).length > 12) add('suggestion', '常驻条目较多', '当前世界书有超过 12 个启用的常驻条目，可能持续占用上下文。', active.filter(x => x.constant).map(x => x.uid));
    state.conflicts = issues;
    renderAll();
    showConflicts();
}

function showConflicts() {
    const drawer = state.root.querySelector('[data-role="drawer"]');
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    drawer.innerHTML = `<div class="wbs-drawer-head"><div><small>QUALITY / REVIEW</small><h2>冲突检查</h2></div><button class="wbs-icon" data-action="close-drawer"><i class="fa-solid fa-xmark"></i></button></div>
        <p class="wbs-drawer-copy">检查只提供提示，不会自动修改世界书。</p>
        <div class="wbs-issue-list">${state.conflicts.length ? state.conflicts.map((issue, index) => `
            <button class="wbs-issue ${issue.severity}" data-action="locate-issue" data-issue="${index}"><i class="fa-solid ${issue.severity === 'error' ? 'fa-circle-xmark' : issue.severity === 'warning' ? 'fa-triangle-exclamation' : 'fa-lightbulb'}"></i><span><strong>${escapeHtml(issue.title)}</strong><small>${escapeHtml(issue.detail)}</small></span></button>`).join('') : '<div class="wbs-clean"><i class="fa-solid fa-circle-check"></i><h3>没有发现明显问题</h3><p>当前条目的基础触发配置看起来正常。</p></div>'}</div>`;
}

async function transferEntries() {
    const uids = state.selectedUids.size ? [...state.selectedUids] : [state.selectedUid].filter(Number.isInteger);
    const targets = world_names.filter(name => name !== state.worldName);
    if (!targets.length) return toastr.warning('还没有其他可接收条目的世界书。');
    const result = await showStudioModal({
        title: '复制或移动条目',
        description: `已选择 ${uids.length} 个条目。复制会保留原条目，移动会从当前世界书删除原条目。`,
        confirmLabel: '继续',
        content: `
            <label class="wbs-modal-field"><span>目标世界书</span><select name="target">${targets.map(name => `<option>${escapeHtml(name)}</option>`).join('')}</select></label>
            <label class="wbs-modal-choice"><input name="move" value="true" type="checkbox"><span><i class="fa-solid fa-arrow-right-arrow-left"></i><strong>移动条目</strong><small>完成后从当前世界书删除原条目</small></span></label>`,
    });
    if (!result) return;
    const target = result.target;
    const shouldMove = result.move === 'true';
    // 跨世界书操作会立即落盘，先保存当前草稿，避免移动旧版本条目。
    if (state.dirty) await save();
    const targetData = await loadWorldInfo(target);
    const targetKeys = new Set(Object.values(targetData.entries || {}).flatMap(entry => entry.key || []).map(key => key.trim().toLocaleLowerCase()));
    const duplicateKeys = uids.flatMap(uid => getEntry(uid)?.key || []).filter(key => targetKeys.has(key.trim().toLocaleLowerCase()));
    if (duplicateKeys.length && !await askConfirm('目标世界书可能存在重复条目', `已经存在这些关键词：${[...new Set(duplicateKeys)].join('、')}。`, { confirmLabel: '仍然继续' })) return;
    const sourceBefore = structuredClone(await loadWorldInfo(state.worldName));
    const targetBefore = structuredClone(targetData);
    for (const uid of uids) await moveWorldInfoEntry(state.worldName, target, uid, { deleteOriginal: shouldMove });
    state.undo = {
        kind: 'transfer',
        description: shouldMove ? '撤销移动条目' : '撤销复制条目',
        books: [
            { name: state.worldName, data: sourceBefore },
            { name: target, data: targetBefore },
        ],
        selectedUid: state.selectedUid,
    };
    state.data = structuredClone(await loadWorldInfo(state.worldName));
    state.selectedUid = getEntries()[0]?.uid ?? null;
    state.selectedUids.clear();
    state.dirty = false;
    renderAll();
}

async function batchMenu() {
    if (!state.selectedUids.size) return toastr.info('请先选择要批量处理的条目。');
    const result = await showStudioModal({
        title: '批量操作',
        description: `已选择 ${state.selectedUids.size} 个条目。请选择要对它们统一执行的操作。`,
        confirmLabel: '执行操作',
        content: `<div class="wbs-batch-options">
            <label><input type="radio" name="action" value="enable" checked><span><i class="fa-solid fa-toggle-on"></i><strong>批量启用</strong><small>让所选条目参与世界书扫描</small></span></label>
            <label><input type="radio" name="action" value="disable"><span><i class="fa-solid fa-toggle-off"></i><strong>批量停用</strong><small>保留条目，但不再触发</small></span></label>
            <label><input type="radio" name="action" value="transfer"><span><i class="fa-solid fa-arrow-right-arrow-left"></i><strong>复制或移动</strong><small>发送到另一个世界书</small></span></label>
            <label class="danger"><input type="radio" name="action" value="delete"><span><i class="fa-solid fa-trash"></i><strong>批量删除</strong><small>保存前仍可撤销</small></span></label>
        </div>`,
    });
    if (!result) return;
    const action = result.action;
    if (action === 'transfer') {
        await transferEntries();
        state.batchMode = false;
        return renderEntryList();
    }
    if (action === 'delete') {
        await deleteEntries([...state.selectedUids]);
        state.batchMode = false;
        return renderAll();
    }
    setUndo(action === 'enable' ? '撤销批量启用' : '撤销批量停用');
    state.selectedUids.forEach(uid => { getEntry(uid).disable = action === 'disable'; });
    state.selectedUids.clear();
    state.batchMode = false;
    markDirty(); renderAll();
}

function toggleBatchSelection(uid) {
    state.selectedUids.has(uid) ? state.selectedUids.delete(uid) : state.selectedUids.add(uid);
    renderEntryList();
}

function cancelBatchMode() {
    state.batchMode = false;
    state.selectedUids.clear();
    renderEntryList();
}

async function handleClick(event) {
    const selectTrigger = event.target.closest('.wbs-select-trigger');
    const selectOption = event.target.closest('[data-select-index]');
    if (selectTrigger) {
        const wrapper = selectTrigger.closest('.wbs-select');
        wrapper.classList.contains('open') ? closeCustomSelects() : openCustomSelect(wrapper);
        return;
    }
    if (selectOption) {
        const wrapper = selectOption.closest('.wbs-select');
        const select = wrapper.querySelector('select');
        select.selectedIndex = Number(selectOption.dataset.selectIndex);
        wrapper.querySelector('.wbs-select-trigger span').textContent = select.selectedOptions[0]?.textContent || '';
        wrapper.querySelectorAll('[data-select-index]').forEach(button => button.setAttribute('aria-selected', String(button === selectOption)));
        closeCustomSelects();
        select.dispatchEvent(new HostEvent('change', { bubbles: true }));
        wrapper.querySelector('.wbs-select-trigger')?.focus();
        return;
    }
    if (!event.target.closest('.wbs-select')) closeCustomSelects();
    const picker = event.target.closest('[data-role="world-picker"]');
    if (!picker && state.worldPickerOpen) {
        state.worldPickerOpen = false;
        renderWorldSelect();
    }
    const filter = event.target.closest('[data-filter]');
    if (filter) {
        state.filter = filter.dataset.filter;
        state.root.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active', item === filter));
        return renderEntryList();
    }
    const button = event.target.closest('[data-action]');
    const row = event.target.closest('.wbs-entry');
    if (row && !button) return state.batchMode ? toggleBatchSelection(Number(row.dataset.uid)) : selectEntry(Number(row.dataset.uid));
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'toggle-world-picker') {
        state.worldPickerOpen = !state.worldPickerOpen;
        state.worldQuery = '';
        renderWorldSelect();
        if (state.worldPickerOpen) requestAnimationFrame(() => {
            centerCurrentWorldOption();
            state.root.querySelector('[data-role="world-search"]')?.focus();
        });
        return;
    }
    if (action === 'select-world') {
        state.worldPickerOpen = false;
        state.worldQuery = '';
        return selectWorld(button.dataset.world);
    }
    if (action === 'close') return closeStudio();
    if (action === 'save') return save();
    if (action === 'new-entry') return createEntry();
    if (action === 'delete-entry') return deleteEntries([state.selectedUid]);
    if (action === 'check') return findConflicts();
    if (action === 'show-conflicts') return showConflicts();
    if (action === 'close-drawer') return button.closest('.wbs-drawer').classList.remove('open');
    if (action === 'toggle-select') return toggleBatchSelection(Number(button.dataset.uid));
    if (action === 'cancel-batch') return cancelBatchMode();
    if (action === 'batch') {
        if (!state.batchMode) {
            state.batchMode = true;
            state.selectedUids.clear();
            return renderEntryList();
        }
        return batchMenu();
    }
    if (action === 'transfer') return transferEntries();
    if (action === 'duplicate-entry') { setUndo('撤销复制条目'); const source = structuredClone(getEntry()); const copy = createWorldInfoEntry(state.worldName, state.data); Object.assign(copy, source, { uid: copy.uid, comment: `${entryTitle(source)}（副本）`, displayIndex: getEntries().length - 1 }); state.selectedUid = copy.uid; markDirty(); return renderAll(); }
    if (action === 'undo') return undo();
    if (action === 'export') return exportWorld();
    if (action === 'import') return state.root.querySelector('[data-role="file-input"]').click();
    if (action === 'new-world') return newWorld();
    if (action === 'delete-world') return removeWorld();
    if (action === 'rename-world') return renameWorld();
    if (action === 'locate-issue') { const issue = state.conflicts[Number(button.dataset.issue)]; button.closest('.wbs-drawer').classList.remove('open'); if (issue?.uids.length) selectEntry(issue.uids[0]); }
}

function handleInput(event) {
    if (event.target.matches('[data-role="world-search"]')) {
        state.worldQuery = event.target.value;
        return renderWorldOptions();
    }
    if (event.target.matches('[data-role="search"]')) { state.query = event.target.value; return renderEntryList(); }
    if (event.target.closest('[data-role="editor"], [data-role="settings"]')) updateEntryField(event.target);
}

function handleChange(event) {
    if (event.target.closest('[data-role="editor"], [data-role="settings"]')) updateEntryField(event.target);
}

async function undo() {
    if (!state.undo) return;
    if (state.undo.kind === 'transfer') {
        const undoState = state.undo;
        for (const book of undoState.books) await saveWorldInfo(book.name, structuredClone(book.data), true);
        state.data = structuredClone(await loadWorldInfo(state.worldName));
        state.selectedUid = undoState.selectedUid;
        state.undo = null;
        state.dirty = false;
        toastr.success('跨世界书操作已撤销。');
        return renderAll();
    }
    if (state.undo.worldName !== state.worldName) return toastr.warning('只能在原世界书中撤销该操作。');
    state.data = structuredClone(state.undo.data);
    state.selectedUid = state.undo.selectedUid;
    state.undo = null;
    state.dirty = true;
    renderAll();
}

function exportWorld() {
    if (!state.data) return;
    // __helper 只用于无损回写，不应出现在用户导出的 SillyTavern 世界书文件中。
    const exported = JSON.stringify(state.data, (key, value) => key === '__helper' ? undefined : value, 2);
    const blob = new HostBlob([exported], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = HostURL.createObjectURL(blob);
    link.download = `${state.worldName}.json`;
    link.click();
    HostURL.revokeObjectURL(link.href);
}

async function handleImport(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || state.dirty && !await confirmDiscard()) return;
    const before = new Set(world_names);
    await importWorldInfo(file);
    await updateWorldInfoList();
    const importedName = world_names.find(name => !before.has(name));
    await selectWorld(importedName || state.worldName || world_names.at(-1) || '', { force: true });
}

async function newWorld() {
    if (state.dirty && !await confirmDiscard()) return;
    const name = await askInput('新建世界书', '为新的世界书设置一个容易识别的名称。', { value: '新世界书', confirmLabel: '创建世界书' });
    if (!name) return;
    if (world_names.includes(name)) return toastr.warning('已经存在同名世界书。');
    if (await createNewWorldInfo(name, { interactive: false })) await selectWorld(name, { force: true });
}

async function removeWorld() {
    if (!state.worldName) return;
    if (!await askConfirm('删除世界书', `“${state.worldName}”及其中全部条目将被永久删除，此操作无法撤销。`, { confirmLabel: '永久删除', tone: 'danger' })) return;
    await deleteWorldInfo(state.worldName);
    await selectWorld(world_names[0] || '', { force: true });
}

async function renameWorld() {
    if (!state.data || state.dirty && !await confirmDiscard()) return;
    const oldName = state.worldName;
    const newName = await askInput('重命名世界书', '会同步全局、当前角色卡与当前聊天的关联；其他角色卡的旧关联需之后手动调整。', { value: oldName, confirmLabel: '保存名称' });
    if (!newName || newName === oldName) return;
    if (world_names.includes(newName)) return toastr.warning('已经存在同名世界书。');
    await renameWorldInfo(oldName, structuredClone(state.data), newName);
    await updateWorldInfoList();
    await selectWorld(world_names.includes(newName) ? newName : world_names[0] || '', { force: true });
}

async function handleKeydown(event) {
    if (!state.root) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 's') { event.preventDefault(); await save(); }
    if (event.key === 'Escape' && state.root.querySelector('.wbs-select.open')) {
        closeCustomSelects();
        return;
    }
    if (event.key === 'Escape' && state.modalClose) {
        state.modalClose(null);
        return;
    }
    if (event.key === 'Escape' && state.worldPickerOpen) {
        state.worldPickerOpen = false;
        renderWorldSelect();
        return;
    }
    if (event.key === 'Escape' && !state.root.querySelector('.wbs-drawer.open')) await closeStudio();
}

async function closeStudio() {
    if (state.dirty && !await confirmDiscard()) return;
    state.modalClose?.(null);
    document.removeEventListener('keydown', handleKeydown);
    state.root?.remove();
    Object.assign(state, { root: null, data: null, worldName: '', selectedUid: null, dirty: false, undo: null, conflicts: [], batchMode: false, modalClose: null });
    document.body.classList.remove('wbs-open');
    document.body.classList.remove('wbs-resizing');
}

async function openStudio() {
    if (state.root) return;
    await updateWorldInfoList();
    buildShell();
    document.body.classList.add('wbs-open');
    const rememberedWorld = localStorage.getItem(LAST_WORLD_KEY);
    await selectWorld(world_names.includes(rememberedWorld) ? rememberedWorld : world_names[0] || '', { force: true });
}

function addMenuButton() {
    if (document.getElementById(`${ID}-menu-button`)) return;
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return setTimeout(addMenuButton, 500);
    const button = document.createElement('div');
    button.id = `${ID}-menu-button`;
    button.className = 'list-group-item flex-container flexGap5';
    button.innerHTML = '<div class="fa-solid fa-book-open extensionsMenuExtensionButton"></div><span>世界书创作台</span>';
    button.addEventListener('click', openStudio);
    menu.append(button);
}

function injectStyles() {
    document.getElementById(STYLE_ID)?.remove();
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STUDIO_CSS;
    document.head.append(style);
}

function destroyRuntime() {
    state.modalClose?.(null);
    document.removeEventListener('keydown', handleKeydown);
    document.getElementById(`${ID}-overlay`)?.remove();
    document.getElementById(`${ID}-menu-button`)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    document.body.classList.remove('wbs-open', 'wbs-resizing');
}

async function initialize() {
    try {
        hostWindow[RUNTIME_KEY]?.destroy?.();
        helper = await waitForTavernHelper();
        // 兼容曾安装过的扩展版：替换同名入口，避免同时出现两个创作台。
        document.getElementById(`${ID}-overlay`)?.remove();
        document.getElementById(`${ID}-menu-button`)?.remove();
        document.body.classList.remove('wbs-open', 'wbs-resizing');
        injectStyles();
        addMenuButton();
        hostWindow[RUNTIME_KEY] = { version: VERSION, destroy: destroyRuntime, open: openStudio };
        console.info(`[世界书创作台] v${VERSION} 已加载`);
    } catch (error) {
        console.error('[世界书创作台] 加载失败', error);
        toastr?.error?.(error.message || '世界书创作台加载失败');
    }
}

jQuery(initialize);
