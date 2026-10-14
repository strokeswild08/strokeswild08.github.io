# Beast Shift

A small animation inspection desk built around a pixel character transformation.
Presented by **Wild Strokes**.

![Beast Shift animation](assets/preview.gif)

## What it does

- Plays the original sequence at 10 FPS, with 0.25× to 2× speed controls.
- Steps through all 102 source frames without approximate video seeking.
- Loops a selected frame range, including a single pose.
- Zooms up to 3× with nearest-neighbor rendering and an optional inspection grid.
- Includes a scrubber, clickable thumbnail strip, and the original WebM.
- Adapts to phones and respects the reduced-motion preference on first load.

The original is 600 × 300 pixels and 10.2 seconds long. The white background is part of the supplied clip; this project preserves it. The sequence contains a transformation, not separate controllable game actions.

## Run it

Open `index.html` in a modern browser. No installation, build step, or external services are required. If your browser restricts local assets, run a static server from this folder:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Controls

| Control | Action |
| --- | --- |
| Space | Play / pause |
| Left / right arrow | Previous / next frame |
| R | Reset all viewer settings |
| Timeline | Jump to a frame and pause |
| First / last frame | Set an inclusive loop range (1–102) |

Keyboard shortcuts apply when focus is outside an interactive control. Standard button and form keyboard controls still work normally.

Zoom enlarges the full source frame; use the preview scrollbars to inspect different areas. The inspection grid is a viewer overlay, not a transparent-background preview. Turn off **Loop selection** to play through the complete remaining sequence once.

## Publish with GitHub Pages

1. Create a repository named `beast-shift-animation-viewer`.
2. Upload this folder's **contents**, so `index.html` is at the repository root.
3. In **Settings → Pages**, choose **Deploy from a branch**.
4. Select `main` and `/ (root)`, then save.
5. GitHub will show the resulting website URL when publication completes.

The included `.nojekyll` file allows the project to be served as static files.

## Files

```text
index.html            Page structure and controls
styles.css            Responsive visual design
app.js                Atlas renderer, timeline, and playback state
assets/frames.png     10-column atlas of the original decoded frames
assets/original.webm  Original supplied animation
assets/preview.gif    README animation preview
assets/poster.png     Still frame for presentation
```

The atlas uses 600 × 300 cells with ten columns. Only the first 102 cells are used. Playback uses a single requestAnimationFrame loop with elapsed-time accumulation; stepping and scrubbing address integer source frames. No dependencies or network fonts are used.

## Asset rights

The animation was supplied for this showcase. No third-party reuse license is granted by this repository. Confirm the animation's ownership and any client permissions before publishing it publicly. No general-purpose code license has been added; the repository owner can choose one separately.
