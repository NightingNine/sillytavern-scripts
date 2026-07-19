const TEST_BRANCH_API_URL = 'https://api.github.com/repos/NightingNine/sillytavern-scripts/branches/auto-card-studio-mobile-test';
const TEST_SCRIPT_PATH = 'dist/character-creation/auto-card-studio/index.js';
const TEST_BRANCH_PIN_KEY = 'auto-card-studio:test-branch-pin:v1';
const FALLBACK_REVISION = '715fe9c6d693cc6c415bd8164e8f4ec0d58874b9';

const hostWindow = window.parent;

function scriptUrl(revision) {
    return `https://cdn.jsdelivr.net/gh/NightingNine/sillytavern-scripts@${revision}/${TEST_SCRIPT_PATH}`;
}

async function resolveLatestRevision() {
    const response = await hostWindow.fetch(TEST_BRANCH_API_URL, {
        cache: 'no-store',
        headers: {
            Accept: 'application/vnd.github+json',
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const revision = String((await response.json())?.commit?.sha || '').trim();
    if (!/^[0-9a-f]{40}$/i.test(revision)) {
        throw new Error('测试分支没有返回有效版本号');
    }

    return revision;
}

let revision = FALLBACK_REVISION;

try {
    revision = await resolveLatestRevision();
} catch (error) {
    // GitHub 临时不可用时，仍可启动最近一次确认可用的测试版本。
    console.warn('[A.U.T.O Card Studio] 获取测试版更新失败，使用备用版本。', error);
}

try {
    hostWindow.localStorage.setItem(TEST_BRANCH_PIN_KEY, revision);
} catch {
    // 隐私模式可能禁止本地存储；不影响脚本本身启动。
}

await import(scriptUrl(revision));
