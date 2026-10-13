// Exercise UI wiring with a small DOM/canvas test harness, not a browser.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const packing=require('../packing.js');
const elements=new Map(), canvases=[],downloads=[];
function element(tag='div') {
 const listeners={}; const node={tag,children:[],dataset:{},style:{},value:'',disabled:false,hidden:false,textContent:'',width:0,height:0,
 classList:{toggle(){},add(){},remove(){}},append(...children){this.children.push(...children);},replaceChildren(){this.children=[];},remove(){},
 addEventListener(type,fn){listeners[type]=fn;},click(){if(this.tag==='a') downloads.push(this);else this.onclick?.({});},
 getBoundingClientRect(){return {left:0,top:0,width:this.width,height:this.height};},toDataURL(){return 'data:image/png;base64,test';},
 toBlob(fn){fn(new Blob(['test'],{type:'image/png'}));}};
 const draws=[];node.draws=draws;
 node.getContext=()=>({drawImage(...args){draws.push(['image',...args]);},strokeRect(...args){draws.push(['stroke',...args]);},clearRect(){draws.length=0;},fillRect(){}});
 if(tag==='canvas')canvases.push(node);return node;
}
const document={getElementById(id){if(!elements.has(id))elements.set(id,element(id==='atlas'?'canvas':'div'));return elements.get(id);},createElement:element,body:element('body')};
for(const [id,value] of [['width','512'],['padding','2']])document.getElementById(id).value=value;
document.getElementById('bounds').checked=true;
const env={document,window:{addEventListener(){}},AtlasPacking:packing,Blob,URL:{createObjectURL(){return 'blob:test';},revokeObjectURL(){}},setTimeout(){},console,TextDecoder,DataView,Uint8Array,Image:function(){}};
vm.createContext(env);vm.runInContext(fs.readFileSync('app.js','utf8'),env);
assert.equal(elements.get('png').disabled,true);
elements.get('sample').onclick();
assert.equal(elements.get('list').children.length,12);
assert.equal(elements.get('png').disabled,false);
assert.ok(elements.get('dimensions').textContent.startsWith('256'));
elements.get('list').children[0].onclick();assert.equal(elements.get('selected').textContent,'moss_slime');
elements.get('png').onclick();
const exported=canvases.at(-1);assert.equal(exported.draws.filter(d=>d[0]==='image').length,12);assert.equal(exported.draws.filter(d=>d[0]==='stroke').length,0);
assert.equal(downloads.at(-1).download,'atlas.png');
elements.get('json').onclick();assert.equal(downloads.at(-1).download,'atlas.json');
elements.get('padding').value='99';elements.get('padding').onchange();assert.equal(elements.get('png').disabled,true);
elements.get('padding').value='2';elements.get('padding').onchange();assert.equal(elements.get('png').disabled,false);
elements.get('clear').onclick();assert.equal(elements.get('png').disabled,true);assert.equal(elements.get('count').textContent,'0 files');
console.log('UI harness passed: sample, selection, exports without outlines, invalid settings, recovery and clearing.');
