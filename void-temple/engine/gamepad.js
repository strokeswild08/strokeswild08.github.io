/* Edge-triggered gamepad input with an analog-stick dead zone. */
(function (root) {
  'use strict';
  const bindings = [
    [0, 'KeyJ'], [1, 'KeyK'], [2, 'KeyU'], [3, 'KeyW'],
    [4, 'KeyL'], [5, 'ShiftLeft'], [9, 'Escape'],
    [12, 'KeyW'], [14, 'KeyA'], [15, 'KeyD']
  ];
  class GamepadInput {
    constructor(send, getPads) {
      this.send = send;
      this.getPads = getPads || (() => navigator.getGamepads?.() || []);
      this.held = new Set();
      this.label = '';
    }
    poll(enabled = true) {
      const pad = Array.from(this.getPads()).find(p => p?.connected);
      this.label = pad ? 'GAMEPAD CONNECTED' : '';
      const next = new Set();
      if (pad && enabled) {
        const x = pad.axes[0] || 0;
        if (x < -.28) next.add('KeyA');
        if (x > .28) next.add('KeyD');
        for (const [button, key] of bindings)
          if (pad.buttons[button]?.pressed) next.add(key);
      }
      for (const key of this.held) if (!next.has(key)) this.send(key, false);
      for (const key of next) if (!this.held.has(key)) this.send(key, true);
      this.held = next;
    }
    clear() {
      for (const key of this.held) this.send(key, false);
      this.held.clear();
    }
  }
  if (typeof module === 'object' && module.exports) module.exports = GamepadInput;
  else root.VoidGamepad = GamepadInput;
})(typeof globalThis !== 'undefined' ? globalThis : this);
