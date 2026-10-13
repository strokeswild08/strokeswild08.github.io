# Wild Strokes — Games, Tools & Visual Art

Playable browser games, native Godot systems, development tools and art portfolios by Wild Strokes.

**[Explore all projects](https://strokeswild08.github.io/projects/)** · **[Pixel art portfolio](https://strokeswild08.github.io/)** · **[GitHub profile](https://github.com/strokeswild08)**

## Playable browser games

| Project | What to explore | Demo / source |
| --- | --- | --- |
| **VOID TEMPLE** | Fighting prototype: buffered input, combos, parries, bot difficulties, training and gamepad support | [Play](https://strokeswild08.github.io/void-temple/) · [Source & controls](void-temple/README.md) |
| **Ashen Crown: Last Stand** | Isometric tactical battle with three heroes, cover, abilities and enemy AI | [Play](https://strokeswild08.github.io/ashen-crown/) · [Source](ashen-crown/) |
| **Mosslight: The Last Lantern** | Pixel adventure with sword combat, lantern encounters and a boss fight | [Play](https://strokeswild08.github.io/mosslight/) · [Source](mosslight/) |

## Native Godot 4 kits

Download a project ZIP, extract it and import `project.godot` in **Godot 4.4.1**. Press F5 in the editor. The project pages explain each kit; they are not browser exports.

| Project | Included systems | Project / source |
| --- | --- | --- |
| **Fieldpack** | Backpack/chest storage, drag/drop, split stacks, equipment stats, transactional crafting and saves | [Project & download](https://strokeswild08.github.io/godot-inventory-kit/) · [Setup & source](godot-inventory-kit/README.md) |
| **Nightshift** | First-person movement, patrol/chase/search AI, key/door interactions, flashlight and checkpoints | [Project & download](https://strokeswild08.github.io/godot-horror-kit/) · [Setup & source](godot-horror-kit/README.md) |

Both kits include headless integration tests and integration guides. Graphical playthroughs and exported builds have not been verified in the development environment. Their visuals are procedural starter geometry/symbols.

## Development tools & web applications

| Project | Function | Demo / guide |
| --- | --- | --- |
| **Route Lab** | A*, Dijkstra and BFS with weighted terrain, an editable map and route animation | [Demo](https://strokeswild08.github.io/pathfinding-lab/) · [Algorithms & tests](pathfinding-lab/README.md) |
| **Fieldwork** | Layered tilemap editor with custom tiles, collision test and PNG/JSON export | [Open](https://strokeswild08.github.io/tilemap-editor/) · [Source](tilemap-editor/) |
| **Flipbook** | Sprite-sheet playback, onion skins, PNG/GIF export and complete character packs | [Open](https://strokeswild08.github.io/sprite-preview/) · [English guide](sprite-preview/README.md) |
| **Signal Lab** | Procedural game SFX, waveform controls, WAV export and JSON recipes | [Open](https://strokeswild08.github.io/signal-lab/) · [Setup & tests](signal-lab/README.md) |
| **Facet** | Low-poly 3D viewer with local GLB import, wireframe, lighting and PNG export | [Open](https://strokeswild08.github.io/low-poly-viewer/) · [Setup](low-poly-viewer/README.md) |
| **Studio Desk** | Client workspace: projects, milestones, payments and files; optional Node/SQLite backend | [Browser demo](https://strokeswild08.github.io/client-portal/) · [Server setup & tests](client-portal/README.md) |

Studio Desk's public demo uses browser-local storage. Its included Node/SQLite backend is run separately for authenticated accounts and private records.

## Art portfolios

[Pixel art & animation](https://strokeswild08.github.io/) · [Game UI / UX](https://strokeswild08.github.io/wild-strokes-game-ui-portfolio/) · [Web & product UI / UX](https://strokeswild08.github.io/wild-strokes-uiux/) · [Comics](https://strokeswild08.github.io/wild-strokes-universe/) · [Sound design](https://stately-shortbread-21d46a.netlify.app/)

## Repository structure

This repository hosts the pixel-art website plus independently documented project folders.

| Path | Purpose |
| --- | --- |
| `index.html`, `styles.css`, `app.js` | Pixel-art portfolio site |
| `gallery-data.js`, `gallery-data.json`, `gallery/` | Artwork metadata, images and animation |
| `projects/` | Project directory linking demos, native downloads and code |
| `void-temple/`, `ashen-crown/`, `mosslight/` | Browser games |
| `godot-inventory-kit/`, `godot-horror-kit/` | Native Godot projects |
| Remaining project folders | Tools and web applications with their own setup guides |

Keep gallery paths synchronized with the artwork metadata. Run and test individual projects using their own README instructions; there is no single repository-wide build command.

## Licensing

Check each project's LICENSE and README before reusing its code or art. Licensing differs between projects; public access to this repository does not assign one license to the whole portfolio.

## More from Wild Strokes

[View the full portfolio directory](https://github.com/strokeswild08) · [Email](mailto:strokeswild08@gmail.com) · Discord: `wildstrokes23`
