import { randomStream, hashSeed } from './random.js';

export const VERSION = 1;
export const DEFAULT_CONFIG = Object.freeze({ seed: 'PORT-062', size: 5, density: 78, height: 58, greenery: 24 });
export const PRESETS = Object.freeze({
  riverfront: { ...DEFAULT_CONFIG },
  downtown: { seed: 'CENTRAL-008', size: 6, density: 92, height: 93, greenery: 12 },
  garden: { seed: 'GARDEN-314', size: 5, density: 62, height: 28, greenery: 48 },
});

const LIMITS = { size: [4, 7], density: [35, 100], height: [15, 100], greenery: [5, 60] };
const TINTS = {
  oldtown: ['#e4aa87', '#d5b99b', '#c68162', '#e5c7a1', '#d3a67d'],
  downtown: ['#96b3ab', '#aec4bb', '#c8c9b7', '#72968e', '#d6cbb4'],
  midtown: ['#cebea3', '#c9a284', '#b4b8a0', '#e3c8ab', '#aebbb0'],
};

export function normalizeConfig(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('City settings must be an object.');
  const config = { ...DEFAULT_CONFIG };
  if (input.seed !== undefined) {
    if (typeof input.seed !== 'string' || !input.seed.trim() || input.seed.length > 64) throw new Error('Use a seed between 1 and 64 characters.');
    config.seed = input.seed.trim();
  }
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key])) throw new Error(`${key} must be a number.`);
    config[key] = Math.round(Math.max(min, Math.min(max, input[key])));
  }
  return config;
}

function cutLines(rng, columns, rows) {
  const right = Array.from({ length: columns + 1 }, (_, i) => 17 + i * 26 + (i > 0 && i < columns ? rng.range(-3, 3) : 0));
  const left = Array.from({ length: columns + 1 }, (_, i) => -17 - (columns - i) * 26 + (i > 0 && i < columns ? rng.range(-3, 3) : 0));
  const z = Array.from({ length: rows + 1 }, (_, i) => (i - rows / 2) * 29 + (i > 0 && i < rows ? rng.range(-2.4, 2.4) : 0));
  return { left, right, z };
}

function roadNetwork(cuts) {
  const nodes = [], edges = [], ids = new Map();
  const addNode = (x, z) => {
    const key = `${x}:${z}`;
    if (!ids.has(key)) {
      ids.set(key, nodes.length);
      nodes.push({ id: nodes.length, x, z, neighbors: [] });
    }
    return ids.get(key);
  };
  const connect = (ax, az, bx, bz, bridge = false) => {
    const a = addNode(ax, az), b = addNode(bx, bz);
    const length = Math.hypot(bx - ax, bz - az);
    edges.push({ a, b, length, bridge });
    nodes[a].neighbors.push(b);
    nodes[b].neighbors.push(a);
  };
  for (const bank of [cuts.left, cuts.right]) {
    for (let i = 0; i < bank.length; i++) {
      for (let j = 0; j < cuts.z.length - 1; j++) connect(bank[i], cuts.z[j], bank[i], cuts.z[j + 1]);
    }
    for (const z of cuts.z) {
      for (let i = 0; i < bank.length - 1; i++) connect(bank[i], z, bank[i + 1], z);
    }
  }
  const rows = cuts.z.length - 1;
  const bridges = [...new Set([1, Math.round(rows / 2), rows - 1])].map(i => cuts.z[i]);
  for (const z of bridges) connect(cuts.left.at(-1), z, cuts.right[0], z, true);
  return { nodes, edges, bridges };
}

function populateBlock(block, config) {
  const rng = randomStream(`${config.seed}:parcel:${block.id}`);
  const buildings = [], trees = [];
  const mx = (block.x0 + block.x1) / 2, mz = (block.z0 + block.z1) / 2;
  const innerW = block.x1 - block.x0 - 7.8, innerD = block.z1 - block.z0 - 7.8;
  const addTree = (x, z) => trees.push({ x, z, scale: rng.range(0.78, 1.3), variant: rng.int(0, 2) });

  if (block.kind === 'park') {
    for (let ix = 0; ix < 3; ix++) for (let iz = 0; iz < 3; iz++) {
      // Keep the central crossing open for the footpaths and fountain.
      if (ix === 1 || iz === 1) continue;
      addTree(mx + (ix - 1) * innerW * 0.31, mz + (iz - 1) * innerD * 0.31);
      if (rng() > 0.35) addTree(mx + (ix - 1) * innerW * 0.36 + 2, mz + (iz - 1) * innerD * 0.24);
    }
    return { buildings, trees };
  }

  const slotsX = innerW > 22 ? 3 : 2, slotsZ = innerD > 24 ? 3 : 2;
  const cellW = innerW / slotsX, cellD = innerD / slotsZ;
  for (let iz = 0; iz < slotsZ; iz++) for (let ix = 0; ix < slotsX; ix++) {
    const x = block.x0 + 3.9 + (ix + 0.5) * cellW;
    const z = block.z0 + 3.9 + (iz + 0.5) * cellD;
    if (rng() * 100 > config.density) {
      addTree(x - 0.9, z); addTree(x + 1.8, z + 1.5);
      continue;
    }
    const centrality = Math.exp(-((x - 44) ** 2 + z ** 2) / 2300);
    let floors = block.district === 'oldtown' ? rng.int(2, 4) : rng.int(2, 5);
    if (block.district === 'downtown') floors += Math.round(centrality * config.height * rng.range(0.055, 0.13));
    else floors += Math.round(config.height * rng.range(0, 0.025));
    floors = Math.max(1, Math.round(floors * (0.42 + config.height / 105)));
    const style = floors > 6 ? 'tower' : (block.district === 'oldtown' || rng() < 0.32 ? 'gable' : 'terrace');
    buildings.push({
      id: `${block.id}-${ix}-${iz}`, block: block.id, district: block.district,
      x, z, width: cellW - rng.range(1.25, 2.35), depth: cellD - rng.range(1.3, 2.4),
      height: floors * 2.45, floors, style, color: rng.pick(TINTS[block.district]),
      roof: rng.pick(['#ad674d', '#bc765b', '#8c6e5c', '#c08b6a']), detail: rng(),
      use: floors > 7 ? 'Offices + ground-floor shops' : style === 'gable' ? 'Neighborhood housing' : 'Apartments + local shops',
    });
  }
  // A row of street trees within the block curb, away from all parcel footprints.
  for (let z = block.z0 + 3; z < block.z1 - 3; z += 9) addTree(block.x0 + 2.7, z);
  return { buildings, trees };
}

/** Pure data first: layout, then parcels, then details. Rendering never changes the plan. */
export function generateCity(input = {}) {
  const config = normalizeConfig(input);
  const columns = config.size >= 7 ? 4 : 3;
  const cuts = cutLines(randomStream(`${config.seed}:streets`), columns, config.size);
  const roads = roadNetwork(cuts), blocks = [], buildings = [], trees = [];
  const zoneRng = randomStream(`${config.seed}:zoning`);
  for (const [side, bank] of [['west', cuts.left], ['east', cuts.right]]) {
    for (let ix = 0; ix < columns; ix++) for (let iz = 0; iz < config.size; iz++) {
      const district = side === 'west' ? 'oldtown' : ix < 2 ? 'downtown' : 'midtown';
      const civic = side === 'west' && ix === columns - 1 && iz === Math.floor(config.size / 2);
      const block = {
        id: `${side}-${ix}-${iz}`, district, x0: bank[ix], x1: bank[ix + 1], z0: cuts.z[iz], z1: cuts.z[iz + 1],
        kind: civic || zoneRng() * 100 < config.greenery ? 'park' : 'built', civic,
      };
      blocks.push(block);
      const detail = populateBlock(block, config);
      buildings.push(...detail.buildings); trees.push(...detail.trees);
    }
  }
  // Riverside promenade trees, separated from roads at x = +/-17 and bridges.
  const detailRng = randomStream(`${config.seed}:waterfront`);
  for (const x of [-12.4, 12.4]) for (let z = cuts.z[0] + 5; z < cuts.z.at(-1) - 4; z += 9) {
    if (roads.bridges.every(bridge => Math.abs(z - bridge) > 4.5)) trees.push({ x, z, scale: detailRng.range(0.85, 1.15), variant: 1 });
  }
  const area = blocks.reduce((sum, b) => sum + (b.x1 - b.x0) * (b.z1 - b.z0), 0);
  const greenArea = blocks.filter(b => b.kind === 'park').reduce((sum, b) => sum + (b.x1 - b.x0) * (b.z1 - b.z0), 0);
  return {
    version: VERSION, config, fingerprint: hashSeed(JSON.stringify(config)).toString(16).padStart(8, '0'),
    bounds: { minX: cuts.left[0] - 4.5, maxX: cuts.right.at(-1) + 4.5, minZ: cuts.z[0] - 4.5, maxZ: cuts.z.at(-1) + 4.5 },
    cuts, roads, blocks, buildings, trees,
    stats: { buildings: buildings.length, blocks: blocks.length, parks: blocks.filter(b => b.kind === 'park').length,
      trees: trees.length, greenPercent: Math.round(greenArea / area * 100),
      tallest: Math.round(Math.max(0, ...buildings.map(b => b.height))),
      roadLength: Math.round(roads.edges.reduce((sum, edge) => sum + edge.length, 0)) },
  };
}

export function serializeCity(city) {
  return JSON.stringify({ format: 'blockline-city', version: VERSION, ...city }, null, 2);
}

export function configFromDocument(value) {
  if (!value || value.format !== 'blockline-city' || value.version !== VERSION) throw new Error('Choose a Blockline city JSON (version 1).');
  return normalizeConfig(value.config);
}
