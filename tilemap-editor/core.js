export const FORMAT = 'wild-strokes-fieldwork';
export const MAX_SIDE = 64;
export function blankMap(width = 28, height = 20, name = 'Untitled world') {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 4 || height < 4 || width > MAX_SIDE || height > MAX_SIDE) throw Error('Map sides must be between 4 and 64 cells.');
  return {format: FORMAT, version: 1, name, width, height, tileSize: 32, spawn: {x: 4, y: 4}, layers: {ground: Array(width * height).fill(-1), objects: Array(width * height).fill(-1), collision: Array(width * height).fill(0)}, custom: null};
}
export const clone = value => JSON.parse(JSON.stringify(value));
export const inside = (map, x, y) => x >= 0 && y >= 0 && x < map.width && y < map.height;
export function line(x0, y0, x1, y1) {
  const result = [], dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  while (true) { result.push([x0, y0]); if (x0 === x1 && y0 === y1) return result; const e = error * 2; if (e >= dy) {error += dy; x0 += sx;} if (e <= dx) {error += dx; y0 += sy;} }
}
export function fill(map, layer, x, y, value) {
  if (!inside(map, x, y)) return;
  const data = map.layers[layer], target = data[y * map.width + x];
  if (target === value) return;
  const queue = [y * map.width + x]; data[queue[0]] = value;
  for (let i = 0; i < queue.length; i++) { const n = queue[i], cx = n % map.width, cy = Math.floor(n / map.width); for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {const j = ny * map.width + nx; if (inside(map, nx, ny) && data[j] === target) {data[j] = value; queue.push(j);}} }
}
export function resize(map, width, height) {
  const out = blankMap(width, height, map.name); out.custom = clone(map.custom);
  for (const layer of Object.keys(out.layers)) for (let y = 0; y < Math.min(height, map.height); y++) for (let x = 0; x < Math.min(width, map.width); x++) out.layers[layer][y * width + x] = map.layers[layer][y * map.width + x];
  out.spawn = {x: Math.min(map.spawn.x, width - 1), y: Math.min(map.spawn.y, height - 1)}; return out;
}
export function validateMap(input, builtInCount = 32) {
  if (!input || input.format !== FORMAT || input.version !== 1 || input.tileSize !== 32) throw Error('Open a Fieldwork version 1 project JSON.');
  const out = blankMap(input.width, input.height, typeof input.name === 'string' ? input.name.slice(0, 60) : 'Untitled world');
  let customCount = 0;
  if (input.custom !== null && input.custom !== undefined) {
    const c = input.custom;
    if (!c || typeof c.data !== 'string' || c.data.length > 7_000_000 || !/^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(c.data) || ![16,32,48,64].includes(c.size) || !Number.isInteger(c.columns) || !Number.isInteger(c.rows) || c.columns < 1 || c.rows < 1 || c.columns * c.rows > 256 || c.columns * c.size > 2048 || c.rows * c.size > 2048) throw Error('The custom tilesheet is invalid or too large.');
    out.custom = {data: c.data, size: c.size, columns: c.columns, rows: c.rows}; customCount = c.columns * c.rows;
  }
  for (const key of Object.keys(out.layers)) {
    const a = input.layers?.[key]; if (!Array.isArray(a) || a.length !== out.width * out.height) throw Error('Layer dimensions do not match the map.');
    if (!a.every(v => Number.isInteger(v) && (key === 'collision' ? v === 0 || v === 1 : v === -1 || v >= 0 && v < builtInCount || v >= 1000 && v < 1000 + customCount))) throw Error('The project contains an invalid tile ID.');
    out.layers[key] = [...a];
  }
  if (!input.spawn || !Number.isInteger(input.spawn.x) || !Number.isInteger(input.spawn.y) || !inside(out, input.spawn.x, input.spawn.y)) throw Error('The spawn must be inside the map.');
  out.spawn = {...input.spawn}; return out;
}
export function canStand(map, px, py, radius = 0.22) {
  for (const x of [px - radius, px + radius]) for (const y of [py - radius, py + radius]) {const cx = Math.floor(x), cy = Math.floor(y); if (!inside(map, cx, cy) || map.layers.collision[cy * map.width + cx]) return false;}
  return true;
}
export class History {
  constructor(limit = 60) {this.limit = limit; this.past = []; this.future = [];}
  commit(before, after) {if (JSON.stringify(before) === JSON.stringify(after)) return false; this.past.push(before); if (this.past.length > this.limit) this.past.shift(); this.future = []; return true;}
  undo(current) {if (!this.past.length) return current; this.future.push(clone(current)); return this.past.pop();}
  redo(current) {if (!this.future.length) return current; this.past.push(clone(current)); return this.future.pop();}
}
