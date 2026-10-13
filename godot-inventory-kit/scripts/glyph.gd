extends Control
const Catalog = preload("res://scripts/catalog.gd")
var item_id := ""

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE

func _draw() -> void:
	if Catalog.item(item_id).is_empty(): return
	var color := Color(Catalog.item(item_id)["color"])
	draw_set_transform(Vector2.ZERO, 0.0, size / Vector2(64, 64))
	match Catalog.item(item_id)["kind"]:
		"weapon":
			draw_colored_polygon(PackedVector2Array([Vector2(42, 8), Vector2(51, 7), Vector2(50, 17), Vector2(29, 40), Vector2(22, 33)]), color)
			draw_line(Vector2(19, 32), Vector2(33, 46), Color("d6b979"), 5)
			draw_line(Vector2(25, 40), Vector2(14, 52), Color("91734b"), 6)
		"armor":
			draw_colored_polygon(PackedVector2Array([Vector2(21, 12), Vector2(27, 19), Vector2(37, 19), Vector2(43, 12), Vector2(54, 23), Vector2(46, 32), Vector2(43, 50), Vector2(21, 50), Vector2(18, 32), Vector2(10, 23)]), color)
			draw_line(Vector2(32, 22), Vector2(32, 48), color.darkened(0.3), 3)
		"consumable":
			draw_rect(Rect2(25, 9, 14, 8), Color("cab589"))
			draw_circle(Vector2(32, 39), 18, color.darkened(0.1))
			draw_rect(Rect2(27, 17, 10, 14), color)
			draw_line(Vector2(23, 35), Vector2(19, 42), color.lightened(0.4), 3)
		"charm":
			draw_arc(Vector2(32, 22), 13, 0.1, PI - 0.1, 20, Color("d1bb85"), 2)
			draw_colored_polygon(PackedVector2Array([Vector2(32, 24), Vector2(45, 39), Vector2(32, 55), Vector2(19, 39)]), color)
			draw_circle(Vector2(32, 39), 4, color.lightened(0.4))
		"material":
			if item_id == "herb":
				draw_line(Vector2(29, 54), Vector2(35, 15), color.darkened(0.2), 3)
				draw_colored_polygon(PackedVector2Array([Vector2(32, 29), Vector2(17, 16), Vector2(11, 29), Vector2(31, 40)]), color)
				draw_colored_polygon(PackedVector2Array([Vector2(34, 22), Vector2(48, 10), Vector2(53, 25), Vector2(33, 36)]), color.lightened(0.15))
			else:
				draw_colored_polygon(PackedVector2Array([Vector2(13, 47), Vector2(19, 21), Vector2(38, 10), Vector2(52, 27), Vector2(47, 50), Vector2(28, 55)]), color)
				draw_line(Vector2(19, 21), Vector2(33, 32), color.lightened(0.3), 2)
				draw_line(Vector2(33, 32), Vector2(47, 50), color.darkened(0.3), 2)
