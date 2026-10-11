# Route Lab — The Strokes Studio

**[Open the interactive demo](https://strokeswild08.github.io/pathfinding-lab/)**

A JavaScript pathfinding project for game navigation. Draw a map, add walls and slow terrain, animate a search, and compare A*, Dijkstra and breadth-first search.

## Features
- Reusable, dependency-free search engine with a stable binary min-heap.
- A* with an admissible Manhattan heuristic, Dijkstra and BFS.
- Weighted tiles, four-direction movement and obstacle checks.
- Step-by-step search with frontier/visited visualization, pause and resume.
- Route-following agent marker and comparison table.
- Map JSON import/export with validated dimensions, terrain and endpoints.
- Pointer painting and keyboard grid editing.
- Snapshot-based searches so changes to the original grid cannot alter an active run.

BFS minimizes steps; it does not minimize weighted travel cost. Costs exclude the start tile. Routes use cardinal neighbors and do not allow diagonal movement.

## Run
Open `index.html` or run `python3 -m http.server 8080` in this folder. Visit `http://localhost:8080`.

Run `npm test` and `npm run check`; no `npm install` is needed.

## Use the engine in a game
```js
// Browser: include pathfinding.js first. Node: require('./pathfinding.js').
const { Grid, Search } = Pathfinding;
const world = new Grid(20, 12);
world.cells[25] = 0; // wall
world.cells[26] = 4; // slow terrain
const route = new Search(world, 0, 239, 'astar').run();
if (route.found) console.log(route.path, route.cost);
```

For a search spread over multiple frames, call `search.step()` until `search.done`. Render `search.visited`, `search.frontier` and `search.path` as needed.

## Files
| File | Purpose |
| --- | --- |
| `pathfinding.js` | Heap, grid validation, A*, Dijkstra, BFS |
| `app.js` | Editor, search playback, route animation, map transfer |
| `index.html` / `style.css` | Responsive interface |
| `tests/pathfinding.cjs` | Regression tests and independent shortest-path oracle |

## Verification
Tests cover weighted detours, unreachable goals, equal endpoints, boundary behavior, snapshot isolation, map validation and stable priority ordering. A* and Dijkstra costs are checked on 120 deterministic weighted maps against an independent Bellman-Ford implementation. Browser appearance, pointer behavior and screen-reader usability still need human verification.

## Credits
The Strokes Studio / Owais. Original JavaScript and procedural Canvas graphics. All rights reserved; see LICENSE.
