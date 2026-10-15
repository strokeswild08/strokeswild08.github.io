class_name StealthGuard
extends RefCounted

enum State { PATROL, INVESTIGATE, CHASE, SEARCH }
var position: Vector2
var facing := Vector2.RIGHT
var route: PackedVector2Array
var waypoint := 0
var state := State.PATROL
var suspicion := 0.0
var last_seen := Vector2.ZERO
var target := Vector2.ZERO
var search_time := 0.0
var lost_time := 0.0
var repath := 0.0
var path := PackedVector2Array()
var transitions := 0

func _init(points: PackedVector2Array) -> void:
	route = points
	position = route[0]
	target = route[1]
	waypoint = 1

func change(next: State) -> void:
	if state == next:
		return
	state = next
	transitions += 1
	repath = 0.0
	if state == State.SEARCH:
		search_time = 5.0

func hear(origin: Vector2, radius: float) -> void:
	if state != State.CHASE and position.distance_to(origin) < radius:
		target = origin
		change(State.INVESTIGATE)
		repath = 0.0

func tick(dt: float, player: Vector2, crouched: bool, world: StealthWorld) -> void:
	var delta := player - position
	var in_sight := delta.length() < (150.0 if crouched else 215.0) and facing.dot(delta.normalized()) > cos(deg_to_rad(38)) and world.visible(position, player)
	if in_sight:
		suspicion = minf(1.0, suspicion + dt * (1.0 if crouched else 1.9))
		last_seen = player
		lost_time = 0.0
		if suspicion >= 1.0:
			change(State.CHASE)
	else:
		suspicion = maxf(0.0, suspicion - dt * 0.32)
		lost_time += dt
	if state == State.CHASE:
		target = last_seen
		if lost_time > 1.6 and position.distance_to(last_seen) < 28:
			change(State.SEARCH)
	elif state == State.SEARCH:
		search_time -= dt
		facing = facing.rotated(dt * 1.4)
		if in_sight and suspicion >= 1.0:
			change(State.CHASE)
		elif search_time <= 0.0:
			change(State.PATROL)
			target = route[waypoint]
		return
	elif position.distance_to(target) < (28.0 if state == State.INVESTIGATE else 15.0):
		if state == State.INVESTIGATE:
			change(State.SEARCH)
			return
		waypoint = (waypoint + 1) % route.size()
		target = route[waypoint]
	repath -= dt
	if repath <= 0.0:
		path = world.path(position, target)
		repath = 0.35
	while path.size() > 0 and position.distance_to(path[0]) < 7:
		path.remove_at(0)
	if path.size() > 0:
		var direction := (path[0] - position).normalized()
		facing = facing.lerp(direction, minf(dt * 8, 1)).normalized()
		position = world.slide(position, direction * (122.0 if state == State.CHASE else 75.0) * dt)

func label() -> String:
	return State.keys()[state]
