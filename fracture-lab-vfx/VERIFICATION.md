# Verification

Checked locally on Linux with Node.js 24.19.0:

- 16 physics test groups passed.
- Repeated simulation checked 100 seeded impacts across three materials for finite positions.
- Particle expiration, floor bounce, direction and force behavior verified.
- UI harness passed render loop, triggers, material selection, replay, frame/preset export wiring, preset validation/application and reset.
- Both JavaScript files passed syntax checks.

Not checked here: real-browser visual layout, actual PNG download/decoding, real file-picker import, Windows behavior, frame rate on the user's PC, GitHub Actions or game-engine integration. Canvas rendering in the UI harness uses test stubs, not a real renderer.
