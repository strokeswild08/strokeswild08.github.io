extends Area3D
## Attach to an Area3D with a CollisionShape3D. Player discovers its interface by raycast.
@export_enum("key", "note", "door", "battery") var kind: String = "note"
@export var title: String = "Inspect"
@export_multiline var text: String = ""
var game: Node3D
var used := false

func _ready() -> void:
	collision_layer = 8
	collision_mask = 0
	monitoring = false

func prompt() -> String:
	if kind == "door":
		return "E  ·  Leave the station" if game.has_key else "E  ·  Inspect locked exit"
	return "E  ·  " + title

func interact() -> void:
	if used:
		return
	match kind:
		"key":
			used = true
			game.has_key = true
			game.sound.cue("key")
			game.hud.toast("Exit key collected. Checkpoint saved.")
			game.save_checkpoint()
			visible = false
			set_deferred("collision_layer", 0)
		"battery":
			used = true
			game.player.battery = 100.0
			game.sound.cue("click")
			game.hud.toast("Flashlight battery restored.")
			visible = false
			set_deferred("collision_layer", 0)
		"note":
			game.show_note(title, text)
		"door":
			if game.has_key:
				game.door_open = true
				game.sound.cue("door")
				game.win()
			else:
				game.hud.toast("Locked. The brass key is in the south-west archive.")
