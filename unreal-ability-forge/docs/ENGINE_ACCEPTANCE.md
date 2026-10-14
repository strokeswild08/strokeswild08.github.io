# Unreal acceptance — pending

This source project has not been compiled or run in Unreal. Run these checks in UE 5.5 before labelling it engine-tested or shipping a playable build. Record engine version, platform, build output and screenshots with the results.

1. Generate project files and build `AbilityForgeEditor` with UHT and UBT. Confirm no missing module/includes/UFUNCTION errors; portable tests are separate.
2. Open the editor, save any active dirty map, execute `Tools/setup_editor.py`. Confirm M_ForgeTint / M_ForgeGlow and Maps/AbilityArena exist. Re-running must preserve existing assets.
3. Open AbilityArena, select Default Player Start and one-player Standalone PIE. Confirm camera, WASD, mouse aiming, both attack buttons, Shift dash and R reset.
4. Confirm six targets, floor, boundaries, cover, target labels, generated material colors, HUD and muzzle alignment. Shoot each surface from the front and side.
5. Verify fireball collision, blocked muzzle rejection, lifetime expiry and blast falloff; a target behind cover must receive no blast damage. Failed spawn/cast must not consume cooldown.
6. Verify lightning cannot hit through cover, hits the crosshair-selected visible target from the muzzle, and misses consume cooldown. Mesh beam must disappear.
7. Dash into all four walls and both cover pieces. Confirm no tunnelling at normal/low frame rates. Distinguish its additional 600 cm displacement from CharacterMovement gravity/collision effects.
8. Destroy targets and verify 3-second restoration. R resets targets/cooldowns and destroys owned projectiles/effects. Test repeated start/stop PIE without leaked actors or components.
9. Assign each locally authored Niagara system, confirm parameter types/visual bindings, finite lifetime, normal alignment and cleanup. No bundled Niagara assets exist to validate automatically.
10. Create/save the local map, set it as Game Default Map, include it in packaging maps, generate starter materials and package Development Win64. Check standalone input, lighting, material cook references and collision in the packaged build. Other platforms and Shipping have not been evaluated.

## Capture plan after acceptance

Record an authentic 20–30 second Unreal clip: arena overview, fireball against stone, lightning against metal/glass, dash into cover, HUD cooldowns, and reset. Add real screenshots and engine assets to the repository after accepting them. The supplied SVG cover is a schematic, not a screenshot. Do not present the project page as playable Unreal gameplay.
