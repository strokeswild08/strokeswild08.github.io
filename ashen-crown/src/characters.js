export const definitions={
 knight:{name:'Rowan',title:'Knight of Ashfall',team:'hero',hp:120,attack:28,defense:8,move:4,range:1,color:'#d38c72',weapon:'Steel Slash'},
 ranger:{name:'Lyra',title:'Warden of the green',team:'hero',hp:80,attack:24,defense:3,move:5,range:5,color:'#9ab879',weapon:'Arrow Shot'},
 mage:{name:'Kael',title:'Keeper of embers',team:'hero',hp:70,attack:30,defense:2,move:4,range:4,color:'#e4ad70',weapon:'Fire Bolt'},
 raider:{name:'Ash Raider',title:'Melee · relentless',team:'enemy',hp:45,attack:18,defense:3,move:3,range:1,color:'#ce8978',weapon:'Rust cleaver'},
 guard:{name:'Crossbow Guard',title:'Ranged · 4 tiles',team:'enemy',hp:35,attack:17,defense:2,move:3,range:4,color:'#a798ba',weapon:'Crossbow'},
 boss:{name:'Dark Commander',title:'Lord Varric · the Usurper',team:'enemy',hp:180,attack:34,defense:8,move:2,range:1,color:'#d2b17a',weapon:'Heavy Strike'}
};
export const abilities={
 bash:{name:'Shield Bash',icon:'shield',kind:'knight',damage:17,range:1,cooldown:2,target:'enemy',description:'Strike a foe and push it one tile if the landing is clear.'},
 stance:{name:'Guardian Stance',icon:'guard',kind:'knight',range:0,cooldown:2,target:'self',description:'+10 defense until the next player phase. Finishes Rowan’s turn.'},
 pierce:{name:'Piercing Arrow',icon:'arrow',kind:'ranger',damage:34,range:5,cooldown:3,target:'enemy',description:'Hits every foe along a straight row or column. Walls stop the shot.'},
 step:{name:'Quick Step',icon:'boot',kind:'ranger',range:0,cooldown:3,target:'self',description:'+2 movement this turn. Does not spend Lyra’s attack.'},
 burst:{name:'Flame Burst',icon:'fire',kind:'mage',damage:33,range:4,cooldown:3,target:'tile',radius:1,description:'Burns enemies within one tile of the target. Allies are safe.'},
 shield:{name:'Ember Shield',icon:'ember',kind:'mage',range:3,cooldown:2,target:'ally',description:'An ally takes 8 less damage until the next player phase.'}
};
export function createUnit(kind,id,x,y){const d=definitions[kind];return{...d,kind,id,x,y,maxHp:d.hp,remaining:d.move,done:false,cooldowns:{},guardUntil:0,shieldUntil:0,rageUntil:0};}
export const heroAbilities=u=>Object.entries(abilities).filter(([,a])=>a.kind===u.kind);
