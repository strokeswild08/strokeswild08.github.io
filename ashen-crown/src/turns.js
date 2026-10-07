import {livingHeroes,checkResult,log} from './state.js';
export function canAct(s,u){return s.phase==='player'&&!s.result&&u?.team==='hero'&&u.hp>0&&!u.done;}
export function finishHero(s,u){u.done=true;u.remaining=0;if(!checkResult(s)&&livingHeroes(s).every(h=>h.done)){s.phase='enemy';log(s,'Enemy phase — the ash host advances.');}}
export function nextRound(s){if(checkResult(s))return; s.round++;s.phase='player';for(const u of s.units){if(u.hp<=0)continue;u.done=false;u.remaining=u.move;}log(s,`Player phase · turn ${s.round}.`);}
export function cooldown(s,u,id){return Math.max(0,(u.cooldowns[id]||0)-s.round);}
