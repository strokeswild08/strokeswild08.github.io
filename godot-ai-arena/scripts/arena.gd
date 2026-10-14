extends Node2D
const Agent = preload("res://scripts/agent.gd")
const TILE = 32
var grid = AStarGrid2D.new()
var walls = []
var agents = []
var player
var projectiles = []
var patrol = [Vector2(80,80), Vector2(688,80), Vector2(688,560), Vector2(80,560)]
var debug = true
var frozen = false
var game_over = false
var kills = 0
var elapsed = 0.0
var panel_label
var debug_button

func _ready():
	build_world()
	build_ui()
	reset()

func build_world():
	grid.region = Rect2i(0,0,24,20)
	grid.cell_size = Vector2(TILE,TILE)
	grid.offset = Vector2(16,16)
	grid.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_NEVER
	grid.update()
	for y in range(20):
		for x in range(24):
			var boundary = x == 0 or y == 0 or x == 23 or y == 19
			var pillar = (x >= 6 and x <= 8 and y >= 5 and y <= 8) or (x >= 15 and x <= 17 and y >= 11 and y <= 14) or (x >= 11 and x <= 12 and y >= 8 and y <= 10)
			if boundary or pillar:
				walls.append(Vector2i(x,y))
				grid.set_point_solid(Vector2i(x,y))
				var body = StaticBody2D.new()
				body.position = Vector2(x*32+16,y*32+16)
				body.collision_layer = 1
				var collider = CollisionShape2D.new()
				var shape = RectangleShape2D.new()
				shape.size = Vector2(32,32)
				collider.shape = shape
				body.add_child(collider)
				add_child(body)

func cell(point): return Vector2i(floori(point.x / TILE), floori(point.y / TILE))
func walkable(point):
	var id = cell(point)
	return grid.is_in_boundsv(id) and not grid.is_point_solid(id)
func path(start, finish):
	if not walkable(start) or not walkable(finish): return PackedVector2Array()
	return grid.get_point_path(cell(start), cell(finish))
func line_clear(start, finish):
	var steps = maxi(1, ceili(start.distance_to(finish)/8))
	for i in range(steps+1):
		if not walkable(start.lerp(finish,float(i)/steps)): return false
	return true
func retreat_cell(origin, threat):
	var best = origin
	var score = origin.distance_to(threat)
	for y in range(1,19):
		for x in range(1,23):
			var point = Vector2(x*32+16,y*32+16)
			if point.distance_to(origin) > 180 or not walkable(point): continue
			var candidate = point.distance_to(threat)
			if candidate > score and path(origin,point).size() > 0:
				best = point
				score = candidate
	return best

func reset():
	for agent in agents: agent.queue_free()
	if is_instance_valid(player): player.queue_free()
	agents.clear()
	projectiles.clear()
	kills = 0
	elapsed = 0
	game_over = false
	frozen = false
	player = Agent.new()
	player.arena = self
	player.is_player = true
	player.position = Vector2(112,336)
	add_child(player)
	spawn("melee")
	spawn("ranged")
	spawn("guard")

func spawn(kind):
	if agents.size() >= 24 or game_over: return
	var candidates = [Vector2(656,112),Vector2(656,528),Vector2(400,112),Vector2(112,528),Vector2(688,336)]
	for point in candidates:
		var available = player.position.distance_to(point) > 70
		for other in agents:
			if other.position.distance_to(point) < 35: available = false
		if not available: continue
		var agent = Agent.new()
		agent.arena = self
		agent.kind = kind
		agent.position = point
		agent.patrol_index = agents.size() % 4
		add_child(agent)
		agents.append(agent)
		return

func fire(owner, direction, damage):
	var origin = owner.position + direction * 18
	if not walkable(origin): return
	projectiles.append({"position":origin,"velocity":direction*420,"life":1.8,"friendly":owner.is_player,"damage":damage,"source":owner.position})

func _physics_process(dt):
	if not frozen and not game_over:
		elapsed += dt
		player.tick(dt)
		for agent in agents.duplicate():
			if is_instance_valid(agent): agent.tick(dt)
		for i in range(projectiles.size()-1,-1,-1):
			var shot = projectiles[i]
			var next = shot.position + shot.velocity * dt
			shot.life -= dt
			var remove = shot.life <= 0 or not line_clear(shot.position,next)
			shot.position = next
			var targets = agents.duplicate() if shot.friendly else [player]
			if not remove:
				for target in targets:
					if is_instance_valid(target) and target.position.distance_to(next) < 17:
						target.hurt(shot.damage, shot.source)
						remove = true
						break
			if remove: projectiles.remove_at(i)
	panel_label.text = "HEALTH  %d / %d\nHOSTILES  %d\nDEFEATED  %d\nTIME  %.1fs\nFPS  %d\n\n%s" % [player.hp,player.max_hp,agents.size(),kills,elapsed,Engine.get_frames_per_second(),"DOWN — reset to retry" if game_over else ("SIMULATION PAUSED" if frozen else "SIMULATION RUNNING")]
	queue_redraw()

func _input(event):
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_TAB:
			debug = not debug
			get_viewport().set_input_as_handled()
		elif event.keycode == KEY_SPACE: frozen = not frozen
		elif event.keycode == KEY_R: reset()

func build_ui():
	var canvas = CanvasLayer.new()
	add_child(canvas)
	var box = VBoxContainer.new()
	box.position = Vector2(790,26)
	box.size = Vector2(270,590)
	box.add_theme_constant_override("separation",12)
	canvas.add_child(box)
	var title = Label.new()
	title.text = "WATCHTOWER\nENEMY AI ARENA"
	title.add_theme_font_size_override("font_size",25)
	box.add_child(title)
	var desc = Label.new()
	desc.text = "Wild Strokes / Godot + GDScript\n\nWASD  Move   •   Mouse  Aim\nLeft click  Fire   •   R  Reset\nTab  Debug   •   Space  Pause"
	desc.add_theme_font_size_override("font_size",13)
	box.add_child(desc)
	panel_label = Label.new()
	box.add_child(panel_label)
	for kind in ["melee","ranged","guard"]:
		var button = Button.new()
		button.text = "+ Spawn " + kind.capitalize()
		button.pressed.connect(spawn.bind(kind))
		box.add_child(button)
	var toggle = Button.new()
	toggle.text = "Toggle AI debug"
	toggle.pressed.connect(func(): debug = not debug)
	box.add_child(toggle)
	var pause_button = Button.new()
	pause_button.text = "Pause / resume"
	pause_button.pressed.connect(func(): frozen = not frozen)
	box.add_child(pause_button)
	var reset_button = Button.new()
	reset_button.text = "Reset arena"
	reset_button.pressed.connect(reset)
	box.add_child(reset_button)
	var legend = Label.new()
	legend.text = "CORAL  Melee pursuer\nLILAC  Ranged skirmisher\nGOLD  Guard: flank its shield\n\nDebug: vision radius + route\nHealth below 25%: retreat\nSpawn points must be unoccupied."
	legend.add_theme_font_size_override("font_size",13)
	box.add_child(legend)

func _draw():
	for y in range(20):
		for x in range(24):
			draw_rect(Rect2(x*32,y*32,31,31), Color("101e28") if (x+y)%2 == 0 else Color("13232d"))
	for wall in walls:
		draw_rect(Rect2(Vector2(wall)*32,Vector2(32,32)),Color("304351"))
		draw_line(Vector2(wall)*32,Vector2(wall)*32+Vector2(32,0),Color("527080"),2)
	if debug:
		for agent in agents:
			if not is_instance_valid(agent): continue
			draw_arc(agent.position,275,0,TAU,48,Color(0.8,0.75,0.6,0.09),1)
			if agent.route.size() > 1: draw_polyline(agent.route,Color(0.4,0.9,0.8,0.45),1.5)
	for shot in projectiles:
		draw_circle(shot.position,3,Color("8df5df") if shot.friendly else Color("ff9b89"))
	draw_rect(Rect2(768,0,320,640),Color("0b141d"))
	draw_line(Vector2(768,0),Vector2(768,640),Color("68dfce"),2)
