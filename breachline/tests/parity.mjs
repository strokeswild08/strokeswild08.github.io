import { Weapon } from '../demo/weapon-core.mjs';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

let seed = 7012;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const commands = [['fire', .9], ['reload', 0], ['fire', .9], ['advance', 1.8],
  ['jam', 0], ['reload', 0], ['clear', 0], ['advance', .5], ['fire', .9], ['advance', .5],
  ['fire', .06], ['advance', .15], ['fire', 0], ['clear', 0], ['advance', 1], ['reset', 0]];
const actions = ['fire', 'fire', 'advance', 'advance', 'reload', 'clear', 'jam', 'reset'];
for (let i = 0; i < 20000; ++i) {
  const command = actions[Math.floor(random() * actions.length)];
  commands.push([command, command === 'advance' ? random() * 2 : command === 'fire' ? random() : 0]);
}
const result = spawnSync(process.argv[2] || './tests/build/trace', [], {
  input: commands.map(([c, v]) => `${c} ${v}`).join('\n') + '\n', encoding: 'utf8', maxBuffer: 8 * 1024 * 1024
});
assert.equal(result.status, 0, result.error?.message || result.stderr);
const native = result.stdout.trim().split('\n').map(line => line.split(',').map(Number));
assert.equal(native.length, commands.length);
const w = new Weapon();
for (let i = 0; i < commands.length; ++i) {
  const [command, value] = commands[i]; let output = -1;
  if (command === 'fire') output = w.fire(value);
  if (command === 'advance') w.advance(value);
  if (command === 'reload') output = +w.reload();
  if (command === 'clear') output = +w.clear();
  if (command === 'jam') output = +w.forceJam();
  if (command === 'reset') w.reset();
  const browser = [output, w.phase, w.magazine, w.reserve, w.firedCount, w.remaining, w.progress];
  browser.forEach((v, j) => assert.ok(Math.abs(v - native[i][j]) < 1e-8, `Mismatch at command ${i} ${command}, field ${j}: JS=${v} C++=${native[i][j]}`));
}
for (const invalid of [NaN, Infinity, -1, 1]) {
  w.reset(); assert.equal(w.fire(invalid), 1); assert.equal(w.magazine, 12);
}
console.log(`PASS ${commands.length} command-by-command C++ / browser state comparisons`);
