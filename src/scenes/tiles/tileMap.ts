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
 * Outdoor tiles point at the Roguelike/RPG Pack. Tile coords are
 * pixel-verified from roguelike-rpg_TILEMAP.md — in particular the
 * "plain" floor tiles live in the bottom-left 9-slice color blocks
 * (rows 25-30), where the CENTER tile of each 3×3 block is a solid
 * single-color fill with no decorations.
 *
 *   (26, 1)  plain dirt brown
 *   (26, 4)  plain grey stone
 *   (26, 7)  plain sand
 *   (26,10)  plain grass green    ← GRASS_DARK / GRASS_LIGHT
 *   (26,13)  plain terracotta     ← ROOF
 *   (26,16)  plain teal
 *
 * Trees and bushes live in the isolated decoration strip at rows 9-11
 * and are mapped to TILE.BUSH / decorative tiles ONLY — never to grass.
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
