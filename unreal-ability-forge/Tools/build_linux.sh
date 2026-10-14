#!/usr/bin/env bash
set -euo pipefail
: "${FORGE_UE_ROOT:?Set FORGE_UE_ROOT to your Unreal Engine 5.5 directory}"
FORGE_PROJECT="$(cd -- "$(dirname -- "$0")/.." && pwd)/AbilityForge.uproject"
"$FORGE_UE_ROOT/Engine/Build/BatchFiles/Linux/Build.sh" AbilityForgeEditor Linux Development "$FORGE_PROJECT" -WaitMutex
