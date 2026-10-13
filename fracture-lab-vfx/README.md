# Fracture Lab — Destruction & Impact Playground

An interactive 2D VFX study for the Wild Strokes portfolio. Break wood, stone or glass targets and explore how direction, force, gravity, drag and bounce shape the result.

## Run

Extract the complete folder and open `index.html` in a recent desktop browser. No installation or game engine is required. Keep the HTML, CSS and JavaScript files together.

- Click the central target, press **Space** while the page or canvas is focused, or choose **Hit target**.
- Choose **Wood**, **Stone** or **Glass**. Changing material resets the scene.
- Adjust force and launch direction for the next hit.
- Adjust playback speed to inspect motion in slow motion.
- **Replay last hit** restores the last material, force, direction and seed.
- **Reset scene** restores the target.
- **Save frame PNG** downloads the current scene image, including its background.
- Export or import a JSON preset to recreate an impact.

The app has no network requests, accounts, telemetry or file uploads. Imports are read locally. Scene state is not saved automatically.

## Effects

Wood uses narrow warm splinters with modest bounce. Stone uses heavier chips, faster gravity and grey powder. Glass uses translucent triangular shards with higher bounce and cool particles. Impacts also add a brief flash, a floor shock ring, cosmetic floor cracks and fading dust.

These are procedural Canvas effects, not real fracture simulation or engine-native particle assets. The target disappears at impact; fragments are generated around its centre rather than cut from its exact geometry. The sample is intended as a readable, adjustable VFX demonstration.

## Reuse the simulation

`physics.js` is independent of the UI and works in a browser or Node. It exposes:

```js
const particles = ImpactPhysics.burst({
  material: 'wood', x: 480, y: 403,
  force: 1.2, angle: -90, seed: 42, reduced: false
});
const alive = ImpactPhysics.step(particles, 1 / 120, 465);
```

Angles are degrees: -180 launches left, -90 launches up and 0 launches right. Coordinates increase right and down. `step` updates particle objects and returns the surviving array; keep the returned array. Pass a fixed delta for consistent motion. Each step is capped at 0.04 seconds. The demo runs fixed 1/120-second simulation steps and renders with `requestAnimationFrame`.

A seeded generator reproduces particle initialization. The replay also uses fixed simulation steps. Rendering at different display frame rates may capture slightly different moments, so this is not a cross-device frame-perfect video system.

## Presets and captures

Presets store version, material, force, launch angle, reduced-particle flag and seed. Playback speed and guides are view settings and are not included. Export uses the last fired hit when one exists, otherwise the current settings. Imports validate fields and reject files above 12 KB.

PNG export captures one scene frame. It does not create transparent sprite sheets, video, textures, UE5 Niagara assets or Godot resources. A game-engine port requires separate integration.

## Performance and accessibility

A new hit replaces the previous burst, keeping the particle count bounded. Expired particles are removed. **Reduced particles** decreases the count and removes camera shake. The scene includes brief localized impact flashes. Use the buttons for keyboard-accessible actions; sliders retain their native keyboard behavior. Simulation pauses while the tab is hidden.

The canvas uses a fixed 960×620 drawing surface and scales responsively. This is designed as a small demo, but performance on the user's PC still needs a real-browser check.

## Verify

Node.js 22 or newer is needed only for development tests:

```sh
node tests/physics.test.cjs
node tests/ui.test.cjs
```

Physics tests cover material configuration, seeded bursts, force/direction, gravity, floor bounce, expiration and repeated simulations. The UI harness uses a simulated DOM/canvas; it is not a browser screenshot or real-browser download test. Details are in `VERIFICATION.md`.

## GitHub portfolio

Suggested repository: `fracture-lab-vfx`.

Suggested description: `Interactive 2D destruction VFX with material-specific particles, fixed-step physics, seeded replay and preset export.`

Upload the folder contents as the repository root. For GitHub Pages, serve that root directory. A useful short demo shows all three materials, slow motion and replay. Explain which behavior comes from code and which visual choices you tuned. Do not present it as a Niagara or Godot implementation.

All sample targets and effects are drawn in code. No client files, third-party artwork or personal contacts are included. The included license allows viewing and running for evaluation; no permissive reuse license is selected. Public source can still be viewed and downloaded. Live demo: https://strokeswild08.github.io/fracture-lab-vfx/

Source: https://github.com/strokeswild08/strokeswild08.github.io/tree/main/fracture-lab-vfx
