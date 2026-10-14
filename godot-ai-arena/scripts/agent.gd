extends CharacterBody2D

var arena
var kind = "melee"
var state = "PATROL"
var hp = 70.0
var max_hp = 70.0
var facing = Vector2.RIGHT
var last_seen = Vector2.ZERO
var memory = 0.0
var cooldown = 0.0
var route = PackedVector2Array()
var path_clock = 0.0
var patrol_index = 0
var windup = 0.0
var flash = 0.0
var is_player = false

func _ready():
	collision_layer = 2
	collision_mask = 1
	var shape = CollisionShape2D.new()
	var circle = CircleShape2D.new()
	circle.radius = 11
	shape.shape = circle
	add_child(shape)
	if kind == "guard": max_hp = 130.0
	elif kind == "ranged": max_hp = 55.0
	hp = max_hp

func tick(dt):
	flash = maxf(0, flash - dt)
	cooldown = maxf(0, cooldown - dt)
	if is_player:
		var direction = Vector2(float(Input.is_physical_key_pressed(KEY_D)) - float(Input.is_physical_key_pressed(KEY_A)), float(Input.is_physical_key_pressed(KEY_S)) - float(Input.is_physical_key_pressed(KEY_W)))
		velocity = direction.normalized() * 185
		facing = (get_global_mouse_position() - position).normalized()
		move_and_slide()
		if Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) and cooldown <= 0 and get_global_mouse_position().x < 768:
			arena.fire(self, facing, 19.0)
			cooldown = 0.18
		queue_redraw()
		return
	var player = arena.player
	var distance = position.distance_to(player.position)
	var sees = distance < 275 and arena.line_clear(position, player.position)
	if sees:
		last_seen = player.position
		memory = 2.4
	else: memory = maxf(0, memory - dt)
	var speed = 100.0 if kind == "melee" else 78.0
	var target = position
	if hp < max_hp * 0.25 and sees:
		state = "RETREAT"
		target = arena.retreat_cell(position, player.position)
	elif sees:
		facing = (player.position - position).normalized()
		if kind == "ranged" and distance < 115:
			state = "RETREAT"
			target = arena.retreat_cell(position, player.position)
		elif (kind == "ranged" and distance < 245) or (kind != "ranged" and distance < 42):
			state = "ATTACK"
			if cooldown <= 0:
				if windup <= 0: windup = 0.3
				windup -= dt
				if windup <= 0:
					if kind == "ranged": arena.fire(self, facing, 10.0)
					elif distance < 48: player.hurt(12.0, position)
					cooldown = 0.9 if kind != "ranged" else 1.1
		else:
			state = "CHASE"
			target = player.position
	elif memory > 0:
		state = "SEARCH"
		target = last_seen
	else:
		state = "PATROL"
		target = arena.patrol[patrol_index]
		if position.distance_to(target) < 22: patrol_index = (patrol_index + 1) % arena.patrol.size()
	if state != "ATTACK": windup = 0
	path_clock -= dt
	if path_clock <= 0:
		route = arena.path(position, target)
		path_clock = 0.25
	velocity = Vector2.ZERO
	if state != "ATTACK" and route.size() > 0:
		while route.size() > 0 and position.distance_to(route[0]) < 9: route.remove_at(0)
		if route.size() > 0:
			velocity = position.direction_to(route[0]) * speed
			if not sees: facing = velocity.normalized()
	# Separation only influences motion; world collisions still use move_and_slide.
	for other in arena.agents:
		if other == self or not is_instance_valid(other): continue
		var offset = position - other.position
		if offset.length() > 0.1 and offset.length() < 26: velocity += offset.normalized() * 40
	move_and_slide()
	queue_redraw()

func hurt(amount, source):
	if kind == "guard" and not is_player and facing.dot(position.direction_to(source)) > 0.5:
		amount *= 0.25
	hp = maxf(0, hp - amount)
	flash = 0.12
	if hp <= 0:
		if is_player: arena.game_over = true
		else:
			arena.kills += 1
			arena.agents.erase(self)
			queue_free()

func _draw():
	var color = Color("68dfce") if is_player else {"melee": Color("f18b69"), "ranged": Color("d5adf0"), "guard": Color("e9cc7d")}[kind]
	if flash > 0: color = Color.WHITE
	draw_circle(Vector2(2, 5), 14, Color(0, 0, 0, 0.4))
	draw_rect(Rect2(-9, -10, 18, 21), color.darkened(0.35))
	draw_rect(Rect2(-6, -12, 12, 9), color)
	draw_line(Vector2.ZERO, facing * 20, color, 4)
	if kind == "guard" and not is_player:
		draw_line(facing.rotated(-PI/2)*10 + facing*14, facing.rotated(PI/2)*10 + facing*14, color, 5)
	if windup > 0: draw_arc(Vector2.ZERO, 23, 0, TAU, 24, Color("ff5e62"), 2)
	draw_rect(Rect2(-14, -24, 28, 3), Color("24313e"))
	draw_rect(Rect2(-14, -24, 28*hp/max_hp, 3), color)
	if arena.debug and not is_player:
		draw_string(ThemeDB.fallback_font, Vector2(-22, -31), state, HORIZONTAL_ALIGNMENT_LEFT, -1, 10, color)
