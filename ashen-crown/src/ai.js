import {distance,reachable,key,lineOfSight,inCover,pathTo} from './grid.js';
import {livingHeroes,livingEnemies,getUnit,log,checkResult} from './state.js';
import {hit} from './combat.js';
export function chooseTarget(s,u){const heroes=livingHeroes(s).sort((a,b)=>distance(u,a)-distance(u,b));if(u.kind==='boss'&&heroes[0]&&distance(u,heroes[0])<=5)return heroes[0];return [...heroes,s.crystal].filter(t=>t.hp>0).sort((a,b)=>distance(u,a)-distance(u,b)||a.hp-b.hp)[0];}
export function planEnemy(s,u){
  const target=chooseTarget(s,u);if(!target)return null;
  const reach=reachable(s,u,u.move);let best={x:u.x,y:u.y},score=Infinity;
  for(const [k,cost]of reach.cost){const [x,y]=k.split(',').map(Number),p={x,y},d=distance(p,target),los=lineOfSight(s,p,target);let n;
    if(u.kind==='guard'){const nearest=Math.min(...livingHeroes(s).map(h=>distance(p,h)));n=(d<=u.range&&d>=2&&los?-14:Math.abs(d-3)*3)+(nearest<2?14:0)+(los?0:7)+cost*.25-(inCover(s,p)?1:0);}
    else n=d*4+cost*.15+(d===1?-8:0);
    if(n<score){score=n;best=p;}
  }
  return{target:target.id,goal:best,path:pathTo(s,u,best,u.move)||[]};
}
export function enemyAction(s,id){const u=getUnit(s,id);if(s.phase!=='enemy'||s.result||!u||u.hp<=0)return{type:'wait',events:[]};
  const near=livingHeroes(s).filter(h=>distance(u,h)<=1),nearCrystal=distance(u,s.crystal)<=1;
  if(u.kind==='boss'){
    if(near.length+(nearCrystal?1:0)>=2&&s.round>=(u.cooldowns.slam||0)){u.cooldowns.slam=s.round+2;log(s,'The Commander unleashes Ground Slam.');const events=[...near,...(nearCrystal?[s.crystal]:[])].map(t=>hit(s,{...u,attack:27},t,'basic',false));checkResult(s);return{type:'slam',events};}
    const allies=livingEnemies(s).filter(e=>e.id!==u.id&&distance(u,e)<=4);
    if(allies.length>=2&&s.round>=(u.cooldowns.cry||0)){u.cooldowns.cry=s.round+3;for(const e of allies)e.rageUntil=s.round;log(s,'War Cry · nearby enemies gain +5 attack for this phase.');return{type:'cry',events:allies.map(e=>({target:e.id,rage:true,amount:0}))};}
  }
  const target=chooseTarget(s,u);if(target&&distance(u,target)<=u.range&&(u.range===1||lineOfSight(s,u,target))){const events=[hit(s,u,target)];checkResult(s);return{type:u.kind==='guard'?'arrow':'strike',target:target.id,events};}
  log(s,`${u.name} takes position.`);return{type:'wait',events:[]};
}
