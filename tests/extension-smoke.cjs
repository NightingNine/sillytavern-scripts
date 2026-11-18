const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const events = new Map();
const menu = { querySelector: () => null, append: item => { menu.item = item; } };
const storage = new Map();
const localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) };
const document = {
  querySelectorAll: () => [], querySelector: s => s === '#extensionsMenu' ? menu : null,
  createElement: () => ({ addEventListener(type, handler) { this[type] = handler; } }), addEventListener() {}, removeEventListener() {},
};
const context = { eventSource: {
  on: (type, listener) => events.set(type, listener),
  removeListener: (type, listener) => { if (events.get(type) === listener) events.delete(type); },
}, getRequestHeaders: () => ({ 'Content-Type': 'application/json' }) };
let request;
const window = {
  document, localStorage, sessionStorage: localStorage, Option: function () {},
  SillyTavern: { getContext: () => context },
  addEventListener() {}, removeEventListener() {}, setInterval: () => 1, clearInterval() {},
  setTimeout: () => 1, clearTimeout() {}, location: { reload: () => { window.reloaded = true; } },
  fetch: async (url, options) => { request = { url, ...options }; return { ok: true, json: async () => ({ isUpToDate: false }) }; },
};
window.parent = window;
const sandbox = { window, console, URL, localStorage, setTimeout: window.setTimeout, clearTimeout() {},
  TextEncoder, TextDecoder, structuredClone, Blob, AbortController, crypto: require('node:crypto').webcrypto,
};
vm.createContext(sandbox);
const extensionRoot = 'http://localhost/scripts/extensions/third-party/auto-card-studio/';
const entry = fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8');
const coreImport = entry.match(/import '(\.\/dist\/[^']+\?sillytavern-extension)';/);
assert.ok(coreImport, 'The extension entry must load the core in extension mode');
const coreUrl = new URL(coreImport[1], extensionRoot);
const corePath = coreUrl.pathname.slice(new URL(extensionRoot).pathname.length);
const source = fs.readFileSync(path.join(__dirname, '..', corePath), 'utf8')
  .replaceAll('import.meta.url', JSON.stringify(coreUrl.href));
vm.runInContext(source, sandbox);
assert.equal(menu.item.id, 'auto-card-studio-wand-launcher');
assert.equal(window.__autoCardStudioRuntimeControllerV1.version, '0.7.3');
assert.equal(events.size, 0, 'Extension startup must not subscribe to script buttons');
vm.runInContext('globalThis.testSubscription = subscribeStudioEvent("stream", () => {});', sandbox);
assert.equal(events.size, 1);
sandbox.testSubscription.stop();
assert.equal(events.size, 0);
async function main() {
  let opens = 0;
  sandbox.testOpen = () => { opens += 1; };
  vm.runInContext('openStudio = async () => globalThis.testOpen();', sandbox);
  await menu.item.click();
  assert.equal(opens, 1, 'The wand uses the core open handler');

  const snapshot = await vm.runInContext(`
    const legacyProject = createDefaultProject();
    legacyProject.studioMode = 'simple';
    legacyProject.steps[1] = normalizeStepState({ turns: [{ role: 'user', content: 'Simple conversation' }] }, 1);
    legacyProject.modeWorkspaces = {
        auto: { currentStep: 5, steps: {
            5: { status: 'accepted', turns: [{ role: 'user', content: 'AUTO conversation' }] },
        } },
    };
    readProjectDatabaseSnapshot = async () => ({
        projects: [projectMetadataRecordFor(legacyProject)],
        steps: [conversationRecordFor(legacyProject, 1)],
    });
    let migratedSnapshot;
    writeProjectDatabaseChanges = async (projects, steps) => {
        migratedSnapshot = { projects, steps };
    };
    ensureProjectDatabaseLoaded().then(() => migratedSnapshot);
  `, sandbox);
  assert.equal(snapshot.projects.length, 1, 'The restored metadata is persisted with the steps');
  assert.equal(snapshot.projects[0].currentStep, 5);
  assert.equal(snapshot.projects[0].studioMode, undefined);
  assert.equal(snapshot.projects[0].modeWorkspaces.simple.steps[1].turns[0].content, 'Simple conversation');
  assert.equal(snapshot.steps.find(record => record.step === 1).turns.length, 0);
  assert.equal(snapshot.steps.find(record => record.step === 5).turns[0].content, 'AUTO conversation');
  assert.equal(vm.runInContext('restoreAutoWorkspace(project)', sandbox), false);

  const vault = vm.runInContext(`
    const storedVault = normalizeArtifactVault({
        versions: [
            { id: 'auto', step: 1, identity: 'manual-1', content: 'AUTO artifact' },
            { id: 'simple', step: 1, identity: 'manual-1', content: 'Simple artifact', studioMode: 'simple' },
        ],
        selectedVersionIds: { '1:manual-1': 'simple' },
    }, project.id);
    normalizeArtifactVault(storedVault, project.id);
  `, sandbox);
  assert.equal(vault.versions.length, 1);
  assert.equal(vault.selectedVersionIds['1:manual-1'], 'auto');
  assert.equal(vault.archivedSimpleVersions.length, 1);
  assert.equal(vault.archivedSimpleVersions[0].content, 'Simple artifact');

  await vm.runInContext('updateStudioExtension()', sandbox);

  assert.equal(request.url, '/api/extensions/update');
  assert.deepEqual(JSON.parse(request.body), { extensionName: '/auto-card-studio', global: false });
  assert.equal(window.reloaded, true);
  console.log('PASS: extension launcher, legacy workspace migration, artifact archive, stream cleanup and native updater.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
