(function(root){
'use strict';
const TYPES=['metal','concrete','glass','smoke'];
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function preset(data){
 if(!data||data.version!==1||!TYPES.includes(data.type)||!Number.isFinite(data.intensity)||data.intensity<.25||data.intensity>2.5||!Number.isFinite(data.size)||data.size<.25||data.size>3||!/^#[0-9a-f]{6}$/i.test(data.colour)||!Number.isInteger(data.seed)||data.seed<0||data.seed>4294967295)throw new Error('Invalid Industrial Impact v1 preset.');
 return {version:1,type:data.type,intensity:data.intensity,size:data.size,colour:data.colour,seed:data.seed};
}
function burst(input){
 const p=preset(input),rand=rng(p.seed),items=[];
 const total=Math.round(({metal:55,concrete:42,glass:44,smoke:30})[p.type]*p.intensity);
 for(let i=0;i<total;i++){
  const angle=-Math.PI/2+(rand()-.5)*(p.type==='smoke'?Math.PI:2.6),speed=(p.type==='smoke'?15+rand()*50:60+rand()*260)*p.size;
  const life=p.type==='metal'?.35+rand()*.7:p.type==='smoke'?1.2+rand()*1.3:.6+rand()*1.0;
  items.push({x:480+(rand()-.5)*10,y:365+(rand()-.5)*10,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life,maxLife:life,
   kind:p.type==='concrete'&&i%3===0?'dust':p.type,radius:(p.type==='smoke'?15+rand()*25:2+rand()*6)*p.size,
   rotation:rand()*Math.PI,spin:(rand()-.5)*8,colour:p.colour});
 }
 return items;
}
function step(items,dt){
 if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid step');dt=Math.min(dt,.04);
 for(const p of items){p.life=Math.max(0,p.life-dt);const floating=p.kind==='smoke'||p.kind==='dust';p.vx*=Math.exp(-dt*(floating?1.8:.2));p.vy+=(floating?-20:360)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rotation+=p.spin*dt;if(floating)p.radius+=dt*22;
 if(!floating&&p.y>490){p.y=490;if(p.vy>0)p.vy=-p.vy*(p.kind==='glass'?.4:.2);p.vx*=.8;}
 }
 return items.filter(p=>p.life>0);
}
const api={TYPES,preset,burst,step};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.IndustrialEffects=api;
})(typeof globalThis!=='undefined'?globalThis:this);
