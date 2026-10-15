extends SceneTree
var game: Node
var frame := 0
func _init() -> void:
	game = load("res://scenes/main.tscn").instantiate()
	root.add_child.call_deferred(game)
func _process(_dt: float) -> bool:
	frame += 1
	if frame == 20:
		root.get_texture().get_image().save_png("res://preview.png")
		quit()
	return false
