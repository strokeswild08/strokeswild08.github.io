import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

const $ = s => document.querySelector(s);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const defaults = {body:'#d55b38',buttons:'#ddd6bd',sticks:'#252928',accent:'#eabf70',finish:'matte',lighting:'warm',explode:0};
const presets = {
  ember:{...defaults},
  chalk:{...defaults,body:'#d4d2bc',buttons:'#3c4841',sticks:'#303733',accent:'#add4c8'},
  moss:{...defaults,body:'#657b59',buttons:'#d2c69f',sticks:'#202c24',accent:'#d3ee8c'}
};
const colors=['#d55b38','#d4d2bc','#657b59','#7895a1','#302f35','#b99baf'];
const state={...defaults};
function sanitize(data){
  const clean={};
  if(!data||typeof data!=='object')return clean;
  for(const key of ['body','buttons','sticks','accent'])if(/^#[a-f\d]{6}$/i.test(data[key]))clean[key]=data[key].toLowerCase();
  if(['matte','gloss','metal'].includes(data.finish))clean.finish=data.finish;
  if(['warm','cool','neutral'].includes(data.lighting))clean.lighting=data.lighting;
  if(Number.isFinite(data.explode))clean.explode=THREE.MathUtils.clamp(data.explode,0,100);
  return clean;
}
try{const hash=new URLSearchParams(location.hash.slice(1)).get('design');const saved=hash?JSON.parse(hash):JSON.parse(localStorage.getItem('form01-design')||'null');Object.assign(state,sanitize(saved));}catch{/* Invalid or unavailable storage starts with the default design. */}

const viewport=$('#viewport');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setClearColor(0x000000,0);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
viewport.appendChild(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(34,1,.1,100);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.07;controls.enablePan=false;
controls.minDistance=7;controls.maxDistance=20;controls.autoRotateSpeed=.55;
controls.target.set(0,-.05,0);controls.maxPolarAngle=Math.PI*.91;
const pmrem=new THREE.PMREMGenerator(renderer);
const room=new RoomEnvironment();const environment=pmrem.fromScene(room,.04);
scene.environment=environment.texture;room.dispose();pmrem.dispose();
const ambient=new THREE.HemisphereLight(0xf4efd7,0x34452c,2.3);scene.add(ambient);
const key=new THREE.DirectionalLight(0xffe4c7,4.2);key.position.set(-4,6,8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;key.shadow.normalBias=.03;scene.add(key);
const rim=new THREE.DirectionalLight(0xc7dcad,3);rim.position.set(5,2,-3);scene.add(rim);
const fill=new THREE.DirectionalLight(0xe0e9e1,1.1);fill.position.set(1,-2,5);scene.add(fill);
const root=new THREE.Group();root.rotation.z=-.06;scene.add(root);
const parts=[];
const material=(color,roughness=.5,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const shellMat=new THREE.MeshPhysicalMaterial({color:state.body,roughness:.62,metalness:.05,clearcoat:.12});
const rearMat=new THREE.MeshPhysicalMaterial({color:state.body,roughness:.75,metalness:.05});
const buttonMat=material(state.buttons,.4,.1),stickMat=material(state.sticks,.8),black=material('#171d1a',.62),rubber=material('#252d27',.94),metal=material('#adb3a6',.3,.8),pcbMat=material('#35594b',.7,.15);
const ledMat=new THREE.MeshStandardMaterial({color:state.accent,emissive:state.accent,emissiveIntensity:1.5,roughness:.3});
function part(name,offset){const group=new THREE.Group();group.userData={label:name,explode:new THREE.Vector3(...offset)};root.add(group);parts.push(group);return group;}
function mesh(geometry,mat,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function rounded(w,h,d,r=.1){const s=new THREE.Shape(),x=-w/2,y=-h/2; s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:12});g.translate(0,0,-d/2);return g;}
function cylinder(rad,depth,mat,parent,x,y,z){const m=mesh(new THREE.CylinderGeometry(rad,rad,depth,48),mat,parent,x,y,z);m.rotation.x=Math.PI/2;return m;}
function ring(radius,tube,mat,parent,x,y,z){return mesh(new THREE.TorusGeometry(radius,tube,12,64),mat,parent,x,y,z);}
function silhouette(){const s=new THREE.Shape();s.moveTo(-1.72,1.04);s.bezierCurveTo(-2.16,1.02,-2.43,.64,-2.43,.06);s.bezierCurveTo(-2.44,-.45,-2.63,-1.41,-2.26,-1.68);s.bezierCurveTo(-1.78,-2.04,-1.43,-1.38,-1.18,-.91);s.bezierCurveTo(-.91,-.48,-.68,-.38,0,-.39);s.bezierCurveTo(.68,-.38,.91,-.48,1.18,-.91);s.bezierCurveTo(1.43,-1.38,1.78,-2.04,2.26,-1.68);s.bezierCurveTo(2.63,-1.41,2.44,-.45,2.43,.06);s.bezierCurveTo(2.43,.64,2.16,1.02,1.72,1.04);s.bezierCurveTo(.85,1.17,-.85,1.17,-1.72,1.04);return s;}
function shell(depth){const geo=new THREE.ExtrudeGeometry(silhouette(),{depth,bevelEnabled:true,bevelSize:.13,bevelThickness:.12,bevelSegments:6,curveSegments:28,steps:1});geo.translate(0,0,-depth/2);return geo;}
const rear=part('Rear housing / textured grips',[0,0,-1.1]);mesh(shell(.26),rearMat,rear,0,0,-.29);
for(const side of [-1,1]){
  const grip=mesh(new THREE.SphereGeometry(1,36,24),rubber,rear,side*1.89,-.68,-.49);grip.scale.set(.39,.81,.17);grip.rotation.z=-side*.22;
  for(let j=0;j<10;j++){const line=mesh(rounded(.37,.017,.018,.007),black,rear,side*(1.91+j*.005),-.2-j*.105,-.64);line.rotation.z=-side*.22;}
  for(const y of [.65,-1.23]){cylinder(.052,.02,metal,rear,side*1.94,y,-.46);mesh(rounded(.055,.009,.01,.003),black,rear,side*1.94,y,-.478);}
}
const board=part('Logic board / concept circuitry',[0,0,.05]);mesh(rounded(3.78,1.56,.065,.25),pcbMat,board,0,.12,-.02);
for(const x of [-1.05,0,1.05]){mesh(rounded(.43,.4,.09,.03),black,board,x,.22,.045);for(let i=0;i<5;i++){mesh(new THREE.BoxGeometry(.022,.07,.02),metal,board,x-.15+i*.075,.45,.05);mesh(new THREE.BoxGeometry(.022,.07,.02),metal,board,x-.15+i*.075,-.01,.05);}}
for(let i=0;i<13;i++){const x=-1.65+i*.27;mesh(new THREE.BoxGeometry(.018,.28+(i%3)*.12,.008),material('#b5b789',.5,.5),board,x,-.35,.023);}
mesh(rounded(.86,.36,.12,.06),metal,board,0,.85,.01);mesh(rounded(.48,.115,.04,.04),black,board,0,.86,.085);
const front=part('Front shell / customizable finish',[0,0,.82]);mesh(shell(.27),shellMat,front,0,0,.18);
// Dark inset wells separate the moving controls from the body.
for(const x of [-.87,.87]){cylinder(.43,.04,black,front,x,-.51,.455);ring(.385,.025,ledMat,front,x,-.51,.482);}
const touch=mesh(rounded(1.43,.62,.065,.12),rubber,front,0,.58,.445);
for(let i=0;i<8;i++){mesh(new THREE.BoxGeometry(.012,.29,.007),black,front,-.45+i*.13,.58,.485);}
const badge=mesh(rounded(.32,.16,.025,.045),buttonMat,front,0,-.12,.46);
mesh(new THREE.BoxGeometry(.15,.018,.015),black,front,0,-.12,.481);
for(const x of [-.94,.94]){mesh(rounded(.2,.1,.035,.04),black,front,x,.71,.46);}
// Shoulder controls are part of their own exploded assembly.
const shoulders=part('Shoulder triggers',[0,.8,-.2]);
for(const side of [-1,1]){mesh(rounded(.91,.22,.3,.1),black,shoulders,side*1.63,1.08,-.05);mesh(rounded(.77,.26,.24,.1),rubber,shoulders,side*1.6,.97,-.35);}
function labelTexture(text){const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const c=canvas.getContext('2d');c.clearRect(0,0,128,128);c.fillStyle='#252e27';c.textAlign='center';c.textBaseline='middle';c.font='500 65px Arial';c.fillText(text,64,67);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;}
const face=part('Action buttons / ceramic caps',[.2,.1,1.4]);
for(const [x,y,text] of [[1.63,.69,'Y'],[1.96,.36,'B'],[1.63,.03,'A'],[1.30,.36,'X']]){cylinder(.192,.14,black,front,x,y,.45);cylinder(.157,.13,buttonMat,face,x,y,.555);mesh(new THREE.PlaneGeometry(.21,.21),new THREE.MeshBasicMaterial({map:labelTexture(text),transparent:true,depthWrite:false}),face,x,y,.626);}
const dpad=part('Directional pad',[-.2,.1,1.4]);
cylinder(.48,.045,black,front,-1.64,.35,.45);
mesh(rounded(.24,.79,.12,.06),buttonMat,dpad,-1.64,.35,.555);mesh(rounded(.79,.24,.12,.06),buttonMat,dpad,-1.64,.35,.557);cylinder(.096,.012,rubber,dpad,-1.64,.35,.631);
for(const side of [-1,1]){
  const sticks=part(`${side<0?'Left':'Right'} analog stick / knurled rim`,[side*.12,-.1,1.65]);const x=side*.87,y=-.51;
  cylinder(.21,.24,black,sticks,x,y,.57);cylinder(.31,.11,stickMat,sticks,x,y,.735);ring(.275,.035,stickMat,sticks,x,y,.798);cylinder(.233,.018,rubber,sticks,x,y,.795);
  for(let j=0;j<32;j++){const a=j/32*Math.PI*2;const ridge=mesh(new THREE.BoxGeometry(.024,.05,.035),stickMat,sticks,x+Math.cos(a)*.306,y+Math.sin(a)*.306,.76);ridge.rotation.z=a;}
}
// Floating shadow, no external textures or product models.
const ground=mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.19}),scene,0,-2.35,0);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
let targetExplosion=state.explode/100,currentExplosion=targetExplosion;
let cameraTarget=null,toastTimer;
const views={hero:new THREE.Vector3(4.8,4.5,10.4),front:new THREE.Vector3(0,.1,12),back:new THREE.Vector3(4,2,-11)};
function setView(name,instant=false){const v=views[name];if(!v)return;controls.autoRotate=false;$('#rotate').setAttribute('aria-pressed','false');if(instant||reducedMotion){camera.position.copy(v);controls.update();}else cameraTarget=v.clone();document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===name;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});}
setView('hero',true);
controls.addEventListener('start',()=>{cameraTarget=null;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});});
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2600);}
function persist(){try{localStorage.setItem('form01-design',JSON.stringify(state));}catch{/* Private browsing may disable storage. */}}
function apply(){
  shellMat.color.set(state.body);rearMat.color.set(state.body);buttonMat.color.set(state.buttons);stickMat.color.set(state.sticks);ledMat.color.set(state.accent);ledMat.emissive.set(state.accent);
  const finish={matte:[.65,.05,.12],gloss:[.16,.08,1],metal:[.28,.83,.4]}[state.finish];
  for(const m of [shellMat,rearMat]){m.roughness=finish[0];m.metalness=finish[1];m.clearcoat=finish[2];}
  const lights={warm:['#ffe4c7','#c7dcad',1.25],cool:['#d0e3ff','#a3bacb',1.2],neutral:['#ffffff','#e1e7dc',1.15]}[state.lighting];key.color.set(lights[0]);rim.color.set(lights[1]);renderer.toneMappingExposure=lights[2];
  $('#body-value').textContent=state.body.toUpperCase();$('#buttons-color').value=state.buttons;$('#sticks-color').value=state.sticks;$('#accent-color').value=state.accent;$('#custom-body').value=state.body;$('#lighting').value=state.lighting;
  $('#explode').value=state.explode;$('#explode-value').textContent=`${Math.round(state.explode)}%`;targetExplosion=state.explode/100;
  $('#explode-toggle').textContent=state.explode>50?'Assemble controller ↙':'Explore the parts ↗';
  $('#finish-detail').textContent={matte:'Soft, low-reflection polymer.',gloss:'Polished shell with a clear-coat sheen.',metal:'Brushed metal with crisp studio reflections.'}[state.finish];
  document.querySelectorAll('[data-finish]').forEach(b=>{const a=b.dataset.finish===state.finish;b.classList.toggle('active',a);b.setAttribute('aria-pressed',a);});
  document.querySelectorAll('[data-body]').forEach(b=>{const a=b.dataset.body===state.body;b.classList.toggle('active',a);b.setAttribute('aria-pressed',a);});
  document.querySelectorAll('[data-preset]').forEach(b=>{const p=presets[b.dataset.preset];const a=['body','buttons','sticks','accent','finish'].every(k=>p[k]===state[k]);b.classList.toggle('active',a);b.setAttribute('aria-pressed',a);});persist();
}
$('.swatches').innerHTML=colors.map((color,i)=>`<button data-body="${color}" style="--chip:${color}" aria-label="${['Terracotta','Chalk','Moss','Glacier','Graphite','Mauve'][i]} shell" aria-pressed="false"></button>`).join('')+'<label title="Choose a custom shell color"><span class="sr-only">Custom shell color</span><input id="custom-body" type="color" value="'+state.body+'"></label>';
document.querySelectorAll('[data-body]').forEach(b=>b.onclick=()=>{state.body=b.dataset.body;apply();});
$('#custom-body').oninput=e=>{state.body=e.target.value;apply();};
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{Object.assign(state,presets[b.dataset.preset]);apply();});
document.querySelectorAll('[data-finish]').forEach(b=>b.onclick=()=>{state.finish=b.dataset.finish;apply();});
for(const k of ['buttons','sticks','accent'])$('#'+k+'-color').oninput=e=>{state[k]=e.target.value;apply();};
$('#lighting').onchange=e=>{state.lighting=e.target.value;apply();};
$('#explode').oninput=e=>{state.explode=Number(e.target.value);apply();};
$('#explode-toggle').onclick=()=>{state.explode=state.explode>50?0:100;apply();if(state.explode)setView('hero');};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('#rotate').onclick=()=>{cameraTarget=null;controls.autoRotate=!controls.autoRotate;$('#rotate').setAttribute('aria-pressed',controls.autoRotate);};
$('#reset').onclick=()=>{Object.assign(state,defaults);apply();setView('hero');toast('Back to the original Ember design.');};
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
$('#save-config').onclick=()=>{download(new Blob([JSON.stringify({project:'FORM / 01',version:1,...state},null,2)],{type:'application/json'}),'wild-strokes-controller.json');toast('Design settings exported.');};
$('#share').onclick=async()=>{const url=new URL(location.href);url.hash=new URLSearchParams({design:JSON.stringify(state)}).toString();try{await navigator.clipboard.writeText(url.href);toast('Design link copied.');}catch{try{history.replaceState(null,'',url);toast('Design added to the address bar. Copy the URL to share.');}catch{toast('Your browser blocked copying. Use Export design to save settings.');}}};
$('#capture').onclick=()=>{const button=$('#capture');button.disabled=true;try{renderer.render(scene,camera);const out=document.createElement('canvas');out.width=1600;out.height=1200;const ctx=out.getContext('2d');const g=ctx.createRadialGradient(800,560,0,800,560,1000);g.addColorStop(0,'#3d4636');g.addColorStop(1,'#20251d');ctx.fillStyle=g;ctx.fillRect(0,0,1600,1200);const source=renderer.domElement;const scale=Math.min(1600/source.width,1000/source.height);ctx.drawImage(source,(1600-source.width*scale)/2,(1200-source.height*scale)/2,source.width*scale,source.height*scale);ctx.fillStyle='#d6ddc7';ctx.font='600 22px Arial';ctx.fillText('WILD STROKES / FORM 01',65,75);ctx.font='16px Arial';ctx.fillStyle='#adb89f';ctx.fillText(`${state.body.toUpperCase()} · ${state.finish.toUpperCase()} · CUSTOM CONTROLLER`,65,1135);out.toBlob(blob=>{button.disabled=false;if(blob){download(blob,'wild-strokes-form01.png');toast('Studio shot saved.');}else toast('Could not create the image. Please try again.');},'image/png');}catch{button.disabled=false;toast('Screenshot unavailable in this browser.');}};
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down={x:0,y:0};
renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',e=>{if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const rect=viewport.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(root.children,true)[0];if(hit){let p=hit.object;while(p.parent&& !p.userData.label)p=p.parent;if(p.userData.label)toast(p.userData.label);}});
function resize(){const {width,height}=viewport.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.zoom=Math.min(1,camera.aspect);camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(viewport);resize();apply();
let previous=performance.now();
renderer.setAnimationLoop(time=>{const dt=Math.min((time-previous)/1000,.05);previous=time;
  if(document.hidden)return;
  currentExplosion=reducedMotion?targetExplosion:THREE.MathUtils.damp(currentExplosion,targetExplosion,6,dt);
  for(const p of parts)p.position.copy(p.userData.explode).multiplyScalar(currentExplosion);
  if(cameraTarget){camera.position.lerp(cameraTarget,1-Math.exp(-5*dt));if(camera.position.distanceTo(cameraTarget)<.008){camera.position.copy(cameraTarget);cameraTarget=null;}}
  controls.update();renderer.render(scene,camera);
});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('#loading').classList.remove('done');$('#loading').textContent='Graphics paused. Reload to reopen your saved design.';});
requestAnimationFrame(()=>$('#loading').classList.add('done'));
