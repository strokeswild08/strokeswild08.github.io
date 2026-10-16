import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {createClassic,palettes} from '../dist/src/model.js';
import {GLTFExporter} from '../dist/vendor/exporters/GLTFExporter.js';
import fs from 'node:fs';
// FileReader compatibility for Node-only GLB export validation, not a browser substitute.
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result='data:application/octet-stream;base64,'+Buffer.from(b).toString('base64');this.onloadend?.();});}};
const m=createClassic();let checks=0;const ok=(x,n)=>{assert.ok(x,n);checks++;};
ok(m.meshes.length>400,'detailed mesh assemblies present');
ok(m.records.length>=12,'independently articulated assemblies');
const count=m.meshes.length;
for(const mode of [0,.15,.35,.5,.75,1]){m.pose(mode,0);let floor=Infinity;const bounds=new T.Box3().setFromObject(m.root);ok(Number.isFinite(bounds.max.y)&&bounds.getSize(new T.Vector3()).length()<15,'finite bounded pose');for(const mesh of m.meshes){const p=mesh.getWorldPosition(new T.Vector3());ok(Number.isFinite(p.x+p.y+p.z),'finite mesh transform');}if(mode===0){const size=bounds.getSize(new T.Vector3());ok(size.x>4.5&&size.x<6,'coupe length');ok(size.y<2.2,'low classic roofline');console.log('Coupe bounds',size.toArray());}if(mode===1){ok(bounds.max.y>4,'robot stands upright');console.log('Robot bounds',bounds.getSize(new T.Vector3()).toArray());}}
ok(m.meshes.length===count,'same geometry retained through transformation');
for(let cycle=0;cycle<3;cycle++)for(let style=0;style<3;style++){m.setWheelStyle(style);ok(m.wheelStyle===style,'wheel selection');ok(m.meshes.every(x=>x.geometry.getAttribute('position')),'valid geometry after wheel rebuild');}
m.setLayer('wheels',false);ok(m.meshes.filter(x=>x.userData.layer==='wheels').every(x=>!x.visible),'wheel layer hides');m.setLayer('wheels',true);
m.setPaint('#234567','#c08340');ok(m.materials.paint.color.getHexString()==='234567','custom paint');ok(m.materials.accent.color.getHexString()==='c08340','accent independent');
m.setTint(.9);ok(m.materials.glass.opacity>.8,'dark tint');m.setTint(0);ok(m.materials.glass.opacity<.2,'clear glass');
m.setWireframe(true);ok(m.materials.paint.wireframe&&m.materials.rubber.wireframe,'wireframe all layers');m.setWireframe(false);
m.pose(1,1);const exploded=new T.Box3().setFromObject(m.root);m.pose(1,0);ok(exploded.getSize(new T.Vector3()).length()>new T.Box3().setFromObject(m.root).getSize(new T.Vector3()).length(),'exploded view separates assemblies');
for(const preset of palettes){m.setPaint(preset.body,preset.accent);ok(m.materials.paint.color.getHexString()===preset.body.slice(1),'preset paint');}
m.setPaint(palettes[0].body,palettes[0].accent);m.setTint(.3);m.setWheelStyle(0);m.pose(0);
const car=await new GLTFExporter().parseAsync(m.root,{binary:true,onlyVisible:true});
ok(new DataView(car).getUint32(0,true)===0x46546c67,'valid GLB magic');ok(car.byteLength>100000,'real mesh data exported');fs.writeFileSync(new URL('../dist/C72-coupe.glb',import.meta.url),Buffer.from(car));
m.pose(1);const robot=await new GLTFExporter().parseAsync(m.root,{binary:true,onlyVisible:true});ok(new DataView(robot).getUint32(0,true)===0x46546c67,'robot GLB export');fs.writeFileSync(new URL('../dist/C72-robot.glb',import.meta.url),Buffer.from(robot));
console.log('Parts',m.meshes.length,'assemblies',m.records.length,'car GLB',car.byteLength,'robot GLB',robot.byteLength);console.log('PASS',checks,'checks');
