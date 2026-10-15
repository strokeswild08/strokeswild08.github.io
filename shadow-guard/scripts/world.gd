class_name StealthWorld
extends RefCounted

const CELL := 32
const SIZE := Vector2i(29, 22)
var grid := AStarGrid2D.new()
var walls: Array[Rect2] = [
	Rect2(224, 192, 64, 256), Rect2(416, 128, 160, 64),
	Rect2(448, 320, 64, 224), Rect2(672, 224, 128, 64),
	Rect2(672, 416, 64, 160), Rect2(128, 576, 192, 32)]

func _init() -> void:
	grid.region = Rect2i(Vector2i.ZERO, SIZE)
	grid.cell_size = Vector2(CELL, CELL)
	grid.offset = Vector2(16, 16)
	grid.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_NEVER
	grid.update()
	for x in SIZE.x:
		for y in SIZE.y:
			var p := Vector2(x * CELL + 16, y * CELL + 16)
			grid.set_point_solid(Vector2i(x,y), blocked(p, 12))

func blocked(p: Vector2, radius: float = 10.0) -> bool:
	if not Rect2(48,112,864,576).grow(-radius).has_point(p):
		return true
	for wall in walls:
		if wall.grow(radius).has_point(p):
			return true
	return false

func slide(p: Vector2, motion: Vector2) -> Vector2:
	if not blocked(p + Vector2(motion.x, 0)):
		p.x += motion.x
	if not blocked(p + Vector2(0, motion.y)):
		p.y += motion.y
	return p

func visible(a: Vector2, b: Vector2) -> bool:
	for wall in walls:
		if Geometry2D.segment_intersects_segment(a,b,wall.position,Vector2(wall.end.x,wall.position.y)) != null or Geometry2D.segment_intersects_segment(a,b,Vector2(wall.end.x,wall.position.y),wall.end) != null or Geometry2D.segment_intersects_segment(a,b,wall.end,Vector2(wall.position.x,wall.end.y)) != null or Geometry2D.segment_intersects_segment(a,b,Vector2(wall.position.x,wall.end.y),wall.position) != null:
			return false
	return true

func path(a: Vector2, b: Vector2) -> PackedVector2Array:
	var start := Vector2i(a / CELL)
	var target := Vector2i(b / CELL)
	start = nearest_cell(start)
	target = nearest_cell(target)
	return grid.get_point_path(start, target)

func nearest_cell(cell: Vector2i) -> Vector2i:
	if grid.is_in_boundsv(cell) and not grid.is_point_solid(cell):
		return cell
	var best := Vector2i(3, 5)
	var distance := INF
	for x in SIZE.x:
		for y in SIZE.y:
			var candidate := Vector2i(x,y)
			if not grid.is_point_solid(candidate):
				var d := Vector2(candidate-cell).length_squared()
				if d < distance:
					distance = d
					best = candidate
	return best
