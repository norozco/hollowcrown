/**
 * Multi-cell decoration overlay system.
 *
 * Hollowcrown's tilemap is single-cell-per-tile but Kenney's pack
 * authors big things (trees, walls, buildings) as multi-cell sprites.
 * A "tree" in Kenney is 3 cells tall: canopy-top + canopy-mid + trunk.
 *
 * This module:
 *   1. Pre-bakes each multi-cell sprite into a single Phaser texture
 *      at boot time (called from BootScene).
 *   2. Provides `applyDecorationOverlays(scene, tilemap)` that walks
 *      a scene's tilemap, finds anchor cells (e.g. TILE.BUSH for tree
 *      positions), and adds a Phaser Image at the right world
 *      position to render the multi-cell sprite. The image extends
 *      UPWARD from the anchor cell so the trunk of a tree sits at
 *      the original cell (collision unchanged) and the canopy floats
 *      above (purely visual).
 *
 * Pixel-verified coords against the Kenney roguelike-rpg sheet via
 * tools/_out/zoom-flora.png and zoom-walls.png.
 */
import * as Phaser from 'phaser';
import { TILE } from './generateTiles';
import { TOWN_KEY, SHEET_GEOM } from './tileMap';

const PITCH = SHEET_GEOM.town.pitch; // 17
const TILE_PX = SHEET_GEOM.town.tilePx; // 16
const SCALE = 2; // 16→32 to match game scale

/**
 * Multi-cell sprite descriptor. `anchorRow` is the bottom-most row of
 * the sprite in the sheet — that's the row that aligns with the cell
 * the tilemap places the decoration at. Cells above the anchor extend
 * upward in world space.
 */
interface MultiCellDescriptor {
  /** Texture key once baked. */
  key: string;
  /** Top-left of the sprite block in (row, col) of the Kenney sheet. */
  topRow: number;
  topCol: number;
  /** How many cells wide and tall on the sheet. */
  cellsW: number;
  cellsH: number;
  /** Z-depth for the rendered image. Higher = drawn on top. Trees
   *  use 8 so they sit just below the player (depth 10). */
  depth: number;
}

/**
 * The library of multi-cell decorations. All coords pixel-verified
 * against tools/_out/zoom-flora.png + zoom-walls.png.
 *
 * Trees occupy 3 cells (1 wide × 3 tall). Wall tops are single-cell
 * (1 wide × 1 tall) but rendered above the wall position.
 */
export const DECORATION_LIBRARY: Record<string, MultiCellDescriptor> = {
  // ── Trees (3 cells tall, bottom row is trunk) ──────────────────
  // Confirmed from zoom-flora.png — col 13 rows 9-11 is a green oak.
  'deco_tree_oak':    { key: 'deco_tree_oak',    topRow: 9, topCol: 13, cellsW: 1, cellsH: 3, depth: 8 },
  'deco_tree_autumn': { key: 'deco_tree_autumn', topRow: 9, topCol: 14, cellsW: 1, cellsH: 3, depth: 8 },
  'deco_tree_pine':   { key: 'deco_tree_pine',   topRow: 9, topCol: 15, cellsW: 1, cellsH: 3, depth: 8 },
  // Narrower / taller trees in cols 16-18.
  'deco_tree_oak2':    { key: 'deco_tree_oak2',    topRow: 9, topCol: 16, cellsW: 1, cellsH: 3, depth: 8 },
  'deco_tree_autumn2': { key: 'deco_tree_autumn2', topRow: 9, topCol: 17, cellsW: 1, cellsH: 3, depth: 8 },
  'deco_tree_pine2':   { key: 'deco_tree_pine2',   topRow: 9, topCol: 18, cellsW: 1, cellsH: 3, depth: 8 },
  // Dead tree — col 27 rows 9-11 is the brown skeletal tree.
  'deco_tree_dead':   { key: 'deco_tree_dead',   topRow: 9, topCol: 27, cellsW: 1, cellsH: 3, depth: 8 },

  // ── Wall tops (single-cell horizontal slice, drawn ABOVE wall cells) ──
  // Confirmed from zoom-walls.png — row 12 has the "looking-down on the
  // wall" top faces. Cols 20-22 are the grey stone wall set, cols 14-16
  // the sand stone, cols 27-29 the light blue-grey castle stone.
  // We'll auto-pick by wall material at render time.
  'deco_wall_stone_top':  { key: 'deco_wall_stone_top',  topRow: 12, topCol: 21, cellsW: 1, cellsH: 1, depth: 11 },
  'deco_wall_wood_top':   { key: 'deco_wall_wood_top',   topRow: 12, topCol: 15, cellsW: 1, cellsH: 1, depth: 11 },
  'deco_wall_inner_top':  { key: 'deco_wall_inner_top',  topRow: 12, topCol: 28, cellsW: 1, cellsH: 1, depth: 11 },
};

/**
 * Bake every entry in DECORATION_LIBRARY into a Phaser texture.
 * Called once from BootScene after the Kenney sheet is loaded.
 *
 * Each multi-cell sprite is composed by drawing the constituent cells
 * (with their 1-px gap stripped) onto an offscreen canvas, then added
 * as a texture under the descriptor's `key`.
 */
export function bakeDecorationTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(TOWN_KEY)) {
    console.warn('[decorationOverlays] Kenney sheet not loaded; skipping bake.');
    return;
  }
  const src = scene.textures.get(TOWN_KEY).getSourceImage(0) as
    HTMLImageElement | HTMLCanvasElement;

  for (const desc of Object.values(DECORATION_LIBRARY)) {
    if (scene.textures.exists(desc.key)) continue; // already baked

    const w = desc.cellsW * TILE_PX;
    const h = desc.cellsH * TILE_PX;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    // Composite each cell from the sheet, dropping the 1-px gap so
    // the resulting sprite has clean cell-to-cell edges.
    for (let cy = 0; cy < desc.cellsH; cy++) {
      for (let cx = 0; cx < desc.cellsW; cx++) {
        const sx = (desc.topCol + cx) * PITCH;
        const sy = (desc.topRow + cy) * PITCH;
        ctx.drawImage(src, sx, sy, TILE_PX, TILE_PX,
                      cx * TILE_PX, cy * TILE_PX, TILE_PX, TILE_PX);
      }
    }
    scene.textures.addCanvas(desc.key, cv);
  }
}

/**
 * Render a multi-cell decoration at a given world position.
 *
 * `worldX` and `worldY` are the CENTER of the anchor cell (the cell
 * that triggered the overlay — typically the cell in the tilemap
 * with TILE.BUSH or TILE.TREE_*). The overlay extends UPWARD in
 * world Y from the anchor.
 *
 * Returns the Phaser Image object so callers can store/destroy it.
 */
export function renderDecoration(
  scene: Phaser.Scene,
  decoKey: keyof typeof DECORATION_LIBRARY,
  worldX: number,
  worldY: number,
): Phaser.GameObjects.Image | null {
  const desc = DECORATION_LIBRARY[decoKey];
  if (!desc) return null;
  if (!scene.textures.exists(desc.key)) return null;

  // Origin (0.5, 1) anchors the sprite at the bottom-center, which
  // is where the trunk of a tree sits. The anchor cell becomes the
  // bottom row of the sprite; the rest extends up.
  const img = scene.add.image(worldX, worldY + (TILE_PX * SCALE) / 2, desc.key);
  img.setOrigin(0.5, 1);
  img.setScale(SCALE);
  img.setDepth(desc.depth);
  return img;
}

/**
 * Pick a stable tree variant for a position so re-entering a scene
 * yields the same forest. xorshift-ish hash on (x, y).
 */
export function pickTreeVariant(x: number, y: number): keyof typeof DECORATION_LIBRARY {
  const variants: Array<keyof typeof DECORATION_LIBRARY> = [
    'deco_tree_oak', 'deco_tree_oak2',
    'deco_tree_autumn', 'deco_tree_autumn2',
    'deco_tree_pine', 'deco_tree_pine2',
  ];
  let h = (x * 73856093) ^ (y * 19349663);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return variants[h % variants.length];
}

/**
 * Walk a tilemap layer and render a "wall top" sprite ABOVE every
 * wall cell whose top neighbour is non-wall (i.e. the topmost row of
 * a wall block). This produces the depth illusion: the wall cell
 * itself shows the procedural front-face brick texture, and a flat
 * Kenney "top of wall" sprite hangs above it like a parapet.
 *
 * Only fires on the top edges of wall runs to avoid over-stacking.
 * For an L-shaped wall, every horizontal-top cell gets its own top
 * sprite.
 */
export function applyWallTopOverlays(
  scene: Phaser.Scene,
  layer: Phaser.Tilemaps.TilemapLayer,
): Phaser.GameObjects.Image[] {
  const created: Phaser.GameObjects.Image[] = [];
  const isWall = (idx: number) =>
    idx === TILE.WALL_STONE || idx === TILE.WALL_WOOD ||
    idx === TILE.WALL_INNER || idx === TILE.WALL_CORNER;

  layer.forEachTile((tile) => {
    if (!isWall(tile.index)) return;
    // Only inject a top if the cell ABOVE this wall is non-wall —
    // that's the topmost row of a building's wall.
    const above = layer.getTileAt(tile.x, tile.y - 1);
    if (above && isWall(above.index)) return;

    let key: keyof typeof DECORATION_LIBRARY;
    if (tile.index === TILE.WALL_WOOD) key = 'deco_wall_wood_top';
    else if (tile.index === TILE.WALL_INNER) key = 'deco_wall_inner_top';
    else key = 'deco_wall_stone_top';

    // Render the top sprite ONE cell above the wall — sits at the
    // top edge of the wall cell in screen space, aligned to grid.
    const wx = tile.pixelX + tile.width / 2;
    const wy = (tile.pixelY) - tile.height / 2;
    const desc = DECORATION_LIBRARY[key];
    if (!scene.textures.exists(desc.key)) return;
    const img = scene.add.image(wx, wy, desc.key);
    img.setOrigin(0.5, 0.5);
    img.setScale(SCALE);
    img.setDepth(desc.depth);
    created.push(img);
  });
  return created;
}

/**
 * Walk a Phaser tilemap layer and render tree overlays on every cell
 * that's a "tree anchor" tile. In Hollowcrown's data model, scenes
 * use TILE.BUSH to mark forest positions (see GreenhollowScene.tileAt
 * and getTreePositions). We treat each BUSH cell as a tree anchor
 * and render a randomized 3-tall tree sprite over it. The collision
 * body remains where the scene placed it (these overlays are visual
 * only).
 *
 * Importantly, BUSH tiles in tilemaps that AREN'T placed via
 * `getTreePositions` (e.g. interior layouts) won't get the overlay
 * because their scene has its own tilemap pass — the overlay only
 * fires on the layers that pass through this function. To opt a
 * scene in: call this with that scene's TilemapLayer after creation.
 *
 * Returns the array of created images so callers can dispose of them
 * on scene shutdown.
 */
export function applyTreeOverlays(
  scene: Phaser.Scene,
  layer: Phaser.Tilemaps.TilemapLayer,
): Phaser.GameObjects.Image[] {
  const created: Phaser.GameObjects.Image[] = [];
  layer.forEachTile((tile) => {
    if (tile.index === TILE.BUSH) {
      const variant = pickTreeVariant(tile.x, tile.y);
      // Tile pixel center in world space — Phaser tile.pixelX/Y is
      // the top-left of the cell; add half the tile width to centre.
      const wx = tile.pixelX + tile.width / 2;
      const wy = tile.pixelY + tile.height / 2;
      const img = renderDecoration(scene, variant, wx, wy);
      if (img) created.push(img);
    }
  });
  return created;
}
