# Wild Strokes — Sprite Atlas Packer

A browser-local tool that packs individual PNG sprites into one atlas image and a JSON hash file. Made for the Wild Strokes game art and coding portfolio.

## Try it

1. Extract the complete folder.
2. Open `index.html` in a recent Chrome, Edge or Firefox browser.
3. Click **Load sample pack** to try twelve original procedural sample sprites.
4. Choose atlas width and padding. Click a source sprite or its preview frame to inspect coordinates.
5. Download **atlas.png** and **atlas.json** together.

No installation, server, account or Python is needed for the app. Keep `index.html`, `style.css`, `packing.js` and `app.js` together. Sprite files are processed in the browser; the app makes no network requests. Closing or refreshing the page clears the current pack.

## Features

- Multiple PNG selection and drag-and-drop.
- Deterministic height-sorted shelf packing.
- Width options from 256 to 4096 pixels; padding from 0 to 32 pixels.
- Checkerboard preview, optional bounds and frame inspection.
- Pixel occupancy measurement based on sprite rectangles, including transparent pixels.
- Transparent PNG export without selection or frame outlines.
- JSON hash frames with position, dimensions, source size and `trimmed: false`.
- Duplicate input names receive numbered suffixes.
- Oversized images, corrupt decoding, invalid settings and atlas overflow produce messages.
- Limits: 60 sprites, 8 MB per file, 4096 px per axis, 16 million total input pixels and 4096 px atlas height.

## Engine integration

The JSON layout targets a conventional Phaser-style untrimmed JSON hash atlas. Place both exports in your game's assets directory:

```js
// In a Phaser scene's preload method:
this.load.atlas('sprites', 'assets/atlas.png', 'assets/atlas.json');
// In create, use a frame name from your export:
this.add.image(200, 150, 'sprites', 'moss_slime');
```

See the [Phaser texture documentation](https://docs.phaser.io/phaser/concepts/textures). A real Phaser scene integration has not been run in this environment. Godot can use atlas regions, but this project does not export Godot resources or provide an automatic Godot importer.

## Implementation

`packing.js` contains the independent packing algorithm and metadata serializer. `app.js` handles files, browser decoding, UI state and canvas export. Filenames are rendered as text. PNG input URLs are temporary and revoked after decoding; thumbnails are generated locally.

Shelf packing is predictable but not optimal. It does not rotate sprites, trim transparency, deduplicate pixels, extrude edges, create multiple atlas pages or export animations. Padding inserts transparent space rather than duplicating edge pixels; choose engine filtering accordingly. Large batches may still use substantial memory on older PCs.

## Validation

With Node.js 22 or newer installed:

```sh
node tests/packing.test.cjs
node tests/ui.test.cjs
```

The first suite verifies dimensions, errors, metadata, deterministic placement and 100 batches of 40 sprites for overlap and padding. The UI harness exercises sample loading, selection, export wiring, invalid settings, recovery and clearing with a simulated DOM/canvas. It is not a real-browser test. See `VERIFICATION.md` for checked and unchecked behavior.

## Publish on GitHub

Suggested repository: `sprite-atlas-packer`.

Suggested description: `Browser-local PNG sprite atlas packer with adjustable padding, frame inspection and PNG + JSON export.`

Upload the complete project folder contents to the repository root. For a standalone repository, the supplied workflow runs algorithm and UI harness tests. The portfolio repository uses a separate root-level workflow for this project. To host with GitHub Pages, use this root directory. Record a short demo showing sample loading, selection and both exports. Never include private client sprites in a public repository.

Published source: https://github.com/strokeswild08/strokeswild08.github.io/tree/main/sprite-atlas-packer

Browser demo: https://strokeswild08.github.io/sprite-atlas-packer/ A public repository permits people to view and download its source. The included LICENSE grants evaluation permission and does not select an MIT or other permissive reuse license.
