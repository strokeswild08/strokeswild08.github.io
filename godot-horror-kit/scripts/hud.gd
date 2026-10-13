extends CanvasLayer
var game: Node3D
var prompt: Label
var objective: Label
var battery_bar: ProgressBar
var stamina_bar: ProgressBar
var status: Label
var message: Label
var overlay: PanelContainer
var overlay_box: VBoxContainer
var overlay_title: Label
var overlay_body: Label
var controls: VBoxContainer
var toast_left := 0.0
var margin: MarginContainer

func label(text: String, size: int = 18, color: Color = Color("d9e4de")) -> Label:
	var item := Label.new()
	item.text = text
	item.add_theme_font_size_override("font_size", size)
	item.add_theme_color_override("font_color", color)
	return item

func panel_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.035, 0.065, 0.065, 0.96)
	style.border_color = Color("40554c")
	style.set_border_width_all(1)
	style.set_corner_radius_all(10)
	style.content_margin_left = 28
	style.content_margin_right = 28
	style.content_margin_top = 26
	style.content_margin_bottom = 26
	return style

func _ready() -> void:
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	var heading := label("NIGHTSHIFT  /  WILD STROKES", 17, Color("b6cabc"))
	heading.position = Vector2(30, 24)
	root.add_child(heading)
	objective = label("Find the brass key in the archive.", 18)
	objective.position = Vector2(30, 52)
	root.add_child(objective)
	var crosshair := label("·", 28)
	crosshair.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	crosshair.position -= Vector2(4, 16)
	root.add_child(crosshair)
	prompt = label("", 19, Color("f0cb86"))
	prompt.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	prompt.position += Vector2(-220, -116)
	prompt.size = Vector2(440, 40)
	prompt.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(prompt)
	var footer := VBoxContainer.new()
	footer.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
	footer.position += Vector2(30, -113)
	footer.size.x = 200
	root.add_child(footer)
	footer.add_child(label("LIGHT / F", 12, Color("b6cabc")))
	battery_bar = ProgressBar.new()
	battery_bar.custom_minimum_size = Vector2(200, 9)
	battery_bar.show_percentage = false
	footer.add_child(battery_bar)
	footer.add_child(label("STAMINA / SHIFT", 12, Color("b6cabc")))
	stamina_bar = ProgressBar.new()
	stamina_bar.custom_minimum_size = Vector2(200, 9)
	stamina_bar.show_percentage = false
	footer.add_child(stamina_bar)
	status = label("", 15)
	status.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	status.position += Vector2(-270, -72)
	status.size = Vector2(240, 24)
	status.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	root.add_child(status)
	var shortcuts := label("E interact  ·  F5 save  ·  F9 load  ·  Esc pause", 13, Color("b6cabc"))
	shortcuts.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	shortcuts.position += Vector2(-260, -34)
	shortcuts.size = Vector2(520, 24)
	shortcuts.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(shortcuts)
	message = label("", 17, Color("f0cb86"))
	message.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	message.position += Vector2(-300, 105)
	message.size = Vector2(600, 32)
	message.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(message)
	# A scrolling modal remains usable on smaller windows.
	margin = MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 24)
	margin.add_theme_constant_override("margin_right", 24)
	margin.add_theme_constant_override("margin_top", 24)
	margin.add_theme_constant_override("margin_bottom", 24)
	root.add_child(margin)
	var center := CenterContainer.new()
	margin.add_child(center)
	overlay = PanelContainer.new()
	overlay.custom_minimum_size = Vector2(580, 0)
	overlay.add_theme_stylebox_override("panel", panel_style())
	center.add_child(overlay)
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size = Vector2(530, 470)
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	overlay.add_child(scroll)
	overlay_box = VBoxContainer.new()
	overlay_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	overlay_box.add_theme_constant_override("separation", 14)
	scroll.add_child(overlay_box)
	overlay_box.add_child(label("01 / FIRST-PERSON HORROR KIT", 12, Color("e0b56f")))
	overlay_title = label("Nightshift", 46)
	overlay_box.add_child(overlay_title)
	overlay_body = label("", 17, Color("b6cabc"))
	overlay_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	overlay_box.add_child(overlay_body)
	controls = VBoxContainer.new()
	controls.add_theme_constant_override("separation", 8)
	overlay_box.add_child(controls)

func button(text: String, action: Callable) -> void:
	var item := Button.new()
	item.text = text
	item.custom_minimum_size.y = 44
	item.add_theme_font_size_override("font_size", 17)
	item.pressed.connect(action)
	controls.add_child(item)
	if controls.get_child_count() == 1:
		item.grab_focus()

func show_card(title: String, body: String) -> void:
	overlay_title.text = title
	overlay_body.text = body
	for child in controls.get_children():
		controls.remove_child(child)
		child.queue_free()
	margin.show()
	prompt.text = ""
	game.overlay_open = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func hide_card() -> void:
	margin.hide()
	game.overlay_open = false
	if game.playing:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func toast(text: String) -> void:
	message.text = text
	toast_left = 4.0

func _process(delta: float) -> void:
	if not is_instance_valid(game.player):
		return
	battery_bar.value = game.player.battery
	stamina_bar.value = game.player.stamina
	objective.text = "Key found. Reach the north-east exit." if game.has_key else "Find the brass key in the south-west archive."
	status.text = "KEEP MOVING" if game.enemy.state == "CHASE" else "Listen. Walk quietly."
	status.modulate = Color("e68b71") if game.enemy.state == "CHASE" else Color.WHITE
	if toast_left > 0:
		toast_left -= delta
		if toast_left <= 0:
			message.text = ""
