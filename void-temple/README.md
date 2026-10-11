# VOID TEMPLE — The Strokes Studio

**[Play on GitHub Pages](https://strokeswild08.github.io/void-temple/)** · **[Play the hosted game](https://owais-void-temple.strokeswild08.chatgpt.site)**

Owais Void faces Fisk in a haunted temple. A playable, original 2D JavaScript fighting prototype with two stylized Canvas fighters and one arena.

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
`game.js` contains rendering, AI, combat and Web Audio. `style.css` styles the interface; `index.html` contains the menus. No dependencies or external assets.

## Validation
Run `node --check game.js` and `node tests/combat.cjs` from this folder. Logic checks cover hits, guard, energy, movement, round reset, victory, pause, and extended AI simulation. Browser visual QA and human balancing have not yet been completed.

## Credits
The Strokes Studio / Owais. Original procedural visuals and synthesized audio. All rights reserved; see LICENSE.
