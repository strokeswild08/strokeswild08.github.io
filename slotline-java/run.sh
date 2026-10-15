#!/usr/bin/env sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ -f release/slotline.jar ]; then
  exec java -jar release/slotline.jar "$@"
elif [ -f target/slotline-1.0.0.jar ]; then
  exec java -jar target/slotline-1.0.0.jar "$@"
else
  printf '%s\n' 'Build the project first: ./mvnw clean package' >&2
  exit 1
fi
