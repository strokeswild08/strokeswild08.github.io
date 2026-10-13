extends SceneTree
const Model = preload("res://scripts/inventory.gd")
const Save = preload("res://scripts/save_store.gd")
var failures := 0

func check(value: bool, title: String) -> void:
	if value: print("PASS: " + title)
	else:
		failures += 1
		push_error("FAIL: " + title)

func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	var m := Model.new()
	m.starter()
	check(m.bag.size() == 24 and m.chest.size() == 12, "Container capacities")
	check(m.stats()["attack"] == 5, "Base attack")
	check(m.equip_from("bag", 0), "Equip sword")
	check(m.stats()["attack"] == 19 and m.bag[0].is_empty(), "Gear updates stats and moves item")
	var before := m.snapshot()
	check(not m.move("bag", 1, "equipment", 0) and m.snapshot() == before, "Wrong gear slot rejects without mutation")
	check(m.equip_from("bag", 1) and m.stats()["defense"] == 5, "Armor defense")
	check(m.consume("bag", 2) and m.health == 100 and m.bag[2]["quantity"] == 2, "Potion heals and consumes one")
	before = m.snapshot()
	check(not m.consume("bag", 2) and m.snapshot() == before, "Full-health consumption rejected")
	check(m.move("bag", 3, "bag", 8, 6), "Split herb stack")
	check(m.bag[3]["quantity"] == 6 and m.bag[8]["quantity"] == 6, "Split conserves quantity")
	check(m.move("bag", 8, "bag", 3) and m.bag[8].is_empty() and m.count_item("herb") == 12, "Merge conserves quantity")
	check(m.transfer("equipment", 0) and m.equipment[0].is_empty(), "Unequip to backpack")
	check(m.craft("ember_blade"), "Craft stronger sword")
	check(m.count_item("iron") == 5 and m.count_item("ember") == 4 and m.count_item("ember_blade") == 1, "Recipe debits exact costs")
	check(m.craft("ward_charm"), "Craft charm")
	before = m.snapshot()
	check(not m.craft("ward_charm") and m.snapshot() == before, "Missing ingredients never consumed")
	check(not m.add_item("unknown", 1) and not m.add_item("iron", -1), "Invalid pickup rejected")
	var full := Model.new()
	for i in full.bag.size(): full.bag[i] = {"id": "iron_sword", "quantity": 1}
	before = full.snapshot()
	check(not full.add_item("potion", 1) and full.snapshot() == before, "Full bag pickup is atomic")
	full.bag[0] = {"id": "herb", "quantity": 30}
	before = full.snapshot()
	check(not full.craft("potion") and full.snapshot() == before, "Full bag crafting preserves materials")
	full.bag[0] = {"id": "herb", "quantity": 3}
	check(full.craft("potion") and full.bag[0]["id"] == "potion", "Consumed ingredient slot can hold recipe output")
	m.starter()
	m.chest[2] = {"id": "herb", "quantity": 29}
	check(m.move("bag", 3, "chest", 2) and m.chest[2]["quantity"] == 30 and m.bag[3]["quantity"] == 11, "Partial merge respects destination stack limit")
	m.equip_from("bag", 0)
	m.chest[3] = {"id": "potion", "quantity": 1}
	before = m.snapshot()
	check(not m.move("equipment", 0, "chest", 3) and m.snapshot() == before, "Swap cannot put a potion in weapon slot")
	check(not m.move("bag", 999, "chest", 1), "Out-of-range moves rejected")
	m.sort_bag()
	check(m.count_item("herb") == 11, "Sort preserves item quantities")
	var restored := Model.new()
	check(restored.restore(JSON.parse_string(JSON.stringify(m.snapshot()))) and restored.snapshot() == m.snapshot(), "JSON round-trip restores normalized items")
	before = restored.snapshot()
	var bad := m.snapshot()
	bad["equipment"][0] = {"id": "herb", "quantity": 1}
	check(not restored.restore(bad) and restored.snapshot() == before, "Malformed equipment save preserves live inventory")
	bad = m.snapshot()
	bad["bag"][0] = {"id": "potion", "quantity": 0.5}
	check(not restored.restore(bad), "Fractional item counts rejected")
	bad = m.snapshot()
	bad["bag"][0] = {"id": "potion", "quantity": 99}
	check(not restored.restore(bad), "Over-capacity stacks rejected")
	bad = m.snapshot()
	bad["health"] = 101
	check(not restored.restore(bad), "Invalid health rejected")
	var previous := FileAccess.get_file_as_string(Save.PATH) if FileAccess.file_exists(Save.PATH) else ""
	check(Save.write(m) == OK and Save.read_into(restored) and restored.snapshot() == m.snapshot(), "Persistent save round-trip")
	var ui = load("res://main.tscn").instantiate()
	root.add_child(ui)
	await process_frame
	await process_frame
	check(ui.slots.size() == 39, "Backpack, chest and gear controls constructed")
	ui.select_slot("bag", 0)
	ui.activate_selected()
	check(ui.inventory.stats()["attack"] == 19, "UI activation equips selected sword")
	ui.strike_dummy()
	check(ui.dummy_health == 81, "Training damage uses gear stat")
	ui.select_slot("bag", 1)
	ui.activate_selected()
	ui.take_hit()
	check(ui.inventory.health == 52, "Training hit applies armor defense")
	var payload := {"owner": ui.get_instance_id(), "from": "bag", "index": 3, "amount": 6}
	check(ui.slots[8]._can_drop_data(Vector2.ZERO, payload), "Compatible drag payload accepted")
	ui.slots[8]._drop_data(Vector2.ZERO, payload)
	check(ui.inventory.bag[8]["quantity"] == 6 and ui.inventory.bag[3]["quantity"] == 6, "UI drop splits stack")
	payload["owner"] = -1
	check(not ui.slots[8]._can_drop_data(Vector2.ZERO, payload), "Foreign drag payload rejected")
	ui.queue_free()
	await process_frame
	if previous.is_empty(): DirAccess.remove_absolute(Save.PATH)
	else:
		var file := FileAccess.open(Save.PATH, FileAccess.WRITE)
		file.store_string(previous)
		file.close()
	print("RESULT: %d failures" % failures)
	quit(0 if failures == 0 else 1)
