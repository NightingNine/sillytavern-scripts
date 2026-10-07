const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const events = new Map();
const menu = { querySelector: () => null, append: item => { menu.item = item; } };
const storage = new Map();
const localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) };
const document = {
  querySelectorAll: () => [], querySelector: s => s === '#extensionsMenu' ? menu : null,
  createElement: () => ({ addEventListener() {} }), addEventListener() {}, removeEventListener() {},
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
const source = fs.readFileSync(require('node:path').join(__dirname, '../dist/character-creation/auto-card-studio/index.js'), 'utf8')
  .replace('export const autoMode', 'const autoMode').replaceAll('import.meta.url', JSON.stringify('http://localhost/scripts/extensions/third-party/auto-card-studio/dist/character-creation/auto-card-studio/index.js?sillytavern-extension'));
vm.runInContext(source, sandbox);
assert.equal(menu.item.id, 'auto-card-studio-wand-launcher');
assert.equal(window.__autoCardStudioRuntimeControllerV1.version, '0.7.2');
assert.equal(events.size, 0, 'Extension startup must not subscribe to script buttons');
vm.runInContext('globalThis.testSubscription = subscribeStudioEvent("stream", () => {});', sandbox);
assert.equal(events.size, 1);
sandbox.testSubscription.stop();
assert.equal(events.size, 0);
vm.runInContext('updateStudioExtension()', sandbox).then(() => {
  assert.equal(request.url, '/api/extensions/update');
  assert.deepEqual(JSON.parse(request.body), { extensionName: '/auto-card-studio', global: false });
  assert.equal(window.reloaded, true);
  console.log('PASS: extension starts without script globals; stream listeners unsubscribe; native updater reloads.');
}).catch(error => { console.error(error); process.exitCode = 1; });
