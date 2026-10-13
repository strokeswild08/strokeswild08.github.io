extends Button
const Catalog = preload("res://scripts/catalog.gd")
const Glyph = preload("res://scripts/glyph.gd")
var host: Control
var bucket_name := "bag"
var index := 0
var glyph: Control
var quantity: Label
var caption: Label

func _ready() -> void:
	custom_minimum_size = Vector2(72, 86)
	mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	glyph = Glyph.new()
	glyph.position = Vector2(13, 6)
	glyph.size = Vector2(46, 46)
	add_child(glyph)
	quantity = Label.new()
	quantity.position = Vector2(45, 3)
	quantity.add_theme_font_size_override("font_size", 13)
	quantity.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(quantity)
	caption = Label.new()
	caption.position = Vector2(4, 59)
	caption.size = Vector2(64, 22)
	caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	caption.add_theme_font_size_override("font_size", 10)
	caption.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(caption)
	pressed.connect(func(): host.select_slot(bucket_name, index))
	refresh()

func refresh() -> void:
	var stack: Dictionary = host.inventory.bucket(bucket_name)[index]
	var active: bool = host.selected_bucket == bucket_name and host.selected_index == index
	var style := StyleBoxFlat.new()
	style.bg_color = Color("24372f") if active else Color("182922")
	style.border_color = Color("d4b877") if active else Color("3c5042")
	style.set_border_width_all(2 if active else 1)
	style.set_corner_radius_all(5)
	add_theme_stylebox_override("normal", style)
	var hover := style.duplicate()
	hover.bg_color = Color("304238")
	add_theme_stylebox_override("hover", hover)
	add_theme_stylebox_override("pressed", hover)
	if stack.is_empty():
		glyph.item_id = ""
		quantity.text = ""
		caption.text = Catalog.EQUIPMENT[index].capitalize() if bucket_name == "equipment" else "—"
		tooltip_text = "Empty " + (Catalog.EQUIPMENT[index] if bucket_name == "equipment" else "slot")
	else:
		var item: Dictionary = Catalog.item(stack["id"])
		glyph.item_id = stack["id"]
		quantity.text = str(stack["quantity"]) if stack["quantity"] > 1 else ""
		caption.text = item["name"]
		tooltip_text = item["name"] + "\n" + item["description"] + "\nDouble-click: use / equip. Shift-drag: split stack."
	glyph.queue_redraw()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.double_click and event.pressed:
		host.select_slot(bucket_name, index)
		host.activate_selected()
		accept_event()

func _get_drag_data(_position: Vector2) -> Variant:
	var stack: Dictionary = host.inventory.bucket(bucket_name)[index]
	if stack.is_empty(): return null
	var amount := ceili(float(stack["quantity"]) / 2.0) if Input.is_physical_key_pressed(KEY_SHIFT) else int(stack["quantity"])
	var preview := Label.new()
	preview.text = "%s × %d" % [Catalog.item(stack["id"])["name"], amount]
	preview.add_theme_font_size_override("font_size", 18)
	set_drag_preview(preview)
	return {"owner": host.get_instance_id(), "from": bucket_name, "index": index, "amount": amount}

func _can_drop_data(_position: Vector2, data: Variant) -> bool:
	if not data is Dictionary or data.get("owner") != host.get_instance_id(): return false
	if not data.get("from") is String or not data.get("index") is int or not data.get("amount") is int: return false
	if not host.inventory.valid_index(data["from"], data["index"]): return false
	var stack: Dictionary = host.inventory.bucket(data["from"])[data["index"]]
	return not stack.is_empty() and host.inventory.accepts(bucket_name, index, stack)

func _drop_data(_position: Vector2, data: Variant) -> void:
	if not _can_drop_data(_position, data): return
	if not host.inventory.move(data["from"], data["index"], bucket_name, index, data["amount"]):
		host.log_message("Move rejected: full stack or incompatible swap.")
