/* Pure JavaScript grid search. Browser global + CommonJS, zero dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Pathfinding = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  class MinHeap {
    constructor() { this.items = []; this.serial = 0; }
    less(a, b) { return a.priority < b.priority || (a.priority === b.priority && a.order < b.order); }
    push(id, priority) {
      const item = { id, priority, order: this.serial++ };
      this.items.push(item);
      let i = this.items.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (!this.less(item, this.items[p])) break;
        this.items[i] = this.items[p]; i = p;
      }
      this.items[i] = item;
    }
    pop() {
      if (!this.items.length) return null;
      const first = this.items[0], last = this.items.pop();
      if (this.items.length) {
        let i = 0;
        while (i * 2 + 1 < this.items.length) {
          let child = i * 2 + 1;
          if (child + 1 < this.items.length && this.less(this.items[child + 1], this.items[child])) child++;
          if (!this.less(this.items[child], last)) break;
          this.items[i] = this.items[child]; i = child;
        }
        this.items[i] = last;
      }
      return first;
    }
    get size() { return this.items.length; }
  }

  class Grid {
    constructor(cols, rows, cells) {
      if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 2 || rows < 2 || cols > 100 || rows > 100)
        throw new Error('Grid dimensions must be integers between 2 and 100.');
      this.cols = cols; this.rows = rows;
      this.cells = cells ? Array.from(cells) : Array(cols * rows).fill(1);
      if (this.cells.length !== cols * rows || !this.cells.every(c => c === 0 || c === 1 || c === 4))
        throw new Error('Each cell must be 0 (wall), 1 (ground), or 4 (slow terrain).');
    }
    valid(id) { return Number.isInteger(id) && id >= 0 && id < this.cells.length; }
    neighbors(id) {
      const x = id % this.cols, y = Math.floor(id / this.cols), next = [];
      if (x + 1 < this.cols) next.push(id + 1);
      if (y + 1 < this.rows) next.push(id + this.cols);
      if (x > 0) next.push(id - 1);
      if (y > 0) next.push(id - this.cols);
      return next.filter(n => this.cells[n] !== 0);
    }
    distance(a, b) {
      return Math.abs(a % this.cols - b % this.cols) + Math.abs(Math.floor(a / this.cols) - Math.floor(b / this.cols));
    }
    static fromJSON(value) {
      if (!value || value.version !== 1) throw new Error('Unsupported map. Expected version 1.');
      const grid = new Grid(value.cols, value.rows, value.cells);
      if (!grid.valid(value.start) || !grid.valid(value.goal) || !grid.cells[value.start] || !grid.cells[value.goal])
        throw new Error('Start and goal must be on walkable cells.');
      return { grid, start: value.start, goal: value.goal };
    }
    toJSON(start, goal) { return { version: 1, cols: this.cols, rows: this.rows, cells: this.cells.slice(), start, goal }; }
  }

  class Search {
    constructor(grid, start, goal, algorithm = 'astar') {
      if (!(grid instanceof Grid) || !grid.valid(start) || !grid.valid(goal) || !grid.cells[start] || !grid.cells[goal])
        throw new Error('Search needs a valid grid and walkable endpoints.');
      if (!['astar', 'dijkstra', 'bfs'].includes(algorithm)) throw new Error('Unknown algorithm.');
      // Snapshot the map so editor mutations cannot change a running search.
      this.grid = new Grid(grid.cols, grid.rows, grid.cells);
      this.start = start; this.goal = goal; this.algorithm = algorithm;
      this.open = new MinHeap(); this.open.push(start, this.heuristic(start));
      this.frontier = new Set([start]); this.visited = new Set();
      this.distance = new Map([[start, 0]]); this.parent = new Map();
      this.done = false; this.found = false; this.path = []; this.cost = null;
    }
    heuristic(id) { return this.algorithm === 'astar' ? this.grid.distance(id, this.goal) : 0; }
    step() {
      if (this.done) return null;
      let item;
      do { item = this.open.pop(); } while (item && this.visited.has(item.id));
      if (!item) { this.done = true; return null; }
      const id = item.id;
      this.frontier.delete(id); this.visited.add(id);
      if (id === this.goal) {
        this.done = true; this.found = true;
        let node = id;
        while (node !== undefined) { this.path.push(node); node = this.parent.get(node); }
        this.path.reverse();
        this.cost = this.path.slice(1).reduce((sum, n) => sum + this.grid.cells[n], 0);
        return id;
      }
      for (const neighbor of this.grid.neighbors(id)) {
        if (this.visited.has(neighbor)) continue;
        const weight = this.algorithm === 'bfs' ? 1 : this.grid.cells[neighbor];
        const score = this.distance.get(id) + weight;
        if (score < (this.distance.get(neighbor) ?? Infinity)) {
          this.distance.set(neighbor, score); this.parent.set(neighbor, id);
          this.open.push(neighbor, score + this.heuristic(neighbor)); this.frontier.add(neighbor);
        }
      }
      return id;
    }
    run() { while (!this.done) this.step(); return this.result(); }
    result() { return { found: this.found, path: this.path.slice(), cost: this.cost, expanded: this.visited.size, steps: this.found ? this.path.length - 1 : null }; }
  }
  return { MinHeap, Grid, Search };
});
