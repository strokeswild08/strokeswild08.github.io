const assert=require('node:assert/strict'),{burst,step,MATERIALS}=require('../physics.js');
let n=0;function test(name,fn){fn();n++;console.log('PASS '+name);}
test('three materials',()=>assert.equal(Object.keys(MATERIALS).length,3));
test('deterministic seed',()=>assert.deepEqual(burst({seed:12}),burst({seed:12})));
test('different seeds',()=>assert.notDeepEqual(burst({seed:12}),burst({seed:13})));
test('unknown material',()=>assert.throws(()=>burst({material:'other'})));
test('invalid force',()=>assert.throws(()=>burst({force:NaN})));
test('bounded force',()=>assert.throws(()=>burst({force:10})));
test('reduced particles',()=>assert.ok(burst({reduced:true}).length<burst({}).length));
test('force scales velocity',()=>{let a=burst({force:1,seed:3}),b=burst({force:2,seed:3});assert.equal(b[0].vx,a[0].vx*2);});
test('direction changes velocity',()=>{let a=burst({angle:-180,seed:8}),b=burst({angle:0,seed:8});assert.ok(a[0].vx*b[0].vx<0);});
test('gravity accelerates debris',()=>{let p=burst({seed:2}).filter(x=>x.kind==='debris');let y=p[0].vy;step(p,.01,10000);assert.ok(p[0].vy>y);});
test('floor blocks debris',()=>{let p=burst({y:900});step(p,.01,465);for(const a of p.filter(x=>x.kind==='debris'))assert.ok(a.y<=465-Math.max(a.width,a.height)*.5);});
test('floor bounce',()=>{let p=burst({y:900}).filter(x=>x.kind==='debris');p[0].vy=200;step(p,.01,465);assert.ok(p[0].vy<0);});
test('all particles expire',()=>{let p=burst({});for(let i=0;i<600;i++)p=step(p,1/120,465);assert.equal(p.length,0);});
test('step clamp',()=>{let a=burst({}),b=burst({});assert.deepEqual(step(a,1,465),step(b,.04,465));});
test('invalid step rejected',()=>assert.throws(()=>step([],NaN,465)));
test('bounded repeated impacts',()=>{for(let i=0;i<100;i++){let p=burst({material:['wood','stone','glass'][i%3],seed:i});for(let k=0;k<300;k++)p=step(p,1/120,465);for(const a of p)assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y));}});
console.log(n+' test groups passed.');
