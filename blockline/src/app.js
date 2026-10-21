import { generateCity, normalizeConfig, PRESETS, DEFAULT_CONFIG, serializeCity, configFromDocument } from './generator.js';
import { CityScene } from './scene.js';

const $ = (id) => document.getElementById(id);
const rangeNames = ['size', 'density', 'height', 'greenery'];
const DISTRICT_NAMES = { oldtown: 'Old town', downtown: 'East bank', midtown: 'Midtown' };
let city, scene, generation = 0, toastTimeout, generatorSource;
let codeTab = 'generator';

function toast(message) {
  $('toast').textContent = message; $('toast').classList.add('visible');
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('toast').classList.remove('visible'), 3400);
}

function paintRange(input) {
  input.style.setProperty('--fill', `${(Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
}

function updateLabels() {
  for (const key of rangeNames) {
    const value = Number($(key).value); paintRange($(key));
    $(`${key}-value`).textContent = key === 'size' ? `${value * (value >= 7 ? 4 : 3) * 2} blocks` : `${value}%`;
  }
}

function applyInputs(config) {
  $('seed').value = config.seed;
  for (const key of rangeNames) $(key).value = config[key];
  updateLabels();
}

function readInputs() {
  const config = { seed: $('seed').value };
  for (const key of rangeNames) config[key] = Number($(key).value);
  return normalizeConfig(config);
}

function presetName(config) {
  return Object.keys(PRESETS).find(key => JSON.stringify(PRESETS[key]) === JSON.stringify(config)) || null;
}

function markPreset(name) {
  document.querySelectorAll('[data-preset]').forEach(button => {
    const active = button.dataset.preset === name;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  });
}

function writeURL(config) {
  const url = new URL(location.href);
  url.search = '';
  for (const [key, value] of Object.entries(config)) url.searchParams.set(key, value);
  history.replaceState({}, '', url);
  return url.href;
}

function configFromURL() {
  const query = new URLSearchParams(location.search), config = {};
  if (query.has('seed')) config.seed = query.get('seed');
  for (const key of rangeNames) if (query.has(key)) config[key] = Number(query.get(key));
  return normalizeConfig(config);
}

function drawMap() {
  const canvas = $('minimap'), ctx = canvas.getContext('2d');
  const { minX, maxX, minZ, maxZ } = city.bounds;
  const scale = Math.min((canvas.width - 12) / (maxX - minX), (canvas.height - 12) / (maxZ - minZ));
  const x = value => canvas.width / 2 + value * scale;
  const y = value => canvas.height / 2 + value * scale;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#e5e3d3'; ctx.fillRect(x(minX), y(minZ), (maxX-minX)*scale, (maxZ-minZ)*scale);
  ctx.fillStyle = '#9fbeb0'; ctx.fillRect(x(-9), y(minZ), 18*scale, (maxZ-minZ)*scale);
  for (const block of city.blocks) {
    ctx.fillStyle = block.kind === 'park' ? '#a4b58a' : '#cbd0b6';
    ctx.fillRect(x(block.x0+2.4),y(block.z0+2.4),(block.x1-block.x0-4.8)*scale,(block.z1-block.z0-4.8)*scale);
  }
  ctx.strokeStyle = '#e0d7bd'; ctx.lineWidth = 3*scale;
  for (const bridge of city.roads.bridges) { ctx.beginPath();ctx.moveTo(x(-17),y(bridge));ctx.lineTo(x(17),y(bridge));ctx.stroke(); }
  for (const building of city.buildings) {
    ctx.fillStyle = building.district === 'oldtown' ? '#b88769' : '#809c89';
    ctx.fillRect(x(building.x-building.width/2),y(building.z-building.depth/2),building.width*scale,building.depth*scale);
  }
}

function inspect(building) {
  $('inspector').hidden = !building;
  if (!building) return;
  $('inspect-title').textContent = `${DISTRICT_NAMES[building.district]} / ${String(city.buildings.indexOf(building)+1).padStart(3, '0')}`;
  $('inspect-use').textContent = building.use;
  $('inspect-height').textContent = `${building.height.toFixed(1)} m`;
  $('inspect-floors').textContent = String(building.floors);
  $('inspect-area').textContent = `${Math.round(building.width * building.depth)} m²`;
}

function setView(plan) {
  scene.setPlan(plan);
  $('plan-view').classList.toggle('active', plan); $('orbit-view').classList.toggle('active', !plan);
  $('plan-view').setAttribute('aria-pressed', String(plan)); $('orbit-view').setAttribute('aria-pressed', String(!plan));
  $('rotate').setAttribute('aria-pressed', 'false');
}

function build(config, updateURL = true) {
  const start = performance.now();
  city = generateCity(config);
  const layoutTime = performance.now() - start;
  scene.setCity(city); generation++;
  $('loading').hidden = true;
  $('generate').disabled = false;
  $('edition').textContent = `PLAN / ${String(generation).padStart(2,'0')}`;
  const name = presetName(city.config); markPreset(name);
  const titles = { riverfront: 'The riverfront study', downtown: 'A skyline in the making', garden: 'The greener side of town' };
  const descriptions = { riverfront: 'Old-town rooftops. A modern east bank. Room to wander.', downtown: 'Denser blocks, taller neighbors, the same river running through.', garden: 'Lower rooftops, generous parks and a little more breathing room.' };
  $('city-title').replaceChildren(document.createTextNode(titles[name] || 'Your corner of the world'), Object.assign(document.createElement('span'), { textContent: '.' }));
  $('city-description').textContent = descriptions[name] || 'A different starting point. A new set of streets to follow.';
  for (const key of ['buildings','parks','trees','tallest']) $(`stat-${key}`).textContent = city.stats[key];
  $('map-seed').textContent = city.config.seed;
  $('fingerprint').textContent = city.fingerprint.toUpperCase();
  $('build-time').textContent = `Plan built in ${Math.max(.1,layoutTime).toFixed(1)} ms`;
  $('status').textContent = `${city.stats.blocks} blocks · ${city.roads.bridges.length} crossings · Seed ${city.config.seed}`;
  $('pending-note').textContent = 'Same seed. Same settings. Same city.';
  $('pending-note').classList.remove('pending');
  drawMap();
  if (updateURL) writeURL(city.config);
  if ($('code-dialog').open) renderCode();
}

function generateFromInputs() {
  try {
    const config = readInputs();
    $('generate').disabled = true;
    // Paint the button before the synchronous, bounded mesh construction begins.
    requestAnimationFrame(() => { try { build(config); } catch (error) { $('generate').disabled = false; toast(error.message); } });
  } catch (error) { toast(error.message); $('seed').focus(); }
}

function download(blobOrURL, filename) {
  const isBlob = blobOrURL instanceof Blob;
  const url = isBlob ? URL.createObjectURL(blobOrURL) : blobOrURL;
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  if (isBlob) setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function safeFilename(seed) { return seed.replace(/[^a-z0-9_-]+/gi,'-').slice(0,40) || 'city'; }

async function renderCode() {
  document.querySelectorAll('[data-code]').forEach(button => button.classList.toggle('active', button.dataset.code === codeTab));
  if (codeTab === 'plan') {
    $('code-content').textContent = JSON.stringify({ version:city.version, fingerprint:city.fingerprint, config:city.config, stats:city.stats, sampleParcel:city.buildings[0], sampleRoad:city.roads.edges[0] }, null, 2);
    $('code-file').textContent = `${city.config.seed} / live generated data`;
    return;
  }
  $('code-file').textContent = 'src/generator.js / actual source';
  if (!generatorSource) {
    $('code-content').textContent = 'Opening the generation core…';
    try {
      const response = await fetch(new URL('./generator.js', import.meta.url));
      if (!response.ok) throw new Error('Source request failed.');
      generatorSource = await response.text();
    } catch { $('code-content').textContent = 'Open the complete source with the GitHub link below.'; return; }
  }
  if (codeTab === 'generator') $('code-content').textContent = generatorSource.slice(generatorSource.indexOf('/** Pure data first:'));
}

try {
  scene = new CityScene($('viewport'), {
    onSelect: inspect,
    onMetrics: metrics => { $('metrics').textContent = metrics.compatibility ? 'COMPATIBILITY / 3D' : `${metrics.fps} FPS / ${metrics.calls} DRAWS`; },
    onOrbitStop: () => { $('rotate').setAttribute('aria-pressed', 'false'); },
  });
  let initial;
  try { initial = configFromURL(); } catch { initial = DEFAULT_CONFIG; toast('That link had invalid settings. The riverfront plan is open.'); }
  applyInputs(initial); build(initial, false);

  $('city-form').addEventListener('submit', event => { event.preventDefault(); generateFromInputs(); });
  for (const key of [...rangeNames,'seed']) $(key).addEventListener('input', () => {
    updateLabels(); markPreset(null);
    $('pending-note').textContent = 'Changes ready. Generate to apply.'; $('pending-note').classList.add('pending');
  });
  $('shuffle').addEventListener('click', () => {
    const value = new Uint32Array(1); crypto.getRandomValues(value);
    $('seed').value = `CITY-${value[0].toString(36).toUpperCase()}`; generateFromInputs();
  });
  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
    applyInputs(PRESETS[button.dataset.preset]); generateFromInputs();
  }));
  $('sun').addEventListener('input', event => {
    const value = Number(event.target.value); paintRange(event.target);
    scene.setSun(value); $('sun-value').textContent = `${String(value).padStart(2,'0')}:00`;
    $('sun-icon').textContent = value < 6 || value > 19 ? '☾' : '☀';
    document.body.classList.toggle('is-night', value < 6 || value > 19);
  });
  paintRange($('sun'));
  $('plan-view').addEventListener('click', () => setView(true));
  $('orbit-view').addEventListener('click', () => setView(false));
  $('home').addEventListener('click', () => setView(false));
  $('rotate').addEventListener('click', () => {
    if (scene.plan) setView(false);
    scene.controls.autoRotate = !scene.controls.autoRotate;
    $('rotate').setAttribute('aria-pressed', String(scene.controls.autoRotate));
  });
  $('wireframe').addEventListener('click', () => {
    scene.setWireframe(!scene.wireframe); $('wireframe').setAttribute('aria-pressed', String(scene.wireframe));
  });
  $('zoning').addEventListener('click', () => {
    scene.setZoning(!scene.zoning); $('zoning').setAttribute('aria-pressed', String(scene.zoning));
  });
  $('traffic').addEventListener('click', () => {
    scene.moving = !scene.moving;
    $('traffic').setAttribute('aria-pressed', String(!scene.moving));
    $('traffic').setAttribute('aria-label', scene.moving ? 'Pause traffic' : 'Resume traffic');
    $('traffic').title = scene.moving ? 'Pause traffic' : 'Resume traffic';
    $('traffic-icon').setAttribute('d', scene.moving ? 'M5 3v10M11 3v10' : 'm4 2 9 6-9 6Z');
  });
  $('close-inspector').addEventListener('click', () => scene.select(null));
  $('snapshot').addEventListener('click', async () => {
    try { download(await scene.snapshot(), `blockline-${safeFilename(city.config.seed)}.png`); toast('City view saved as PNG.'); }
    catch { toast('The image could not be saved. Try again after the scene finishes drawing.'); }
  });
  $('export').addEventListener('click', () => {
    download(new Blob([serializeCity(city)], { type:'application/json' }), `blockline-${safeFilename(city.config.seed)}.json`);
    toast('City plan saved. It includes settings, streets and every parcel.');
  });
  $('load').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      if (file.size > 5*1024*1024) throw new Error('Choose a city JSON smaller than 5 MB.');
      const config = configFromDocument(JSON.parse(await file.text()));
      applyInputs(config); build(config); toast('City settings imported and plan rebuilt.');
    } catch (error) { toast(`Import failed: ${error instanceof SyntaxError ? 'This file is not valid JSON.' : error.message}`); }
    event.target.value = '';
  });
  $('share').addEventListener('click', async () => {
    const url = writeURL(city.config);
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url); toast('City link copied. The same plan opens for everyone.');
    } catch { toast('Your city link is in the address bar. Copy it to share this plan.'); }
  });
  $('code-toggle').addEventListener('click', () => { $('code-dialog').showModal(); renderCode(); });
  $('close-code').addEventListener('click', () => $('code-dialog').close());
  $('code-dialog').addEventListener('click', event => { if (event.target === $('code-dialog')) {
    const rect = $('code-dialog').getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('code-dialog').close();
  }});
  document.querySelectorAll('[data-code]').forEach(button => button.addEventListener('click', () => { codeTab=button.dataset.code;renderCode(); }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('code-dialog').open) scene.select(null);
    if (event.target.tagName === 'CANVAS' && event.key.toLowerCase() === 'h') setView(false);
  });
  document.addEventListener('visibilitychange', () => { scene.lastFrame=performance.now(); });
} catch (error) {
  $('loading').replaceChildren();
  const title = document.createElement('p'); title.textContent = 'This view needs a browser with WebGL enabled.';
  const detail = document.createElement('p'); detail.textContent = 'Try a recent Chrome, Edge, Firefox or Safari, or browse the source on GitHub.';
  $('loading').append(title, detail);
  $('generate').disabled = true; $('status').textContent = '3D renderer unavailable';
  console.error(error);
}
