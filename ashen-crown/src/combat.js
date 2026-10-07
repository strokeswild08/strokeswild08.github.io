import {abilities} from './characters.js';
import {distance,inside,lineOfSight,ray,walkable,inCover,pathTo} from './grid.js';
import {getUnit,random,log,checkResult,livingEnemies} from './state.js';
import {canAct,finishHero,cooldown} from './turns.js';
export function damagePreview(s,attacker,target,ability='basic'){
  const magic=attacker.kind==='mage',base=abilities[ability]?.damage??attacker.attack;
  const cover=target.id==='crystal'?0:inCover(s,target)&&distance(attacker,target)>1&&!magic?3:0;
  const defense=(target.defense||0)+(target.guardUntil>=s.round?10:0)+cover;
  const shield=target.shieldUntil>=s.round?8:0;
  return Math.max(1,base+(attacker.rageUntil>=s.round?5:0)-Math.floor(defense*(magic?.4:1))-shield);
}
export function validTarget(s,u,point,id='basic'){
  const a=abilities[id],range=a?.range??u.range;
  if(!inside(point.x,point.y))return{ok:false,reason:'Outside the battlefield'};
  if(distance(u,point)>range)return{ok:false,reason:'Out of range'};
  if(id==='pierce'&&u.x!==point.x&&u.y!==point.y)return{ok:false,reason:'Choose a straight row or column'};
  if(range>1&&!lineOfSight(s,u,point))return{ok:false,reason:'Blocked line of sight'};
  const target=s.units.find(t=>t.hp>0&&t.x===point.x&&t.y===point.y)||(s.crystal.hp>0&&s.crystal.x===point.x&&s.crystal.y===point.y?s.crystal:null);
  if(a?.target==='tile')return{ok:!s.grid[point.y*10+point.x].blocked&&livingEnemies(s).some(t=>distance(t,point)<=a.radius),reason:'Choose a tile beside an enemy',target:null};
  if(a?.target==='ally')return{ok:!!target&&target.team===u.team&&target.id!=='crystal',reason:'Choose a living hero',target};
  return{ok:!!target&&target.team!==u.team,reason:'Choose an enemy',target};
}
export function targetsFor(s,u,point,id='basic'){
  if(id==='burst')return livingEnemies(s).filter(t=>distance(t,point)<=1);
  if(id==='pierce'){const dx=Math.sign(point.x-u.x),dy=Math.sign(point.y-u.y),result=[];for(let i=1;i<=abilities.pierce.range;i++){const p={x:u.x+dx*i,y:u.y+dy*i};if(!inside(p.x,p.y)||s.grid[p.y*10+p.x].blocked)break;result.push(...livingEnemies(s).filter(t=>t.x===p.x&&t.y===p.y));}return result;}
  return[s.units.find(t=>t.hp>0&&t.x===point.x&&t.y===point.y)||(point.x===s.crystal.x&&point.y===s.crystal.y?s.crystal:null)].filter(Boolean);
}
export function hit(s,u,target,id='basic',allowCritical=true){
  const critical=s.critical&&allowCritical&&random(s)<.1,amount=Math.round(damagePreview(s,u,target,id)*(critical?1.5:1)),before=target.hp;target.hp=Math.max(0,target.hp-amount);
  if(before>0&&target.hp===0&&target.team==='enemy')s.kills++;
  log(s,`${u.name} → ${target.name}: ${amount}${critical?' critical':''} damage${target.hp===0?' · defeated':''}.`);
  return{target:target.id,amount,critical,dead:target.hp===0};
}
export function attack(s,id,point,ability='basic'){
  const u=getUnit(s,id),a=abilities[ability];if(!canAct(s,u))throw Error('This hero has finished the turn.');
  if(ability!=='basic'&&(!a||a.kind!==u.kind||a.target==='self'))throw Error('Choose an available ability.');
  if(a&&cooldown(s,u,ability))throw Error('Ability is cooling down.');
  const valid=validTarget(s,u,point,ability);if(!valid.ok)throw Error(valid.reason);
  let events=[];
  if(ability==='shield'){valid.target.shieldUntil=s.round;events=[{target:valid.target.id,shield:true,amount:0}];log(s,`${u.name} places an Ember Shield on ${valid.target.name}.`);}
  else{events=targetsFor(s,u,point,ability).map(t=>hit(s,u,t,ability));
    if(ability==='bash'&&valid.target.hp>0){const target=valid.target,x=target.x+target.x-u.x,y=target.y+target.y-u.y;if(walkable(s,x,y,target.id)){const from={x:target.x,y:target.y};target.x=x;target.y=y;events.push({target:target.id,push:true,from,to:{x,y}});log(s,`${target.name} is pushed back.`);}}
  }
  if(a)u.cooldowns[ability]=s.round+a.cooldown;finishHero(s,u);checkResult(s);return events;
}
export function selfAbility(s,id,ability){const u=getUnit(s,id),a=abilities[ability];if(!canAct(s,u)||!a||a.kind!==u.kind||a.target!=='self'||cooldown(s,u,ability))throw Error('Ability is unavailable.');u.cooldowns[ability]=s.round+a.cooldown;
  if(ability==='step'){u.remaining+=2;log(s,'Lyra uses Quick Step · 2 extra movement.');return{step:true};}
  u.guardUntil=s.round;log(s,'Rowan raises his shield · +10 defense this phase.');finishHero(s,u);return{guard:true};
}
export function move(s,id,point){const u=getUnit(s,id);if(!canAct(s,u))throw Error('This hero cannot move.');const path=pathTo(s,u,point);if(!path||!path.length)throw Error('Blocked or outside movement range.');u.remaining-=path.length;u.x=point.x;u.y=point.y;return path;}
