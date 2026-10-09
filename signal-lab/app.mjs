import { defaults, presets, sanitize, synthesize, encodeWav, SAMPLE_RATE } from './synth.mjs';

const $ = (selector) => document.querySelector(selector);
const glyphs = ['↘', '✧', '↗', '✳', '✓', '≋', '↑', '◎'];
const parameters = [
  ['start', 'Start pitch', 30, 3000, 1, value => `${Math.round(value)} Hz`],
  ['end', 'End pitch', 30, 3000, 1, value => `${Math.round(value)} Hz`],
  ['duration', 'Length', .08, 1.5, .01, value => `${value.toFixed(2)} s`],
  ['attack', 'Attack', .002, .2, .001, value => `${Math.round(value * 1000)} ms`],
  ['noise', 'Noise', 0, 1, .01, value => `${Math.round(value * 100)}%`],
  ['cutoff', 'Low-pass filter', 200, 12000, 10, value => value >= 1000 ? `${(value / 1000).toFixed(1)} kHz` : `${Math.round(value)} Hz`],
  ['drive', 'Drive', 0, 1, .01, value => `${Math.round(value * 100)}%`],
  ['echo', 'Echo', 0, .75, .01, value => `${Math.round(value * 100)}%`]
];
let current = presets[0], settings = sanitize({ ...defaults, ...current.settings });
let samples, audioContext, source, monitor, frame, started = 0, playing = false, history = [], toastTimer, changeBefore, playbackRequest = 0;

// A blocked or full localStorage should never stop the sound designer.
try {
  const saved = JSON.parse(localStorage.getItem('wild-strokes-signal-lab'));
  if (saved?.version === 1 && saved.settings) { current = presets.find(p => p.id === saved.preset) || presets[0]; settings = sanitize(saved.settings); }
} catch { /* The default preset is usable when storage is unavailable. */ }

$('#presets').innerHTML = presets.map((p, index) => `<button class="preset" data-preset="${p.id}" aria-pressed="false"><span class="preset-glyph" aria-hidden="true">${glyphs[index]}</span><span><span class="preset-name">${p.name}</span><span class="preset-family">${p.family}</span></span><kbd>${p.key}</kbd></button>`).join('');
$('#sliders').innerHTML = parameters.map(([key, label, min, max, step]) => `<div class="slider"><label for="${key}">${label}<output id="${key}-value" for="${key}"></output></label><input id="${key}" type="range" min="${min}" max="${max}" step="${step}"></div>`).join('');

function snapshot() { return { preset: current.id, settings: { ...settings } }; }
function remember(before = snapshot()) { history.push(before); if (history.length > 40) history.shift(); $('#undo').disabled = false; }
function persist() { try { localStorage.setItem('wild-strokes-signal-lab', JSON.stringify({ version: 1, ...snapshot() })); } catch {} }
function fill(input) { input.style.setProperty('--fill', `${(Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`); }
function notice(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2800); }

function render() {
  samples = synthesize(settings);
  document.querySelectorAll('[data-preset]').forEach(button => { const active = button.dataset.preset === current.id; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  document.querySelectorAll('[data-wave]').forEach(button => { const active = button.dataset.wave === settings.wave; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  $('#sound-name').firstChild.textContent = current.name;
  const base = sanitize({ ...defaults, ...current.settings });
  $('#custom-tag').hidden = Object.keys(settings).every(key => settings[key] === base[key]);
  $('#sound-family').textContent = `${current.family} / 0${presets.indexOf(current) + 1}`;
  $('#sound-description').textContent = current.description;
  $('.sound-icon').textContent = glyphs[presets.indexOf(current)];
  for (const [key, , , , , format] of parameters) { const input = $(`#${key}`); input.value = settings[key]; fill(input); $(`#${key}-value`).textContent = format(settings[key]); }
  $('#duration-readout').textContent = `${(samples.length / SAMPLE_RATE).toFixed(2)} SEC`;
  let peak = 0; for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  $('#peak-readout').textContent = `PEAK ${peak ? (20 * Math.log10(peak)).toFixed(1) : '−∞'} dB`;
  drawWaveform(); persist();
}

function drawWaveform() {
  const canvas = $('#waveform'), bounds = canvas.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(bounds.width * ratio); canvas.height = Math.round(bounds.height * ratio);
  const ctx = canvas.getContext('2d'), width = bounds.width, height = bounds.height;
  ctx.scale(ratio, ratio); ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#263421'; ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 35) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, height); ctx.stroke(); }
  for (let y = 0; y < height; y += 30) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(width, y + .5); ctx.stroke(); }
  ctx.strokeStyle = '#617543'; ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke();
  ctx.fillStyle = '#d6ef7d';
  for (let x = 0; x < width; x += 2) {
    const from = Math.floor(x / width * samples.length), to = Math.max(from + 1, Math.floor((x + 2) / width * samples.length));
    let low = 0, high = 0;
    for (let i = from; i < Math.min(to, samples.length); i++) { low = Math.min(low, samples[i]); high = Math.max(high, samples[i]); }
    ctx.fillRect(x, height / 2 - high * height * .46, 1.3, Math.max(1, (high - low) * height * .46));
  }
}

function stop() {
  playbackRequest++;
  if (source) { source.onended = null; try { source.stop(); } catch {} source.disconnect(); source = null; }
  playing = false; cancelAnimationFrame(frame); $('#playhead').style.opacity = '0';
  $('#play-label').textContent = 'Play sound'; $('#play-icon').textContent = '▶'; $('#play').setAttribute('aria-label', 'Play sound');
}
function tick() {
  if (!playing) return;
  const progress = Math.min(1, (audioContext.currentTime - started) / (samples.length / SAMPLE_RATE));
  $('#playhead').style.left = `${progress * 100}%`;
  frame = requestAnimationFrame(tick);
}
async function play() {
  stop();
  const request = playbackRequest;
  try {
    if (!audioContext) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Web Audio is unavailable in this browser.');
      audioContext = new Audio(); monitor = audioContext.createGain(); monitor.connect(audioContext.destination);
    }
    await audioContext.resume();
    if (request !== playbackRequest) return;
    monitor.gain.value = Number($('#monitor-volume').value);
    const buffer = audioContext.createBuffer(1, samples.length, SAMPLE_RATE); buffer.copyToChannel(samples, 0);
    source = audioContext.createBufferSource(); source.buffer = buffer; source.connect(monitor); source.onended = stop;
    source.start(); started = audioContext.currentTime; playing = true;
    $('#play-label').textContent = 'Stop sound'; $('#play-icon').textContent = '■'; $('#play').setAttribute('aria-label', 'Stop sound');
    $('#playhead').style.opacity = '1'; tick();
  } catch (error) { stop(); notice(error.message || 'Could not play the sound. Try downloading the WAV.'); }
}
function choose(preset, audition = false) { stop(); remember(); current = preset; settings = sanitize({ ...defaults, ...preset.settings }); render(); if (audition) play(); }

$('#presets').addEventListener('click', event => { const button = event.target.closest('[data-preset]'); if (button) choose(presets.find(p => p.id === button.dataset.preset), true); });
$('#wave-options').addEventListener('click', event => { const button = event.target.closest('[data-wave]'); if (!button) return; stop(); remember(); settings.wave = button.dataset.wave; render(); });
for (const [key] of parameters) {
  const input = $(`#${key}`);
  input.addEventListener('input', () => { if (!changeBefore) changeBefore = snapshot(); stop(); settings[key] = Number(input.value); render(); });
  input.addEventListener('change', () => { if (changeBefore) { remember(changeBefore); changeBefore = null; } });
}
$('#play').addEventListener('click', () => playing ? stop() : play());
$('#reset').addEventListener('click', () => { choose(current); notice('Preset restored.'); });
$('#undo').addEventListener('click', () => { const before = history.pop(); if (!before) return; stop(); current = presets.find(p => p.id === before.preset); settings = before.settings; $('#undo').disabled = !history.length; render(); });
$('#randomize').addEventListener('click', () => {
  stop(); remember();
  settings = sanitize({ ...settings, start: settings.start * (.7 + Math.random() * .6), end: settings.end * (.7 + Math.random() * .6), duration: settings.duration * (.75 + Math.random() * .5), noise: settings.noise + (Math.random() - .5) * .15, cutoff: settings.cutoff * (.7 + Math.random() * .6), seed: Math.floor(1 + Math.random() * 2147483645) });
  render(); play();
});
$('#monitor-volume').addEventListener('input', event => { fill(event.target); $('#monitor-readout').textContent = `${Math.round(event.target.value * 100)}%`; if (monitor) monitor.gain.setTargetAtTime(Number(event.target.value), audioContext.currentTime, .01); });
function download(blob, filename) { const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
$('#export').addEventListener('click', () => { download(new Blob([encodeWav(samples)], { type: 'audio/wav' }), `signal-lab-${current.id}.wav`); notice('WAV exported. Ready for your game.'); });
$('#save-recipe').addEventListener('click', () => { download(new Blob([JSON.stringify({ version: 1, ...snapshot() }, null, 2)], { type: 'application/json' }), `signal-lab-${current.id}.json`); notice('Sound recipe saved.'); });
$('#load-recipe').addEventListener('click', () => $('#recipe-file').click());
$('#recipe-file').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 32768) throw new Error('Recipe is too large. Use a Signal Lab JSON file.');
    const recipe = JSON.parse(await file.text());
    if (recipe.version !== 1 || !recipe.settings || typeof recipe.settings !== 'object' || Array.isArray(recipe.settings)) throw new Error('Choose a valid Signal Lab recipe.');
    stop(); remember(); current = presets.find(p => p.id === recipe.preset) || presets[0]; settings = sanitize(recipe.settings); render(); notice('Recipe loaded.');
  } catch (error) { notice(error instanceof SyntaxError ? 'That file is not valid JSON.' : error.message); }
  event.target.value = '';
});
document.addEventListener('keydown', event => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, button, a, textarea, select')) return;
  if (event.code === 'Space') { event.preventDefault(); playing ? stop() : play(); }
  const preset = presets.find(p => p.key === event.key); if (preset) { event.preventDefault(); choose(preset, true); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
new ResizeObserver(drawWaveform).observe($('#waveform'));
fill($('#monitor-volume')); render();
