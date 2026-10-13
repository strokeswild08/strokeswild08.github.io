const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const nodes=new Map(),downloads=[],callbacks=[],events={};
const noop=()=>{};
const ctx=new Proxy({}, {get(target,key){if(key.startsWith('create'))return()=>({addColorStop:noop});return target[key]||noop;},set(target,key,value){target[key]=value;return true;}});
function node(tag='DIV'){
 return {tagName:tag,value:'',checked:false,dataset:{},classList:{toggle:noop},setAttribute:noop,append:noop,remove:noop,
 getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:960,height:620}),toBlob:fn=>fn(new Blob(['png'])),
 click(){if(tag==='A')downloads.push(this);},textContent:''};
}
const document={hidden:false,getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},querySelectorAll:()=>materials,createElement:tag=>node(tag.toUpperCase()),body:node(),addEventListener:(name,fn)=>events[name]=fn};
const materials=['wood','stone','glass'].map(material=>({...node('BUTTON'),dataset:{material}}));
for(const [id,value] of [['force','1'],['direction','-90'],['speed','1']])document.getElementById(id).value=value;
document.getElementById('guides').checked=true;
const env={document,ImpactPhysics:require('../physics.js'),Blob,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:noop},requestAnimationFrame:fn=>callbacks.push(fn),setTimeout:noop,console};
vm.createContext(env);vm.runInContext(fs.readFileSync('app.js','utf8'),env);
assert.ok(callbacks.length);callbacks.shift()(1000);
nodes.get('hit').onclick();assert.ok(nodes.get('status').textContent.includes('Wood impact'));
callbacks.shift()(1016);assert.notEqual(nodes.get('particles').textContent,'0 PARTICLES');
nodes.get('replay').onclick();assert.ok(nodes.get('status').textContent.includes('Wood impact'));
materials[2].onclick();assert.equal(nodes.get('stageLabel').textContent,'GLASS / IMPACT STUDY');
nodes.get('hit').onclick();assert.ok(nodes.get('status').textContent.includes('Glass impact'));
nodes.get('export').onclick();assert.equal(downloads.at(-1).download,'fracture-lab-preset.json');
nodes.get('capture').onclick();assert.equal(downloads.at(-1).download,'fracture-lab-frame.png');
assert.throws(()=>env.validatePreset({version:1,material:'__proto__',force:1,angle:-90,reduced:false,seed:1}));
assert.throws(()=>env.validatePreset({version:1,material:'wood',force:10,angle:-90,reduced:false,seed:1}));
const preset={version:1,material:'stone',force:2,angle:-45,reduced:true,seed:19};
assert.equal(env.validatePreset(preset).seed,19);
env.apply(preset);env.hit(preset);assert.ok(nodes.get('status').textContent.includes('Stone impact'));
events.visibilitychange();nodes.get('reset').onclick();assert.ok(nodes.get('status').textContent.startsWith('Ready'));
console.log('UI harness passed: render loop, hit, material selection, replay, frame/preset exports, preset validation, preset application and reset.');
