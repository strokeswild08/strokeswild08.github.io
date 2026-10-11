/* Reusable, DOM-free game systems. Also loadable in Node.js for tests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VoidCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  class FixedStepper {
    constructor(step = 1 / 60, maxSteps = 8) {
      this.step = step;
      this.maxSteps = maxSteps;
      this.accumulator = 0;
    }
    advance(elapsed, update) {
      this.accumulator += Math.max(0, Math.min(elapsed, .12));
      let steps = 0;
      while (this.accumulator >= this.step && steps < this.maxSteps) {
        update(this.step);
        this.accumulator -= this.step;
        steps++;
      }
      return this.accumulator / this.step;
    }
    reset() { this.accumulator = 0; }
  }

  class InputBuffer {
    constructor(window = .18) { this.window = window; this.pending = null; }
    push(action) { this.pending = { action, remaining: this.window }; }
    update(dt) {
      if (this.pending) {
        this.pending.remaining -= dt;
        if (this.pending.remaining <= 0) this.pending = null;
      }
    }
    consume(accept) {
      if (!this.pending || !accept(this.pending.action)) return false;
      this.pending = null;
      return true;
    }
    clear() { this.pending = null; }
  }

  class ComboTracker {
    constructor(window = 1.8) { this.window = window; this.reset(); }
    reset() { this.history = []; this.remaining = 0; }
    update(dt) { this.remaining -= dt; if (this.remaining <= 0) this.history = []; }
    hit(action) {
      this.history.push(action);
      this.history = this.history.slice(-3);
      this.remaining = this.window;
      if (this.history.join(',') === 'punch,punch,kick') {
        this.reset();
        return { name: 'VOID EXECUTION', bonus: 7, launch: 280 };
      }
      return null;
    }
  }

  const defaults = () => ({ version: 1, matches: 0, wins: 0, losses: 0,
    bestCombo: 0, damage: 0, parries: 0 });
  class StatsStore {
    constructor(storage, key = 'strokes.void-temple.stats.v1') {
      this.storage = storage;
      this.key = key;
      this.data = defaults();
      try {
        const saved = JSON.parse(storage?.getItem(key) || 'null');
        if (saved?.version === 1) {
          for (const k of Object.keys(this.data)) {
            if (k !== 'version' && Number.isSafeInteger(saved[k]) && saved[k] >= 0)
              this.data[k] = saved[k];
          }
          this.data.matches = this.data.wins + this.data.losses;
        }
      } catch (_) { /* A corrupt or inaccessible save must not stop play. */ }
    }
    record({ won, bestCombo, damage, parries }) {
      this.data.matches++;
      this.data[won ? 'wins' : 'losses']++;
      this.data.bestCombo = Math.max(this.data.bestCombo, bestCombo);
      this.data.damage += Math.round(damage);
      this.data.parries += parries;
      this.save();
    }
    save() { try { this.storage?.setItem(this.key, JSON.stringify(this.data)); } catch (_) {} }
    reset() { this.data = defaults(); this.save(); }
  }
  return { FixedStepper, InputBuffer, ComboTracker, StatsStore };
});
