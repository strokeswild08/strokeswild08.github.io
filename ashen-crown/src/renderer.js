import {polygon,stroke,rect} from './art.js';
import {tile,key,reachable,distance} from './grid.js';
import {validTarget,damagePreview,targetsFor} from './combat.js';
import {canAct} from './turns.js';
export const project=(x,y,height=0)=>({x:480+(x-y)*32,y:130+(x+y)*16-height*17});
export class Renderer{
  constructor(canvas,sprites,camera,effects){this.canvas=canvas;this.c=canvas.getContext('2d');this.sprites=sprites;this.camera=camera;this.fx=effects;this.hp=new Map();}
  position(state,u){const motion=this.fx.motions.get(u.id);let x=u.x,y=u.y,height=tile(state,x,y)?.height||0;
    if(motion){const k=Math.min(1,(this.fx.time-motion.start)/motion.duration);x=motion.from.x+(motion.to.x-motion.from.x)*k;y=motion.from.y+(motion.to.y-motion.from.y)*k;height=(tile(state,motion.from.x,motion.from.y)?.height||0)*(1-k)+(tile(state,motion.to.x,motion.to.y)?.height||0)*k;}
    return project(x,y,height);
  }
  pick(state,sx,sy){const p=this.camera.world(sx,sy);const units=state.units.filter(u=>u.hp>0).sort((a,b)=>(b.x+b.y)-(a.x+a.y));for(const u of units){const v=this.position(state,u);if(Math.abs(p.x-v.x)<18&&p.y<v.y+8&&p.y>v.y-(u.kind==='boss'?68:53))return{x:u.x,y:u.y,unit:u};}
    const ordered=[...state.grid].sort((a,b)=>(b.x+b.y)-(a.x+a.y));for(const t of ordered){const v=project(t.x,t.y,t.height);if(Math.abs(p.x-v.x)/32+Math.abs(p.y-v.y)/16<=1)return{x:t.x,y:t.y,unit:null};}return null;
  }
  render(state,view,dt){const c=this.c,time=this.fx.time;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,960,610);c.imageSmoothingEnabled=false;
    const bg=c.createLinearGradient(0,0,0,610);bg.addColorStop(0,'#162a30');bg.addColorStop(.6,'#20383b');bg.addColorStop(1,'#17282e');c.fillStyle=bg;c.fillRect(0,0,960,610);
    // Distant battlements, trees and weather stay behind the tactical grid.
    for(let i=0;i<8;i++){const x=62+i*119,y=120+(i%3)*28;polygon(c,[[x-25,y+130],[x-18,y-16],[x,y-30],[x+18,y-13],[x+26,y+125]],'#102229');for(let j=0;j<3;j++){polygon(c,[[x,y-42+j*38],[x-51+j*7,y+26+j*38],[x+50-j*7,y+25+j*38]],i%2?'#1b3336':'#1d3737');}}
    c.fillStyle='#12252c';c.fillRect(393,27,20,83);c.fillRect(545,20,22,89);c.fillRect(412,23,135,15);c.fillStyle='#314246';c.fillRect(397,28,4,70);c.fillRect(549,24,4,68);
    c.fillStyle='#7b987919';c.beginPath();c.ellipse(480,371,345,132,0,0,Math.PI*2);c.fill();
    const shake=this.fx.shake;c.translate(480+this.camera.x+Math.sin(time*60)*shake,300+this.camera.y+Math.cos(time*46)*shake*.5);c.scale(this.camera.zoom,this.camera.zoom);c.translate(-480,-300);
    const selected=state.units.find(u=>u.id===view.selected),reach=selected&&canAct(state,selected)&&view.mode==='move'&&!view.busy?reachable(state,selected).cost:null;
    for(const t of [...state.grid].sort((a,b)=>(a.x+a.y)-(b.x+b.y)||a.y-b.y)){const p=project(t.x,t.y,t.height);this.drawGround(c,t,p,time);
      if(!view.menu&&reach?.has(key(t.x,t.y))&&!(t.x===selected.x&&t.y===selected.y)){polygon(c,[[p.x,p.y-14],[p.x+28,p.y],[p.x,p.y+14],[p.x-28,p.y]],'#a8c79c34');stroke(c,p.x-27,p.y,p.x,p.y+13,'#98b38d',1);stroke(c,p.x,p.y+13,p.x+27,p.y,'#98b38d',1);}
      if(!view.menu&&selected&&['attack','ability'].includes(view.mode)&&view.ability!=='stance'&&view.ability!=='step'&&canAct(state,selected)&&!view.busy){const a=validTarget(state,selected,t,view.mode==='attack'?'basic':view.ability);if(a.ok){polygon(c,[[p.x,p.y-13],[p.x+27,p.y],[p.x,p.y+13],[p.x-27,p.y]],view.ability==='shield'?'#83bace44':'#d187624a');}}
      if(!view.menu&&view.hover?.x===t.x&&view.hover?.y===t.y||!view.menu&&view.pending?.x===t.x&&view.pending?.y===t.y){const pending=view.pending?.x===t.x&&view.pending?.y===t.y;stroke(c,p.x-30,p.y,p.x,p.y-15,pending?'#f2d49c':'#cdd6b7',2);stroke(c,p.x,p.y-15,p.x+30,p.y,pending?'#f2d49c':'#cdd6b7',2);stroke(c,p.x+30,p.y,p.x,p.y+15,pending?'#f2d49c':'#cdd6b7',2);stroke(c,p.x,p.y+15,p.x-30,p.y,pending?'#f2d49c':'#cdd6b7',2);}
    }
    const drawables=state.grid.filter(t=>t.prop).map(t=>({depth:t.x+t.y+.08,type:'prop',item:t}));drawables.push({depth:state.crystal.x+state.crystal.y+.2,type:'crystal',item:state.crystal});
    for(const u of state.units){const dying=this.fx.particles.some(p=>p.kind==='death'&&p.label===u.id);if(u.hp>0||dying){const m=this.fx.motions.get(u.id),k=m?Math.min(1,(time-m.start)/m.duration):0;drawables.push({depth:m?(m.from.x+m.from.y)*(1-k)+(m.to.x+m.to.y)*k+.4:u.x+u.y+.4,type:'unit',item:u});}}
    drawables.sort((a,b)=>a.depth-b.depth);for(const d of drawables){const u=d.item,p=this.position(state,u);if(d.type==='prop'){this.drawProp(c,u,p,time);continue;}if(d.type==='crystal'){this.crystal(c,u,p,time);continue;}this.character(c,u,p,selected?.id===u.id&&!view.menu,time,state,dt);}
    this.drawEffects(c,state,time);
    if(!view.menu){for(const u of state.units.filter(u=>u.hp>0)){const p=this.position(state,u);this.health(c,u,p,dt);if(u.team==='hero'&&u.done){rect(c,p.x-3,p.y-66,7,7,'#30434a');stroke(c,p.x-2,p.y-63,p.x,p.y-61,'#b3c5a3');stroke(c,p.x,p.y-61,p.x+3,p.y-65,'#b3c5a3');}}this.health(c,state.crystal,this.position(state,state.crystal),dt,56);}
    c.setTransform(1,0,0,1,0,0);
    if(!view.menu){c.font='9px monospace';c.fillStyle='#b1c5b066';c.fillText('ASHFALL / THE CROWN COURT',24,584);c.textAlign='right';c.fillStyle='#afc4b088';c.fillText('WASD / ARROWS PAN · SCROLL ZOOM',936,584);c.textAlign='left';}
    for(let i=0;i<30;i++){const x=(i*173+time*(3+i%4))%960,y=610-((i*107+time*(8+i%3*4))%610);rect(c,x,y,i%3===0?2:1,1,i%4===0?'#c98a565b':'#bec3a423');}
    const vignette=c.createRadialGradient(480,300,150,480,300,600);vignette.addColorStop(0,'#09191d00');vignette.addColorStop(1,'#07131877');c.fillStyle=vignette;c.fillRect(0,0,960,610);
  }
  drawGround(c,t,p,time){this.groundFn(c,t,p.x,p.y,time);}
  drawProp(c,t,p,time){this.propFn(c,t,p.x,p.y,time);}
  crystal(c,u,p,time){c.save();const glow=c.createRadialGradient(p.x,p.y-22,0,p.x,p.y-22,58);glow.addColorStop(0,'#a1d9cc4b');glow.addColorStop(1,'#9adfc900');c.fillStyle=glow;c.fillRect(p.x-58,p.y-80,116,116);polygon(c,[[p.x-22,p.y],[p.x,p.y+12],[p.x+22,p.y],[p.x,p.y-12]],'#495f62');polygon(c,[[p.x-15,p.y-9],[p.x,p.y-17],[p.x+15,p.y-9],[p.x,p.y-1]],'#a4b6a2');polygon(c,[[p.x,p.y-56],[p.x+12,p.y-29],[p.x,p.y-8],[p.x-12,p.y-29]],'#75aca8');polygon(c,[[p.x,p.y-56],[p.x+7,p.y-29],[p.x,p.y-8]],'#c4e7d6');stroke(c,p.x-7,p.y-28,p.x,p.y-48,'#e4f0d5');rect(c,p.x-12,p.y-11,24,3,'#b7aa75');for(let i=0;i<3;i++){const x=p.x+Math.sin(time*1.3+i*2)*22,y=p.y-30+Math.cos(time*1.6+i)*18;rect(c,x,y,2,2,'#d7e3b6');}c.restore();}
  character(c,u,p,selected,time,state,dt){c.save();c.fillStyle='#0e202666';c.beginPath();c.ellipse(p.x,p.y+6,15,6,0,0,Math.PI*2);c.fill();if(selected){c.strokeStyle='#efc889';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y+6,20,9,0,0,Math.PI*2);c.stroke();}
    if(u.shieldUntil>=state.round||u.guardUntil>=state.round){c.strokeStyle=u.shieldUntil>=state.round?'#a5d9d6aa':'#e6cfa088';c.lineWidth=1;c.beginPath();c.ellipse(p.x,p.y-22,21,31,0,0,Math.PI*2);c.stroke();}
    const pose=this.fx.poses.get(u.id),walk=this.fx.motions.has(u.id),kind=pose?.kind||(walk?'walk':'idle'),s=this.sprites[u.kind],clip=s.clips[kind]||s.clips.idle,phase=pose?Math.min(.99,(time-pose.start)/(pose.until-pose.start)):time*(walk?8:2.6)/clip.count,f=clip.start+Math.floor(phase*clip.count)%clip.count;
    if(u.team==='hero'&&u.done)c.globalAlpha=.65;const death=this.fx.particles.find(a=>a.kind==='death'&&a.label===u.id);if(death)c.globalAlpha=1-(time-death.start)/death.life;
    if(pose?.kind==='hurt'){p={x:p.x+Math.sin((time-pose.start)*70)*3,y:p.y};}
    const scale=u.kind==='boss'?1.12:1;const facing=u.team==='enemy'?-1:1;c.translate(Math.round(p.x),Math.round(p.y+9));c.scale(facing*scale,scale);c.drawImage(s.image,f*64,0,64,72,-32,-66,64,72);c.restore();
  }
  health(c,u,p,dt,height=62){const current=this.hp.get(u.id)??u.hp,value=current+(u.hp-current)*Math.min(1,dt*10);this.hp.set(u.id,value);const w=u.kind==='boss'?42:u.id==='crystal'?32:27,x=p.x-w/2,y=p.y-height;c.fillStyle='#10242bd9';c.fillRect(x-1,y-1,w+2,5);c.fillStyle=u.team==='enemy'?'#d18b78':u.id==='crystal'?'#a1d0c8':'#adc68c';c.fillRect(x,y,Math.max(0,w*value/u.maxHp),3);}
  drawEffects(c,state,time){for(const e of this.fx.particles){const age=time-e.start,k=age/e.life,p=project(e.x,e.y,tile(state,e.x,e.y)?.height||0);c.save();c.globalAlpha=1-k;
      if(e.kind==='number'){c.font='bold 15px monospace';c.textAlign='center';c.fillStyle='#17252a';c.fillText(e.label,p.x+1,p.y-37-age*24+1);c.fillStyle=e.color;c.fillText(e.label,p.x,p.y-37-age*24);}
      if(e.kind==='slash'){stroke(c,p.x-23+k*20,p.y-43+k*12,p.x+22,p.y-17,'#fff0bc',3);stroke(c,p.x-25+k*20,p.y-40+k*12,p.x+18,p.y-14,'#e6b678',2);}
      if(['fire','hit','slam','shield','cry'].includes(e.kind)){for(let i=0;i<(e.kind==='slam'?20:10);i++){const a=i*2.4,r=k*(e.kind==='slam'?58:28),x=p.x+Math.cos(a)*r,y=p.y-18+Math.sin(a)*r*.6-k*12;rect(c,x,y,k<.3?4:2,k<.3?4:2,e.color);}if(e.kind==='shield'||e.kind==='cry'){c.strokeStyle=e.color;c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y-10,15+k*25,9+k*15,0,0,Math.PI*2);c.stroke();}}
      if(e.kind==='arrow'){stroke(c,p.x-16+k*18,p.y-29,p.x+16,p.y-29,'#e0d8b3',2);}
      if(e.kind==='dust'){rect(c,p.x-6-k*8,p.y+4-k*4,3,2,'#abb99c');rect(c,p.x+5+k*8,p.y+2-k*3,2,2,'#c3bda0');}
      c.restore();}}
}
