extends SceneTree
const Level = preload("res://scripts/level.gd")
const Save = preload("res://scripts/save_store.gd")
var failed := 0

func check(condition: bool, message: String) -> void:
	if condition:
		print("PASS: " + message)
	else:
		failed += 1
		push_error("FAIL: " + message)

func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	# Isolate test saves from real player data.
	var prior := ""
	if FileAccess.file_exists(Save.PATH):
		prior = FileAccess.get_file_as_string(Save.PATH)
	var nav := Level.navigation()
	check(nav.get_id_path(Level.START, Level.KEY).size() > 0, "Archive reachable from start")
	check(nav.get_id_path(Level.KEY, Level.EXIT).size() > 0, "Exit reachable from archive")
	for cell in Level.PATROL:
		check(nav.get_id_path(Level.ENEMY, cell).size() > 0, "Patrol point reachable: " + str(cell))
	check(not Save.valid({"version": 99}), "Unsupported save rejected")
	var fixture := {"version": 1, "position": [3.6, 0.1, 3.6], "yaw": 0.0, "key": false, "door": false, "battery": 70.0, "flashlight": true}
	check(Save.valid(fixture), "Valid checkpoint accepted")
	var broken := fixture.duplicate(true)
	broken["position"] = [0.0, 0.1, 0.0]
	check(not Save.valid(broken), "Checkpoint inside wall rejected")
	broken = fixture.duplicate(true)
	broken["door"] = true
	check(not Save.valid(broken), "Impossible door state rejected")
	check(Save.write(fixture) == OK and Save.read()["battery"] == 70.0, "Save round-trip")
	var game = load("res://main.tscn").instantiate()
	root.add_child(game)
	await process_frame
	await physics_frame
	check(game.hud.overlay_title.text == "Nightshift", "Main menu loads")
	game.start_new()
	check(game.playing and not game.overlay_open, "New game captures gameplay")
	game.key_object.interact()
	check(game.has_key and game.key_object.used, "Key interaction updates world")
	check(Save.read().get("key") == true, "Key automatically checkpoints")
	game.has_key = false
	game.load_checkpoint()
	check(game.has_key and not game.key_object.visible, "Load restores collected key")
	game.show_note("Test", "A note")
	check(game.overlay_open, "Reading note pauses gameplay")
	game.hud.hide_card()
	# Freeze automatic movement so ray/state fixtures are deterministic.
	game.enemy.set_physics_process(false)
	game.player.set_physics_process(false)
	game.enemy.position = Level.point(Vector2i(4, 3))
	game.player.position = Level.point(Vector2i(8, 3))
	game.enemy.state = "CHASE"
	await physics_frame
	await physics_frame
	check(not game.enemy.sees_player(), "Wall blocks enemy line of sight")
	game.enemy.position = Level.point(Vector2i(8, 3))
	game.player.position = Level.point(Vector2i(10, 3))
	await physics_frame
	await physics_frame
	check(game.enemy.sees_player(), "Enemy detects unobstructed player")
	game.player.sprinting = false
	game.enemy._physics_process(0.016)
	check(game.enemy.state == "CHASE", "Sight transitions to chase")
	game.player.position = Level.point(Level.START)
	await physics_frame
	game.enemy._physics_process(0.016)
	check(game.enemy.state == "SEARCH", "Losing sight transitions to search")
	game.enemy.search_left = 0.001
	game.enemy._physics_process(0.1)
	check(game.enemy.state == "PATROL", "Search timeout returns to patrol")
	game.lose()
	check(not game.playing and game.overlay_open, "Capture opens retry menu")
	game.start_new()
	check(not game.has_key and game.key_object.visible, "New game resets key")
	game.player.position = Level.safe_point(Level.KEY)
	await physics_frame
	await physics_frame
	var query := PhysicsShapeQueryParameters3D.new()
	query.shape = game.player.get_child(0).shape
	query.transform = game.player.get_child(0).global_transform
	query.collision_mask = 1
	query.exclude = [game.player.get_rid()]
	check(game.player.get_world_3d().direct_space_state.intersect_shape(query).is_empty(), "Archive checkpoint does not overlap solid desk")
	game.has_key = true
	for child in game.get_children():
		if child is Area3D and child.get("kind") == "door":
			child.interact()
	check(not game.playing and game.door_open and game.hud.overlay_title.text == "You made it out.", "Unlocked exit completes game")
	game.queue_free()
	await process_frame
	await create_timer(0.15).timeout
	if prior.is_empty():
		DirAccess.remove_absolute(Save.PATH)
	else:
		var file := FileAccess.open(Save.PATH, FileAccess.WRITE)
		file.store_string(prior)
		file.close()
	print("RESULT: " + str(failed) + " failures")
	quit(0 if failed == 0 else 1)
