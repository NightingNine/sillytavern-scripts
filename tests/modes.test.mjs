import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
let mode='auto', busy=false, openCount=0;
const stored=new Map([['auto-card-studio:mode:v1','simple']]), calls=[];
const actions={children:[],querySelector(){return this.children[0]},prepend(button){this.children.push(button)}};
const studio={async open(){openCount++},isGenerating:()=>busy,getMode:()=>mode,async setMode(next){calls.push(next);mode=next;stored.set('auto-card-studio:mode:v1',next)}};
const sandbox=vm.createContext({localStorage:{getItem:k=>stored.get(k)},window:{toastr:{warning:()=>calls.push('warning')}},console,
document:{querySelector:()=>actions,createElement:()=>({dataset:{},setAttribute(){},addEventListener(){}})}});
const module=new vm.SourceTextModule(fs.readFileSync(new URL('../modes/index.js',import.meta.url),'utf8'),{context:sandbox});
await module.link(()=>new vm.SyntheticModule(['default'],function(){this.setExport('default',studio)},{context:sandbox}));
await module.evaluate();await module.namespace.openStudioMode();
assert.equal(mode,'simple');assert.equal(openCount,1);assert.ok(actions.children[0].innerHTML.includes('fa-right-left'));
busy=true;await module.namespace.switchMode('auto');assert.equal(mode,'simple');assert.equal(calls.at(-1),'warning');
busy=false;await module.namespace.switchMode('auto');assert.equal(mode,'auto');assert.equal(openCount,1,'Switch must retain the existing shell');
await module.namespace.openStudioMode();assert.equal(actions.children.length,1);
console.log('PASS: remembered logic mode, same shell switching, generation lock and two-arrow icon.');
