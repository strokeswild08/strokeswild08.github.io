/* Portable animation event data. Frames are one-based at the file boundary. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AnimationEvents = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TYPES = ['sound', 'impact', 'screen_shake'];
  function normalize(events, totalFrames = 102) {
    if (!Array.isArray(events) || events.length > 500) throw new Error('Use an array with at most 500 events.');
    return events.map((e, i) => {
      if (!e || !Number.isInteger(e.frame) || e.frame < 1 || e.frame > totalFrames)
        throw new Error(`Event ${i + 1}: frame must be an integer from 1 to ${totalFrames}.`);
      if (!TYPES.includes(e.type)) throw new Error(`Event ${i + 1}: unsupported event type.`);
      if (typeof e.name !== 'string' || !e.name.trim() || e.name.length > 80)
        throw new Error(`Event ${i + 1}: enter a name of 1–80 characters.`);
      return { frame: e.frame, type: e.type, name: e.name.trim() };
    }).sort((a, b) => a.frame - b.frame);
  }
  function exportData(events) {
    return { version: 1, clip: 'beast-shift', fps: 10, totalFrames: 102, frameBase: 1,
      events: normalize(events).map(e => ({ ...e, timeSeconds: (e.frame - 1) / 10 })) };
  }
  function importData(data) {
    if (!data || data.version !== 1 || data.clip !== 'beast-shift' || data.fps !== 10 || data.totalFrames !== 102 || data.frameBase !== 1)
      throw new Error('Choose a Beast Shift version 1 event file (10 FPS, 102 frames, one-based frames).');
    return normalize(data.events);
  }
  function atFrame(events, zeroBasedFrame) { return events.filter(e => e.frame === zeroBasedFrame + 1); }
  return { TYPES, normalize, exportData, importData, atFrame };
});
