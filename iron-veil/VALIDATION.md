# Validation record

- Tested rule header: `Source/IronVeil/Public/CombatCore.h`
- Test program: `Tests/combat_tests.cpp`
- Native compiler: GCC, C++17, `-Wall -Wextra -Werror -pedantic`
- Runtime checks: AddressSanitizer + UndefinedBehaviorSanitizer; leak detection disabled
- Result: **25 checks passed**
- Unreal Header Tool / Unreal Build Tool: **not run — Unreal Engine unavailable**
- PIE / standalone / packaged build: **not run**
- Rendered screenshot / gameplay recording: **not available**

Passing rule tests do not establish that Unreal integration compiles or plays correctly. Follow the README's editor checklist before describing this project as a tested playable game.
