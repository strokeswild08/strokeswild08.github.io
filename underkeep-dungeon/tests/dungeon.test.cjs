const assert=require('node:assert/strict'),D=require('../dungeon.js');let tests=0;
function test(name,fn){fn();tests++;console.log('PASS '+name);}
test('seed repeats exact map',()=>assert.deepEqual(D.generate({seed:'owais'}),D.generate({seed:'owais'})));
test('seeds change maps',()=>assert.notDeepEqual(D.generate({seed:'a'}).tiles,D.generate({seed:'b'}).tiles));
test('all floors connected across 300 layouts',()=>{
 for(const size of ['small','medium','large'])for(let seed=0;seed<100;seed++){
 const m=D.generate({seed,size,rooms:6+seed%13,loops:(seed%11)/10}),dist=D.flood(m,m.spawn);
 for(let i=0;i<m.tiles.length;i++)if(m.tiles[i])assert.ok(dist[i]>=0);
 assert.ok(m.rooms.length>=6);assert.equal(m.edges.filter(e=>!e.loop).length,m.rooms.length-1);
 for(const p of [...m.items,m.spawn,m.exit])assert.ok(D.walkable(m,p.x,p.y));
 const occupied=[...m.items,m.spawn,m.exit].map(p=>D.index(m,p.x,p.y));assert.equal(new Set(occupied).size,occupied.length);
 for(let x=0;x<m.width;x++){assert.equal(m.tiles[x],0);assert.equal(m.tiles[(m.height-1)*m.width+x],0);}
 for(let y=0;y<m.height;y++){assert.equal(m.tiles[y*m.width],0);assert.equal(m.tiles[y*m.width+m.width-1],0);}
 }
});
test('no overlapping rooms',()=>{const m=D.generate({rooms:18});for(let i=0;i<m.rooms.length;i++)for(let j=i+1;j<m.rooms.length;j++){const a=m.rooms[i],b=m.rooms[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);}});
test('path reaches exit',()=>{const m=D.generate(),p=D.path(m,m.spawn,m.exit);assert.deepEqual(p.at(-1),m.exit);for(let i=1;i<p.length;i++)assert.equal(Math.abs(p[i].x-p[i-1].x)+Math.abs(p[i].y-p[i-1].y),1);});
test('wall target has no route',()=>{const m=D.generate();assert.equal(D.path(m,m.spawn,{x:0,y:0}).length,0);});
test('same tile route',()=>{const m=D.generate();assert.equal(D.path(m,m.spawn,m.spawn).length,1);});
test('wall collision',()=>{const m=D.generate(),p={x:.5,y:.5};assert.deepEqual(D.move(m,p,-.2,0),p);});
test('valid spawn position',()=>{const m=D.generate();assert.ok(D.canStand(m,m.spawn.x+.5,m.spawn.y+.5));});
test('large movement rejected',()=>assert.throws(()=>D.move(D.generate(),{x:2,y:2},10,0)));
test('collect item only once',()=>{const m=D.generate(),s=D.createState(m),item=m.items[0];s.player={x:item.x+.5,y:item.y+.5};assert.equal(D.collect(m,s).length,1);assert.equal(D.collect(m,s).length,0);});
test('exit locked before items',()=>{const m=D.generate(),s=D.createState(m);s.player={x:m.exit.x+.5,y:m.exit.y+.5};D.collect(m,s);assert.equal(s.won,false);});
test('completion after all items',()=>{const m=D.generate(),s=D.createState(m);for(const item of m.items){s.player={x:item.x+.5,y:item.y+.5};D.collect(m,s);}s.player={x:m.exit.x+.5,y:m.exit.y+.5};D.collect(m,s);assert.equal(s.won,true);});
test('save round trip',()=>{const m=D.generate(),s=D.createState(m);s.seen=D.visible(m,s.player);const r=D.restore(JSON.parse(JSON.stringify(D.snapshot(m,s))));assert.deepEqual(r.map,m);assert.deepEqual(r.state,s);});
test('invalid player save rejected',()=>{const m=D.generate(),s=D.snapshot(m,D.createState(m));s.player={x:0,y:0};assert.throws(()=>D.restore(s));});
test('unknown items rejected',()=>{const m=D.generate(),s=D.snapshot(m,D.createState(m));s.collected=['unknown'];assert.throws(()=>D.restore(s));});
test('duplicate seen entries rejected',()=>{const m=D.generate(),s=D.snapshot(m,D.createState(m));s.seen=[1,1];assert.throws(()=>D.restore(s));});
test('impossible win rejected',()=>{const m=D.generate(),s=D.snapshot(m,D.createState(m));s.won=true;assert.throws(()=>D.restore(s));});
test('visibility respects walls',()=>{const m={width:5,height:3,tiles:[0,0,0,0,0,0,1,0,1,0,0,0,0,0,0]};const v=D.visible(m,{x:1.5,y:1.5},4);assert.ok(v.has(7));assert.ok(!v.has(8));});
test('settings validation',()=>{assert.throws(()=>D.generate({size:'__proto__'}));assert.throws(()=>D.generate({seed:''}));assert.throws(()=>D.generate({rooms:50}));});
console.log(tests+' test groups passed.');
