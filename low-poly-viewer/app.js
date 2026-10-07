import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { SVGRenderer } from './vendor/SVGRenderer.js';
import { createOutpost, createRobot } from './models.js?v=2';
import { inspectModel, normalizeModel, validateFile, validateGlb, disposeModel } from './viewer-utils.js';

const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map(element => [element.id, element]));
const viewport = ui.viewport;
const state = { model: null, mixer: null, clips: [], action: null, loading: false, token: 0, basic: false, name: 'Woodland outpost' };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let renderer, camera, scene, controls, floor, grid, keyLight, fillLight, hemisphere;

function status(message, isError = false) {
  ui.status.textContent = message + (state.basic && !isError ? ' Basic preview: textures, skinning and shadows need WebGL.' : '');
  ui.status.classList.toggle('error', isError);
}

function setLoading(loading, message = 'Opening your model…') {
  state.loading = loading;
  ui.loading.textContent = message;
  ui.loading.hidden = !loading;
  ui['export-png'].disabled = loading;
  viewport.setAttribute('aria-busy', String(loading));
}

function init() {
  try {
    if (!document.createElement('canvas').getContext('webgl2')) throw new Error('WebGL unavailable');
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
  } catch {
    renderer = new SVGRenderer();
    renderer.setPrecision(2);
    state.basic = true;
    ui['view-label'].textContent = 'BASIC 3D PREVIEW';
  }
  if (!state.basic) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
  }
  renderer.domElement.setAttribute('aria-label', 'Rendered 3D model');
  renderer.domElement.setAttribute('role', 'img');
  viewport.append(renderer.domElement);
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#b8c9bc');
  camera = new THREE.PerspectiveCamera(36, 1, .05, 100);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !reducedMotion.matches;
  controls.dampingFactor = .075;
  controls.minDistance = 3;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI * .49;
  controls.autoRotateSpeed = .9;
  // Keyboard orbit is handled below, keeping pan on right-drag / two-finger drag.
  hemisphere = new THREE.HemisphereLight('#e9f3e6', '#737965', 2.6);
  scene.add(hemisphere);
  if (state.basic) scene.add(new THREE.AmbientLight('#929f91'));
  keyLight = new THREE.DirectionalLight('#fff4da', state.basic ? .9 : 3.2);
  keyLight.position.set(-6,10,7);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048,2048);
  Object.assign(keyLight.shadow.camera, { left: -8, right: 8, top: 10, bottom: -8, near: .5, far: 35 });
  keyLight.shadow.bias = -.0004;
  keyLight.shadow.normalBias = .04;
  scene.add(keyLight);
  fillLight = new THREE.DirectionalLight('#c9e8e4', state.basic ? .28 : 1.2);
  fillLight.position.set(6,5,-5);
  scene.add(fillLight);
  floor = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.MeshStandardMaterial({ color: '#b8c9bc', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.04;
  floor.receiveShadow = true;
  if (!state.basic) scene.add(floor);
  grid = new THREE.GridHelper(14, 28, '#7a927e', '#91a893');
  grid.position.y = -.029;
  grid.material.transparent = true;
  grid.material.opacity = .32;
  grid.visible = false;
  scene.add(grid);
  new ResizeObserver(resize).observe(viewport);
  window.addEventListener('resize', resize);
  reducedMotion.addEventListener('change', () => { controls.enableDamping = !reducedMotion.matches; });
  bindEvents();
  resize();
  showDemo('outpost');
  setLoading(false);
  let previous = performance.now();
  const frame = time => {
    const delta = Math.min((time - previous) / 1000, .05);
    previous = time;
    if (state.basic) requestAnimationFrame(frame);
    if (document.hidden) return;
    controls.autoRotate = ui.spin.checked && !state.loading;
    controls.update(delta);
    if (state.mixer && ui.animate.checked) state.mixer.update(delta);
    renderer.render(scene,camera);
  };
  if (state.basic) requestAnimationFrame(frame);
  else renderer.setAnimationLoop(frame);
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    status('The graphics context was interrupted. Reload the page to restore the preview.', true);
    ui['export-png'].disabled = true;
  });
}

function resize() {
  const width = viewport.clientWidth, height = viewport.clientHeight;
  if (!width || !height) return;
  renderer.setSize(width,height,false);
  camera.aspect = width/height;
  camera.updateProjectionMatrix();
}

function resetView() {
  const bounds = new THREE.Box3().setFromObject(state.model);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const targetY = center.y * .86;
  controls.target.set(0,targetY,0);
  // Fit landscape models on narrow displays as well as tall characters.
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov/2) * Math.max(camera.aspect,.35));
  const distance = Math.max(size.y / (2*Math.tan(verticalFov/2)), Math.max(size.x,size.z) / (2*Math.tan(horizontalFov/2))) * 1.5;
  const direction = new THREE.Vector3(1,.78,1.25).normalize();
  camera.position.copy(controls.target).addScaledVector(direction, Math.max(distance, 9));
  controls.maxDistance = Math.max(30,distance*2.2);
  controls.update();
  controls.saveState();
}

function applyWireframe() {
  state.model?.traverse(node => {
    if (!node.isMesh) return;
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (!('facetOriginalWireframe' in material.userData)) material.userData.facetOriginalWireframe = material.wireframe;
      material.wireframe = ui.wireframe.checked || material.userData.facetOriginalWireframe;
    }
  });
}

function replaceModel(root, name, clips = [], kind = 'BUILT-IN DEMO') {
  const next = normalizeModel(root);
  if (state.mixer) { state.mixer.stopAllAction(); state.mixer.uncacheRoot(state.mixer.getRoot()); }
  if (state.model) { scene.remove(state.model); disposeModel(state.model); }
  state.model = next;
  state.name = name;
  state.clips = clips;
  state.action = null;
  state.mixer = clips.length ? new THREE.AnimationMixer(root) : null;
  next.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
  scene.add(next);
  const stats = inspectModel(root);
  ui['model-name'].textContent = name;
  ui['model-kind'].textContent = kind;
  ui.triangles.textContent = stats.triangles.toLocaleString();
  ui.meshes.textContent = stats.meshes.toLocaleString();
  ui.animations.textContent = String(clips.length);
  ui['animation-controls'].hidden = !clips.length;
  ui.clip.replaceChildren(...clips.map((clip,index) => new Option(clip.name || `Clip ${index+1}`, String(index))));
  ui.animate.checked = true;
  if (clips.length) playClip(0);
  applyWireframe();
  resetView();
}

function playClip(index) {
  state.action?.stop();
  if (!state.mixer || !state.clips[index]) return;
  state.action = state.mixer.clipAction(state.clips[index]);
  state.action.reset().play();
}

function showDemo(id) {
  state.token++; // Supersede any local import that is still decoding.
  setLoading(false);
  const root = id === 'robot' ? createRobot() : createOutpost();
  replaceModel(root,root.name);
  document.querySelectorAll('.demo').forEach(button => {
    const active = button.dataset.demo === id;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  });
  status(`${root.name} is ready. Drag to orbit or try another light.`);
}

async function openFile(file) {
  if (!file) return;
  const token = ++state.token;
  setLoading(true);
  let loaded;
  try {
    validateFile(file);
    const bytes = await file.arrayBuffer();
    if (token !== state.token) return;
    validateGlb(bytes);
    const manager = new THREE.LoadingManager();
    manager.setURLModifier(url => {
      if (url.startsWith('blob:') || url.startsWith('data:')) return url;
      throw new Error('External resources are not supported. Embed textures in the GLB.');
    });
    loaded = await new GLTFLoader(manager).parseAsync(bytes,'');
    if (token !== state.token) { disposeModel(loaded.scene); return; }
    if (state.basic) {
      if (inspectModel(loaded.scene).triangles > 12000) throw new Error('Basic preview supports up to 12,000 triangles. Use a WebGL browser for larger models.');
      loaded.scene.traverse(node => { if (node.isSkinnedMesh || node.isInstancedMesh) throw new Error('This model needs WebGL for skinning or instancing. Try a browser with hardware acceleration.'); });
    }
    replaceModel(loaded.scene,file.name.replace(/\.glb$/i,''),loaded.animations,'LOCAL MODEL');
    document.querySelectorAll('.demo').forEach(button => { button.classList.remove('active'); button.setAttribute('aria-pressed','false'); });
    status(`${file.name} opened locally. Your file has not left this browser.`);
  } catch (error) {
    if (loaded && state.model?.children[0] !== loaded.scene) disposeModel(loaded.scene);
    if (token === state.token) status(error.message?.startsWith('THREE.') ? 'The model could not be opened. Re-export an uncompressed GLB with embedded textures.' : error.message || 'The model could not be opened.', true);
  } finally {
    if (token === state.token) setLoading(false);
    ui['model-file'].value = '';
  }
}

function setLighting(preset) {
  const lights = {
    studio: { sky:'#e9f3e6',ground:'#737965',key:'#fff4da',fill:'#c9e8e4',ambient:2.6,intensity:3.2,exposure:1.22,position:[-6,10,7] },
    warm: { sky:'#ffe9b8',ground:'#6f6656',key:'#ffb35e',fill:'#bdcdd7',ambient:1.8,intensity:4.6,exposure:1.2,position:[-8,5,5] },
    night: { sky:'#8599c9',ground:'#394c54',key:'#a7c7ff',fill:'#b1e1cd',ambient:1.2,intensity:3.1,exposure:1.0,position:[-4,9,-4] }
  };
  const light = lights[preset];
  hemisphere.color.set(light.sky); hemisphere.groundColor.set(light.ground); hemisphere.intensity = light.ambient;
  keyLight.color.set(light.key); keyLight.intensity = state.basic ? light.intensity * .28 : light.intensity; keyLight.position.set(...light.position);
  fillLight.color.set(light.fill); renderer.toneMappingExposure = light.exposure;
  status(`${ui.lighting.selectedOptions[0].textContent} light applied.`);
}

function zoom(factor) {
  const direction = camera.position.clone().sub(controls.target);
  direction.setLength(THREE.MathUtils.clamp(direction.length()*factor,controls.minDistance,controls.maxDistance));
  camera.position.copy(controls.target).add(direction);
  controls.update();
}

async function savePreview() {
  // Render explicitly so export reflects controls changed in this same frame.
  renderer.render(scene,camera);
  let canvas = renderer.domElement;
  if (state.basic) {
    canvas = document.createElement('canvas');
    canvas.width = viewport.clientWidth * Math.min(devicePixelRatio,2);
    canvas.height = viewport.clientHeight * Math.min(devicePixelRatio,2);
    const context = canvas.getContext('2d');
    context.fillStyle = '#' + scene.background.getHexString();
    context.fillRect(0,0,canvas.width,canvas.height);
    const svg = new XMLSerializer().serializeToString(renderer.domElement);
    const source = URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
    try {
      const image = new Image();
      await new Promise((resolve,reject) => { image.onload = resolve; image.onerror = reject; image.src = source; });
      context.drawImage(image,0,0,canvas.width,canvas.height);
    } catch { return status('Could not create the preview. Please try again.',true); }
    finally { URL.revokeObjectURL(source); }
  }
  canvas.toBlob(blob => {
    if (!blob) return status('Could not create the preview. Please try again.',true);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `facet-${state.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,60)}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url),10000);
    status('Preview saved as a PNG at the current viewport resolution.');
  },'image/png');
}

function bindEvents() {
  document.querySelectorAll('.demo').forEach(button => button.addEventListener('click',() => showDemo(button.dataset.demo)));
  ui['model-file'].addEventListener('change',() => openFile(ui['model-file'].files[0]));
  ui.wireframe.addEventListener('change',applyWireframe);
  ui.grid.addEventListener('change',() => { grid.visible = ui.grid.checked; });
  ui.lighting.addEventListener('change',() => setLighting(ui.lighting.value));
  ui.clip.addEventListener('change',() => playClip(Number(ui.clip.value)));
  ui['reset-view'].addEventListener('click',() => { resetView(); status('Camera reset.'); });
  ui['zoom-in'].addEventListener('click',() => zoom(.86));
  ui['zoom-out'].addEventListener('click',() => zoom(1.16));
  ui['export-png'].addEventListener('click',savePreview);
  document.querySelectorAll('.swatch').forEach(button => button.addEventListener('click',() => {
    const color = button.dataset.color;
    scene.background.set(color); floor.material.color.set(color);
    viewport.classList.toggle('dark-backdrop',color === '#242c35');
    document.querySelectorAll('.swatch').forEach(swatch => { const active = swatch === button; swatch.classList.toggle('selected',active); swatch.setAttribute('aria-pressed',String(active)); });
  }));
  let dragDepth = 0;
  viewport.addEventListener('dragenter',event => { event.preventDefault(); dragDepth++; viewport.classList.add('dragging'); });
  viewport.addEventListener('dragover',event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; });
  viewport.addEventListener('dragleave',() => { dragDepth = Math.max(0,dragDepth-1); if (!dragDepth) viewport.classList.remove('dragging'); });
  viewport.addEventListener('drop',event => { event.preventDefault(); dragDepth = 0; viewport.classList.remove('dragging'); if (event.dataTransfer.files.length !== 1) return status('Drop one .glb file at a time.',true); openFile(event.dataTransfer.files[0]); });
  // Avoid navigating away when a model is accidentally dropped outside the viewport.
  window.addEventListener('dragover',event => { if ([...event.dataTransfer.types].includes('Files')) event.preventDefault(); });
  window.addEventListener('drop',event => { if (event.dataTransfer.files.length) event.preventDefault(); });
  viewport.addEventListener('keydown',event => {
    if (event.target !== viewport && event.target !== renderer.domElement) return;
    if (event.key.toLowerCase() === 'r') { event.preventDefault(); resetView(); return; }
    if (['+','=','-','_'].includes(event.key)) { event.preventDefault(); zoom(['-','_'].includes(event.key) ? 1.12 : .89); return; }
    if (!event.key.startsWith('Arrow')) return;
    event.preventDefault();
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    if (event.key === 'ArrowLeft') spherical.theta -= .12;
    if (event.key === 'ArrowRight') spherical.theta += .12;
    if (event.key === 'ArrowUp') spherical.phi -= .10;
    if (event.key === 'ArrowDown') spherical.phi += .10;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi,.08,controls.maxPolarAngle);
    camera.position.copy(controls.target).add(offset.setFromSpherical(spherical));
    controls.update();
  });
  renderer.domElement.addEventListener('pointerdown',() => viewport.focus({preventScroll:true}));
}

init();
