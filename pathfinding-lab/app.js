'use strict';
const { Grid, Search } = Pathfinding;
const $ = id => document.getElementById(id);
const canvas = $('map'), ctx = canvas.getContext('2d');
let grid = new Grid(32, 20), start = 9 * 32 + 3, goal = 9 * 32 + 28;
let tool = 'wall', search = null, running = false, drawing = false, cursor = -1;
let lastPainted = -1, routeStarted = 0, batchTime = 0;
const names = { astar: 'A*', dijkstra: 'Dijkstra', bfs: 'BFS' };
const colors = { wall: '#33434e', ground: '#101b26', slow: '#59463c', visited: '#24465d', frontier: '#416c87', route: '#dcaf70', start: '#77c9ad', goal: '#e0b576' };

function setMessage(message) { $('message').textContent = message; }
function metrics(result) {
  $('expanded').textContent = result ? result.expanded : '—';
  $('steps').textContent = result?.steps ?? '—';
  $('cost').textContent = result?.cost ?? '—';
  $('state').textContent = running ? 'SEARCHING' : search ? search.found ? 'ROUTE FOUND' : search.done ? 'NO ROUTE' : 'PAUSED' : 'READY';
}
function stop() { running = false; $('run').textContent = search && !search.done ? 'RESUME SEARCH →' : 'FIND ROUTE →'; }
function invalidate() {
  stop(); search = null; routeStarted = 0; batchTime = 0;
  $('run').textContent = 'FIND ROUTE →';
  $('comparison').replaceChildren();
  const row = document.createElement('tr'), cell = document.createElement('td');
  cell.colSpan = 4; cell.textContent = 'Map changed. Compare again to update the results.';
  row.append(cell); $('comparison').append(row); metrics(null);
}
function example() {
  grid = new Grid(32, 20); start = 9 * 32 + 3; goal = 9 * 32 + 28;
  for (let x = 0; x < grid.cols; x++) { grid.cells[x] = 0; grid.cells[(grid.rows - 1) * grid.cols + x] = 0; }
  for (let y = 0; y < grid.rows; y++) { grid.cells[y * grid.cols] = 0; grid.cells[y * grid.cols + grid.cols - 1] = 0; }
  for (let y = 3; y <= 16; y++) {
    if (y !== 6 && y !== 14) grid.cells[y * 32 + 10] = 0;
    if (y !== 5 && y !== 12) grid.cells[y * 32 + 22] = 0;
  }
  for (let y = 7; y <= 12; y++) for (let x = 12; x < 21; x++) grid.cells[y * 32 + x] = 4;
  grid.cells[start] = grid.cells[goal] = 1;
  invalidate(); cursor = start; dimensions(); setMessage('Example map loaded'); draw();
}
function dimensions() { $('dimensions').textContent = `${grid.cols} × ${grid.rows} GRID`; }
function paint(id) {
  if (!grid.valid(id) || id === lastPainted) return;
  lastPainted = id;
  if (tool === 'start') { if (id === goal) return; start = id; grid.cells[id] = 1; }
  else if (tool === 'goal') { if (id === start) return; goal = id; grid.cells[id] = 1; }
  else if (id !== start && id !== goal) grid.cells[id] = tool === 'wall' ? 0 : tool === 'slow' ? 4 : 1;
  else return;
  invalidate(); setMessage('Map edited · ready to search'); draw();
}
function cellAt(event) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / rect.width * grid.cols);
  const y = Math.floor((event.clientY - rect.top) / rect.height * grid.rows);
  return x < 0 || y < 0 || x >= grid.cols || y >= grid.rows ? -1 : y * grid.cols + x;
}
function run() {
  if (running) { stop(); metrics(search.result()); setMessage('Search paused'); return; }
  if (!search || search.done) { search = new Search(grid, start, goal, $('algorithm').value); routeStarted = 0; }
  running = true; batchTime = 0; $('run').textContent = 'PAUSE SEARCH Ⅱ'; setMessage(`Exploring with ${names[search.algorithm]}`); metrics(search.result());
}
function compare() {
  const body = $('comparison'); body.replaceChildren();
  for (const algorithm of ['astar', 'dijkstra', 'bfs']) {
    const result = new Search(grid, start, goal, algorithm).run();
    const row = document.createElement('tr');
    for (const value of [names[algorithm], result.expanded, result.steps ?? 'No route', result.cost ?? '—']) {
      const cell = document.createElement('td'); cell.textContent = String(value); row.append(cell);
    }
    body.append(row);
  }
  setMessage('Algorithm comparison updated');
}
function draw() {
  const cw = canvas.width / grid.cols, ch = canvas.height / grid.rows;
  const route = new Set(search?.path || []);
  ctx.fillStyle = '#09121c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let id = 0; id < grid.cells.length; id++) {
    const x = id % grid.cols * cw, y = Math.floor(id / grid.cols) * ch;
    let color = grid.cells[id] === 0 ? colors.wall : grid.cells[id] === 4 ? colors.slow : colors.ground;
    if (search?.visited.has(id)) color = colors.visited;
    if (search?.frontier.has(id)) color = colors.frontier;
    if (route.has(id)) color = '#665239';
    ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2);
    if (grid.cells[id] === 0) { ctx.fillStyle = '#42545e'; ctx.fillRect(x + 2, y + 2, cw - 4, Math.max(1, ch * .07)); }
    if (grid.cells[id] === 4) {
      ctx.strokeStyle = '#c49a6555'; ctx.lineWidth = 1;
      for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + cw * .2, y + ch * i / 3); ctx.lineTo(x + cw * .8, y + ch * i / 3); ctx.stroke(); }
    }
  }
  if (search?.path.length > 1) {
    ctx.strokeStyle = colors.route; ctx.lineWidth = Math.max(2, cw * .1); ctx.lineJoin = 'round'; ctx.beginPath();
    search.path.forEach((id, index) => { const x = id % grid.cols * cw + cw / 2, y = Math.floor(id / grid.cols) * ch + ch / 2; if (index) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.stroke();
  }
  for (const [id, color, label] of [[start, colors.start, 'S'], [goal, colors.goal, 'G']]) {
    const x = id % grid.cols * cw, y = Math.floor(id / grid.cols) * ch;
    ctx.fillStyle = color; ctx.fillRect(x + 2, y + 2, cw - 4, ch - 4);
    ctx.fillStyle = '#152129'; ctx.font = `bold ${Math.max(7, ch * .45)}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + cw / 2, y + ch / 2);
  }
  if (search?.found && search.path.length > 1) {
    const travel = (performance.now() - routeStarted) / 190;
    const progress = travel % (search.path.length - 1), index = Math.floor(progress), mix = progress - index;
    const a = search.path[index], b = search.path[index + 1];
    const x = ((a % grid.cols) * (1 - mix) + (b % grid.cols) * mix + .5) * cw;
    const y = (Math.floor(a / grid.cols) * (1 - mix) + Math.floor(b / grid.cols) * mix + .5) * ch;
    ctx.fillStyle = '#fff4d5'; ctx.shadowColor = '#f3c988'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(x, y, Math.max(3, cw * .2), 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  }
  if (grid.valid(cursor)) {
    ctx.strokeStyle = '#dfe9eb'; ctx.lineWidth = 1; ctx.strokeRect(cursor % grid.cols * cw + 1, Math.floor(cursor / grid.cols) * ch + 1, cw - 2, ch - 2);
  }
}
let previous = 0;
function frame(now) {
  const elapsed = Math.min(100, now - previous); previous = now;
  if (running) {
    batchTime += elapsed;
    if (batchTime >= 32) {
      const count = Number($('speed').value) * Math.min(3, Math.floor(batchTime / 32)); batchTime = 0;
      for (let i = 0; i < count && !search.done; i++) search.step();
      if (search.done) { stop(); routeStarted = now; setMessage(search.found ? 'Route found · agent following path' : 'No route · remove a wall or move the goal'); }
      metrics(search.result());
    }
  }
  draw(); requestAnimationFrame(frame);
}
$('tools').addEventListener('click', event => {
  const button = event.target.closest('[data-tool]'); if (!button) return;
  tool = button.dataset.tool;
  document.querySelectorAll('[data-tool]').forEach(b => { const selected = b === button; b.classList.toggle('active', selected); b.setAttribute('aria-pressed', String(selected)); });
});
canvas.addEventListener('pointerdown', event => { if (event.button !== 0) return; event.preventDefault(); canvas.focus(); canvas.setPointerCapture(event.pointerId); drawing = true; lastPainted = -1; cursor = cellAt(event); paint(cursor); });
canvas.addEventListener('pointermove', event => { cursor = cellAt(event); if (drawing) paint(cursor); });
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, () => { drawing = false; lastPainted = -1; });
canvas.addEventListener('pointerleave', () => { if (!drawing) cursor = -1; });
canvas.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) return;
  event.preventDefault(); if (!grid.valid(cursor)) cursor = start;
  let x = cursor % grid.cols, y = Math.floor(cursor / grid.cols);
  if (event.key === 'ArrowLeft') x = Math.max(0, x - 1);
  if (event.key === 'ArrowRight') x = Math.min(grid.cols - 1, x + 1);
  if (event.key === 'ArrowUp') y = Math.max(0, y - 1);
  if (event.key === 'ArrowDown') y = Math.min(grid.rows - 1, y + 1);
  cursor = y * grid.cols + x;
  if (event.key === ' ') { lastPainted = -1; paint(cursor); }
});
$('run').onclick = run; $('compare').onclick = compare; $('preset').onclick = example;
$('algorithm').onchange = () => { invalidate(); setMessage('Algorithm changed · ready to search'); };
$('clear').onclick = () => { grid.cells.fill(1); invalidate(); setMessage('Map cleared'); };
$('export').onclick = () => {
  const blob = new Blob([JSON.stringify(grid.toJSON(start, goal), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'route-lab-map.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('Map exported');
};
$('import').onclick = () => $('file').click();
$('file').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > 1000000) throw new Error('Map files must be smaller than 1 MB.');
    const imported = Grid.fromJSON(JSON.parse(await file.text()));
    // Commit the new map only after the complete file passes validation.
    grid = imported.grid; start = imported.start; goal = imported.goal; cursor = start;
    invalidate(); dimensions(); setMessage('Map imported');
  } catch (error) { setMessage(`Import failed: ${error.message}`); }
  event.target.value = '';
};
example(); requestAnimationFrame(frame);
