# Industrial Impact — Browser VFX Study + UE5 Source Prototype

Four procedural effect studies: metal sparks, concrete chips/dust, glass shards and smoke puff. Includes an independent browser preview and a C++ Niagara integration component for the Wild Strokes portfolio.

**Delivery status:** this is not a ready-made Niagara asset pack. No `.uasset`, `.umap`, textures, engine binaries or Unreal gameplay footage are included. The four Niagara systems must be authored in Unreal Editor, assigned to the component and tested. Unreal compilation has not been performed here.

## Browser study

[Live preview](https://strokeswild08.github.io/industrial-impact-vfx/) · [Source](https://github.com/strokeswild08/strokeswild08.github.io/tree/main/industrial-impact-vfx)

Open `index.html` locally in a recent browser, keeping its CSS/JS files beside it. Select a material, adjust intensity, size and tint, then click **Fire burst**, the scene, or press Space while the page/canvas has focus. Pause, slow motion, replay, repeating bursts, frame capture and browser preset import/export are supported.

Presets store effect type, intensity, size, tint and seed. Export uses the last fired preset when one exists, otherwise current settings. Playback speed, pause and repeat are view settings and are not saved. PNG capture includes the scene background. Presets are not Niagara assets or automatic Unreal imports.

Processing is local with no network requests or file uploads. Browser effects are 2D Canvas visuals with pixel-based physics. They are not physically identical to the cm-based emitter recipes. Bursts replace earlier particles; lifetimes are bounded. The study includes brief local impact flashes and uses no audio.

## UE5 source

`Plugins/WildStrokesImpact` contains a runtime source plugin:

- `WSImpactComponent`: Blueprint-callable one-shot Niagara spawning.
- Metal, Concrete, Glass and Smoke style asset/tint slots.
- `User.Intensity`, `User.Size`, `User.Color` and `User.Normal` assignment before activation.
- Physical surface routing from a blocking `FHitResult`.
- Per-component cooldown, active-effect budget and teardown cleanup.
- Dedicated-server skip; client delivery/replication is left to the game.
- `WSImpactRules.h`: portable parameter validation and spawn gating used by the real component source.

Install into a C++ Unreal project and follow [Niagara setup](docs/NIAGARA_SETUP.md). The spawning API signature was checked against official UE5.5 docs, but source compatibility still requires your engine/toolchain's UHT/UBT build.

[Real-engine demo checklist](docs/DEMO_AND_CHECKLIST.md) explains what to build and verify before presenting it as an Unreal-ready pack.

## Tests

Node.js 22+ is needed for browser-side development tests:

```sh
node tests/effects.test.cjs
node tests/ui.test.cjs
```

The portable C++ rules can be checked separately with a C++17 compiler:

```sh
g++ -std=c++17 -Wall -Wextra -Werror -pedantic tests/rules_test.cpp -o impact-rules-test
./impact-rules-test
```

This test does not compile the Unreal component. `VERIFICATION.md` records checks and limitations. The UI harness uses a simulated DOM/canvas and is not a real-browser pixel test.

## Portfolio use

Describe this as **a browser effect study with an Unreal Niagara integration source prototype** until real engine acceptance passes. Record browser footage as browser footage. Add authentic engine captures after authoring the systems; do not label the browser study as Unreal gameplay.

The source and procedural visuals contain no private client assets, personal contacts or third-party artwork. The bundled LICENSE grants viewing/running for evaluation; no permissive reuse license is selected. Public source can be viewed and downloaded.

## Official references

- [Niagara SpawnSystemAtLocation API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Niagara/UNiagaraFunctionLibrary/SpawnSystemAtLocation?application_version=5.5)
- [Niagara component parameter setters](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/Niagara/UNiagaraComponent)
- [Niagara system user parameters](https://dev.epicgames.com/documentation/en-us/unreal-engine/system-settings-reference-for-niagara-effects-in-unreal-engine)
