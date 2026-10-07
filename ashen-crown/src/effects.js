export class Effects{
  constructor(){this.time=0;this.jobs=[];this.particles=[];this.motions=new Map();this.poses=new Map();this.shake=0;}
  reset(){this.jobs.forEach(j=>j.resolve());this.jobs=[];this.particles=[];this.motions.clear();this.poses.clear();this.shake=0;}
  wait(ms){return new Promise(resolve=>this.jobs.push({remaining:ms/1000,resolve}));}
  pose(id,kind,seconds=.45){this.poses.set(id,{kind,start:this.time,until:this.time+seconds});}
  effect(kind,x,y,label='',color='#e6bf7c'){this.particles.push({kind,x,y,label,color,start:this.time,life:kind==='number'?1.25:kind==='death'?1:.65});}
  async walk(unit,path,from){let p=from;for(const next of path){this.motions.set(unit.id,{from:p,to:next,start:this.time,duration:.16});await this.wait(160);p=next;}this.motions.delete(unit.id);}
  tick(dt){this.time+=dt;this.shake=Math.max(0,this.shake-dt*20);for(const [id,p]of this.poses)if(p.until<this.time)this.poses.delete(id);for(const j of this.jobs)j.remaining-=dt;const done=this.jobs.filter(j=>j.remaining<=0);this.jobs=this.jobs.filter(j=>j.remaining>0);done.forEach(j=>j.resolve());this.particles=this.particles.filter(p=>this.time-p.start<p.life);}
}
