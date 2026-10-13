# Build the four Niagara systems in Unreal Editor

**Status:** authoring recipes, not prebuilt assets. This source package contains no `.uasset`, `.umap`, textures or engine binaries. Complete these steps in a UE5 C++ project, then verify the acceptance checklist. UI/module labels can vary by engine version.

## Install and compile the source plugin

1. Copy `Plugins/WildStrokesImpact` into your C++ project's `Plugins` folder.
2. Regenerate project files and build your project's Development Editor target with the toolchain required by your installed Unreal version.
3. Open the project and enable Niagara and Wild Strokes Industrial Impact if prompted.
4. Add `WSImpactComponent` to a Blueprint actor. The component is listed in Add Component.

The source uses UE5 APIs; the spawning signature was checked against official UE5.5 documentation. It has not been compiled with UnrealBuildTool or UnrealHeaderTool here. Do not interpret portable C++ tests as engine compilation.

## Shared system contract

Create these four systems in **your project's** `Content/VFX/IndustrialImpact`:

- `NS_WS_Metal`
- `NS_WS_Concrete`
- `NS_WS_Glass`
- `NS_WS_Smoke`

Use a one-shot CPU emitter as a starting point. Set the loop behavior to **Once**, start the burst at time zero and allow particles to finish their lifetimes. Avoid continuous spawn rates. Keep the emitter in world space and add these system user parameters:

| Parameter | Niagara type | Default | Intended use |
|---|---|---|---|
| `User.Intensity` | Float | 1 | Multiply the burst particle count |
| `User.Size` | Float | 1 | Multiply sprite size and launch speed |
| `User.Color` | Linear Color | White | Particle tint |
| `User.Normal` | Vector3 | (0,0,1) | Outward launch direction in world space |

The component spawns inactive, sets these variables, then activates. The Niagara graph must bind the parameters to the appropriate inputs; creating a parameter alone does not make it affect the emitter. Clamp and round burst counts to a positive integer. Do not also multiply component scale by `User.Size`, which would double the size change.

For directional velocity, use an emitter velocity cone whose axis is bound to `User.Normal`, or an equivalent dynamic input. If your cone module lacks an exposed axis, construct a basis around the normalized normal and transform the cone's local velocity into world space. The component also supplies an orientation with local +Z aligned to the normal, but a world-space emitter must explicitly use its direction input. Apply gravity in world -Z for chips and shards.

## Metal: short, directional streaks

Start with one sprite emitter:

- Burst: round `40 * User.Intensity`, limited to 100.
- Lifetime: 0.20–0.65 seconds.
- Cone half-angle: roughly 30 degrees; speed: 300–900 cm/s times `User.Size`.
- Sprite size: narrow streaks, approximately 1×6 to 2×14 cm times `User.Size`.
- Gravity: world (0,0,-980); moderate drag.
- Velocity-aligned facing/alignment so streaks follow travel direction.
- Color: `User.Color`; fade alpha sharply over the last third of life.
- Additive unlit material with a narrow soft mask. Keep emissive readable rather than flooding the frame.

A tiny optional flash emitter can use 1 sprite for 0.04 seconds. Omit it when reduced-flash visuals are required. CPU collision is optional; add it only after testing cost and visual benefit.

## Concrete: chips plus dust

Use two one-shot CPU emitters:

**Chips:** round `20 * User.Intensity`, limited to 50; lifetime 0.45–0.90 seconds; speed 100–350 cm/s times size; wider cone; small irregular sprites (2–6 cm); gravity -980; drag; muted color and late-life alpha fade.

**Dust:** round `12 * User.Intensity`, limited to 30; lifetime 0.60–1.10 seconds; speed 25–90 cm/s; sprite radius growing over life; soft translucent mask; alpha below 0.2 at its peak; drag and a small upward drift. Keep the dust layer subordinate to the hit silhouette.

All spatial sizes and launch speed can multiply `User.Size`. Bind tint to `User.Color`; choose a grey-brown style tint in the component. Avoid opaque dust quads and excessive overlap.

## Glass: light shards with readable edges

- Burst: round `28 * User.Intensity`, limited to 70.
- Lifetime: 0.45–1.10 seconds.
- Speed: 180–500 cm/s times size; wide directional cone.
- Sprite size: 2–8 cm times size; random sprite rotation and modest rotation over life.
- World gravity around -650 cm/s²; light drag.
- Translucent unlit material using `User.Color`, a crisp silhouette and restrained edge brightness.
- For triangle silhouettes, author an original triangle mask or use a small custom shard mesh. Neither asset is supplied here.

Start without collision; if you add CPU collision, test bounce/friction on a simple floor and profile the result. Transparent effects are sensitive to sorting and overdraw.

## Smoke: restrained drifting volume

- Burst: round `15 * User.Intensity`, limited to 38.
- Lifetime: 1.0–2.0 seconds.
- Speed: 15–60 cm/s, directed outward with spread.
- Sprite size: 12–28 cm times size, expanding smoothly to roughly 2× the starting size.
- Soft mask, low peak opacity, gradual color/alpha fade.
- Drag, a gentle world-up acceleration and restrained curl noise if needed.
- Prefer a few larger soft sprites to hundreds of overlapping particles.

## Texture-free starting materials

For a soft sprite, start with an unlit translucent material. Build a radial opacity mask from texture coordinates: subtract (0.5,0.5), measure distance, then use a clamped falloff. Multiply the mask by Particle Color alpha for opacity. Feed Particle Color RGB to emissive. A narrow scaled UV falloff produces a streak mask for sparks; use additive blend there. This provides a starting point, not a final material asset.

## Connect the systems to the component

In the actor's `WSImpactComponent` details, assign each new system to its matching style. Tune each style tint. Test `SpawnImpact` with material type, world location, world normal, intensity and size. A null return means the effect was not spawned: check assigned assets, world context, cooldown and budget first.

For automatic hit routing, define physical surfaces in Project Settings, assign the correct Physical Material to target meshes, and populate `SurfaceKinds`. Your trace must request the physical material (`FCollisionQueryParams::bReturnPhysicalMaterial = true`). Pass a blocking trace's hit result to `SpawnFromHit`. Unmapped surfaces fall back to Concrete.

This component is cosmetic/local and skips dedicated servers. Replicated games need their own delivery strategy to clients. The component tracks active systems, uses a per-component cooldown and destroys its effects on EndPlay. Ensure systems actually finish so auto-destroy can release them.
