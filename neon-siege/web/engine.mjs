export const specs = [
 {name:'Pistol',capacity:12,damage:25,pellets:1,delay:.22,reload:1.2},
 {name:'Shotgun',capacity:6,damage:12,pellets:5,delay:.60,reload:1.7},
 {name:'Burst rifle',capacity:24,damage:14,pellets:1,delay:.35,reload:1.2}
];
export class Weapon {
 constructor(kind){this.kind=kind;this.spec=specs[kind];this.ammo=this.spec.capacity;this.pending=0;this.reloading=false;this.timer=0;this.cooldown=0;}
 trigger(){if(this.reloading||this.cooldown>0||this.pending>0||this.ammo<=0)return false;if(this.kind===2)this.pending=Math.min(3,this.ammo)-1;this.ammo--;this.cooldown=this.pending>0?.08:this.spec.delay;return true;}
 reload(){if(this.reloading||this.ammo===this.spec.capacity||this.pending>0)return false;this.reloading=true;this.timer=this.spec.reload;return true;}
 tick(dt){if(!Number.isFinite(dt)||dt<=0)return false;this.cooldown=Math.max(0,this.cooldown-dt);if(this.reloading){this.timer-=dt;if(this.timer<=0){this.reloading=false;this.ammo=this.spec.capacity;}}if(this.pending>0&&this.cooldown<=0){this.pending--;this.ammo--;this.cooldown=this.pending>0?.08:.35;return true;}return false;}
}
export class Run {
 constructor(){this.phase='playing';this.wave=1;this.spawned=0;this.kills=0;this.score=0;this.health=100;this.maxHealth=100;this.damageScale=1;this.speedScale=1;this.hurtCooldown=0;}
 get target(){return 4+this.wave*3;} get alive(){return this.spawned-this.kills;}
 spawn(){if(this.phase!=='playing'||this.spawned>=this.target)return false;this.spawned++;return true;}
 kill(kind){if(this.phase!=='playing'||this.alive<=0)return false;this.kills++;this.score+=kind===2?150:kind===1?100:50;if(this.kills===this.target)this.phase=this.wave===5?'won':'upgrade';return true;}
 choose(i){if(this.phase!=='upgrade'||!Number.isInteger(i)||i<0||i>2)return false;if(i===0)this.damageScale+=.25;if(i===1)this.speedScale+=.12;if(i===2)this.maxHealth+=25;this.health=this.maxHealth;this.wave++;this.spawned=0;this.kills=0;this.phase='playing';return true;}
 hurt(d){if(this.phase!=='playing'||this.hurtCooldown>0||!Number.isFinite(d)||d<=0)return false;this.health=Math.max(0,this.health-d);this.hurtCooldown=.6;if(this.health<=0)this.phase='lost';return true;}
 tick(dt){if(this.phase==='playing'&&Number.isFinite(dt)&&dt>0)this.hurtCooldown=Math.max(0,this.hurtCooldown-dt);}
}
class Pool {
 constructor(){this.free=[];this.created=0;this.reused=0;}
 take(data){let o=this.free.pop();if(o)this.reused++;else{o={};this.created++;}Object.assign(o,data);return o;}
 release(o){this.free.push(o);}
}
export function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;const t=l===0?0:Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l));return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);}
export class Game {
 constructor(seed=128){this.seed=seed;this.bulletPool=new Pool();this.enemyPool=new Pool();this.bullets=[];this.enemies=[];this.effects=[];this.reset();}
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 reset(){for(const b of this.bullets)this.bulletPool.release(b);for(const e of this.enemies)this.enemyPool.release(e);this.bullets=[];this.enemies=[];this.effects=[];this.run=new Run();this.weapons=[0,1,2].map(i=>new Weapon(i));this.selected=0;this.player={x:480,y:300};this.aim={x:750,y:300};this.elapsed=0;this.spawnClock=.4;this.started=false;this.paused=false;this.events=[];this.shotsFired=0;this.hits=0;}
 event(type){this.events.push(type);if(this.events.length>12)this.events.shift();}
 select(i){if(this.run.phase==='upgrade')return this.choose(i);if(this.started&&!this.paused&&i>=0&&i<3)this.selected=i;}
 choose(i){if(!this.run.choose(i))return false;this.clearBullets();this.effects=[];this.spawnClock=1;this.event('upgrade');return true;}
 clearBullets(){for(const b of this.bullets)this.bulletPool.release(b);this.bullets=[];}
 reload(){if(this.started&&!this.paused&&this.run.phase==='playing'&&this.weapons[this.selected].reload())this.event('reload');}
 spawn(){if(!this.run.spawn())return false;const kind=this.run.wave===1?0:Math.floor(this.random()*(this.run.wave===2?2:3));const edge=Math.floor(this.random()*4),p=this.random();const e=this.enemyPool.take({x:edge===0?30:edge===1?930:30+p*900,y:edge===2?26:edge===3?574:26+p*548,kind,hp:kind===2?140:kind===1?55:50,maxHp:kind===2?140:kind===1?55:50,clock:1.2,flash:0});this.enemies.push(e);return true;}
 bullet(x,y,dx,dy,speed,damage,hostile){if(this.bullets.length>=350)return;this.bullets.push(this.bulletPool.take({x,y,vx:dx*speed,vy:dy*speed,damage,hostile,life:2.2}));}
 fire(w){const angle=Math.atan2(this.aim.y-this.player.y,this.aim.x-this.player.x);for(let i=0;i<w.spec.pellets;i++){const a=angle+(w.kind===1?(i-2)*7*Math.PI/180:0),dx=Math.cos(a),dy=Math.sin(a);this.bullet(this.player.x+dx*15,this.player.y+dy*15,dx,dy,720,w.spec.damage*this.run.damageScale,false);}this.shotsFired++;this.effects.push({x:this.player.x,y:this.player.y,r:12,t:.10,color:'#a8ffff'});this.event('fire');}
 hurt(d){if(this.run.hurt(d)){this.effects.push({x:this.player.x,y:this.player.y,r:34,t:.25,color:'#ff528a'});this.event('hurt');}}
 tick(dt,input={}){
  if(!this.started||this.paused||this.run.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;
  dt=Math.min(.05,dt);this.elapsed+=dt;this.run.tick(dt);
  let mx=input.x||0,my=input.y||0,ml=Math.hypot(mx,my);if(ml>1){mx/=ml;my/=ml;}this.player.x=Math.max(35,Math.min(925,this.player.x+mx*160*this.run.speedScale*dt));this.player.y=Math.max(35,Math.min(565,this.player.y+my*160*this.run.speedScale*dt));
  for(const w of this.weapons)if(w.tick(dt))this.fire(w);
  if(input.fire&&this.weapons[this.selected].trigger())this.fire(this.weapons[this.selected]);
  this.spawnClock-=dt;if(this.spawnClock<=0&&this.run.spawned<this.run.target){this.spawn();this.spawnClock=Math.max(.3,.85-this.run.wave*.07);}
  for(const e of this.enemies){let dx=this.player.x-e.x,dy=this.player.y-e.y,d=Math.hypot(dx,dy),nx=d>.01?dx/d:1,ny=d>.01?dy/d:0;let v=e.kind===2?40:e.kind===1?60:72;if(e.kind===1&&d<=200)v=d<140?-40:0;e.x=Math.max(20,Math.min(940,e.x+nx*v*dt));e.y=Math.max(20,Math.min(580,e.y+ny*v*dt));e.clock-=dt;e.flash=Math.max(0,e.flash-dt);if(e.kind===1&&e.clock<=0){this.bullet(e.x,e.y,nx,ny,260,14,true);e.clock=1.5;}if(d<(e.kind===2?25:18))this.hurt(e.kind===2?24:12);}
  for(let i=this.bullets.length-1;i>=0;i--){const b=this.bullets[i],old={x:b.x,y:b.y};b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;let dead=b.life<=0||b.x<0||b.x>960||b.y<0||b.y>600;
   if(!dead&&b.hostile&&segmentDistance(this.player,old,b)<12){this.hurt(b.damage);dead=true;}
   if(!dead&&!b.hostile){let best=-1,near=Infinity;for(let j=0;j<this.enemies.length;j++){const e=this.enemies[j];if(segmentDistance(e,old,b)<(e.kind===2?23:15)){const distance=(e.x-old.x)**2+(e.y-old.y)**2;if(distance<near){near=distance;best=j;}}}if(best>=0){const e=this.enemies[best];this.hits++;e.hp-=b.damage;e.flash=.12;dead=true;this.effects.push({x:e.x,y:e.y,r:18,t:.18,color:e.kind===2?'#ffc66d':'#ff528a'});if(e.hp<=0){this.run.kill(e.kind);this.enemies.splice(best,1);this.enemyPool.release(e);this.event('kill');}}}
   if(dead){this.bullets.splice(i,1);this.bulletPool.release(b);}
  }
  this.effects=this.effects.filter(e=>(e.t-=dt)>0);if(this.effects.length>60)this.effects.splice(0,this.effects.length-60);
  if(this.run.phase!=='playing')this.clearBullets();
 }
}
