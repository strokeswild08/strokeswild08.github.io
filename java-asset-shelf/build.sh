#!/usr/bin/env bash
set -euo pipefail
ASSET_PROJECT_ROOT="$(cd -- "$(dirname -- "$0")" && pwd)"
cd "$ASSET_PROJECT_ROOT"
mkdir -p build/classes
javac --release 17 -Xlint:all -Werror -d build/classes src/shelf/*.java
jar --create --file AssetShelf.jar --main-class shelf.App -C build/classes .
printf '%s\n' 'Built AssetShelf.jar. Run: java -jar AssetShelf.jar'
