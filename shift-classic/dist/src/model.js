import * as T from '../vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Q=(x=0,y=0,z=0)=>new T.Quaternion().setFromEuler(new T.Euler(x,y,z));
const smooth=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
export const palettes=[{name:'Oxide red',body:'#a7352c',accent:'#cc7640'},{name:'Midnight blue',body:'#142e4c',accent:'#83b4cd'},{name:'Ivory cream',body:'#e8dfc7',accent:'#b17949'},{name:'British green',body:'#24463b',accent:'#c4b27c'},{name:'Graphite',body:'#343b42',accent:'#c5c9ce'},{name:'Copper bronze',body:'#946043',accent:'#dfb77c'}];
export function createClassic(){
 const root=new T.Group();root.name='SHIFT_C72';const records=[],meshes=[],wheelGroups=[],frontFenders={1:[],'-1':[]};
 const paint=new T.MeshPhysicalMaterial({color:palettes[0].body,metalness:.58,roughness:.25,clearcoat:1,clearcoatRoughness:.15});
 const accent=new T.MeshStandardMaterial({color:palettes[0].accent,metalness:.8,roughness:.28});
 const chrome=new T.MeshStandardMaterial({color:'#dce0df',metalness:1,roughness:.18});
 const dark=new T.MeshStandardMaterial({color:'#15191b',metalness:.5,roughness:.45});
 const rubber=new T.MeshStandardMaterial({color:'#161719',roughness:.92});
 const leather=new T.MeshStandardMaterial({color:'#342d27',roughness:.72});
 const glass=new T.MeshPhysicalMaterial({color:'#a3b9bd',metalness:.05,roughness:.08,transparent:true,opacity:.32,side:T.DoubleSide,depthWrite:false});
 const lamp=new T.MeshStandardMaterial({color:'#fff6d8',roughness:.16,metalness:.2,emissive:'#fff0c0',emissiveIntensity:1.5});
 const rearLamp=new T.MeshStandardMaterial({color:'#ad100c',emissive:'#9b170f',emissiveIntensity:.5,roughness:.3});
 const sensor=new T.MeshStandardMaterial({color:'#83e3e8',emissive:'#39c9df',emissiveIntensity:1.3});
 let wheelStyle=0,wire=false;
 function add(group,geo,mat,name,layer='body',p=V(),rot=null){const m=new T.Mesh(geo,mat);m.name=name;m.userData={part:name,layer,assembly:group.name};m.position.copy(p);if(rot)m.rotation.copy(rot);m.castShadow=true;m.receiveShadow=true;group.add(m);meshes.push(m);return m;}
 function box(g,size,p,mat,name,layer='body',rot=null){return add(g,new T.BoxGeometry(...size),mat,name,layer,V(...p),rot);}
 function cyl(g,r,h,p,mat,name,layer='frame',segments=24,rotation=new T.Euler(Math.PI/2,0,0)){return add(g,new T.CylinderGeometry(r,r,h,segments),mat,name,layer,V(...p),rotation);}
 function sphere(g,r,p,mat,name,layer='frame'){return add(g,new T.SphereGeometry(r,16,12),mat,name,layer,V(...p));}
 function line(g,points,r,mat,name,layer='body'){const curve=new T.CatmullRomCurve3(points.map(p=>V(...p)));return add(g,new T.TubeGeometry(curve,Math.max(8,points.length*6),r,7,false),mat,name,layer);}
 function panel(g,pts,z,mat,name,layer='body',depth=.045){const s=new T.Shape();pts.forEach((p,i)=>i?s.lineTo(...p):s.moveTo(...p));s.closePath();const geo=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.012,bevelThickness:.008,bevelSegments:2,steps:1});return add(g,geo,mat,name,layer,V(0,0,z));}
 function sheet(g,points,mat,name,layer='glass'){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();return add(g,geo,mat,name,layer);}
 function assembly(name,car,robot,rotation=[0,0,0],stage=[0,1],explode=[0,0,0]){const g=new T.Group();g.name=name;root.add(g);records.push({g,car:V(...car),robot:V(...robot),a:Q(),b:Q(...rotation),stage,explode:V(...explode)});return g;}
 function bolt(g,p,name='Fastener',mat=chrome){return cyl(g,.025,.022,p,mat,name,'frame',8);}
 // Each assembly has a real car pose and a robot pose; all the same meshes are retained.
 const chassis=assembly('Chassis & powertrain',[0,0,0],[.15,2.15,0],[0,0,Math.PI/2],[0,.65],[.2,-.25,0]);
 box(chassis,[4.35,.16,1.25],[0,.38,0],dark,'Box-section chassis','frame');
 for(const z of [-.48,.48]){box(chassis,[4.1,.16,.13],[0,.27,z],accent,'Longitudinal frame rail','frame');for(let x=-1.8;x<=1.8;x+=.45)bolt(chassis,[x,.4,z]);}
 for(const x of [-1.6,1.65])cyl(chassis,.075,1.78,[x,.5,0],dark,'Axle shaft','frame');
 box(chassis,[.85,.42,.8],[-1.05,.69,0],dark,'Engine block / robot core','frame');
 for(let i=0;i<6;i++)box(chassis,[.055,.045,.73],[-1.38+i*.13,.92,0],chrome,'Valve cover rib','frame');
 line(chassis,[[-1.15,.35,.5],[.1,.25,.55],[1.9,.3,.55],[2.4,.38,.55]],.045,chrome,'Exhaust system','frame');
 const nose=assembly('Bonnet & front fascia',[-1.5,0,0],[-.18,3.12,0],[0,0,Math.PI/2],[.32,.88],[-1.3,.3,0]);
 // Local x values in the front module, centered at car x = -1.5.
 for(const side of [-1,1])for(const half of [0,1]){
  const x=half===0?-2.04:-1.09, y=half===0?1.075:1.12;
  const plate=assembly((side>0?'Left':'Right')+' bonnet '+(half===0?'front / chest':'rear / abdomen'),[x,y,side*.415],[-.58,half===0?3.35:2.55,side*(half===0?.43:.34)],[0,side*(half===0?.18:.3),Math.PI/2],[.32,.9],[-.8,.3,side*.3]);
  const points=[[-.47,-.018,-.405],[.47,.018,-.405],[.47,.018,.405],[-.47,-.018,.405]];
  const hood=sheet(plate,points,paint,'Bonnet articulated panel','body');hood.material.side=T.DoubleSide;
  line(plate,[[-.46,.008,side*.17],[0,.025,side*.1],[.46,.04,side*.06]],.008,paint,'Pressed bonnet crease');
 }
 for(const s of [-1,1]){
  const sh=new T.Shape();sh.moveTo(-1.05,1.05);sh.lineTo(.86,1.14);sh.lineTo(.86,.38);sh.lineTo(.44,.38);sh.lineTo(.44,.51);sh.absarc(-.1,.51,.54,0,Math.PI,false);sh.lineTo(-1.05,.38);sh.closePath();
  frontFenders[s].push(add(nose,new T.ExtrudeGeometry(sh,{depth:.05,bevelEnabled:true,bevelSize:.012,bevelThickness:.008,bevelSegments:2}),paint,'Front wheel arch','body',V(0,0,s*.94)));
  const trim=[];for(let a=0;a<=Math.PI+.01;a+=Math.PI/24)trim.push([-.1+Math.cos(a)*.545,.51+Math.sin(a)*.545,s*.997]);frontFenders[s].push(line(nose,trim,.014,chrome,'Front arch chrome lip'));
  box(nose,[.045,.16,.31],[-1.08,.88,s*.72],chrome,'Headlamp surround','lighting');
  for(const z of [s*.61,s*.82]){cyl(nose,.116,.035,[-1.115,.9,z],chrome,'Circular headlamp bezel','lighting',28,new T.Euler(0,0,Math.PI/2));cyl(nose,.095,.04,[-1.14,.9,z],lamp,'Round glass headlamp','lighting',28,new T.Euler(0,0,Math.PI/2));
   for(let k=-2;k<=2;k++)line(nose,[[-1.166,.9+k*.028,z-.07],[-1.166,.9+k*.028,z+.07]],.003,chrome,'Headlamp lens fluting','lighting');}
  box(nose,[.04,.09,.16],[-.86,.68,s*1.001],new T.MeshStandardMaterial({color:'#d59c42',emissive:'#8c430a',emissiveIntensity:.2}),'Amber corner marker','lighting');
 }
 box(nose,[.08,.38,.91],[-1.08,.86,0],dark,'Twin rectangular grille backing');
 box(nose,[.08,.045,.98],[-1.13,1.055,0],chrome,'Grille upper surround');box(nose,[.08,.035,.98],[-1.13,.66,0],chrome,'Grille lower surround');
 for(const z of [-.49,0,.49])box(nose,[.08,.4,.026],[-1.13,.86,z],chrome,'Grille divider');
 for(let y=.71;y<1.03;y+=.045)box(nose,[.025,.012,.92],[-1.18,y,0],chrome,'Horizontal grille bar');
 for(let z=-.44;z<=.44;z+=.088)box(nose,[.025,.31,.009],[-1.18,.86,z],dark,'Grille vertical rib');
 box(nose,[.15,.14,2.05],[-1.16,.51,0],chrome,'Chrome front bumper');box(nose,[.16,.035,2.08],[-1.17,.535,0],rubber,'Bumper rubber strip');
 box(nose,[.018,.12,.4],[-1.254,.47,0],dark,'Front number plate');
 const cabin=assembly('Glasshouse & cabin',[0,0,0],[1.7,2.5,0],[0,0,Math.PI/2],[.24,.82],[1.2,.6,0]);
 const roofGeo=new T.BoxGeometry(1.35,.075,1.49,3,1,3);add(cabin,roofGeo,paint,'Classic coupe roof','body',V(.3,1.89,0));
 sheet(cabin,[[-.77,1.19,-.82],[-.37,1.86,-.73],[-.37,1.86,.73],[-.77,1.19,.82]],glass,'Panoramic front windscreen');
 sheet(cabin,[[.99,1.86,-.72],[1.62,1.19,-.81],[1.62,1.19,.81],[.99,1.86,.72]],glass,'Sloped rear windscreen');
 for(const s of [-1,1]){
  sheet(cabin,[[-.69,1.2,s*.87],[-.33,1.82,s*.77],[.77,1.82,s*.77],[1.04,1.2,s*.87]],glass,'Main side window');
  sheet(cabin,[[.83,1.82,s*.77],[.98,1.82,s*.77],[1.57,1.2,s*.87],[1.1,1.2,s*.87]],glass,'Rear quarter glass');
  for(const points of [ [[-.77,1.18,s*.88],[-.36,1.88,s*.76],[.98,1.88,s*.76],[1.62,1.18,s*.88]], [[-.77,1.18,s*.88],[1.62,1.18,s*.88]], [[.8,1.83,s*.78],[1.08,1.2,s*.88]] ])line(cabin,points,.023,chrome,'Polished window surround');
  box(cabin,[.48,.09,.54],[.1,.62,s*.4],leather,'Front seat cushion','cabin');box(cabin,[.16,.57,.54],[.32,.99,s*.4],leather,'Front seat back','cabin',new T.Euler(0,0,-.12));box(cabin,[.16,.18,.29],[.35,1.34,s*.4],leather,'Seat head restraint','cabin');
  for(let k=-2;k<=2;k++)line(cabin,[[.224,.8+k*.075,s*.4-.23],[.224,.8+k*.075,s*.4+.23]],.006,dark,'Seat upholstery seam','cabin');
 }
 box(cabin,[.6,.42,1.16],[1.0,.8,0],leather,'Rear bench','cabin');
 box(cabin,[.22,.22,1.45],[-.56,1.08,0],dark,'Dashboard','cabin');
 const steering=add(cabin,new T.TorusGeometry(.18,.025,8,32),dark,'Steering wheel','cabin',V(-.3,1.21,.39),new T.Euler(0,Math.PI/2,0));
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3;line(cabin,[[-.3,1.21,.39],[-.3,1.21+Math.cos(a)*.16,.39+Math.sin(a)*.16]],.015,chrome,'Steering spoke','cabin');}
 for(const s of [-1,1]){
  const arm=assembly(s===1?'Left door / forearm':'Right door / forearm',[.2,0,s*.96],[.65,2.1,s*1.34],[s*.08,0,Math.PI/2],[.16,.82],[0,.1,s*1.65]);
  panel(arm,[[-.83,1.13],[.88,1.14],[.88,.4],[-.83,.4]],s>0?0:-.04,paint,'Two-door outer skin');
  line(arm,[[-.84,1.045,s*.047],[.87,1.05,s*.047]],.014,chrome,'Door belt-line trim');
  box(arm,[.2,.045,.025],[.58,1.075,s*.071],chrome,'Chrome door handle');
  box(arm,[1.72,.045,.035],[.02,.45,s*.07],chrome,'Lower sill trim');
  box(arm,[.22,.12,.12],[-.68,1.25,s*.12],chrome,'Side mirror');
  sphere(arm,.12,[.03,.7,-s*.12],accent,'Elbow bearing');
  box(arm,[.29,.43,.26],[.02,.48,-s*.15],dark,'Forearm actuator','frame');
  for(let i=0;i<4;i++)box(arm,[.08,.17,.055],[-.105+i*.07,.23,-s*.14],chrome,'Articulated knuckle','frame');
  const shoulder=assembly(s===1?'Left wheel / shoulder':'Right wheel / shoulder',[-1.6,.51,s*1.01],[0,3.05,s*1.30],[0,0,-Math.PI/2],[.12,.7],[.05,.35,s*1.9]);
  for(const m of frontFenders[s]){nose.remove(m);shoulder.add(m);m.position.add(V(.1,-.51,-s*1.01));m.userData.assembly=shoulder.name;}
  makeWheel(shoulder,s);sphere(shoulder,.16,[0,0,-s*.25],accent,'Shoulder joint');
  const leg=assembly(s===1?'Left rear module / shin':'Right rear module / shin',[1.65,0,s*.94],[.5,.9,s*.62],[0,0,Math.PI/2],[.12,.76],[.2,-.1,s*1.0]);
  const sh=new T.Shape();sh.moveTo(-.54,1.13);sh.lineTo(.9,1.03);sh.lineTo(.9,.4);sh.lineTo(.54,.4);sh.lineTo(.54,.51);sh.absarc(0,.51,.54,0,Math.PI,false);sh.lineTo(-.54,1.13);sh.closePath();
  add(leg,new T.ExtrudeGeometry(sh,{depth:.05,bevelEnabled:true,bevelSize:.012,bevelThickness:.008,bevelSegments:2}),paint,'Rear quarter panel','body',V(0,0,s>0?0:-.05));
  const rearWheel=new T.Group();rearWheel.name=leg.name;rearWheel.position.set(0,.51,s*.07);leg.add(rearWheel);makeWheel(rearWheel,s);
  const arch=[];for(let a=0;a<=Math.PI+.01;a+=Math.PI/24)arch.push([Math.cos(a)*.545,.51+Math.sin(a)*.545,s*.06]);line(leg,arch,.014,chrome,'Rear arch chrome lip');
  sheet(leg,[[-.48,1.13,0],[.87,1.04,0],[.87,1.04,-s*.92],[-.48,1.13,-s*.92]],paint,'Split rear deck');
  box(leg,[.075,.24,.72],[.89,.83,-s*.46],paint,'Rear fascia');box(leg,[.08,.12,.55],[.94,.85,-s*.46],rearLamp,'Rear tail lamp','lighting');
  const thigh=assembly(s===1?'Left linkage / thigh':'Right linkage / thigh',[.4,.45,s*.5],[.14,1.54,s*.62],[0,0,Math.PI/2],[.05,.7],[.2,-.1,s*.65]);
  box(thigh,[1.0,.19,.2],[0,0,0],accent,'Suspension link / thigh rail','frame');
  cyl(thigh,.14,.3,[-.48,0,0],dark,'Hip pivot','frame');cyl(thigh,.13,.29,[.48,0,0],chrome,'Knee bearing','frame');
  line(thigh,[[-.4,.13,.08],[.3,.13,.08]],.045,chrome,'Hydraulic piston rod','frame');
  const foot=assembly(s===1?'Left bumper / foot':'Right bumper / foot',[2.56,.5,s*.5],[-.24,.17,s*.63],[0,0,0],[.22,.82],[.6,-.1,s*.8]);
  box(foot,[.15,.15,.96],[0,0,0],chrome,'Split rear bumper');box(foot,[.7,.15,.45],[-.18,-.06,0],dark,'Undertray / foot pad','frame');
  for(let i=0;i<5;i++)box(foot,[.04,.025,.4],[-.42+i*.1,.03,0],rubber,'Foot traction rib','frame');
 }
 const head=assembly('Sensor block / head',[-.6,.8,0],[-.13,4.16,0],[0,0,0],[.6,1],[0,1.1,0]);
 box(head,[.40,.40,.48],[0,0,0],dark,'Compact mechanical head','frame');
 box(head,[.1,.14,.44],[-.24,.035,0],chrome,'Sensor bezel','frame');box(head,[.025,.075,.34],[-.3,.04,0],sensor,'Optical sensor strip','lighting');
 for(const s of [-1,1])cyl(head,.10,.04,[0,0,s*.26],accent,'Head pivot cap','frame');
 function makeWheel(g,s){const container=new T.Group();container.name=g.name;g.add(container);wheelGroups.push({container,s});buildWheel(container,s);}
 function buildWheel(g,s){
  // Cylinder axes rotate to Z. Everything uses actual mesh geometry, including the tread.
  const tor=add(g,new T.TorusGeometry(.365,.128,12,40),rubber,'Rubber tire','wheels');tor.scale.z=.95;
  for(let i=0;i<40;i++){const a=i*Math.PI*2/40;box(g,[.045,.035,.20],[Math.cos(a)*.487,Math.sin(a)*.487,0],rubber,'Tire tread block','wheels',new T.Euler(0,0,a+Math.PI/2));}
  cyl(g,.29,.23,[0,0,0],dark,'Brake drum','wheels',32);
  const rim=add(g,new T.TorusGeometry(.285,.027,8,40),chrome,'Polished rim lip','wheels',V(0,0,s*.12));
  if(wheelStyle===0){cyl(g,.249,.035,[0,0,s*.1],dark,'Classic steel wheel','wheels',32);cyl(g,.16,.05,[0,0,s*.15],chrome,'Domed chrome hubcap','wheels',32);
   for(let i=0;i<8;i++){const a=i*Math.PI/4;box(g,[.055,.021,.018],[Math.cos(a)*.212,Math.sin(a)*.212,s*.132],chrome,'Steel wheel slot','wheels',new T.Euler(0,0,a));}}
  else if(wheelStyle===1){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;box(g,[.21,.055,.045],[Math.cos(a)*.14,Math.sin(a)*.14,s*.14],chrome,'Five-spoke alloy','wheels',new T.Euler(0,0,a));}cyl(g,.075,.055,[0,0,s*.15],accent,'Alloy center cap','wheels',20);}
  else {for(let i=0;i<14;i++){const a=i*Math.PI*2/14;box(g,[.18,.033,.04],[Math.cos(a)*.16,Math.sin(a)*.16,s*.14],chrome,'Turbine fin','wheels',new T.Euler(0,0,a+.25));}cyl(g,.105,.06,[0,0,s*.16],dark,'Turbine center cap','wheels',24);}
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;cyl(g,.017,.03,[Math.cos(a)*.105,Math.sin(a)*.105,s*.19],chrome,'Wheel lug nut','wheels',6);}
 }
 function pose(t=0,explode=0){for(const r of records){const p=smooth((t-r.stage[0])/(r.stage[1]-r.stage[0]));r.g.position.lerpVectors(r.car,r.robot,p).addScaledVector(r.explode,explode);r.g.quaternion.slerpQuaternions(r.a,r.b,p);}root.updateMatrixWorld(true);}
 function setWheelStyle(n){wheelStyle=n;for(const {container,s} of wheelGroups){const old=[];container.traverse(o=>{if(o.isMesh){old.push(o);o.geometry.dispose();}});for(const o of old){const i=meshes.indexOf(o);if(i>=0)meshes.splice(i,1);}container.clear();buildWheel(container,s);}setWireframe(wire);}
 function setWireframe(on){wire=on;const mats=new Set();for(const m of meshes)mats.add(m.material);for(const m of mats){m.wireframe=on;m.needsUpdate=true;}}
 function setLayer(name,on){for(const m of meshes)if(m.userData.layer===name)m.visible=on;}
 function setPaint(body,trim){paint.color.set(body);if(trim)accent.color.set(trim);}
 function setTint(value){glass.opacity=.16+value*.76;glass.color.set(value>.55?'#17252c':'#a3b9bd');}
 function setLights(on){lamp.emissiveIntensity=on?2.4:0;rearLamp.emissiveIntensity=on?.8:0;sensor.emissiveIntensity=on?1.8:.15;}
 pose(0);return {root,records,meshes,materials:{paint,accent,chrome,glass,rubber},pose,setWheelStyle,setWireframe,setLayer,setPaint,setTint,setLights,get wheelStyle(){return wheelStyle;}};
}
