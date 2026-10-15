# Validation record

- C# rules compiled directly with Roslyn from .NET SDK 8.0.408, then executed on .NET runtime 8.0.15.
- Actual input file: `Unity/Assets/Scripts/SiegeRules.cs`, also used by the Unity runtime.
- Result: **197 C# assertions passed**.
- Node suite: **4032 assertions passed**. Includes a five-wave input-only bot run.
- Bot result, seed 218: won, wave 5, score 6100, 64.2 simulated seconds, 86 health remaining.
- JavaScript module syntax checks: passed.
- Shared companion SVG renderer: 32 frames rendered through Sharp; a PNG visually inspected for clipping and readability.
- Browser interaction, audio, DOM and responsive layout: not checked in a real browser.
- Unity integration scripts: written and reviewed; not compiled in Unity.
- Unity editor, packaged executable and Unity WebGL export: not available.

The included GIF is a companion renderer capture, not Unity or browser screenshot evidence. Node tests validate browser game rules; they do not establish that all DOM interactions work in a browser.
