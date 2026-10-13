'use strict';
const $=id=>document.getElementById(id),canvas=$('preview'),ctx=canvas.getContext('2d');
const defaults={metal:'#ffc878',concrete:'#b7b0a0',glass:'#78dccd',smoke:'#a4b0b8'};
const titles={metal:'METAL / SPARK RESPONSE',concrete:'CONCRETE / CHIP + DUST',glass:'GLASS / SHARD RESPONSE',smoke:'SMOKE / EXPANDING PUFF'};
let type='metal',items=[],last=null,seed=7123,paused=false,time=0,lastTime=0,accumulator=0,repeatClock=0,flash=0;
const STEP=1/120,message=text=>$('status').textContent=text;
function current(){return {version:1,type,intensity:Number($('intensity').value),size:Number($('size').value),colour:$('colour').value,seed};}
function labels(){for(const id of ['intensity','size','speed'])$(id+'Value').textContent=Number($(id).value).toFixed(2)+'×';$('effectTitle').textContent=titles[type];
 for(const button of document.querySelectorAll('[data-type]')){const active=button.dataset.type===type;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}}
function apply(p){type=p.type;seed=p.seed;$('intensity').value=p.intensity;$('size').value=p.size;$('colour').value=p.colour;labels();}
function fire(p){last=IndustrialEffects.preset(p||{...current(),seed:(++seed)>>>0});items=IndustrialEffects.burst(last);flash=type==='metal'?.12:.03;accumulator=repeatClock=0;message(`${type[0].toUpperCase()+type.slice(1)} burst fired · ${items.length} particles. ${paused?'Resume to play.':''}`);}
function line(x1,y1,x2,y2,colour,width=1){ctx.strokeStyle=colour;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function scene(){
 const wall=ctx.createLinearGradient(0,0,0,620);wall.addColorStop(0,'#18241e');wall.addColorStop(1,'#2b3830');ctx.fillStyle=wall;ctx.fillRect(0,0,960,620);
 for(let x=0;x<960;x+=160){ctx.fillStyle='#0d191433';ctx.fillRect(x,0,3,490);for(let y=40;y<400;y+=100){ctx.fillStyle='#66716455';ctx.fillRect(x+14,y,4,4);}}
 line(0,490,960,490,'#9aa58444',2);ctx.fillStyle='#0e1a14';ctx.fillRect(0,492,960,128);
 for(let x=-480;x<1440;x+=90)line(480+(x-480)*.17,492,x,620,'#3c4e3666');for(let y=510;y<620;y+=25)line(0,y,960,y,'#3c4e3666');
 ctx.fillStyle='#b8c5a355';ctx.font='10px monospace';ctx.fillText('CONTACT POINT / 01',28,40);ctx.fillText('BROWSER STUDY',28,58);
 ctx.save();ctx.translate(480,530);ctx.scale(1,.23);ctx.fillStyle='#00000088';ctx.beginPath();ctx.arc(0,0,145,0,Math.PI*2);ctx.fill();ctx.restore();
 // Material sample plate remains intact; this is an effect study, not fracture geometry.
 ctx.fillStyle=type==='concrete'?'#4c554b':type==='glass'?'#4c857b44':'#354638';ctx.fillRect(372,293,216,144);
 ctx.strokeStyle=type==='glass'?'#b1e9d088':'#74836c';ctx.lineWidth=2;ctx.strokeRect(372,293,216,144);
 if(type==='metal'){for(let y=313;y<430;y+=19)line(380,y,580,y,'#223025',2);for(const [x,y] of [[383,304],[577,304],[383,426],[577,426]]){ctx.fillStyle='#c1c8aa';ctx.fillRect(x-2,y-2,4,4);}}
 if(type==='concrete'){for(let y=308;y<430;y+=31)line(373,y,587,y,'#293d2b',3);for(let x=390;x<580;x+=51)line(x,293,x,437,'#323f32',2);}
 if(type==='glass'){line(390,415,484,305,'#d1eee155',8);line(460,426,565,309,'#d1eee122',4);}
 ctx.strokeStyle='#dce09c66';ctx.lineWidth=1;ctx.beginPath();ctx.arc(480,365,17,0,Math.PI*2);ctx.stroke();line(455,365,466,365,'#dce09c66');line(494,365,505,365,'#dce09c66');line(480,340,480,351,'#dce09c66');line(480,379,480,390,'#dce09c66');
 ctx.fillStyle='#b7bcb177';ctx.font='9px monospace';ctx.fillText('CLICK TO TRIGGER',430,575);
}
function draw(){scene();
 for(const p of items){ctx.save();const alpha=Math.min(1,p.life/.3);ctx.globalAlpha=alpha;
 if(p.kind==='smoke'||p.kind==='dust'){
  ctx.globalAlpha*=p.kind==='smoke'?.12:.16;const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.radius);g.addColorStop(0,p.colour);g.addColorStop(.5,p.colour+'bb');g.addColorStop(1,p.colour+'00');ctx.fillStyle=g;ctx.fillRect(p.x-p.radius,p.y-p.radius,p.radius*2,p.radius*2);
 }else if(p.kind==='metal'){
  ctx.globalCompositeOperation='lighter';ctx.shadowBlur=6;ctx.shadowColor=p.colour;
  const speed=Math.hypot(p.vx,p.vy)||1,length=Math.min(18,4+speed*.02);line(p.x,p.y,p.x-p.vx/speed*length,p.y-p.vy/speed*length,p.colour,1.3);
 }else{ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.fillStyle=p.colour;if(p.kind==='glass'){ctx.globalAlpha*=.8;ctx.beginPath();ctx.moveTo(-p.radius,-p.radius*.6);ctx.lineTo(p.radius,0);ctx.lineTo(0,p.radius);ctx.closePath();ctx.fill();ctx.strokeStyle='#e4ffee';ctx.lineWidth=.6;ctx.stroke();}else{ctx.fillRect(-p.radius/2,-p.radius/2,p.radius,p.radius*.7);ctx.fillStyle='#ffffff44';ctx.fillRect(-p.radius/2,-p.radius/2,p.radius,1);}}
 ctx.restore();}
 if(flash>0){ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(480,365,0,480,365,55);g.addColorStop(0,'#fff1b4');g.addColorStop(1,'#ffe5a000');ctx.globalAlpha=flash*4;ctx.fillStyle=g;ctx.fillRect(425,310,110,110);ctx.restore();}
 $('count').textContent=items.length+' PARTICLES';
}
function loop(now){const dt=lastTime?Math.min((now-lastTime)/1000,.06):0;lastTime=now;
 if(!document.hidden&&!paused){const scaled=dt*Number($('speed').value);time+=scaled;repeatClock+=scaled;accumulator+=scaled;while(accumulator>=STEP){items=IndustrialEffects.step(items,STEP);flash=Math.max(0,flash-STEP);accumulator-=STEP;}if($('loop').checked&&repeatClock>=2.8)fire();}
 if(!document.hidden)draw();requestAnimationFrame(loop);
}
for(const b of document.querySelectorAll('[data-type]'))b.onclick=()=>{type=b.dataset.type;$('colour').value=defaults[type];labels();items=[];flash=0;message('Effect selected. Fire a burst to inspect it.');};
for(const id of ['intensity','size','speed'])$(id).oninput=labels;
$('fire').onclick=()=>fire();canvas.onclick=()=>{fire();canvas.focus({preventScroll:true});};
$('replay').onclick=()=>{if(last){apply(last);fire(last);}else message('Fire an effect first.');};
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Resume':'Pause';message(paused?'Simulation paused. Save a frame or adjust the next burst.':'Simulation resumed.');};
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!['INPUT','SELECT','BUTTON','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();fire();}});
document.addEventListener('visibilitychange',()=>{lastTime=0;accumulator=0;});
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('capture').onclick=()=>{draw();canvas.toBlob(blob=>{if(blob){download(blob,'industrial-impact-frame.png');message('Browser study frame saved.');}else message('Frame export failed.');},'image/png');};
$('export').onclick=()=>{download(new Blob([JSON.stringify(last||current(),null,2)],{type:'application/json'}),'industrial-impact-preset.json');message('Browser preset exported. Last fired settings are used when available.');};
$('import').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>12000)throw new Error('Preset exceeds 12 KB.');const p=IndustrialEffects.preset(JSON.parse(await file.text()));apply(p);fire(p);message('Browser preset imported.');}catch(err){message(err.message);}};
labels();requestAnimationFrame(loop);
