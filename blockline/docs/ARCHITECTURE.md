# Architecture

## Data before geometry

`generateCity(config)` is a pure function. It normalizes a small settings object and returns all the data needed to reproduce the plan:

```text
version, config, fingerprint, bounds
cuts: left-bank X, right-bank X, shared Z positions
roads: nodes, bidirectional edges, bridge positions
blocks: district, boundaries, built/park kind
buildings: parcel ID, position, footprint, floors, style, colors
trees: position, scale, variant
stats: counts, green-area percentage, road length, tallest building
```

The fingerprint identifies the normalized settings, not a cryptographic proof of the geometry. Reproducibility assumes the same generator version.

## Independent random streams

`randomStream` hashes a string with FNV-1a and advances a local Mulberry32 stream. Generation does not replace `Math.random` or use global random state. A block's contents use its own seed, so adding a visual detail in one block does not consume another block's stream.

The street and zoning stages use separate streams. Height, density and greenery leave the road graph unchanged. Occupancy and building details share a block-local stream; changing density may change the later architectural details inside that block, not just hide existing buildings.

## Roads and parcels

Both riverbanks use independent, slightly jittered X cuts and shared Z cuts. Each street intersection is a graph node. Adjacent intersections are joined horizontally and vertically. Three extra edges connect the inner bank roads across the river. This construction guarantees connectivity without a graph-repair pass.

Blocks are the spaces between consecutive road cuts. Parcels are subdivided within each block's inset bounds. An occupied slot receives a building that is smaller than its slot, so neighboring footprints cannot overlap. Floors depend on district, seeded variation, a downtown centrality function and the skyline setting. Architectural style follows the resulting floor count and district.

The maximum city setting is bounded to 56 blocks. Imported settings are clamped before any geometry is created.

## Rendering

`CityScene` owns its camera, controls, scene and renderer. Cuboids, windows, gabled roofs, trunks, crowns, cones and cylinders each use an instanced batch. Building bodies retain their plan order, allowing an intersection's `instanceId` to identify a parcel directly. The inspector reads the existing plan rather than estimating dimensions from the mesh.

On regeneration, all old world geometries, materials and instance buffers are disposed, once per shared resource. Camera and lights persist. Animated vehicle matrices update in place; their meshes have frustum culling disabled because their initial origin-only bounding sphere would otherwise be stale.

`CanvasRenderer` is a compatibility path for browsers that cannot initialize WebGL. It consumes the same Three.js object graph, projects opaque faces through the same camera and caches world-space faces for unchanged instance batches. Ground surfaces are layered before vertical objects to avoid a large plate's average depth obscuring the far side of the city. This is a painter's renderer, not a substitute for a depth buffer.

## Ambient movement

The `Traffic` class is independent of rendering. Each car stores two connected node IDs, progress along the edge, a speed and a color. At an intersection it selects a connected neighbor, avoiding a reversal when another option is available. A perpendicular lane offset keeps the visual streams apart. Frame gaps are clamped to prevent a suspended tab from jumping several streets at once.

## UI and files

The controls are explicit: editing a field marks the plan as pending, and **Generate city** applies it. Presets and shuffle generate immediately. Lighting, overlay and camera controls only change presentation.

The city JSON contains the full data output for inspection or reuse. Import reads only its recognized version and configuration; it rebuilds data with the local generator. Text enters the UI through `textContent`, and file size is checked before parsing. No account or server storage is used.

The source panel fetches the same-origin `generator.js` file, so its displayed implementation stays aligned with the shipped project. GitHub provides the complete modules, tests and documentation.
