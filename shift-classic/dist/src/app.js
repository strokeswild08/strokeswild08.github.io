import * as T from '../vendor/three.module.js';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {RoomEnvironment} from '../vendor/RoomEnvironment.js';
import {GLTFExporter} from '../vendor/exporters/GLTFExporter.js';
import {createClassic,palettes} from './model.js';
const $=id=>document.getElementById(id);
const layerNames={body:'Body panels',frame:'Frame & joints',glass:'Glass',wheels:'Wheels',cabin:'Interior',lighting:'Lights & sensors'};
const state={transform:0,explode:0,tint:.30,wheel:0,wire:false,lights:true,orbit:false,layers:Object.fromEntries(Object.keys(layerNames).map(k=>[k,true]))};
const paletteBox=$('palettes');paletteBox.innerHTML=palettes.map((p,i)=>`<button class="swatch ${i===0?'selected':''}" data-palette="${i}" title="${p.name}" aria-label="${p.name}" aria-pressed="${i===0}" style="background:${p.body}"></button>`).join('');
$('layers').innerHTML=Object.entries(layerNames).map(([key,label])=>`<label><input type="checkbox" data-layer="${key}" checked>${label}</label>`).join('');
let renderer,scene,cam,controls,model,selection=null,boxHelper=null,playing=false,direction=1,toastTimer;
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3200);}
function clearSelection(){selection=null;if(boxHelper){scene?.remove(boxHelper);boxHelper.geometry.dispose();boxHelper.material.dispose();boxHelper=null;}$('part-name').textContent='Select any visible component';$('part-detail').textContent='Inspect a panel, joint, wheel or piece of trim in the 3D view.';}
function updateInfo(){const t=state.transform;$('transform').value=String(Math.round(t*100));$('progress').textContent=Math.round(t*100)+'%';$('mode-label').textContent=t<.02?'COUPE CONFIGURATION':t>.98?'ROBOT CONFIGURATION':'TRANSFORMATION IN PROGRESS';$('stage-label').textContent=t<.05?'01 / ROAD CONFIGURATION':t<.32?'02 / RELEASE & LIFT':t<.65?'03 / DEPLOY LIMBS':t<.95?'04 / LOCK UPPER ASSEMBLY':'05 / ROBOT CONFIGURATION';$('play').textContent=playing?'Ⅱ PAUSE':(t>.5?'◀ RETURN TO CAR':'▶ TRANSFORM');}
function apply(){if(!model)return;model.pose(state.transform,state.explode);model.setTint(state.tint);model.setLights(state.lights);for(const [key,value]of Object.entries(state.layers))model.setLayer(key,value);$('parts-label').textContent=model.meshes.filter(m=>m.visible).length+' VISIBLE MESH PARTS';$('layers-count').textContent=Object.values(state.layers).filter(Boolean).length+' / 6';if(selection&&!selection.visible)clearSelection();boxHelper?.update();updateInfo();}
const target=new T.Vector3(),desiredPosition=new T.Vector3();let cameraMove=false;
function view(name='default',instant=false){const t=state.transform,robot=t>.5;const center=new T.Vector3(robot?-.2:0,robot?2.05:.8,0);const distance=robot?8.4:7.1;const positions={front:new T.Vector3(-distance,robot?3.9:2.6,.02),side:new T.Vector3(0,robot?3.7:2.7,distance),rear:new T.Vector3(distance,robot?3.9:2.8,.02),default:new T.Vector3(-distance*.85,robot?4.5:3.4,distance*.85)};target.copy(center);desiredPosition.copy(positions[name]||positions.default);if(instant){controls.target.copy(target);cam.position.copy(desiredPosition);controls.update();}else cameraMove=true;}
function resize(){if(!renderer)return;const el=$('viewport'),w=el.clientWidth,h=el.clientHeight;cam.aspect=w/h;cam.updateProjectionMatrix();renderer.setSize(w,h,false);}
function init(){
 renderer=new T.WebGLRenderer({canvas:$('canvas'),antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));renderer.setClearColor('#e8e5dc');renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 scene=new T.Scene();scene.background=new T.Color('#e8e5dc');scene.fog=new T.Fog('#e8e5dc',16,35);
 cam=new T.PerspectiveCamera(37,1,.1,80);controls=new OrbitControls(cam,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=3.5;controls.maxDistance=18;controls.maxPolarAngle=Math.PI*.49;controls.autoRotateSpeed=.6;
 controls.addEventListener('start',()=>cameraMove=false);
 const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
 scene.add(new T.HemisphereLight('#fff8ea','#7f8175',2));
 for(const [p,intensity,size]of [[[-5,8,5],4,2048],[[4,6,-4],2.5,1024]]){const light=new T.DirectionalLight('#ffffff',intensity);light.position.set(...p);light.castShadow=true;light.shadow.mapSize.set(size,size);light.shadow.camera.left=-7;light.shadow.camera.right=7;light.shadow.camera.top=7;light.shadow.camera.bottom=-7;light.shadow.camera.near=.5;light.shadow.camera.far=25;light.shadow.normalBias=.035;scene.add(light);}
 const floor=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial({color:'#d8d5cb',roughness:.9,metalness:.03}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;floor.receiveShadow=true;scene.add(floor);
 const ring=new T.Mesh(new T.RingGeometry(3.65,3.66,100),new T.MeshBasicMaterial({color:'#b5b8ab',side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.005;scene.add(ring);
 for(let i=0;i<4;i++){const marker=new T.Mesh(new T.BoxGeometry(.18,.005,.012),new T.MeshBasicMaterial({color:'#8e9686'}));marker.position.set(Math.cos(i*Math.PI/2)*3.66,.008,Math.sin(i*Math.PI/2)*3.66);marker.rotation.y=-i*Math.PI/2;scene.add(marker);}
 model=createClassic();scene.add(model.root);apply();view('default',true);resize();new ResizeObserver(resize).observe($('viewport'));$('loading').hidden=true;
 const ray=new T.Raycaster(),pointer=new T.Vector2();let down=null;
 $('canvas').addEventListener('pointerdown',e=>down={x:e.clientX,y:e.clientY});
 $('canvas').addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const r=$('canvas').getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,cam);const hit=ray.intersectObjects(model.meshes.filter(m=>m.visible),false)[0];clearSelection();if(hit){selection=hit.object;boxHelper=new T.BoxHelper(selection,0xb2492d);boxHelper.material.depthTest=false;boxHelper.renderOrder=3;scene.add(boxHelper);$('part-name').textContent=selection.name;$('part-detail').textContent=selection.userData.assembly+' / '+layerNames[selection.userData.layer];}});
 let last=performance.now();function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;if(playing){state.transform=T.MathUtils.clamp(state.transform+direction*dt/5,0,1);if(state.transform===0||state.transform===1){playing=false;view('default');}apply();}
  // Keep the model centered as its height changes without pulling the orbit angle away from the user.
  if(!cameraMove){const y=T.MathUtils.lerp(.8,2.05,state.transform);controls.target.y=T.MathUtils.lerp(controls.target.y,y,dt*2);}
  else {cam.position.lerp(desiredPosition,Math.min(1,dt*5));controls.target.lerp(target,Math.min(1,dt*5));if(cam.position.distanceTo(desiredPosition)<.02)cameraMove=false;}
  controls.autoRotate=state.orbit&&!playing;controls.update();boxHelper?.update();renderer.render(scene,cam);
 }requestAnimationFrame(frame);
}
try{init();}catch(error){console.error(error);$('loading').innerHTML='<b>3D STUDIO COULD NOT START</b><span>This viewer needs a browser with WebGL 2 enabled.</span>';$('export').disabled=true;toast('WebGL startup failed. Try a recent desktop browser.');}
$('transform').addEventListener('input',e=>{playing=false;state.transform=Number(e.target.value)/100;apply();});
$('play').onclick=()=>{if(!model)return;if(playing)playing=false;else{direction=state.transform>.5?-1:1;playing=true;}updateInfo();};
$('explode').oninput=e=>{state.explode=Number(e.target.value)/100;$('explode-value').textContent=e.target.value+'%';apply();};
$('tint').oninput=e=>{state.tint=Number(e.target.value)/100;$('tint-value').textContent=e.target.value+'%';apply();};
$('wireframe').onchange=e=>{state.wire=e.target.checked;model?.setWireframe(state.wire);};
$('lights').onchange=e=>{state.lights=e.target.checked;apply();};
for(const b of document.querySelectorAll('[data-palette]'))b.onclick=()=>{const p=palettes[Number(b.dataset.palette)];$('paint').value=p.body;$('accent').value=p.accent;$('paint-name').textContent=p.name;model?.setPaint(p.body,p.accent);for(const s of paletteBox.children){const selected=s===b;s.classList.toggle('selected',selected);s.setAttribute('aria-pressed',String(selected));}};
function customPaint(){model?.setPaint($('paint').value,$('accent').value);$('paint-name').textContent='Custom finish';for(const s of paletteBox.children){s.classList.remove('selected');s.setAttribute('aria-pressed','false');}}
$('paint').oninput=customPaint;$('accent').oninput=customPaint;
for(const b of document.querySelectorAll('[data-wheel]'))b.onclick=()=>{state.wheel=Number(b.dataset.wheel);clearSelection();model?.setWheelStyle(state.wheel);for(const s of document.querySelectorAll('[data-wheel]')){s.classList.toggle('chosen',s===b);s.setAttribute('aria-pressed',String(s===b));}apply();};
for(const input of document.querySelectorAll('[data-layer]'))input.onchange=()=>{state.layers[input.dataset.layer]=input.checked;apply();};
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{if(controls)view(b.dataset.view);};
$('reset-view').onclick=()=>{if(controls)view('default');};
$('orbit').onclick=()=>{state.orbit=!state.orbit;$('orbit').setAttribute('aria-pressed',String(state.orbit));};
$('clear-selection').onclick=clearSelection;
$('reset-all').onclick=()=>{playing=false;state.transform=0;state.explode=0;state.tint=.3;state.wheel=0;state.wire=false;state.lights=true;state.orbit=false;for(const k of Object.keys(state.layers))state.layers[k]=true;$('explode').value=0;$('explode-value').textContent='0%';$('tint').value=30;$('tint-value').textContent='30%';$('wireframe').checked=false;$('lights').checked=true;$('orbit').setAttribute('aria-pressed','false');for(const c of document.querySelectorAll('[data-layer]'))c.checked=true;document.querySelector('[data-palette="0"]').click();document.querySelector('[data-wheel="0"]').click();model?.setWireframe(false);clearSelection();apply();if(controls)view('default');toast('Original red coupe configuration restored.');};
$('export').onclick=async()=>{if(!model)return;const button=$('export');button.disabled=true;button.textContent='EXPORTING…';try{model.root.updateMatrixWorld(true);const wire=state.wire;if(wire)model.setWireframe(false);let buffer;try{buffer=await new GLTFExporter().parseAsync(model.root,{binary:true,onlyVisible:true});}finally{if(wire)model.setWireframe(true);}const url=URL.createObjectURL(new Blob([buffer],{type:'model/gltf-binary'})),a=document.createElement('a');a.href=url;a.download='SHIFT-C72-'+(state.transform>.5?'robot':'coupe')+'.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('GLB exported with the current pose, colours and visible layers.');}catch(error){console.error(error);toast('Export failed. Restore visible layers and try again.');}finally{button.disabled=false;button.innerHTML='EXPORT MODEL <span>↓ GLB</span>';}};
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;if(e.code==='Space'){e.preventDefault();$('play').click();}});
