/* Independent, deterministic particle simulation for impact effects. */
(function(root){
'use strict';
const MATERIALS={
 wood:{colours:['#bf8954','#e3b777','#916343','#efd3a0'],count:30,bounce:.26,drag:.985,dust:'#d6b28b',gravity:440},
 stone:{colours:['#8595a5','#b4c3cc','#586a7e','#d5dce0'],count:42,bounce:.36,drag:.989,dust:'#a5afba',gravity:570},
 glass:{colours:['#65cfc6','#b5eee4','#419eaa','#defff2'],count:50,bounce:.55,drag:.994,dust:'#95e8dc',gravity:380}
};
function random(seed){let state=seed>>>0;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
function burst({material='wood',x=0,y=0,force=1,angle=-90,seed=1,reduced=false}){
 if(!Object.hasOwn(MATERIALS,material))throw new Error('Unknown material');
 if(![x,y,force,angle].every(Number.isFinite)||force<.2||force>3)throw new Error('Invalid impact parameters');
 const config=MATERIALS[material],rand=random(seed),particles=[];
 const direction=angle*Math.PI/180, count=Math.round(config.count*(reduced?.55:1));
 for(let i=0;i<count;i++){
  const spread=(rand()-.5)*Math.PI*1.45,a=direction+spread,speed=(80+rand()*240)*force;
  particles.push({kind:'debris',x:x+(rand()-.5)*52,y:y+(rand()-.5)*55,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
   rotation:rand()*Math.PI,spin:(rand()-.5)*14,width:material==='wood'?3+rand()*5:3+rand()*9,height:material==='wood'?8+rand()*15:4+rand()*10,
   life:2.5+rand()*1.1,maxLife:3.6,colour:config.colours[i%4],bounce:config.bounce,drag:config.drag,gravity:config.gravity});
 }
 for(let i=0;i<(reduced?9:20);i++){
  const a=rand()*Math.PI*2,speed=(12+rand()*75)*force;
  particles.push({kind:'dust',x:x+(rand()-.5)*28,y:y+(rand()-.5)*36,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-25,
   radius:5+rand()*11,life:.65+rand()*.7,maxLife:1.35,colour:config.dust,gravity:-14,drag:.96});
 }
 return particles;
}
function step(particles,dt,floor){
 if(!Number.isFinite(dt)||dt<0||!Number.isFinite(floor))throw new Error('Invalid simulation step');
 dt=Math.min(dt,.04);
 for(const p of particles){
  if(p.life<=0)continue;
  p.life=Math.max(0,p.life-dt);
  p.vx*=Math.pow(p.drag,dt*60);p.vy+=p.gravity*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(p.kind==='debris'){
   p.rotation+=p.spin*dt;
   const radius=Math.max(p.width,p.height)*.5;
   if(p.y>floor-radius){p.y=floor-radius;if(p.vy>0)p.vy=-p.vy*p.bounce;p.vx*=.79;p.spin*=.72;if(Math.abs(p.vy)<14)p.vy=0;}
  }else{p.radius+=dt*17;}
 }
 return particles.filter(p=>p.life>0);
}
const api={MATERIALS,random,burst,step};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ImpactPhysics=api;
})(typeof globalThis!=='undefined'?globalThis:this);
