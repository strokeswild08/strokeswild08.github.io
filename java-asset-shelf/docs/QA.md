# Desktop acceptance remaining

The source compiles and real filesystem/headless Swing tests pass. Finish these checks on a graphical desktop before presenting the app as fully tested on a given OS:

- Launch the JAR with Java 17+, choose a real sample folder, resize the window and inspect image/model/audio rows.
- Try search, type filter, tags, duplicate groups and multi-row selection using the mouse/keyboard.
- Preview and confirm a rename on disposable sample files; verify undo. Try a conflict and external edit; originals must not be overwritten.
- Play both generated WAV samples on an available audio device, stop playback and change selection. Unsupported codecs/devices should report errors.
- Export a filtered CSV and JSON to a new filename, then attempt an existing destination. Check Unicode paths/tags.
- Start/cancel a large read-only scan. Mutating operations should disable Cancel; closing during a task should wait for completion.

The public screenshot is an actual Swing panel painted offscreen, not a live native-window recording. There is no bundled OS installer or Java runtime.
