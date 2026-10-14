# Strokes Combat Lab

A small C# melee combat sandbox by Wild Strokes / The Strokes Studio.
Move, aim, chain three light attacks, commit to a heavy strike, and dodge through a group of training sentinels.

## Open the demo

This repository is an **Assets source kit**, not a prebuilt game or a complete Unity project.

1. Create a Unity **2022.3 LTS or Unity 6** desktop 3D project. These are intended targets; the kit has not been compiled in Unity in this environment.
2. Copy `Assets/StrokesCombat` from this repository into the project's `Assets` folder.
3. Under **Edit > Project Settings > Player > Other Settings**, set **Active Input Handling** to **Input Manager (Old)** or **Both**. Restart the Editor if prompted. The demo uses legacy keyboard/mouse input, with no Input System package dependency.
4. Wait for scripts to import. Choose **Strokes > Combat Lab > Create Demo Scene**.
5. Press **Play**, then click the Game view.

The scene builder creates and saves a scene with the runtime bootstrap. Geometry, fighters, camera, attacks and a small synthesized impact sound are generated when Play starts. No downloaded art, animations or audio are required.

## Controls

| Input | Action |
| --- | --- |
| WASD | Move on the arena's X/Z axes |
| Mouse | Face the pointer on the ground plane |
| Left click / J | Light attack; tap again during recovery to queue the next combo step |
| Right click / K | Heavy attack |
| Space | Dodge in movement direction, or forward when standing still |
| R | Restart the round |
| Escape | Pause / resume |

## Combat rules

- Three light strikes: 14 / 18 / 26 damage, costing 10 / 14 / 20 stamina.
- Heavy: 36 damage, 30 stamina and a longer telegraph.
- Dodge: 25 stamina; invulnerability from 0.04 to 0.22 seconds of a 0.32-second dash.
- Stamina regenerates at 25 per second after 0.8 seconds without spending.
- Each swing damages each target at most once, and checks range, facing and line of sight.
- Hit stun interrupts an attack and clears its buffered follow-up.
- The active interval is checked for overlap so a low frame rate cannot silently skip a strike window. It is not a historical swept hit test.
- Friendly fire is disabled. Dead fighters stop attacking and moving.

## Code map

| File | Responsibility |
| --- | --- |
| CombatResources | Engine-independent health, stamina, cost and regeneration rules |
| AttackDefinition | Editable ScriptableObject attack timing and damage data |
| CombatActor | Movement, attack phases, hit checks, combo buffering, dodge and stagger |
| PlayerCombatInput | Keyboard/mouse adapter |
| EnemyBrain | Direct chase and timed melee decisions |
| CombatDemo | Arena generation, HUD, camera, impact audio and restart |
| CombatSceneBuilder | Editor menu to generate the demo scene |

Create an Attack asset with **Assets > Create > Strokes > Combat > Attack** to tune attacks for your own actors. The training demo creates transient defaults in code. Replace capsule visuals with your own models; keep the controller and CombatActor on the root. An Animator adapter can read State or subscribe to Hit. Attack timing currently runs from code, not animation events.

## Verification

Unity and a C# compiler were unavailable in the creation environment. **No Unity compilation, Play Mode, performance benchmark or exported build has been verified.** Source/package consistency checks were performed; run the following before publishing a playable release.

- Install/enable Unity Test Framework in Package Manager. Open **Window > General > Test Runner > EditMode** and run `Strokes.Combat.Tests`. Five supplied tests exercise failed spending, regeneration across different frame lengths, death, clamping and negative costs.
- Follow `docs/PLAYTEST.md` for collision, dodge, combo, pause and restart checks.
- Test the standalone build after adding `Assets/StrokesCombat/Scenes/CombatLab.unity` to your scene list. For Unity 2022 use Build Settings; for Unity 6 use the corresponding Build Profiles scene list.

## Limits and extension points

This is a local, single-player prototype with primitive visuals. Enemies chase directly and have no navigation or obstacle avoidance. Hit detection uses a reusable 64-collider buffer, suitable for this four-fighter arena; dense scenes need a different query strategy. There is no networking, rollback, controller support, remappable controls, character animation or persistence. World-space combat feedback is functional prototype presentation rather than finished character art. Simple impact audio is generated locally.

## GitHub

Suggested repository: `strokes-combat-lab`.

Upload the contents of this folder with README at the repository root. Keep Unity-generated `.meta` files once Unity imports the kit so GUIDs stay stable for collaborators. Record a short gameplay clip after verifying Play Mode; no gameplay recording or screenshot is included in this source release.

Suggested description: **C# melee combat sandbox for Unity with combo buffering, stamina, dodge windows, enemy AI and a generated training arena.**

## References

- [Unity CharacterController.Move](https://docs.unity.com/en-us/engine/6000.0/script-reference/unityengine/charactercontroller/move)
- [Unity input backend configuration](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.11/manual/Installation.html)
