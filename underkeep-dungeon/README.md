# Underkeep — Procedural Dungeon Atlas

A playable JavaScript dungeon generator for the Wild Strokes portfolio. Draw a map from a seed, explore its connected chambers, recover a brass key and five lost relics, then find the exit gate.

The interface uses a parchment notebook beside a green stone dungeon map. All tiles, props, lights, markers and the explorer are drawn in code. No external images, fonts or game engine are required.

## Play

[Live demo](https://strokeswild08.github.io/underkeep-dungeon/) · [Source](https://github.com/strokeswild08/strokeswild08.github.io/tree/main/underkeep-dungeon)

For local use, extract the complete folder and open `index.html` in a recent desktop browser. Keep `app.js`, `dungeon.js` and `style.css` alongside it.

- **WASD / arrows:** move. Focus the map if a control has keyboard focus.
- **Click floor:** find and follow a shortest route. Movement keys cancel the route.
- **Fog of war:** switch from the default full-map view to line-of-sight exploration. Discovered areas remain dimly visible.
- **Zoom:** fit the map, or zoom in with the camera following the explorer.
- **Objectives:** automatically collect the key and every relic by walking over them. The exit opens after all items are recovered.
- **Restart this map:** clear progress while preserving its layout.
- **Random seed:** draw a fresh expedition.

On narrow screens the map appears above the notebook. Click-to-walk supports pointer or touch interaction; keyboard movement needs a keyboard. There is no virtual joystick.

## Generation controls

- Text seeds up to 48 characters.
- Small (48×32), medium (64×40), or large (80×48) grids.
- A target of 6–18 chambers.
- Extra corridor connections from none to many.

Same seed and settings produce the same layout in this implementation. Binary space partitioning divides the map into leaves; each leaf receives a non-overlapping room. A minimum-cost room connection tree creates L-shaped corridors. Optional extra edges add alternate routes. Every floor tile belongs to one connected component, and the exit is placed at a farthest reachable tile from the spawn.

Chamber count is a target: splitting stops if remaining leaves cannot safely split. Extra corridors can cross rooms or existing corridors. This is a small reproducible generator, not a complete commercial dungeon game.

## Checkpoints and exports

**Save checkpoint** stores settings, player position, collected item IDs, explored tiles and completion state in `localStorage`. **Load checkpoint** reconstructs the same map and validates the saved data. Saves are local to this browser and origin; opening the hosted demo and a local copy does not share checkpoints. Browser storage restrictions or clearing browser data can make saves unavailable. New maps do not automatically overwrite the checkpoint.

**Map PNG** exports the complete 960×640 map without fog, the explorer or a navigation route. It includes objective markers and decorative props. **Map JSON** exports the level data: settings, dimensions, tiles, rooms, connection edges, spawn, exit and items. It does not export the current checkpoint or import a custom map.

JSON tiles use `0 = wall` and `1 = floor`, in row-major order (`y * width + x`). Player coordinates are continuous tile coordinates; item, room and exit coordinates use integer grid cells. Decorative props do not block movement. The JSON is engine-neutral data, not a Godot scene or Unreal map.

## Reuse the generator

`dungeon.js` is independent of browser UI and can run in Node:

```js
const D = require('./dungeon.js');
const map = D.generate({seed: 'MY-EXPEDITION', size: 'medium', rooms: 12, loops: 0.5});
const route = D.path(map, map.spawn, map.exit);
console.log(route.length, map.items);
```

It exports seeded generation, grid checks, BFS distance fields and shortest routes, wall-aware visibility, collision-aware movement, collection state and validated checkpoints. Movement steps are limited to 0.4 tile per axis to avoid tunnelling through walls; the demo caps elapsed time and normalizes keyboard diagonals.

Fog-of-war click routing is restricted to explored floor tiles. Turning fog off allows routes through the whole map. Keyboard exploration reveals nearby cells with wall occlusion. The independent map artwork is cached to an offscreen canvas for reuse while rendering.

## Test

Node.js 22 or newer is needed only for development checks:

```sh
node tests/dungeon.test.cjs
node tests/ui.test.cjs
```

The tests include 300 layout configurations, connected floors, room separation, reachable objectives, pathfinding, visibility, collisions, checkpoint validation and complete objective-to-exit navigation through the UI harness. `VERIFICATION.md` distinguishes real code checks from simulated DOM/canvas checks.

## Scope

No combat, enemies, sound, multiplayer, arbitrary map import, automated browser QA or engine integration is included. Map seeds and placement are deterministic for generator version 1; a changed generation algorithm would need save migration. Checkpoint validation checks structure and positions; it is not an anti-cheat system.

Live browser performance and visual layout need a browser check, particularly on older PCs. The small map and fit view are the lightest settings. No private client assets, personal contacts, network APIs or third-party art are included.

The bundled LICENSE permits viewing and running for evaluation. No MIT or other permissive reuse license is selected. Public source can still be viewed and downloaded.
