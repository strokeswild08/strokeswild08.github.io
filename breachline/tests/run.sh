#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p tests/build
"${CXX:-g++}" -std=c++17 -Wall -Wextra -Wpedantic -Werror -fsanitize=address,undefined -fno-omit-frame-pointer -g -ISource/Breachline/Public tests/weapon_test.cpp -o tests/build/weapon_test
./tests/build/weapon_test
"${CXX:-g++}" -std=c++17 -Wall -Wextra -Wpedantic -Werror -ISource/Breachline/Public tests/trace.cpp -o tests/build/trace
node --check demo/app.mjs
node --check demo/weapon-core.mjs
node tests/parity.mjs ./tests/build/trace
