const assert = require('node:assert/strict');
const {pack,metadata} = require('../packing.js');
let tests=0;
function check(name, fn){fn();tests++;console.log('PASS '+name);}
const sprite=(id,w,h)=>({id,name:id,width:w,height:h});
check('empty atlas',()=>assert.equal(pack([],256,2).height,1));
check('outer padding',()=>{let f=pack([sprite('a',16,16)],64,2).frames[0];assert.equal(f.x,2);assert.equal(f.y,2);});
check('shelf wrap',()=>{let p=pack([sprite('a',20,20),sprite('b',20,20)],32,2);assert.equal(p.frames[1].y,24);});
check('exact fit',()=>assert.equal(pack([sprite('a',28,16)],32,2).frames.length,1));
check('oversize rejected',()=>assert.throws(()=>pack([sprite('a',33,16)],32,0)));
check('height limit',()=>assert.throws(()=>pack([sprite('a',32,32)],32,0,16)));
check('invalid dimensions',()=>assert.throws(()=>pack([sprite('a',0,10)],32,0)));
check('invalid padding',()=>assert.throws(()=>pack([],256,NaN)));
check('invalid width',()=>assert.throws(()=>pack([],0,2)));
check('height ordering',()=>assert.equal(pack([sprite('a',10,10),sprite('b',10,20)],64,2).frames[0].id,'b'));
check('input is preserved',()=>{let input=[sprite('a',10,10),sprite('b',10,20)];pack(input,64,2);assert.equal(input[0].id,'a');assert.equal(input[0].x,undefined);});
check('JSON frame coordinates',()=>{let m=metadata(pack([sprite('hero',16,20)],64,2));assert.deepEqual(m.frames.hero.frame,{x:2,y:2,w:16,h:20});assert.equal(m.meta.image,'atlas.png');});
check('JSON source sizes',()=>{let m=metadata(pack([sprite('hero',16,20)],64,2));assert.equal(m.frames.hero.trimmed,false);assert.deepEqual(m.frames.hero.sourceSize,{w:16,h:20});});
check('duplicate frame names rejected',()=>assert.throws(()=>metadata(pack([sprite('a',16,16),sprite('a',16,16)],64,2))));
check('special object keys preserved',()=>{let m=metadata(pack([sprite('__proto__',16,16)],64,2));assert.ok(Object.hasOwn(JSON.parse(JSON.stringify(m)).frames,'__proto__'));});
check('random batches have no overlap',()=>{
 let seed=7;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed;};
 for(let batch=0;batch<100;batch++){
 const input=Array.from({length:40},(_,i)=>sprite(String(i),1+random()%80,1+random()%80));
 const p=pack(input,512,2);
 for(let i=0;i<p.frames.length;i++){
  const a=p.frames[i];assert.ok(a.x>=2&&a.y>=2&&a.x+a.width<=p.width-2&&a.y+a.height<=p.height-2);
  for(let j=i+1;j<p.frames.length;j++){const b=p.frames[j];assert.ok(a.x+a.width+2<=b.x||b.x+b.width+2<=a.x||a.y+a.height+2<=b.y||b.y+b.height+2<=a.y);}
 }
 }
});
console.log(`${tests} test groups passed.`);
