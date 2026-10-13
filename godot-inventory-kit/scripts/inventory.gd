extends RefCounted
## UI-independent inventory domain. All rejected operations leave state unchanged.
signal changed
signal message(text: String)
const Catalog = preload("res://scripts/catalog.gd")
const BAG_SIZE := 24
const CHEST_SIZE := 12
var bag: Array = []
var chest: Array = []
var equipment: Array = [{}, {}, {}]
var health := 65

func _init() -> void:
	bag.resize(BAG_SIZE)
	chest.resize(CHEST_SIZE)
	for i in bag.size(): bag[i] = {}
	for i in chest.size(): chest[i] = {}

func bucket(name: String) -> Array:
	match name:
		"bag": return bag
		"chest": return chest
		"equipment": return equipment
	return []

func valid_index(name: String, index: int) -> bool:
	return index >= 0 and index < bucket(name).size()

func notify(text: String) -> void:
	changed.emit()
	message.emit(text)

func accepts(name: String, index: int, stack: Dictionary) -> bool:
	if not valid_index(name, index): return false
	return name != "equipment" or stack.is_empty() or Catalog.item(stack["id"])["kind"] == Catalog.EQUIPMENT[index]

func _insert(target: Array, id: String, quantity: int) -> int:
	var remaining := quantity
	var maximum: int = Catalog.item(id)["stack"]
	for stack in target:
		if not stack.is_empty() and stack["id"] == id and stack["quantity"] < maximum:
			var amount := mini(remaining, maximum - int(stack["quantity"]))
			stack["quantity"] += amount
			remaining -= amount
			if remaining == 0: return 0
	for i in target.size():
		if target[i].is_empty():
			var amount := mini(remaining, maximum)
			target[i] = {"id": id, "quantity": amount}
			remaining -= amount
			if remaining == 0: return 0
	return remaining

func add_item(id: String, quantity: int, destination: String = "bag") -> bool:
	if Catalog.item(id).is_empty() or quantity <= 0 or destination not in ["bag", "chest"]: return false
	var next := bucket(destination).duplicate(true)
	if _insert(next, id, quantity) != 0:
		message.emit("Not enough space. No items were added.")
		return false
	if destination == "bag": bag = next
	else: chest = next
	notify("Collected %d × %s." % [quantity, Catalog.item(id)["name"]])
	return true

func move(from: String, source: int, to: String, destination: int, amount: int = 0) -> bool:
	if not valid_index(from, source) or not valid_index(to, destination) or (from == to and source == destination): return false
	var origin: Dictionary = bucket(from)[source]
	var target: Dictionary = bucket(to)[destination]
	if origin.is_empty() or not accepts(to, destination, origin): return false
	var quantity: int = int(origin["quantity"]) if amount == 0 else amount
	if quantity <= 0 or quantity > int(origin["quantity"]): return false
	if not target.is_empty() and target["id"] == origin["id"]:
		if to == "equipment": return false
		var moved := mini(quantity, int(Catalog.item(origin["id"])["stack"]) - int(target["quantity"]))
		if moved == 0: return false
		target["quantity"] += moved
		origin["quantity"] -= moved
		if origin["quantity"] == 0: bucket(from)[source] = {}
	elif target.is_empty():
		bucket(to)[destination] = {"id": origin["id"], "quantity": quantity}
		origin["quantity"] -= quantity
		if origin["quantity"] == 0: bucket(from)[source] = {}
	else:
		# Swaps cannot split a stack or put the displaced item in an incompatible gear slot.
		if quantity != int(origin["quantity"]) or not accepts(from, source, target): return false
		bucket(from)[source] = target
		bucket(to)[destination] = origin
	notify("Moved %s." % Catalog.item(bucket(to)[destination]["id"])["name"])
	return true

func equip_from(name: String, index: int) -> bool:
	if not valid_index(name, index): return false
	var stack: Dictionary = bucket(name)[index]
	if stack.is_empty(): return false
	var slot: int = Catalog.EQUIPMENT.find(Catalog.item(stack["id"])["kind"])
	return move(name, index, "equipment", slot) if slot >= 0 else false

func transfer(name: String, index: int) -> bool:
	if not valid_index(name, index) or bucket(name)[index].is_empty(): return false
	var destination := "chest" if name == "bag" else "bag"
	var stack: Dictionary = bucket(name)[index]
	var next := bucket(destination).duplicate(true)
	if _insert(next, stack["id"], int(stack["quantity"])) != 0:
		message.emit("Destination is full. Nothing moved.")
		return false
	if destination == "bag": bag = next
	else: chest = next
	bucket(name)[index] = {}
	notify("Transferred to " + destination + ".")
	return true

func consume(name: String, index: int) -> bool:
	if not valid_index(name, index): return false
	var stack: Dictionary = bucket(name)[index]
	if stack.is_empty() or Catalog.item(stack["id"])["kind"] != "consumable": return false
	if health >= 100:
		message.emit("Health is full. Potion kept.")
		return false
	health = mini(100, health + int(Catalog.item(stack["id"])["heal"]))
	stack["quantity"] -= 1
	if stack["quantity"] == 0: bucket(name)[index] = {}
	notify("Potion used. Health restored.")
	return true

func count_item(id: String) -> int:
	var total := 0
	for stack in bag:
		if not stack.is_empty() and stack["id"] == id: total += int(stack["quantity"])
	return total

func craft(recipe_id: String) -> bool:
	if not Catalog.RECIPES.has(recipe_id): return false
	var recipe: Dictionary = Catalog.RECIPES[recipe_id]
	for id in recipe["cost"]:
		if count_item(id) < recipe["cost"][id]:
			message.emit("Missing crafting materials in backpack.")
			return false
	var next := bag.duplicate(true)
	for id in recipe["cost"]:
		var needed: int = recipe["cost"][id]
		for i in next.size():
			if not next[i].is_empty() and next[i]["id"] == id:
				var amount := mini(needed, int(next[i]["quantity"]))
				next[i]["quantity"] -= amount
				needed -= amount
				if next[i]["quantity"] == 0: next[i] = {}
				if needed == 0: break
	if _insert(next, recipe["output"], recipe["quantity"]) != 0:
		message.emit("No room for crafted item. Materials kept.")
		return false
	bag = next
	notify("Crafted " + Catalog.item(recipe["output"])["name"] + ".")
	return true

func stats() -> Dictionary:
	var values := {"attack": 5, "defense": 0}
	for stack in equipment:
		if not stack.is_empty():
			values["attack"] += Catalog.item(stack["id"])["attack"]
			values["defense"] += Catalog.item(stack["id"])["defense"]
	return values

func sort_bag() -> void:
	var totals: Dictionary = {}
	for stack in bag:
		if not stack.is_empty(): totals[stack["id"]] = int(totals.get(stack["id"], 0)) + int(stack["quantity"])
	var ids: Array = totals.keys()
	ids.sort()
	var next: Array = []
	next.resize(BAG_SIZE)
	for i in next.size(): next[i] = {}
	for id in ids: _insert(next, id, totals[id])
	bag = next
	notify("Backpack sorted and stacks combined.")

func snapshot() -> Dictionary:
	return {"version": 1, "bag": bag.duplicate(true), "chest": chest.duplicate(true), "equipment": equipment.duplicate(true), "health": health}

func restore(data: Variant) -> bool:
	if not data is Dictionary or data.get("version") != 1: return false
	var sizes := {"bag": BAG_SIZE, "chest": CHEST_SIZE, "equipment": 3}
	for name in sizes:
		var values: Variant = data.get(name)
		if not values is Array or values.size() != sizes[name]: return false
		for i in values.size():
			var stack: Variant = values[i]
			if not stack is Dictionary: return false
			if stack.is_empty(): continue
			if not stack.get("id") is String or Catalog.item(stack["id"]).is_empty(): return false
			var quantity: Variant = stack.get("quantity")
			if not (quantity is int or quantity is float): return false
			if not is_finite(float(quantity)) or float(quantity) != floorf(float(quantity)): return false
			if quantity < 1 or quantity > Catalog.item(stack["id"])["stack"]: return false
			if name == "equipment" and (quantity != 1 or Catalog.item(stack["id"])["kind"] != Catalog.EQUIPMENT[i]): return false
	var hp: Variant = data.get("health")
	if not (hp is int or hp is float) or not is_finite(float(hp)) or float(hp) != floorf(float(hp)) or hp < 0 or hp > 100: return false
	# Normalize JSON numbers and keep caller dictionaries independent.
	bag = data["bag"].duplicate(true)
	chest = data["chest"].duplicate(true)
	equipment = data["equipment"].duplicate(true)
	for name in sizes:
		for stack in bucket(name):
			if not stack.is_empty(): stack["quantity"] = int(stack["quantity"])
	health = int(hp)
	notify("Loadout restored.")
	return true

func starter() -> void:
	bag.clear(); bag.resize(BAG_SIZE)
	chest.clear(); chest.resize(CHEST_SIZE)
	equipment = [{}, {}, {}]
	for i in bag.size(): bag[i] = {}
	for i in chest.size(): chest[i] = {}
	health = 65
	_insert(bag, "iron_sword", 1)
	_insert(bag, "leather_armor", 1)
	_insert(bag, "potion", 3)
	_insert(bag, "herb", 12)
	_insert(bag, "iron", 10)
	_insert(bag, "ember", 6)
	_insert(chest, "ward_charm", 1)
	_insert(chest, "potion", 5)
	notify("Starter loadout ready. Drag items or double-click to use/equip.")
