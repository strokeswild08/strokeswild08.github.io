'use strict';
const $=id=>document.getElementById(id),canvas=$('stage'),ctx=canvas.getContext('2d');
const W=960,H=620,FLOOR=465,TARGET={x:480,y:403,w:112,h:124};
let material='wood',particles=[],broken=false,cracks=[],flash=0,shock=0,shake=0,elapsed=0,lastTime=0,accumulator=0,lastPreset=null,seed=3841,fpsFrames=0,fpsClock=0;
const FIXED=1/120;
const message=text=>$('status').textContent=text;
function settings(){return {version:1,material,force:Number($('force').value),angle:Number($('direction').value),reduced:$('reduced').checked,seed};}
function validatePreset(p){
 if(!p||p.version!==1||!Object.hasOwn(ImpactPhysics.MATERIALS,p.material)||!Number.isFinite(p.force)||p.force<.25||p.force>2.5||!Number.isFinite(p.angle)||p.angle< -180||p.angle>0||typeof p.reduced!=='boolean'||!Number.isInteger(p.seed)||p.seed<0||p.seed>4294967295)throw new Error('Invalid preset. Choose a Fracture Lab version 1 preset.');
 return {version:1,material:p.material,force:p.force,angle:p.angle,reduced:p.reduced,seed:p.seed};
}
function reset(){particles=[];broken=false;cracks=[];flash=shock=shake=elapsed=accumulator=0;$('hit').disabled=false;message('Ready. Hit the target to break it.');}
function labels(){
 $('forceValue').textContent=Number($('force').value).toFixed(2)+'×';$('directionValue').textContent=$('direction').value+'°';$('speedValue').textContent=Number($('speed').value).toFixed(2)+'×';
 $('stageLabel').textContent=material.toUpperCase()+' / IMPACT STUDY';
 for(const b of document.querySelectorAll('[data-material]')){const active=b.dataset.material===material;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}
}
function apply(p){material=p.material;$('force').value=String(p.force);$('direction').value=String(p.angle);$('reduced').checked=p.reduced;seed=p.seed;labels();}
function hit(preset){
 const p=preset||{...settings(),seed:++seed};lastPreset=validatePreset(p);material=p.material;labels();
 particles=ImpactPhysics.burst({...p,x:TARGET.x,y:TARGET.y});broken=true;flash=.15;shock=0;shake=p.reduced?0:8*p.force;elapsed=0;accumulator=0;
 const rand=ImpactPhysics.random(p.seed+77);cracks=Array.from({length:7},()=>({x:(rand()-.5)*130,dx:(rand()-.5)*36,length:15+rand()*35}));
 $('hit').disabled=false;message(`${material[0].toUpperCase()+material.slice(1)} impact · ${p.force.toFixed(2)}× force. Replay or adjust the next hit.`);
}
function line(x1,y1,x2,y2,colour,width=1){ctx.strokeStyle=colour;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function background(){
 const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#101b27');grad.addColorStop(1,'#18232d');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 const glow=ctx.createRadialGradient(480,340,10,480,340,340);glow.addColorStop(0,'#31445388');glow.addColorStop(1,'#19253000');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#0c141c';ctx.fillRect(0,FLOOR,W,H-FLOOR);
 for(let y=FLOOR+20;y<H;y+=28)line(0,y,W,y,'#26364366');
 for(let x=-480;x<W+480;x+=70)line(480+(x-480)*.2,FLOOR,x,H,'#26364366');
 line(0,FLOOR,W,FLOOR,'#4b6577',2);
 ctx.fillStyle='#8a9eae';ctx.font='10px monospace';ctx.fillText('IMPACT CHAMBER / 02',30,40);ctx.fillText('MATERIAL RESPONSE STUDY',30,58);
 ctx.fillStyle='#ffffff08';ctx.fillRect(80,110,3,240);ctx.fillRect(877,110,3,240);
 ctx.fillStyle='#00000066';ctx.beginPath();ctx.ellipse(TARGET.x,FLOOR+3,80,10,0,0,Math.PI*2);ctx.fill();
}
function target(){
 const x=TARGET.x-TARGET.w/2,y=TARGET.y-TARGET.h/2;
 ctx.save();ctx.translate(x,y);ctx.lineJoin='miter';
 if(material==='wood'){
  ctx.fillStyle='#7c5436';ctx.fillRect(0,0,112,124);ctx.fillStyle='#ba8554';ctx.fillRect(5,5,102,114);
  for(let i=0;i<5;i++){ctx.fillStyle=i%2?'#b5804e':'#c58d58';ctx.fillRect(8+i*20,8,18,108);line(10+i*20,17,10+i*20,105,'#70482b66');}
  ctx.strokeStyle='#e2b779';ctx.lineWidth=9;ctx.strokeRect(6,6,100,112);line(12,112,100,12,'#e2b779',11);line(12,112,100,12,'#815837',1);
  for(const [a,b] of [[8,8],[104,8],[8,116],[104,116]]){ctx.fillStyle='#493a31';ctx.fillRect(a-2,b-2,4,4);}
 }else if(material==='stone'){
  ctx.fillStyle='#52677a';ctx.fillRect(0,0,112,124);ctx.fillStyle='#93a4b0';ctx.fillRect(5,5,99,109);ctx.fillStyle='#bdc8ce';ctx.fillRect(5,5,99,7);
  for(let i=0;i<4;i++){line(6,30+i*28,103,30+i*28,'#465b6c',3);line(i%2?28:70,6+i*28,i%2?28:70,30+i*28,'#465b6c',2);}
  const rand=ImpactPhysics.random(90);for(let i=0;i<35;i++){ctx.fillStyle=i%2?'#c7d0d555':'#394c6055';ctx.fillRect(9+rand()*88,15+rand()*96,2,2);}
 }else{
  const grad=ctx.createLinearGradient(0,0,112,124);grad.addColorStop(0,'#b8f5e477');grad.addColorStop(.5,'#58b6bc33');grad.addColorStop(1,'#b8f5e477');ctx.fillStyle=grad;ctx.fillRect(0,0,112,124);ctx.strokeStyle='#a5e7df';ctx.lineWidth=2;ctx.strokeRect(1,1,110,122);line(13,100,82,13,'#e5fff988',8);line(34,112,97,30,'#e5fff933',3);line(5,5,107,5,'#e2fff4',2);
 }
 ctx.restore();
}
function debris(){
 for(const p of particles){
  ctx.save();ctx.globalAlpha=Math.min(1,p.life/.45);
  if(p.kind==='dust'){
   ctx.globalAlpha*=.18*(p.life/p.maxLife);const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.radius);g.addColorStop(0,p.colour);g.addColorStop(1,p.colour+'00');ctx.fillStyle=g;ctx.fillRect(p.x-p.radius,p.y-p.radius,p.radius*2,p.radius*2);
  }else{
   ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.fillStyle=p.colour;
   if(material==='glass'){ctx.globalAlpha*=.85;ctx.beginPath();ctx.moveTo(-p.width/2,-p.height/2);ctx.lineTo(p.width/2,0);ctx.lineTo(-p.width/3,p.height/2);ctx.closePath();ctx.fill();ctx.strokeStyle='#dbfff0';ctx.lineWidth=.7;ctx.stroke();}
   else{ctx.fillRect(-p.width/2,-p.height/2,p.width,p.height);ctx.fillStyle='#ffffff44';ctx.fillRect(-p.width/2,-p.height/2,p.width,1);}
  }
  ctx.restore();
 }
}
function draw(){
 ctx.fillStyle='#11161c';ctx.fillRect(0,0,W,H);ctx.save();const wobble=Math.sin(elapsed*75)*shake;ctx.translate(wobble,Math.cos(elapsed*64)*shake*.45);background();
 for(const c of cracks){line(TARGET.x+c.x,FLOOR+2,TARGET.x+c.x+c.dx,FLOOR+c.length,'#02070baa',1.5);line(TARGET.x+c.x+c.dx,FLOOR+c.length,TARGET.x+c.x+c.dx+10,FLOOR+c.length+5,'#52657955');}
 if(!broken)target();debris();
 if(broken&&shock<.5){const radius=shock*270;ctx.globalAlpha=(1-shock/.5)*.3;ctx.strokeStyle=ImpactPhysics.MATERIALS[material].dust;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(TARGET.x,FLOOR,radius,radius*.25,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
 if(flash>0){ctx.globalAlpha=flash*3;ctx.fillStyle='#fff2d5';ctx.beginPath();ctx.arc(TARGET.x,TARGET.y,25+flash*70,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
 if($('guides').checked&&!broken){
  const a=Number($('direction').value)*Math.PI/180,length=55+Number($('force').value)*17,x=TARGET.x+Math.cos(a)*length,y=TARGET.y+Math.sin(a)*length;
  line(TARGET.x,TARGET.y,x,y,'#ffad73',2);line(x,y,x-Math.cos(a-.45)*10,y-Math.sin(a-.45)*10,'#ffad73',2);line(x,y,x-Math.cos(a+.45)*10,y-Math.sin(a+.45)*10,'#ffad73',2);
  ctx.strokeStyle='#ffad7355';ctx.setLineDash([4,5]);ctx.strokeRect(TARGET.x-66,TARGET.y-72,132,144);ctx.setLineDash([]);
 }
 ctx.restore();
}
function loop(time){
 const dt=lastTime?Math.min((time-lastTime)/1000,.08):0;lastTime=time;
 if(!document.hidden){
  accumulator+=dt*Number($('speed').value);
  while(accumulator>=FIXED){particles=ImpactPhysics.step(particles,FIXED,FLOOR);flash=Math.max(0,flash-FIXED);shock+=FIXED;shake*=Math.exp(-FIXED*15);elapsed+=FIXED;accumulator-=FIXED;}
  draw();fpsFrames++;fpsClock+=dt;if(fpsClock>=.5){$('fps').textContent=Math.round(fpsFrames/fpsClock)+' FPS';fpsClock=0;fpsFrames=0;}
  $('particles').textContent=particles.length+' PARTICLES';
 }requestAnimationFrame(loop);
}
for(const b of document.querySelectorAll('[data-material]'))b.onclick=()=>{material=b.dataset.material;labels();reset();};
for(const id of ['force','direction','speed'])$(id).oninput=labels;
$('hit').onclick=()=>hit();$('reset').onclick=reset;
$('replay').onclick=()=>{if(lastPreset){apply(lastPreset);hit(lastPreset);}else message('Trigger an impact first, then replay it.');};
canvas.onclick=e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;if(x>TARGET.x-90&&x<TARGET.x+90&&y>TARGET.y-100&&y<FLOOR+30)hit();else message('Click the target in the centre, or use Hit target.');};
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','BUTTON','SELECT','TEXTAREA'].includes(e.target.tagName)&&!e.repeat){e.preventDefault();hit();}});
document.addEventListener('visibilitychange',()=>{lastTime=0;accumulator=0;});
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('capture').onclick=()=>{draw();canvas.toBlob(blob=>{if(blob){download(blob,'fracture-lab-frame.png');message('Frame saved. It is a scene capture, not a transparent sprite sheet.');}else message('Frame export failed.');},'image/png');};
$('export').onclick=()=>{const preset=lastPreset||settings();download(new Blob([JSON.stringify(preset,null,2)],{type:'application/json'}),'fracture-lab-preset.json');message(lastPreset?'Last impact preset exported.':'Current settings exported.');};
$('import').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>12000)throw new Error('Preset file is too large.');const p=validatePreset(JSON.parse(await file.text()));apply(p);hit(p);message('Preset imported and played.');}catch(err){message(err.message);}};
labels();requestAnimationFrame(loop);
