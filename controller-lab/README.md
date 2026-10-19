# FORM / 01 — Controller Studio

A configurable 3D controller concept by **Owais / Wild Strokes**. An olive and charcoal product studio with a terracotta starting design, tactile surface finishes and a layered assembly view.

**[Open the live studio](https://strokeswild08.github.io/controller-lab/)**

## Explore

- Drag to orbit; scroll or pinch to zoom. Perspective, front and back views are available as buttons.
- Start with Ember, Chalk or Moss; customize shell, buttons, thumbsticks and light rings.
- Switch between matte polymer, glossy clear coat and metallic finishes.
- Separate the assembly with a smooth exploded-view slider. Tap parts to identify them.
- Compare warm studio, cool gallery and neutral daylight lighting.
- Download a branded PNG or export design settings as JSON.
- Copy a URL containing your configuration. Reopening it restores those settings.
- The last design is also saved locally when browser storage is available.
- Responsive layout, touch orbit controls and reduced-motion support.

## Run locally

From this directory:

```sh
python3 -m http.server 8080
```

Open `http://localhost:8080`. Serve over HTTP rather than opening `index.html` directly, so ES modules load correctly. There is no build step or package installation.

## Structure

```text
index.html       Accessible UI and local import map
style.css        Responsive studio layout
studio.js        Procedural geometry, materials, animation and exports
vendor/          Pinned Three.js r160 modules and MIT license
```

The controller is an original procedural concept built from extruded curves and mesh assemblies, not a scanned or imported commercial controller. The visible circuit board is illustrative, not a manufacturable electronics design. No Blender or GLB source is included. JSON export saves settings; it does not export a 3D mesh.

Three.js and its OrbitControls / RoomEnvironment addons are vendored at **0.160.1** so the scene does not depend on a runtime script CDN. Google Fonts is optional; system fonts are used if unavailable. No external images or model downloads are required.

## Compatibility

Requires a modern browser with ES modules, import maps and WebGL. Clipboard copying may require HTTPS; a shareable address-bar URL is used as a fallback. PNG output captures the current view. A network connection is needed to open the hosted demo initially.

## Credits

Concept and implementation: Wild Strokes. Three.js: MIT licensed, see `vendor/LICENSE-three.txt`.
