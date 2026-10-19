import {Encounter,DEFAULT,PATTERNS,clone,validateConfig,clamp} from './engine.js';
import {draw} from './render.js';
const $=s=>document.querySelector(s),el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let draft=clone(DEFAULT),editPhase=0;
try{const saved=localStorage.getItem('nocturne-encounter-v1');if(saved)draft=validateConfig(JSON.parse(saved));}catch{}
const game=new Encounter(draft),canvas=$('#arena'),ctx=canvas.getContext('2d');
if(!ctx)throw Error('Canvas 2D is unavailable in this browser.');
const keys=new Set(),touch={x:0,y:0,fire:false,dash:false},mouse={fire:false,aim:null};
let audio=null,sound=false,toastTimer,prevEvents='',hudTime=0,lastState='',clock=0;
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3000);}
function save(){try{localStorage.setItem('nocturne-encounter-v1',JSON.stringify(draft));}catch{toast('This browser could not save settings. Export JSON to keep the blueprint.');}}
function clearInput(){keys.clear();mouse.fire=false;touch.x=0;touch.y=0;touch.fire=false;touch.dash=false;$('#joystick i').style.transform='';}
function enableAudio(){try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();}catch{sound=false;toast('Audio is unavailable in this browser.');}}
function tone(freq,duration=.08,volume=.03,type='sine'){
  if(!sound||!audio||audio.state!=='running')return;
  const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.45),t+duration);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+duration);
}
$('#audio').onclick=()=>{sound=!sound;if(sound)enableAudio();$('#audio').textContent=sound?'SOUND ON':'SOUND OFF';$('#audio').setAttribute('aria-pressed',sound);};
function dirty(){const value=JSON.stringify(draft)!==JSON.stringify(game.config);$('#draft-state').textContent=value?'UNAPPLIED EDITS':'CONFIGURATION IN SYNC';$('#draft-state').classList.toggle('dirty',value);$('#editor-error').hidden=true;}
function renderPhases(){document.querySelectorAll('[data-phase]').forEach(b=>{const index=Number(b.dataset.phase);b.classList.toggle('active',index===editPhase);b.setAttribute('aria-pressed',index===editPhase);b.querySelector('span').textContent=Math.round(draft.phases[index].threshold*100)+'%';});}
function field(label,value,options,change){const l=el('label','',label),input=el('input');input.type='number';Object.assign(input,options);input.value=value;input.oninput=()=>{change(Number(input.value));dirty();};l.append(input);return l;}
function renderAttacks(){const list=$('#attack-list');list.replaceChildren();draft.phases[editPhase].attacks.forEach((a,index)=>{
  const card=el('article','attack-card'),head=el('div','attack-card-head'),select=el('select');select.setAttribute('aria-label',`Attack ${index+1} pattern`);
  for(const type of PATTERNS){const option=el('option','',({bloom:'◎  Bloom burst',fan:'⋔  Aimed fan',pulse:'◯  Shockwave pulse'})[type]);option.value=type;select.append(option);}select.value=a.type;
  select.onchange=()=>{a.type=select.value;if(a.type==='pulse')a.count=Math.min(3,a.count);renderAttacks();dirty();};
  const up=el('button','','↑');up.title='Move attack earlier';up.setAttribute('aria-label',`Move attack ${index+1} earlier`);up.disabled=index===0;up.onclick=()=>{const attacks=draft.phases[editPhase].attacks;[attacks[index-1],attacks[index]]=[attacks[index],attacks[index-1]];renderAttacks();dirty();};
  const remove=el('button','','×');remove.title='Remove attack';remove.setAttribute('aria-label',`Remove attack ${index+1}`);remove.disabled=draft.phases[editPhase].attacks.length===1;remove.onclick=()=>{draft.phases[editPhase].attacks.splice(index,1);renderAttacks();dirty();};
  head.append(el('span','attack-index',String(index+1).padStart(2,'0')),select,up,remove);
  const fields=el('div','attack-fields');fields.append(field(a.type==='pulse'?'Rings · max 3':'Projectiles',a.count,{min:1,max:a.type==='pulse'?3:36,step:1},v=>a.count=v),field('Warning · seconds',a.windup,{min:.35,max:3,step:.05},v=>a.windup=v),field('Cooldown · seconds',a.cooldown,{min:.3,max:3,step:.05},v=>a.cooldown=v),field('Damage',a.damage,{min:1,max:30,step:1},v=>a.damage=v));card.append(head,fields);list.append(card);
  });$('#add-attack').disabled=draft.phases[editPhase].attacks.length>=6;
}
function renderEditor(){
  $('#boss-name').value=draft.name;$('#boss-hp').value=draft.hp;$('#difficulty').value=draft.difficulty;renderPhases();const p=draft.phases[editPhase];$('#phase-name').value=p.name;$('#threshold').disabled=editPhase===0;
  $('#threshold').min=editPhase===1?Math.round(draft.phases[2].threshold*100)+5:5;$('#threshold').max=editPhase===2?Math.round(draft.phases[1].threshold*100)-5:95;$('#threshold').value=p.threshold*100;$('#threshold-value').textContent=Math.round(p.threshold*100)+'%';$('#speed').value=p.speed;$('#speed-value').textContent=p.speed+' px/s';renderAttacks();dirty();
}
$('#boss-name').oninput=e=>{draft.name=e.target.value;dirty();};$('#boss-hp').oninput=e=>{draft.hp=Number(e.target.value);dirty();};$('#difficulty').onchange=e=>{draft.difficulty=e.target.value;dirty();};$('#phase-name').oninput=e=>{draft.phases[editPhase].name=e.target.value;dirty();};
$('#threshold').oninput=e=>{draft.phases[editPhase].threshold=Number(e.target.value)/100;$('#threshold-value').textContent=e.target.value+'%';renderPhases();dirty();};$('#speed').oninput=e=>{draft.phases[editPhase].speed=Number(e.target.value);$('#speed-value').textContent=e.target.value+' px/s';dirty();};
document.querySelectorAll('[data-phase]').forEach(b=>b.onclick=()=>{editPhase=Number(b.dataset.phase);renderEditor();});
$('#add-attack').onclick=()=>{const attacks=draft.phases[editPhase].attacks;if(attacks.length<6){attacks.push({type:'fan',count:5,windup:1,cooldown:1,damage:10});renderAttacks();dirty();}};
function configError(e){$('#editor-error').textContent=e.message;$('#editor-error').hidden=false;toast(e.message);}
function apply(start=true){try{draft=validateConfig(draft);game.reset(draft);save();clearInput();if(start)game.start();dirty();hud();canvas.focus({preventScroll:true});tone(220,.2,.04);return true;}catch(e){configError(e);return false;}}
$('#apply').onclick=()=>{if(apply())toast('Blueprint applied. New trial started.');};
$('#restore').onclick=()=>{draft=clone(DEFAULT);editPhase=0;renderEditor();apply(false);toast('Original encounter restored.');};
$('#start').onclick=()=>{enableAudio();if(game.state==='ready')game.start();else if(game.state==='paused')game.togglePause();else{game.reset(game.config);game.start();}clearInput();hud();canvas.focus({preventScroll:true});};
function pause(){game.togglePause();clearInput();hud();}$('#pause').onclick=pause;
function inForm(target){return target instanceof HTMLElement&&(['INPUT','SELECT','TEXTAREA','BUTTON'].includes(target.tagName)||target.isContentEditable);}
window.addEventListener('keydown',e=>{if(inForm(e.target))return;const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','j','p','w','a','s','d'].includes(k)){e.preventDefault();if(k==='p'&&!e.repeat)pause();else keys.add(k);}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{clearInput();if(game.state==='running'){game.togglePause();hud();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(game.state==='running'){game.togglePause();hud();}}});
function aimPoint(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*960,y:(e.clientY-r.top)/r.height*640};}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||game.state!=='running')return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);mouse.fire=true;mouse.aim=aimPoint(e);});canvas.addEventListener('pointermove',e=>{mouse.aim=aimPoint(e);});for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>mouse.fire=false);
for(const [id,key] of [['touch-fire','fire'],['touch-dash','dash']]){const button=$('#'+id);button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);touch[key]=true;});for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>touch[key]=false);}
const joystick=$('#joystick');let stickPointer=null;
function moveStick(e){if(e.pointerId!==stickPointer)return;const r=joystick.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,dist=Math.hypot(x,y),radius=r.width*.32,factor=dist>radius?radius/dist:1;touch.x=x*factor/radius;touch.y=y*factor/radius;$('#joystick i').style.transform=`translate(${x*factor}px,${y*factor}px)`;}
joystick.addEventListener('pointerdown',e=>{e.preventDefault();stickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);moveStick(e);});joystick.addEventListener('pointermove',moveStick);for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,()=>{stickPointer=null;touch.x=0;touch.y=0;$('#joystick i').style.transform='';});
$('#export').onclick=()=>{try{const config=validateConfig(draft);const url=URL.createObjectURL(new Blob([JSON.stringify(config,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='nocturne-encounter.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('Encounter blueprint exported.');}catch(e){configError(e);}};
$('#import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>65536)throw Error('Choose a JSON blueprint smaller than 64 KB.');draft=validateConfig(JSON.parse(await file.text()));editPhase=0;renderEditor();toast('Blueprint imported. Apply & restart to test it.');}catch(error){configError(error instanceof SyntaxError?Error('The file does not contain valid JSON.'):error);}finally{e.target.value='';}};
const timeText=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
function hud(){
  $('#boss-title').textContent=game.config.name;$('#boss-health').textContent=`${Math.ceil(game.boss.hp)} / ${game.config.hp}`;$('#boss-bar').style.width=game.boss.hp/game.config.hp*100+'%';$('#phase-title').textContent=['I','II','III'][game.phase]+' / '+game.config.phases[game.phase].name.toUpperCase();$('#phase-marker-1').style.left=game.config.phases[1].threshold*100+'%';$('#phase-marker-2').style.left=game.config.phases[2].threshold*100+'%';$('#player-bar').style.width=game.player.hp/game.player.maxHP*100+'%';$('#player-health').textContent=Math.ceil(game.player.hp);
  $('#metric-time').textContent=timeText(game.time);$('#metric-damage').textContent=Math.round(game.damageDealt);$('#metric-hits').textContent=game.hitsTaken;$('#metric-dodges').textContent=game.dodges;$('#metric-accuracy').textContent=game.shotsFired?Math.round(game.shotsHit/game.shotsFired*100)+'%':'—';$('#dash-state').textContent=game.player.dashCooldown>0?`◌ DODGE ${game.player.dashCooldown.toFixed(1)}s`:'● DODGE READY';
  $('#run-status').textContent={ready:'READY TO TEST',running:'TRIAL IN PROGRESS',paused:'TRIAL PAUSED',won:'ENCOUNTER CLEARED',lost:'TRIAL ENDED'}[game.state];$('#pause').disabled=!['running','paused'].includes(game.state);$('#pause').textContent=game.state==='paused'?'▶ Resume':'Ⅱ Pause';
  $('#attack-cue').textContent=game.state==='running'&&game.cast?`INCOMING / ${game.cast.attack.type.toUpperCase()} · ${Math.max(0,game.cast.remaining).toFixed(1)}s`:'';
  const signature=JSON.stringify(game.events);if(signature!==prevEvents){prevEvents=signature;const log=$('#event-log');log.replaceChildren();for(const event of game.events){const row=el('p');row.append(el('time','',timeText(event.time)),document.createTextNode(event.text));log.append(row);}}
  if(lastState!==game.state){lastState=game.state;$('#overlay').hidden=game.state==='running';const messages={ready:['THE BRASS ORACLE AWAITS','Read. Dodge. Survive.','Orange marks the warning. Mint marks your fire. Keep moving. Find the opening.','Enter the arena'],paused:['TAKE A BREATH','The trial can wait.','Your current encounter is paused. Resume when you’re ready.','Resume trial'],won:['ENCOUNTER COMPLETE','A worthy victory.',`${game.hitsTaken} hits taken. ${game.dodges} dodges. Try a tougher blueprint, or perfect this one.`,'Run it again'],lost:['THE ORACLE PREVAILS','One more attempt.',`You dealt ${Math.round(game.damageDealt)} damage. Read the warning, dodge the edge, try again.`,'Try again']};if(messages[game.state]){const [kicker,title,text,button]=messages[game.state];$('#overlay-kicker').textContent=kicker;$('#overlay-title').textContent=title;$('#overlay-text').textContent=text;$('#start').replaceChildren(document.createTextNode(button),el('span','','↗'));}}
}
let previous=performance.now(),accumulator=0;
function loop(now){const dt=Math.min((now-previous)/1000,.1);previous=now;clock+=dt;accumulator+=dt;let count=0;
  while(accumulator>=1/120&&count++<12){const hits=game.hitsTaken,shots=game.shotsFired,phase=game.phase;
    game.step(1/120,{x:touch.x+Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),y:touch.y+Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup')),fire:keys.has('j')||mouse.fire||touch.fire,dash:keys.has(' ')||touch.dash,aim:mouse.fire?mouse.aim:null});
    if(game.hitsTaken>hits)tone(90,.17,.06,'triangle');else if(game.shotsFired>shots)tone(510,.045,.012,'triangle');if(game.phase!==phase)tone(165,.45,.055);accumulator-=1/120;
  }
  draw(ctx,game,clock,reduced);hudTime+=dt;if(hudTime>.09){hudTime=0;hud();}requestAnimationFrame(loop);
}
renderEditor();hud();requestAnimationFrame(loop);
