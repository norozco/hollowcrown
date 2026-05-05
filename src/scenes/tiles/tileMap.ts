/**
 * Maps the game's semantic TILE.* IDs to sprites in the CC0 Kenney
 * Roguelike/RPG Pack (primary) and Kenney Tiny Dungeon (dungeon
 * atmospherics).
 *
 * Only entries listed here get replaced with sprite-art at runtime; any
 * tile not in the map keeps the original procedural drawing as a
 * fallback. This lets us upgrade coverage tile-by-tile without risk of
 * breaking scenes that rely on tiles we haven't mapped yet.
 *
 * Sheet layouts:
 *   roguelike-rpg_packed.png — 968×526, 57×31 tiles of 16×16 with 1px
 *                              gap between tiles (pitch = 17 px). Main
 *                              town/outdoor/wall/roof/tree source.
 *   tiny-dungeon_packed.png  — 12×11 tiles of 16×16, no gap (pitch 16).
 *                              Kept for LAVA, ACID, BONES, TORCH, etc.
 *
 * See public/assets/tilesets/roguelike-rpg_TILEMAP.md for the tile
 * inventory this mapping was derived from.
 */
import { TILE } from './generateTiles';

/** Master switch.
 *
 *  HISTORY (3 attempts, all reverted): 3d7324c → 0150e8c, 19bc3c4 →
 *  91d4aef, 598578d → c112a41. Root cause confirmed in c112a41: most
 *  TILE_SPRITE_MAP entries below were authored from the Preview.png
 *  thumbnail and were never pixel-verified. Many pointed at door /
 *  window / wall / character sprites — that's why playtest reported
 *  "chest icons everywhere" (decoration tiles → door sprites) and
 *  "guards in buildings" (furniture tiles → character sprites).
 *
 *  This 4th re-enable uses a NARROW pixel-verified map. Generated
 *  contact sheets in tools/_out/ for verification:
 *    - tools/_out/contact-sheet-mapped.png
 *    - tools/_out/full-grid-left-half.png
 *    - tools/_out/full-grid-right-half.png
 *  Run `node tools/verify-tile-sprites.mjs` to regenerate.
 *
 *  Verified entries (kept): ground tiles (grass / dirt / sand / stone /
 *  water), path/water edges (the 9-slice variants of those biomes —
 *  these we know are correct because the TILEMAP.md docs were
 *  authored from pixel sampling for these specific cells), and
 *  cobble/teal-floor.
 *
 *  Unverified entries (REMOVED, fall back to procedural): all flora
 *  (trees, bushes, flowers, stumps), all rocks, all fences, all signs/
 *  lamps/lanterns, all decorations, all interior furniture, all
 *  carpets, all path corners (the corner mappings were guesses).
 *  These will be re-added one at a time after eyeball verification
 *  via the contact sheets. */
export const USE_SPRITE_TILES = true;

/** Legacy export — kept for the Tiny Dungeon sheet's 12-wide layout. */
export const KENNEY_COLS = 12;
export const KENNEY_TILE_PX = 16;

/** Geometry per sheet (tile size + pitch between tiles). */
export interface SheetGeom {
  tilePx: number;
  /** Distance in pixels between the top-left of adjacent tiles. */
  pitch: number;
}
export const SHEET_GEOM = {
  town: { tilePx: 16, pitch: 17 } as SheetGeom,     // Roguelike/RPG Pack (1px gap)
  dungeon: { tilePx: 16, pitch: 16 } as SheetGeom,  // Tiny Dungeon (no gap)
} as const;

export const TOWN_KEY = 'kenney-roguelike-rpg';
export const TOWN_URL = `${import.meta.env.BASE_URL}assets/tilesets/roguelike-rpg_packed.png`;
export const DUNGEON_KEY = 'kenney-tiny-dungeon';
export const DUNGEON_URL = `${import.meta.env.BASE_URL}assets/tilesets/tiny-dungeon_packed.png`;

export interface SpriteTileRef {
  sheet: 'town' | 'dungeon';
  /** (row, col) zero-based in the sheet. */
  row: number;
  col: number;
}

/** Short-hand so entries stay readable. */
const t = (sheet: 'town' | 'dungeon', row: number, col: number): SpriteTileRef =>
  ({ sheet, row, col });

/**
 * Semantic tile -> Kenney sprite mapping.
 *
 * Primary "clean" solid-fill tiles live in the bottom-left 9-slice color
 * blocks (rows 25-30), where the CENTER tile of each 3×3 block is a
 * solid single-color fill. The surrounding 8 tiles of each block are
 * edge/corner variants of the same biome and are safe to reuse as
 * decorative neighbours.
 *
 *   (26, 1)  plain dirt brown           9-slice block cols 0-2
 *   (26, 4)  plain grey stone           9-slice block cols 3-5
 *   (26, 7)  plain sand                 9-slice block cols 6-8
 *   (26,10)  plain grass green          9-slice block cols 9-11
 *   (26,13)  plain terracotta  (ROOF)   9-slice block cols 12-14
 *   (26,16)  plain teal                 9-slice block cols 15-17
 *
 * Trees, bushes, flowers live in the isolated decoration strip rows
 * 9-11 and are mapped ONLY to decorative TILE.* types — never to grass.
 */
export const TILE_SPRITE_MAP: Partial<Record<number, SpriteTileRef>> = {
  // ─── Verified ground tiles (Roguelike/RPG Pack) ─────────────
  // These were pixel-sampled in the original TILEMAP.md and confirmed
  // by reading tools/_out/contact-sheet-mapped.png. They render as
  // solid biome colours and tile cleanly without edge artifacts.
  [TILE.GRASS_DARK]:  t('town', 26, 10),  // solid vibrant green
  [TILE.GRASS_LIGHT]: t('town', 26, 10),  // same green; tinted lighter procedurally
  [TILE.PATH]:        t('town', 26,  1),  // solid warm dirt brown
  [TILE.SAND]:        t('town', 26,  7),  // solid tan
  [TILE.FLOOR_STONE]: t('town', 26,  4),  // solid light grey
  [TILE.COBBLE]:      t('town', 27,  4),  // bottom-center of stone 9-slice
  [TILE.WATER]:       t('town',  1,  1),  // solid cyan
  [TILE.TEAL_FLOOR]:  t('town', 26, 16),  // teal/cream solid

  // Verified 9-slice edge variants for path & water (rendered correctly
  // when scenes paint these specific tiles at biome boundaries).
  [TILE.PATH_EDGE]:    t('town', 25, 1),  // top edge of dirt 9-slice
  [TILE.SAND_EDGE]:    t('town', 25, 7),  // top edge of sand 9-slice
  [TILE.COBBLE_EDGE]:  t('town', 25, 4),  // top edge of stone 9-slice
  [TILE.WATER_EDGE_N]: t('town',  0, 1),
  [TILE.WATER_EDGE_S]: t('town',  2, 1),
  [TILE.WATER_EDGE_W]: t('town',  1, 0),
  [TILE.WATER_EDGE_E]: t('town',  1, 2),

  // ─── Dungeon atmospherics (Tiny Dungeon sheet) ───────────────
  // The Tiny Dungeon sheet is older and these mappings were pixel-
  // verified during the original integration. Kept as-is.
  [TILE.FLOOR_CRACKED]: t('dungeon', 0, 7),
  [TILE.MOSS_STONE]:    t('dungeon', 0, 1),
  [TILE.LAVA]:          t('dungeon', 0, 9),
  [TILE.ACID]:          t('dungeon', 0, 10),
  [TILE.BONES]:         t('dungeon', 6, 8),
  [TILE.CHAINS]:        t('dungeon', 8, 4),
  [TILE.COBWEB]:        t('dungeon', 7, 11),
  [TILE.BLOOD_STONE]:   t('dungeon', 0, 8),
  [TILE.TORCH]:         t('dungeon', 9, 1),
  [TILE.BARREL]:        t('dungeon', 8, 0),
  [TILE.CRATE]:         t('dungeon', 8, 1),
  [TILE.BOOKSHELF]:     t('dungeon', 6, 0),

  // ─── EVERYTHING ELSE INTENTIONALLY OMITTED ──────────────────
  // The following tile types had unverified sprite coords that were
  // shown by playtest to render as DOORS, WINDOWS, WALL CHUNKS, or
  // CHARACTER SPRITES instead of the intended decoration. They fall
  // back to procedural rendering until each is pixel-verified against
  // the contact sheets in tools/_out/:
  //
  //   Architecture (multi-cell composition issue, not coord issue):
  //     WALL_STONE, WALL_WOOD, WALL_INNER, WALL_CORNER
  //     ROOF, ROOF_EDGE, ROOF_RED, ROOF_BLUE, ROOF_GREEN, ROOF_THATCH,
  //     ROOF_EDGE_L, ROOF_EDGE_R, ROOF_PEAK
  //     DOOR, DOOR_IRON, DOOR_ARCH
  //     WINDOW, WINDOW_ROUND, WINDOW_BARRED
  //     COLUMN, COLUMN_TOP, COLUMN_BASE
  //
  //   Flora / decorations (wrong coords — were rendering as doors):
  //     BUSH, FENCE, WELL, GRASS_FLOWER_RED, GRASS_FLOWER_YELLOW,
  //     GRASS_FLOWER_BLUE, GRASS_TUFT
  //     TREE_PINE, TREE_OAK, TREE_DEAD, BUSH_BERRY
  //     ROCK_SMALL, ROCK_LARGE, BOULDER, STUMP
  //     FENCE_H, FENCE_V, FENCE_GATE, SIGN, LAMP_POST, LANTERN
  //     STAIRS_UP, STAIRS_DOWN
  //
  //   Path corners (unverified guess coords):
  //     PATH_CORNER_NW, PATH_CORNER_NE, PATH_CORNER_SW, PATH_CORNER_SE
  //     PATH_EDGE_W, PATH_EDGE_E, PATH_EDGE_S
  //     WATER_ROCK
  //
  //   Interior furniture (wrong coords — were rendering as walls/doors):
  //     FLOOR_WOOD, FLOOR_PLANK_V, FLOOR_PLANK_H
  //     CARPET_RED, CARPET_BLUE, CARPET_EDGE
  //     TABLE_SMALL, BENCH, CHAIR_WOOD
};

/**
 * Per-tile variant pools used by applyTileVariants() to make ground
 * planes look hand-placed instead of uniform. Each entry lists the
 * variant *semantic* TILE ids; the renderer hashes (tileId, x, y) to
 * pick one deterministically. The base tile id itself is always the
 * first entry so unmapped cells stay stable.
 *
 * Variants are carefully chosen from the SAME 9-slice color block so
 * the biome stays coherent (no brown dirt dropped into green grass).
 */
export const TILE_VARIANT_POOL: Partial<Record<number, number[]>> = {
  // Variant pool intentionally MINIMAL while sprite mappings are being
  // pixel-verified one biome at a time. Previous attempts had grass
  // tiles randomly substituting GRASS_FLOWER_* variants which
  // (because those mappings were wrong) showed as DOOR sprites all
  // over the grass — the "chest icons everywhere" playtest report.
  //
  // Now: only homogeneous variants (cobble accent on path/stone) plus
  // the procedurally-painted GRASS_VAR_A/B/C variants, which share the
  // same forest-base palette as GRASS_DARK/LIGHT but have different
  // blade-stroke seeds, cluster positions, and wildflower offsets so
  // adjacent grass cells don't read as repeating wallpaper.
  // Flora-sprite variants will be re-added once GRASS_FLOWER_* coords
  // are pixel-verified against tools/_out/contact-sheet-mapped.png.
  [TILE.PATH]:        [TILE.PATH, TILE.PATH, TILE.PATH, TILE.PATH, TILE.PATH, TILE.COBBLE],
  [TILE.FLOOR_STONE]: [TILE.FLOOR_STONE, TILE.FLOOR_STONE, TILE.FLOOR_STONE,
                       TILE.FLOOR_STONE, TILE.COBBLE],
  // Grass — base id stays dominant (2× weight) so the field still reads
  // as one biome, but the three variants mix in often enough to break
  // the visible repeat pattern and distribute wildflowers irregularly.
  [TILE.GRASS_DARK]:  [TILE.GRASS_DARK, TILE.GRASS_DARK,
                       TILE.GRASS_VAR_A, TILE.GRASS_VAR_B, TILE.GRASS_VAR_C],
  [TILE.GRASS_LIGHT]: [TILE.GRASS_LIGHT, TILE.GRASS_LIGHT,
                       TILE.GRASS_VAR_A, TILE.GRASS_VAR_B, TILE.GRASS_VAR_C],
};

/**
 * Deterministic (x,y,tileId)->variant hash. Same cell always yields the
 * same pick so re-entering a scene doesn't re-roll the terrain.
 */
export function pickTileVariant(baseId: number, x: number, y: number): number {
  const pool = TILE_VARIANT_POOL[baseId];
  if (!pool || pool.length === 0) return baseId;
  // xorshift-ish mix — cheap, stable, good-enough distribution.
  let h = (x * 73856093) ^ (y * 19349663) ^ (baseId * 83492791);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return pool[h % pool.length];
}

/**
 * Post-process a tilemap layer: for every cell whose tile index has a
 * variant pool defined, swap it for the hashed variant. Idempotent and
 * stable — calling twice gives the same result.
 */
export function applyTileVariants(
  layer: { forEachTile: (cb: (tile: { x: number; y: number; index: number }) => void) => void;
           putTileAt: (index: number, x: number, y: number) => unknown }
): void {
  layer.forEachTile((tile) => {
    const variant = pickTileVariant(tile.index, tile.x, tile.y);
    if (variant !== tile.index) layer.putTileAt(variant, tile.x, tile.y);
  });
}

/**
 * Human-readable debug inventory — pairs of semantic-tile name and its
 * (row, col) in whichever sheet it came from. Rendered by the in-game
 * tile debug overlay (bound to a dev keybind) so the mapping is visible
 * while iterating. Keep this in sync with TILE_SPRITE_MAP — any tile
 * listed here is expected to also have an entry in the map.
 */
export interface TileDebugRow {
  semantic: string;
  sheet: 'town' | 'dungeon';
  rc: [number, number];
}
export const TILE_DEBUG_OVERLAY: TileDebugRow[] = Object.entries(TILE_SPRITE_MAP)
  .map(([tileId, ref]) => {
    const name = Object.entries(TILE).find(([, v]) => v === Number(tileId))?.[0] ?? `TILE_${tileId}`;
    return { semantic: name, sheet: ref!.sheet, rc: [ref!.row, ref!.col] as [number, number] };
  })
  .sort((a, b) => a.semantic.localeCompare(b.semantic));
