/**
 * Maps the game's semantic tile IDs (TILE.GRASS_DARK, TILE.WALL_STONE, ...)
 * to tile indices in the CC0 Kenney "Tiny Town" and "Tiny Dungeon"
 * spritesheets. Both sheets are 12 cols × 11 rows of 16×16 px tiles.
 *
 * Tile index = row * 12 + col, zero-based.
 *
 * Only entries listed here get replaced with sprite-art at runtime; any
 * tile not in the map keeps the original procedural drawing as a
 * fallback. This lets us upgrade coverage tile-by-tile without risk of
 * breaking scenes that rely on tiles we haven't mapped yet.
 *
 * Sheet layouts (both Kenney, both CC0):
 *   tiny-town_packed.png    — outdoor: grass, path, water, houses, etc.
 *   tiny-dungeon_packed.png — dungeon: stone floor, walls, lava, bones, etc.
 */
import { TILE } from './generateTiles';

/** Master switch. Set to false to go back to the procedural tileset. */
export const USE_SPRITE_TILES = true;

export const KENNEY_COLS = 12;
export const KENNEY_TILE_PX = 16;

export const TOWN_KEY = 'kenney-tiny-town';
export const TOWN_URL = '/assets/tilesets/tiny-town_packed.png';
export const DUNGEON_KEY = 'kenney-tiny-dungeon';
export const DUNGEON_URL = '/assets/tilesets/tiny-dungeon_packed.png';

/** Helper: `rc(row, col)` -> linear tile index in the 12-wide sheet. */
const rc = (row: number, col: number) => row * KENNEY_COLS + col;

export interface SpriteTileRef {
  /** Which sheet to sample from. */
  sheet: 'town' | 'dungeon';
  /** Tile index in that sheet. */
  index: number;
}

/**
 * Semantic tile -> Kenney sprite mapping.
 *
 * Indices chosen by inspecting the Kenney sample PNGs. Both "Tiny Town"
 * and "Tiny Dungeon" use the same 12×11 layout; top-left = (0,0).
 *
 * If a specific tile looks wrong in-game, tweak the (row, col) here.
 * Collision geometry is unaffected — this is purely visual.
 */
export const TILE_SPRITE_MAP: Partial<Record<number, SpriteTileRef>> = {
  // ─── Outdoor (Tiny Town) ─────────────────────────────────────
  [TILE.GRASS_DARK]:  { sheet: 'town', index: rc(0, 0) },
  [TILE.GRASS_LIGHT]: { sheet: 'town', index: rc(0, 1) },
  [TILE.PATH]:        { sheet: 'town', index: rc(0, 5) },
  [TILE.PATH_EDGE]:   { sheet: 'town', index: rc(0, 4) },
  [TILE.WATER]:       { sheet: 'town', index: rc(0, 2) },
  [TILE.BUSH]:        { sheet: 'town', index: rc(5, 0) },
  [TILE.FENCE]:       { sheet: 'town', index: rc(7, 3) },
  [TILE.WELL]:        { sheet: 'town', index: rc(9, 5) },

  // ─── Interior / buildings (Tiny Town) ────────────────────────
  [TILE.WALL_WOOD]:   { sheet: 'town', index: rc(2, 0) },
  [TILE.ROOF]:        { sheet: 'town', index: rc(2, 1) },
  [TILE.ROOF_EDGE]:   { sheet: 'town', index: rc(2, 2) },
  [TILE.DOOR]:        { sheet: 'town', index: rc(4, 2) },
  [TILE.FLOOR_WOOD]:  { sheet: 'town', index: rc(1, 5) },
  [TILE.WINDOW]:      { sheet: 'town', index: rc(3, 1) },

  // ─── Dungeon (Tiny Dungeon) ──────────────────────────────────
  [TILE.WALL_STONE]:    { sheet: 'dungeon', index: rc(0, 0) },
  [TILE.FLOOR_STONE]:   { sheet: 'dungeon', index: rc(0, 6) },
  [TILE.FLOOR_CRACKED]: { sheet: 'dungeon', index: rc(0, 7) },
  [TILE.MOSS_STONE]:    { sheet: 'dungeon', index: rc(0, 1) },
  [TILE.LAVA]:          { sheet: 'dungeon', index: rc(0, 9) },
  [TILE.ACID]:          { sheet: 'dungeon', index: rc(0, 10) },
  [TILE.BONES]:         { sheet: 'dungeon', index: rc(6, 8) },
  [TILE.CHAINS]:        { sheet: 'dungeon', index: rc(8, 4) },
  [TILE.COBWEB]:        { sheet: 'dungeon', index: rc(7, 11) },
  [TILE.BLOOD_STONE]:   { sheet: 'dungeon', index: rc(0, 8) },
  [TILE.WALL_INNER]:    { sheet: 'dungeon', index: rc(1, 0) },
  [TILE.WALL_CORNER]:   { sheet: 'dungeon', index: rc(1, 1) },
  [TILE.TORCH]:         { sheet: 'dungeon', index: rc(9, 1) },
  [TILE.BARREL]:        { sheet: 'dungeon', index: rc(8, 0) },
  [TILE.CRATE]:         { sheet: 'dungeon', index: rc(8, 1) },
  [TILE.BOOKSHELF]:     { sheet: 'dungeon', index: rc(6, 0) },
};
