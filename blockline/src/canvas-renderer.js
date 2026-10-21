import * as THREE from '../vendor/three.module.js';

const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
const faceNormal = new THREE.Vector3(), center = new THREE.Vector3(), eye = new THREE.Vector3();
const instance = new THREE.Matrix4(), matrix = new THREE.Matrix4(), mvp = new THREE.Matrix4();
const baseColor = new THREE.Color(), lightColor = new THREE.Color();
const LIGHT = new THREE.Vector3(-.5, 1, .45).normalize();

/**
 * A small painter's renderer for browsers that cannot create a WebGL context.
 * It consumes the same Three.js scene and instance transforms, rather than a second city model.
 * Opaque flat polygons only: no texture sampling, shadow maps or perspective-correct clipping.
 */
export class CanvasRenderer {
  constructor() {
    this.domElement = document.createElement('canvas');
    this.context = this.domElement.getContext('2d', { alpha: false });
    this.shadowMap = {}; this.info = { render: { calls: 0, triangles: 0 } };
    this.outputColorSpace = null; this.toneMapping = null; this.toneMappingExposure = 1;
    this.isCompatibilityRenderer = true; this.cache = new Map(); this.pixelRatio = 1;
    this.lastPaint = -Infinity; this.width=1;this.height=1;
  }
  setPixelRatio(value) { this.pixelRatio = Math.min(value,1.25); }
  setSize(width,height) {
    this.width=width;this.height=height;
    this.domElement.width=Math.round(width*this.pixelRatio);this.domElement.height=Math.round(height*this.pixelRatio);
    this.context.setTransform(this.pixelRatio,0,0,this.pixelRatio,0,0);this.lastPaint=-Infinity;
  }
  setAnimationLoop(callback) {
    const animate=now=>{if(this.stopped)return;callback(now);this.animationFrame=requestAnimationFrame(animate);};
    this.animationFrame=requestAnimationFrame(animate);
  }
  dispose(){this.stopped=true;cancelAnimationFrame(this.animationFrame);this.cache.clear();}

  objectFaces(object) {
    const geometry=object.geometry;
    const key=`${object.id}:${object.instanceMatrix?.version??0}:${object.instanceColor?.version??0}:${object.material.emissiveIntensity??0}:${object.matrixWorld.elements.join(',')}`;
    const old=this.cache.get(object.id);
    if(old?.key===key)return old.faces;
    const faces=[],position=geometry.attributes.position,index=geometry.index;
    const material=Array.isArray(object.material)?object.material[0]:object.material;
    const append=(points,color,emissive)=>{
      v0.fromArray(points[0]);v1.fromArray(points[1]);v2.fromArray(points[2]);
      faceNormal.copy(v1).sub(v0).cross(v2.sub(v0)).normalize();
      if(faceNormal.lengthSq()<.5)return;
      center.set(0,0,0);for(const point of points)center.add(v0.fromArray(point));center.multiplyScalar(1/points.length);
      faces.push({points,color:[color.r,color.g,color.b],normal:faceNormal.toArray(),center:center.toArray(),emissive,wire:material.wireframe});
    };
    const count=object.isInstancedMesh?object.count:1;
    for(let i=0;i<count;i++){
      matrix.copy(object.matrixWorld);
      if(object.isInstancedMesh){object.getMatrixAt(i,instance);matrix.multiply(instance);}
      baseColor.copy(material.color);
      if(object.isInstancedMesh&&object.instanceColor){object.getColorAt(i,lightColor);baseColor.multiply(lightColor);}
      const emissive=!!material.emissive&&material.emissive.getHex()!==0?material.emissiveIntensity:0;
      if(geometry.type==='BoxGeometry'){
        const {width:w,height:h,depth:d}=geometry.parameters;
        const corners=[[-w/2,-h/2,-d/2],[w/2,-h/2,-d/2],[w/2,h/2,-d/2],[-w/2,h/2,-d/2],[-w/2,-h/2,d/2],[w/2,-h/2,d/2],[w/2,h/2,d/2],[-w/2,h/2,d/2]].map(p=>v0.fromArray(p).applyMatrix4(matrix).toArray());
        const sides=[[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]];
        // Thin window boxes need only their broad faces in compatibility mode.
        const sx=new THREE.Vector3().setFromMatrixScale(matrix);
        sides.forEach((side,n)=>{
          const sizes=[w*sx.x,h*sx.y,d*sx.z];
          if(Math.min(...sizes)<.09){const axis=sizes.indexOf(Math.min(...sizes));if((axis===0&&![2,3].includes(n))||(axis===1&&![4,5].includes(n))||(axis===2&&![0,1].includes(n)))return;}
          append(side.map(j=>corners[j]),baseColor,emissive);
        });
      }else{
        const length=index?index.count:position.count;
        for(let t=0;t<length;t+=3){
          const points=[];
          for(let j=0;j<3;j++){v0.fromBufferAttribute(position,index?index.getX(t+j):t+j).applyMatrix4(matrix);points.push(v0.toArray());}
          append(points,baseColor,emissive);
        }
      }
    }
    this.cache.set(object.id,{key,faces});return faces;
  }

  render(scene,camera,force=false) {
    const now=performance.now();
    if(!force&&now-this.lastPaint<100)return;
    this.lastPaint=now;
    scene.updateMatrixWorld();camera.updateMatrixWorld();
    mvp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
    const ctx=this.context,w=this.width,h=this.height;
    ctx.fillStyle=scene.background.getStyle();ctx.fillRect(0,0,w,h);
    const draw=[],used=new Set();
    scene.traverse(object=>{
      if(!object.isMesh||!object.visible)return;
      used.add(object.id);
      const source=this.objectFaces(object);
      for(const face of source){
        eye.copy(camera.position).sub(v0.fromArray(face.center));faceNormal.fromArray(face.normal);
        if(faceNormal.dot(eye)<=0)continue;
        const projected=[];let behind=false,minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
        for(const point of face.points){
          v0.fromArray(point).applyMatrix4(mvp);
          if(v0.z>1||v0.z< -1){behind=true;break;}
          const x=(v0.x*.5+.5)*w,y=(-v0.y*.5+.5)*h;
          projected.push([x,y]);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
        }
        if(behind||maxX<0||minX>w||maxY<0||minY>h||(maxX-minX)*(maxY-minY)<.25)continue;
        const depth=v0.fromArray(face.center).applyMatrix4(camera.matrixWorldInverse).z;
        const night=scene.background.r<.1;
        const brightness=(night?.30:.67)+Math.max(0,faceNormal.dot(LIGHT))*(night?.28:.38);
        baseColor.setRGB(face.color[0]*brightness,face.color[1]*brightness,face.color[2]*brightness);
        if(face.emissive>0)baseColor.lerp(lightColor.set('#efbc69'),Math.min(.72,face.emissive*.38));
        const maxHeight=Math.max(...face.points.map(p=>p[1]));
        draw.push({points:projected,depth,fill:baseColor.getStyle(),wire:object.material.wireframe,ground:maxHeight<=.7,height:face.center[1]});
      }
    });
    for(const id of this.cache.keys())if(!used.has(id))this.cache.delete(id);
    // Ground surfaces span many blocks. Drawing them before the vertical city prevents
    // a plate's average depth from hiding distant buildings in the painter's algorithm.
    draw.sort((a,b)=>a.ground!==b.ground?(a.ground?-1:1):a.ground?(a.height-b.height||a.depth-b.depth):a.depth-b.depth);
    ctx.lineJoin='round';ctx.lineWidth=.5;
    for(const face of draw){
      ctx.beginPath();ctx.moveTo(face.points[0][0],face.points[0][1]);
      for(let p=1;p<face.points.length;p++)ctx.lineTo(face.points[p][0],face.points[p][1]);
      ctx.closePath();
      if(face.wire){ctx.strokeStyle=face.fill;ctx.stroke();}else{ctx.fillStyle=face.fill;ctx.fill();}
    }
    // The parcel outline remains readable over all faces, matching the primary renderer.
    scene.traverse(object=>{
      if(!object.isLineSegments||!object.visible)return;
      const pos=object.geometry.attributes.position;
      const ix=object.geometry.index;ctx.strokeStyle='#a94f32';ctx.lineWidth=1.1;ctx.beginPath();
      for(let i=0;i<(ix?ix.count:pos.count);i+=2){
        v0.fromBufferAttribute(pos,ix?ix.getX(i):i).applyMatrix4(object.matrixWorld).applyMatrix4(mvp);
        v1.fromBufferAttribute(pos,ix?ix.getX(i+1):i+1).applyMatrix4(object.matrixWorld).applyMatrix4(mvp);
        ctx.moveTo((v0.x*.5+.5)*w,(-v0.y*.5+.5)*h);ctx.lineTo((v1.x*.5+.5)*w,(-v1.y*.5+.5)*h);
      }ctx.stroke();
    });
    this.info.render.calls=draw.length;this.info.render.triangles=draw.length*2;
  }
}
