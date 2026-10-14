extends SceneTree
var errors = 0
var checks = 0
func check(condition, label):
	checks += 1
	if not condition:
		errors += 1
		push_error(label)
func _initialize(): call_deferred("run")
func run():
	var scene = load("res://main.tscn").instantiate()
	root.add_child(scene)
	scene.set_physics_process(false)
	await process_frame
	check(scene.agents.size() == 3, "Three archetypes spawn")
	check(scene.player.hp == 70, "Player starts healthy")
	check(not scene.walkable(Vector2(208,176)), "Pillar blocks navigation")
	check(scene.path(Vector2(112,176),Vector2(368,176)).size() > 0, "Route around pillar exists")
	check(not scene.line_clear(Vector2(112,176),Vector2(368,176)), "Pillar occludes vision")
	check(scene.line_clear(Vector2(80,80),Vector2(400,80)), "Open corridor has vision")
	for point in scene.path(Vector2(112,176),Vector2(368,176)):
		check(scene.walkable(point), "All path points are walkable")
	var guard = scene.agents[2]
	guard.facing = Vector2.LEFT
	guard.hurt(20,guard.position + Vector2(-100,0))
	check(guard.hp == 125, "Frontal shield reduces damage")
	guard.hurt(20,guard.position + Vector2(100,0))
	check(guard.hp == 105, "Flanking bypasses shield")
	var melee = scene.agents[0]
	melee.position = Vector2(176,336)
	melee.tick(0.016)
	check(melee.state == "CHASE", "Visible player triggers chase")
	melee.position = Vector2(144,336)
	melee.tick(0.016)
	check(melee.state == "ATTACK", "Close player triggers attack")
	for i in range(30): melee.tick(0.016)
	check(scene.player.hp < 70, "Windup commits melee damage")
	melee.position = Vector2(368,176)
	scene.player.position = Vector2(112,176)
	melee.memory = 1
	melee.last_seen = Vector2(112,176)
	melee.tick(0.016)
	check(melee.state == "SEARCH", "Occluded target triggers search memory")
	melee.memory = 0
	melee.tick(0.016)
	check(melee.state == "PATROL", "Expired memory returns to patrol")
	var ranged = scene.agents[1]
	ranged.position = Vector2(176,80)
	scene.player.position = Vector2(112,80)
	ranged.tick(0.016)
	check(ranged.state == "RETREAT", "Ranged keeps distance")
	var retreat = scene.retreat_cell(ranged.position,scene.player.position)
	check(scene.walkable(retreat) and retreat.distance_to(scene.player.position) > ranged.position.distance_to(scene.player.position), "Retreat is reachable and increases distance")
	scene.fire(scene.player,Vector2.RIGHT,19)
	check(scene.projectiles.size() == 1, "Player projectile created")
	scene.frozen = true
	var before = scene.projectiles[0].position
	scene._physics_process(0.1)
	check(scene.projectiles[0].position == before, "Pause stops simulation")
	scene.player.hurt(500, Vector2.ZERO)
	check(scene.game_over, "Player death stops encounter")
	scene.reset()
	check(scene.player.hp == 70 and scene.agents.size() == 3 and scene.projectiles.is_empty() and not scene.game_over, "Reset restores encounter")
	# Simulate a real moving encounter to exercise physics, navigation and projectiles.
	await physics_frame
	for i in range(240):
		scene._physics_process(1.0/60.0)
		await physics_frame
	check(is_instance_valid(scene.player), "Encounter simulation completes")
	print("Watchtower: %d checks, %d failures" % [checks,errors])
	scene.queue_free()
	await process_frame
	quit(1 if errors else 0)
