#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build
java com.sun.tools.javac.Main --release 17 -d build src/strokes/quests/*.java test/strokes/quests/*.java
java -cp build strokes.quests.JournalTests
