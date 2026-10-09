import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, presets, sanitize, synthesize, encodeWav, SAMPLE_RATE } from './synth.mjs';

test('all presets render finite, non-silent samples with bounded peaks and quiet endpoints', () => {
  for (const preset of presets) {
    const settings = sanitize({ ...defaults, ...preset.settings }), samples = synthesize(settings);
    assert.equal(samples.length, Math.ceil((settings.duration + (settings.echo ? .54 : .02)) * SAMPLE_RATE));
    let peak = 0;
    for (const sample of samples) { assert.ok(Number.isFinite(sample)); peak = Math.max(peak, Math.abs(sample)); }
    assert.ok(peak > .01 && peak <= .85, preset.name);
    assert.equal(samples[0], 0); assert.ok(Math.abs(samples.at(-1)) < .001);
  }
});
test('recipes render deterministically and seed changes affect noise', () => {
  const recipe = { ...defaults, noise: .6, seed: 351 };
  assert.deepEqual(synthesize(recipe), synthesize(JSON.parse(JSON.stringify(recipe))));
  assert.notDeepEqual(synthesize(recipe), synthesize({ ...recipe, seed: 352 }));
});
test('invalid or out-of-bounds settings recover safely', () => {
  const recipe = sanitize({ wave: '<script>', start: -100, end: Infinity, echo: 20, duration: 'invalid' });
  assert.equal(recipe.wave, 'sine'); assert.equal(recipe.start, 30); assert.equal(recipe.end, defaults.end);
  assert.equal(recipe.echo, .75); assert.equal(recipe.duration, defaults.duration);
  assert.ok(synthesize(recipe).every(Number.isFinite));
  assert.throws(() => synthesize(recipe, 0), RangeError);
});
test('WAV exports the complete mono PCM buffer with correct sizes and sample conversion', () => {
  const samples = new Float32Array([-1, -.5, 0, .5, 1]), buffer = encodeWav(samples), view = new DataView(buffer);
  const text = (from, length) => String.fromCharCode(...new Uint8Array(buffer, from, length));
  assert.equal(text(0, 4), 'RIFF'); assert.equal(text(8, 4), 'WAVE'); assert.equal(text(12, 4), 'fmt '); assert.equal(text(36, 4), 'data');
  assert.equal(view.getUint32(4, true), buffer.byteLength - 8); assert.equal(view.getUint16(20, true), 1); assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 44100); assert.equal(view.getUint32(28, true), 88200); assert.equal(view.getUint16(32, true), 2); assert.equal(view.getUint16(34, true), 16);
  assert.equal(view.getUint32(40, true), samples.length * 2);
  assert.equal(view.getInt16(44, true), -32768); assert.equal(view.getInt16(48, true), 0); assert.equal(view.getInt16(52, true), 32767);
});
