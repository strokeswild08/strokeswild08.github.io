import assert from 'node:assert/strict';
import {Game,Weapon,Run,segmentDistance} from '../web/engine.mjs';
import {render} from '../web/render.mjs';
let checks=0;const ok=(value,name)=>{assert.ok(value,name);checks++;};
const w=new Weapon(2);ok(w.trigger()&&w.ammo===23&&w.pending===2,'burst first shot');ok(!w.trigger()&&!w.reload(),'burst exclusive');ok(w.tick(.081)&&w.ammo===22,'burst second');ok(w.tick(.081)&&w.ammo===21,'burst third');ok(!w.tick(.01),'no fourth shot');ok(w.reload(),'reload');w.tick(2);ok(w.ammo===24&&!w.reloading,'reload finishes');
const s=new Weapon(1);ok(s.trigger()&&s.ammo===5&&s.spec.pellets===5,'shell accounting');
const run=new Run();ok(!run.kill(0)&&!run.choose(0),'invalid transitions blocked');let score=0;
for(let wave=1;wave<=5;wave++){ok(run.wave===wave,'wave index');const budget=run.target;for(let i=0;i<budget;i++)ok(run.spawn(),'spawn');ok(!run.spawn(),'budget cap');for(let i=0;i<budget;i++){ok(run.kill(i%3),'kill');score+=i%3===2?150:i%3===1?100:50;}ok(run.score===score&&run.alive===0,'accounting');if(wave<5){ok(run.phase==='upgrade','upgrade gate');ok(!run.hurt(1)&&!run.choose(8),'upgrade freezes damage');ok(run.choose((wave-1)%3),'choice');ok(!run.choose(0),'no duplicate choice');}}
ok(run.phase==='won','victory');const dead=new Run();ok(dead.hurt(999)&&dead.phase==='lost','defeat');
ok(segmentDistance({x:5,y:2},{x:0,y:0},{x:10,y:0})===2,'swept collision');
ok(segmentDistance({x:15,y:0},{x:0,y:0},{x:10,y:0})===5,'segment endpoint clamp');
const g=new Game(33);g.tick(1,{x:1,fire:true});ok(g.elapsed===0&&g.bullets.length===0,'start gate');g.started=true;g.paused=true;g.tick(.1,{x:1,fire:true});ok(g.elapsed===0,'pause freezes run');g.paused=false;g.spawnClock=100;
g.aim={x:600,y:300};g.tick(.01,{fire:true});ok(g.bullets.length===1,'fire creates projectile');g.clearBullets();g.weapons[0].tick(1);g.tick(.01,{fire:true});ok(g.bulletPool.created===1&&g.bulletPool.reused===1,'pool reuses released projectile');
g.reset();g.started=true;g.spawnClock=100;g.player={x:100,y:300};g.aim={x:300,y:300};g.run.spawn();g.enemies.push(g.enemyPool.take({x:145,y:300,kind:0,hp:1,maxHp:50,clock:2,flash:0}));for(let i=0;i<8;i++)g.tick(.01,{fire:true});ok(g.run.kills===1&&g.enemies.length===0,'projectile hit kills enemy and scores');
const snap=render(g);ok(snap.startsWith('<svg')&&!snap.includes('NaN')&&!snap.includes('undefined'),'renderer finite SVG');
g.reset();ok(g.run.health===100&&g.weapons[2].ammo===24&&g.enemies.length===0&&!g.started,'restart resets state');
// Fair input-only bot: aim at nearest threat, keep moving, reload and choose upgrades.
const sim=new Game(218);sim.started=true;let steps=0;
for(;steps<60*300;steps++){
 if(sim.run.phase==='upgrade'){sim.choose(0);continue;}
 if(sim.run.phase!=='playing')break;
 const p=sim.player;let nearest=null,distance=Infinity;
 for(const e of sim.enemies){const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<distance){distance=d;nearest=e;}}
 if(nearest)sim.aim={x:nearest.x,y:nearest.y};
 const angle=Math.atan2(p.y-300,p.x-480)+.9;
 const target={x:480+Math.cos(angle)*210,y:300+Math.sin(angle)*160};
 let dx=target.x-p.x,dy=target.y-p.y,len=Math.hypot(dx,dy);dx/=len||1;dy/=len||1;
 // Repel from immediate threats while staying inside arena bounds.
 for(const e of sim.enemies){const ex=p.x-e.x,ey=p.y-e.y,d=Math.hypot(ex,ey);if(d<100){dx+=ex/(d||1)*(100-d)/22;dy+=ey/(d||1)*(100-d)/22;}}
 sim.selected=distance<110?1:2;
 if(sim.weapons[sim.selected].ammo===0)sim.reload();
 sim.tick(1/60,{x:dx,y:dy,fire:!!nearest});
 ok(Number.isFinite(sim.player.x)&&sim.run.health>=0,'simulation finite');
}
console.log('Simulation:',sim.run.phase,'wave',sim.run.wave,'score',sim.run.score,'seconds',sim.elapsed.toFixed(1),'health',sim.run.health);
ok(sim.run.phase==='won','input-only bot can clear all five waves');
console.log('PASS:',checks,'JS checks');
