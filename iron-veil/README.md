# Iron Veil — Third-Person Combat Lab

An **Unreal Engine 5.5 C++ source prototype** by Wild Strokes. A third-person fighter faces three opponents in a procedural arena: face a target, commit to a strike, read the enemy windup, dodge, and manage stamina.

**Validation status:** The shared combat rules pass 25 native C++ checks under GCC with AddressSanitizer and UndefinedBehaviorSanitizer. The Unreal project has **not** been compiled or played in Unreal Editor in this environment. Treat this as source ready for an editor build and integration review, not a verified packaged game. No playable executable or gameplay recording is included.

## Included

- Third-person movement, mouse-look camera boom and optional target lock.
- Three-hit combo with one buffered followup during recovery; each strike spends stamina separately.
- Dodge with a vulnerable startup, a timed invulnerability interval and vulnerable recovery.
- Damage, stagger, interrupted attacks and terminal death state.
- Three enemies that approach, circle and telegraph attacks before the hit window.
- Directional melee hit checks with range, elevation, line-of-sight and team filters.
- Runtime arena, boundary walls, floor markings, lighting and geometric fighters.
- Health/stamina bars, enemy health, lock marker, windup warning, result overlay and debug telemetry.
- Blueprint-callable attack/dodge functions and editable reach/enemy properties.

This prototype uses engine primitives and simple procedural sword/body movement. It includes no character art, skeletal animation, animation montages, audio, VFX assets, Behavior Tree, GAS, multiplayer or navigation mesh. Enemy movement uses direct steering in an open arena; it does not route around arbitrary obstacles.

## Open in Unreal

1. Download this project folder. [Source ZIP](Iron_Veil_Unreal_Source.zip).
2. Install **Unreal Engine 5.5** and its C++ toolchain. On Windows, use Visual Studio 2022 with the Unreal/C++ game development workload and a supported Windows SDK.
3. Right-click `IronVeil.uproject` → **Generate Visual Studio project files**.
4. Build **IronVeilEditor / Development Editor / Win64** in the generated solution.
5. Open `IronVeil.uproject`. The configured map is `/Engine/Maps/Entry`; the default game mode is `IVGameMode`.
6. Press **Play**. The game mode constructs the arena and opponents at runtime. If using your own level, set **GameMode Override → IVGameMode**.
7. Click the viewport to capture mouse input. **Shift+F1** releases it in PIE.

The source targets 5.5 explicitly; other engine versions may require target/build configuration changes. No `.uasset`, `.umap`, Starter Content or marketplace content is required. The basic engine shapes and their materials must remain available.

## Controls

| Input | Action |
|---|---|
| WASD | Move relative to camera |
| Mouse | Look while unlocked |
| Left mouse | Start attack; press during recovery to buffer the next combo strike |
| Space | Dodge in movement direction; forward when stationary |
| Tab | Acquire a visible forward target / release lock |
| F1 | Toggle combat telemetry and attack-reach arrows |
| R | Reload arena and reset fighters |

Attacks cannot be dodge-cancelled. Stagger cancels a pending strike and combo buffer. Each strike emits damage once; repeated overlap does not repeatedly apply damage. Dodging costs 28 stamina, attacks cost 22, and stamina regenerates after a delay while ready. Defeat all three opponents to clear the arena.

## Code map

| File | Responsibility |
|---|---|
| `Public/CombatCore.h` | Engine-independent timing, costs, combo buffer, invulnerability and state rules |
| `Public/IVFighter.h`, `Private/IVFighter.cpp` | Input, movement, lock-on, enemy steering, hit resolution and procedural visuals |
| `Public/IVGameMode.h`, `Private/IVGameMode.cpp` | Default classes, arena, lights, enemy spawning and initial player placement |
| `Public/IVHUD.h`, `Private/IVHUD.cpp` | Runtime UI and combat/debug feedback |
| `Config/DefaultInput.ini` | Explicit legacy input mappings; no Enhanced Input assets required |
| `Tests/combat_tests.cpp` | Standalone rule regression tests |

Source paths above are relative to `Source/IronVeil/`, except config and tests.

## Rule tests

No Unreal installation is needed for these tests:

```sh
g++ -std=c++17 -Wall -Wextra -Werror -pedantic \
  -fsanitize=address,undefined -g Tests/combat_tests.cpp -o /tmp/iron-veil-tests
ASAN_OPTIONS=detect_leaks=0 /tmp/iron-veil-tests
```

Expected: `PASS: 25 combat checks`.

The checks cover costs, action exclusion, one-shot hit windows, combo buffering/cap, insufficient stamina, dodge startup/iframes/recovery, interruption, regeneration, lethal damage and dead-state rejection. Leak detection is disabled for sandbox compatibility. This validates the actual header used by `AIVFighter`, not a separate language port. Engine movement, collision, spawning, camera, HUD and asset loading remain unverified until editor integration testing.

Simulation advances in 10 ms substeps with a 250 ms per-frame catch-up cap. Long stalls can slow combat timers relative to real time; tune this policy before production.

## Editor validation checklist

- Build both editor and game targets with warnings reviewed.
- Verify Entry map uses `IVGameMode`, the pawn is possessed, and all fighters spawn above the floor.
- Check move/look, lock acquisition/release/dead-target loss, camera collision and dodge wall sweeps.
- Confirm one hit per strike, no friendly damage, no wall-through hits and correct iframe timing.
- Confirm enemy windup feedback, stamina UI, victory/defeat and restart.
- Check engine material `Color` parameters produce the intended fighter/arena colors; replace with project-owned materials for production.
- Package a Development build and test it outside PIE before publishing a playable build.

## Primary API references

- [Epic: input overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/input-overview-in-unreal-engine)
- [Epic: SetupPlayerInputComponent, UE 5.5](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/GameFramework/APawn/SetupPlayerInputComponent?application_version=5.5)
- [Epic: UGameplayStatics, UE 5.5](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/Kismet/UGameplayStatics?application_version=5.5)
- [Epic: AHUD, UE 5.5](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/GameFramework/AHUD?application_version=5.5)

MIT licensed source. Unreal Engine and its built-in content remain subject to Epic's own license.
