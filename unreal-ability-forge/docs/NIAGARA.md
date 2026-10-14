# Niagara authoring contract

No Niagara `.uasset` files are delivered in this source prototype. These recipes guide authoring in the local Unreal Editor; they have not been executed or visually verified. The default effect path uses transient instanced cube pieces, a point-light pulse and a segmented mesh lightning beam.

## Assign systems

Create a Blueprint child of `ForgeCharacter`. In its Effects component, fill the `Slots` map with finite Niagara systems keyed by Fireball, Explosion, Lightning, Dash, Metal, Stone and Glass. Then create a child `ForgeGameMode`, select that character as Default Pawn Class and apply that game mode to your local map. Preserve the native HUD class.

Each slot also controls tint. The code spawns inactive, sets the following parameters, then activates:

| Parameter | Niagara type | Meaning |
| --- | --- | --- |
| `User.Color` | Linear Color | Slot tint |
| `User.Normal` | Vector3 | Normalized surface normal / launch direction |
| `User.End` | Position | World-space contact point for a beam; not a Vector3 parameter |
| `User.Size` | Float | 1.0 in this sample; optional size multiplier |

Bind these parameters in emitter modules; setting a user parameter alone does not change a renderer. Effects align local +Z to the supplied normal. Lightning `Location` is the muzzle and `User.End` is the traced contact. Do not assume the system receives a source-actor data interface. The Fireball slot is a launch burst only; a sustained projectile trail needs a Niagara component attached to the projectile, which is not included here.

## Suggested starting recipes

| Slot | Starting design | Lifetime / budget |
| --- | --- | --- |
| Fireball | Short ember burst from the muzzle with orange sprites | 0.15–0.35s, 10–20 particles |
| Explosion | Fast expanding core, radial embers and an outward ring | 0.4–0.8s, 30–60 particles |
| Lightning | Beam ribbon from source to `User.End`, with brief branching jitter | 0.1–0.2s, no perpetual loops |
| Dash | Fading cyan streaks emitted opposite motion | 0.15–0.35s, 8–15 particles |
| Metal | Narrow fast sparks oriented away from the hit surface | 0.3–0.6s, 15–30 particles |
| Stone | Slow heavier chips plus grey dust | 0.4–0.8s, 15–25 particles |
| Glass | Thin translucent shard meshes, cool highlights | 0.4–0.8s, 10–20 particles |

These counts are authoring suggestions, not measured scalability settings. Start with CPU emitters at these small counts, then profile real scenes before expanding. Assets use local +Z as the outward direction. Author finite systems so auto-destroy and the concurrency budget work as intended.

The default `ForgeBeam` is still spawned when Lightning Niagara is assigned; remove its spawning line if it duplicates your authored beam. Generated `M_ForgeGlow` is a simple opaque unlit mesh material; it is not a sprite/translucent Niagara material. Create appropriate particle materials for those renderers.

## Official references

- [SpawnSystemAtLocation, UE 5.5](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Niagara/UNiagaraFunctionLibrary/SpawnSystemAtLocation?application_version=5.5)
- [Niagara component parameter APIs](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Niagara/UNiagaraComponent?application_version=5.5)
- [Niagara overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-niagara-effects-in-unreal-engine?application_version=5.5)
