# Using Fieldpack in your game

## Inventory API

```gdscript
const Inventory = preload("res://scripts/inventory.gd")
var inventory = Inventory.new()

func _ready():
    inventory.changed.connect(update_hud)
    inventory.message.connect(show_feedback)
    inventory.add_item("herb", 3)  # Returns false if all three cannot fit.

func on_pickup():
    if inventory.add_item("iron", 2):
        # Only remove the world pickup after the model accepts it.
        pickup.queue_free()
```

Initialize a fresh empty model for a real game; `starter()` is a demo seed/reset. Do not call `starter()` every time a menu opens. Own one model per player and pass that same instance to your UI.

| Method | Contract |
| --- | --- |
| `add_item(id, quantity, destination)` | Adds to bag/chest completely, or keeps current state |
| `move(from, index, to, index, amount=0)` | Whole move by default; partial moves merge/split; swaps require a complete stack |
| `equip_from(container, index)` | Finds compatible gear slot; may swap current gear back into source |
| `transfer(container, index)` | Moves a full stack to the other storage; equipped gear returns to bag |
| `consume(container, index)` | Uses a potion when health is below 100 |
| `craft(recipe_id)` | Uses backpack ingredients and inserts output atomically |
| `stats()` | Returns base attack plus gear attack and defense |
| `sort_bag()` | Rebuilds sorted stacks without changing item totals |
| `snapshot()` | Returns an independent save dictionary |
| `restore(data)` | Validates the complete save before replacing any live state |

All mutation methods emit `changed` after success. UI feedback uses `message`; not every low-level false return emits a message, so callers should provide contextual feedback where useful.

## Add your own items

Add a unique stable ID to `Catalog.ITEMS`. Include `name`, `kind`, `stack`, `attack`, `defense`, `color` and `description`. A potion additionally needs `heal`. Kinds are `weapon`, `armor`, `charm`, `consumable` and `material`; stock equipment slots use the first three.

The built-in icon view draws based on kind and ID. Replace it with a TextureRect that reads your own texture map. Keep the inventory ID independent from texture path and display name.

Recipes define an output ID, output quantity and a dictionary of ingredient costs. Stock crafting only looks in the backpack. Change that rule deliberately if your game supports crafting from nearby chests.

## Transactions and drag/drop

Pickup, transfer and crafting stage their changes in a copy before committing. A failed output insertion never consumes ingredients. Sort combines existing stacks and creates no items.

`slot.gd` implements Godot's `_get_drag_data`, `_can_drop_data` and `_drop_data` Control methods. The payload includes the owning UI instance, source container/index and amount. Cross-workbench drags are rejected. Model rules remain the final authority even when a drop preview was accepted.

The UI workbench is a synchronous local demo. In a networked game, validate operations on the authoritative server and use revisions so a stale payload cannot manipulate a newly replaced item.

## Persistence

`Save.write(model)` stores a JSON envelope in `user://fieldpack-v1.json` through a temporary file and rename. `Save.read_into(model)` rejects unreadable or oversized files before asking `restore` to validate the complete schema.

The schema stores version, arrays for bag/chest/equipment and health. Empty slots are `{}`. Occupied slots contain stable `id` and positive whole `quantity`. JSON numeric values are normalized back to integers after validation.

Do not renumber gear slots or change capacities without a migration. A production game can add backup files, multiple save slots and additional game-state fields. The demo does not encrypt saves or treat them as an anti-cheat boundary.

## Training buttons

The dummy is a small UI demonstration of integration: attack damage reads `stats()["attack"]`, while incoming damage is `max(1, 18 - defense)`. A defeated dummy stays defeated until reset. These buttons are not a full combat controller.

## Layout and input

The demo uses native Godot Buttons, containers and scroll controls with code-drawn item symbols. It targets desktop mouse/keyboard; scrollbars keep the workbench accessible if the window is narrower than the content. Keyboard focus works for ordinary buttons. Controller navigation and an in-world HUD need a separate input pass.

## Pairing with Nightshift

The inventory model can replace Nightshift's `has_key` flag: add a `station_key` definition, add it on pickup and check its presence at the door. Save the inventory snapshot alongside the rest of your game state. Integration is described here as a next step; the two sample projects are currently separate.
