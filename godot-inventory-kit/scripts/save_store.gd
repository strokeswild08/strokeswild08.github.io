extends RefCounted
const Inventory = preload("res://scripts/inventory.gd")
const PATH := "user://fieldpack-v1.json"

static func write(inventory: RefCounted) -> Error:
	var file := FileAccess.open(PATH + ".tmp", FileAccess.WRITE)
	if file == null: return FileAccess.get_open_error()
	file.store_string(JSON.stringify(inventory.snapshot()))
	file.flush()
	var error := file.get_error()
	file.close()
	return DirAccess.rename_absolute(PATH + ".tmp", PATH) if error == OK else error

static func read_into(inventory: RefCounted) -> bool:
	if not FileAccess.file_exists(PATH): return false
	var file := FileAccess.open(PATH, FileAccess.READ)
	if file == null or file.get_length() > 65536: return false
	var data: Variant = JSON.parse_string(file.get_as_text())
	return inventory.restore(data)
