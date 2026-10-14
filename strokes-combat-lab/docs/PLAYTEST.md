# Playtest checklist

Run after importing into Unity. Record Editor version, render pipeline, test result and any Console errors.

1. Generate the scene, enter Play, click Game view. Confirm four fighters, HUD, floor and walls are visible.
2. Move diagonally and into every wall. Speed should not increase diagonally, and walls should block movement and dashes.
3. Aim with the pointer, strike an enemy in front, then one behind. Only targets inside the arc and range should take damage.
4. Tap light during recovery. Confirm the next attack uses the next combo step; wait over 0.55 seconds after recovery and confirm the sequence resets.
5. Compare heavy damage and wind-up with a light strike. Attack arcs and orange telegraphs should appear.
6. Drain stamina; actions without enough stamina should fail without reducing the remaining amount. Confirm regeneration delay and cap.
7. Dodge through an incoming strike. Compare hits during the invulnerability window and at its beginning/end; validate timing with slow Play Mode stepping.
8. Verify a hit interrupts enemy wind-up, and dead enemies stop attacking. A multi-collider target must take one hit per swing.
9. Pause and resume. Combat and resource regeneration should stop while paused; R should restart even when paused.
10. Win, lose, and restart ten times. Confirm counters reset, fighters respawn, and the Console stays clear.
11. Use a low target frame rate and verify swings still connect when an active interval is crossed in one frame.
12. Build and run a desktop player, repeating movement, attacks, sound, pause and restart.

Do not mark checks as passed until observed in Unity. Source review is not a substitute for these checks.
