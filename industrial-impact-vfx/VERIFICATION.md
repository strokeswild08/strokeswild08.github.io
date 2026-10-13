# Verification

Locally checked on Linux:

- Portable rules compiled with g++ C++17, Wall/Wextra/Werror and pedantic flags.
- Sanitization, invalid values, cooldown and capacity assertions passed, including 201 clamp samples.
- JavaScript effect tests passed deterministic initialization, intensity changes, preset validation, all four lifetimes and dt clamping.
- UI harness passed material selection, firing, rendering calls, pause/resume, replay and PNG/JSON export wiring.
- JavaScript syntax and plugin descriptor JSON checked.

Unreal Editor is not installed. UnrealHeaderTool, UnrealBuildTool, actual Niagara user-parameter binding, engine playtesting, physical-surface hit routing, real-browser rendering/downloads and performance on the user's PC remain unverified. The UI harness uses test stubs rather than a browser renderer. No native Niagara assets were created.
