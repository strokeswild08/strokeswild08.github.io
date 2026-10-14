"""Source manifest sanity checks, not an Unreal compiler or editor test."""
import ast
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
project = json.loads((root / "AbilityForge.uproject").read_text())
assert project["Modules"][0]["Name"] == "AbilityForge"
assert project["EngineAssociation"] == "5.5"
assert any(p["Name"] == "Niagara" and p["Enabled"] for p in project["Plugins"])
module = root / "Source/AbilityForge"
for header in (module / "Public").glob("*.h"):
    lines = [line for line in header.read_text().splitlines() if line.startswith("#include")]
    if "UCLASS()" in header.read_text() or "UCLASS(" in header.read_text() or "USTRUCT(" in header.read_text() or "UENUM(" in header.read_text():
        assert lines[-1] == '#include "' + header.stem + '.generated.h"', header.name
for source in (module / "Private").glob("*.cpp"):
    for line in source.read_text().splitlines():
        if line.startswith('#include "Forge'):
            name = line.split('"')[1]
            assert (module / "Public" / name).exists(), name
input_config = (root / "Config/DefaultInput.ini").read_text()
for name in ["MoveForward", "MoveRight", "Turn", "LookUp", "Fireball", "Lightning", "Dash", "Reset"]:
    assert 'Name="' + name + '"' in input_config
ast.parse((root / "Tools/setup_editor.py").read_text())
assert not list(root.rglob("*.uasset")), "Status docs must change if assets are added"
assert not list(root.rglob("*.umap")), "Status docs must change if maps are added"
print("Source manifest, input bindings and Python syntax checked. Unreal not compiled or executed.")
