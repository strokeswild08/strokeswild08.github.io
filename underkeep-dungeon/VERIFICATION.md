# Verification

Locally verified on Linux with Node.js 24.19.0:

- 20 core test groups passed.
- 300 map configurations across sizes, chamber counts, extra connections and seeds had connected floor tiles and reachable, distinct objectives.
- Room overlap, perimeter walls, shortest routes, invalid destinations, line-of-sight visibility, collision and item collection checked.
- Checkpoint round-trip and malformed state rejection checked.
- Simulated UI/canvas harness completed an expedition by clicking routes to every item and the exit. It also checked keyboard input, checkpoint save/load, restart, completed-save restore, JSON/PNG export wiring and invalid seed handling.
- JavaScript syntax checks passed.

The UI harness uses a simulated DOM and canvas, not a real browser renderer. Real-browser artwork/layout, PNG pixels and downloads, localStorage persistence across page reloads, touch behavior, older-PC performance and game-engine integration are not verified here. GitHub workflow results are available separately after publication.
