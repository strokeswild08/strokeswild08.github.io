extends Control
const Inventory = preload("res://scripts/inventory.gd")
const Catalog = preload("res://scripts/catalog.gd")
const Slot = preload("res://scripts/slot.gd")
const Glyph = preload("res://scripts/glyph.gd")
const Save = preload("res://scripts/save_store.gd")
var inventory: RefCounted
var selected_bucket := "bag"
var selected_index := 0
var slots: Array[Button] = []
var bag_grid: GridContainer
var chest_grid: GridContainer
var stats_label: Label
var details_title: Label
var details_text: Label
var detail_glyph: Control
var use_button: Button
var transfer_button: Button
var health_bar: ProgressBar
var dummy_bar: ProgressBar
var log_label: Label
var capacity_label: Label
var dummy_health := 100
var log_lines: Array[String] = []
var recipe_buttons: Dictionary = {}
var reset_dialog: ConfirmationDialog

func text(value: String, size_px: int = 17, color: Color = Color("d6e0d5")) -> Label:
	var item := Label.new()
	item.text = value
	item.add_theme_font_size_override("font_size", size_px)
	item.add_theme_color_override("font_color", color)
	return item

func style(background: String, border: String = "354c3e") -> StyleBoxFlat:
	var item := StyleBoxFlat.new()
	item.bg_color = Color(background)
	item.border_color = Color(border)
	item.set_border_width_all(1)
	item.set_corner_radius_all(8)
	item.content_margin_left = 18
	item.content_margin_right = 18
	item.content_margin_top = 18
	item.content_margin_bottom = 18
	return item

func panel(parent: Control, heading: String, width: float) -> VBoxContainer:
	var container := PanelContainer.new()
	container.custom_minimum_size.x = width
	container.add_theme_stylebox_override("panel", style("14271f"))
	parent.add_child(container)
	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation", 12)
	container.add_child(content)
	content.add_child(text(heading, 13, Color("d9bd84")))
	return content

func button(parent: Control, title: String, action: Callable) -> Button:
	var item := Button.new()
	item.text = title
	item.custom_minimum_size.y = 38
	item.add_theme_font_size_override("font_size", 14)
	item.add_theme_stylebox_override("normal", style("283d2e", "54715a"))
	item.add_theme_stylebox_override("hover", style("3a5140", "b9a271"))
	item.add_theme_stylebox_override("pressed", style("405a44", "d9bd84"))
	item.pressed.connect(action)
	parent.add_child(item)
	return item

func add_slots(parent: Control, name: String, count: int, columns: int) -> GridContainer:
	var grid := GridContainer.new()
	grid.columns = columns
	grid.add_theme_constant_override("h_separation", 7)
	grid.add_theme_constant_override("v_separation", 7)
	parent.add_child(grid)
	for i in count:
		var item := Slot.new()
		item.host = self
		item.bucket_name = name
		item.index = i
		grid.add_child(item)
		slots.append(item)
	return grid

func _ready() -> void:
	inventory = Inventory.new()
	inventory.starter()
	var background := ColorRect.new()
	background.color = Color("0e1d16")
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(background)
	var outer := MarginContainer.new()
	outer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]: outer.add_theme_constant_override("margin_" + side, 24)
	add_child(outer)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	outer.add_child(scroll)
	var layout := VBoxContainer.new()
	layout.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	layout.add_theme_constant_override("separation", 16)
	scroll.add_child(layout)
	var header := HBoxContainer.new()
	layout.add_child(header)
	var name_box := VBoxContainer.new()
	name_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(name_box)
	name_box.add_child(text("WILD STROKES / GODOT GAME SYSTEMS", 12, Color("d9bd84")))
	name_box.add_child(text("Fieldpack", 46))
	name_box.add_child(text("Inventory, equipment & crafting — an interactive native workbench.", 15, Color("a0b9a4")))
	var toolbar := VBoxContainer.new()
	header.add_child(toolbar)
	button(toolbar, "Save loadout  /  F5", save_loadout)
	button(toolbar, "Load loadout  /  F9", load_loadout)
	var body := HBoxContainer.new()
	body.add_theme_constant_override("separation", 14)
	layout.add_child(body)
	var left := panel(body, "01 / BACKPACK", 440)
	capacity_label = text("", 14, Color("a0b9a4"))
	left.add_child(capacity_label)
	bag_grid = add_slots(left, "bag", Inventory.BAG_SIZE, 6)
	button(left, "Sort & combine stacks", func(): inventory.sort_bag())
	left.add_child(text("Drag to move · Shift-drag to split\nDouble-click to equip or use", 13, Color("a0b9a4")))
	var middle := panel(body, "02 / LOADOUT", 268)
	add_slots(middle, "equipment", 3, 3)
	stats_label = text("", 19)
	middle.add_child(stats_label)
	middle.add_child(text("HEALTH", 12, Color("a0b9a4")))
	health_bar = ProgressBar.new()
	health_bar.custom_minimum_size.y = 18
	middle.add_child(health_bar)
	middle.add_child(HSeparator.new())
	detail_glyph = Glyph.new()
	detail_glyph.custom_minimum_size = Vector2(80, 70)
	middle.add_child(detail_glyph)
	details_title = text("", 21)
	middle.add_child(details_title)
	details_text = text("", 14, Color("a0b9a4"))
	details_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	middle.add_child(details_text)
	use_button = button(middle, "Equip / use", activate_selected)
	transfer_button = button(middle, "Transfer", transfer_selected)
	var right := panel(body, "03 / CAMP WORKBENCH", 280)
	for recipe_id in Catalog.RECIPES:
		var recipe: Dictionary = Catalog.RECIPES[recipe_id]
		var parts: Array[String] = []
		for id in recipe["cost"]: parts.append("%d %s" % [recipe["cost"][id], Catalog.item(id)["name"]])
		var requirement := text(" + ".join(parts), 12, Color("a0b9a4"))
		requirement.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		right.add_child(requirement)
		var id_copy: String = recipe_id
		recipe_buttons[recipe_id] = button(right, recipe["name"], func(): inventory.craft(id_copy))
	right.add_child(HSeparator.new())
	right.add_child(text("TRAINING DUMMY", 12, Color("d9bd84")))
	dummy_bar = ProgressBar.new()
	dummy_bar.custom_minimum_size.y = 18
	right.add_child(dummy_bar)
	button(right, "Strike dummy", strike_dummy)
	button(right, "Take a training hit", take_hit)
	button(right, "Reset dummy", func(): dummy_health = 100; refresh())
	var bottom := HBoxContainer.new()
	bottom.add_theme_constant_override("separation", 14)
	layout.add_child(bottom)
	var storage := panel(bottom, "04 / SHARED CHEST", 440)
	chest_grid = add_slots(storage, "chest", Inventory.CHEST_SIZE, 6)
	var journal := panel(bottom, "ACTIVITY / TRY THE SYSTEM", 562)
	journal.get_parent().size_flags_horizontal = Control.SIZE_EXPAND_FILL
	log_label = text("", 14, Color("a0b9a4"))
	log_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	journal.add_child(log_label)
	var loot_row := HBoxContainer.new()
	loot_row.add_theme_constant_override("separation", 10)
	journal.add_child(loot_row)
	button(loot_row, "Gather 3 herbs", func(): inventory.add_item("herb", 3))
	button(loot_row, "Gather 2 ore", func(): inventory.add_item("iron", 2))
	button(loot_row, "Gather 1 ember", func(): inventory.add_item("ember", 1))
	button(journal, "Reset starter loadout", func(): reset_dialog.popup_centered())
	layout.add_child(text("GDSCRIPT / DATA-DRIVEN ITEMS / TRANSACTIONAL CRAFTING / VERSIONED SAVES", 11, Color("7e9e87")))
	reset_dialog = ConfirmationDialog.new()
	reset_dialog.title = "Reset current loadout?"
	reset_dialog.dialog_text = "Replace the current inventory with the starter items? Your saved file stays available."
	reset_dialog.confirmed.connect(func(): inventory.starter(); dummy_health = 100; refresh())
	add_child(reset_dialog)
	inventory.changed.connect(refresh)
	inventory.message.connect(log_message)
	refresh()
	log_message("Equip the sword, strike the dummy, then craft an ember blade to compare damage.")

func selected_stack() -> Dictionary:
	return inventory.bucket(selected_bucket)[selected_index] if inventory.valid_index(selected_bucket, selected_index) else {}

func select_slot(name: String, index: int) -> void:
	selected_bucket = name
	selected_index = index
	refresh()

func activate_selected() -> void:
	var stack := selected_stack()
	if stack.is_empty(): return
	if selected_bucket == "equipment":
		inventory.transfer(selected_bucket, selected_index)
	elif Catalog.item(stack["id"])["kind"] == "consumable":
		inventory.consume(selected_bucket, selected_index)
	else:
		if not inventory.equip_from(selected_bucket, selected_index): log_message("This item is a crafting material; use it at the workbench.")

func transfer_selected() -> void:
	inventory.transfer(selected_bucket, selected_index)

func refresh() -> void:
	for slot in slots: slot.refresh()
	var values: Dictionary = inventory.stats()
	stats_label.text = "ATK %d    /    DEF %d" % [values["attack"], values["defense"]]
	health_bar.value = inventory.health
	dummy_bar.value = dummy_health
	var used := 0
	for stack in inventory.bag:
		if not stack.is_empty(): used += 1
	capacity_label.text = "%d / 24 slots occupied" % used
	var stack := selected_stack()
	use_button.disabled = stack.is_empty()
	transfer_button.disabled = stack.is_empty()
	if stack.is_empty():
		details_title.text = "Empty slot"
		details_text.text = "Select an item to inspect it. Drop compatible gear into the weapon, armor or charm slot."
		detail_glyph.item_id = ""
	else:
		var item: Dictionary = Catalog.item(stack["id"])
		details_title.text = item["name"]
		details_text.text = item["description"] + "\n\n" + item["kind"].capitalize() + " · Stack limit " + str(item["stack"])
		detail_glyph.item_id = stack["id"]
		use_button.text = "Unequip to backpack" if selected_bucket == "equipment" else ("Drink potion" if item["kind"] == "consumable" else "Equip item")
		use_button.disabled = item["kind"] == "material" or (item["kind"] == "consumable" and inventory.health >= 100)
	transfer_button.text = "Move to chest" if selected_bucket == "bag" else "Move to backpack"
	detail_glyph.queue_redraw()
	for recipe_id in recipe_buttons:
		var possible := true
		for id in Catalog.RECIPES[recipe_id]["cost"]:
			if inventory.count_item(id) < Catalog.RECIPES[recipe_id]["cost"][id]: possible = false
		recipe_buttons[recipe_id].disabled = not possible

func log_message(value: String) -> void:
	log_lines.push_front("• " + value)
	if log_lines.size() > 5: log_lines.pop_back()
	log_label.text = "\n".join(log_lines)

func strike_dummy() -> void:
	if inventory.health <= 0:
		log_message("You are down. Drink a potion before training.")
		return
	if dummy_health == 0:
		log_message("Dummy defeated. Reset it to keep training.")
		return
	var damage: int = inventory.stats()["attack"]
	dummy_health = maxi(0, dummy_health - damage)
	log_message("Hit dummy for %d damage. %d health remains." % [damage, dummy_health])
	refresh()

func take_hit() -> void:
	var damage := maxi(1, 18 - int(inventory.stats()["defense"]))
	inventory.health = maxi(0, inventory.health - damage)
	log_message("Training hit: %d damage. Armor reduces the impact." % damage)
	refresh()

func save_loadout() -> void:
	log_message("Loadout saved." if Save.write(inventory) == OK else "Could not save loadout.")

func load_loadout() -> void:
	if not Save.read_into(inventory): log_message("No valid save found. Current items were kept.")

func _unhandled_key_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.physical_keycode == KEY_F5: save_loadout()
		elif event.physical_keycode == KEY_F9: load_loadout()
