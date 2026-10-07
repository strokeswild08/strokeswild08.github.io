"""Package the generated PNG, JSON and eight action previews with one clear guide."""
import json
import zipfile
from pathlib import Path
assets=Path(__file__).resolve().parent.parent/'assets'
for kind in ['keeper','courier']:
    atlas=json.loads((assets/f'{kind}-atlas.json').read_text())
    guide=f'''Wild Strokes — {atlas['name']}

96 x 96 pixel cells. 8 columns x 8 rows. 64 frames.
Transparent PNG, no margin or padding. Ground pivot: (48, 88).
Read the JSON for frame rectangles, FPS, durations and loop flags.
Rows: Idle, Walk, Run, Jump, Attack, Hurt, Roll, Celebrate.
PNG and JSON are the game assets. GIFs are 4x presentation previews.
Jump, attack, hurt and roll play once; other actions loop.
The character faces right. Mirror horizontally to face left.
The forest scene is a workbench backdrop, excluded from asset exports.
Artwork and editable procedural source: Wild Strokes / Flipbook.
'''
    with zipfile.ZipFile(assets/f'{kind}-character-pack.zip','w',zipfile.ZIP_DEFLATED) as z:
        z.write(assets/f'{kind}-sheet.png',f'{kind}-sheet.png')
        z.write(assets/f'{kind}-atlas.json',f'{kind}-atlas.json')
        z.writestr('README.txt',guide)
        for action in atlas['animations']:
            z.write(assets/f'{kind}-{action}.gif',f'previews/{action}.gif')
