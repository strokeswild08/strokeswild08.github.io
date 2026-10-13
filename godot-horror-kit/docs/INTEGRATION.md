# Integrating Nightshift systems

## Scene entry and dependencies

The root scene is a Node3D running `game.gd`. It constructs the world, then instantiates Sound, Player, Enemy and Hud. Player/Enemy/Interaction/Hud each receive the root as their `game` property before being added to the tree. No autoloads or addons are required.

To embed a system in your project, implement the `game` interface it uses or replace calls with your own signals. For example, `player.gd` expects `playing`, `overlay_open`, `sound.cue()` and `hud.prompt`; `enemy.gd` expects `player`, `playing`, `overlay_open`, `sound.cue()` and `lose()`.

## Collision layers

| Bit/value | Role | Used by |
| --- | --- | --- |
| 1 / 1 | Static world | Walls, floor and archive desk |
| 2 / 2 | Player | Player body; enemy sight ray |
| 3 / 4 | Enemy | Enemy body |
| 4 / 8 | Interactable | Area3D objects |

The interaction ray uses mask 9 (world + interactions), with areas enabled. A wall blocks interaction with an item behind it. Enemy vision uses mask 3 (world + player), excluding its own RID. Character movement collides with the world; capture is based on distance plus an unobstructed sight ray.

## Add an interaction

Create an Area3D with a CollisionShape3D, assign `interactable.gd`, set `game`, then set `kind`, `title` and `text`. Add your visual as a child. The ready function assigns the interaction collision layer.

For a new behavior, extend the `interact()` match or provide a separate script implementing `prompt() -> String` and `interact() -> void`. The player checks for the prompt interface; the stock sample assumes any prompted item also implements `interact()`.

## Tune the controller and AI

Player exports walk/sprint speed, sensitivity and interaction range. Enemy exports patrol/chase speed, sight/hearing ranges and search duration. Tune these on instances or in the script defaults.

Sight has a forward cone during patrol/search and omnidirectional acquisition while chasing. Close-range vision ignores the cone, but always checks occlusion. Hearing only triggers when the player sprints within range; this is intentional simplified noise behavior.

The level's AStarGrid2D prevents diagonal movement. Enemy paths consume cell centers in order, and update when the target cell changes. All patrol cells and spawn/objective cells must remain walkable after changing the map.

## Checkpoints

Save data lives in `user://nightshift-v1.json`:

```json
{"version":1,"position":[3.6,0.1,3.6],"yaw":0.0,"key":false,"door":false,"battery":100.0,"flashlight":true}
```

Validation rejects unexpected versions, missing fields, non-finite numbers, blocked cells, extreme height, unsafe tile-edge positions, invalid battery values and a door unlocked without a key. Saves are written to a temporary file before rename; failed saves show feedback. The archive's safe checkpoint location avoids its solid desk.

Add new persistent fields with defaults and migrate the version before changing the schema. Store stable object IDs rather than node paths if your own game needs many pickups and doors. Large production games should also preserve backups and expose save slots.

## Pause behavior

Menus and notes set `overlay_open`; both player and enemy stop updating during overlays. The scene tree remains active so the interface responds. Closing the overlay recaptures the mouse only while a game is active. Win/loss set `playing` false.

## Porting to Unreal Engine 5

This release is Godot GDScript. UE5 requires a separate implementation: Character/Pawn movement, collision-channel interaction traces, ActorComponents for inventory/interactions, an AIController with navigation and state logic, UMG widgets and a SaveGame class. This guide describes a possible architecture; it does not claim UE5 compatibility or include Blueprint assets.
