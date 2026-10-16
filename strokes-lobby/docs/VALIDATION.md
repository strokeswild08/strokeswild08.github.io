# Validation

Tested on Linux with Go 1.26.1 and headless Chromium 134.

- `go test -race -cover ./...` passed all 11 tests. HTTP package coverage: 69.2%; lobby engine coverage: 95.1%.
- `go vet ./...` passed.
- Native executable built with `go build -buildvcs=false` to disable VCS stamping in the temporary development workspace.
- An actual TCP HTTP server and SSE connection were exercised by integration tests, including a real streamed chat update and stream disconnect.
- Two independent browser tabs created/joined a room, exchanged messages, readied, started and observed the same moving player.
- Browser checks covered a forced connection interruption/retry, refresh preserving the player identity, round reset, kick, host transfer after leaving, and 390 px mobile layout without horizontal overflow.
- No JavaScript page errors were observed. Screenshots show the actual two-tab session, not a static UI mockup.

The core tests advance the arena to verify scoring and victory; the browser smoke check verifies movement synchronization rather than playing a full ten-point round. Windows, macOS and internet deployment have not been runtime-tested. This build intentionally binds only to the local machine.
