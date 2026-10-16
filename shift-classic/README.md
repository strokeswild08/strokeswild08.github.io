# SHIFT Classic — C-72 Assembly Studio

[Open interactive 3D viewer](https://shift-classic-studio.strokeswild08.chatgpt.site) · [Download source](dist/source.zip) · [Coupe GLB](dist/C72-coupe.glb) · [Robot GLB](dist/C72-robot.glb)

A real-time 3D classic coupe configurator and articulated robot pose study by Wild Strokes. The supplied classic red coupe photo guides the proportions, chrome trim, long bonnet, sloping glasshouse and circular headlamps. This is a **stylized procedural interpretation**, not an exact scan or a mechanically validated transformation.

## Explore

- Drag to orbit, scroll/pinch to zoom; front, side, rear and reset camera buttons.
- Six paint palettes and independent custom body/accent colours.
- Three real wheel meshes: period steel/chrome cap, five-spoke alloy and radial turbine.
- Window tint, headlamp/sensor toggle and wireframe mode.
- Separate body, frame, glass, wheels, interior and lighting layers.
- A five-second reversible transformation and a scrubber for intermediate poses.
- Exploded assembly view and click-to-inspect mesh labels.
- Export the current visible configuration as a **GLB** with its current pose and materials.
- Pre-generated `C72-coupe.glb` and `C72-robot.glb` in `dist/`.

431 individually named mesh parts are arranged into 18 articulated assemblies. Paint and wheel configurations persist through transformation; the robot uses the same component meshes as the car. The hidden frame, cabin details and joint layout are original interpretations because the reference shows only one exterior angle.

## Run locally

Serve `dist/` with any static HTTP server, for example:

```sh
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. Requires WebGL 2 and a modern browser. All runtime dependencies are vendored; no CDN requests, paid assets or asset-generation services are required. Directly opening `index.html` as a local file is unsupported because it uses ES modules.

## Source

- `dist/src/model.js`: procedural geometry, materials, wheel variants and staged assembly poses.
- `dist/src/app.js`: WebGL scene, camera, controls, inspection and GLB export.
- `dist/index.html`, `dist/style.css`: responsive configuration studio.
- `dist/vendor/`: Three.js 0.170.0, OrbitControls, RoomEnvironment and GLTFExporter under the Three.js MIT license.
- `tests/model.mjs`: geometry, pose, material, wheel rebuild and real GLB export checks.
- `tests/geometry-preview.mjs`: optional software geometry projection helper (requires Sharp; not a WebGL/browser screenshot).

## Validation

```sh
node tests/model.mjs
node --check dist/src/model.js
node --check dist/src/app.js
```

**2632 checks passed**, including finite transforms through intermediate poses, body bounds, independent paint/accent/tint changes, wheel rebuilds, layer visibility, wireframe, exploded bounds and GLB binary export. Both exported files contain real mesh data and valid GLB headers.

Software geometry previews were inspected for both forms. Browser/WebGL rendering, DOM controls, mobile gestures and the browser download dialog have **not** been interaction-tested in this environment. A browser playthrough remains necessary before calling this a fully tested configurator.

## Scope and limits

The transform is a staged pose animation; parts can intersect during intermediate poses. It is not an engineering or collision simulation. GLB export contains the current static pose, not the complete transformation animation. The model is a stylized first build rather than a photo-exact, production-retopologized vehicle. Geometry is procedural and mostly symmetric; no baked textures or artist-authored UV set are included. Tint is simulated with transparent tinted material rather than automotive optical data.

Export respects visible layers: hide only the parts you intend to omit. Restore layers to export the whole assembly. Wireframe is a viewer-only aid and is temporarily disabled for GLB export.

Source under MIT. Three.js retains its separate copyright and MIT notice in `dist/vendor/THREE-LICENSE.txt`.
