# Kenney Roguelike/RPG Pack — tile map

Source sheet: `roguelike-rpg_packed.png` (968×526 px).
Layout: 57 cols × 31 rows of 16×16 tiles with **1 px gap between tiles**
(pitch = 17 px, no leading margin). License: CC0 (see `roguelike-rpg_License.txt`).

Tiles are referenced as `(row, col)`, zero-based.

## Core semantic tiles (high confidence, pixel-sampled)

| Semantic        | (r, c)  | Avg RGB         | Notes                                    |
|-----------------|---------|-----------------|------------------------------------------|
| GRASS plain     | (26,10) | (123,173,44)    | Solid vibrant green, no flowers/trees    |
| GRASS dark      | (26, 9) | similar         | 9-slice edge tile, still mostly grass    |
| PATH (dirt)     | (26, 1) | (185,139,94)    | Solid warm brown                         |
| FLOOR_STONE     | (26, 4) | (204,204,204)   | Solid light grey                         |
| SAND            | (26, 7) | (217,202,169)   | Solid tan                                |
| TERRACOTTA      | (26,13) | (182,94,38)     | Solid red-orange — used for ROOF         |
| TEAL floor      | (26,16) | (55,170,165)    | Solid teal (unused but available)        |
| WATER           | (1, 1)  | (105,197,205)   | Solid cyan, no ripple detail             |
| WALL_STONE      | (13,20) | (173,173,173)   | Grey brick, opaque wall                  |

## Decorations (isolated — DO NOT put on GRASS)

| Semantic     | (r, c)  | Notes                                      |
|--------------|---------|--------------------------------------------|
| TREE (pine)  | (9, 28) | Dark green pine (~78,146,87), alpha edges  |
| TREE (oak)   | (11,28) | Lighter deciduous (~116,172,66)            |
| BUSH         | (9, 25) | Small round shrub                          |
| FLOWER       | (9, 35) | Yellow flower cluster                      |

## Architecture / interiors (approximate — verify visually before using)

| Semantic     | (r, c)  | Notes                                      |
|--------------|---------|--------------------------------------------|
| WALL_WOOD    | (0, 14) | Wooden plank wall, brown tones             |
| WALL_INNER   | (13,21) | Brick wall variant                         |
| WALL_CORNER  | (12,20) | Sand-colored wall corner                   |
| DOOR         | (1, 15) | Wooden door, framed                        |
| WINDOW       | (1, 19) | Paned window                               |
| FLOOR_WOOD   | (14, 7) | Plank floor, warm tan                      |
| ROOF         | (26,13) | Terracotta solid                           |
| ROOF_EDGE    | (25,13) | 9-slice edge of terracotta block           |
| FENCE        | (8, 37) | Brown wooden fence post                    |

## Dungeon (approximate — this sheet is mostly outdoor)

The Roguelike/RPG Pack is town-focused. Dungeon tiles (LAVA, ACID,
BONES, COBWEB, CHAINS, TORCH) are kept on the legacy `tiny-dungeon`
sheet via the `sheet: 'dungeon'` entries in `tileMap.ts`.

## Unmapped / uncertain

- Low-confidence single-tile identification for DOOR, WINDOW, FENCE —
  the sheet contains many variants; the chosen indices look plausible
  from Preview.png but have not been pixel-verified as "clean" tiles.
- BUSH (9,25) vs BUSH (9,27): first is confirmed green; second is
  brown (trunk of a bare tree) — be careful.

## 1-letter classification grid (full sheet)

See `scripts/_tmp/roguelike-classification.json` for machine-readable
form. Legend: `G`=green, `b`=brown, `#`=grey, `W`=blue, `.`=white,
`R`=red/orange, lowercase = partial coverage, space = fully empty.
