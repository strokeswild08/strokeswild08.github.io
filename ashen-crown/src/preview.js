import {distance, inside, pathTo, tile, unitAt} from './grid.js';
import {validTarget} from './combat.js';
import {abilities} from './characters.js';
import {canAct} from './turns.js';

// Preview uses the same rules as the committed action, without changing state.
export function movementPreview(state, unit, point) {
  if (!point || !canAct(state, unit)) return null;
  const path = pathTo(state, unit, point);
  if (!path?.length) return null;
  return {path, cost: path.length, remaining: unit.remaining - path.length};
}

export function impactCells(state, unit, point, ability = 'basic') {
  if (!point || !canAct(state, unit) || !validTarget(state, unit, point, ability).ok) return [];
  if (ability === 'burst') {
    return state.grid.filter(cell => !cell.blocked && distance(cell, point) <= 1);
  }
  if (ability === 'pierce') {
    const dx = Math.sign(point.x - unit.x), dy = Math.sign(point.y - unit.y);
    const cells = [];
    for (let step = 1; step <= abilities.pierce.range; step++) {
      const cell = {x: unit.x + dx * step, y: unit.y + dy * step};
      if (!inside(cell.x, cell.y) || tile(state, cell.x, cell.y).blocked) break;
      cells.push(cell);
    }
    return cells;
  }
  return [point];
}

export function targetAtCell(state, point) {
  return unitAt(state, point.x, point.y) ||
    (state.crystal.x === point.x && state.crystal.y === point.y && state.crystal.hp > 0 ? state.crystal : null);
}
