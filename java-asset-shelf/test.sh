#!/usr/bin/env bash
set -euo pipefail
ASSET_PROJECT_ROOT="$(cd -- "$(dirname -- "$0")" && pwd)"
cd "$ASSET_PROJECT_ROOT"
bash build.sh
mkdir -p build/test-classes
javac --release 17 -Xlint:all -Werror -cp build/classes -d build/test-classes tests/shelf/*.java
java -Djava.awt.headless=true -cp build/classes:build/test-classes shelf.CoreTest
java -Djava.awt.headless=true -cp build/classes:build/test-classes shelf.UiSmoke
