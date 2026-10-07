import test from 'node:test';
import assert from 'node:assert/strict';
import {createState, getUnit} from '../src/state.js';
import {movementPreview, impactCells} from '../src/preview.js';
import {Renderer, project} from '../src/renderer.js';
import {Camera} from '../src/camera.js';
import {Effects} from '../src/effects.js';

test('route preview reports the exact cost without spending movement or changing state', () => {
  const state = createState(), hero = getUnit(state, 'rowan');
  const before = JSON.stringify(state);
  const preview = movementPreview(state, hero, {x: 2, y: 7});
  assert.equal(preview.cost, 2);
  assert.equal(preview.remaining, 2);
  assert.deepEqual(preview.path.at(-1), {x: 2, y: 7});
  assert.equal(movementPreview(state, hero, {x: 3, y: 8}), null);
  assert.equal(JSON.stringify(state), before);
});

test('impact preview follows the burst diamond and stops piercing at a wall', () => {
  const state = createState();
  state.grid.forEach(cell => cell.blocked = false);
  const mage = getUnit(state, 'kael'), ranger = getUnit(state, 'lyra');
  mage.x = 2; mage.y = 5;
  const enemy = getUnit(state, 'raider-a');
  enemy.x = 4; enemy.y = 5;
  const before = JSON.stringify(state);
  assert.deepEqual(impactCells(state, mage, enemy, 'burst').map(p => [p.x, p.y]),
    [[4, 4], [3, 5], [4, 5], [5, 5], [4, 6]]);
  assert.equal(JSON.stringify(state), before);
  ranger.x = 1; ranger.y = 5;
  state.grid[5 * 10 + 5].blocked = true;
  assert.deepEqual(impactCells(state, ranger, enemy, 'pierce').map(p => [p.x, p.y]),
    [[2, 5], [3, 5], [4, 5]]);
  assert.deepEqual(impactCells(state, ranger, {x: 4, y: 4}, 'pierce'), []);
});

test('valid attack tiles remain clickable behind an overlapping ally at any camera zoom', () => {
  const state = createState(), camera = new Camera();
  const guard = getUnit(state, 'guard-a'), mage = getUnit(state, 'kael'), ranger = getUnit(state, 'lyra');
  guard.x = 4; guard.y = 5;
  mage.x = 5; mage.y = 6;
  ranger.x = 4; ranger.y = 6;
  const renderer = new Renderer({getContext: () => ({})}, {}, camera, new Effects());
  const ground = project(guard.x, guard.y);
  for (const zoom of [0.7, 1, 1.6]) {
    camera.zoom = zoom; camera.x = 25; camera.y = -15;
    const cursor = camera.screen(ground.x, ground.y + 10);
    assert.equal(renderer.pick(state, cursor.x, cursor.y).unit.id, 'kael');
    const hit = renderer.pick(state, cursor.x, cursor.y, {selected: 'lyra', mode: 'attack', busy: false});
    assert.equal(hit.unit.id, 'guard-a');
    assert.deepEqual([hit.x, hit.y], [4, 5]);
  }
});

test('an area spell keeps the pointed ground cell even when an allied sprite overlaps it', () => {
  const state = createState(), mage = getUnit(state, 'kael'), knight = getUnit(state, 'rowan');
  const guard = getUnit(state, 'guard-a');
  mage.x = 3; mage.y = 6; knight.x = 5; knight.y = 6;
  guard.x = 4; guard.y = 5;
  const renderer = new Renderer({getContext: () => ({})}, {}, new Camera(), new Effects());
  const cursor = project(4, 5);
  const hit = renderer.pick(state, cursor.x, cursor.y + 10,
    {selected: 'kael', mode: 'ability', ability: 'burst', busy: false});
  assert.deepEqual([hit.x, hit.y], [4, 5]);
});
