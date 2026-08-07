// A.U.T.O 角色卡创作台 bootstrap v4
// 仅负责加载正式目录中的最新版本；加载失败时不回退到内置旧版。

const hostWindow = window.parent;
const BOOTSTRAP_STATE_KEY = '__AUTO_CARD_STUDIO_BOOTSTRAP_V4__';
// 与正式脚本共用版本缓存：启动阶段和后台扫描只需消费同一份轻量目录结果。
const PUBLISHED_VERSION_CACHE_KEY = 'auto-card-studio:update-state:v1';
const PUBLISHED_VERSION_CACHE_TTL = 6 * 60 * 60 * 1000;
const CATALOG_URLS = [
    'https://raw.githubusercontent.com/NightingNine/sillytavern-scripts/main/catalog.json',
    'https://cdn.jsdelivr.net/gh/NightingNine/sillytavern-scripts@main/catalog.json',
];
const VERSIONED_SCRIPT_URL = version =>
    `https://cdn.jsdelivr.net/gh/NightingNine/sillytavern-scripts@auto-card-studio-v${version}/dist/character-creation/auto-card-studio/index.js`;

function getPublishedVersion(catalog) {
    const entries = catalog?.categories?.['character-creation'];
    const entry = Array.isArray(entries) ? entries.find(item => item?.id === 'auto-card-studio') : null;
    const version = String(entry?.version || '').trim();

    if (!/^\d+\.\d+\.\d+$/.test(version)) {
        throw new Error('正式目录中的版本号无效');
    }

    return version;
}

function getCachedPublishedVersion() {
    try {
        const cached = JSON.parse(hostWindow.localStorage.getItem(PUBLISHED_VERSION_CACHE_KEY) || 'null');
        const version = String(cached?.version || '').trim();
        const checkedAt = Number(cached?.checkedAt || 0);
        if (/^\d+\.\d+\.\d+$/.test(version) && Date.now() - checkedAt < PUBLISHED_VERSION_CACHE_TTL) {
            return version;
        }
    } catch {
        // 缓存不可用或损坏时直接联网，不影响启动。
    }
    return '';
}

function savePublishedVersion(version) {
    try {
        hostWindow.localStorage.setItem(PUBLISHED_VERSION_CACHE_KEY, JSON.stringify({ version, checkedAt: Date.now() }));
    } catch {
        // 隐私模式或存储满时仍允许本次启动继续。
    }
}

async function fetchPublishedVersion() {
    const cachedVersion = getCachedPublishedVersion();
    if (cachedVersion) return cachedVersion;
    const errors = [];
    const cacheBuster = Date.now();

    for (const catalogUrl of CATALOG_URLS) {
        try {
            const response = await hostWindow.fetch(`${catalogUrl}?t=${cacheBuster}`, {
                cache: 'no-store',
                headers: { Accept: 'application/json' },
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const version = getPublishedVersion(await response.json());
            savePublishedVersion(version);
            return version;
        } catch (error) {
            errors.push(`${catalogUrl}: ${error?.message || error}`);
        }
    }

    throw new Error(`无法读取正式版本目录（${errors.join('；')}）`);
}

function reportBootstrapError(error) {
    const detail = error?.message || String(error);
    const message = `启动失败：${detail}。请检查网络后刷新 SillyTavern。`;

    console.error('[A.U.T.O Card Studio] bootstrap v4 启动失败', error);
    if (typeof hostWindow.toastr?.error === 'function') {
        hostWindow.toastr.error(message, 'A.U.T.O 角色卡创作台');
    }
}

async function startLatestPublishedStudio() {
    const version = await fetchPublishedVersion();
    const scriptUrl = VERSIONED_SCRIPT_URL(version);

    console.info(`[A.U.T.O Card Studio] bootstrap v4 正在加载正式版 v${version}。`);
    try {
        await import(scriptUrl);
    } catch (error) {
        throw new Error(`正式版 v${version} 加载失败：${error?.message || error}`);
    }
}

if (!hostWindow[BOOTSTRAP_STATE_KEY]) {
    const state = { promise: null };
    state.promise = startLatestPublishedStudio().catch(error => {
        reportBootstrapError(error);
        // 失败后允许用户重新启用脚本重试，不保留错误状态。
        if (hostWindow[BOOTSTRAP_STATE_KEY] === state) {
            delete hostWindow[BOOTSTRAP_STATE_KEY];
        }
    });
    hostWindow[BOOTSTRAP_STATE_KEY] = state;
}
