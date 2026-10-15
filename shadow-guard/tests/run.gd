extends SceneTree

var failures := 0
func check(value: bool, message: String) -> void:
	if value:
		print("PASS / ", message)
	else:
		push_error(message)
		failures += 1

func _init() -> void:
	var world := StealthWorld.new()
	check(world.blocked(Vector2(240,240)), "Wall collision")
	check(not world.blocked(Vector2(96,160)), "Spawn is walkable")
	check(not world.visible(Vector2(160,256),Vector2(352,256)), "Walls occlude vision")
	check(world.visible(Vector2(96,160),Vector2(192,160)), "Clear line of sight")
	check(not world.path(Vector2(96,122),Vector2(160,122)).is_empty(), "Boundary-adjacent noise has a reachable path")
	var route := world.path(Vector2(160,256),Vector2(352,256))
	check(route.size()>8, "A* routes around cover")
	for point in route:
		check(not world.blocked(point), "Path cell is walkable")
	var g := StealthGuard.new(PackedVector2Array([Vector2(96,160),Vector2(192,160)]))
	for i in 40:
		g.tick(1.0/60,Vector2(180,160),false,world)
	check(g.state == StealthGuard.State.CHASE, "Sustained sight triggers chase")
	g.hear(Vector2(96,400),500)
	check(g.state == StealthGuard.State.CHASE, "Decoy cannot override active chase")
	g.position = g.last_seen
	for i in 110:
		g.tick(1.0/60,Vector2(864,640),false,world)
	check(g.state == StealthGuard.State.SEARCH, "Lost target triggers search at last seen position")
	for i in 310:
		g.tick(1.0/60,Vector2(864,640),false,world)
	check(g.state == StealthGuard.State.PATROL, "Search expires back to patrol")
	g.hear(Vector2(160,160),200)
	check(g.state == StealthGuard.State.INVESTIGATE, "Nearby noise triggers investigation")
	g.position = Vector2(160,160)
	g.tick(1.0/60,Vector2(864,640),false,world)
	check(g.state == StealthGuard.State.SEARCH, "Arrival at noise starts search")
	var hidden := StealthGuard.new(PackedVector2Array([Vector2(160,256),Vector2(160,320)]))
	for i in 60:
		hidden.tick(1.0/60,Vector2(352,256),false,world)
	check(hidden.suspicion == 0, "Player behind wall remains unseen")
	var game = load("res://scenes/main.tscn").instantiate()
	root.add_child(game)
	game._ready()
	for chip in game.chips:
		check(not world.path(Vector2(96,160),chip).is_empty(), "Objective is reachable")
	for guard in game.guards:
		for waypoint in guard.route:
			check(not world.path(guard.position,waypoint).is_empty(), "Patrol waypoint is reachable")
	game.player = Vector2(160,640)
	game._physics_process(0.01)
	check(game.collected == 1, "Data chip pickup")
	game.reset()
	check(game.collected == 0 and game.decoys == 3 and game.outcome == "", "Restart restores mission")
	game.collected = 3
	game.player = Vector2(850,640)
	game._physics_process(0.01)
	check(game.outcome == "EXTRACTION COMPLETE", "Exit completes mission after chips")
	game.reset()
	game.guards[0].position = game.player
	game.guards[0].state = StealthGuard.State.CHASE
	game._physics_process(0.01)
	check(game.outcome == "SIGNAL LOST", "Chasing guard catches player")
	game.free()
	print("FAILURES: ",failures)
	quit(0 if failures == 0 else 1)
