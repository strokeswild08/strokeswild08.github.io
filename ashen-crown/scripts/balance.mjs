// A repeatable offensive policy exercises full battles without any browser UI.
import {createState,livingHeroes,livingEnemies,getUnit} from '../src/state.js';
import {reachable,key,distance} from '../src/grid.js';
import {move,attack,validTarget,damagePreview,targetsFor} from '../src/combat.js';
import {finishHero,nextRound,cooldown} from '../src/turns.js';
import {planEnemy,enemyAction} from '../src/ai.js';
function play(seed){const s=createState(seed);let count=0;while(!s.result&&s.round<30){
  for(const u of livingHeroes(s)){if(s.result)break;const choices=[];for(const [k,cost]of reachable(s,u).cost){const [x,y]=k.split(',').map(Number),pos={x,y},old={x:u.x,y:u.y};u.x=x;u.y=y;
    for(const target of livingEnemies(s)){for(const id of ['basic',...(u.kind==='mage'&&!cooldown(s,u,'burst')?['burst']:[]),...(u.kind==='ranger'&&!cooldown(s,u,'pierce')?['pierce']:[])]){if(validTarget(s,u,target,id).ok){const hits=targetsFor(s,u,target,id),score=hits.reduce((n,e)=>n+Math.min(e.hp,damagePreview(s,u,e,id))+(e.hp<=damagePreview(s,u,e,id)?25:0)+(e.kind==='boss'?10:distance(e,s.crystal)<=3?12:0),0)-cost*.25;choices.push({pos:{...pos},target:{x:target.x,y:target.y},id,score});}}}u.x=old.x;u.y=old.y;}
    choices.sort((a,b)=>b.score-a.score);if(choices.length){const a=choices[0];if(u.x!==a.pos.x||u.y!==a.pos.y)move(s,u.id,a.pos);attack(s,u.id,a.target,a.id);}else{const boss=getUnit(s,'commander');const cells=[...reachable(s,u).cost].map(([k,cost])=>{const [x,y]=k.split(',').map(Number);return{x,y,score:distance({x,y},boss)+cost*.1};}).sort((a,b)=>a.score-b.score);const p=cells[0];if(p&&distance(u,p)>0)move(s,u.id,p);finishHero(s,u);}count++;
  }
  if(s.result)break;for(const enemy of [...livingEnemies(s)]){const plan=planEnemy(s,enemy);if(plan){enemy.x=plan.goal.x;enemy.y=plan.goal.y;enemyAction(s,enemy.id);}if(s.result)break;}if(!s.result)nextRound(s);
 }return{seed,result:s.result,turns:s.round,heroes:livingHeroes(s).length,crystal:s.crystal.hp,kills:s.kills,actions:count};}
const results=[82417,1,2,3,4,5,9,17,41,101].map(play);console.table(results);const wins=results.filter(r=>r.result==='victory');if(wins.length<7)throw Error(`Only ${wins.length}/10 policy victories; review balance.`);
