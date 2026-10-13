// Simulated DOM/canvas: exercises app state and actual navigation, not visual rendering.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),D=require('../dungeon.js');
const nodes=new Map(),events={},raf=[],downloads=[],saved=new Map();
const noop=()=>{};
function node(tag='DIV'){
 const context=new Proxy({}, {get(target,key){if(key.startsWith('create'))return()=>({addColorStop:noop});return target[key]||noop;},set(target,key,value){target[key]=value;return true;}});
 return {tagName:tag,value:'',checked:false,hidden:false,style:{},textContent:'',focus:noop,append:noop,remove:noop,
 getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:960,height:640}),toBlob:fn=>fn(new Blob(['PNG'])),
 click(){if(tag==='A')downloads.push(this);}};
}
const document={hidden:false,getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},createElement:tag=>node(tag.toUpperCase()),body:node(),addEventListener:(name,fn)=>events[name]=fn};
for(const [id,value] of [['seed','OWAIS-27'],['size','medium'],['rooms','12'],['loops','0.5'],['zoom','1']])document.getElementById(id).value=value;
document.getElementById('fog').checked=true;
let now=1000;
const env={document,window:{addEventListener:noop},Dungeon:D,performance:{now:()=>now++},Blob,URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:noop},requestAnimationFrame:fn=>raf.push(fn),setTimeout:noop,localStorage:{setItem:(k,v)=>saved.set(k,v),getItem:k=>saved.get(k)},console};
vm.createContext(env);vm.runInContext(fs.readFileSync('app.js','utf8'),env);
function read(expression){return vm.runInContext(expression,env);}
function frame(){now+=16;raf.shift()(now);}
frame();assert.equal(nodes.get('roomStat').textContent,12);assert.ok(read('state.seen.size')>0);
nodes.get('save').onclick();const before=read('JSON.stringify(state.player)');
events.keydown({code:'KeyD',target:{tagName:'CANVAS'},preventDefault:noop});for(let i=0;i<5;i++)frame();events.keyup({code:'KeyD'});
nodes.get('load').onclick();assert.equal(read('JSON.stringify(state.player)'),before);
nodes.get('fog').checked=false;
function walkTo(point){
 frame();const v=read('view');const x=v.x+(point.x+.5)*20*v.scale,y=v.y+(point.y+.5)*20*v.scale;
 nodes.get('map').onclick({clientX:x,clientY:y});assert.ok(read('route.length')>0);
 for(let i=0;i<12000&&read('route.length');i++)frame();
 const p=read('state.player');assert.equal(Math.floor(p.x),point.x);assert.equal(Math.floor(p.y),point.y);
}
for(const item of read('map.items'))walkTo(item);
assert.equal(read('state.collected.size'),read('map.items.length'));walkTo(read('map.exit'));
assert.equal(read('state.won'),true);assert.equal(nodes.get('victory').hidden,false);
nodes.get('save').onclick();nodes.get('restart').onclick();assert.equal(read('state.won'),false);nodes.get('load').onclick();assert.equal(read('state.won'),true);
nodes.get('json').onclick();assert.equal(downloads.at(-1).download,'underkeep-map.json');
nodes.get('png').onclick();assert.equal(downloads.at(-1).download,'underkeep-map.png');
nodes.get('seed').value='';nodes.get('generate').onclick();assert.ok(nodes.get('status').textContent.includes('Seed must'));
console.log('UI harness passed: generation, movement input, checkpoint save/load, click-to-walk collection of every objective, exit completion, restart, completed-save restore, export wiring and invalid seed.');
