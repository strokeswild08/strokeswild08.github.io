import { randomStream } from './random.js';

/** Cars follow edges, never interpolate across unrelated streets or the river. */
export class Traffic {
  constructor(city, count = 42) {
    this.nodes = city.roads.nodes;
    this.rng = randomStream(`${city.config.seed}:traffic`);
    this.cars = Array.from({ length: count }, (_, id) => {
      const from = this.rng.int(0, this.nodes.length - 1);
      return { id, from, to: this.rng.pick(this.nodes[from].neighbors), progress: this.rng(), speed: this.rng.range(5.5, 9), color: this.rng.int(0, 5) };
    });
  }

  update(seconds) {
    // Clamp suspension/hidden-tab deltas; this is ambient traffic, not a traffic simulator.
    const dt = Math.min(Math.max(0, seconds), 0.1);
    for (const car of this.cars) {
      let a = this.nodes[car.from], b = this.nodes[car.to];
      car.progress += dt * car.speed / Math.hypot(b.x - a.x, b.z - a.z);
      if (car.progress >= 1) {
        const options = b.neighbors.filter(n => n !== car.from);
        car.from = car.to;
        car.to = this.rng.pick(options.length ? options : b.neighbors);
        car.progress %= 1;
        a = this.nodes[car.from]; b = this.nodes[car.to];
      }
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      const dx = (b.x - a.x) / length, dz = (b.z - a.z) / length;
      car.x = a.x + (b.x - a.x) * car.progress - dz * 0.83;
      car.z = a.z + (b.z - a.z) * car.progress + dx * 0.83;
      car.heading = Math.atan2(dx, dz);
    }
    return this.cars;
  }
}
