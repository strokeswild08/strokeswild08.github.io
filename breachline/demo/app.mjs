import { Weapon, Phase, Shot } from './weapon-core.mjs';

const $ = id => document.getElementById(id);
const canvas = $('range'), ctx = canvas.getContext('2d');
let weapon = new Weapon(), entered = false, held = false, soundOn = false, audio;
let width = 900, height = 515, hits = 0, elapsed = 0, recoil = 0, flash = 0, hitFlash = 0;
let pointer = { x: .5, y: .49 }, lastTime, feedbackUntil = 0, lastPhase = weapon.phase;
const targets = [
  { x: .17, y: .46, size: .067 }, { x: .34, y: .405, size: .048 },
  { x: .5, y: .46, size: .067 }, { x: .66, y: .405, size: .048 },
  { x: .83, y: .46, size: .067 }
].map((t, i) => ({ ...t, id: i + 1, down: 0 }));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
for (let i = 0; i < 12; ++i) {
  const round = document.createElement('i'); round.className = 'round'; $('rounds').append(round);
}

function stamp() {
  const seconds = Math.floor(elapsed);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
function log(message) {
  const item = document.createElement('li'), time = document.createElement('time'), text = document.createElement('span');
  time.textContent = stamp(); text.textContent = message;
  item.append(time, text); $('log').prepend(item);
  while ($('log').children.length > 5) $('log').lastChild.remove();
}
function feedback(text, seconds = 1) {
  $('feedback').textContent = text; feedbackUntil = elapsed + seconds;
}
function enter() {
  if (entered) return;
  entered = true; $('instruction').classList.add('hidden');
  canvas.focus({ preventScroll: true }); log('Drill started. Pick a target.');
}
function tone(kind) {
  if (!soundOn) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') void audio.resume();
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = kind === 'shot' ? 'sawtooth' : 'sine';
    oscillator.frequency.setValueAtTime(kind === 'shot' ? 135 : kind === 'hit' ? 880 : 250, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'shot' ? 35 : 180, audio.currentTime + .08);
    gain.gain.setValueAtTime(kind === 'shot' ? .055 : .025, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .12);
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.start(); oscillator.stop(audio.currentTime + .13);
  } catch { soundOn = false; $('sound').textContent = 'Sound unavailable'; $('sound').setAttribute('aria-pressed', 'false'); }
}
const aim = () => ({ x: pointer.x * width, y: pointer.y * height - recoil * height * .035 });
function fire() {
  if (!entered) enter();
  const result = weapon.fire(Math.random());
  if (result === Shot.Fired) {
    const point = aim();
    const target = targets.find(t => t.down <= 0 && Math.abs(point.x - t.x * width) <= t.size * height * .57
      && Math.abs(point.y - t.y * height) <= t.size * height);
    if (target) { ++hits; target.down = 2; hitFlash = .16; feedback(`TARGET ${String(target.id).padStart(2, '0')} / HIT`, .6); tone('hit'); }
    flash = .055; recoil = reduceMotion ? 0 : 1;
    tone('shot');
    if (weapon.magazine === 0) { held = false; log('Magazine empty. Reload to continue.'); feedback('EMPTY / PRESS R', 2); }
  } else if (result === Shot.Jammed) {
    held = false;
    if (lastPhase !== Phase.Jammed) { log('Stoppage. Clear the action before firing.'); feedback('STOPPAGE / PRESS F', 3); tone('jam'); }
  } else if (result === Shot.Empty) { held = false; feedback('EMPTY / PRESS R', 1.2); }
  update();
}
function action(name) {
  enter(); held = false;
  if (name === 'reload') {
    if (weapon.reload()) { log('Reload started. Fire is blocked.'); feedback('RELOADING / FIRE BLOCKED', 2); }
    else feedback(weapon.phase === Phase.Jammed ? 'CLEAR THE JAM FIRST / F' : 'RELOAD UNAVAILABLE');
  } else if (name === 'clear') {
    if (weapon.clear()) { log('Clearing stoppage. Hold for 1 second.'); feedback('CLEARING ACTION', 1.2); }
    else feedback('NO STOPPAGE TO CLEAR');
  } else if (name === 'jam') {
    if (weapon.forceJam()) { log('Practice stoppage introduced. Press F.'); feedback('STOPPAGE / PRESS F', 3); }
    else feedback('FINISH THE CURRENT ACTION FIRST');
  } else if (name === 'reset') reset();
  update();
}
function reset() {
  held = false; weapon = new Weapon({ jamProbability: Number($('condition').value) });
  hits = elapsed = recoil = flash = hitFlash = 0; pointer = { x: .5, y: .49 };
  for (const target of targets) target.down = 0;
  // Invalidate the rendered phase too: the previous drill may have ended jammed.
  lastPhase = -1; $('log').replaceChildren(); $('feedback').textContent = '';
  log('Fresh drill. 72 rounds issued.'); update();
}
function update() {
  $('magazine').textContent = String(weapon.magazine).padStart(2, '0');
  $('reserve').textContent = String(weapon.reserve).padStart(2, '0');
  $('shots').textContent = String(weapon.firedCount).padStart(2, '0');
  $('hits').textContent = String(hits).padStart(2, '0');
  $('accuracy').textContent = weapon.firedCount ? `${Math.round(hits / weapon.firedCount * 100)}%` : '—';
  const labels = [weapon.magazine ? 'READY' : 'EMPTY', 'RELOADING', 'STOPPAGE', 'CLEARING'];
  const hints = [weapon.magazine ? 'CHAMBER CHECK COMPLETE' : 'PRESS R TO RELOAD', 'FIRE BLOCKED / TRANSFERRING ROUNDS', 'PRESS F TO CLEAR THE ACTION', 'FIRE BLOCKED / WORKING THE ACTION'];
  if (lastPhase !== weapon.phase || $('state').dataset.empty !== String(weapon.magazine === 0)) {
    $('state').replaceChildren(document.createTextNode(labels[weapon.phase]));
    const subtitle = document.createElement('span'); subtitle.textContent = hints[weapon.phase]; $('state').append(subtitle);
    $('state').dataset.empty = String(weapon.magazine === 0);
  }
  $('state').classList.toggle('warning', weapon.phase === Phase.Jammed || weapon.magazine === 0);
  [...$('rounds').children].forEach((el, i) => el.classList.toggle('spent', i >= weapon.magazine));
  $('progress').style.width = `${weapon.progress * 100}%`;
  const busy = weapon.phase === Phase.Reloading || weapon.phase === Phase.Clearing;
  $('operation-label').textContent = busy ? (weapon.phase === Phase.Reloading ? 'Seating magazine' : 'Clearing action') : weapon.phase === Phase.Jammed ? 'Action required' : 'Awaiting input';
  $('operation-time').textContent = busy ? `${weapon.remaining.toFixed(1)} s` : '—';
  $('reload').disabled = weapon.phase !== Phase.Ready || weapon.magazine === 12 || weapon.reserve === 0;
  $('clear').disabled = weapon.phase !== Phase.Jammed;
  $('jam').disabled = weapon.phase !== Phase.Ready || weapon.magazine === 0;
  $('fire').disabled = weapon.phase !== Phase.Ready || weapon.magazine === 0;
  lastPhase = weapon.phase;
}
function resize() {
  const rect = canvas.getBoundingClientRect(); width = rect.width; height = rect.height;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function poly(points, fill, stroke) {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function draw() {
  const w = width, h = height;
  const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#607063'); sky.addColorStop(.55, '#9da68b'); sky.addColorStop(1, '#252f27');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  // Deterministic silhouettes; no external textures or rendering dependency.
  for (let layer = 0; layer < 3; ++layer) {
    ctx.fillStyle = ['#65745f', '#52654f', '#3c5142'][layer];
    for (let i = 0; i < 28; ++i) {
      const x = (i / 27) * w + Math.sin(i * 16 + layer * 4) * 15;
      const top = h * (.19 + layer * .043 + (Math.sin(i * 7 + layer) + 1) * .055);
      const size = h * (.08 + layer * .012);
      ctx.beginPath(); ctx.ellipse(x, top + size * .6, size * .65, size * 1.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(x - 3, top, 6, h * .55 - top);
    }
  }
  poly([[0, h * .53], [w, h * .53], [w, h], [0, h]], '#6e7056');
  poly([[w * .36, h * .53], [w * .64, h * .53], [w * .9, h], [w * .1, h]], '#83816a');
  for (let i = 0; i < 20; ++i) {
    const y = h * (.54 + (i / 20) ** 2 * .46);
    ctx.fillStyle = i % 2 ? '#5f624810' : '#c2bb9810'; ctx.fillRect(0, y, w, 2 + i * .15);
  }
  // Side barriers and rails in perspective.
  poly([[0, h * .35], [w * .12, h * .48], [w * .12, h], [0, h]], '#344337');
  poly([[w, h * .35], [w * .88, h * .48], [w * .88, h], [w, h]], '#344337');
  for (const side of [0, 1]) {
    ctx.strokeStyle = '#a49e7833'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; ++i) {
      ctx.beginPath(); ctx.moveTo(side ? w : 0, h * (.46 + i * .18));
      ctx.lineTo(side ? w * .88 : w * .12, h * (.49 + i * .12)); ctx.stroke();
    }
  }
  // Target supports and plates. Hit regions use these exact bounds.
  for (const t of targets) {
    const x = t.x * w, y = t.y * h, s = t.size * h;
    ctx.fillStyle = '#2c3d30'; ctx.fillRect(x - s * .08, y + s * .8, s * .16, s * 2.2);
    poly([[x - s * .8, y + s * 3], [x + s * .8, y + s * 3], [x + s * .5, y + s * 2.65], [x - s * .5, y + s * 2.65]], '#3c4434');
    if (t.down > 0) { ctx.fillStyle = '#d9a86c'; ctx.fillRect(x - s * .5, y + s * 1.8, s, 3); continue; }
    ctx.save(); ctx.translate(x, y);
    ctx.shadowColor = '#15291f66'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    poly([[-s * .57, -s], [s * .57, -s], [s * .57, s], [-s * .57, s]], '#d7c6a0', '#303d2e');
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    poly([[-s * .28, -s * .4], [-s * .15, -s * .58], [-s * .15, -s * .8], [s * .15, -s * .8], [s * .15, -s * .58], [s * .28, -s * .4], [s * .35, s * .65], [-s * .35, s * .65]], '#495340');
    ctx.strokeStyle = '#d9a86c'; ctx.lineWidth = 1;
    for (const radius of [.14, .28, .43]) { ctx.beginPath(); ctx.ellipse(0, s * .13, s * radius * .7, s * radius, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#e5dcc6'; ctx.font = `${Math.max(8, s * .23)}px monospace`; ctx.textAlign = 'center';
    ctx.fillText(`0${t.id}`, 0, s * .91); ctx.restore();
  }
  // A low bench and a graphic first-person receiver, independent of aim hitboxes.
  poly([[0, h * .96], [w * .15, h * .82], [w * .85, h * .82], [w, h * .96], [w, h], [0, h]], '#25352e');
  const busy = weapon.phase === Phase.Reloading || weapon.phase === Phase.Clearing;
  const dip = busy ? Math.sin(weapon.progress * Math.PI) * h * .16 : 0;
  ctx.save(); ctx.translate(w * .61, h * .94 + dip + recoil * h * .025);
  const scale = h / 500; ctx.scale(scale, scale);
  poly([[-38, 70], [105, 70], [57, -130], [25, -130]], '#172423', '#566352');
  poly([[20, -125], [58, -125], [48, -195], [30, -195]], '#283632', '#6b7762');
  poly([[31, -190], [47, -190], [42, -242], [36, -242]], '#172421', '#75806a');
  ctx.fillStyle = '#9a9d79'; ctx.fillRect(32, -213, 15, 5); ctx.fillRect(33, -236, 14, 4);
  poly([[0, -30], [73, -30], [66, -116], [14, -116]], '#37453c', '#7a8268');
  ctx.fillStyle = '#192823';
  for (let i = 0; i < 5; ++i) ctx.fillRect(20, -106 + i * 11, 40, 4);
  poly([[14, -20], [59, -20], [75, 70], [-3, 70]], '#1d2c27', '#626e57');
  ctx.fillStyle = '#d9a86c'; ctx.font = '8px monospace'; ctx.textAlign = 'left'; ctx.fillText('BR / 012', 18, 4);
  if (flash > 0) {
    poly([[39, -240], [17, -271], [34, -262], [41, -296], [47, -261], [65, -276]], '#f2c57d');
    ctx.fillStyle = '#fff6ce'; ctx.beginPath(); ctx.arc(41, -254, 8, 0, Math.PI * 2); ctx.fill();
  }
  if (weapon.phase === Phase.Jammed) { ctx.fillStyle = '#d9a86c'; ctx.fillRect(59, -58, 15, 5); }
  ctx.restore();
  // Vignette and reticle.
  const vignette = ctx.createRadialGradient(w * .5, h * .45, h * .1, w * .5, h * .5, w * .65);
  vignette.addColorStop(0, '#10271b00'); vignette.addColorStop(1, '#0d201bc0'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);
  if (entered) {
    const point = aim(), size = hitFlash > 0 ? 10 : 7;
    ctx.strokeStyle = weapon.phase === Phase.Jammed || hitFlash > 0 ? '#ecc18a' : '#edf1da'; ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { ctx.moveTo(point.x + dx * 3, point.y + dy * 3); ctx.lineTo(point.x + dx * size, point.y + dy * size); }
    ctx.stroke();
  }
}
function loop(now) {
  // Pause instead of jumping action timers when the document is hidden.
  const dt = lastTime === undefined || document.hidden ? 0 : Math.min((now - lastTime) / 1000, .05);
  lastTime = now;
  if (entered) elapsed += dt;
  const before = weapon.phase; weapon.advance(dt);
  if (before !== weapon.phase) {
    if (before === Phase.Reloading) { log(`Magazine seated. ${weapon.magazine} loaded / ${weapon.reserve} reserve.`); feedback('RELOAD COMPLETE', .8); }
    if (before === Phase.Clearing) { log('Action clear. Weapon ready.'); feedback('ACTION CLEAR / READY', .8); }
  }
  for (const target of targets) target.down = Math.max(0, target.down - dt);
  recoil = Math.max(0, recoil - dt * 7); flash = Math.max(0, flash - dt); hitFlash = Math.max(0, hitFlash - dt);
  if (held) fire();
  if (elapsed > feedbackUntil) $('feedback').textContent = '';
  update(); draw(); requestAnimationFrame(loop);
}
function move(event) {
  const r = canvas.getBoundingClientRect();
  pointer = { x: Math.max(0, Math.min(1, (event.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (event.clientY - r.top) / r.height)) };
}
$('start').addEventListener('click', enter);
canvas.addEventListener('pointermove', move);
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  event.preventDefault(); move(event); enter(); canvas.setPointerCapture(event.pointerId); held = true; fire();
});
canvas.addEventListener('pointercancel', () => { held = false; });
canvas.addEventListener('lostpointercapture', () => { held = false; });
$('fire').addEventListener('pointerdown', event => { if (event.button !== 0) return; event.preventDefault(); enter(); held = true; fire(); });
$('fire').addEventListener('click', event => { if (event.detail === 0) fire(); });
window.addEventListener('pointerup', () => { held = false; });
window.addEventListener('blur', () => { held = false; });
document.addEventListener('visibilitychange', () => { held = false; lastTime = undefined; });
for (const name of ['reload', 'clear', 'jam', 'reset']) $(name).addEventListener('click', () => action(name));
$('condition').addEventListener('change', reset);
$('sound').addEventListener('click', () => { soundOn = !soundOn; $('sound').setAttribute('aria-pressed', String(soundOn)); $('sound').textContent = soundOn ? 'Sound on' : 'Sound off'; if (soundOn) tone('hit'); });
window.addEventListener('keydown', event => {
  const tag = document.activeElement?.tagName;
  if (['SELECT', 'INPUT', 'TEXTAREA'].includes(tag) || (event.code === 'Space' && ['BUTTON', 'A'].includes(tag))) return;
  if (event.repeat) return;
  if (event.code === 'Space') { event.preventDefault(); enter(); held = true; fire(); }
  else { const name = { KeyR: 'reload', KeyF: 'clear', KeyJ: 'jam', KeyT: 'reset' }[event.code]; if (name) { event.preventDefault(); action(name); } }
});
window.addEventListener('keyup', event => { if (event.code === 'Space') held = false; });
new ResizeObserver(resize).observe(canvas); resize(); update(); requestAnimationFrame(loop);
