const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const nodes=new Map(),callbacks=[],events={},downloads=[];const noop=()=>{};
const ctx=new Proxy({}, {get(t,k){if(k.startsWith('create'))return()=>({addColorStop:noop});return t[k]||noop;},set(t,k,v){t[k]=v;return true;}});
function node(tag='DIV'){return {tagName:tag,value:'',checked:false,dataset:{},classList:{toggle:noop},setAttribute:noop,focus:noop,append:noop,remove:noop,textContent:'',getContext:()=>ctx,toBlob:fn=>fn(new Blob(['png'])),click(){if(tag==='A')downloads.push(this);}};}
const buttons=['metal','concrete','glass','smoke'].map(type=>({...node('BUTTON'),dataset:{type}}));
const document={hidden:false,getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},querySelectorAll:()=>buttons,addEventListener:(n,f)=>events[n]=f,createElement:t=>node(t.toUpperCase()),body:node()};
for(const [id,value] of [['intensity','1'],['size','1'],['speed','1'],['colour','#ffc878']])document.getElementById(id).value=value;
const env={document,IndustrialEffects:require('../effects.js'),Blob,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:noop},setTimeout:noop,requestAnimationFrame:f=>callbacks.push(f),console};
vm.createContext(env);vm.runInContext(fs.readFileSync('app.js','utf8'),env);
let time=0;function frame(){time+=16;callbacks.shift()(time);}
for(const b of buttons){b.onclick();nodes.get('fire').onclick();frame();assert.ok(Number.parseInt(nodes.get('count').textContent)>0);assert.ok(nodes.get('effectTitle').textContent.startsWith(b.dataset.type.toUpperCase()));}
nodes.get('pause').onclick();assert.equal(nodes.get('pause').textContent,'Resume');
const before=vm.runInContext('items[0].life',env);frame();assert.equal(vm.runInContext('items[0].life',env),before);
nodes.get('capture').onclick();assert.equal(downloads.at(-1).download,'industrial-impact-frame.png');
nodes.get('export').onclick();assert.equal(downloads.at(-1).download,'industrial-impact-preset.json');
nodes.get('pause').onclick();nodes.get('replay').onclick();frame();assert.ok(nodes.get('status').textContent.includes('Smoke burst'));
console.log('UI harness passed: all 4 selections, triggers, rendering calls, pause/resume, replay and export wiring.');
