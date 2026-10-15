# Validation record

Initial source preparation: 15 October 2026.

## Completed locally

- GCC C++17 build of `WeaponCore.h`, with `-Wall -Wextra -Wpedantic -Werror`.
- AddressSanitizer and UndefinedBehaviorSanitizer: **17 tests passed**. LeakSanitizer was disabled with `ASAN_OPTIONS=detect_leaks=0` because this container blocks its `/proc` task inspection.
- **100,000 seeded commands** checked ammunition conservation, nonnegative ammunition and bounded progress.
- **20,016 command-by-command comparisons** between native C++ and browser state machines; matching return values, phases, magazine, reserve, shots, remaining time and action progress.
- JavaScript module syntax checks.

The native regression cases cover shot rate, partial reloads, depleted reserve, empty magazines, jam threshold, blocked input during actions, timer restart rejection, invalid timing/randomness, settings bounds, reset and spending all 72 issued rounds exactly once.

## Automated browser checks

`tests/browser.cjs` runs a temporary local HTTP server and Chromium through Playwright. It covers:

- Desktop target hits and statistics.
- Reload start/completion, reserve transfer and blocked fire.
- Manual jam, blocked reload/fire, timed clear and blocked fire while clearing.
- A full held-fire magazine, release outside an action, and no stale trigger after reload.
- Keyboard reset while an action button has focus.
- Random-jam branch and condition changes.
- Touch target hit and jam/clear on a 390 px viewport.
- No horizontal overflow at desktop/mobile viewport sizes.
- Reduced-motion context, sound toggle and browser runtime errors.
- Desktop and mobile screenshot artifacts.

The local container could not launch Chromium. The first hosted browser run passed on 15 October 2026 ([run 38687570344](https://github.com/strokeswild08/strokeswild08.github.io/actions/runs/38687570344)). Desktop capture review exposed stale status text after a condition reset; the render invalidation was fixed and a regression assertion was added. Read the latest **Breachline verification** run for the post-fix result. Screenshot artifacts are browser captures only.

## Still unverified

- UnrealBuildTool and UnrealHeaderTool compilation.
- Editor Play-in-Editor controls, lighting, collisions, target labels, runtime spawn and traces.
- Packaged Development/Shipping builds and cook references.
- Native visual quality, timing under slow frames, focus changes and different input devices.
- Other Unreal versions and platforms.

No Unreal Engine installation is available in the development container or the public CI job. Passing portable C++ tests cannot establish that an Unreal module compiles. The source is explicitly presented as an integration prototype.

## Unreal acceptance checklist

1. Generate/build `BreachlineEditor` on UE 5.5, resolving any engine-specific build issues first.
2. Play from Entry; verify the floor, five targets, walls, light, HUD and pawn are present.
3. Move with WASD, aim and hit each plate; verify one counted hit per active target and a 2-second return.
4. Confirm only accepted shots spend rounds and apply damage; confirm a first-frame trigger press cannot bypass cooldown.
5. Reload a partial/empty magazine; verify finite reserve and blocked fire.
6. Press J, then R and fire; verify the jam remains. Press F; verify no shots until clearing completes.
7. Reset during reload/clear; verify timers, counters and targets reset.
8. Cook/package the Entry map with engine basic shapes and repeat the drill outside the editor.

## API references consulted

- [Epic: UWorld::LineTraceSingleByChannel, UE 5.5](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/Engine/UWorld/LineTraceSingleByChannel?application_version=5.5)
- [Epic: AHUD, UE 5.5](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/GameFramework/AHUD?application_version=5.5)
- [Epic: Player Input quick start](https://dev.epicgames.com/documentation/unreal-engine/quick-start-guide-to-player-input-in-unreal-engine-cpp)

References guide the integration; they are not evidence that this project was built in Unreal.
