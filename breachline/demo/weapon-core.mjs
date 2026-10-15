// Browser companion to Source/Breachline/Public/WeaponCore.h.
// tests/parity.mjs compares both implementations after every command.
export const Phase = Object.freeze({ Ready: 0, Reloading: 1, Jammed: 2, Clearing: 3 });
export const Shot = Object.freeze({ Fired: 0, Busy: 1, Empty: 2, Jammed: 3 });
const positive = (n, fallback) => Number.isFinite(n) && n >= .01 ? Math.min(n, 60) : fallback;
export class Weapon {
  constructor(settings = {}) {
    const c = { capacity: 12, initialReserve: 60, shotInterval: .15,
      reloadSeconds: 1.8, clearSeconds: 1, jamProbability: .06, ...settings };
    this.config = Object.freeze({
      capacity: Math.min(1000, Math.max(1, Math.trunc(c.capacity))),
      initialReserve: Math.min(1000000, Math.max(0, Math.trunc(c.initialReserve))),
      shotInterval: positive(c.shotInterval, .15), reloadSeconds: positive(c.reloadSeconds, 1.8),
      clearSeconds: positive(c.clearSeconds, 1),
      jamProbability: Number.isFinite(c.jamProbability) ? Math.min(1, Math.max(0, c.jamProbability)) : .06
    });
    this.reset();
  }
  reset() {
    this.magazine = this.config.capacity; this.reserve = this.config.initialReserve;
    this.phase = Phase.Ready; this.remaining = 0; this.cooldown = 0; this.firedCount = 0;
  }
  advance(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    this.cooldown = Math.max(0, this.cooldown - seconds);
    if (this.phase !== Phase.Reloading && this.phase !== Phase.Clearing) return;
    this.remaining = Math.max(0, this.remaining - seconds);
    if (this.remaining > 1e-9) return;
    if (this.phase === Phase.Reloading) {
      const transfer = Math.min(this.config.capacity - this.magazine, this.reserve);
      this.magazine += transfer; this.reserve -= transfer;
    }
    this.remaining = 0; this.phase = Phase.Ready;
  }
  fire(random01) {
    if (this.phase === Phase.Jammed) return Shot.Jammed;
    if (this.phase !== Phase.Ready || this.cooldown > 1e-9) return Shot.Busy;
    if (this.magazine === 0) return Shot.Empty;
    if (!Number.isFinite(random01) || random01 < 0 || random01 >= 1) return Shot.Busy;
    if (random01 < this.config.jamProbability) { this.phase = Phase.Jammed; return Shot.Jammed; }
    --this.magazine; ++this.firedCount; this.cooldown = this.config.shotInterval;
    return Shot.Fired;
  }
  reload() {
    if (this.phase !== Phase.Ready || this.magazine === this.config.capacity || this.reserve === 0) return false;
    this.phase = Phase.Reloading; this.remaining = this.config.reloadSeconds; return true;
  }
  clear() {
    if (this.phase !== Phase.Jammed) return false;
    this.phase = Phase.Clearing; this.remaining = this.config.clearSeconds; return true;
  }
  forceJam() {
    if (this.phase !== Phase.Ready || this.magazine === 0) return false;
    this.phase = Phase.Jammed; return true;
  }
  get progress() {
    if (this.phase !== Phase.Reloading && this.phase !== Phase.Clearing) return 0;
    return Math.min(1, Math.max(0, 1 - this.remaining /
      (this.phase === Phase.Reloading ? this.config.reloadSeconds : this.config.clearSeconds)));
  }
}
