const assert = require('node:assert/strict');
const { Grid, Search, MinHeap } = require('../pathfinding.js');
const solve = (grid, a, b, algorithm) => new Search(grid, a, b, algorithm).run();
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; }

const heap = new MinHeap(); heap.push(3, 5); heap.push(1, 1); heap.push(2, 1);
assert.deepEqual([heap.pop().id, heap.pop().id, heap.pop().id], [1, 2, 3]); check(heap.pop() === null, 'empty heap');
const empty = new Grid(8, 6);
for (const algorithm of ['astar', 'dijkstra', 'bfs']) {
  const r = solve(empty, 0, 47, algorithm); check(r.found && r.steps === 12 && r.cost === 12, `${algorithm} on open grid`);
  const same = solve(empty, 10, 10, algorithm); check(same.cost === 0 && same.steps === 0, `${algorithm} same endpoint`);
}
const weighted = new Grid(5, 3); weighted.cells[6] = weighted.cells[7] = weighted.cells[8] = 4;
check(solve(weighted, 5, 9, 'bfs').cost === 13, 'BFS picks the four-step route regardless of cost');
check(solve(weighted, 5, 9, 'astar').cost === 6, 'A* takes cheaper detour');
check(solve(weighted, 5, 9, 'dijkstra').cost === 6, 'Dijkstra takes cheaper detour');
const blocked = new Grid(4, 4); for(let y=0;y<4;y++) blocked.cells[y*4+1]=0;
for(const algorithm of ['astar','dijkstra','bfs']) check(!solve(blocked,0,3,algorithm).found, 'unreachable destination');
assert.deepEqual(new Grid(3,3).neighbors(2),[5,1],'no wrapping across grid edge');
assert.throws(()=>new Grid(1000,2));assert.throws(()=>new Grid(2,2,[1,1,-1,1]));assert.throws(()=>Grid.fromJSON({version:2}));
assert.throws(()=>Grid.fromJSON({version:1,cols:2,rows:2,cells:[0,1,1,1],start:0,goal:3}));
assert.deepEqual(Grid.fromJSON(weighted.toJSON(5,9)).grid.cells,weighted.cells);
const snapshot = new Search(empty,0,47);empty.cells.fill(0);check(snapshot.run().found,'search snapshots the map');

// Independent Bellman-Ford reference over generated weighted maps.
function reference(grid,start,goal) {
  const d=Array(grid.cells.length).fill(Infinity);d[start]=0;
  for(let k=0;k<grid.cells.length-1;k++) { let changed=false; for(let id=0;id<d.length;id++) {
    if (!grid.cells[id]||!Number.isFinite(d[id])) continue;
    for(const n of grid.neighbors(id)) if(d[id]+grid.cells[n]<d[n]) {d[n]=d[id]+grid.cells[n];changed=true;}
  } if(!changed)break; }
  return d[goal];
}
let seed=7301;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
for(let sample=0;sample<120;sample++) {
  const grid=new Grid(9,7);grid.cells=grid.cells.map(()=>{const r=random();return r<.23?0:r<.55?4:1;});grid.cells[0]=grid.cells[62]=1;
  const expected=reference(grid,0,62);
  for(const algorithm of ['astar','dijkstra']) {
    const r=solve(grid,0,62,algorithm);check(r.found===Number.isFinite(expected),'reachability matches independent oracle');
    check(r.cost===(Number.isFinite(expected)?expected:null),'cost matches independent oracle');
    if(r.found)for(let i=1;i<r.path.length;i++)check(grid.neighbors(r.path[i-1]).includes(r.path[i]),'every route segment is walkable and adjacent');
  }
}
console.log(`PASS: ${checks} pathfinding assertions, including 120 weighted maps checked against Bellman-Ford.`);
