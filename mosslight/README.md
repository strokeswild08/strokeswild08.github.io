# Mosslight: The Last Lantern

A small top-down pixel adventure from Wild Strokes. Explore a moss-covered ruin, relight six lanterns, and face the Hollow Warden.

**[Play the demo](https://strokeswild08.github.io/mosslight/)**

## The game

- Three chapters: The Sunken Garden, The Rootbound Hall, and The Heart of the Ruin.
- Sword combat, an invulnerable dodge, health drops, and chapter retries.
- Three enemy types and a two-phase boss with readable attack warnings.
- Pixel sprite and tile artwork, lighting, hit feedback, and synthesized game audio.
- Keyboard/mouse and touch controls, pause, fullscreen, and reduced camera effects.
- Personal best completion time saved on the player's device when storage is available.

## Controls

| Action | Controls |
|:--|:--|
| Move | WASD / Arrow keys / Touch joystick |
| Strike | Space / J / Left click / Strike button |
| Dodge | Shift / K / Dodge button |
| Relight lantern / Enter passage | E / Light button |
| Pause | P / Escape / Pause button |

Relight all three lanterns and clear the creatures in each of the first two chapters. Then approach the gold passage and interact to continue. Dodge through or move away from the Warden's attacks. Losing all health lets you retry the current chapter.

## Run locally

Serve this folder with any static HTTP server. For example:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000`. No installation, build step, API key, network assets, or game engine is needed. Audio begins after a user gesture and may depend on browser/device audio settings.

## Source

| File | Purpose |
|:--|:--|
| `index.html` | Game frame, controls, dialogs, and interface |
| `style.css` | Responsive layout and visual styling |
| `game.js` | Game loop, world layouts, pixel sprites, combat, enemies, boss, audio, and input |

The game uses Canvas 2D and Web Audio. Artwork is defined in the source; no third-party asset packs are included. Test helpers are available only on localhost. The public build exposes a read-only state snapshot for inspection.

## Studio

[Wild Strokes portfolios](https://github.com/strokeswild08) · [Email](mailto:strokeswild08@gmail.com) · Discord: `wildstrokes23`
