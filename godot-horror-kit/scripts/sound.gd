extends Node
## Small original synthesized cues; no external audio dependencies.
var voices: Array[AudioStreamPlayer] = []
var rng := RandomNumberGenerator.new()

func _ready() -> void:
	rng.seed = 87219
	for i in 6:
		var voice := AudioStreamPlayer.new()
		voice.volume_db = -15.0
		add_child(voice)
		voices.append(voice)

func cue(kind: String) -> void:
	var frequency := 160.0
	var duration := 0.15
	if kind == "key":
		frequency = 640.0
		duration = 0.4
	elif kind == "door":
		frequency = 65.0
		duration = 0.7
	elif kind == "alert":
		frequency = 92.0
		duration = 0.8
	elif kind == "step":
		frequency = 52.0
		duration = 0.08
	elif kind == "click":
		frequency = 350.0
		duration = 0.06
	var bytes := PackedByteArray()
	var count := int(duration * 22050.0)
	bytes.resize(count * 2)
	for i in count:
		var t := float(i) / 22050.0
		var envelope := pow(1.0 - float(i) / count, 2.0)
		var sample := (sin(TAU * frequency * t) * 0.6 + rng.randf_range(-0.2, 0.2)) * envelope
		bytes.encode_s16(i * 2, int(clampf(sample, -1.0, 1.0) * 25000.0))
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = 22050
	stream.data = bytes
	for voice in voices:
		if not voice.playing:
			voice.stream = stream
			voice.play()
			return

func _exit_tree() -> void:
	for voice in voices:
		voice.stop()
		voice.stream = null
