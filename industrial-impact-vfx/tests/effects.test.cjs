const assert=require('node:assert/strict'),E=require('../effects.js');
const input={version:1,type:'metal',intensity:1,size:1,colour:'#ffc878',seed:7};
assert.deepEqual(E.burst(input),E.burst(input));
assert.notDeepEqual(E.burst(input),E.burst({...input,seed:8}));
assert.ok(E.burst({...input,intensity:2}).length>E.burst(input).length);
assert.throws(()=>E.preset({...input,intensity:NaN}));assert.throws(()=>E.preset({...input,size:10}));assert.throws(()=>E.preset({...input,colour:'javascript:alert(1)'}));assert.throws(()=>E.preset({...input,type:'__proto__'}));assert.throws(()=>E.step([],NaN));
for(const type of E.TYPES){let items=E.burst({...input,type,intensity:2.5,size:3});for(let i=0;i<400;i++)items=E.step(items,1/120);assert.equal(items.length,0);}
let a=E.burst(input),b=E.burst(input);assert.deepEqual(E.step(a,10),E.step(b,.04));
console.log('Effect tests passed: deterministic bursts, intensity, preset rejection, 4 effect lifetimes and step clamping.');
