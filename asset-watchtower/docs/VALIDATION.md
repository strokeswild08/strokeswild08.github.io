# Validation

Tested on Linux using Go 1.26.1. The module requires Go 1.24 or newer for `os.OpenRoot`.

- `go test -race -cover ./...` passed: HTTP/CLI package 65.5% statement coverage; audit package 91.7%.
- `go vet ./...` passed.
- Native Linux executable built successfully with `go build -buildvcs=false` (VCS stamping disabled for the temporary development workspace).
- Tests decode actual PNG thumbnails, compare deterministic report JSON, use real multipart requests and start an actual local TCP HTTP server.

Windows and macOS binaries have not been runtime-tested. The 5 MiB/2048 px/non-power-of-two thresholds are fixed advisory defaults in this version.

Browser smoke checks passed in headless Chromium 134 against the real Go server: sample generation and scan, duplicate filtering, asset details, search, grid/list switching, JSON download without thumbnails, a real directory upload, and a 390 px mobile viewport with no horizontal overflow. No JavaScript page errors were observed. `screenshot.png` shows the actual sample scan.
