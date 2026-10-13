extends RefCounted
## Versioned save envelope. Invalid files are rejected before world state changes.
const Level = preload("res://scripts/level.gd")
const PATH := "user://nightshift-v1.json"

static func valid(data: Variant) -> bool:
	if not data is Dictionary or data.get("version") != 1:
		return false
	var pos: Variant = data.get("position")
	if not pos is Array or pos.size() != 3:
		return false
	for value in pos:
		if not (value is float or value is int) or not is_finite(float(value)):
			return false
	var point := Vector3(float(pos[0]), float(pos[1]), float(pos[2]))
	if point.y < 0.0 or point.y > 2.0 or not Level.walkable(Level.cell_of(point)):
		return false
	var center := Level.point(Level.cell_of(point))
	# Saves close to a tile edge are unsafe without a full collision query.
	if absf(point.x - center.x) > 1.35 or absf(point.z - center.z) > 1.35:
		return false
	for field in ["key", "door", "flashlight"]:
		if not data.get(field) is bool:
			return false
	if data["door"] and not data["key"]:
		return false
	var battery: Variant = data.get("battery")
	var yaw: Variant = data.get("yaw")
	if not (battery is float or battery is int) or not (yaw is float or yaw is int):
		return false
	return is_finite(float(battery)) and float(battery) >= 0.0 and float(battery) <= 100.0 and is_finite(float(yaw))

static func write(data: Dictionary) -> Error:
	if not valid(data):
		return ERR_INVALID_DATA
	var file := FileAccess.open(PATH + ".tmp", FileAccess.WRITE)
	if file == null:
		return FileAccess.get_open_error()
	file.store_string(JSON.stringify(data))
	file.flush()
	var error := file.get_error()
	file.close()
	if error != OK:
		return error
	return DirAccess.rename_absolute(PATH + ".tmp", PATH)

static func read() -> Dictionary:
	if not FileAccess.file_exists(PATH):
		return {}
	var file := FileAccess.open(PATH, FileAccess.READ)
	if file == null or file.get_length() > 65536:
		return {}
	var data: Variant = JSON.parse_string(file.get_as_text())
	return data if valid(data) else {}
