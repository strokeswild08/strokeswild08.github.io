extends Node2D

const World = preload("res://scripts/world.gd")
const Guard = preload("res://scripts/guard.gd")
const MINT := Color("71f3bd")
const MUTED := Color("77939f")
var world := World.new()
var guards: Array[StealthGuard] = []
var player := Vector2(96, 160)
var chips: Array[Vector2] = []
var collected := 0
var decoys := 3
var cooldown := 0.0
var noise_clock := 0.0
var rings: Array[Dictionary] = []
var debug := true
var paused := false
var outcome := ""
var elapsed := 0.0
var moving := false
var crouched := false
var running := false
var font := ThemeDB.fallback_font
var feed := "INFILTRATE / Recover all three data chips."

func _ready() -> void:
	reset()

func reset() -> void:
	player = Vector2(96,160)
	guards = [Guard.new(PackedVector2Array([Vector2(352,144),Vector2(352,496),Vector2(112,496),Vector2(112,272)])),Guard.new(PackedVector2Array([Vector2(608,208),Vector2(608,368),Vector2(832,368),Vector2(832,144)])),Guard.new(PackedVector2Array([Vector2(832,624),Vector2(576,624),Vector2(576,432),Vector2(832,336)]))]
	chips = [Vector2(160,640),Vector2(480,256),Vector2(864,176)]
	collected = 0
	decoys = 3
	elapsed = 0.0
	cooldown = 0.0
	noise_clock = 0.0
	rings.clear()
	outcome = ""
	paused = false
	feed = "INFILTRATE / Recover all three data chips."
	queue_redraw()

func _unhandled_key_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_R:
			reset()
		elif event.keycode == KEY_TAB:
			debug = not debug
		elif event.keycode == KEY_ESCAPE:
			paused = not paused
		elif event.keycode == KEY_SPACE and decoys > 0 and cooldown <= 0 and outcome.is_empty() and not paused:
			var aim := get_global_mouse_position()
			var direction := aim - player
			if direction.length() > 240:
				aim = player + direction.normalized() * 240
			if not world.blocked(aim) and world.visible(player,aim):
				decoys -= 1
				cooldown = 0.7
				emit_noise(aim,280)
				feed = "DECOY / Guards investigate the impact."
	queue_redraw()

func emit_noise(origin: Vector2, radius: float) -> void:
	rings.append({"p":origin,"r":radius,"t":0.0})
	for guard in guards:
		guard.hear(origin,radius)

func _physics_process(dt: float) -> void:
	if paused or not outcome.is_empty():
		return
	elapsed += dt
	cooldown = maxf(0,cooldown-dt)
	var input := Vector2(float(Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT))-float(Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT)),float(Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN))-float(Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP))).normalized()
	crouched = Input.is_physical_key_pressed(KEY_CTRL)
	running = Input.is_physical_key_pressed(KEY_SHIFT) and not crouched
	var previous := player
	player = world.slide(player,input * (175.0 if running else (68.0 if crouched else 112.0))*dt)
	moving = player.distance_to(previous) > 0.01
	noise_clock -= dt
	if moving and running and noise_clock <= 0:
		emit_noise(player,150)
		noise_clock = 0.55
	for i in range(chips.size()-1,-1,-1):
		if player.distance_to(chips[i]) < 22:
			chips.remove_at(i)
			collected += 1
			feed = "DATA RECOVERED / %d of 3 secured." % collected
	for guard in guards:
		guard.tick(dt,player,crouched,world)
		if guard.state == StealthGuard.State.CHASE and guard.position.distance_to(player) < 22:
			outcome = "SIGNAL LOST"
	if collected == 3 and Rect2(816,592,80,80).has_point(player):
		outcome = "EXTRACTION COMPLETE"
	for i in range(rings.size()-1,-1,-1):
		rings[i].t += dt
		if rings[i].t > 1.0:
			rings.remove_at(i)
	queue_redraw()

func txt(p: Vector2, value: String, size: int = 16, color: Color = Color.WHITE) -> void:
	draw_string(font,p,value,HORIZONTAL_ALIGNMENT_LEFT,-1,size,color)

func _draw() -> void:
	draw_rect(Rect2(0,0,1280,800),Color("080f16"))
	txt(Vector2(40,38),"WILD STROKES   /   SYSTEM STUDIES",12,MUTED)
	txt(Vector2(40,78),"SHADOW GUARD",32)
	txt(Vector2(682,72),"01  /  THE RELAY STATION",14,MINT)
	draw_rect(Rect2(40,104,880,592),Color("101e27"))
	for x in range(48,913,32):
		draw_line(Vector2(x,112),Vector2(x,688),Color(0.2,0.35,0.4,0.12))
	for y in range(112,689,32):
		draw_line(Vector2(48,y),Vector2(912,y),Color(0.2,0.35,0.4,0.12))
	draw_rect(Rect2(816,592,80,80),Color("153e35") if collected == 3 else Color("1b2c32"))
	txt(Vector2(827,638),"EXIT",18,MINT if collected == 3 else MUTED)
	for guard in guards:
		var tint := Color("ff6474") if guard.state == StealthGuard.State.CHASE else (Color("f3bb65") if guard.state != StealthGuard.State.PATROL else Color("b1c9a9"))
		var cone := PackedVector2Array([guard.position])
		for i in 33:
			var ray := guard.facing.rotated(deg_to_rad(-38.0+76.0*i/32.0))
			var length := 215.0
			for d in range(8,216,8):
				if not Rect2(48,112,864,576).has_point(guard.position+ray*d) or not world.visible(guard.position,guard.position+ray*d):
					length = d-8
					break
			cone.append(guard.position+ray*length)
		draw_colored_polygon(cone,Color(tint,0.075))
		if debug and guard.path.size() > 1:
			draw_polyline(guard.path,Color(tint,0.28),1.0)
		draw_circle(guard.position+Vector2(0,4),13,Color(0,0,0,0.35))
		draw_circle(guard.position,10,tint)
		draw_line(guard.position,guard.position+guard.facing*18,Color("101e27"),4)
		if guard.suspicion > 0:
			draw_arc(guard.position,17,-PI/2,-PI/2+TAU*guard.suspicion,24,Color("ff6474"),3)
		if debug:
			txt(guard.position+Vector2(-30,-23),guard.label(),10,tint)
	for wall in world.walls:
		draw_rect(Rect2(wall.position+Vector2(5,6),wall.size),Color(0,0,0,0.3))
		draw_rect(wall,Color("263c48"))
		draw_rect(Rect2(wall.position,Vector2(wall.size.x,3)),Color("49616b"))
	for chip in chips:
		draw_circle(chip,18+sin(elapsed*3)*3,Color(0.4,1,0.8,0.07))
		draw_rect(Rect2(chip-Vector2(7,7),Vector2(14,14)),MINT)
		draw_rect(Rect2(chip-Vector2(3,3),Vector2(6,6)),Color("173e35"))
	for ring in rings:
		draw_arc(ring.p,lerpf(10,ring.r,ring.t),0,TAU,64,Color(0.4,0.9,1,0.5*(1-ring.t)),2)
	draw_circle(player+Vector2(0,5),13,Color(0,0,0,0.45))
	draw_circle(player,9 if crouched else 11,MINT)
	var aim := (get_global_mouse_position()-player).normalized()
	draw_line(player+aim*8,player+aim*18,Color.WHITE,3)
	draw_rect(Rect2(944,104,296,592),Color("111c25"))
	txt(Vector2(968,140),"MISSION / 01",12,MINT)
	txt(Vector2(968,177),"Lift the signal.",23)
	txt(Vector2(968,205),"Leave no trace.",23)
	txt(Vector2(968,243),"Recover 3 chips, then reach EXIT.",13,MUTED)
	txt(Vector2(968,286),"DATA",12,MUTED)
	txt(Vector2(1120,286),"%d / 3" % collected,22,MINT)
	txt(Vector2(968,327),"DECOYS",12,MUTED)
	txt(Vector2(1120,327),"%d / 3" % decoys,22)
	txt(Vector2(968,368),"ELAPSED",12,MUTED)
	txt(Vector2(1120,368),"%02d:%02d" % [int(elapsed)/60,int(elapsed)%60],22)
	draw_line(Vector2(968,390),Vector2(1216,390),Color("29404c"))
	txt(Vector2(968,420),"GUARD TELEMETRY",12,MINT)
	for i in guards.size():
		var guard := guards[i]
		txt(Vector2(968,452+i*40),"0%d   %s" % [i+1,guard.label()],13,MUTED)
		draw_rect(Rect2(968,462+i*40,248,3),Color("24333e"))
		draw_rect(Rect2(968,462+i*40,248*guard.suspicion,3),Color("ff6474"))
	txt(Vector2(968,604),"CTRL  Crouch    SHIFT  Sprint",13,MUTED)
	txt(Vector2(968,630),"SPACE  Decoy toward cursor",13,MUTED)
	txt(Vector2(968,656),"TAB  Debug    ESC  Pause",13,MUTED)
	txt(Vector2(40,735),feed,15,MINT)
	txt(Vector2(40,772),"WASD / ARROWS  Move     R  Restart     Stay out of sight. Sprinting makes noise.",13,MUTED)
	txt(Vector2(1050,744),"GODOT 4 / GDSCRIPT",12,MUTED)
	txt(Vector2(1050,770),"DEBUG " + ("ON" if debug else "OFF"),12,MINT)
	if paused or not outcome.is_empty():
		draw_rect(Rect2(40,104,880,592),Color(0.02,0.04,0.06,0.9))
		txt(Vector2(210,360),"PAUSED" if paused and outcome.is_empty() else outcome,32,MINT)
		txt(Vector2(210,406),"ESC to resume" if outcome.is_empty() else "Press R to run the mission again",18,MUTED)
