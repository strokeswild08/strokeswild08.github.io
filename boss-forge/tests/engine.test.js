import test from 'node:test';
import assert from 'node:assert/strict';
import {Encounter,DEFAULT,clone,validateConfig,phaseAt} from '../src/engine.js';
const tick=(game,seconds,input={})=>{for(let i=0;i<Math.ceil(seconds*120);i++)game.step(1/120,input);};

test('configuration is copied and valid defaults round trip',()=>{
  const config=clone(DEFAULT),game=new Encounter(config);config.name='Edited';assert.equal(game.config.name,'VESPER');assert.deepEqual(validateConfig(JSON.parse(JSON.stringify(DEFAULT))),DEFAULT);
});
test('unknown patterns, non-finite values and large sequences are rejected',()=>{
  for(const mutate of [c=>c.hp=NaN,c=>c.phases[0].attacks[0].type='eval',c=>c.phases[0].attacks[0].count=2.5,c=>c.phases[0].attacks[0].windup=0,c=>c.phases[0].attacks=[],c=>c.phases[0].attacks=Array(7).fill(c.phases[0].attacks[0]),c=>c.name='',c=>c.phases[1].threshold=1]){const c=clone(DEFAULT);mutate(c);assert.throws(()=>validateConfig(c));}
});
test('all phase boundaries select the correct blueprint',()=>{
  assert.equal(phaseAt(DEFAULT,1400),0);assert.equal(phaseAt(DEFAULT,910),1);assert.equal(phaseAt(DEFAULT,420),2);assert.equal(phaseAt(DEFAULT,421),1);
});
test('ready and paused encounters do not advance simulation',()=>{
  const g=new Encounter();tick(g,1,{fire:true,x:1});assert.equal(g.time,0);g.start();tick(g,.5);g.togglePause();const time=g.time,x=g.player.x;tick(g,1,{x:1,fire:true});assert.equal(g.time,time);assert.equal(g.player.x,x);g.togglePause();assert.equal(g.state,'running');
});
test('diagonal movement is normalized',()=>{
  const straight=new Encounter(),diagonal=new Encounter();straight.start();diagonal.start();tick(straight,.1,{x:1});tick(diagonal,.1,{x:1,y:-1});const a=Math.hypot(straight.player.x-480,straight.player.y-490),b=Math.hypot(diagonal.player.x-480,diagonal.player.y-490);assert.ok(Math.abs(a-b)<.001);
});
test('movement and dash remain inside the arena',()=>{
  const g=new Encounter();g.start();g.player.invulnerable=100;tick(g,20,{x:1,y:1,dash:true});assert.ok(Math.hypot(g.player.x-480,g.player.y-330)<=267.001);
});
test('dash grants invulnerability and cannot retrigger during cooldown',()=>{
  const g=new Encounter();g.start();g.step(1/120,{dash:true,x:1});assert.equal(g.dodges,1);assert.equal(g.damagePlayer(30),false);tick(g,.2,{dash:true});assert.equal(g.dodges,1);tick(g,1,{dash:true});assert.equal(g.dodges,2);
});
test('damage invulnerability prevents repeated hits in a single burst',()=>{
  const g=new Encounter();g.start();assert.ok(g.damagePlayer(10));assert.equal(g.damagePlayer(10),false);assert.equal(g.player.hp,90);assert.equal(g.hitsTaken,1);tick(g,.8);assert.ok(g.damagePlayer(10));
});
test('telegraph exists before the first damaging pattern',()=>{
  const g=new Encounter();g.start();tick(g,.95);assert.ok(g.cast);assert.equal(g.bullets.length,0);tick(g,1.05);assert.ok(g.bullets.length>0);
});
test('bloom produces a full radial burst and fan locks its aim',()=>{
  const g=new Encounter();const attack={type:'bloom',count:12,damage:10};g.spawn({attack,x:480,y:245,target:0});assert.equal(g.bullets.length,12);assert.ok(g.bullets.some(b=>b.vx>100));assert.ok(g.bullets.some(b=>b.vx< -100));g.bullets=[];g.spawn({attack:{...attack,type:'fan',count:1},x:480,y:245,target:Math.PI/2});assert.ok(Math.abs(g.bullets[0].vx)<.001);assert.ok(g.bullets[0].vy>0);
});
test('pulse has bounded ring count and delayed secondary rings',()=>{
  const g=new Encounter();g.spawn({attack:{type:'pulse',count:3,damage:10},x:480,y:245});assert.equal(g.rings.length,3);assert.ok(g.rings[0].r>0);assert.ok(g.rings[1].r<0);
});
test('phase transitions clear hazards and start a readable grace period',()=>{
  const g=new Encounter();g.start();g.bullets=[{x:0,y:0,vx:0,vy:0,r:5,damage:10}];g.boss.hp=900;g.step(1/120);assert.equal(g.phase,1);assert.equal(g.bullets.length,0);assert.equal(g.cast,null);assert.ok(g.timer>1);
});
test('player fire damages the boss and records accuracy',()=>{
  const g=new Encounter();g.start();g.player.invulnerable=10;tick(g,1,{fire:true});assert.ok(g.boss.hp<g.config.hp);assert.ok(g.shotsHit>0);assert.ok(g.shotsHit<=g.shotsFired);assert.equal(g.damageDealt,g.config.hp-g.boss.hp);
});
test('a complete fight visits all phases and can be won',()=>{
  const g=new Encounter();g.start();g.player.invulnerable=100;tick(g,45,{fire:true});assert.equal(g.state,'won');assert.equal(g.phase,2);assert.equal(g.boss.hp,0);assert.equal(g.damageDealt,g.config.hp);assert.equal(g.bullets.length,0);
});
test('defeat stops damage and can be reset cleanly',()=>{
  const g=new Encounter();g.start();g.damagePlayer(200);assert.equal(g.state,'lost');const time=g.time;tick(g,1);assert.equal(g.time,time);g.reset(DEFAULT);assert.equal(g.state,'ready');assert.equal(g.player.hp,100);assert.equal(g.shots.length,0);assert.equal(g.hitsTaken,0);
});
test('difficulty changes player health and projectile pressure',()=>{
  const c=clone(DEFAULT);c.difficulty='relaxed';const easy=new Encounter(c);c.difficulty='brutal';const hard=new Encounter(c);assert.ok(easy.player.hp>hard.player.hp);assert.ok(easy.scale.speed<hard.scale.speed);assert.ok(easy.scale.damage<hard.scale.damage);
});
test('long simulations retain finite state and bounded effects',()=>{
  const g=new Encounter();g.start();g.player.invulnerable=1000;tick(g,120,{x:.2,y:-.4,dash:true});assert.ok(Number.isFinite(g.player.x)&&Number.isFinite(g.player.y));assert.ok(g.bullets.length<=600);assert.ok(g.particles.length<=200);assert.ok(g.events.length<=6);
});
