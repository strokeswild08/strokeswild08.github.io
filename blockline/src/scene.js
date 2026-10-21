import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { Traffic } from './traffic.js';
import { randomStream } from './random.js';
import { CanvasRenderer } from './canvas-renderer.js';

const ZONES = { oldtown: '#c07855', downtown: '#638e89', midtown: '#c2ac66' };
const CAR_COLORS = ['#bd684c', '#e5d6b6', '#587b73', '#d4ac58', '#52676c', '#d8bdae'];

/** One geometry per detail class, instanced across the city. No per-frame allocations. */
class Batch {
  constructor(geometry, material) { this.geometry = geometry; this.material = material; this.items = []; }
  add(x, y, z, w, h, d, color, rotation = 0) {
    this.items.push({ x, y, z, w, h, d, color, rotation });
  }
  build(group, shadow = true) {
    if (!this.items.length) return null;
    const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.items.length);
    const transform = new THREE.Object3D(), color = new THREE.Color();
    this.items.forEach((item, index) => {
      transform.position.set(item.x, item.y, item.z);
      transform.rotation.set(0, item.rotation, 0);
      transform.scale.set(item.w, item.h, item.d);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      mesh.setColorAt(index, color.set(item.color));
    });
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    mesh.computeBoundingSphere(); group.add(mesh);
    return mesh;
  }
}

function gableGeometry() {
  // A unit-width triangular prism. Flat normals give the roof two readable planes.
  const points = [
    [-.5, 0, -.5], [.5, 0, -.5], [0, 1, -.5],
    [-.5, 0, .5], [0, 1, .5], [.5, 0, .5],
    [-.5, 0, -.5], [0, 1, -.5], [0, 1, .5], [-.5, 0, .5],
    [.5, 0, -.5], [.5, 0, .5], [0, 1, .5], [0, 1, -.5],
    [-.5, 0, -.5], [-.5, 0, .5], [.5, 0, .5], [.5, 0, -.5],
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  geometry.setIndex([0,1,2,3,4,5,6,7,8,6,8,9,10,11,12,10,12,13,14,15,16,14,16,17]);
  geometry.computeVertexNormals(); return geometry;
}

export class CityScene {
  constructor(container, callbacks = {}) {
    this.container = container; this.callbacks = callbacks;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#ebe9df');
    this.scene.fog = new THREE.Fog('#ebe9df', 420, 850);
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.5, 1200);
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    } catch {
      this.renderer = new CanvasRenderer();
    }
    this.isCompatibilityRenderer = !!this.renderer.isCompatibilityRenderer;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.28;
    this.renderer.domElement.setAttribute('aria-label', 'Interactive 3D city. Drag to orbit, scroll to zoom, click a building to inspect it.');
    this.renderer.domElement.tabIndex = 0;
    container.append(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 35; this.controls.maxDistance = 560;
    this.controls.maxPolarAngle = Math.PI * 0.485;
    this.controls.autoRotateSpeed = 0.4;
    this.controls.addEventListener('start', () => { this.controls.autoRotate = false; callbacks.onOrbitStop?.(); });
    this.ambient = new THREE.HemisphereLight('#fff9df', '#829385', 2.5);
    this.sun = new THREE.DirectionalLight('#fff0d3', 3.4);
    this.sun.position.set(-95, 170, 85);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -180, right: 180, top: 180, bottom: -180, near: 1, far: 550 });
    this.sun.shadow.bias = -0.00025; this.sun.shadow.normalBias = 0.25;
    this.scene.add(this.ambient, this.sun, this.sun.target);
    this.world = null; this.time = 0; this.sunHour = 15; this.moving = true; this.wireframe = false;
    this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2();
    this.transform = new THREE.Object3D(); this.color = new THREE.Color();
    this.frameCount = 0; this.lastFPS = performance.now(); this.fps = 0;
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container);
    let down = null;
    container.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
    container.addEventListener('pointerup', e => {
      if (e.target !== this.renderer.domElement || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.bodies ? this.raycaster.intersectObject(this.bodies)[0] : null;
      this.select(hit ? this.city.buildings[hit.instanceId] : null);
    });
    this.resize(); this.home(true);
    this.lastFrame = performance.now();
    this.renderer.setAnimationLoop(now => this.frame(now));
  }

  resize() {
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
  }

  home(immediate = false) {
    const size = this.city ? Math.max(this.city.bounds.maxX * 2, this.city.bounds.maxZ * 2) : 200;
    const narrow = Math.max(1, 1.3 / this.camera.aspect);
    const position = new THREE.Vector3(size * 1.05 * narrow, size * 0.92 * narrow, size * 1.1 * narrow);
    this.controls.target.set(0, 3, 0);
    this.camera.position.copy(position); this.controls.update(); this.plan = false;
  }

  setPlan(value) {
    this.plan = value; this.controls.autoRotate = false;
    if (!value) { this.home(); return; }
    const bounds = this.city.bounds;
    const halfSpan = Math.max(bounds.maxZ + 8, (bounds.maxX + 8) / this.camera.aspect) * 1.27;
    this.camera.position.set(0, halfSpan / Math.tan(THREE.MathUtils.degToRad(18)), 0.01);
    this.controls.target.set(0, 0, 0); this.controls.update();
  }

  setCity(city) {
    const wasPlan = this.plan;
    this.clearWorld(); this.city = city;
    this.world = new THREE.Group(); this.scene.add(this.world);
    const matte = new THREE.MeshStandardMaterial({ roughness: .88, metalness: 0 });
    const windows = new THREE.MeshStandardMaterial({ roughness: .37, metalness: .15, emissive: '#ffc66a', emissiveIntensity: 0 });
    const waterMat = new THREE.MeshStandardMaterial({ color: '#7dafa6', roughness: .3, metalness: .18 });
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    this.materials = { matte, windows, waterMat };
    const solid = new Batch(geometry, matte), body = new Batch(geometry, matte), glass = new Batch(geometry, windows);
    const roofs = new Batch(gableGeometry(), matte);
    const trunks = new Batch(new THREE.CylinderGeometry(.18, .25, 1, 5), matte);
    const canopies = new Batch(new THREE.IcosahedronGeometry(1, 0), matte);
    const cone = new Batch(new THREE.ConeGeometry(1, 1, 6), matte);
    const cylinders = new Batch(new THREE.CylinderGeometry(1, 1, 1, 20), matte);
    const b = city.bounds, spanX = b.maxX - b.minX, spanZ = b.maxZ - b.minZ;
    solid.add(0, -2.5, 0, spanX + 7, 3.5, spanZ + 7, '#7d8071');
    solid.add(0, -.56, 0, spanX + 6.5, .5, spanZ + 6.5, '#c6bfa8');
    solid.add(0, -.2, 0, spanX + 6, .28, spanZ + 6, '#d5cfb9');
    const water = new THREE.Mesh(new THREE.BoxGeometry(18.7, .26, spanZ + 6), waterMat);
    water.position.y = -.04; water.receiveShadow = true; this.world.add(water);
    for (const x of [-10.1, 10.1]) {
      solid.add(x, .2, 0, 1.2, .8, spanZ + 6, '#c4b99e');
      solid.add(x * 1.25, .15, 0, 3.3, .32, spanZ, '#e8dfc7');
      solid.add(x * 1.02, .64, 0, .28, .12, spanZ + 5, '#efdfbc');
    }

    for (const block of city.blocks) {
      const x = (block.x0 + block.x1) / 2, z = (block.z0 + block.z1) / 2;
      const width = block.x1 - block.x0 - 4.2, depth = block.z1 - block.z0 - 4.2;
      solid.add(x, .19, z, width, .3, depth, block.kind === 'park' ? '#aab68a' : '#e6ddc4');
      if (block.kind !== 'park') continue;
      solid.add(x, .39, z, width - .5, .1, 1.25, '#e0d2ad');
      solid.add(x, .39, z, 1.25, .1, depth - .5, '#e0d2ad');
      if (block.civic) {
        cylinders.add(x, .48, z, 3.8, .25, 3.8, '#bdad8c');
        cylinders.add(x, .67, z, 3.2, .2, 3.2, '#78aaa1');
        cylinders.add(x, 1.1, z, .6, 1, .6, '#e6d8b9');
        cylinders.add(x, 1.65, z, 1.6, .28, 1.6, '#d6c9aa');
        cylinders.add(x, 1.84, z, 1.4, .12, 1.4, '#88b7ac');
      } else {
        solid.add(x - 2.5, .56, z - 2.4, 3.8, .4, 3.8, '#d0c39e');
        solid.add(x - 2.5, .81, z - 2.4, 3.1, .14, 3.1, '#94a57c');
      }
      for (const sign of [-1, 1]) {
        solid.add(x + sign * 3.5, .85, z + 3.5, 2.8, .3, .8, '#9c7755');
        solid.add(x + sign * 3.5, 1.3, z + 3.85, 2.8, .8, .15, '#9c7755');
      }
    }

    for (const edge of city.roads.edges) {
      const a = city.roads.nodes[edge.a], c = city.roads.nodes[edge.b];
      const x = (a.x + c.x) / 2, z = (a.z + c.z) / 2;
      const horizontal = a.z === c.z;
      solid.add(x, edge.bridge ? .26 : .045, z, horizontal ? edge.length + .1 : 4.25, edge.bridge ? .4 : .1, horizontal ? 4.25 : edge.length + .1, '#8f9388');
      if (edge.bridge) for (const sign of [-1, 1]) {
        solid.add(x, .52, z + sign * 2.7, edge.length, .3, 1.1, '#d8d1b9');
        solid.add(x, 1.5, z + sign * 3.18, edge.length, .16, .12, '#818d7d');
        for (let bx = -15; bx < 17; bx += 4) solid.add(bx, 1, z + sign * 3.18, .15, 1, .15, '#818d7d');
      }
      for (let distance = 4; distance < edge.length - 3; distance += 5.5) {
        const cx = a.x + (c.x - a.x) * distance / edge.length, cz = a.z + (c.z - a.z) * distance / edge.length;
        solid.add(cx, edge.bridge ? .485 : .108, cz, horizontal ? 1.9 : .1, .015, horizontal ? .1 : 1.9, '#dfd6b8');
      }
    }
    for (const node of city.roads.nodes) {
      solid.add(node.x, .075, node.z, 4.35, .1, 4.35, '#8f9388');
      // Two striped crossings per intersection, in the road arms.
      for (let i = -1; i <= 1; i++) for (const sign of [-1, 1]) {
        solid.add(node.x + i * .76, .139, node.z + sign * 3, .45, .018, 1.25, '#ddd7bf');
      }
      const x = node.x + 2.9, z = node.z + 2.9;
      trunks.add(x, 1.75, z, 1, 3.2, 1, '#77816d');
      solid.add(x - .4, 3.4, z, 1, .15, .3, '#647363');
      glass.add(x - .65, 3.3, z, .5, .12, .3, '#e9d9a6');
    }

    for (const building of city.buildings) {
      const { x, z, width: w, depth: d, height: h, floors, style, color, roof } = building;
      const base = .39;
      body.add(x, base + h / 2, z, w, h, d, color);
      solid.add(x, base + .4, z, w + .16, .65, d + .16, '#b7ae97');
      if (style === 'gable') {
        roofs.add(x, base + h, z, w + .65, w * .32, d + .65, roof);
        solid.add(x + w * .25, base + h + .75, z - d * .2, .55, 2.4, .7, '#b29072');
      } else {
        solid.add(x, base + h + .16, z, w + .32, .32, d + .32, '#ded9c4');
        solid.add(x, base + h + .35, z, w - .55, .1, d - .55, '#7f8c7e');
        if (style === 'tower') {
          solid.add(x, base + h + 1.2, z, w * .55, 1.7, d * .55, '#b4c3b5');
          solid.add(x, base + h + 2.1, z, w * .6, .16, d * .6, '#e0d8be');
          if (building.detail > .55) trunks.add(x, base + h + 4.2, z, .7, 4.2, .7, '#809185');
          // Facade mullions and floor ledges distinguish towers from flat extrusions.
          for (let level = 2; level < floors; level += 3) solid.add(x, base + level * 2.45, z, w + .13, .16, d + .13, '#d7d4bd');
        } else {
          solid.add(x - w * .2, base + h + .8, z, w * .3, .8, d * .35, '#a8aa97');
          if (building.detail > .65) {
            solid.add(x + w * .17, base + h + .63, z - d * .15, w * .28, .4, d * .35, '#4b6b70', -.12);
          }
        }
      }
      const windowColor = style === 'tower' ? '#507e78' : '#5b7167';
      const nx = Math.max(2, Math.floor(w / 2.5)), nz = Math.max(2, Math.floor(d / 2.6));
      for (let floor = 0; floor < floors; floor++) {
        const y = base + floor * 2.45 + 1.45;
        for (let column = 0; column < nx; column++) for (const sign of [-1, 1]) {
          const wx = x - w / 2 + (column + .5) * w / nx;
          glass.add(wx, y, z + sign * (d / 2 + .025), style === 'tower' ? 1.2 : .85, 1.05, .05, windowColor);
        }
        for (let column = 0; column < nz; column++) for (const sign of [-1, 1]) {
          const wz = z - d / 2 + (column + .5) * d / nz;
          glass.add(x + sign * (w / 2 + .025), y, wz, .05, 1.05, style === 'tower' ? 1.2 : .85, windowColor);
        }
      }
      solid.add(x, base + .78, z + d / 2 + .04, .85, 1.55, .07, '#4f645a');
      if (building.detail > .3 && style !== 'tower') {
        solid.add(x, base + 2, z + d / 2 + .5, w * .72, .14, 1.1, building.detail > .6 ? '#b37553' : '#6e9180');
      }
    }
    for (const tree of city.trees) {
      const { x, z, scale: s, variant } = tree;
      trunks.add(x, .45 + 1.2 * s, z, s, 2.4 * s, s, '#8a7756');
      if (variant === 2) {
        cone.add(x, .4 + 3.6 * s, z, 1.7 * s, 5 * s, 1.7 * s, '#618b72');
        cone.add(x, .4 + 4.5 * s, z, 1.2 * s, 3.8 * s, 1.2 * s, '#79997a');
      } else {
        canopies.add(x, .4 + 3.6 * s, z, 1.8 * s, 2.15 * s, 1.7 * s, variant === 1 ? '#7c9d7b' : '#9aac7c');
        canopies.add(x + .7 * s, .4 + 3.25 * s, z + .25 * s, 1.3 * s, 1.5 * s, 1.2 * s, '#8fa77b');
      }
    }
    // Gentle parallel water strokes are geometry, never a downloaded texture.
    const rng = randomStream(`${city.config.seed}:ripples`);
    for (let i = 0; i < 85; i++) solid.add(rng.range(-8.5, 8.5), .104, rng.range(b.minZ, b.maxZ), .06, .012, rng.range(.8, 3), '#a7c9bb');
    this.bodies = body.build(this.world);
    solid.build(this.world); roofs.build(this.world); trunks.build(this.world); canopies.build(this.world); cone.build(this.world); cylinders.build(this.world);
    glass.build(this.world, false);
    this.makeTraffic(); this.makeBoats();
    const outlineGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    this.selection = new THREE.LineSegments(outlineGeometry, new THREE.LineBasicMaterial({ color: '#bb5638', depthTest: false }));
    this.selection.renderOrder = 10; this.selection.visible = false; this.world.add(this.selection);
    this.setSun(this.sunHour); this.setZoning(this.zoning); this.setWireframe(this.wireframe);
    this.callbacks.onSelect?.(null);
    if (wasPlan) this.setPlan(true); else this.home();
  }

  makeTraffic() {
    this.traffic = new Traffic(this.city, Math.min(84, this.city.blocks.length * 2));
    const bodies = new Batch(new THREE.BoxGeometry(1,1,1), this.materials.matte);
    const cabins = new Batch(new THREE.BoxGeometry(1,1,1), this.materials.matte);
    for (const car of this.traffic.cars) {
      bodies.add(0, 0, 0, 1, .6, 2.15, CAR_COLORS[car.color]);
      cabins.add(0, 0, 0, .84, .48, 1.05, '#b9c9b8');
    }
    this.carBodies = bodies.build(this.world); this.carCabins = cabins.build(this.world);
    // Instance positions move every frame; the initial origin-only sphere is not valid.
    this.carBodies.frustumCulled = false; this.carCabins.frustumCulled = false;
  }

  makeBoats() {
    this.boats = [];
    for (let i = 0; i < 3; i++) {
      const group = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2, .65, 6), this.materials.matte);
      hull.material = this.materials.matte.clone(); hull.material.color.set(i === 1 ? '#b37755' : '#ede0bd');
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.45, .8, 2.1), this.materials.matte.clone());
      cabin.material.color.set('#e1d9ba'); cabin.position.set(0, .6, .7); group.add(hull, cabin);
      const load = new THREE.Mesh(new THREE.BoxGeometry(1.45, .7, 2.2), this.materials.matte.clone());
      load.material.color.set(i === 1 ? '#7d9885' : '#b27958'); load.position.set(0,.6,-1.4); group.add(load);
      group.position.set((i % 2 ? -1 : 1) * 3.8, .35, -50 + i * 48);
      const channels = [this.city.bounds.minZ, ...this.city.roads.bridges, this.city.bounds.maxZ];
      this.world.add(group);
      this.boats.push({ group, phase: i / 3, minZ: channels[i] + 6, maxZ: channels[i + 1] - 6 });
    }
  }

  setSun(hour) {
    this.sunHour = Number(hour);
    const night = hour < 6 || hour > 19;
    const dusk = !night && (hour < 8 || hour > 17);
    const angle = (hour - 6) / 12 * Math.PI;
    this.sun.position.set(Math.cos(angle) * -160, night ? 100 : Math.max(25, Math.sin(angle) * 180), 80);
    this.sun.intensity = night ? .5 : dusk ? 2.3 : 3.4;
    this.sun.color.set(night ? '#9ebacf' : dusk ? '#ffc48b' : '#fff0d3');
    this.ambient.intensity = night ? .7 : dusk ? 1.7 : 2.5;
    this.ambient.color.set(night ? '#99b2c7' : '#fff9df');
    this.scene.background.set(night ? '#233b44' : dusk ? '#ddd5c3' : '#ebe9df');
    this.scene.fog.color.copy(this.scene.background);
    this.renderer.toneMappingExposure = night ? 1.15 : 1.28;
    if (this.materials) this.materials.windows.emissiveIntensity = night ? 1.8 : dusk ? .5 : 0;
  }

  setZoning(value = false) {
    this.zoning = value;
    if (!this.bodies) return;
    this.city.buildings.forEach((building, i) => this.bodies.setColorAt(i, this.color.set(value ? ZONES[building.district] : building.color)));
    this.bodies.instanceColor.needsUpdate = true;
  }

  setWireframe(value) {
    this.wireframe = value;
    if (this.materials) this.materials.matte.wireframe = value;
  }

  select(building) {
    this.selection.visible = !!building;
    if (building) {
      const roofHeight = building.style === 'gable' ? building.width * .32 : building.style === 'tower' ? 2.2 : .6;
      this.selection.position.set(building.x, .4 + (building.height + roofHeight) / 2, building.z);
      this.selection.scale.set(building.width + .7, building.height + roofHeight + .2, building.depth + .7);
    }
    this.callbacks.onSelect?.(building);
  }

  frame(now) {
    const dt = Math.min((now - this.lastFrame) / 1000, .1); this.lastFrame = now;
    if (this.moving) this.time += dt;
    if (this.traffic) {
      const cars = this.traffic.update(this.moving ? dt : 0);
      for (const car of cars) {
        const bridge = this.city.roads.edges.find(e => e.bridge && ((e.a === car.from && e.b === car.to) || (e.b === car.from && e.a === car.to)));
        const elevation = bridge ? .42 : .1;
        this.transform.position.set(car.x, elevation + .4, car.z); this.transform.rotation.set(0, car.heading, 0);
        this.transform.scale.set(1, .6, 2.15); this.transform.updateMatrix(); this.carBodies.setMatrixAt(car.id, this.transform.matrix);
        this.transform.position.y = elevation + .9; this.transform.scale.set(.84, .48, 1.05);
        this.transform.updateMatrix(); this.carCabins.setMatrixAt(car.id, this.transform.matrix);
      }
      this.carBodies.instanceMatrix.needsUpdate = true; this.carCabins.instanceMatrix.needsUpdate = true;
      for (const boat of this.boats) {
        // Shuttle within a river section, leaving each low bridge clear.
        const cycle = (this.time * .025 + boat.phase) % 2;
        const progress = cycle < 1 ? cycle : 2 - cycle;
        boat.group.position.z = boat.minZ + progress * (boat.maxZ - boat.minZ);
        boat.group.rotation.y = cycle < 1 ? 0 : Math.PI;
      }
    }
    this.controls.update(); this.renderer.render(this.scene, this.camera);
    this.frameCount++;
    if (now - this.lastFPS > 1100) {
      this.fps = Math.round(this.frameCount * 1000 / (now - this.lastFPS));
      this.frameCount = 0; this.lastFPS = now;
      this.callbacks.onMetrics?.({ fps: this.isCompatibilityRenderer ? Math.min(10,this.fps) : this.fps, calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, compatibility: this.isCompatibilityRenderer });
      this.callbacks.onCamera?.(this.camera.position);
    }
  }

  snapshot() {
    this.renderer.render(this.scene, this.camera, true);
    return new Promise((resolve, reject) => {
      this.renderer.domElement.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed.')), 'image/png');
    });
  }

  clearWorld() {
    if (!this.world) return;
    this.scene.remove(this.world);
    const geometries = new Set(), materials = new Set();
    this.world.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) for (const material of [object.material].flat()) materials.add(material);
      if (object.isInstancedMesh) object.dispose();
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }
}
