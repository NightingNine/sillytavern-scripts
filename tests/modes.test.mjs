import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { normalizeSimpleState, buildSimpleRequest, SIMPLE_STORAGE_KEY } from '../modes/simple-state.js';

const state = normalizeSimpleState({ definitions: { aiRole: '角色设计师', systemPrompt: '只讨论人物性格。' }, draft: '设计一位老师',
    turns: [{ role: 'user', content: '上轮要求' }, { role: 'assistant', content: '上轮回复' }],
    steps: { 1: 'AUTO_STEP_SENTINEL' }, artifacts: ['AUTO_ARTIFACT_SENTINEL'], regexes: ['AUTO_REGEX_SENTINEL'] });
const request = buildSimpleRequest(state, 'simple-test');
assert.deepEqual(request.overrides.chat_history.prompts, []);
assert.equal(request.ordered_prompts.at(-1), 'user_input');
assert.equal(request.user_input, '设计一位老师');
assert.equal(request.ordered_prompts.filter(x => x?.content === '上轮要求').length, 1);
assert.ok(request.ordered_prompts[0].content.includes('角色设计师'));
assert.ok(!JSON.stringify(request).includes('SENTINEL'));
assert.ok(!SIMPLE_STORAGE_KEY.includes('project:v1'));
assert.deepEqual(normalizeSimpleState(null).turns, []);

const stored = new Map(), calls = [], actions = { children: [], querySelector() { return this.children[0]; }, prepend(button) { this.children.push(button); } };
let busy = false;
const auto = { async open() { calls.push('open-auto'); }, close() { calls.push('close-auto'); return true; }, isGenerating: () => busy };
const simple = { async open() { calls.push('open-simple'); }, close() { calls.push('close-simple'); return true; }, isGenerating: () => busy };
const sandbox = vm.createContext({ localStorage: { getItem: k => stored.get(k), setItem: (k, v) => stored.set(k, v) },
    window: { toastr: { warning: () => calls.push('warning'), error() {} } }, console,
    document: { querySelector: () => actions, createElement: () => ({ dataset: {}, setAttribute() {}, addEventListener() {} }) } });
const source = fs.readFileSync(new URL('../modes/index.js', import.meta.url), 'utf8');
const module = new vm.SourceTextModule(source, { context: sandbox });
await module.link(specifier => { const m = new vm.SyntheticModule(['default'], function () { this.setExport('default', specifier === './auto.js' ? auto : simple); }, { context: sandbox }); return m; });
await module.evaluate();
await module.namespace.openStudioMode();
assert.ok(actions.children[0].innerHTML.includes('fa-right-left'));
busy = true; await module.namespace.switchMode('simple');
assert.equal(calls.at(-1), 'warning'); assert.equal(stored.size, 0);
busy = false; await module.namespace.switchMode('simple');
assert.equal(calls.at(-1), 'open-simple'); assert.equal(stored.get('auto-card-studio:mode:v1'), 'simple');
await module.namespace.switchMode('auto'); assert.equal(calls.at(-1), 'open-auto');
assert.equal(actions.children.length, 1);
console.log('PASS: simple prompt isolation, separate storage, mode switching, generation lock and two-arrow icon.');
