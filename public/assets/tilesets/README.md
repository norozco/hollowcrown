# Tilesets

CC0 tile spritesheets used by the Phaser scenes at runtime.

## Layout

Both Kenney packs use a **12 columns × 11 rows** grid of **16×16 px** tiles
(sheet = 192×176 px, 132 tiles). Tile index = `row * 12 + col`,
zero-based, left-to-right, top-to-bottom.

See `src/scenes/tiles/tileMap.ts` for the tile-index mapping from the
game's semantic tile enum (GRASS, PATH, WALL, WATER, ...) to Kenney sheet
indices.

## Refreshing the assets

```
node scripts/fetch-tilesets.mjs
```

This re-downloads the packs from kenney.nl, extracts them, and copies
`tilemap_packed.png` + `License.txt` from each pack into this directory.

## Licensing

See `LICENSE.md`. Everything here is CC0 1.0.
