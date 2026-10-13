extends CharacterBody3D
## Patrol -> Chase -> Search -> Patrol. Occlusion and pathfinding share level geometry.
const Level = preload("res://scripts/level.gd")
@export var patrol_speed := 1.65
@export var chase_speed := 3.8
@export var sight_range := 12.0
@export var hearing_range := 7.0
@export var search_duration := 5.0
var game: Node3D
var state := "PATROL"
var patrol_index := 0
var search_left := 0.0
var last_seen := Vector3.ZERO
var path: Array[Vector2i] = []
var repath_time := 0.0
var route_target := Vector2i(-1, -1)
var nav: AStarGrid2D
var phase := 0.0
var head: MeshInstance3D

func _ready() -> void:
	collision_layer = 4
	collision_mask = 1
	nav = Level.navigation()
	var collider := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.33
	capsule.height = 1.9
	collider.shape = capsule
	collider.position.y = 0.95
	add_child(collider)
	var body := MeshInstance3D.new()
	var mesh := CapsuleMesh.new()
	mesh.radius = 0.32
	mesh.height = 1.9
	body.mesh = mesh
	body.position.y = 0.95
	var material := StandardMaterial3D.new()
	material.albedo_color = Color("172526")
	material.roughness = 0.95
	body.material_override = material
	add_child(body)
	head = MeshInstance3D.new()
	var mask_mesh := BoxMesh.new()
	mask_mesh.size = Vector3(0.38, 0.27, 0.13)
	head.mesh = mask_mesh
	head.position = Vector3(0, 1.58, -0.29)
	var mask_material := StandardMaterial3D.new()
	mask_material.albedo_color = Color("afc3b5")
	head.material_override = mask_material
	add_child(head)
	var glow := OmniLight3D.new()
	glow.light_color = Color("cb5b44")
	glow.light_energy = 0.6
	glow.omni_range = 2.3
	glow.position.y = 1.4
	add_child(glow)

func sees_player() -> bool:
	var offset: Vector3 = game.player.global_position - global_position
	if offset.length() > sight_range:
		return false
	if state != "CHASE" and offset.length() > 2.5 and (-global_transform.basis.z).dot(offset.normalized()) < 0.25:
		return false
	var ray := PhysicsRayQueryParameters3D.create(global_position + Vector3.UP * 1.4, game.player.global_position + Vector3.UP * 1.0, 3, [get_rid()])
	var hit := get_world_3d().direct_space_state.intersect_ray(ray)
	return not hit.is_empty() and hit.get("collider") == game.player

func _physics_process(delta: float) -> void:
	if not game.playing or game.overlay_open:
		return
	var distance: float = global_position.distance_to(game.player.global_position)
	var can_see := sees_player()
	var can_hear: bool = game.player.sprinting and distance < hearing_range
	if can_see or can_hear:
		if state != "CHASE":
			game.sound.cue("alert")
		state = "CHASE"
		last_seen = game.player.global_position
		search_left = search_duration
	elif state == "CHASE":
		state = "SEARCH"
	elif state == "SEARCH":
		search_left -= delta
		if search_left <= 0.0:
			state = "PATROL"
	var destination := last_seen if state != "PATROL" else Level.point(Level.PATROL[patrol_index])
	if state == "PATROL" and global_position.distance_to(destination) < 0.45:
		patrol_index = (patrol_index + 1) % Level.PATROL.size()
		destination = Level.point(Level.PATROL[patrol_index])
		repath_time = 0.0
	var target_cell := Level.cell_of(destination)
	if target_cell != route_target or (path.is_empty() and global_position.distance_to(destination) > 0.5):
		route_target = target_cell
		path = nav.get_id_path(Level.cell_of(global_position), target_cell)
	# Consume centers in order; never cut a corner just because rounding changed cell.
	while not path.is_empty() and global_position.distance_to(Level.point(path[0])) < 0.3:
		path.pop_front()
	var waypoint := Level.point(path[0]) if not path.is_empty() else destination
	var offset := waypoint - global_position
	offset.y = 0.0
	var direction := offset.normalized() if offset.length() > 0.18 else Vector3.ZERO
	var speed := chase_speed if state == "CHASE" else patrol_speed
	velocity.x = direction.x * speed
	velocity.z = direction.z * speed
	velocity.y = 0.0 if is_on_floor() else velocity.y - 20.0 * delta
	move_and_slide()
	if direction.length() > 0.1:
		rotation.y = lerp_angle(rotation.y, atan2(-direction.x, -direction.z), delta * 6.0)
	phase += delta * 3.0
	head.position.y = 1.58 + sin(phase) * 0.03
	if distance < 0.85 and can_see:
		game.lose()
