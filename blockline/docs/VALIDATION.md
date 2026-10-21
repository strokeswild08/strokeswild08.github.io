# Validation

Checked on 22 October 2026.

## Automated checks

`npm test` passes all 12 tests using Node's built-in test runner. Coverage includes:

- Complete output reproducibility for identical settings and different output for another seed.
- Full road-graph connectivity at every supported city size, reciprocal adjacency, positive edge lengths and designated river crossings.
- Building bounds and street setbacks across 45 generated cities, with maximum density and height.
- Pairwise building footprint overlap checks for all three presets at maximum density.
- Stable streets when density, height and greenery change.
- Expected block counts, a guaranteed civic park, unique parcel IDs and statistics derived from the actual plan.
- Complete JSON round trips, version rejection, ignored untrusted geometry and bounded input validation.
- Seeded random-stream range and repeatability with Unicode seeds.
- Connected-edge traffic movement and correct lane offsets over 1,300 simulation steps, paused-state stability and capped long-frame deltas.

Application JavaScript also passes `node --check`. The vendored Three.js and OrbitControls files match the existing r170 copies in the portfolio repository.

## Browser checks

The project was exercised through its local HTTP preview in Chrome:

- The complete riverfront miniature renders in the compatibility path.
- Downtown produces 147 buildings, 36 blocks and three bridges for its shipped preset. Garden city and Riverfront preset selection also run.
- The perspective and overhead camera controls change the view.
- Clicking a visible tower opens its parcel inspector with 27.0 m height, 11 floors and a 61 m² footprint; closing the inspector clears it.
- The time slider accepts midnight and changes its output; the wireframe button toggles state.
- The source dialog loads the actual generator module. Its live data tab displays the current settings, statistics, sample parcel and road.
- A JSON file downloaded through the interface was read independently and its complete building data matched a regenerated city. Reimporting it restored the Downtown configuration and statistics.
- PNG export completes as a browser download after encoding the canvas to a Blob.
- A 390-pixel iframe viewport shows the miniature above the stacked settings, with the mobile navigation and controls fitting its width.

## Verification limits

WebGL is disabled in the available preview browser. The primary WebGL renderer is included and JavaScript syntax checked, but its GPU output, shadow maps and runtime performance have not been visually verified. The captured workshop screenshot uses the compatibility renderer, which projects the same scene geometry without shadow maps.

The project has no Unreal/Godot dependency, server component or installation process. It does not claim native-engine compilation or an urban traffic simulation. Physical-device touch gestures and mobile GPU performance remain unverified.
