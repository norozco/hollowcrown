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

/** Master switch. Set to false to go back to the procedural tileset. */
export const USE_SPRITE_TILES = false;

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
  // ─── Ground (Roguelike/RPG Pack) ─────────────────────────────
  [TILE.GRASS_DARK]:  t('town', 26, 10),
  [TILE.GRASS_LIGHT]: t('town', 26, 10), // same solid green; we tint lighter procedurally
  [TILE.PATH]:        t('town', 26, 1),  // solid dirt
  [TILE.PATH_EDGE]:   t('town', 25, 1),  // top edge of dirt 9-slice
  [TILE.WATER]:       t('town',  1, 1),  // solid cyan water
  [TILE.BUSH]:        t('town',  9, 25), // small round shrub, isolated
  [TILE.FENCE]:       t('town',  8, 37), // wooden fence post
  [TILE.WELL]:        t('town',  6, 32), // stone feature (approx)

  // ─── Buildings (Roguelike/RPG Pack) ──────────────────────────
  [TILE.WALL_STONE]:  t('town', 13, 20), // grey brick wall center
  [TILE.WALL_WOOD]:   t('town',  0, 14), // wooden plank wall
  [TILE.ROOF]:        t('town', 26, 13), // terracotta solid
  [TILE.ROOF_EDGE]:   t('town', 25, 13), // terracotta 9-slice top edge
  [TILE.DOOR]:        t('town',  1, 15), // wooden door
  [TILE.WINDOW]:      t('town',  1, 19), // paned window
  [TILE.FLOOR_WOOD]:  t('town', 14,  7), // plank floor warm tan
  [TILE.FLOOR_STONE]: t('town', 26,  4), // plain light grey

  // ─── Expanded outdoor set (new semantic tiles) ───────────────
  [TILE.GRASS_FLOWER_RED]:    t('town',  9, 35), // flower cluster on grass
  [TILE.GRASS_FLOWER_YELLOW]: t('town',  9, 36),
  [TILE.GRASS_FLOWER_BLUE]:   t('town',  9, 37),
  [TILE.GRASS_TUFT]:          t('town', 10, 25), // taller grass tuft decoration
  [TILE.SAND]:                t('town', 26,  7),
  [TILE.SAND_EDGE]:           t('town', 25,  7),
  [TILE.TEAL_FLOOR]:          t('town', 26, 16),
  [TILE.COBBLE]:              t('town', 27,  4), // bottom-center of stone 9-slice (solid variant)
  [TILE.COBBLE_EDGE]:         t('town', 25,  4),
  [TILE.PATH_CORNER_NW]:      t('town', 25,  0),
  [TILE.PATH_CORNER_NE]:      t('town', 25,  2),
  [TILE.PATH_CORNER_SW]:      t('town', 27,  0),
  [TILE.PATH_CORNER_SE]:      t('town', 27,  2),
  [TILE.PATH_EDGE_W]:         t('town', 26,  0),
  [TILE.PATH_EDGE_E]:         t('town', 26,  2),
  [TILE.PATH_EDGE_S]:         t('town', 27,  1),
  [TILE.WATER_EDGE_N]:        t('town',  0,  1),
  [TILE.WATER_EDGE_S]:        t('town',  2,  1),
  [TILE.WATER_EDGE_W]:        t('town',  1,  0),
  [TILE.WATER_EDGE_E]:        t('town',  1,  2),
  [TILE.WATER_ROCK]:          t('town',  2,  0), // rocky corner of water slice
  [TILE.STAIRS_UP]:           t('town',  4, 32),
  [TILE.STAIRS_DOWN]:         t('town',  4, 33),

  // ─── Flora variants ──────────────────────────────────────────
  [TILE.TREE_PINE]:           t('town',  9, 28),
  [TILE.TREE_OAK]:            t('town', 11, 28),
  [TILE.TREE_DEAD]:           t('town',  9, 27),
  [TILE.BUSH_BERRY]:          t('town',  9, 26),
  [TILE.ROCK_SMALL]:          t('town',  8, 34),
  [TILE.ROCK_LARGE]:          t('town',  7, 34),
  [TILE.BOULDER]:             t('town',  7, 33),
  [TILE.STUMP]:               t('town', 10, 27),

  // ─── Architecture variants ───────────────────────────────────
  [TILE.ROOF_RED]:            t('town', 26, 13), // terracotta
  [TILE.ROOF_BLUE]:           t('town', 26, 16), // teal-blue pack block
  [TILE.ROOF_GREEN]:          t('town', 29, 13), // lower terracotta variant (darker)
  [TILE.ROOF_THATCH]:         t('town',  0, 12), // thatched roof tile
  [TILE.ROOF_EDGE_L]:         t('town', 26, 12),
  [TILE.ROOF_EDGE_R]:         t('town', 26, 14),
  [TILE.ROOF_PEAK]:           t('town', 24, 13),
  [TILE.COLUMN]:              t('town',  4, 31),
  [TILE.COLUMN_TOP]:          t('town',  3, 31),
  [TILE.COLUMN_BASE]:         t('town',  5, 31),
  [TILE.FENCE_H]:             t('town',  8, 38),
  [TILE.FENCE_V]:             t('town',  9, 37),
  [TILE.FENCE_GATE]:          t('town', 10, 37),
  [TILE.SIGN]:                t('town',  7, 32),
  [TILE.LAMP_POST]:           t('town',  5, 32),
  [TILE.LANTERN]:             t('town',  5, 33),
  [TILE.DOOR_IRON]:           t('town',  2, 15),
  [TILE.DOOR_ARCH]:           t('town',  1, 16),
  [TILE.WINDOW_ROUND]:        t('town',  2, 19),
  [TILE.WINDOW_BARRED]:       t('town',  3, 19),

  // ─── Interior / furniture extras ─────────────────────────────
  [TILE.FLOOR_PLANK_V]:       t('town', 14,  7),
  [TILE.FLOOR_PLANK_H]:       t('town', 15,  7),
  [TILE.CARPET_RED]:          t('town', 16, 15),
  [TILE.CARPET_BLUE]:         t('town', 16, 17),
  [TILE.CARPET_EDGE]:         t('town', 15, 15),
  [TILE.TABLE_SMALL]:         t('town',  6, 39),
  [TILE.BENCH]:               t('town',  7, 39),
  [TILE.CHAIR_WOOD]:          t('town',  6, 40),

  // ─── Dungeon atmospherics (Tiny Dungeon sheet) ───────────────
  [TILE.FLOOR_CRACKED]: t('dungeon', 0, 7),
  [TILE.MOSS_STONE]:    t('dungeon', 0, 1),
  [TILE.LAVA]:          t('dungeon', 0, 9),
  [TILE.ACID]:          t('dungeon', 0, 10),
  [TILE.BONES]:         t('dungeon', 6, 8),
  [TILE.CHAINS]:        t('dungeon', 8, 4),
  [TILE.COBWEB]:        t('dungeon', 7, 11),
  [TILE.BLOOD_STONE]:   t('dungeon', 0, 8),
  [TILE.WALL_INNER]:    t('dungeon', 1, 0),
  [TILE.WALL_CORNER]:   t('dungeon', 1, 1),
  [TILE.TORCH]:         t('dungeon', 9, 1),
  [TILE.BARREL]:        t('dungeon', 8, 0),
  [TILE.CRATE]:         t('dungeon', 8, 1),
  [TILE.BOOKSHELF]:     t('dungeon', 6, 0),
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
  [TILE.GRASS_DARK]: [TILE.GRASS_DARK, TILE.GRASS_DARK, TILE.GRASS_DARK,
                      TILE.GRASS_FLOWER_RED, TILE.GRASS_FLOWER_YELLOW, TILE.GRASS_TUFT],
  [TILE.GRASS_LIGHT]: [TILE.GRASS_LIGHT, TILE.GRASS_LIGHT, TILE.GRASS_LIGHT,
                       TILE.GRASS_FLOWER_BLUE, TILE.GRASS_TUFT],
  [TILE.PATH]: [TILE.PATH, TILE.PATH, TILE.PATH, TILE.COBBLE],
  [TILE.FLOOR_STONE]: [TILE.FLOOR_STONE, TILE.FLOOR_STONE, TILE.COBBLE],
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
