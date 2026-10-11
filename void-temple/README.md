# VOID TEMPLE — The Strokes Studio

**[Play on GitHub Pages](https://strokeswild08.github.io/void-temple/)** · **[Play the hosted game](https://owais-void-temple.strokeswild08.chatgpt.site)**

Owais Void faces Fisk in a haunted temple. A playable, original 2D JavaScript fighting prototype with two stylized Canvas fighters and one arena.

## Advanced systems
- Fixed 60 Hz simulation with bounded catch-up after tab stalls.
- Input buffering (180 ms) so attacks pressed near recovery can start next.
- Confirmed-hit `J → J → K` chain: Void Execution adds damage and launches the opponent.
- Perfect parry during the first 140 ms of a fresh block, with an 850 ms cooldown.
- Training mode: idle dummy, infinite player health/energy, auto-reset and no match record changes.
- Gamepad support with a stick dead zone, edge-triggered buttons, disconnect cleanup and independent device input states.
- Versioned local match records, validated save loading and recovery when browser storage is blocked.

## Features
- Three bot difficulties; best-of-three, 90-second rounds.
- Punch, kick, jump, dash, block, and Void special (50 energy).
- Hit effects, combo feedback, hit stop, screen shake, attack startup and recovery.
- Animated temple, fire, fog, procedural soundtrack and combat sounds.
- Pause, rematch, mute, fullscreen and touch controls.

## Controls
A / D: move · W: jump · J: punch · K: kick · L: hold block · Shift: dash · U: special · Esc: pause.

## Run locally
Open `index.html`, or run `python3 -m http.server 8080` in this folder and visit `http://localhost:8080`.

## Source
`game.js` integrates rendering, AI, combat and Web Audio. `engine/core.js` contains reusable fixed-timestep, input-buffer, combo and save systems. `engine/gamepad.js` handles gamepad input. `style.css` styles the interface; `index.html` contains the menus. No dependencies or external assets.

## Validation
Run `node --check game.js` and `node tests/combat.cjs` and `node tests/systems.cjs` from this folder. Logic checks cover hits, guard, energy, movement, round reset, victory, pause, AI simulation, parries, finisher damage, input buffering, training, save recovery and gamepad events. Browser visual QA and human balancing have not yet been completed.

## Credits
The Strokes Studio / Owais. Original procedural visuals and synthesized audio. All rights reserved; see LICENSE.
