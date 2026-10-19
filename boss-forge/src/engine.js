export const PATTERNS = ['bloom', 'fan', 'pulse'];
const attack=(type,count,windup,cooldown,damage)=>({type,count,windup,cooldown,damage});
export const DEFAULT={name:'VESPER',hp:1400,difficulty:'normal',phases:[
  {name:'Awakening',threshold:1,speed:160,attacks:[attack('fan',5,1.0,1.1,10),attack('bloom',14,1.2,1.3,12)]},
  {name:'Fracture',threshold:.65,speed:195,attacks:[attack('bloom',18,.85,.9,12),attack('fan',7,.8,.9,12),attack('pulse',1,1.3,1.0,15)]},
  {name:'Last light',threshold:.3,speed:225,attacks:[attack('fan',9,.65,.75,14),attack('pulse',2,1.1,.9,16),attack('bloom',24,.8,.85,14)]}
]};
export const clone=value=>JSON.parse(JSON.stringify(value));
const finite=(value,min,max,label)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error(`${label} must be between ${min} and ${max}.`);return value;};
export function validateConfig(raw){
  if(!raw||typeof raw!=='object')throw Error('Choose a valid encounter JSON file.');
  if(typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>32)throw Error('Boss name must be 1–32 characters.');
  finite(raw.hp,300,5000,'Boss health');
  if(!['relaxed','normal','brutal'].includes(raw.difficulty))throw Error('Unknown difficulty.');
  if(!Array.isArray(raw.phases)||raw.phases.length!==3)throw Error('An encounter needs exactly three phases.');
  let previous=1.01;
  const phases=raw.phases.map((p,i)=>{
    if(!p||typeof p.name!=='string'||!p.name.trim()||p.name.length>32)throw Error('Each phase needs a short name.');
    finite(p.threshold,.05,1,'Phase threshold');
    if((i===0&&p.threshold!==1)||p.threshold>=previous)throw Error('Phase thresholds must descend from 100%.');
    previous=p.threshold;finite(p.speed,80,320,'Projectile speed');
    if(!Array.isArray(p.attacks)||!p.attacks.length||p.attacks.length>6)throw Error('Each phase needs 1–6 attacks.');
    const attacks=p.attacks.map(a=>{
      if(!a||!PATTERNS.includes(a.type))throw Error('Unknown attack pattern.');
      finite(a.count,1,36,'Projectile count');if(!Number.isInteger(a.count))throw Error('Projectile count must be an integer.');
      if(a.type==='pulse'&&a.count>3)throw Error('Pulse patterns support up to three rings.');
      finite(a.windup,.35,3,'Windup');finite(a.cooldown,.3,3,'Cooldown');finite(a.damage,1,30,'Damage');
      return {type:a.type,count:a.count,windup:a.windup,cooldown:a.cooldown,damage:a.damage};
    });
    return {name:p.name.trim(),threshold:p.threshold,speed:p.speed,attacks};
  });
  return {name:raw.name.trim(),hp:raw.hp,difficulty:raw.difficulty,phases};
}
export function phaseAt(config,hp){let phase=0;for(let i=1;i<config.phases.length;i++)if(hp/config.hp<=config.phases[i].threshold)phase=i;return phase;}
export const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const angle=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const scaling={relaxed:{speed:.8,damage:.7,hp:130},normal:{speed:1,damage:1,hp:100},brutal:{speed:1.16,damage:1.25,hp:90}};

export class Encounter {
  constructor(config=DEFAULT){this.reset(config);}
  reset(config){
    this.config=validateConfig(clone(config));this.scale=scaling[this.config.difficulty];this.state='ready';
    this.player={x:480,y:490,r:12,hp:this.scale.hp,maxHP:this.scale.hp,invulnerable:0,dashTime:0,dashCooldown:0,dx:0,dy:-1,fireCooldown:0};
    this.boss={x:480,y:245,hp:this.config.hp,r:36};this.phase=0;this.phaseFlash=0;this.time=0;this.shots=[];this.bullets=[];this.rings=[];this.particles=[];this.events=[];
    this.timer=.9;this.cast=null;this.attackIndex=0;this.hitsTaken=0;this.dodges=0;this.damageDealt=0;this.shotsFired=0;this.shotsHit=0;this.shake=0;
    this.log('Trial ready. Tune the sequence or enter the arena.');
  }
  log(text){this.events.unshift({time:this.time,text});this.events=this.events.slice(0,6);}
  start(){if(this.state==='ready') {this.state='running';this.log('Encounter started.');}}
  togglePause(){if(this.state==='running')this.state='paused';else if(this.state==='paused')this.state='running';}
  damagePlayer(amount){const p=this.player;if(p.invulnerable>0||this.state!=='running')return false;p.hp=Math.max(0,p.hp-amount);p.invulnerable=.75;this.hitsTaken++;this.shake=.18;this.emit('hit',p.x,p.y,10);if(p.hp<=0){this.state='lost';this.cast=null;this.log('Trial ended. Adjust the encounter and try again.');}return true;}
  emit(type,x,y,count=8){for(let i=0;i<count;i++){const a=i/count*Math.PI*2;this.particles.push({type,x,y,vx:Math.cos(a)*(35+i*3),vy:Math.sin(a)*(35+i*3),life:.45,max:.45});}if(this.particles.length>200)this.particles.splice(0,this.particles.length-200);}
  spawn(cast){
    const {attack:a,x,y,target}=cast;const speed=this.config.phases[this.phase].speed*this.scale.speed;
    if(a.type==='pulse'){
      const count=Math.min(3,a.count);for(let i=0;i<count;i++)this.rings.push({x,y,r:12-i*70,speed:speed*.78,damage:a.damage*this.scale.damage});
    }else{
      for(let i=0;i<a.count;i++){
        const theta=a.type==='bloom'?i/a.count*Math.PI*2+this.time*.21:target+(a.count===1?0:(i/(a.count-1)-.5)*1.5);
        this.bullets.push({x,y,vx:Math.cos(theta)*speed,vy:Math.sin(theta)*speed,r:a.type==='fan'?6:5,damage:a.damage*this.scale.damage});
      }
    }
    this.emit('cast',x,y,12);this.log(`${this.config.phases[this.phase].name}: ${a.type.toUpperCase()}`);
  }
  step(dt,input={}){
    if(this.state!=='running')return;
    dt=clamp(dt,0,.05);this.time+=dt;this.shake=Math.max(0,this.shake-dt);this.phaseFlash=Math.max(0,this.phaseFlash-dt);
    const p=this.player,b=this.boss;
    p.invulnerable=Math.max(0,p.invulnerable-dt);p.dashCooldown=Math.max(0,p.dashCooldown-dt);p.fireCooldown=Math.max(0,p.fireCooldown-dt);
    let mx=clamp(input.x||0,-1,1),my=clamp(input.y||0,-1,1);const len=Math.hypot(mx,my);if(len){mx/=Math.max(1,len);my/=Math.max(1,len);p.dx=mx;p.dy=my;}
    if(input.dash&&p.dashCooldown===0){p.dashTime=.17;p.dashCooldown=1.05;p.invulnerable=Math.max(p.invulnerable,.26);this.dodges++;this.emit('dash',p.x,p.y);}
    if(p.dashTime>0){p.x+=p.dx*650*dt;p.y+=p.dy*650*dt;p.dashTime=Math.max(0,p.dashTime-dt);}else{p.x+=mx*235*dt;p.y+=my*235*dt;}
    const fromCenter=Math.hypot(p.x-480,p.y-330);if(fromCenter>267){p.x=480+(p.x-480)/fromCenter*267;p.y=330+(p.y-330)/fromCenter*267;}
    if(!this.cast){b.x=480+Math.sin(this.time*.45)*68;b.y=245+Math.cos(this.time*.6)*18;}
    if(input.fire&&p.fireCooldown===0){const target=input.aim||b;const a=angle(p,target);this.shots.push({x:p.x,y:p.y,vx:Math.cos(a)*720,vy:Math.sin(a)*720,r:4});p.fireCooldown=.15;this.shotsFired++;}
    for(const shot of this.shots){shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;if(!shot.dead&&distance(shot,b)<b.r+shot.r){shot.dead=true;const damage=Math.min(b.hp,14);b.hp-=damage;this.damageDealt+=damage;this.shotsHit++;this.emit('spark',shot.x,shot.y,3);}}
    this.shots=this.shots.filter(s=>!s.dead&&s.x>-20&&s.x<980&&s.y>-20&&s.y<660);
    if(b.hp<=0){this.state='won';this.cast=null;this.bullets=[];this.rings=[];this.emit('cast',b.x,b.y,40);this.log('Boss defeated. Encounter complete.');return;}
    const nextPhase=phaseAt(this.config,b.hp);
    if(nextPhase!==this.phase){this.phase=nextPhase;this.cast=null;this.bullets=[];this.rings=[];this.timer=1.2;this.attackIndex=0;this.phaseFlash=1.2;this.log(`Phase ${this.phase+1}: ${this.config.phases[this.phase].name}`);}
    this.timer-=dt;
    if(this.cast){this.cast.remaining-=dt;if(this.cast.remaining<=0){const c=this.cast;this.spawn(c);this.timer=c.attack.cooldown;this.cast=null;}}
    else if(this.timer<=0){const list=this.config.phases[this.phase].attacks;const a=list[this.attackIndex%list.length];this.attackIndex++;this.cast={attack:a,remaining:a.windup,duration:a.windup,x:b.x,y:b.y,target:angle(b,p)};}
    for(const bullet of this.bullets){bullet.x+=bullet.vx*dt;bullet.y+=bullet.vy*dt;if(distance(bullet,p)<bullet.r+p.r){if(this.damagePlayer(bullet.damage))bullet.dead=true;}}
    this.bullets=this.bullets.filter(s=>!s.dead&&s.x>-30&&s.x<990&&s.y>-30&&s.y<670).slice(-600);
    for(const ring of this.rings){const old=ring.r;ring.r+=ring.speed*dt;if(ring.r>0&&Math.abs(distance(ring,p)-ring.r)<p.r+6+Math.abs(ring.r-old))this.damagePlayer(ring.damage);}
    this.rings=this.rings.filter(r=>r.r<750);
    if(distance(p,b)<p.r+b.r)this.damagePlayer(12*this.scale.damage);
    for(const particle of this.particles){particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.life-=dt;}
    this.particles=this.particles.filter(s=>s.life>0);
  }
}
