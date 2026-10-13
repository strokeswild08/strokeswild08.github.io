extends Node3D
const Level = preload("res://scripts/level.gd")
const Player = preload("res://scripts/player.gd")
const Enemy = preload("res://scripts/enemy.gd")
const Interaction = preload("res://scripts/interactable.gd")
const Hud = preload("res://scripts/hud.gd")
const Sound = preload("res://scripts/sound.gd")
const Save = preload("res://scripts/save_store.gd")
var player: CharacterBody3D
var enemy: CharacterBody3D
var hud: CanvasLayer
var sound: Node
var key_object: Area3D
var has_key := false
var door_open := false
var playing := false
var overlay_open := true
var elapsed := 0.0
var lamps: Array[OmniLight3D] = []
var material_cache: Dictionary = {}

func _ready() -> void:
	configure_input()
	build_level()
	sound = Sound.new()
	add_child(sound)
	player = Player.new()
	player.game = self
	player.position = Level.point(Level.START) + Vector3.UP * 0.1
	player.rotation.y = PI
	add_child(player)
	enemy = Enemy.new()
	enemy.game = self
	enemy.position = Level.point(Level.ENEMY) + Vector3.UP * 0.1
	add_child(enemy)
	hud = Hud.new()
	hud.game = self
	add_child(hud)
	show_menu()

func configure_input() -> void:
	var keys := {"forward": KEY_W, "back": KEY_S, "left": KEY_A, "right": KEY_D, "sprint": KEY_SHIFT, "interact": KEY_E, "flashlight": KEY_F, "pause": KEY_ESCAPE, "save": KEY_F5, "load": KEY_F9}
	for action in keys:
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		var event := InputEventKey.new()
		event.physical_keycode = keys[action]
		InputMap.action_add_event(action, event)

func material(hex: String) -> StandardMaterial3D:
	if not material_cache.has(hex):
		var item := StandardMaterial3D.new()
		item.albedo_color = Color(hex)
		item.roughness = 0.94
		material_cache[hex] = item
	return material_cache[hex]

func box(parent: Node3D, size: Vector3, pos: Vector3, color: String, solid: bool = false) -> Node3D:
	var root: Node3D = StaticBody3D.new() if solid else Node3D.new()
	root.position = pos
	parent.add_child(root)
	var mesh := MeshInstance3D.new()
	var cube := BoxMesh.new()
	cube.size = size
	mesh.mesh = cube
	mesh.material_override = material(color)
	root.add_child(mesh)
	if solid:
		root.collision_layer = 1
		root.collision_mask = 0
		var shape := CollisionShape3D.new()
		var cube_shape := BoxShape3D.new()
		cube_shape.size = size
		shape.shape = cube_shape
		root.add_child(shape)
	return root

func sign_at(pos: Vector3, text: String, color: Color = Color("c4d5c6")) -> void:
	var sign := Label3D.new()
	sign.position = pos
	sign.text = text
	sign.font_size = 62
	sign.pixel_size = 0.006
	sign.modulate = color
	sign.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	sign.no_depth_test = false
	add_child(sign)

func make_interaction(kind: String, title: String, cell: Vector2i, size: Vector3, color: String, text: String = "") -> Area3D:
	var item := Interaction.new()
	item.kind = kind
	item.title = title
	item.text = text
	item.game = self
	item.position = Level.point(cell) + Vector3.UP * 0.75
	add_child(item)
	var collision := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size + Vector3.ONE * 0.25
	collision.shape = shape
	item.add_child(collision)
	box(item, size, Vector3.ZERO, color)
	return item

func build_level() -> void:
	var environment := WorldEnvironment.new()
	var settings := Environment.new()
	settings.background_mode = Environment.BG_COLOR
	settings.background_color = Color("101c20")
	settings.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	settings.ambient_light_color = Color("96aea2")
	settings.ambient_light_energy = 0.28
	settings.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment.environment = settings
	add_child(environment)
	var width := float(Level.MAP[0].length()) * Level.TILE
	var depth := float(Level.MAP.size()) * Level.TILE
	box(self, Vector3(width, 0.3, depth), Vector3(width / 2.0 - Level.TILE / 2.0, -0.15, depth / 2.0 - Level.TILE / 2.0), "303c39", true)
	box(self, Vector3(width, 0.2, depth), Vector3(width / 2.0 - Level.TILE / 2.0, 3.25, depth / 2.0 - Level.TILE / 2.0), "151f21")
	for y in Level.MAP.size():
		for x in Level.MAP[y].length():
			var cell := Vector2i(x, y)
			var pos := Level.point(cell)
			if not Level.walkable(cell):
				box(self, Vector3(Level.TILE, 3.2, Level.TILE), pos + Vector3.UP * 1.6, "46514b" if (x + y) % 3 else "3a4943", true)
				# Continuous lower wall bands make the procedural station readable.
				box(self, Vector3(Level.TILE + 0.015, 0.12, Level.TILE + 0.015), pos + Vector3.UP * 0.7, "263832")
			else:
				box(self, Vector3(Level.TILE - 0.07, 0.015, Level.TILE - 0.07), pos + Vector3.UP * 0.008, "354640" if (x + y) % 2 else "2f3e3b")
				if (x + y) % 4 == 0:
					box(self, Vector3(0.75, 0.06, 0.22), pos + Vector3.UP * 3.1, "a6bda8")
					var lamp := OmniLight3D.new()
					lamp.position = pos + Vector3.UP * 2.8
					lamp.light_color = Color("aac6b5")
					lamp.light_energy = 1.3
					lamp.omni_range = 6.0
					add_child(lamp)
					lamps.append(lamp)
	key_object = make_interaction("key", "Take brass exit key", Level.KEY, Vector3(0.4, 0.12, 0.12), "e0b25b")
	box(self, Vector3(1.0, 0.6, 0.75), Level.point(Level.KEY) + Vector3.UP * 0.3, "4c4234", true)
	make_interaction("note", "Night supervisor's log", Vector2i(3, 1), Vector3(0.4, 0.05, 0.3), "d4d2b9", "23:40 / END OF SHIFT\n\nThe exit key is on the archive desk in the south-west wing.\n\nIf you hear footsteps that are not yours, stop running. The caretaker hears you. Walls break its line of sight.\n\nSwitch your flashlight off when you can; the battery slowly recovers.")
	make_interaction("battery", "Take spare battery", Vector2i(8, 3), Vector3(0.2, 0.3, 0.2), "758f76")
	var exit_object := make_interaction("door", "Exit", Level.EXIT, Vector3(1.8, 2.5, 0.18), "294d47")
	exit_object.position.y = 1.25
	box(self, Vector3(0.08, 0.1, 0.14), exit_object.position + Vector3(0.55, -0.1, -0.17), "d1af72")
	sign_at(Level.point(Level.EXIT) + Vector3.UP * 2.75, "EXIT", Color("d7bf7c"))
	sign_at(Level.point(Level.KEY) + Vector3.UP * 2.25, "ARCHIVE / KEY")
	sign_at(Level.point(Level.START) + Vector3.UP * 2.3, "NORTH STATION\nNIGHT SHIFT")

func _process(delta: float) -> void:
	if not playing or overlay_open:
		return
	elapsed += delta
	if not lamps.is_empty():
		lamps[0].light_energy = 1.05 + sin(elapsed * 11.0) * 0.15

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause"):
		if playing and overlay_open:
			hud.hide_card()
		elif playing:
			pause_menu()
	if playing and not overlay_open:
		if event.is_action_pressed("save"):
			save_checkpoint()
		elif event.is_action_pressed("load"):
			load_checkpoint()

func show_menu() -> void:
	hud.show_card("Nightshift", "The station closed an hour ago. You are still inside.\n\nFind the brass key in the south-west archive and reach the north-east exit. Stay quiet. The caretaker is listening.\n\nWASD move · Mouse look · Shift sprint\nE interact · F flashlight · Esc pause\n\nA native Godot 4 horror starter by Wild Strokes.")
	hud.button("Start a new shift", start_new)
	if not Save.read().is_empty():
		hud.button("Continue checkpoint", load_checkpoint)
	hud.button("Settings", show_settings)
	hud.button("Quit", func(): get_tree().quit())

func start_new() -> void:
	has_key = false
	door_open = false
	elapsed = 0.0
	player.position = Level.point(Level.START) + Vector3.UP * 0.1
	player.rotation.y = PI
	player.camera.rotation = Vector3.ZERO
	player.velocity = Vector3.ZERO
	player.battery = 100.0
	player.stamina = 100.0
	player.flashlight = true
	key_object.used = false
	key_object.show()
	key_object.collision_layer = 8
	for item in get_children():
		if item is Area3D and item.get("kind") == "battery":
			item.used = false
			item.show()
			item.collision_layer = 8
	reset_enemy()
	playing = true
	hud.hide_card()
	hud.toast("Archive: south-west. Exit: north-east. Walk quietly.")

func reset_enemy() -> void:
	enemy.position = Level.point(Level.ENEMY) + Vector3.UP * 0.1
	enemy.velocity = Vector3.ZERO
	enemy.state = "PATROL"
	enemy.path.clear()
	enemy.patrol_index = 0
	enemy.repath_time = 0.0

func pause_menu() -> void:
	hud.show_card("Take a breath.", "The shift is paused. Your checkpoint keeps the key, flashlight battery and location. The caretaker resets on load.")
	hud.button("Resume", hud.hide_card)
	hud.button("Save checkpoint", save_checkpoint)
	hud.button("Load checkpoint", load_checkpoint)
	hud.button("Settings", show_settings)
	hud.button("Main menu", func(): playing = false; show_menu())

func show_settings() -> void:
	hud.show_card("Make it yours.", "Adjust mouse sensitivity, camera movement and sound.")
	var slider := HSlider.new()
	slider.min_value = 0.0007
	slider.max_value = 0.006
	slider.step = 0.0001
	slider.value = player.sensitivity
	slider.value_changed.connect(func(value: float): player.sensitivity = value)
	hud.controls.add_child(hud.label("Mouse sensitivity", 15))
	hud.controls.add_child(slider)
	var bob := CheckButton.new()
	bob.text = "Camera head bob"
	bob.button_pressed = player.head_bob
	bob.toggled.connect(func(value: bool): player.head_bob = value)
	hud.controls.add_child(bob)
	var audio := HSlider.new()
	audio.min_value = 0.0
	audio.max_value = 1.0
	audio.step = 0.01
	audio.value = db_to_linear(AudioServer.get_bus_volume_db(0))
	audio.value_changed.connect(func(value: float): AudioServer.set_bus_volume_db(0, linear_to_db(maxf(value, 0.0001))))
	hud.controls.add_child(hud.label("Sound volume", 15))
	hud.controls.add_child(audio)
	hud.button("Back", pause_menu if playing else show_menu)

func show_note(title: String, text: String) -> void:
	hud.show_card(title, text)
	hud.button("Close note", hud.hide_card)

func save_checkpoint() -> void:
	# Snap to the current walkable cell's center to prevent loading inside walls.
	var pos := Level.safe_point(Level.cell_of(player.position))
	var error := Save.write({"version": 1, "position": [pos.x, pos.y, pos.z], "yaw": player.rotation.y, "key": has_key, "door": door_open, "battery": player.battery, "flashlight": player.flashlight})
	hud.toast("Checkpoint saved." if error == OK else "Checkpoint could not be saved.")

func load_checkpoint() -> void:
	var data := Save.read()
	if data.is_empty():
		hud.toast("No valid checkpoint found. Start a new shift or save first.")
		return
	var pos: Array = data["position"]
	player.position = Vector3(float(pos[0]), float(pos[1]), float(pos[2]))
	player.rotation.y = float(data["yaw"])
	player.camera.rotation = Vector3.ZERO
	player.velocity = Vector3.ZERO
	player.battery = float(data["battery"])
	player.flashlight = bool(data["flashlight"])
	player.stamina = 100.0
	has_key = bool(data["key"])
	door_open = bool(data["door"])
	key_object.used = has_key
	key_object.visible = not has_key
	key_object.collision_layer = 0 if has_key else 8
	reset_enemy()
	# Do not spawn the caretaker directly on a saved player.
	if enemy.position.distance_to(player.position) < 6.0:
		enemy.position = Level.point(Vector2i(7, 3)) + Vector3.UP * 0.1
	playing = true
	hud.hide_card()
	hud.toast("Checkpoint loaded. The caretaker has returned to patrol.")

func lose() -> void:
	playing = false
	hud.show_card("Shift interrupted.", "The caretaker found you. Walk instead of sprinting near it, then use a wall to break line of sight.")
	if not Save.read().is_empty():
		hud.button("Retry checkpoint", load_checkpoint)
	hud.button("Start again", start_new)
	hud.button("Main menu", show_menu)

func win() -> void:
	playing = false
	var minutes := int(elapsed) / 60
	var seconds := int(elapsed) % 60
	hud.show_card("You made it out.", "The brass key turns. Cold air meets you on the other side.\n\nShift completed in %02d:%02d.\n\nThanks for playing Nightshift by Wild Strokes." % [minutes, seconds])
	hud.button("Play another shift", start_new)
	hud.button("Main menu", show_menu)
