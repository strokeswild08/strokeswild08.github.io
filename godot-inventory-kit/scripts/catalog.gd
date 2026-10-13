extends RefCounted
## Stable IDs are used in saves. Art can be swapped without changing the inventory model.
const ITEMS := {
	"iron_sword": {"name": "Iron sword", "kind": "weapon", "stack": 1, "attack": 14, "defense": 0, "color": "b4c5c3", "description": "A dependable blade. Equip it to improve your training damage."},
	"ember_blade": {"name": "Ember blade", "kind": "weapon", "stack": 1, "attack": 26, "defense": 0, "color": "e3a264", "description": "Forged from iron and ember shards. A stronger weapon for the road ahead."},
	"leather_armor": {"name": "Leather armor", "kind": "armor", "stack": 1, "attack": 0, "defense": 5, "color": "b89771", "description": "Light protection. Reduces incoming training damage."},
	"ward_charm": {"name": "Ward charm", "kind": "charm", "stack": 1, "attack": 3, "defense": 3, "color": "ad99cf", "description": "A small ward with a little extra offense and defense."},
	"potion": {"name": "Healing potion", "kind": "consumable", "stack": 10, "attack": 0, "defense": 0, "heal": 35, "color": "df9e8b", "description": "Restores 35 health. Cannot be consumed at full health."},
	"herb": {"name": "Wild herb", "kind": "material", "stack": 30, "attack": 0, "defense": 0, "color": "95bb8c", "description": "A gathered plant used to brew healing potions."},
	"iron": {"name": "Iron ore", "kind": "material", "stack": 30, "attack": 0, "defense": 0, "color": "8fa8ac", "description": "Raw ore used to forge an ember blade."},
	"ember": {"name": "Ember shard", "kind": "material", "stack": 20, "attack": 0, "defense": 0, "color": "e4ab63", "description": "A warm mineral used in weapons and ward charms."},
}
const EQUIPMENT: Array[String] = ["weapon", "armor", "charm"]
const RECIPES := {
	"potion": {"name": "Brew potion", "output": "potion", "quantity": 1, "cost": {"herb": 3}},
	"ember_blade": {"name": "Forge ember blade", "output": "ember_blade", "quantity": 1, "cost": {"iron": 5, "ember": 2}},
	"ward_charm": {"name": "Make ward charm", "output": "ward_charm", "quantity": 1, "cost": {"ember": 3, "herb": 2}},
}

static func item(id: String) -> Dictionary:
	return ITEMS.get(id, {})
