extends RefCounted
## Grid layout drives both physical walls and enemy pathfinding.
const TILE := 3.6
const MAP: Array[String] = [
	"#############",
	"#S....#....E#",
	"#.##..#..##.#",
	"#.....#.....#",
	"#..#.....#..#",
	"#..#..#..#..#",
	"#.....#.....#",
	"#.##..#..##.#",
	"#K....#.....#",
	"#...........#",
	"#############",
]
const START := Vector2i(1, 1)
const KEY := Vector2i(1, 8)
const EXIT := Vector2i(11, 1)
const ENEMY := Vector2i(10, 8)
const PATROL: Array[Vector2i] = [Vector2i(10, 8), Vector2i(10, 3), Vector2i(7, 4), Vector2i(7, 9), Vector2i(3, 9)]

static func walkable(cell: Vector2i) -> bool:
	return cell.y >= 0 and cell.y < MAP.size() and cell.x >= 0 and cell.x < MAP[0].length() and MAP[cell.y][cell.x] != "#"

static func point(cell: Vector2i) -> Vector3:
	return Vector3(cell.x * TILE, 0.0, cell.y * TILE)

static func safe_point(cell: Vector2i) -> Vector3:
	var pos := point(cell) + Vector3.UP * 0.1
	# The archive desk occupies its cell center.
	return pos + Vector3(0, 0, -1.0) if cell == KEY else pos

static func cell_of(pos: Vector3) -> Vector2i:
	return Vector2i(roundi(pos.x / TILE), roundi(pos.z / TILE))

static func navigation() -> AStarGrid2D:
	var grid := AStarGrid2D.new()
	grid.region = Rect2i(0, 0, MAP[0].length(), MAP.size())
	grid.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_NEVER
	grid.update()
	for y in MAP.size():
		for x in MAP[y].length():
			grid.set_point_solid(Vector2i(x, y), not walkable(Vector2i(x, y)))
	return grid
