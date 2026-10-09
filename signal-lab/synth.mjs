/** Signal Lab: deterministic mono SFX synthesis and PCM WAV encoding. */
export const SAMPLE_RATE = 44100;
export const defaults = Object.freeze({ wave: 'sine', start: 680, end: 180, duration: 0.38, attack: 0.008, noise: 0.04, cutoff: 8000, drive: 0, echo: 0, volume: 0.65, seed: 42 });
export const presets = Object.freeze([
  { id: 'laser', name: 'Laser', family: 'COMBAT', key: '1', description: 'A bright pulse with a fast falling pitch.', settings: { wave: 'saw', start: 1400, end: 110, duration: .24, cutoff: 4600, drive: .25, echo: .22 } },
  { id: 'coin', name: 'Coin', family: 'REWARDS', key: '2', description: 'A small, glassy reward with a rising tail.', settings: { wave: 'square', start: 880, end: 1760, duration: .18, noise: 0, cutoff: 6200, echo: .2 } },
  { id: 'jump', name: 'Jump', family: 'MOVEMENT', key: '3', description: 'A rounded upward sweep for a nimble character.', settings: { wave: 'triangle', start: 160, end: 720, duration: .23, noise: .015, cutoff: 6000 } },
  { id: 'impact', name: 'Impact', family: 'COMBAT', key: '4', description: 'A low thump with grit at the front.', settings: { wave: 'sine', start: 180, end: 38, duration: .34, noise: .48, cutoff: 1400, drive: .5 } },
  { id: 'confirm', name: 'Confirm', family: 'INTERFACE', key: '5', description: 'A warm, clean cue for a successful action.', settings: { wave: 'sine', start: 520, end: 1040, duration: .3, noise: 0, cutoff: 8000, echo: .28 } },
  { id: 'error', name: 'Error', family: 'INTERFACE', key: '6', description: 'A short descending buzz with a soft edge.', settings: { wave: 'square', start: 210, end: 115, duration: .3, noise: .02, cutoff: 1800, drive: .2 } },
  { id: 'power', name: 'Power-up', family: 'REWARDS', key: '7', description: 'A long rising shimmer for a new ability.', settings: { wave: 'triangle', start: 220, end: 2200, duration: .7, attack: .03, noise: .025, cutoff: 9000, echo: .4 } },
  { id: 'portal', name: 'Portal', family: 'WORLD', key: '8', description: 'An airy downward sweep with a lingering echo.', settings: { wave: 'sine', start: 1300, end: 75, duration: 1.05, attack: .13, noise: .35, cutoff: 2400, echo: .58 } }
]);
const limits = { start: [30, 3000], end: [30, 3000], duration: [.08, 1.5], attack: [.002, .2], noise: [0, 1], cutoff: [200, 12000], drive: [0, 1], echo: [0, .75], volume: [0, 1], seed: [1, 2147483646] };
export function sanitize(input = {}) {
  const result = { ...defaults };
  result.wave = ['sine', 'triangle', 'square', 'saw'].includes(input.wave) ? input.wave : defaults.wave;
  for (const [key, [min, max]] of Object.entries(limits)) {
    const value = Number(input[key] ?? defaults[key]);
    result[key] = Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : defaults[key];
  }
  result.seed = Math.floor(result.seed);
  return result;
}
export function synthesize(input, sampleRate = SAMPLE_RATE) {
  const p = sanitize(input);
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError('Unsupported sample rate');
  const tail = p.echo ? .54 : .02;
  const samples = new Float32Array(Math.ceil((p.duration + tail) * sampleRate));
  let phase = 0, filtered = 0, seed = p.seed;
  const alpha = 1 - Math.exp(-2 * Math.PI * p.cutoff / sampleRate);
  const release = Math.min(.06, p.duration / 3);
  for (let i = 0; i < Math.ceil(p.duration * sampleRate); i++) {
    const t = i / sampleRate, progress = Math.min(1, t / p.duration);
    const frequency = p.start * Math.pow(p.end / p.start, progress);
    phase = (phase + frequency / sampleRate) % 1;
    let oscillator;
    if (p.wave === 'square') oscillator = phase < .5 ? 1 : -1;
    else if (p.wave === 'saw') oscillator = phase * 2 - 1;
    else if (p.wave === 'triangle') oscillator = 1 - 4 * Math.abs(phase - .5);
    else oscillator = Math.sin(phase * Math.PI * 2);
    seed = (seed * 16807) % 2147483647;
    const random = (seed / 2147483647) * 2 - 1;
    const envelope = Math.min(1, t / p.attack) * Math.exp(-3.2 * progress) * Math.min(1, (p.duration - t) / release);
    const raw = (oscillator * (1 - p.noise) + random * p.noise) * envelope;
    filtered += alpha * (raw - filtered);
    samples[i] = p.drive ? Math.tanh(filtered * (1 + p.drive * 7)) / Math.tanh(1 + p.drive * 7) : filtered;
  }
  if (p.echo) {
    const delay = Math.floor(.135 * sampleRate);
    // Read only the dry signal, preventing accidental recursive feedback.
    const dry = samples.slice(0, Math.ceil(p.duration * sampleRate));
    for (let tap = 1; tap <= 4; tap++) {
      const gain = Math.pow(p.echo, tap) * .65;
      for (let i = 0; i < dry.length && i + delay * tap < samples.length; i++) samples[i + delay * tap] += dry[i] * gain;
    }
  }
  let peak = 0;
  for (const value of samples) peak = Math.max(peak, Math.abs(value));
  const gain = p.volume * .85 / Math.max(1, peak);
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
  return samples;
}
export function encodeWav(samples, sampleRate = SAMPLE_RATE) {
  const buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer);
  const text = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  text(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, 'data'); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) { const value = Math.max(-1, Math.min(1, samples[i])); view.setInt16(44 + i * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true); }
  return buffer;
}
