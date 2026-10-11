# Advanced game architecture

The engine runs without dependencies. Open the HTML file directly or serve the folder with any static server. The scripts use browser globals and CommonJS exports for the reusable modules, keeping browser and Node tests compatible.

## Simulation timing

`FixedStepper` consumes elapsed render time in 1/60-second steps. Rendering still runs once per animation frame. An elapsed-time cap bounds catch-up after a slow frame. The renderer draws the most recent state; it does not interpolate states or guarantee a target rendering frame rate.

## Input handling

Keyboard, touch and gamepad each maintain a held-key set. The game merges their states, so releasing a gamepad button does not cancel a held keyboard key. Gamepad polling tracks rising edges and releases all held inputs when disconnected. Analog movement uses a 0.28 dead zone.

`InputBuffer` stores the latest blocked attack for 180 ms. The simulation retries that action after the current move recovers. It expires old actions, and clears the buffer on pause and round resets. This is a single-action buffer, not a full command-input parser.

## Combat

Each move has startup, active and recovery windows. Range and relative jump height are checked before damage. A move can confirm only one hit. Holding guard reduces damage. A new block opens a 140 ms parry window, subject to an 850 ms cooldown. A parry prevents damage, stuns the attacker and awards energy.

`ComboTracker` records confirmed, unblocked hits. Punch, punch, kick within its timeout triggers Void Execution, adding 7 damage and launching the opponent. Taking an enemy hit resets the chain.

## Training and saves

Training freezes the timer, disables opponent decisions, restores player health and energy, and resets the dummy after 1.6 seconds. Training does not contribute to saved match records. Versus records are saved only at a completed match.

`StatsStore` validates non-negative integer fields in version 1 saves. It ignores malformed JSON and handles denied storage or quota errors without preventing play. Records are local to the browser and are not an online leaderboard.

## Verification

`tests/combat.cjs` runs combat integration checks in a browser mock. `tests/systems.cjs` tests fixed timing, buffer expiry, combo expiry, save validation, storage failures and gamepad event edges. The mocks do not verify real pixels, real controller hardware, audio quality or browser rendering performance.
