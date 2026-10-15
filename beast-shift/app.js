/* Original clip: 102 decoded frames, 600 × 300, 10 frames per second. */
'use strict';
const TOTAL = 102, FPS = 10, WIDTH = 600, HEIGHT = 300, COLUMNS = 10;
const $ = id => document.getElementById(id);
const canvas = $('canvas'), ctx = canvas.getContext('2d');
const atlas = new Image();
let frame = 0, playing = false, ready = false, previousTime = null, accumulator = 0;
let speed = 1, first = 0, last = TOTAL - 1;
const previews = [0, 14, 28, 42, 56, 70, 84, 101];
function drawFrame(context, index, width = WIDTH, height = HEIGHT) {
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, width, height);
  context.drawImage(atlas, index % COLUMNS * WIDTH, Math.floor(index / COLUMNS) * HEIGHT,
    WIDTH, HEIGHT, 0, 0, width, height);
}
function render() {
  if (!ready) return;
  drawFrame(ctx, frame);
  window.EventDesk?.onView(frame);
  $('scrub').value = frame;
  $('frameValue').textContent = String(frame + 1).padStart(3, '0');
  $('time').textContent = `${(frame / FPS).toFixed(1)}s / 10.2s`;
  $('status').textContent = playing ? 'PLAYING' : 'PAUSED';
  const nearest = previews.reduce((a, b) => Math.abs(b - frame) < Math.abs(a - frame) ? b : a);
  document.querySelectorAll('.filmstrip button').forEach(b => {
    const active = Number(b.dataset.frame) === nearest;
    b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active));
  });
}
function setPlaying(value) {
  if (!ready) return;
  if (value && !playing) window.EventDesk?.onFrame(frame);
  playing = value; previousTime = null; accumulator = 0;
  $('play').textContent = value ? 'Pause animation' : 'Play animation';
  $('play').setAttribute('aria-pressed', String(value)); render();
}
function seek(value) {
  setPlaying(false); frame = Math.max(0, Math.min(TOTAL - 1, value)); render();
}
function tick(time) {
  if (playing && !document.hidden) {
    if (previousTime !== null) accumulator += Math.min(time - previousTime, 250) * speed;
    const steps = Math.floor(accumulator / (1000 / FPS));
    if (steps) {
      accumulator -= steps * (1000 / FPS);
      // Visit every crossed frame so fast playback and loop wraps cannot skip cues.
      for (let step = 0; step < steps; step++) {
        if ($('loop').checked) {
          frame = frame < first || frame >= last ? first : frame + 1;
        } else {
          if (frame >= TOTAL - 1) { setPlaying(false); break; }
          frame++;
        }
        window.EventDesk?.onFrame(frame);
        if (!$('loop').checked && frame === TOTAL - 1) { setPlaying(false); break; }
      }
      render();
    }
    previousTime = time;
  } else previousTime = null;
  requestAnimationFrame(tick);
}
function setRange() {
  first = Math.max(0, Math.min(TOTAL - 1, (Number($('start').value) || 1) - 1));
  last = Math.max(first, Math.min(TOTAL - 1, (Number($('end').value) || TOTAL) - 1));
  $('start').value = first + 1; $('end').value = last + 1;
  if ($('loop').checked) seek(Math.max(first, Math.min(last, frame)));
}
function reset() {
  $('speed').value = '1'; speed = 1; $('speedValue').textContent = '1×';
  $('zoom').value = '1'; $('zoomValue').textContent = '1×'; canvas.style.width = '100%';
  $('grid').checked = false; $('viewport').classList.remove('grid');
  $('loop').checked = true; first = 0; last = TOTAL - 1;
  $('start').value = 1; $('end').value = TOTAL; seek(0);
}
$('play').onclick = () => {
  window.EventDesk?.prepareAudio();
  if (!playing && ((!$('loop').checked && frame === TOTAL - 1) || ($('loop').checked && (frame < first || frame > last)))) frame = $('loop').checked ? first : 0;
  setPlaying(!playing);
};
$('prev').onclick = () => seek(frame - 1);
$('next').onclick = () => seek(frame + 1);
$('scrub').oninput = e => seek(Number(e.target.value));
$('speed').onchange = e => { speed = Number(e.target.value); $('speedValue').textContent = `${speed}×`; };
$('zoom').oninput = e => { canvas.style.width = `${Number(e.target.value) * 100}%`; $('zoomValue').textContent = `${e.target.value}×`; };
$('grid').onchange = e => $('viewport').classList.toggle('grid', e.target.checked);
$('start').onchange = setRange; $('end').onchange = setRange;
$('loop').onchange = () => { if ($('loop').checked) setRange(); };
$('reset').onclick = reset;
document.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey || /INPUT|SELECT|TEXTAREA|BUTTON|A/.test(e.target.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); $('play').click(); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); seek(frame - 1); }
  if (e.key === 'ArrowRight') { e.preventDefault(); seek(frame + 1); }
  if (e.key.toLowerCase() === 'r') reset();
});
atlas.onload = () => {
  ready = true; $('play').disabled = false;
  for (const index of previews) {
    const button = document.createElement('button'); button.dataset.frame = index;
    button.setAttribute('aria-label', `Jump to frame ${index + 1}`);
    const thumb = document.createElement('canvas'); thumb.width = 180; thumb.height = 90;
    drawFrame(thumb.getContext('2d'), index, 180, 90);
    const label = document.createElement('span'); label.textContent = String(index + 1).padStart(3, '0');
    button.append(thumb, label); button.onclick = () => seek(index); $('filmstrip').append(button);
  }
  render(); requestAnimationFrame(tick);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(true);
};
atlas.onerror = () => { $('status').textContent = 'LOAD ERROR'; $('error').hidden = false; };
atlas.src = 'assets/frames.png';
