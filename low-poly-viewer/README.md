# Facet · Low-poly workbench

A small JavaScript tool by Wild Strokes for inspecting a model before sharing it. Orbit a woodland diorama or a copper robot, change the light, inspect the triangles and save a clean PNG preview.

**[Open the live workbench](https://strokeswild08.github.io/low-poly-viewer/)**

## What it does

- Two editable demo models built from geometry in `models.js`.
- Drag / touch orbit, wheel / pinch zoom, right-drag pan and a camera reset.
- Local `.glb` import with embedded materials and textures, up to 25 MB.
- Soft studio, late afternoon and moonlight presets; three backdrops.
- Wireframe, ground grid, turntable and base triangle / mesh counts.
- Animation clip selection and playback for animated GLB files.
- Download the current view as a PNG at the viewport's pixel resolution.
- Responsive controls, keyboard orbit and explicit file errors.

Your model is read locally. It is not uploaded or stored. The app has no backend, analytics, accounts or CDN dependency.

WebGL 2 provides the full material, texture, shadow and skinning preview. Browsers without WebGL use a basic SVG 3D renderer: orbit, lighting, wireframe, turntable and PNG export still work. That fallback accepts static meshes and object animations up to 12,000 triangles; it does not support textures, skeletal animation or instanced meshes. The current rendering mode is shown in the preview.

## Run locally

Use a recent Node.js version to run the tests. The browser app itself needs no build or npm install.

```sh
cd low-poly-viewer
python3 -m http.server 8000
```

Open `http://localhost:8000`. Serve the directory over HTTP; do not double-click the HTML file, because browsers restrict module imports from `file://`.

```sh
npm test
```

## Controls

| Action | Mouse / touch | Keyboard (focus the preview) |
| --- | --- | --- |
| Orbit | Left-drag / one finger | Arrow keys |
| Zoom | Wheel / pinch | + / − |
| Pan | Right-drag / two fingers | — |
| Reset | Reset arrow button | R |

## Import notes

Export **glTF 2.0 → GLB** from Blender with textures embedded. Draco, Meshopt and KTX2 compression need additional decoders and are deliberately rejected with a re-export hint. `.gltf` files with sidecar assets, OBJ and FBX are not supported. If a GLB references external files, it is rejected before parsing.

Material support follows the bundled Three.js GLTFLoader. High-detail or large-texture models may still be too heavy for a phone even when under the file-size limit. Mesh counts represent the model's mesh objects; triangles count the base geometry, including instance multiplicity. Imported animation is played as supplied; this is a previewer, not an animation editor.

## How the JavaScript fits together

| File | Responsibility |
| --- | --- |
| `index.html` | The controls, labels and import map |
| `style.css` | Layout, responsive panels and visual styling |
| `app.js` | Connects UI events to the scene, camera, lights and loader |
| `models.js` | Builds the woodland outpost and copper courier with simple shapes |
| `viewer-utils.js` | Validates files, normalizes bounds, counts triangles and disposes resources |
| `tests/viewer.test.js` | Geometry, centering, file validation and local-resource checks |
| `vendor/` | Three.js 0.180.0 and required addons, with upstream MIT license |

The third-party files are pinned and committed so the demo uses the same version on every visit. See `vendor/LICENSE` for their license. Project code and procedural models are published for inspection; no project-wide reuse license has been assigned.

## Roman Urdu mein samjho

`models.js` mein boxes, cones aur doosri shapes mil kar model banati hain. `app.js` ek **scene** banata hai, usmein model aur lights rakhta hai, phir **camera** se view dikhata hai. Mouse drag se camera ghoomta hai. **Wireframe** model ke triangle edges dikhata hai. File choose karne par JavaScript GLB ko browser mein read karta hai, uska size aur center set karta hai, aur purana model replace karta hai. **Save preview** canvas ki current image ko PNG bana kar download kar deta hai.
