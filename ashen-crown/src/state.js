import {makeGrid} from './grid.js';
import {createUnit} from './characters.js';
export function createState(seed=82417){return{round:1,phase:'player',result:null,seed,critical:true,kills:0,grid:makeGrid(),crystal:{id:'crystal',name:'Crown Crystal',team:'hero',x:4,y:7,hp:100,maxHp:100,defense:2},units:[createUnit('knight','rowan',1,8),createUnit('ranger','lyra',2,6),createUnit('mage','kael',1,7),createUnit('boss','commander',8,1),createUnit('raider','raider-a',3,8),createUnit('raider','raider-b',7,6),createUnit('raider','raider-c',7,3),createUnit('guard','guard-a',8,5),createUnit('guard','guard-b',5,2)],log:['The crown crystal is the kingdom’s last barrier. Hold the line.']};}
export const livingHeroes=s=>s.units.filter(u=>u.team==='hero'&&u.hp>0);
export const livingEnemies=s=>s.units.filter(u=>u.team==='enemy'&&u.hp>0);
export const getUnit=(s,id)=>id==='crystal'?s.crystal:s.units.find(u=>u.id===id);
export function random(s){let v=s.seed|0;v^=v<<13;v^=v>>>17;v^=v<<5;s.seed=v>>>0;return s.seed/4294967296;}
export function log(s,message){s.log.push(message);if(s.log.length>30)s.log.shift();}
export function checkResult(s){if(s.crystal.hp<=0||livingHeroes(s).length===0){s.result='defeat';s.phase='ended';}else if(getUnit(s,'commander').hp<=0){s.result='victory';s.phase='ended';}return s.result;}
