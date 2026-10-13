extends CharacterBody3D
@export var walk_speed := 3.0
@export var sprint_speed := 5.1
@export var sensitivity := 0.0023
@export var interaction_range := 2.8
var game: Node3D
var camera: Camera3D
var torch: SpotLight3D
var battery := 100.0
var stamina := 100.0
var flashlight := true
var sprinting := false
var head_bob := true
var bob_time := 0.0
var footstep_time := 0.0
var target: Area3D

func _ready() -> void:
	collision_layer = 2
	collision_mask = 1
	var shape := CapsuleShape3D.new()
	shape.radius = 0.3
	shape.height = 1.7
	var collider := CollisionShape3D.new()
	collider.shape = shape
	collider.position.y = 0.85
	add_child(collider)
	camera = Camera3D.new()
	camera.position.y = 1.55
	camera.fov = 78.0
	add_child(camera)
	camera.current = true
	torch = SpotLight3D.new()
	torch.light_color = Color("dfecda")
	torch.light_energy = 4.0
	torch.spot_range = 17.0
	torch.spot_angle = 31.0
	torch.shadow_enabled = true
	camera.add_child(torch)

func _unhandled_input(event: InputEvent) -> void:
	if not game.playing or game.overlay_open:
		return
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * sensitivity)
		camera.rotation.x = clampf(camera.rotation.x - event.relative.y * sensitivity, -1.3, 1.3)
	if event.is_action_pressed("flashlight"):
		flashlight = not flashlight
		game.sound.cue("click")
	if event.is_action_pressed("interact") and is_instance_valid(target):
		target.interact()

func _physics_process(delta: float) -> void:
	if not game.playing or game.overlay_open:
		sprinting = false
		return
	var axis := Input.get_vector("left", "right", "forward", "back")
	var direction := (transform.basis * Vector3(axis.x, 0.0, axis.y)).normalized()
	sprinting = Input.is_action_pressed("sprint") and stamina > 1.0 and axis.length() > 0.1
	stamina = clampf(stamina + (-25.0 if sprinting else 17.0) * delta, 0.0, 100.0)
	var speed := sprint_speed if sprinting else walk_speed
	velocity.x = move_toward(velocity.x, direction.x * speed, 16.0 * delta)
	velocity.z = move_toward(velocity.z, direction.z * speed, 16.0 * delta)
	velocity.y = 0.0 if is_on_floor() else velocity.y - 20.0 * delta
	move_and_slide()
	if axis.length() > 0.1 and is_on_floor():
		bob_time += delta * speed * 2.4
		footstep_time += delta
		if footstep_time > (0.32 if sprinting else 0.5):
			footstep_time = 0.0
			game.sound.cue("step")
	camera.position.y = lerpf(camera.position.y, 1.55 + (sin(bob_time) * 0.025 if head_bob and axis.length() > 0.1 else 0.0), delta * 12.0)
	battery = clampf(battery + (-1.2 if flashlight else 0.9) * delta, 0.0, 100.0)
	torch.visible = flashlight and battery > 0.0
	var origin := camera.global_position
	var ray := PhysicsRayQueryParameters3D.create(origin, origin - camera.global_transform.basis.z * interaction_range, 9, [get_rid()])
	ray.collide_with_areas = true
	var hit := get_world_3d().direct_space_state.intersect_ray(ray)
	target = hit.get("collider") as Area3D if not hit.is_empty() else null
	game.hud.prompt.text = target.prompt() if is_instance_valid(target) and target.has_method("prompt") else ""
