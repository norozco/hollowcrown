import * as Phaser from 'phaser';
import {
  USE_SPRITE_TILES,
  TILE_SPRITE_MAP,
  TOWN_KEY,
  DUNGEON_KEY,
  SHEET_GEOM,
} from './tileMap';

/**
 * Procedural pixel-art tileset — LttP palette retune. Vivid emerald grass,
 * warm umber paths, royal-blue water. Same TILE.* contract; collision-safe.
 *
 * Tiles 0-15:  terrain (grass, path, walls, roof, etc.)
 * Tiles 16-31: furniture & decoration (bookshelf, bed, table, etc.)
 *
 * Every tile is 32×32 with 4-8 colors, deliberate pixel patterns,
 * highlight/shadow edges, and enough detail to read as hand-drawn.
 */

export const TILE = {
  GRASS_DARK: 0, GRASS_LIGHT: 1, PATH: 2, WALL_STONE: 3,
  WALL_WOOD: 4, DOOR: 5, FLOOR_WOOD: 6, FLOOR_STONE: 7,
  ROOF: 8, ROOF_EDGE: 9, SHADOW: 10, BUSH: 11,
  FENCE: 12, PATH_EDGE: 13, WELL: 14, WATER: 15,
  // Furniture & decor
  BOOKSHELF: 16, COUNTER: 17, BED_HEAD: 18, BED_FOOT: 19,
  TABLE: 20, CHAIR: 21, BARREL: 22, CRATE: 23,
  FIREPLACE: 24, PLANT: 25, RUG_CENTER: 26, RUG_EDGE: 27,
  WEAPON_RACK: 28, WINDOW: 29, TORCH: 30, DISPLAY: 31,
  // Interior architecture (ALTTP-style thick borders)
  WALL_INNER: 32, WALL_CORNER: 33, WALL_SHELF: 34, BASEBOARD: 35,
  // Dungeon hazard & atmosphere tiles
  LAVA: 36, ACID: 37, FLOOR_CRACKED: 38, BONES: 39,
  COBWEB: 40, CHAINS: 41, MOSS_STONE: 42, BLOOD_STONE: 43,
  // ── Expanded outdoor variants (44+) ──
  GRASS_FLOWER_RED: 44, GRASS_FLOWER_YELLOW: 45, GRASS_FLOWER_BLUE: 46,
  GRASS_TUFT: 47, SAND: 48, SAND_EDGE: 49, TEAL_FLOOR: 50,
  COBBLE: 51, COBBLE_EDGE: 52,
  PATH_CORNER_NW: 53, PATH_CORNER_NE: 54, PATH_CORNER_SW: 55, PATH_CORNER_SE: 56,
  PATH_EDGE_W: 57, PATH_EDGE_E: 58, PATH_EDGE_S: 59,
  WATER_EDGE_N: 60, WATER_EDGE_S: 61, WATER_EDGE_W: 62, WATER_EDGE_E: 63,
  WATER_ROCK: 64, STAIRS_UP: 65, STAIRS_DOWN: 66,
  // Flora variants
  TREE_PINE: 67, TREE_OAK: 68, TREE_DEAD: 69, BUSH_BERRY: 70,
  ROCK_SMALL: 71, ROCK_LARGE: 72, BOULDER: 73, STUMP: 74,
  // Architecture variants
  ROOF_RED: 75, ROOF_BLUE: 76, ROOF_GREEN: 77, ROOF_THATCH: 78,
  ROOF_EDGE_L: 79, ROOF_EDGE_R: 80, ROOF_PEAK: 81,
  COLUMN: 82, COLUMN_TOP: 83, COLUMN_BASE: 84,
  FENCE_H: 85, FENCE_V: 86, FENCE_GATE: 87,
  SIGN: 88, LAMP_POST: 89, LANTERN: 90,
  DOOR_IRON: 91, DOOR_ARCH: 92, WINDOW_ROUND: 93, WINDOW_BARRED: 94,
  // Interior extras
  FLOOR_PLANK_V: 95, FLOOR_PLANK_H: 96,
  CARPET_RED: 97, CARPET_BLUE: 98, CARPET_EDGE: 99,
  TABLE_SMALL: 100, BENCH: 101, CHAIR_WOOD: 102,
  // Wadeable water — passable only with the Water Charm dungeon item.
  SHALLOW_WATER: 103,
  // Grass tile variants — same forest-base palette as GRASS_DARK/LIGHT,
  // but painted with different scatter seeds + cluster positions +
  // wildflower offsets. Wired into TILE_VARIANT_POOL so applyTileVariants
  // mixes them in deterministically per cell, breaking the visible
  // "wallpaper" repeat pattern of the field.
  GRASS_VAR_A: 104, GRASS_VAR_B: 105, GRASS_VAR_C: 106,
} as const;

export const TILE_SIZE = 32;
const TILE_COUNT = 107;
const S = TILE_SIZE;

export function generateTileset(scene: Phaser.Scene): void {
  if (scene.textures.exists('tileset')) return;
  const canvas = document.createElement('canvas');
  canvas.width = TILE_COUNT * S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  // Terrain
  drawGrassDark(ctx, 0); drawGrassLight(ctx, 1); drawPath(ctx, 2);
  drawWallStone(ctx, 3); drawWallWood(ctx, 4); drawDoor(ctx, 5);
  drawFloorWood(ctx, 6); drawFloorStone(ctx, 7); drawRoof(ctx, 8);
  drawRoofEdge(ctx, 9); drawShadow(ctx, 10); drawBush(ctx, 11);
  drawFence(ctx, 12); drawPathEdge(ctx, 13); drawWell(ctx, 14);
  drawWater(ctx, 15);
  drawShallowWater(ctx, 103);
  // Furniture
  drawBookshelf(ctx, 16); drawCounter(ctx, 17); drawBedHead(ctx, 18);
  drawBedFoot(ctx, 19); drawTable(ctx, 20); drawChair(ctx, 21);
  drawBarrel(ctx, 22); drawCrate(ctx, 23); drawFireplace(ctx, 24);
  drawPlant(ctx, 25); drawRugCenter(ctx, 26); drawRugEdge(ctx, 27);
  drawWeaponRack(ctx, 28); drawWindow(ctx, 29); drawTorch(ctx, 30);
  drawDisplay(ctx, 31);

  // Interior architecture tiles
  drawWallInner(ctx, 32); drawWallCorner(ctx, 33);
  drawWallShelf(ctx, 34); drawBaseboard(ctx, 35);

  // Dungeon hazard & atmosphere tiles
  drawLava(ctx, 36); drawAcid(ctx, 37); drawFloorCracked(ctx, 38);
  drawBones(ctx, 39); drawCobweb(ctx, 40); drawChains(ctx, 41);
  drawMossStone(ctx, 42); drawBloodStone(ctx, 43);

  // Expanded Kenney-backed tiles (44-102). These are ALWAYS overlaid by
  // the Kenney sprite sheet; we paint a neutral biome-colored fallback
  // so the frame isn't transparent if the sheet fails to load.
  drawKenneyFallbacks(ctx);

  // CC0 sprite-tile overlay — blits Kenney 16×16 tiles (scaled 2×) over
  // procedural slots listed in TILE_SPRITE_MAP. Any tile not mapped, or any
  // scene where the Kenney sheets failed to load, keeps the procedural art
  // underneath as a visual fallback. Collision geometry is untouched.
  // (Dither/edge pass removed — it was doubling up with the sprite and
  // making every tile look speckled.)
  if (USE_SPRITE_TILES) {
    overlaySpriteTiles(scene, ctx);
    // Kenney's grass cell is a bright flat emerald that doesn't match
    // the deeper foliage greens of the bush/tree sprites that sit on
    // top of it. Override with a forest-matched base + blade-stroke
    // texture so the open field reads as the same biome as the trees.
    paintGrassBase(ctx, TILE.GRASS_DARK);
    paintGrassBase(ctx, TILE.GRASS_LIGHT);
    paintGrassBase(ctx, TILE.GRASS_VAR_A);
    paintGrassBase(ctx, TILE.GRASS_VAR_B);
    paintGrassBase(ctx, TILE.GRASS_VAR_C);
    paintGrassDarkDecorations(ctx, TILE.GRASS_DARK);
    paintGrassLightDecorations(ctx, TILE.GRASS_LIGHT);
    // Variants share paintGrassBase but get unique scatter seeds,
    // cluster positions, and wildflower offsets so cells painted with
    // them don't repeat the GRASS_DARK/LIGHT pattern. Together with
    // TILE_VARIANT_POOL in tileMap.ts, this breaks the wallpaper look.
    paintGrassVarADecorations(ctx, TILE.GRASS_VAR_A);
    paintGrassVarBDecorations(ctx, TILE.GRASS_VAR_B);
    paintGrassVarCDecorations(ctx, TILE.GRASS_VAR_C);
  }

  const tex = scene.textures.addCanvas('tileset', canvas);
  if (tex) { for (let i = 0; i < TILE_COUNT; i++) tex.add(i, 0, i * S, 0, S, S); }
}

/** Copy mapped Kenney tiles onto the procedural strip, 2× upscaled, nearest-neighbor. */
function overlaySpriteTiles(scene: Phaser.Scene, ctx: Ctx): void {
  const getImage = (key: string): HTMLImageElement | HTMLCanvasElement | null => {
    if (!scene.textures.exists(key)) return null;
    const src = scene.textures.get(key).getSourceImage(0);
    // Phaser source images are HTMLImageElement or HTMLCanvasElement at runtime.
    return src as HTMLImageElement | HTMLCanvasElement;
  };
  const town = getImage(TOWN_KEY);
  const dungeon = getImage(DUNGEON_KEY);
  if (!town && !dungeon) return; // both failed to load — pure procedural fallback

  // Preserve hard pixel edges when scaling 16 -> 32.
  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;

  for (const key of Object.keys(TILE_SPRITE_MAP)) {
    const semantic = Number(key);
    const ref = TILE_SPRITE_MAP[semantic]!;
    const img = ref.sheet === 'town' ? town : dungeon;
    if (!img) continue;
    const geom = SHEET_GEOM[ref.sheet];
    const sx = ref.col * geom.pitch;
    const sy = ref.row * geom.pitch;
    // 2-layer pipeline: keep the procedural biome-colour base painted by
    // drawKenneyFallbacks/drawGrassDark/etc. UNDERNEATH, then composite
    // the Kenney sprite on top via default source-over. Transparent
    // pixels in the Kenney sprite (tree edges, flower outlines) reveal
    // the green grass beneath instead of clearing to canvas-black —
    // which was the visible bug in the previous re-enable attempt.
    ctx.drawImage(img, sx, sy, geom.tilePx, geom.tilePx, ox(semantic), 0, S, S);
  }

  ctx.imageSmoothingEnabled = prevSmooth;
}

// ─── Helpers ──────────────────────────────────────────────────
type Ctx = CanvasRenderingContext2D;
function ox(i: number) { return i * S; }
function px(c: Ctx, i: number, x: number, y: number, col: string) { c.fillStyle = col; c.fillRect(ox(i)+x, y, 1, 1); }
function blk(c: Ctx, i: number, x: number, y: number, w: number, h: number, col: string) { c.fillStyle = col; c.fillRect(ox(i)+x, y, w, h); }
function fill(c: Ctx, i: number, col: string) { blk(c, i, 0, 0, S, S, col); }

/**
 * Fallback fill for the expanded TILE ids (44-102, plus grass variants
 * 104-106). Each tile is either grass-green, dirt-brown, stone-grey,
 * water-blue, terracotta-red, or wood-tan — matched roughly to what the
 * Kenney overlay will paint on top. If the overlay lands (99% case)
 * these pixels are invisible; if the sheet fails to load, the fallback
 * still reads as the right biome.
 *
 * B15: every fallback also gets a small high-contrast magenta diagonal
 * stripe in the top-left corner. When the Kenney overlay paints, the
 * marker is hidden (the sprite covers the whole 32×32 cell). When the
 * sheet fails to load, the stripe makes the broken-sprite state
 * visually obvious instead of letting unmapped tiles read as a uniform
 * green block.
 */
function drawKenneyFallbacks(c: Ctx): void {
  const biome = (id: number, col: string) => {
    fill(c, id, col);
    drawBrokenSpriteMarker(c, id);
  };
  const G = '#3ca41c', D = '#ae8050', K = '#a0a0a0', W = '#69c5cd';
  const R = '#b65e26', N = '#c8b890', T = '#2a2a2a';
  // Grass decorations 44-47 — base green.
  biome(TILE.GRASS_FLOWER_RED, G);    biome(TILE.GRASS_FLOWER_YELLOW, G);
  biome(TILE.GRASS_FLOWER_BLUE, G);   biome(TILE.GRASS_TUFT, G);
  // Sand / teal / cobble.
  biome(TILE.SAND, N); biome(TILE.SAND_EDGE, N);
  biome(TILE.TEAL_FLOOR, '#37aaa5');
  biome(TILE.COBBLE, K); biome(TILE.COBBLE_EDGE, K);
  // Path corners/edges.
  for (const id of [TILE.PATH_CORNER_NW, TILE.PATH_CORNER_NE, TILE.PATH_CORNER_SW,
                    TILE.PATH_CORNER_SE, TILE.PATH_EDGE_W, TILE.PATH_EDGE_E, TILE.PATH_EDGE_S]) biome(id, D);
  // Water edges.
  for (const id of [TILE.WATER_EDGE_N, TILE.WATER_EDGE_S, TILE.WATER_EDGE_W,
                    TILE.WATER_EDGE_E, TILE.WATER_ROCK]) biome(id, W);
  // Stairs — stone.
  biome(TILE.STAIRS_UP, K); biome(TILE.STAIRS_DOWN, K);
  // Flora — on grass background.
  for (const id of [TILE.TREE_PINE, TILE.TREE_OAK, TILE.TREE_DEAD, TILE.BUSH_BERRY,
                    TILE.ROCK_SMALL, TILE.ROCK_LARGE, TILE.BOULDER, TILE.STUMP]) biome(id, G);
  // Roofs — red/terracotta base except BLUE/GREEN/THATCH.
  biome(TILE.ROOF_RED, R); biome(TILE.ROOF_BLUE, '#37aaa5');
  biome(TILE.ROOF_GREEN, '#3a7848'); biome(TILE.ROOF_THATCH, '#b8a058');
  biome(TILE.ROOF_EDGE_L, R); biome(TILE.ROOF_EDGE_R, R); biome(TILE.ROOF_PEAK, R);
  // Columns / signs / lamps — stone/wood.
  biome(TILE.COLUMN, K); biome(TILE.COLUMN_TOP, K); biome(TILE.COLUMN_BASE, K);
  biome(TILE.FENCE_H, D); biome(TILE.FENCE_V, D); biome(TILE.FENCE_GATE, D);
  biome(TILE.SIGN, D); biome(TILE.LAMP_POST, T); biome(TILE.LANTERN, T);
  biome(TILE.DOOR_IRON, T); biome(TILE.DOOR_ARCH, D);
  biome(TILE.WINDOW_ROUND, T); biome(TILE.WINDOW_BARRED, T);
  // Interiors.
  biome(TILE.FLOOR_PLANK_V, D); biome(TILE.FLOOR_PLANK_H, D);
  biome(TILE.CARPET_RED, '#8a2020'); biome(TILE.CARPET_BLUE, '#203a8a');
  biome(TILE.CARPET_EDGE, '#503020');
  biome(TILE.TABLE_SMALL, D); biome(TILE.BENCH, D); biome(TILE.CHAIR_WOOD, D);
  // Grass variants — green base. The post-overlay paint pass replaces
  // these with the forest-base + variant-specific blade pattern; this
  // fill is purely a backstop for the (extremely rare) failure mode
  // where both the Kenney overlay AND the post-overlay paint pass
  // somehow don't run for these IDs.
  biome(TILE.GRASS_VAR_A, G); biome(TILE.GRASS_VAR_B, G); biome(TILE.GRASS_VAR_C, G);
}

/**
 * B15: small visible marker drawn in the top-left corner of unmapped
 * tiles' fallback fill. Magenta is intentionally never used by the
 * grass / dirt / stone / water / wood biome palettes, so its presence
 * is an unambiguous signal that the Kenney sheet didn't paint over the
 * cell — i.e. the sprite-load failed or the tile ID isn't mapped.
 *
 * Drawn as a 2-pixel-thick diagonal stripe running ~5 cells in the
 * top-left corner. Tiny enough not to dominate the cell during normal
 * play (the Kenney sprite, when loaded, completely covers it), but
 * obvious in a zoom-out when the sprite is missing — turning a
 * uniform green block into a clearly-broken cell.
 */
function drawBrokenSpriteMarker(c: Ctx, i: number) {
  const M = '#ff00aa';
  // Two parallel diagonal lines = 2px-thick stripe across (0,0)-(4,4).
  for (let k = 0; k < 5; k++) {
    px(c, i, k, k, M);
    if (k + 1 < S) px(c, i, k + 1, k, M);
  }
}

// ═══════════════════════════════════════════════════════════════
// TERRAIN TILES (0-15) — same ALTTP-quality as before
// ═══════════════════════════════════════════════════════════════

// Unified grass palette — shadow / mid-dark / mid / highlight. Both
// GRASS_DARK and GRASS_LIGHT now share this dark ramp; what used to be
// "sunlit meadow" is just a second cluster pattern over the same base
// so adjacent grass cells don't read as a repeating wallpaper.
function drawGrassDark(c: Ctx, i: number) {
  fill(c, i, '#3ca41c');
  blk(c,i,0,0,5,4,'#38a018'); blk(c,i,16,8,6,5,'#40a820');
  blk(c,i,8,20,7,5,'#38a018'); blk(c,i,26,16,6,6,'#40a820');
  paintGrassDarkDecorations(c, i);
}

function drawGrassLight(c: Ctx, i: number) {
  fill(c, i, '#3ca41c');
  blk(c,i,6,2,7,5,'#40a820'); blk(c,i,22,14,6,5,'#40a820');
  blk(c,i,2,22,5,4,'#38a018');
  paintGrassLightDecorations(c, i);
}

/** Tufts/flowers/dips for GRASS_DARK. Pulled out of drawGrassDark so it
 *  can be re-applied after overlaySpriteTiles paints the Kenney emerald
 *  on top — without this re-application, the open field renders as a
 *  flat solid green that doesn't match the dotted bases of bush/tree
 *  sprites. Same dark palette as before. */
/** Forest grass palette tuned to sit just below the Kenney bush/tree
 *  foliage greens — close enough that the open field reads as the same
 *  biome as the trees, but with enough contrast that canopies still
 *  read as elevated above the ground plane. */
const GRASS_BASE      = '#4a8830';  // medium forest green — new tile fill
const GRASS_BLADE_DRK = '#1f4818';  // deepest blade shadow
const GRASS_BLADE_MID = '#2a5a20';  // mid-dark blade
const GRASS_HIGHLIGHT = '#88c845';  // sunlit blade tip

/** Override the Kenney emerald with a forest-matched base green and
 *  paint a few subtle ground patches. Called per grass tile after
 *  overlaySpriteTiles, before the blade decorations. */
function paintGrassBase(c: Ctx, i: number) {
  fill(c, i, GRASS_BASE);
  // Slightly varied patches so the base isn't perfectly uniform.
  blk(c,i,4,6,6,4,'#4e9034'); blk(c,i,18,4,5,4,'#46802c');
  blk(c,i,2,18,4,5,'#4e9034'); blk(c,i,22,20,6,4,'#46802c');
  blk(c,i,12,24,5,4,'#4e9034');
}

/** Draw a single grass blade — a 1px-wide, 2px-tall vertical stroke
 *  with optional brighter tip. Reads as a directional blade rather
 *  than random noise. */
function blade(c: Ctx, i: number, x: number, y: number, dark: string, tip?: string) {
  px(c, i, x, y + 1, dark);
  px(c, i, x, y, tip ?? dark);
}

/** Scatter blade-style strokes deterministically across the tile. Each
 *  blade is 2px tall (1×2 vertical), keeping it inside (1, 28) on Y so
 *  it doesn't clip the bottom edge or stack against the next tile. */
function scatterBlades(c: Ctx, i: number, seed: number, count: number, dark: string, tip?: string) {
  let s = (seed * 2654435761) >>> 0;
  for (let n = 0; n < count; n++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const x = 1 + (s % 30);
    s = (s * 1664525 + 1013904223) >>> 0;
    const y = 1 + (s % 28);
    blade(c, i, x, y, dark, tip);
  }
}

function paintGrassDarkDecorations(c: Ctx, i: number) {
  // Two blade layers — dense darker shadows, sparser bright tips.
  // ~28 blades × 2px each = ~56px shadow blades, plus ~10 tip-bladed
  // ones on top. Reads as grass texture, not random pixel noise.
  scatterBlades(c, i, 0xA1, 28, GRASS_BLADE_DRK);
  scatterBlades(c, i, 0xB2, 16, GRASS_BLADE_MID);
  scatterBlades(c, i, 0xD4, 8,  GRASS_BLADE_MID, GRASS_HIGHLIGHT);

  // Authored tufts — small directional clumps that read as deliberate
  // grass clusters rather than random scatter.
  // Cluster 1 — upper-left
  px(c,i,4,3,GRASS_BLADE_DRK); px(c,i,5,3,GRASS_BLADE_DRK);
  px(c,i,4,2,GRASS_BLADE_MID); px(c,i,5,2,GRASS_HIGHLIGHT);
  // Cluster 2 — upper-right
  px(c,i,23,5,GRASS_BLADE_DRK); px(c,i,24,5,GRASS_BLADE_DRK); px(c,i,25,5,GRASS_BLADE_DRK);
  px(c,i,23,4,GRASS_BLADE_MID); px(c,i,24,4,GRASS_HIGHLIGHT); px(c,i,25,4,GRASS_BLADE_MID);
  // Cluster 3 — middle
  px(c,i,14,15,GRASS_BLADE_DRK); px(c,i,15,15,GRASS_BLADE_DRK); px(c,i,16,15,GRASS_BLADE_DRK);
  px(c,i,15,14,GRASS_HIGHLIGHT);
  // Cluster 4 — lower
  px(c,i,7,25,GRASS_BLADE_DRK); px(c,i,8,25,GRASS_BLADE_DRK);
  px(c,i,7,24,GRASS_BLADE_MID); px(c,i,8,24,GRASS_HIGHLIGHT);

  // (Wildflowers intentionally omitted — they used to be hard-coded
  // here, which made the same flower appear at the same tile-relative
  // offset in every cell that used GRASS_DARK. Flowers are now scattered
  // across GRASS_VAR_A/B/C at varied positions; TILE_VARIANT_POOL mixes
  // those variants in deterministically per-cell, breaking the grid.)
}

/** GRASS_LIGHT shares the dark base + palette but with a different
 *  seed offset and different authored clusters so adjacent tiles don't
 *  alternate as a visible repeat pattern. */
function paintGrassLightDecorations(c: Ctx, i: number) {
  scatterBlades(c, i, 0xE5, 28, GRASS_BLADE_DRK);
  scatterBlades(c, i, 0xF6, 16, GRASS_BLADE_MID);
  scatterBlades(c, i, 0x18, 8,  GRASS_BLADE_MID, GRASS_HIGHLIGHT);

  // Cluster 1 — upper-mid
  px(c,i,9,4,GRASS_BLADE_DRK); px(c,i,10,4,GRASS_BLADE_DRK); px(c,i,11,4,GRASS_BLADE_DRK);
  px(c,i,10,3,GRASS_HIGHLIGHT);
  // Cluster 2 — right edge
  px(c,i,27,11,GRASS_BLADE_DRK); px(c,i,28,11,GRASS_BLADE_DRK);
  px(c,i,27,10,GRASS_BLADE_MID); px(c,i,28,10,GRASS_HIGHLIGHT);
  // Cluster 3 — center-low
  px(c,i,17,18,GRASS_BLADE_DRK); px(c,i,18,18,GRASS_BLADE_DRK);
  px(c,i,17,17,GRASS_BLADE_MID); px(c,i,18,17,GRASS_HIGHLIGHT);
  // Cluster 4 — lower-left
  px(c,i,4,27,GRASS_BLADE_DRK); px(c,i,5,27,GRASS_BLADE_DRK); px(c,i,6,27,GRASS_BLADE_DRK);
  px(c,i,5,26,GRASS_HIGHLIGHT);

  // (Wildflowers moved to GRASS_VAR_A/B/C — see paintGrassDarkDecorations.)
}

// Variant wildflower palette — same cream + warm pink as before.
const FLOWER_CREAM = '#fff8e8';
const FLOWER_PINK  = '#f098b0';

/** GRASS_VAR_A — different blade seeds, clusters drifted off the
 *  GRASS_DARK/LIGHT positions, and 2 wildflowers placed in the upper
 *  half of the tile. Together with the other variants, applyTileVariants
 *  picks one of {GRASS_DARK, GRASS_VAR_A, GRASS_VAR_B} per cell so
 *  flowers never sit at the same tile-relative offset twice in a row. */
function paintGrassVarADecorations(c: Ctx, i: number) {
  scatterBlades(c, i, 0x2C, 28, GRASS_BLADE_DRK);
  scatterBlades(c, i, 0x3D, 16, GRASS_BLADE_MID);
  scatterBlades(c, i, 0x4E, 8,  GRASS_BLADE_MID, GRASS_HIGHLIGHT);

  // Cluster 1 — upper edge, slightly right of center
  px(c,i,18,2,GRASS_BLADE_DRK); px(c,i,19,2,GRASS_BLADE_DRK); px(c,i,20,2,GRASS_BLADE_DRK);
  px(c,i,19,1,GRASS_HIGHLIGHT);
  // Cluster 2 — left side, mid
  px(c,i,2,12,GRASS_BLADE_DRK); px(c,i,3,12,GRASS_BLADE_DRK);
  px(c,i,2,11,GRASS_BLADE_MID); px(c,i,3,11,GRASS_HIGHLIGHT);
  // Cluster 3 — center-right, lower-mid
  px(c,i,21,17,GRASS_BLADE_DRK); px(c,i,22,17,GRASS_BLADE_DRK); px(c,i,23,17,GRASS_BLADE_DRK);
  px(c,i,22,16,GRASS_BLADE_MID); px(c,i,23,16,GRASS_HIGHLIGHT);
  // Cluster 4 — bottom edge
  px(c,i,11,28,GRASS_BLADE_DRK); px(c,i,12,28,GRASS_BLADE_DRK);
  px(c,i,12,27,GRASS_HIGHLIGHT);

  // Wildflowers — upper half, distinct positions from VAR_B/VAR_C.
  px(c,i,6,4,FLOWER_CREAM); px(c,i,26,9,FLOWER_PINK);
}

/** GRASS_VAR_B — third seed set, clusters in different cells than
 *  GRASS_DARK/LIGHT/VAR_A, and wildflowers placed in the lower half. */
function paintGrassVarBDecorations(c: Ctx, i: number) {
  scatterBlades(c, i, 0x5F, 28, GRASS_BLADE_DRK);
  scatterBlades(c, i, 0x71, 16, GRASS_BLADE_MID);
  scatterBlades(c, i, 0x82, 8,  GRASS_BLADE_MID, GRASS_HIGHLIGHT);

  // Cluster 1 — top-right corner
  px(c,i,26,3,GRASS_BLADE_DRK); px(c,i,27,3,GRASS_BLADE_DRK);
  px(c,i,26,2,GRASS_BLADE_MID); px(c,i,27,2,GRASS_HIGHLIGHT);
  // Cluster 2 — center-left
  px(c,i,8,13,GRASS_BLADE_DRK); px(c,i,9,13,GRASS_BLADE_DRK); px(c,i,10,13,GRASS_BLADE_DRK);
  px(c,i,9,12,GRASS_HIGHLIGHT);
  // Cluster 3 — right edge, lower
  px(c,i,28,21,GRASS_BLADE_DRK); px(c,i,29,21,GRASS_BLADE_DRK);
  px(c,i,28,20,GRASS_BLADE_MID); px(c,i,29,20,GRASS_HIGHLIGHT);
  // Cluster 4 — lower-center
  px(c,i,15,26,GRASS_BLADE_DRK); px(c,i,16,26,GRASS_BLADE_DRK); px(c,i,17,26,GRASS_BLADE_DRK);
  px(c,i,16,25,GRASS_BLADE_MID); px(c,i,17,25,GRASS_HIGHLIGHT);

  // Wildflowers — lower half, different cells from VAR_A/VAR_C.
  px(c,i,10,22,FLOWER_PINK); px(c,i,24,28,FLOWER_CREAM);
}

/** GRASS_VAR_C — fourth seed set, clusters offset diagonally, and a
 *  single wildflower in the dead center (somewhere neither VAR_A nor
 *  VAR_B place one). */
function paintGrassVarCDecorations(c: Ctx, i: number) {
  scatterBlades(c, i, 0x93, 28, GRASS_BLADE_DRK);
  scatterBlades(c, i, 0xA5, 16, GRASS_BLADE_MID);
  scatterBlades(c, i, 0xB7, 8,  GRASS_BLADE_MID, GRASS_HIGHLIGHT);

  // Cluster 1 — far left, mid-upper
  px(c,i,1,7,GRASS_BLADE_DRK); px(c,i,2,7,GRASS_BLADE_DRK);
  px(c,i,1,6,GRASS_BLADE_MID); px(c,i,2,6,GRASS_HIGHLIGHT);
  // Cluster 2 — upper-mid right
  px(c,i,20,9,GRASS_BLADE_DRK); px(c,i,21,9,GRASS_BLADE_DRK);
  px(c,i,21,8,GRASS_HIGHLIGHT);
  // Cluster 3 — lower-left
  px(c,i,3,21,GRASS_BLADE_DRK); px(c,i,4,21,GRASS_BLADE_DRK); px(c,i,5,21,GRASS_BLADE_DRK);
  px(c,i,4,20,GRASS_BLADE_MID); px(c,i,5,20,GRASS_HIGHLIGHT);
  // Cluster 4 — far right, mid
  px(c,i,28,15,GRASS_BLADE_DRK); px(c,i,29,15,GRASS_BLADE_DRK);
  px(c,i,28,14,GRASS_BLADE_MID); px(c,i,29,14,GRASS_HIGHLIGHT);

  // Single wildflower near center — neither VAR_A nor VAR_B touches
  // this cell, so packs of three variants always show three different
  // flower positions side-by-side instead of a repeating pair.
  px(c,i,14,14,FLOWER_CREAM);
}

function drawPath(c: Ctx, i: number) {
  // Worn dirt path — warm tan base, embedded organic stones, cart tracks
  // Ramp: shadow #704818, mid-dark #9c6028, mid #cc8838, highlight #f0b860
  fill(c, i, '#cc8838');

  // Worn center slightly lighter (foot traffic)
  blk(c,i,8,8,16,16,'#d49040');

  // === EMBEDDED STONES (3-4 organic ovals, highlight top-left, shadow bottom-right) ===
  // Stone 1 — irregular 6x4 blob, upper-left
  blk(c,i,3,5,5,3,'#a89878'); px(c,i,4,4,'#a89878'); px(c,i,6,7,'#a89878');
  px(c,i,3,5,'#d4c098'); px(c,i,4,5,'#d4c098'); px(c,i,5,5,'#a89878');  // highlight top-left
  px(c,i,6,7,'#4a4038'); px(c,i,7,6,'#4a4038'); px(c,i,7,5,'#7c6a58');   // shadow bottom-right
  px(c,i,4,6,'#7c6a58');  // interior texture

  // Stone 2 — irregular 5x3, upper-right
  blk(c,i,22,3,4,3,'#7c6a58'); px(c,i,23,2,'#7c6a58'); px(c,i,25,5,'#7c6a58');
  px(c,i,22,3,'#d4c098'); px(c,i,23,3,'#d4c098'); px(c,i,23,2,'#a89878');  // highlight
  px(c,i,25,5,'#4a4038'); px(c,i,24,5,'#4a4038');  // shadow

  // Stone 3 — irregular 5x4, center-right
  blk(c,i,20,16,5,3,'#a89878'); px(c,i,21,15,'#a89878'); px(c,i,23,18,'#a89878');
  px(c,i,20,16,'#d4c098'); px(c,i,21,16,'#d4c098'); px(c,i,21,15,'#d4c098');  // highlight
  px(c,i,24,18,'#4a4038'); px(c,i,23,18,'#4a4038'); px(c,i,24,17,'#7c6a58');  // shadow
  px(c,i,22,17,'#7c6a58');  // texture

  // Stone 4 — small 3x3, lower-left
  blk(c,i,5,24,3,2,'#7c6a58'); px(c,i,6,23,'#7c6a58');
  px(c,i,5,24,'#d4c098'); px(c,i,6,23,'#a89878');  // highlight
  px(c,i,7,25,'#4a4038');  // shadow

  // === SCATTERED PEBBLES (single dark-brown pixels) ===
  px(c,i,14,8,'#704818'); px(c,i,28,12,'#704818'); px(c,i,10,20,'#704818');

  // === CART TRACKS (two faint parallel lines using shadow color, dashed) ===
  for (let y = 0; y < S; y += 3) {
    px(c,i,11,y,'#9c6028'); px(c,i,20,y,'#9c6028');
  }

  // === HIGHLIGHT DUST (worn dusty patches) ===
  px(c,i,16,10,'#f0b860'); px(c,i,12,22,'#f0b860'); px(c,i,26,28,'#f0b860');
  px(c,i,2,14,'#f0b860');
}

function drawWallStone(c: Ctx, i: number) {
  // Stone wall — mortar grid FIRST, then fill bricks (Slynyrd method)
  // Stone ramp: shadow #4a4038, mid-dark #7c6a58, mid #a89878, highlight #d4c098

  // Step 1: fill entire tile with MORTAR color
  fill(c, i, '#4a4038');

  // Step 2: fill bricks within grid (15px wide x 7px tall, offset rows)
  // Row 0 (y=0..6): bricks at x=0, x=16
  // Row 1 (y=8..14): bricks offset by 8, at x=8, x=24
  // Row 2 (y=16..22): same as row 0
  // Row 3 (y=24..30): same as row 1
  // Each brick: 15w x 7h, offset rows shift by 8px
  for (let r = 0; r < 4; r++) {
    const by = r * 8;
    const xOff = r % 2 === 0 ? 0 : 8;

    for (let col = -1; col < 3; col++) {
      const bx = xOff + col * 16;
      const cx = Math.max(0, bx);
      const cw = Math.min(15, S - cx);
      if (cw <= 0 || cx >= S) continue;

      // Slight color variation per brick
      const variants = ['#a89878','#a09078','#a89878','#a49474'];
      const brickCol = variants[(r * 3 + col) & 3];

      // Brick body
      blk(c,i,cx,by,cw,7,brickCol);
      // Top edge highlight
      blk(c,i,cx,by,cw,1,'#d4c098');
      // Bottom edge shadow
      blk(c,i,cx,by+6,cw,1,'#7c6a58');
      // Left highlight edge
      px(c,i,cx,by+1,'#d4c098'); px(c,i,cx,by+2,'#d4c098');
      // Right shadow edge
      px(c,i,cx+cw-1,by+4,'#7c6a58'); px(c,i,cx+cw-1,by+5,'#7c6a58');

      // Surface scratch (1 darker pixel per brick)
      px(c,i,cx+3+((r+col)%4),by+3,'#4a4038');
      // Micro-texture pixel
      px(c,i,cx+6+((r+col)%3),by+2,'#7c6a58');
    }
  }

  // Step 3: top wall edge — much brighter for depth
  blk(c,i,0,0,S,1,'#d4c098');
  px(c,i,8,0,'#e8d4ac'); px(c,i,20,0,'#e8d4ac');

  // Step 4: moss pixel on shadow side of 1 brick
  px(c,i,14,6,'#1a6818'); px(c,i,15,6,'#288818');

  // Cracked/discolored brick (prevents visual fatigue)
  px(c,i,4,18,'#7c6a58'); px(c,i,5,18,'#7c6a58'); px(c,i,5,19,'#4a4038');
}

function drawWallWood(c: Ctx, i: number) {
  // Wooden wall — 4 vertical planks (~7px wide + 1px gap)
  // Wood ramp: shadow #2c1808, mid-dark #4a2c10, mid #7a4818, highlight #c08838
  fill(c, i, '#2c1808');  // gaps are darkest shadow

  // 4 planks, each ~7px wide with 1px gap between
  const plankX = [0, 8, 16, 24];
  const plankW = [7, 7, 7, 8]; // last plank fills to edge
  const plankHue = ['#7a4818','#7c5a32','#785630','#7e5c34']; // slight hue variation per plank

  for (let n = 0; n < 4; n++) {
    const pxStart = plankX[n];
    const pw = plankW[n];

    // Plank body
    blk(c,i,pxStart,0,pw,S,plankHue[n]);

    // Left edge highlight
    blk(c,i,pxStart,0,1,S,'#c08838');

    // Right edge shadow
    blk(c,i,pxStart+pw-1,0,1,S,'#4a2c10');

    // Wood grain — 2-3 slightly wavy lines per plank (individual px for waviness)
    const g1 = 5 + n * 2;
    const g2 = 14 + n;
    const g3 = 24 - n;
    // Grain line 1 (wavy)
    px(c,i,pxStart+1,g1,'#4a2c10'); px(c,i,pxStart+2,g1,'#4a2c10');
    px(c,i,pxStart+3,g1+1,'#4a2c10'); px(c,i,pxStart+4,g1+1,'#4a2c10');
    px(c,i,pxStart+5,g1,'#4a2c10');
    // Grain line 2 (wavy)
    px(c,i,pxStart+1,g2,'#4a2c10'); px(c,i,pxStart+2,g2+1,'#4a2c10');
    px(c,i,pxStart+3,g2+1,'#4a2c10'); px(c,i,pxStart+4,g2,'#4a2c10');
    px(c,i,pxStart+5,g2,'#4a2c10');
    // Grain line 3 (wavy)
    px(c,i,pxStart+2,g3,'#4a2c10'); px(c,i,pxStart+3,g3,'#4a2c10');
    px(c,i,pxStart+4,g3+1,'#4a2c10'); px(c,i,pxStart+5,g3+1,'#4a2c10');
  }

  // Knot hole on plank 1 (dark circle 3px with ring)
  px(c,i,3,12,'#2c1808'); px(c,i,4,12,'#2c1808'); px(c,i,5,12,'#2c1808');
  px(c,i,3,13,'#2c1808'); px(c,i,4,13,'#1a1008'); px(c,i,5,13,'#2c1808');
  px(c,i,3,14,'#2c1808'); px(c,i,4,14,'#2c1808'); px(c,i,5,14,'#2c1808');
  // Ring around knot (concentric grain lines)
  px(c,i,2,11,'#4a2c10'); px(c,i,6,11,'#4a2c10');
  px(c,i,2,15,'#4a2c10'); px(c,i,6,15,'#4a2c10');

  // Nail head (bright metallic #e8dcb8 with shadow #604838 below)
  px(c,i,20,8,'#e8dcb8'); px(c,i,20,9,'#604838');
}

function drawDoor(c: Ctx, i: number) {
  // Building door — dark frame, two wood panels, iron band, handle
  // Wood ramp for door: #2c1808, #4a2c10, #7a4818, #c08838
  fill(c,i,'#1a1008');  // dark recess behind door

  // Dark frame border (2px top and sides)
  blk(c,i,0,0,S,2,'#4a2c10');  // top frame
  blk(c,i,0,0,3,S,'#4a2c10');  // left frame
  blk(c,i,S-3,0,3,S,'#4a2c10');  // right frame
  // Frame highlight (top-left lit)
  blk(c,i,0,0,S,1,'#c08838');
  blk(c,i,0,0,1,S,'#7a4818');
  // Frame shadow (bottom-right)
  blk(c,i,S-1,0,1,S,'#2c1808');

  // Left door panel
  blk(c,i,3,2,12,S-5,'#4a2c10');
  blk(c,i,4,3,10,S-8,'#7a4818');
  // Right door panel
  blk(c,i,17,2,12,S-5,'#4a2c10');
  blk(c,i,18,3,10,S-8,'#7a4818');

  // Subtle wood grain on panels (horizontal lines)
  for (let y = 5; y < S-5; y += 4) {
    blk(c,i,4,y,10,1,'#4a2c10'); blk(c,i,18,y,10,1,'#4a2c10');
  }

  // Center divider between panels
  blk(c,i,15,2,2,S-5,'#2c1808');

  // Iron band across middle (3px tall, metallic)
  blk(c,i,3,14,S-6,3,'#808088');
  blk(c,i,3,14,S-6,1,'#a0a0a8');  // band highlight
  blk(c,i,3,16,S-6,1,'#505058');  // band shadow
  // Rivets
  px(c,i,8,15,'#a0a0a8'); px(c,i,16,15,'#a0a0a8'); px(c,i,23,15,'#a0a0a8');

  // Handle (bright metallic dot)
  px(c,i,22,20,'#e8dcb8');
  px(c,i,21,20,'#808088'); px(c,i,23,20,'#808088');
  px(c,i,22,19,'#808088'); px(c,i,22,21,'#505058');

  // Threshold at bottom (stone ramp, worn)
  blk(c,i,3,S-3,S-6,3,'#a89878');
  blk(c,i,3,S-3,S-6,1,'#d4c098');  // highlight
  blk(c,i,3,S-1,S-6,1,'#7c6a58');  // shadow
  // Worn marks
  px(c,i,10,S-2,'#7c6a58'); px(c,i,18,S-2,'#7c6a58');
}

function drawFloorWood(c: Ctx, i: number) {
  // Interior wood floor — offset plank pattern, COOLER tones than outdoor wood
  // Indoor wood ramp (cooler): #382820, #584838, #6a5848, #887868
  fill(c, i, '#584838');  // mortar/gap color

  // Offset brick/plank pattern (each 7px x 3px)
  for (let row = 0; row < 8; row++) {
    const by = row * 4;
    const off = row % 2 === 0 ? 0 : 4;

    // Mortar line
    blk(c,i,0,by+3,S,1,'#382820');

    for (let col = -1; col < 5; col++) {
      const bx = off + col * 8;
      if (bx >= S) break;
      const cx = Math.max(0, bx);
      const cw = Math.min(7, S - cx);
      if (cw <= 0) continue;

      // Per-brick micro-variation (alternate two mid-tones)
      const brickCol = (row + col) % 2 === 0 ? '#6a5848' : '#6e5c4c';
      blk(c,i,cx,by,cw,3,brickCol);

      // Top edge highlight
      blk(c,i,cx,by,cw,1,'#887868');

      // Micro-texture (1 pixel per brick)
      px(c,i,cx+2,by+1,(row+col)%2===0?'#887868':'#584838');

      // Vertical mortar
      if (bx > 0 && bx < S) blk(c,i,bx,by,1,3,'#382820');
    }
  }

  // Worn center area (slightly lighter bricks)
  px(c,i,14,14,'#887868'); px(c,i,16,16,'#887868'); px(c,i,15,15,'#887868');

  // Crack in one brick
  px(c,i,6,6,'#382820'); px(c,i,7,5,'#382820');
}

function drawFloorStone(c: Ctx, i: number) {
  // Interior stone floor — larger blocks (9x3), cool blue-shifted grey
  // Cool ramp: shadow #585868, mid #787880, highlight #909098
  fill(c, i, '#585868');  // mortar color first

  // Larger blocks: 9px wide x 7px tall, offset rows
  for (let row = 0; row < 4; row++) {
    const by = row * 8;
    const off = row % 2 === 0 ? 0 : 5;

    for (let col = -1; col < 4; col++) {
      const bx = off + col * 10;
      if (bx >= S) break;
      const cx = Math.max(0, bx);
      const cw = Math.min(9, S - cx);
      if (cw <= 0) continue;

      // Per-block color variation
      const variants = ['#787880','#7a7a82','#76767e','#7c7c84'];
      const blockCol = variants[(row + col) & 3];
      blk(c,i,cx,by,cw,7,blockCol);

      // Highlight top + left
      blk(c,i,cx,by,cw,1,'#909098');
      px(c,i,cx,by+1,'#909098');

      // Shadow bottom + right
      blk(c,i,cx,by+6,cw,1,'#585868');
      px(c,i,cx+cw-1,by+5,'#585868');

      // Surface wear: 1 lighter pixel where block is polished
      px(c,i,cx+3+((row+col)%3),by+3,'#909098');
    }
  }

  // Polished wear marks in center (2-3 lighter pixels)
  px(c,i,15,12,'#909098'); px(c,i,17,20,'#909098'); px(c,i,13,18,'#909098');
}

function drawRoof(c: Ctx, i: number) {
  // Overlapping shingle rows (each row 3px tall, offset by 4px)
  // Warm red ramp: #80200c shadow, #a8341c mid-dark, #c44820 mid, #dc5c30 highlight
  fill(c,i,'#a8341c');

  // Shingle rows — overlapping, each 3px tall with 1px shadow gap
  for (let r = 0; r < 8; r++) {
    const ry = r * 4;
    const off = r % 2 === 0 ? 0 : 8;

    // Shadow line under shingle overlap
    if (ry > 0) blk(c,i,0,ry-1,S,1,'#80200c');

    for (let cl = -1; cl < 3; cl++) {
      const tx = off + cl * 16;
      const tx0 = Math.max(0, tx);
      const tw = Math.min(15, S - tx0);
      if (tw <= 0) continue;

      // Shingle body
      blk(c,i,tx0,ry,tw,3,'#c44820');

      // Highlight on top-left of each shingle
      px(c,i,tx0,ry,'#dc5c30'); px(c,i,tx0+1,ry,'#dc5c30');

      // Shadow on bottom-right
      px(c,i,tx0+tw-1,ry+2,'#80200c'); px(c,i,tx0+tw-2,ry+2,'#a8341c');
    }
  }

  // Ridge line at top
  blk(c,i,0,0,S,1,'#dc5c30');
  px(c,i,6,0,'#d07060'); px(c,i,18,0,'#d07060'); px(c,i,28,0,'#d07060');
}

function drawRoofEdge(c: Ctx, i: number) {
  // Roof-to-wall transition: shingles top, shadow overhang, wall bottom
  fill(c,i,'#4a4038');  // mortar base for wall section

  // === TOP HALF: shingle pattern (matching ROOF) ===
  for (let r = 0; r < 3; r++) {
    const ry = r * 4;
    const off = r % 2 === 0 ? 0 : 8;
    if (r > 0) blk(c,i,0,ry-1,S,1,'#80200c');
    for (let cl = -1; cl < 3; cl++) {
      const tx = off + cl * 16;
      const tx0 = Math.max(0, tx);
      const tw = Math.min(15, S - tx0);
      if (tw <= 0) continue;
      blk(c,i,tx0,ry,tw,3,'#c44820');
      px(c,i,tx0,ry,'#dc5c30'); px(c,i,tx0+1,ry,'#dc5c30');
      px(c,i,tx0+tw-1,ry+2,'#80200c');
    }
  }

  // === SHADOW OVERHANG (3px dark strip) ===
  blk(c,i,0,12,S,3,'#322125');

  // === GUTTER (thin metallic line) ===
  blk(c,i,0,15,S,1,'#808088');
  px(c,i,8,15,'#a0a0a8'); px(c,i,22,15,'#a0a0a8');  // shine spots

  // === BOTTOM HALF: wall (matching WALL_STONE) ===
  for (let col = -1; col < 3; col++) {
    const bx = col * 16;
    const cx = Math.max(0, bx);
    const cw = Math.min(15, S - cx);
    if (cw <= 0) continue;
    blk(c,i,cx,16,cw,7,'#a89878');
    blk(c,i,cx,16,cw,1,'#d4c098');
    blk(c,i,cx,22,cw,1,'#7c6a58');
  }
  blk(c,i,0,23,S,1,'#4a4038');  // mortar
  for (let col = -1; col < 3; col++) {
    const bx = 8 + col * 16;
    const cx = Math.max(0, bx);
    const cw = Math.min(15, S - cx);
    if (cw <= 0) continue;
    blk(c,i,cx,24,cw,7,'#a09078');
    blk(c,i,cx,24,cw,1,'#d4c098');
    blk(c,i,cx,30,cw,1,'#7c6a58');
  }
  blk(c,i,0,31,S,1,'#4a4038');
}

function drawShadow(c: Ctx, i: number) {
  // Building shadow on grass — NOT flat, gradient with grass showing through
  // Top = very dark, bottom = almost matching grass

  // === 4-band gradient (8px each) ===
  blk(c,i,0,0,S,8,'#1a2810');   // very dark green-brown
  blk(c,i,0,8,S,8,'#2a3818');   // dark
  blk(c,i,0,16,S,8,'#3a4828');  // medium-dark
  blk(c,i,0,24,S,8,'#408020');  // slightly dark, almost grass

  // === Grass texture visible through shadow (scattered highlight pixels) ===
  // These read as blades poking through darkness
  px(c,i,5,6,'#1a6818'); px(c,i,5,5,'#288818');    // darkened tuft in band 1
  px(c,i,20,10,'#288818'); px(c,i,20,9,'#3ca41c');  // tuft in band 2
  px(c,i,12,18,'#3ca41c'); px(c,i,12,17,'#84d040'); // tuft in band 3
  px(c,i,26,26,'#3ca41c'); px(c,i,26,25,'#84d040'); // tuft in band 4
  px(c,i,8,28,'#84d040');   // bright blade tip nearly at normal
  px(c,i,18,30,'#3ca41c');  // grass showing at bottom
}

function drawBush(c: Ctx, i: number) {
  // Bush — organic oval, 4-shade green, leaf clusters on top, berries
  // Background: grass (matching GRASS_DARK)
  fill(c,i,'#3ca41c');

  // Ground shadow at base (dark strip, 2px tall)
  blk(c,i,7,27,18,2,'#1a6818');
  blk(c,i,9,29,14,2,'#1a6818');

  // === BUSH BODY: organic oval (NOT perfectly round) ===
  // Build oval from concentric-ish zones: darkest bottom-right, lightest top-left
  // Core mass
  blk(c,i,8,8,16,16,'#288818');   // mid base
  blk(c,i,6,10,20,12,'#288818');  // wider mid section
  blk(c,i,10,6,12,20,'#288818');  // taller mid section
  // Round off corners with single pixels
  px(c,i,7,9,'#288818'); px(c,i,24,9,'#288818');
  px(c,i,7,22,'#288818'); px(c,i,24,22,'#288818');

  // Dark zone (bottom-right quadrant)
  blk(c,i,16,16,8,8,'#1a6818'); blk(c,i,18,14,6,4,'#1a6818');
  blk(c,i,14,20,4,6,'#1a6818');

  // Light zone (top-left quadrant)
  blk(c,i,8,8,8,6,'#3ca41c'); blk(c,i,10,6,6,4,'#84d040');

  // === LEAF CLUSTERS on top (3-5px each, brighter) ===
  // Cluster 1 — top-left highlight
  px(c,i,10,6,'#84d040'); px(c,i,11,5,'#84d040'); px(c,i,12,5,'#84d040');
  px(c,i,11,6,'#84d040'); px(c,i,10,7,'#3ca41c');

  // Cluster 2 — top-right
  px(c,i,19,7,'#84d040'); px(c,i,20,6,'#84d040'); px(c,i,21,7,'#3ca41c');
  px(c,i,20,7,'#84d040');

  // Cluster 3 — left side
  px(c,i,6,14,'#3ca41c'); px(c,i,7,13,'#3ca41c'); px(c,i,7,14,'#288818');

  // === BERRY DOTS (2-3 small red/orange pixels) ===
  px(c,i,13,10,'#e02828'); px(c,i,22,14,'#e02828'); px(c,i,10,18,'#f04830');

  // === DEPTH PIXELS inside bush (darkest) ===
  px(c,i,15,15,'#0c5008'); px(c,i,18,18,'#0c5008'); px(c,i,12,20,'#0c5008');
}

function drawFence(c: Ctx, i: number) {
  // Fence — grass background, vertical wood post, cross-beam, shadow
  // Wood ramp: #2c1808, #4a2c10, #7a4818, #c08838
  fill(c,i,'#3ca41c');  // grass background

  // Shadow to the right of post (2px strip, dark)
  blk(c,i,18,6,2,20,'#1a6818');

  // === VERTICAL POST: 4px wide, 20px tall ===
  const pX = 14;
  blk(c,i,pX,4,4,20,'#7a4818');
  // Left highlight
  blk(c,i,pX,4,1,20,'#c08838');
  // Right shadow
  blk(c,i,pX+3,4,1,20,'#4a2c10');
  // Wood grain (wavy individual pixels)
  px(c,i,pX+1,8,'#4a2c10'); px(c,i,pX+2,9,'#4a2c10');
  px(c,i,pX+1,14,'#4a2c10'); px(c,i,pX+2,15,'#4a2c10');
  px(c,i,pX+1,20,'#4a2c10'); px(c,i,pX+2,21,'#4a2c10');

  // Post top (pointed — single pixel tip)
  blk(c,i,pX,3,4,1,'#c08838');
  blk(c,i,pX+1,2,2,1,'#c08838');
  px(c,i,pX+1,1,'#c08838'); px(c,i,pX+2,1,'#c08838');

  // === CROSS-BEAM: 3px tall, extends full width ===
  blk(c,i,0,12,pX,3,'#7a4818');
  blk(c,i,pX+4,12,S-pX-4,3,'#7a4818');
  // Beam top highlight
  blk(c,i,0,12,pX,1,'#c08838'); blk(c,i,pX+4,12,S-pX-4,1,'#c08838');
  // Beam bottom shadow
  blk(c,i,0,14,pX,1,'#4a2c10'); blk(c,i,pX+4,14,S-pX-4,1,'#4a2c10');

  // Nail detail (bright metallic pixel)
  px(c,i,pX,13,'#e8dcb8'); px(c,i,pX+3,13,'#e8dcb8');
}

function drawPathEdge(c: Ctx, i: number) {
  // Grass-to-path transition — NO dithering (pros avoid it)
  // Top: grass, Bottom: path, Middle: organic irregular edge

  // === TOP PORTION: grass (matching GRASS_DARK) ===
  blk(c,i,0,0,S,14,'#3ca41c');
  // Grass cluster in top half
  px(c,i,6,4,'#1a6818'); px(c,i,7,3,'#288818'); px(c,i,7,2,'#84d040');
  px(c,i,20,6,'#1a6818'); px(c,i,21,5,'#288818'); px(c,i,21,4,'#84d040');
  // Flower
  px(c,i,14,3,'#fff8e8');

  // === BOTTOM PORTION: path (matching PATH) ===
  blk(c,i,0,18,S,14,'#cc8838');
  // Pebble in path area
  px(c,i,10,24,'#704818'); px(c,i,22,20,'#704818');
  // Highlight dust
  px(c,i,16,26,'#f0b860');

  // === TRANSITION ZONE (y=14 to y=17): organic irregular edge ===
  // NOT dithered — instead, grass pixels extend into path, path into grass
  // Like a natural shoreline
  const edgeLine = [15,14,14,15,16,15,14,13,14,15,16,16,15,14,15,16,17,16,15,14,14,15,16,15,14,15,16,16,15,14,14,15];
  for (let x = 0; x < S; x++) {
    const ey = edgeLine[x];
    // Everything above ey = grass
    if (ey > 14) blk(c,i,x,14,1,ey-14,'#3ca41c');
    // Everything below ey = path
    if (ey < 18) blk(c,i,x,ey,1,18-ey,'#cc8838');
    // Dark shadow at exact edge (grass overhanging)
    px(c,i,x,ey,'#1a6818');
  }
  // Grass blades poking over into path
  px(c,i,7,15,'#3ca41c'); px(c,i,8,16,'#84d040');
  px(c,i,19,16,'#3ca41c'); px(c,i,20,17,'#84d040');
  px(c,i,29,15,'#3ca41c');
}

function drawWell(c: Ctx, i: number) {
  // Village well — grass background, stone ring (~16px diameter), dark water inside
  // Stone ramp: #4a4038, #7c6a58, #a89878, #d4c098
  fill(c,i,'#3ca41c');  // grass background

  // === STONE RING (oval, using stone ramp) ===
  // Outer ring (~16px diameter)
  for (let y = 8; y < 26; y++) {
    for (let x = 8; x < 24; x++) {
      const dx = (x - 16) / 8, dy = (y - 16) / 8;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;

      // Inner water circle (~8px diameter)
      const idx = (x - 16) / 5, idy = (y - 16) / 5;
      const id2 = idx * idx + idy * idy;

      if (id2 <= 1) {
        // === DARK WATER inside ring (deep shades only) ===
        px(c,i,x,y, id2 < 0.4 ? '#103880' : '#2a68d0');
      } else {
        // === STONE RING with per-stone lighting ===
        // Top-left = highlight, bottom-right = shadow
        if (y < 14) px(c,i,x,y,'#d4c098');      // top highlight
        else if (y < 18) px(c,i,x,y,'#a89878');  // mid
        else px(c,i,x,y,'#7c6a58');                // bottom shadow
      }
    }
  }

  // Stone texture on ring (per-stone highlight/shadow marks)
  px(c,i,10,10,'#d4c098'); px(c,i,14,8,'#d4c098'); px(c,i,18,8,'#d4c098');
  px(c,i,22,12,'#4a4038'); px(c,i,22,16,'#4a4038'); px(c,i,20,22,'#4a4038');
  px(c,i,12,22,'#4a4038');

  // Bright highlight on top-left of ring edge
  px(c,i,10,9,'#e8d4ac'); px(c,i,12,8,'#e8d4ac');

  // Water shimmer highlight inside
  px(c,i,15,14,'#508cd8');
}

function drawWater(c: Ctx, i: number) {
  // Water — BLOB technique (interconnected blob shapes)
  // Ramp: deep #103880, mid #2a68d0, surface #508cd8, highlight #90c4f0
  fill(c,i,'#2a68d0');  // base mid-blue fill

  // === BLOB NETWORK: single-pixel deep-blue outlines forming interconnected blobs ===
  // Blob outlines use deep color. Inside blobs = lighter. Between lines = mid.
  // Blobs wrap across tile edges for seamless tiling.

  // Blob 1 — large, upper-left (wraps left and top edges)
  px(c,i,0,4,'#103880'); px(c,i,1,3,'#103880'); px(c,i,2,2,'#103880');
  px(c,i,3,2,'#103880'); px(c,i,4,3,'#103880'); px(c,i,5,4,'#103880');
  px(c,i,6,5,'#103880'); px(c,i,7,6,'#103880'); px(c,i,8,7,'#103880');
  px(c,i,8,8,'#103880'); px(c,i,7,9,'#103880'); px(c,i,6,10,'#103880');
  px(c,i,5,10,'#103880'); px(c,i,4,9,'#103880'); px(c,i,3,8,'#103880');
  px(c,i,2,7,'#103880'); px(c,i,1,6,'#103880'); px(c,i,0,5,'#103880');
  // Inside blob 1 = lighter
  blk(c,i,2,4,4,4,'#508cd8'); px(c,i,5,6,'#508cd8'); px(c,i,6,7,'#508cd8');

  // Blob 2 — mid-right area
  px(c,i,18,4,'#103880'); px(c,i,19,3,'#103880'); px(c,i,20,3,'#103880');
  px(c,i,21,3,'#103880'); px(c,i,22,4,'#103880'); px(c,i,23,5,'#103880');
  px(c,i,23,6,'#103880'); px(c,i,23,7,'#103880'); px(c,i,22,8,'#103880');
  px(c,i,21,9,'#103880'); px(c,i,20,9,'#103880'); px(c,i,19,8,'#103880');
  px(c,i,18,7,'#103880'); px(c,i,18,6,'#103880'); px(c,i,18,5,'#103880');
  // Inside blob 2 = lighter
  blk(c,i,19,5,3,3,'#508cd8');

  // Blob 3 — center-left (connects to blob 1 via branching line)
  px(c,i,6,10,'#103880'); px(c,i,7,11,'#103880'); px(c,i,8,12,'#103880');  // branch line
  px(c,i,9,13,'#103880'); px(c,i,10,14,'#103880'); px(c,i,11,14,'#103880');
  px(c,i,12,13,'#103880'); px(c,i,13,12,'#103880'); px(c,i,13,11,'#103880');
  px(c,i,12,10,'#103880'); px(c,i,11,10,'#103880'); px(c,i,10,11,'#103880');
  px(c,i,9,12,'#103880');
  // Inside blob 3
  px(c,i,10,12,'#508cd8'); px(c,i,11,12,'#508cd8'); px(c,i,11,11,'#508cd8');

  // Blob 4 — lower area (wraps bottom edge)
  px(c,i,12,22,'#103880'); px(c,i,13,21,'#103880'); px(c,i,14,20,'#103880');
  px(c,i,15,20,'#103880'); px(c,i,16,20,'#103880'); px(c,i,17,21,'#103880');
  px(c,i,18,22,'#103880'); px(c,i,19,23,'#103880'); px(c,i,19,24,'#103880');
  px(c,i,18,25,'#103880'); px(c,i,17,26,'#103880'); px(c,i,16,27,'#103880');
  px(c,i,15,27,'#103880'); px(c,i,14,26,'#103880'); px(c,i,13,25,'#103880');
  px(c,i,12,24,'#103880'); px(c,i,12,23,'#103880');
  // Inside blob 4
  blk(c,i,14,22,4,4,'#508cd8');

  // Blob 5 — right side (wraps right edge)
  px(c,i,26,14,'#103880'); px(c,i,27,13,'#103880'); px(c,i,28,13,'#103880');
  px(c,i,29,14,'#103880'); px(c,i,30,15,'#103880'); px(c,i,31,16,'#103880');
  px(c,i,31,17,'#103880'); px(c,i,30,18,'#103880'); px(c,i,29,19,'#103880');
  px(c,i,28,19,'#103880'); px(c,i,27,18,'#103880'); px(c,i,26,17,'#103880');
  px(c,i,26,16,'#103880'); px(c,i,26,15,'#103880');
  // Inside blob 5
  px(c,i,28,15,'#508cd8'); px(c,i,29,16,'#508cd8'); px(c,i,28,17,'#508cd8');

  // === SPARKLE HIGHLIGHTS (2-3 single bright pixels) ===
  px(c,i,4,5,'#90c4f0'); px(c,i,20,5,'#90c4f0'); px(c,i,16,24,'#90c4f0');

  // === DEPTH SHADOWS (1-2 single dark pixels) ===
  px(c,i,24,28,'#103880'); px(c,i,4,18,'#103880');
}

// ───────────────────────────────────────────────────────────────
// SHALLOW WATER — Water Charm passable, ankle-deep wading tile.
// Lighter and more translucent than TILE.WATER; two horizontal
// ripple lines suggest the player would be walking through it.
// ───────────────────────────────────────────────────────────────
function drawShallowWater(c: Ctx, i: number) {
  // Base fill — light teal/cyan.
  fill(c, i, '#4da0c0');

  // Subtle mottled variation so the tile reads as water, not flat paint.
  blk(c,i, 2, 4, 6, 3, '#4498b8');
  blk(c,i,18, 6, 6, 3, '#4498b8');
  blk(c,i, 6,18, 7, 3, '#4498b8');
  blk(c,i,22,22, 6, 3, '#4498b8');
  blk(c,i,10,26, 5, 2, '#4498b8');

  // Highlight speckle (reflected sky).
  blk(c,i, 4, 2, 3, 1, '#6ecae0');
  blk(c,i,20, 3, 3, 1, '#6ecae0');
  blk(c,i,12,14, 3, 1, '#6ecae0');
  blk(c,i,26,16, 3, 1, '#6ecae0');
  blk(c,i, 6,24, 3, 1, '#6ecae0');

  // Two horizontal wave ripple bands (wrap across tile so it tiles).
  // Upper band — dashed line at y=10.
  for (const x of [0, 1, 4, 5, 6, 10, 11, 14, 15, 20, 21, 22, 26, 27, 30, 31]) {
    px(c, i, x, 10, '#7fd8e8');
  }
  // Shadow below upper band for a bit of depth.
  for (const x of [1, 5, 11, 15, 21, 27]) {
    px(c, i, x, 11, '#3a85a0');
  }

  // Lower band — dashed line at y=21.
  for (const x of [2, 3, 7, 8, 12, 13, 17, 18, 19, 23, 24, 28, 29]) {
    px(c, i, x, 21, '#7fd8e8');
  }
  for (const x of [3, 8, 13, 18, 24, 29]) {
    px(c, i, x, 22, '#3a85a0');
  }

  // Edge hint — faint semi-transparent border so adjacent tiles read
  // as a water boundary.
  blk(c, i, 0, 0, S, 1, '#6ecae0');
  blk(c, i, 0, S - 1, S, 1, '#3a85a0');

  // Small sparkle highlights (fewer than deep water — flatter look).
  px(c, i, 8, 6, '#b0f0ff');
  px(c, i, 24, 14, '#b0f0ff');
  px(c, i, 14, 28, '#b0f0ff');
}

// ═══════════════════════════════════════════════════════════════
// FURNITURE TILES (16-31) — Pokemon interior quality
// ═══════════════════════════════════════════════════════════════

function drawBookshelf(c: Ctx, i: number) {
  // Rich wood bookshelf with individually detailed book spines
  // 4-shade wood ramp: #3a2010 -> #5a3820 -> #6a4828 -> #8a6840
  fill(c, i, '#5a3820');
  // Outer frame — dark wood with grain
  blk(c,i,0,0,S,S,'#4a3018');
  blk(c,i,1,0,1,S,'#6a4828'); // left frame inner edge highlight
  blk(c,i,S-2,0,1,S,'#3a2010'); // right frame inner shadow
  blk(c,i,0,0,S,1,'#8a6840'); // top highlight
  blk(c,i,0,S-1,S,1,'#3a2010'); // bottom shadow
  // Wood grain on frame sides
  px(c,i,0,5,'#4a3018'); px(c,i,0,12,'#3a2010'); px(c,i,0,20,'#4a3018');
  px(c,i,S-1,8,'#2a1808'); px(c,i,S-1,16,'#3a2010'); px(c,i,S-1,24,'#2a1808');

  // 3 shelves with books
  const shelfYs = [1, 11, 21]; // top of each shelf region
  for (let sh = 0; sh < 3; sh++) {
    const sy = shelfYs[sh] + 9; // shelf board Y
    // Shelf board with 3D effect
    blk(c,i,2,sy,S-4,2,'#6a4828');
    blk(c,i,2,sy,S-4,1,'#8a6840'); // board top highlight
    blk(c,i,2,sy+1,S-4,1,'#4a3018'); // board bottom shadow
    px(c,i,2,sy,'#9a7848'); // left corner shine

    // Books — each with unique color ramp (body, highlight, shadow, spine detail)
    const bookDefs: [number,string,string,string][] = [
      [3,'#b03030','#d04848','#801818'], // red book
      [2,'#3050a0','#4868c0','#203878'], // blue book
      [4,'#287828','#40a040','#185818'], // green book
      [3,'#a06030','#c07840','#784818'], // brown book
      [2,'#7030a0','#9048c0','#501878'], // purple book
      [3,'#a09020','#c0b030','#787010'], // gold book
      [2,'#20808a','#38a0a8','#106068'], // teal book
    ];
    let bx = 3;
    for (let b = 0; b < bookDefs.length && bx < S-4; b++) {
      const [bw, body, hi, shadow] = bookDefs[b];
      const bh = 7 + (b % 2);
      const by = sy - bh;
      // Book body
      blk(c,i,bx,by,bw,bh,body);
      // Top highlight (light from above-left)
      blk(c,i,bx,by,bw,1,hi);
      // Left edge highlight
      px(c,i,bx,by+1,hi); px(c,i,bx,by+2,hi);
      // Right edge shadow
      px(c,i,bx+bw-1,by+1,shadow); px(c,i,bx+bw-1,by+2,shadow);
      // Spine title detail (tiny horizontal line)
      px(c,i,bx,by+3,'#c0b890'); px(c,i,bx+1,by+3,'#c0b890');
      // Bottom shadow where book sits on shelf
      blk(c,i,bx,sy-1,bw,1,shadow);
      bx += bw + 1;
    }
  }
  // Frame corners — darker accent
  px(c,i,1,1,'#7a5838'); px(c,i,S-2,1,'#5a3820');
  px(c,i,1,S-2,'#5a3820'); px(c,i,S-2,S-2,'#3a2010');
}

function drawCounter(c: Ctx, i: number) {
  // Professional wood counter with grain, items on top
  // Wood ramp: #503818 -> #6a4828 -> #886838 -> #a88848
  fill(c, i, '#987048'); // floor peek at bottom

  // Counter body — front face
  blk(c,i,0,6,S,18,'#7a4818');
  blk(c,i,1,7,S-2,16,'#886838');
  // Front panel recesses
  blk(c,i,3,9,12,12,'#6a4828');
  blk(c,i,4,10,10,10,'#5a3820');
  blk(c,i,17,9,12,12,'#6a4828');
  blk(c,i,18,10,10,10,'#5a3820');
  // Panel highlight (top edge of each recess)
  blk(c,i,3,9,12,1,'#7a4818'); blk(c,i,17,9,12,1,'#7a4818');
  // Panel shadow (bottom of each recess)
  blk(c,i,4,20,10,1,'#503818'); blk(c,i,18,20,10,1,'#503818');
  // Wood grain lines on front face
  for (let y = 12; y < 20; y += 3) { blk(c,i,5,y,8,1,'#4a3018'); blk(c,i,19,y,8,1,'#4a3018'); }
  // Bottom shadow edge
  blk(c,i,0,23,S,1,'#503818');

  // Top surface (seen from above — bright, polished)
  blk(c,i,0,2,S,5,'#a88848');
  blk(c,i,0,2,S,1,'#c0a060'); // top edge highlight
  blk(c,i,1,3,S-2,3,'#cc8838'); // polished surface
  // Wood grain on top
  blk(c,i,3,4,6,1,'#a08040'); blk(c,i,14,3,8,1,'#a08040'); blk(c,i,24,4,5,1,'#a08040');

  // Items on counter: plate with bread, mug with steam
  // Plate
  blk(c,i,4,1,7,3,'#d0c8b8'); blk(c,i,5,0,5,1,'#e0d8c8');
  blk(c,i,4,1,7,1,'#fff8e8'); // plate rim highlight
  // Bread on plate
  blk(c,i,6,1,3,2,'#c09840'); px(c,i,7,0,'#d0a850'); px(c,i,6,2,'#a08030');
  // Mug
  blk(c,i,20,0,5,5,'#705040'); blk(c,i,21,1,3,3,'#604030');
  px(c,i,20,0,'#806050'); px(c,i,24,0,'#504030'); // mug rim hi/shadow
  blk(c,i,25,1,1,3,'#604030'); // handle
  px(c,i,25,2,'#705040');
  // Steam wisps
  px(c,i,21,0,'#c0c0c060'); px(c,i,23,0,'#c0c0c040');
}

function drawBedHead(c: Ctx, i: number) {
  // Top of bed: headboard + pillow
  fill(c, i, '#987048'); // floor
  // Headboard (dark wood)
  blk(c,i,2,0,S-4,8,'#604020');
  blk(c,i,3,1,S-6,6,'#704828');
  blk(c,i,2,0,S-4,1,'#806038'); // top edge
  // Carved detail on headboard
  blk(c,i,8,2,S-16,4,'#5a3818');
  blk(c,i,10,3,S-20,2,'#684828');
  // Pillow (white, puffy)
  blk(c,i,4,10,S-8,8,'#fff8e8');
  blk(c,i,5,11,S-10,6,'#f0e8d8');
  blk(c,i,4,10,S-8,1,'#f8f0e0'); // pillow top highlight
  blk(c,i,4,17,S-8,1,'#c8c0b0'); // pillow bottom shadow
  // Pillow center crease
  blk(c,i,14,12,4,4,'#d8d0c0');
  // Sheet start
  blk(c,i,2,20,S-4,12,'#d0c0a0');
  blk(c,i,2,20,S-4,1,'#e0d0b0');
}

function drawBedFoot(c: Ctx, i: number) {
  // Bottom of bed: blanket + footboard
  fill(c, i, '#987048');
  // Blanket body with fold lines
  blk(c,i,2,0,S-4,22,'#8068a0'); // purple-ish blanket
  blk(c,i,2,0,S-4,1,'#9078b0'); // top fold
  blk(c,i,4,4,S-8,1,'#705890'); // fold crease
  blk(c,i,3,8,S-6,1,'#705890');
  blk(c,i,4,14,S-8,1,'#6048800');
  // Pattern on blanket — diamond shapes
  for (let y = 2; y < 20; y += 6) {
    for (let x = 6; x < S-6; x += 8) {
      px(c,i,x,y,'#9880b8');
      px(c,i,x+1,y+1,'#9880b8');
      px(c,i,x-1,y+1,'#9880b8');
    }
  }
  // Footboard
  blk(c,i,2,22,S-4,8,'#604020');
  blk(c,i,3,23,S-6,6,'#704828');
  blk(c,i,2,22,S-4,1,'#806038');
  blk(c,i,2,S-2,S-4,2,'#503018');
}

function drawTable(c: Ctx, i: number) {
  // Top-down wooden table with 3D perspective, wood grain, and shadow
  // Wood ramp: #705028 -> #a08040 -> #b89858 -> #d8c078
  fill(c, i, '#987048'); // floor

  // Cast shadow (table hovers above floor) — soft gradient
  blk(c,i,5,S-4,S-8,4,'#785830');
  blk(c,i,6,S-3,S-10,3,'#685020');
  blk(c,i,7,S-2,S-12,2,'#604018');

  // Table legs (dark wood, seen from above at corners)
  // Each leg has highlight/shadow
  blk(c,i,3,4,3,3,'#604020'); px(c,i,3,4,'#705028'); px(c,i,5,6,'#503018');
  blk(c,i,S-6,4,3,3,'#604020'); px(c,i,S-6,4,'#705028'); px(c,i,S-4,6,'#503018');
  blk(c,i,3,S-7,3,3,'#604020'); px(c,i,3,S-7,'#705028'); px(c,i,5,S-5,'#503018');
  blk(c,i,S-6,S-7,3,3,'#604020'); px(c,i,S-6,S-7,'#705028'); px(c,i,S-4,S-5,'#503018');

  // Table top surface — warm polished wood
  blk(c,i,2,3,S-4,S-6,'#b89858');
  blk(c,i,3,4,S-6,S-8,'#b09050');
  // Top edge highlight (light from top-left)
  blk(c,i,2,3,S-4,1,'#d8c078');
  blk(c,i,2,4,1,S-8,'#d0b870'); // left edge highlight
  // Bottom/right edge shadow
  blk(c,i,2,S-4,S-4,1,'#886830');
  blk(c,i,S-3,4,1,S-8,'#907038'); // right edge shadow
  // Front edge (visible thickness — 3D look)
  blk(c,i,2,S-5,S-4,2,'#a08040');
  blk(c,i,3,S-4,S-6,1,'#907038');

  // Wood grain on surface (organic curved lines)
  blk(c,i,5,6,S-10,1,'#a88848'); blk(c,i,6,10,S-12,1,'#a88848');
  blk(c,i,5,14,S-10,1,'#a88848'); blk(c,i,7,18,S-14,1,'#a88848');
  // Knot in wood
  px(c,i,10,12,'#907038'); px(c,i,11,12,'#907038'); px(c,i,10,13,'#907038');
  px(c,i,11,11,'#a88848');

  // Items: candle with warm glow + ceramic plate
  // Candle
  blk(c,i,8,9,3,4,'#e8d8a0'); px(c,i,9,8,'#e0c020'); // wick
  px(c,i,9,7,'#f8e040'); px(c,i,9,6,'#ffe860'); px(c,i,10,6,'#fff088'); // flame
  px(c,i,8,7,'#f0a03040'); px(c,i,10,7,'#f0a03040'); // glow
  // Plate with food
  blk(c,i,18,10,7,5,'#d0c8b8'); blk(c,i,19,9,5,1,'#e0d8c8');
  blk(c,i,18,10,7,1,'#fff8e8'); // plate rim highlight
  blk(c,i,18,14,7,1,'#b0a898'); // plate rim shadow
  px(c,i,20,11,'#a08040'); px(c,i,21,11,'#b09048'); px(c,i,22,12,'#a08040'); // food
}

function drawChair(c: Ctx, i: number) {
  // Wooden chair seen from above — visible back, seat, and legs
  // Wood ramp: #503018 -> #705028 -> #987038 -> #b89050
  fill(c, i, '#987048'); // floor

  // Chair shadow on floor
  blk(c,i,8,26,16,3,'#785830'); blk(c,i,9,27,14,2,'#685020');

  // Chair legs (visible at corners from above)
  blk(c,i,7,6,2,2,'#604020'); px(c,i,7,6,'#705028');
  blk(c,i,23,6,2,2,'#604020'); px(c,i,23,6,'#705028');
  blk(c,i,7,24,2,2,'#604020'); px(c,i,7,24,'#705028');
  blk(c,i,23,24,2,2,'#604020'); px(c,i,23,24,'#705028');

  // Seat — slightly rounded rectangle with wood texture
  blk(c,i,8,10,16,14,'#a88040');
  blk(c,i,9,11,14,12,'#b89050');
  // Seat top-left highlight
  blk(c,i,8,10,16,1,'#c8a060'); blk(c,i,8,10,1,14,'#d49040');
  // Seat bottom-right shadow
  blk(c,i,8,23,16,1,'#886830'); blk(c,i,23,10,1,14,'#907038');
  // Wood grain on seat
  blk(c,i,10,13,12,1,'#a07838'); blk(c,i,11,17,10,1,'#a07838'); blk(c,i,10,20,12,1,'#a07838');
  // Seat center detail
  px(c,i,15,15,'#c8a860'); px(c,i,16,15,'#d49040');

  // Chair back (top portion, above seat)
  blk(c,i,8,2,16,7,'#705028');
  blk(c,i,9,3,14,5,'#886830');
  // Back highlight/shadow
  blk(c,i,8,2,16,1,'#987038'); // top edge light
  blk(c,i,8,8,16,1,'#503018'); // bottom edge dark
  // Back vertical slats
  blk(c,i,12,3,1,5,'#604020'); blk(c,i,16,3,1,5,'#604020'); blk(c,i,20,3,1,5,'#604020');
  // Back top highlight pixels
  px(c,i,9,2,'#a07838'); px(c,i,14,2,'#a07838'); px(c,i,19,2,'#a07838');
}

function drawBarrel(c: Ctx, i: number) {
  // Barrel from above with stave lines, metal bands with rivets, proper shading
  // Wood ramp: #604018 -> #886028 -> #a07838 -> #b89050
  // Metal ramp: #505858 -> #707878 -> #909898 -> #b0b8b8
  fill(c, i, '#987048'); // floor

  // Shadow under barrel
  for (let y = 26; y < 30; y++) for (let x = 6; x < 26; x++) {
    const dx = (x-16)/11, dy = (y-28)/3;
    if (dx*dx+dy*dy < 1) px(c,i,x,y,'#685020');
  }

  const cx = 16, cy = 15;
  // Barrel body — elliptical, top-down
  for (let y = 3; y < 28; y++) for (let x = 4; x < 28; x++) {
    const dx = (x-cx)/11.5, dy = (y-cy)/12;
    if (dx*dx+dy*dy <= 1) {
      // Stave lines (vertical wood planks)
      const stave = Math.abs(((x - 4) % 5) - 2);
      // Circular shading — bright top-left, dark bottom-right
      const shade = (dx * -0.5 + dy * -0.5);
      let col: string;
      if (shade > 0.3) col = '#b89050';
      else if (shade > 0) col = '#a07838';
      else if (shade > -0.3) col = '#886028';
      else col = '#705020';
      // Darken at stave edges
      if (stave === 0) col = '#604018';
      px(c,i,x,y,col);
    }
  }

  // Metal bands — two bands with proper shading
  const bandYs = [8, 22];
  for (const by of bandYs) {
    for (let y = by; y < by+2; y++) for (let x = 4; x < 28; x++) {
      const dx = (x-cx)/11.5, dy = (y-cy)/12;
      if (dx*dx+dy*dy <= 1) {
        // Metal shading — highlight on left, shadow on right
        const metalShade = dx < -0.3 ? '#b0b8b8' : dx < 0 ? '#909898' : dx < 0.3 ? '#707878' : '#505858';
        px(c,i,x,y,metalShade);
      }
    }
    // Rivets on each band (small bright dots)
    px(c,i,8,by,'#c0c8c8'); px(c,i,16,by,'#c0c8c8'); px(c,i,24,by,'#c0c8c8');
    // Rivet shadows
    px(c,i,9,by+1,'#505858'); px(c,i,17,by+1,'#505858'); px(c,i,25,by+1,'#505858');
  }

  // Top rim highlight (bright ellipse for 3D top surface)
  for (let x = 8; x < 24; x++) {
    const dx = (x-16)/8;
    if (dx*dx < 1) { px(c,i,x,4,'#c8a860'); px(c,i,x,5,'#cc8838'); }
  }
  // Top surface center cross (barrel lid)
  blk(c,i,15,12,2,6,'#705028'); blk(c,i,12,14,8,2,'#705028');
  px(c,i,16,14,'#806030'); // cross center highlight
  // Top bung hole
  px(c,i,14,10,'#503818'); px(c,i,15,10,'#503818');
}

function drawCrate(c: Ctx, i: number) {
  // Wooden crate with visible plank pattern and nails
  fill(c, i, '#987048');
  blk(c,i,2,2,S-4,S-4,'#a08040');
  // Plank lines
  blk(c,i,2,2,S-4,1,'#b89050');blk(c,i,2,S-3,S-4,1,'#806030');
  for (let y = 8; y < S-4; y += 8) blk(c,i,3,y,S-6,1,'#886830');
  // Cross brace
  for (let d = 0; d < S-6; d++) { px(c,i,3+d,3+Math.floor(d*0.9),'#705020'); px(c,i,S-4-d,3+Math.floor(d*0.9),'#705020'); }
  // Nails
  px(c,i,6,6,'#c0c0b0');px(c,i,S-7,6,'#c0c0b0');px(c,i,6,S-7,'#c0c0b0');px(c,i,S-7,S-7,'#c0c0b0');
  // Shadow
  blk(c,i,2,S-3,S-4,1,'#806030');blk(c,i,S-3,2,1,S-4,'#806030');
}

function drawFireplace(c: Ctx, i: number) {
  // Grand stone fireplace with detailed flames and stone texture
  // Stone ramp: #383838 -> #505050 -> #686868 -> #888888
  // Flame ramp: #601008 -> #c03010 -> #e06020 -> #f0a030 -> #f8d040 -> #fff880
  fill(c, i, '#987048'); // floor

  // Stone surround — textured blocks
  blk(c,i,0,0,S,S,'#585858');
  // Individual stone blocks on left pillar
  blk(c,i,0,4,6,6,'#606060'); blk(c,i,0,4,6,1,'#707070'); blk(c,i,0,9,6,1,'#484848');
  blk(c,i,0,10,6,7,'#585858'); blk(c,i,0,10,6,1,'#686868'); blk(c,i,0,16,6,1,'#484848');
  blk(c,i,0,17,6,7,'#565656'); blk(c,i,0,17,6,1,'#686868'); blk(c,i,0,23,6,1,'#484848');
  blk(c,i,0,24,6,8,'#606060'); blk(c,i,0,24,6,1,'#707070');
  // Right pillar stones
  blk(c,i,26,4,6,6,'#565656'); blk(c,i,26,4,6,1,'#686868'); blk(c,i,26,9,6,1,'#484848');
  blk(c,i,26,10,6,7,'#606060'); blk(c,i,26,10,6,1,'#707070'); blk(c,i,26,16,6,1,'#484848');
  blk(c,i,26,17,6,7,'#585858'); blk(c,i,26,17,6,1,'#686868');
  blk(c,i,26,24,6,8,'#565656'); blk(c,i,26,24,6,1,'#686868');
  // Stone texture pixels
  px(c,i,2,6,'#505050'); px(c,i,4,12,'#505050'); px(c,i,1,20,'#505050');
  px(c,i,28,8,'#505050'); px(c,i,30,14,'#505050'); px(c,i,27,22,'#505050');

  // Mantle (top shelf) — detailed with shadow/highlight
  blk(c,i,0,0,S,4,'#707070');
  blk(c,i,0,0,S,1,'#888888'); // top highlight
  blk(c,i,1,1,S-2,2,'#787878');
  blk(c,i,0,3,S,1,'#505050'); // bottom shadow of mantle
  // Mantle edge detail
  px(c,i,0,0,'#a89878'); px(c,i,S-1,0,'#606060');

  // Firebox opening (dark recess)
  blk(c,i,6,6,20,26,'#1a1008');
  blk(c,i,7,7,18,24,'#100808');
  // Soot darkening at top of opening
  blk(c,i,7,7,18,4,'#080404');

  // Fire — layered flames with 6 colors
  // Deep ember bed at bottom
  blk(c,i,8,26,16,4,'#601008'); blk(c,i,9,27,14,3,'#801808');
  // Glowing coals
  px(c,i,10,28,'#c04020'); px(c,i,14,29,'#e06030'); px(c,i,18,28,'#d05028');
  px(c,i,22,29,'#c04020'); px(c,i,12,29,'#b03818');

  // Main flame body — irregular, organic shape
  blk(c,i,9,18,14,8,'#c03010');   // red base
  blk(c,i,10,16,12,8,'#e06020');  // orange
  blk(c,i,11,14,10,6,'#f0a030');  // yellow-orange
  blk(c,i,13,12,6,5,'#f8d040');   // yellow core
  blk(c,i,14,10,4,4,'#ffe860');   // bright core

  // Flame tips (individual pixels for organic look)
  px(c,i,15,9,'#fff880'); px(c,i,16,8,'#ffffa0'); // main tip
  px(c,i,12,11,'#f8d040'); px(c,i,11,13,'#e06020'); // left lick
  px(c,i,20,12,'#f0a030'); px(c,i,21,14,'#e06020'); // right lick
  px(c,i,13,10,'#f8d040'); px(c,i,19,11,'#f8d040'); // secondary tips

  // Scattered embers/sparks above flame
  px(c,i,10,8,'#f0802040'); px(c,i,18,7,'#f0802040'); px(c,i,14,7,'#e0600040');

  // Warm glow on inner walls of firebox
  blk(c,i,7,20,2,6,'#401008'); blk(c,i,23,20,2,6,'#401008');

  // Left pillar highlight (light from fire)
  px(c,i,5,14,'#787058'); px(c,i,5,18,'#786850');
  // Hearth stone (bottom ledge)
  blk(c,i,4,S-2,24,2,'#606060');
  blk(c,i,4,S-2,24,1,'#707070');
}

function drawPlant(c: Ctx, i: number) {
  // Potted plant with visible leaves and terra cotta pot
  fill(c, i, '#987048');
  // Pot (terra cotta)
  blk(c,i,10,18,12,12,'#c06030');
  blk(c,i,8,16,16,3,'#d07040'); // rim
  blk(c,i,9,16,14,1,'#e08050'); // rim highlight
  blk(c,i,11,20,10,8,'#b05828'); // pot shadow side
  blk(c,i,12,28,8,2,'#a04820'); // base
  // Soil
  blk(c,i,11,17,10,2,'#4a3020');
  // Leaves (varied greens, overlapping)
  const leaves: [number,number,number,number,string][] = [
    [8,6,8,8,'#38a830'],[16,4,10,7,'#30a028'],[6,10,7,6,'#48b838'],
    [20,8,8,7,'#40a830'],[12,2,8,6,'#50c040'],[14,8,6,5,'#389828'],
  ];
  for (const [lx,ly,lw,lh,col] of leaves) {
    blk(c,i,lx,ly,lw,lh,col);
    blk(c,i,lx,ly,lw,1,`${col}dd`); // lighter top
  }
  // Leaf veins
  px(c,i,12,8,'#288820');px(c,i,20,6,'#288820');px(c,i,10,12,'#288820');
}

function drawRugCenter(c: Ctx, i: number) {
  // Woven rug with diamond pattern — drawn on floor
  fill(c, i, '#987048');
  // Rug body (deep red)
  blk(c,i,0,0,S,S,'#903030');
  // Gold border
  blk(c,i,0,0,S,2,'#c09030');blk(c,i,0,S-2,S,2,'#c09030');
  blk(c,i,0,0,2,S,'#c09030');blk(c,i,S-2,0,2,S,'#c09030');
  // Diamond pattern
  for (let y = 4; y < S-4; y += 4) for (let x = 4; x < S-4; x += 4) {
    if ((x+y)%8 < 4) px(c,i,x+1,y+1,'#b04040');
    else px(c,i,x+1,y+1,'#803020');
  }
  // Central medallion
  blk(c,i,12,12,8,8,'#c09030');blk(c,i,13,13,6,6,'#903030');blk(c,i,14,14,4,4,'#c09030');
}

function drawRugEdge(c: Ctx, i: number) {
  fill(c, i, '#987048');
  // Half rug fading into floor
  blk(c,i,0,0,S,16,'#903030');
  blk(c,i,0,0,S,2,'#c09030');
  blk(c,i,0,14,S,2,'#c09030');
  // Fringe at bottom
  for (let x = 2; x < S; x += 3) { blk(c,i,x,16,1,4,'#c09030'); blk(c,i,x,20,1,2,'#a07828'); }
}

function drawWeaponRack(c: Ctx, i: number) {
  // Wall-mounted weapon rack with detailed sword and shield
  // Stone wall: #686868 -> #808080 -> #a89878
  // Metal: #707880 -> #909898 -> #b0b8c0 -> #d0d8e0
  fill(c, i, '#a09078'); // stone wall bg
  // Wall texture
  px(c,i,2,4,'#808078'); px(c,i,28,6,'#808078'); px(c,i,6,28,'#808078');
  px(c,i,20,2,'#a89878'); px(c,i,14,30,'#808078');

  // Rack board (dark wood, wall-mounted)
  blk(c,i,3,8,S-6,16,'#5a3820');
  blk(c,i,4,9,S-8,14,'#6a4828');
  blk(c,i,3,8,S-6,1,'#7a5838'); // top highlight
  blk(c,i,3,23,S-6,1,'#3a2010'); // bottom shadow
  // Wood grain on rack
  blk(c,i,6,12,S-12,1,'#5a3820'); blk(c,i,5,16,S-10,1,'#5a3820'); blk(c,i,7,20,S-14,1,'#5a3820');

  // Mounting pegs — 3D metal nubs
  blk(c,i,7,10,3,3,'#606068'); px(c,i,7,10,'#808088'); px(c,i,9,12,'#404048');
  blk(c,i,22,10,3,3,'#606068'); px(c,i,22,10,'#808088'); px(c,i,24,12,'#404048');

  // Sword — diagonal with proper blade shape and crossguard
  // Blade (metallic gradient along length)
  for (let d = 0; d < 18; d++) {
    const sx = 6+d; const sy = 10+Math.floor(d*0.6);
    const shade = d < 4 ? '#d0d8e0' : d < 10 ? '#b0b8c0' : d < 14 ? '#909898' : '#707880';
    px(c,i,sx,sy,shade); px(c,i,sx,sy+1,shade);
  }
  // Blade edge highlight
  px(c,i,7,10,'#e0e8f0'); px(c,i,8,11,'#e0e8f0'); px(c,i,9,11,'#d0d8e0');
  // Sword tip
  px(c,i,6,10,'#e0e8f0'); px(c,i,5,9,'#d0d8e0');
  // Crossguard (gold)
  blk(c,i,18,18,2,5,'#c0a030'); blk(c,i,17,19,4,3,'#d0b040');
  px(c,i,17,19,'#e0c050'); // guard highlight
  px(c,i,20,21,'#a08020'); // guard shadow
  // Grip
  blk(c,i,22,22,2,4,'#604020'); px(c,i,22,22,'#705028');
  // Pommel
  px(c,i,23,26,'#c0a030'); px(c,i,24,26,'#a08020');

  // Shield — round with boss and trim
  const scx = 18, scy = 14;
  for (let y = 10; y < 19; y++) for (let x = 14; x < 23; x++) {
    const dx = x-scx, dy = y-scy;
    const d = dx*dx+dy*dy;
    if (d < 20) {
      // Shield body with directional shading
      const shade = (dx*-0.5+dy*-0.5);
      const col = shade > 0.5 ? '#c0a030' : shade > 0 ? '#a08828' : shade > -0.5 ? '#886820' : '#706018';
      px(c,i,x,y,col);
    }
  }
  // Shield boss (center metal nub)
  px(c,i,18,14,'#e0d060'); px(c,i,17,14,'#d0c050'); px(c,i,19,14,'#c0a040');
  px(c,i,18,13,'#d0c050'); px(c,i,18,15,'#a08828');
  // Shield rim highlight (top-left)
  px(c,i,16,11,'#d0b840'); px(c,i,15,12,'#d0b840');
  // Shield rim shadow (bottom-right)
  px(c,i,20,17,'#605010'); px(c,i,21,16,'#605010');
}

function drawWindow(c: Ctx, i: number) {
  // Wall section WITH a window — top-down view of an interior wall.
  // Top and bottom are solid wall (matching WALL_WOOD), middle shows
  // a recessed window with light streaming through. This way the tile
  // blends naturally into the wall row.

  // Wall portion — full wood-wall fill first
  fill(c, i, '#906830');
  // Match WALL_WOOD plank style for wall portions
  for (let n = 0; n < 5; n++) {
    const p0 = n * 7; const pw = n < 4 ? 6 : S - p0;
    blk(c,i,p0,0,pw,10,n%2===0?'#987038':'#886028');
    blk(c,i,p0,22,pw,10,n%2===0?'#987038':'#886028');
  }
  blk(c,i,0,0,S,1,'#a88848'); // top highlight
  blk(c,i,0,S-1,S,1,'#604020'); // bottom shadow

  // Window opening in the center (rows 10-22)
  blk(c,i,6,10,S-12,12,'#604020'); // dark recess frame
  blk(c,i,8,11,S-16,10,'#80b8d8'); // glass - sky blue
  blk(c,i,10,12,S-20,8,'#a0d0e8'); // lighter center
  blk(c,i,12,13,S-24,6,'#c0e0f0'); // bright inner glow

  // Cross frame (wooden mullion)
  blk(c,i,15,10,2,12,'#604020');
  blk(c,i,6,15,S-12,2,'#604020');

  // Window sill (bottom ledge with highlight)
  blk(c,i,5,21,S-10,2,'#806038');
  blk(c,i,5,21,S-10,1,'#a08048');
}

function drawTorch(c: Ctx, i: number) {
  // Wall-mounted torch with flame
  fill(c, i, '#a09078'); // stone wall bg
  // Bracket
  blk(c,i,12,16,8,10,'#505050');blk(c,i,14,14,4,4,'#606060');
  // Torch handle
  blk(c,i,14,8,4,10,'#705030');
  // Flame
  blk(c,i,12,2,8,8,'#e06020');
  blk(c,i,13,1,6,6,'#f0a030');
  blk(c,i,14,0,4,4,'#f8d040');
  px(c,i,15,0,'#ffe860');px(c,i,16,0,'#fff880');
  // Glow around flame
  for (let y = 0; y < 12; y++) for (let x = 8; x < 24; x++) {
    const d = (x-16)*(x-16)+(y-4)*(y-4);
    if (d < 40 && d > 16) {
      const existing = c.getImageData(ox(i)+x, y, 1, 1).data;
      if (existing[0] < 200) px(c,i,x,y,'#f0a03018');
    }
  }
}

function drawDisplay(c: Ctx, i: number) {
  // Glass display case — drawn with perspective so it looks TALL.
  // Cast shadow at base, bright top surface, darker front face.
  fill(c, i, '#987048'); // floor shows at edges

  // Cast shadow on floor (case is elevated)
  blk(c,i,4,S-4,S-6,4,'#705028');

  // Case front face (darker — you're looking at the side)
  blk(c,i,2,8,S-4,S-12,'#705838');
  blk(c,i,3,9,S-6,S-14,'#806840');

  // Glass panel in front face (see items through it)
  blk(c,i,5,10,S-10,S-16,'#90b8d0');
  // Items visible through glass
  blk(c,i,8,12,4,8,'#d04040'); blk(c,i,9,10,2,3,'#c0c0b8'); // potion
  blk(c,i,18,14,4,4,'#e0c040'); // gold item
  blk(c,i,16,20,6,3,'#e0d8c0'); // scroll

  // Top surface (bright — light catches it)
  blk(c,i,2,2,S-4,7,'#c0a868');
  blk(c,i,3,3,S-6,5,'#d0b878');
  blk(c,i,2,2,S-4,1,'#e0c888'); // top highlight edge

  // Glass reflection on front
  blk(c,i,6,11,3,1,'#d0e8f8');
  blk(c,i,20,12,2,1,'#c0d8e8');
}

// ═══════════════════════════════════════════════════════════════
// INTERIOR ARCHITECTURE (32-35) — ALTTP-style thick wall borders
// ═══════════════════════════════════════════════════════════════

function drawWallInner(c: Ctx, i: number) {
  // Inner wall face — tan/beige dressed stone with texture.
  // This is what you see on the SIDE walls of a room (left/right).
  // ALTTP rooms have a thick ~3-tile border of this on each side.
  fill(c, i, '#c0a880');

  // Stone block texture (larger blocks than exterior walls)
  for (let row = 0; row < 4; row++) {
    const by = row * 8;
    blk(c,i,0,by+7,S,1,'#9a8060'); // mortar
    for (let col = 0; col < 3; col++) {
      const bx = col * 11 + (row%2===0?0:5);
      const cw = Math.min(10, S - Math.max(0,bx));
      if (cw <= 0) continue;
      const cx = Math.max(0, bx);
      const shade = ['#c8b088','#c0a880','#b8a078','#c8b090'][(row+col)&3];
      blk(c,i,cx,by,cw,7,shade);
      blk(c,i,cx,by,cw,1,'#d0b890'); // highlight
      blk(c,i,cx,by+6,cw,1,'#a89068'); // shadow
    }
  }
  // Vertical edge detail (defines the wall boundary)
  blk(c,i,0,0,2,S,'#a89068'); // darker left edge
  blk(c,i,S-2,0,2,S,'#d0b890'); // lighter right edge
}

function drawWallCorner(c: Ctx, i: number) {
  // Decorative corner medallion — ALTTP has ornate circular patterns
  // in the room corners. Dark background with bronze/gold circle.
  fill(c, i, '#685848');

  // Circular medallion
  const cx = 16, cy = 16;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (x-cx)/11, dy = (y-cy)/11;
    const d2 = dx*dx + dy*dy;
    if (d2 <= 1) {
      if (d2 < 0.3) px(c,i,x,y,'#c09838');       // gold center
      else if (d2 < 0.5) px(c,i,x,y,'#a08030');   // mid gold
      else if (d2 < 0.7) px(c,i,x,y,'#886828');   // bronze
      else if (d2 < 0.85) px(c,i,x,y,'#705820');  // dark bronze
      else px(c,i,x,y,'#584818');                   // ring edge
    }
  }
  // Medallion highlight
  blk(c,i,12,8,8,2,'#d0a848');
  // Inner cross pattern
  blk(c,i,15,10,2,12,'#886828');
  blk(c,i,10,15,12,2,'#886828');
  // Outer frame
  blk(c,i,0,0,S,2,'#584838'); blk(c,i,0,S-2,S,2,'#584838');
  blk(c,i,0,0,2,S,'#584838'); blk(c,i,S-2,0,2,S,'#584838');
}

function drawWallShelf(c: Ctx, i: number) {
  // Back wall with shelf/mantle — this is the TOP WALL of the room.
  // You see it from below: a stone face with a protruding shelf, and
  // small objects sitting on it (vases, bottles).
  fill(c, i, '#a09070');

  // Wall face (upper 60%)
  blk(c,i,0,0,S,20,'#a89878');
  // Decorative horizontal band
  blk(c,i,0,4,S,2,'#908060');
  blk(c,i,0,4,S,1,'#b0a080');

  // Shelf surface (protruding ledge)
  blk(c,i,0,18,S,4,'#907858');
  blk(c,i,0,18,S,1,'#b09868'); // shelf top highlight
  blk(c,i,0,21,S,1,'#705838'); // shelf bottom shadow

  // Objects on the shelf
  // Small vase (left)
  blk(c,i,6,12,4,6,'#c06848'); blk(c,i,7,10,2,2,'#c87858'); // neck
  blk(c,i,6,12,4,1,'#d87858'); // rim highlight
  // Bottle (center)
  blk(c,i,14,14,3,4,'#408060'); blk(c,i,15,11,1,3,'#50906a');
  // Cup (right)
  blk(c,i,22,14,4,4,'#c0b8a0'); blk(c,i,22,14,4,1,'#d0c8b0');

  // Below shelf (shadow / baseboard area)
  blk(c,i,0,22,S,10,'#685048');
  blk(c,i,0,22,S,2,'#584038'); // deep shadow under shelf
}

function drawBaseboard(c: Ctx, i: number) {
  // Dark molding strip between wall and floor — reddish-brown.
  // In ALTTP this is a clearly visible darker band.
  fill(c, i, '#684838');

  // Molding profile (3D — darker at top, highlight in middle)
  blk(c,i,0,0,S,6,'#584030');   // dark top edge (shadow from wall)
  blk(c,i,0,6,S,8,'#785848');   // main molding body
  blk(c,i,0,10,S,2,'#886858');  // center highlight
  blk(c,i,0,14,S,4,'#685040');  // lower molding
  blk(c,i,0,18,S,2,'#584030');  // bottom lip shadow

  // Floor begins below (warm brown)
  blk(c,i,0,20,S,12,'#a08058');
  // First row of floor bricks
  for (let col = 0; col < 4; col++) {
    const bx = col * 8;
    blk(c,i,bx,22,7,3,'#a88860');
    blk(c,i,bx,22,7,1,'#b89868');
    blk(c,i,bx+7,22,1,3,'#706040');
  }
  blk(c,i,0,25,S,1,'#706040');
}

// ═══════════════════════════════════════════════════════════════
// DUNGEON HAZARD & ATMOSPHERE TILES (36-43)
// ═══════════════════════════════════════════════════════════════

function drawLava(c: Ctx, i: number) {
  // Bubbling lava — deep magma base, crusted surface, flowing channels, bright hotspots
  fill(c, i, '#801808');

  // Dark cooled crust layer — irregular patches across surface
  blk(c,i,0,0,10,5,'#501008'); blk(c,i,1,1,7,3,'#581408');
  blk(c,i,22,0,10,6,'#481008'); blk(c,i,24,1,6,4,'#581408');
  blk(c,i,0,14,6,8,'#501008'); blk(c,i,1,15,4,5,'#581408');
  blk(c,i,26,20,6,6,'#481008'); blk(c,i,27,21,4,4,'#581408');
  blk(c,i,12,26,8,6,'#501008'); blk(c,i,13,27,6,4,'#581408');

  // Mid-temperature magma flow channels (winding rivers of orange)
  blk(c,i,8,3,6,4,'#c03810'); blk(c,i,12,5,8,3,'#b83010');
  blk(c,i,6,8,18,5,'#c04018'); blk(c,i,8,10,14,2,'#d05020');
  blk(c,i,4,14,10,4,'#b83010'); blk(c,i,16,16,10,3,'#c03810');
  blk(c,i,6,20,8,5,'#b83010'); blk(c,i,18,22,6,4,'#c04018');

  // Bright flowing lava (hottest channels)
  blk(c,i,10,4,4,2,'#e06828'); blk(c,i,14,6,4,2,'#e06828');
  blk(c,i,8,9,12,3,'#e87030'); blk(c,i,10,10,8,1,'#f08838');
  blk(c,i,6,15,6,2,'#e06828'); blk(c,i,18,17,6,1,'#e87030');
  blk(c,i,8,21,4,3,'#e06828'); blk(c,i,20,23,4,2,'#e87030');

  // Yellow-white hotspots (bubbling vents)
  blk(c,i,11,5,3,2,'#f0a030'); px(c,i,12,5,'#f8d040'); px(c,i,12,4,'#ffe860');
  blk(c,i,10,9,2,2,'#f0a030'); px(c,i,10,9,'#f8d040'); px(c,i,11,9,'#ffe870');
  blk(c,i,18,10,3,2,'#f0a030'); px(c,i,19,10,'#fff880');
  blk(c,i,7,16,2,2,'#f0a030'); px(c,i,7,16,'#f8d040');
  blk(c,i,22,17,2,1,'#f0a030'); px(c,i,22,17,'#ffe860');
  blk(c,i,9,22,2,2,'#f0a030'); px(c,i,9,22,'#fff880');
  blk(c,i,21,24,2,1,'#f0a030'); px(c,i,21,24,'#f8d040');

  // Bubble rings (dark outline around bright spots)
  px(c,i,11,4,'#a03010'); px(c,i,13,4,'#a03010'); px(c,i,11,6,'#a03010'); px(c,i,13,6,'#a03010');
  px(c,i,9,9,'#a03010'); px(c,i,12,9,'#a03010');
  px(c,i,17,10,'#a03010'); px(c,i,20,10,'#a03010');

  // Ripple/wave flow lines suggesting current
  for (let x = 5; x < 28; x += 2) {
    if (x % 4 === 0) px(c,i,x,8,'#d85818');
    px(c,i,x,12,'#c84818'); px(c,i,x+1,19,'#c84818');
    if (x % 3 === 0) px(c,i,x,25,'#d85818');
  }

  // Crust texture — tiny dark pixels on cooled areas
  px(c,i,2,2,'#381008'); px(c,i,4,3,'#401008'); px(c,i,6,1,'#381008');
  px(c,i,24,2,'#381008'); px(c,i,26,4,'#401008');
  px(c,i,2,16,'#381008'); px(c,i,28,22,'#401008'); px(c,i,14,28,'#381008');

  // Dark border edges where lava meets stone
  blk(c,i,0,0,S,2,'#301008'); blk(c,i,0,S-2,S,2,'#301008');
  blk(c,i,0,0,2,S,'#301008'); blk(c,i,S-2,0,2,S,'#301008');
  // Inner border highlight (glow against dark edge)
  for (let x = 2; x < S-2; x++) { px(c,i,x,2,'#a03010'); px(c,i,x,S-3,'#a03010'); }
  for (let y = 2; y < S-2; y++) { px(c,i,2,y,'#a03010'); px(c,i,S-3,y,'#a03010'); }
}

function drawAcid(c: Ctx, i: number) {
  // Toxic acid pool — bright lime surface, dark murky currents, bubbles, shimmer
  fill(c, i, '#28901a');

  // Darker deep currents swirling beneath surface
  blk(c,i,0,2,7,5,'#1a7810'); blk(c,i,2,4,4,2,'#187010');
  blk(c,i,16,6,12,4,'#1a7810'); blk(c,i,18,7,8,2,'#187010');
  blk(c,i,4,14,10,5,'#1a7810'); blk(c,i,6,15,6,3,'#187010');
  blk(c,i,20,20,10,5,'#1a7810'); blk(c,i,22,21,6,3,'#187010');
  blk(c,i,8,26,8,4,'#1a7810');

  // Main bright surface layer
  blk(c,i,8,0,16,4,'#48c030'); blk(c,i,10,1,12,2,'#50c838');
  blk(c,i,2,8,14,5,'#48c030'); blk(c,i,4,9,10,3,'#50c838');
  blk(c,i,18,12,12,4,'#48c030'); blk(c,i,20,13,8,2,'#50c838');
  blk(c,i,10,18,12,5,'#48c030'); blk(c,i,12,19,8,3,'#50c838');
  blk(c,i,0,24,8,4,'#48c030');

  // Toxic shimmer highlights (lighter patches on surface)
  blk(c,i,12,1,6,1,'#68d850'); blk(c,i,6,9,6,1,'#68d850');
  blk(c,i,22,13,4,1,'#68d850'); blk(c,i,14,19,4,1,'#68d850');
  blk(c,i,2,25,4,1,'#68d850');

  // Bubble clusters — bright spots with white/yellow highlights
  // Bubble 1 (top area)
  blk(c,i,14,2,3,3,'#70e050'); px(c,i,15,2,'#a0f080'); px(c,i,15,1,'#c0ffa0');
  px(c,i,14,2,'#60d040'); px(c,i,16,4,'#40b028');
  // Bubble 2 (left)
  blk(c,i,6,10,3,3,'#70e050'); px(c,i,7,10,'#a0f080'); px(c,i,7,9,'#e0ffc0');
  px(c,i,8,12,'#40b028');
  // Bubble 3 (right)
  blk(c,i,24,14,3,2,'#70e050'); px(c,i,25,14,'#c0ffa0'); px(c,i,25,13,'#f0ffb0');
  // Bubble 4 (center)
  blk(c,i,16,20,4,3,'#70e050'); px(c,i,17,20,'#a0f080'); px(c,i,18,20,'#c0ffa0');
  px(c,i,17,19,'#e0ffc0'); px(c,i,19,22,'#40b028');
  // Bubble 5 (bottom-left)
  blk(c,i,3,26,2,2,'#70e050'); px(c,i,3,26,'#a0f080'); px(c,i,4,25,'#c0ffa0');
  // Bubble 6 (bottom-right)
  blk(c,i,26,28,3,2,'#70e050'); px(c,i,27,28,'#f0ffb0');

  // Popping bubble rings (dark outlines)
  px(c,i,13,1,'#208818'); px(c,i,17,1,'#208818');
  px(c,i,5,9,'#208818'); px(c,i,9,9,'#208818');
  px(c,i,15,19,'#208818'); px(c,i,20,19,'#208818');

  // Surface ripple/wave lines
  for (let x = 2; x < 30; x += 3) {
    px(c,i,x,6,'#58d040'); px(c,i,x+1,13,'#58d040');
    px(c,i,x,22,'#58d040'); px(c,i,x+1,29,'#58d040');
  }

  // Deep dark spots (voids beneath surface)
  px(c,i,4,5,'#106008'); px(c,i,20,8,'#106008'); px(c,i,8,16,'#106008');
  px(c,i,24,22,'#106008'); px(c,i,12,28,'#106008');

  // Dark green border edges
  blk(c,i,0,0,S,2,'#146010'); blk(c,i,0,S-2,S,2,'#146010');
  blk(c,i,0,0,2,S,'#146010'); blk(c,i,S-2,0,2,S,'#146010');
  // Glow on inner border
  for (let x = 2; x < S-2; x++) { px(c,i,x,2,'#208818'); px(c,i,x,S-3,'#208818'); }
  for (let y = 2; y < S-2; y++) { px(c,i,2,y,'#208818'); px(c,i,S-3,y,'#208818'); }
}

function drawFloorCracked(c: Ctx, i: number) {
  // Cracked stone floor — full stone base with organic cracks, voids, rubble
  fill(c, i, '#a09078');
  // Stone brick pattern (matching FLOOR_STONE)
  for (let row = 0; row < 8; row++) {
    const by = row * 4;
    const off = row % 2 === 0 ? 0 : 5;
    blk(c,i,0,by+3,S,1,'#585850');
    for (let col = -1; col < 5; col++) {
      const bx = off + col * 10;
      if (bx >= S) break;
      const cx2 = Math.max(0, bx);
      const cw = Math.min(10, S - cx2);
      if (cw <= 0) continue;
      const shade = ['#a89878','#a09078','#808078','#989890'][(row+col)&3];
      blk(c,i,cx2,by,cw,3,shade);
      blk(c,i,cx2,by,cw,1,'#a0a098');
      if (bx > 0 && bx < S) blk(c,i,bx,by,1,3,'#585850');
    }
  }

  // Major crack — organic zigzag from top-left toward bottom-right
  const mainCrack: [number,number][] = [
    [3,1],[4,2],[4,3],[5,4],[5,5],[6,6],[7,7],[8,8],[8,9],[9,10],
    [10,11],[10,12],[11,13],[12,14],[13,14],[14,15],[14,16],[15,17],
    [16,18],[17,18],[18,19],[19,20],[19,21],[20,22],[21,23],[22,24],
    [23,25],[24,26],[25,27],[26,28],[27,28],[28,29],
  ];
  for (const [cx2,cy2] of mainCrack) {
    if (cx2 < S && cy2 < S) {
      px(c,i,cx2,cy2,'#282820'); // crack center (dark void)
      px(c,i,cx2+1,cy2,'#383830'); // right edge
      px(c,i,cx2-1,cy2,'#404038'); // left edge (lighter)
    }
  }

  // Branch crack 1 — splits upward from main crack around (14,15)
  const branch1: [number,number][] = [
    [14,14],[15,13],[16,12],[17,11],[18,10],[19,9],[20,8],[21,8],[22,7],
  ];
  for (const [cx2,cy2] of branch1) {
    if (cx2 < S && cy2 >= 0) { px(c,i,cx2,cy2,'#303028'); px(c,i,cx2,cy2+1,'#404038'); }
  }

  // Branch crack 2 — splits left from main crack around (8,9)
  const branch2: [number,number][] = [
    [7,9],[6,10],[5,11],[4,12],[3,13],[2,14],[2,15],
  ];
  for (const [cx2,cy2] of branch2) {
    if (cy2 < S) { px(c,i,cx2,cy2,'#303028'); px(c,i,cx2+1,cy2,'#404038'); }
  }

  // Small hairline cracks radiating from main
  px(c,i,6,5,'#484840'); px(c,i,7,5,'#505048');
  px(c,i,12,13,'#484840'); px(c,i,13,12,'#484840');
  px(c,i,20,21,'#484840'); px(c,i,21,21,'#505048');

  // Missing tile chunks (dark voids where stone fell away)
  blk(c,i,22,4,5,4,'#1a1810'); blk(c,i,23,5,3,2,'#101008');
  // Broken edge pixels around void
  px(c,i,21,4,'#686860'); px(c,i,27,4,'#686860'); px(c,i,22,8,'#686860');
  px(c,i,26,7,'#585850');

  // Second void chunk (bottom-left)
  blk(c,i,0,26,4,3,'#1a1810'); blk(c,i,1,27,2,1,'#101008');
  px(c,i,4,26,'#686860'); px(c,i,0,25,'#686860'); px(c,i,3,29,'#585850');

  // Rubble/debris pixels scattered near cracks
  px(c,i,5,6,'#787870'); px(c,i,9,11,'#787870'); px(c,i,11,14,'#6a6a62');
  px(c,i,16,17,'#787870'); px(c,i,20,22,'#6a6a62'); px(c,i,25,26,'#787870');
  px(c,i,3,13,'#787870'); px(c,i,24,6,'#6a6a62');
  // Tiny stone fragments
  px(c,i,7,8,'#707068'); px(c,i,15,16,'#707068'); px(c,i,23,24,'#707068');
}

function drawBones(c: Ctx, i: number) {
  // Bone-littered stone floor — detailed skull, femur, ribs, fragments with shadows
  fill(c, i, '#a09078');
  // Stone base with brick pattern
  for (let row = 0; row < 8; row++) {
    const by = row * 4;
    const off = row % 2 === 0 ? 0 : 5;
    blk(c,i,0,by+3,S,1,'#585850');
    for (let col = -1; col < 5; col++) {
      const bx = off + col * 10;
      if (bx >= S) break;
      const cx2 = Math.max(0, bx);
      const cw = Math.min(10, S - cx2);
      if (cw <= 0) continue;
      const shade = ['#a89878','#a09078','#808078','#989890'][(row+col)&3];
      blk(c,i,cx2,by,cw,3,shade);
      blk(c,i,cx2,by,cw,1,'#a0a098');
      if (bx > 0 && bx < S) blk(c,i,bx,by,1,3,'#585850');
    }
  }

  // Shadow beneath bones cluster (cast on ground)
  blk(c,i,3,8,8,2,'#686860'); blk(c,i,8,15,14,2,'#686860');
  blk(c,i,21,24,7,2,'#686860');

  // === SKULL (top-left, recognizable shape) ===
  // Cranium (rounded top)
  blk(c,i,5,2,6,1,'#d8d0c0'); // top of head
  blk(c,i,4,3,8,1,'#e0d8c8');
  blk(c,i,3,4,10,1,'#fff8e8'); // widest part
  blk(c,i,3,5,10,1,'#e0d8c8');
  blk(c,i,3,6,10,1,'#ddd5c5');
  blk(c,i,4,7,8,1,'#d8d0c0');
  // Eye sockets (dark)
  blk(c,i,4,5,3,2,'#282018'); blk(c,i,9,5,3,2,'#282018');
  // Eye socket highlights (bone around eyes)
  px(c,i,4,4,'#f0e8d8'); px(c,i,11,4,'#f0e8d8');
  // Nose cavity
  px(c,i,7,7,'#403830'); px(c,i,8,7,'#403830');
  // Jaw / teeth
  blk(c,i,4,8,8,1,'#d0c8b8');
  px(c,i,5,8,'#c8c0b0'); px(c,i,6,8,'#e0d8c8'); px(c,i,7,8,'#c8c0b0');
  px(c,i,8,8,'#e0d8c8'); px(c,i,9,8,'#c8c0b0'); px(c,i,10,8,'#e0d8c8');
  blk(c,i,5,9,6,1,'#e8dcb8'); // jaw line
  // Skull highlight
  px(c,i,6,3,'#f0ead8'); px(c,i,7,3,'#f0ead8');

  // === FEMUR BONE (horizontal, center area) ===
  // Shaft
  blk(c,i,8,14,16,2,'#e0d8c8');
  blk(c,i,8,14,16,1,'#ece4d4'); // top highlight
  // Left knob (ball joint)
  blk(c,i,6,13,4,4,'#ddd5c5');
  px(c,i,7,12,'#d0c8b8'); px(c,i,8,12,'#d0c8b8'); // top curve
  px(c,i,6,13,'#c8c0b0'); // shadow side
  px(c,i,7,13,'#f0e8d8'); // highlight
  // Right knob (ball joint)
  blk(c,i,22,13,4,4,'#ddd5c5');
  px(c,i,23,12,'#d0c8b8'); px(c,i,24,12,'#d0c8b8');
  px(c,i,25,13,'#c8c0b0');
  px(c,i,23,13,'#f0e8d8');

  // === SECOND SKULL (smaller, bottom-right, slightly rotated) ===
  blk(c,i,23,19,5,1,'#d0c8b8');
  blk(c,i,22,20,7,1,'#d8d0c0');
  blk(c,i,22,21,7,1,'#ddd5c5');
  blk(c,i,22,22,7,1,'#d8d0c0');
  blk(c,i,23,23,5,1,'#c8c0b0');
  // Eyes
  px(c,i,23,21,'#282018'); px(c,i,26,21,'#282018');
  px(c,i,24,22,'#403830'); // nose
  px(c,i,23,23,'#e8dcb8'); px(c,i,25,23,'#e8dcb8'); // teeth hints

  // === RIB FRAGMENTS ===
  // Ribs (curved bone arcs)
  px(c,i,16,3,'#d0c8b8'); px(c,i,17,4,'#d8d0c0'); px(c,i,18,5,'#d0c8b8');
  px(c,i,19,5,'#c8c0b0'); px(c,i,20,4,'#d0c8b8');
  // Second rib
  px(c,i,17,6,'#c8c0b0'); px(c,i,18,7,'#d0c8b8'); px(c,i,19,7,'#c8c0b0');

  // === SCATTERED SMALL BONE FRAGMENTS ===
  blk(c,i,1,20,3,1,'#d0c8b8'); blk(c,i,2,21,2,1,'#c8c0b0'); // small bone
  blk(c,i,28,10,3,1,'#d8d0c0'); // shard
  blk(c,i,14,26,5,1,'#d0c8b8'); blk(c,i,15,27,3,1,'#c8c0b0'); // fragment
  px(c,i,0,28,'#c8c0b0'); px(c,i,30,6,'#c8c0b0'); // tiny chips
  blk(c,i,26,2,2,1,'#d0c8b8'); // tooth
  px(c,i,12,22,'#c8c0b0'); px(c,i,4,16,'#d0c8b8'); // chips
}

function drawCobweb(c: Ctx, i: number) {
  // Stone wall with detailed cobweb radiating from top-right corner, spider
  // Stone wall base (matching WALL_STONE)
  fill(c, i, '#a09078');
  for (let r = 0; r < 4; r++) {
    const by = r * 8; const off = r%2===0?0:7;
    blk(c,i,0,by+7,S,1,'#585850');
    for (let col = -1; col < 4; col++) {
      const bx = off+col*16; const cx2 = Math.max(0,bx);
      const cw = Math.min(14,S-cx2); if (cw<=0) continue;
      const sh = ['#a89878','#a09078','#808078','#989890'][(r+col)&3];
      blk(c,i,cx2,by,cw,7,sh);
      blk(c,i,cx2,by,cw,1,'#a8a8a0');
      blk(c,i,cx2,by+6,cw,1,'#686860');
    }
  }

  // === WEB STRANDS radiating from top-right corner (S-1, 0) ===
  // Main diagonal strand (thick, primary support)
  for (let d = 0; d < 30; d++) {
    const wx = S - 1 - d; const wy = Math.floor(d * 0.95);
    if (wx >= 0 && wy < S) { px(c,i,wx,wy,'#c8c8c0'); if (wx > 0) px(c,i,wx-1,wy,'#b0b0a8'); }
  }
  // Upper horizontal strand
  for (let x = 4; x < S; x++) {
    const wy = Math.max(0, Math.floor((S - 1 - x) * 0.12));
    if (wy < S) px(c,i,x,wy,'#b8b8b0');
  }
  // Side vertical strand (right edge)
  for (let y = 0; y < 28; y++) {
    const wx = S - 1 - Math.floor(y * 0.12);
    if (wx >= 0) px(c,i,wx,y,'#b8b8b0');
  }
  // Secondary diagonal (shallower angle)
  for (let d = 0; d < 22; d++) {
    const wx = S - 1 - Math.floor(d * 1.3); const wy = Math.floor(d * 0.5);
    if (wx >= 0 && wy < S) px(c,i,wx,wy,'#a8a8a0');
  }
  // Third strand (steeper)
  for (let d = 0; d < 22; d++) {
    const wx = S - 1 - Math.floor(d * 0.5); const wy = Math.floor(d * 1.2);
    if (wx >= 0 && wy < S) px(c,i,wx,wy,'#a8a8a0');
  }

  // Concentric web circles connecting the strands (3 rings)
  // Ring 1 (close to corner, r~8)
  const ring1: [number,number][] = [
    [S-3,6],[S-5,5],[S-7,3],[S-9,2],[S-6,7],[S-4,8],
  ];
  for (const [wx,wy] of ring1) { if (wx >= 0 && wy < S) px(c,i,wx,wy,'#b0b0a8'); }

  // Ring 2 (mid distance, r~16)
  const ring2: [number,number][] = [
    [S-5,13],[S-8,11],[S-11,9],[S-14,6],[S-16,4],[S-18,3],
    [S-4,15],[S-3,16],
  ];
  for (const [wx,wy] of ring2) { if (wx >= 0 && wy < S) px(c,i,wx,wy,'#a0a098'); }

  // Ring 3 (outer, r~24)
  const ring3: [number,number][] = [
    [S-7,21],[S-10,19],[S-14,16],[S-18,13],[S-21,10],[S-24,7],[S-26,5],
    [S-5,23],[S-4,24],
  ];
  for (const [wx,wy] of ring3) { if (wx >= 0 && wy < S) px(c,i,wx,wy,'#989890'); }

  // Web dew drops (tiny bright dots on strands)
  px(c,i,S-6,4,'#e0e0d8'); px(c,i,S-12,8,'#d8d8d0');
  px(c,i,S-18,12,'#e0e0d8'); px(c,i,S-8,18,'#d8d8d0');

  // === SPIDER silhouette (on the web, 4px body) ===
  // Body (abdomen + head)
  blk(c,i,20,10,3,3,'#201820'); // abdomen
  blk(c,i,22,9,2,2,'#282028'); // head (cephalothorax)
  px(c,i,20,10,'#302830'); // abdomen highlight
  // Legs (8 legs, 4 per side)
  px(c,i,19,9,'#201820'); px(c,i,18,8,'#201820'); // front-left 1
  px(c,i,19,11,'#201820'); px(c,i,18,12,'#201820'); // back-left 1
  px(c,i,19,10,'#201820'); px(c,i,18,10,'#201820'); // mid-left
  px(c,i,23,12,'#201820'); px(c,i,24,13,'#201820'); // back-right
  px(c,i,24,9,'#201820'); px(c,i,25,8,'#201820'); // front-right
  px(c,i,24,11,'#201820'); px(c,i,25,12,'#201820'); // mid-right
  // Eyes (tiny red dots)
  px(c,i,23,9,'#a03020'); px(c,i,22,9,'#a03020');
}

function drawChains(c: Ctx, i: number) {
  // Stone wall with detailed hanging chains, manacles, rust spots
  // Stone wall base
  fill(c, i, '#a09078');
  for (let r = 0; r < 4; r++) {
    const by = r * 8; const off = r%2===0?0:7;
    blk(c,i,0,by+7,S,1,'#585850');
    for (let col = -1; col < 4; col++) {
      const bx = off+col*16; const cx2 = Math.max(0,bx);
      const cw = Math.min(14,S-cx2); if (cw<=0) continue;
      const sh = ['#a89878','#a09078','#808078','#989890'][(r+col)&3];
      blk(c,i,cx2,by,cw,7,sh);
      blk(c,i,cx2,by,cw,1,'#a8a8a0');
      blk(c,i,cx2,by+6,cw,1,'#686860');
    }
  }

  // === ANCHOR BOLTS (mounted in wall) ===
  // Left bolt (square plate + bolt head)
  blk(c,i,8,1,6,4,'#484850'); blk(c,i,9,2,4,2,'#585860');
  px(c,i,10,2,'#707078'); px(c,i,12,2,'#707078'); // bolt highlights
  blk(c,i,8,1,6,1,'#606068'); // top highlight
  blk(c,i,8,4,6,1,'#383840'); // bottom shadow
  // Right bolt
  blk(c,i,20,1,6,4,'#484850'); blk(c,i,21,2,4,2,'#585860');
  px(c,i,22,2,'#707078'); px(c,i,24,2,'#707078');
  blk(c,i,20,1,6,1,'#606068'); blk(c,i,20,4,6,1,'#383840');

  // === LEFT CHAIN (alternating oval links with metallic shading) ===
  for (let ly = 5; ly < 24; ly += 4) {
    // Vertical link (oval shape)
    blk(c,i,10,ly,2,4,'#606870');
    px(c,i,9,ly+1,'#606870'); px(c,i,12,ly+1,'#606870'); // oval sides
    px(c,i,9,ly+2,'#606870'); px(c,i,12,ly+2,'#606870');
    // Metallic highlight on top
    px(c,i,10,ly,'#90a0a8'); px(c,i,11,ly,'#8898a0');
    // Shadow on bottom
    px(c,i,10,ly+3,'#484850'); px(c,i,11,ly+3,'#484850');
    // Connecting horizontal bar (between links)
    if (ly + 4 < 24) {
      blk(c,i,9,ly+3,4,1,'#707880');
      px(c,i,10,ly+3,'#808890'); // shine
    }
  }

  // === RIGHT CHAIN (offset by 2) ===
  for (let ly = 5; ly < 26; ly += 4) {
    blk(c,i,22,ly,2,4,'#606870');
    px(c,i,21,ly+1,'#606870'); px(c,i,24,ly+1,'#606870');
    px(c,i,21,ly+2,'#606870'); px(c,i,24,ly+2,'#606870');
    px(c,i,22,ly,'#90a0a8'); px(c,i,23,ly,'#8898a0');
    px(c,i,22,ly+3,'#484850'); px(c,i,23,ly+3,'#484850');
    if (ly + 4 < 26) {
      blk(c,i,21,ly+3,4,1,'#707880');
      px(c,i,22,ly+3,'#808890');
    }
  }

  // === LEFT MANACLE (closed shackle at bottom) ===
  // Ring shape
  blk(c,i,7,24,8,2,'#586068'); blk(c,i,6,26,10,3,'#586068');
  blk(c,i,7,29,8,2,'#586068');
  // Inner opening
  blk(c,i,8,26,6,3,'#484850');
  // Hinge
  px(c,i,6,26,'#505860'); px(c,i,6,28,'#505860');
  // Lock mechanism
  blk(c,i,14,26,2,3,'#505058'); px(c,i,15,27,'#707078');
  // Metallic highlights
  blk(c,i,7,24,8,1,'#788088'); px(c,i,8,25,'#90a0a8');
  // Shadow
  blk(c,i,7,30,8,1,'#404048');

  // === RIGHT MANACLE (open/broken shackle) ===
  blk(c,i,19,26,8,3,'#586068'); blk(c,i,19,29,8,2,'#586068');
  blk(c,i,18,26,2,3,'#586068'); // left arm
  blk(c,i,26,26,2,2,'#586068'); // right arm (broken, shorter)
  blk(c,i,20,27,6,2,'#484850'); // inner
  blk(c,i,19,26,8,1,'#788088'); // highlight
  px(c,i,27,26,'#707078'); // broken edge glint

  // === RUST SPOTS (brown pixels on metal) ===
  px(c,i,10,8,'#8a6038'); px(c,i,11,12,'#7a5030'); px(c,i,10,18,'#8a6038');
  px(c,i,22,10,'#8a6038'); px(c,i,23,16,'#7a5030'); px(c,i,22,22,'#8a6038');
  px(c,i,8,27,'#7a5030'); px(c,i,12,28,'#8a6038');
  px(c,i,20,28,'#7a5030'); px(c,i,24,27,'#8a6038');
}

function drawMossStone(c: Ctx, i: number) {
  // Mossy stone floor — full stone base with rich moss in cracks, edges, and patches
  fill(c, i, '#a09078');
  // Stone brick pattern
  for (let row = 0; row < 8; row++) {
    const by = row * 4;
    const off = row % 2 === 0 ? 0 : 5;
    blk(c,i,0,by+3,S,1,'#585850');
    for (let col = -1; col < 5; col++) {
      const bx = off + col * 10;
      if (bx >= S) break;
      const cx2 = Math.max(0, bx);
      const cw = Math.min(10, S - cx2);
      if (cw <= 0) continue;
      const shade = ['#a89878','#a09078','#808078','#989890'][(row+col)&3];
      blk(c,i,cx2,by,cw,3,shade);
      blk(c,i,cx2,by,cw,1,'#a0a098');
      if (bx > 0 && bx < S) blk(c,i,bx,by,1,3,'#585850');
    }
  }

  // === LARGE MOSS PATCH (bottom-left, spreading organically) ===
  blk(c,i,0,20,10,8,'#3a6830'); // dark base
  blk(c,i,1,21,8,6,'#487838'); // mid green
  blk(c,i,2,22,6,4,'#588848'); // lighter inner
  blk(c,i,3,23,4,2,'#68a058'); // bright new growth center
  // Organic edge pixels (feathered)
  px(c,i,10,21,'#487838'); px(c,i,10,23,'#3a6830'); px(c,i,11,22,'#3a6830');
  px(c,i,0,19,'#3a6830'); px(c,i,1,19,'#487838'); px(c,i,8,28,'#3a6830');
  px(c,i,9,20,'#487838'); px(c,i,0,28,'#487838');

  // === TOP-RIGHT MOSS CLUSTER ===
  blk(c,i,22,0,10,6,'#3a6830');
  blk(c,i,23,1,8,4,'#487838');
  blk(c,i,24,2,6,2,'#588848');
  blk(c,i,26,2,3,1,'#68a058'); // bright center
  px(c,i,21,1,'#3a6830'); px(c,i,21,3,'#487838');
  px(c,i,30,5,'#3a6830'); px(c,i,28,5,'#487838');

  // === MOSS IN MORTAR CRACKS (along horizontal joints) ===
  // Row 1 mortar (y=3)
  for (let x = 6; x < 18; x++) { px(c,i,x,3,x%3===0?'#588848':'#487038'); }
  // Row 2 mortar (y=7)
  for (let x = 12; x < 28; x++) { px(c,i,x,7,x%3===0?'#68a058':'#507840'); }
  // Row 4 mortar (y=15)
  for (let x = 4; x < 14; x++) { px(c,i,x,15,x%4===0?'#588848':'#487038'); }
  // Row 6 mortar (y=23) — partly covered by big patch
  for (let x = 14; x < 26; x++) { px(c,i,x,23,x%3===0?'#507840':'#3a6830'); }

  // === MOSS IN VERTICAL MORTAR JOINTS ===
  px(c,i,5,0,'#487038'); px(c,i,5,1,'#507840'); px(c,i,5,2,'#487038');
  px(c,i,15,4,'#487038'); px(c,i,15,5,'#507840'); px(c,i,15,6,'#487038');
  px(c,i,10,8,'#3a6830'); px(c,i,10,9,'#487038'); px(c,i,10,10,'#3a6830');
  px(c,i,20,12,'#487038'); px(c,i,20,13,'#507840');

  // === SMALL SCATTERED MOSS SPOTS ===
  blk(c,i,14,10,3,2,'#487838'); px(c,i,15,10,'#588848');
  blk(c,i,28,16,3,3,'#3a6830'); px(c,i,29,17,'#487838');
  blk(c,i,16,18,2,2,'#487838'); px(c,i,16,18,'#588848');
  px(c,i,2,12,'#487038'); px(c,i,8,6,'#3a6830'); px(c,i,26,10,'#487038');

  // === MOISTURE HIGHLIGHTS (dew/wet spots on moss) ===
  px(c,i,4,23,'#90b888'); px(c,i,6,24,'#80a878'); px(c,i,2,22,'#90b888');
  px(c,i,25,2,'#90b888'); px(c,i,27,3,'#80a878');
  px(c,i,8,7,'#80a078'); px(c,i,14,10,'#80a878');
  px(c,i,15,15,'#80a078'); px(c,i,29,17,'#90b888');
}

function drawBloodStone(c: Ctx, i: number) {
  // Blood-stained stone floor — stone base with irregular pools, splatter, dried blood
  fill(c, i, '#a09078');
  // Stone brick pattern
  for (let row = 0; row < 8; row++) {
    const by = row * 4;
    const off = row % 2 === 0 ? 0 : 5;
    blk(c,i,0,by+3,S,1,'#585850');
    for (let col = -1; col < 5; col++) {
      const bx = off + col * 10;
      if (bx >= S) break;
      const cx2 = Math.max(0, bx);
      const cw = Math.min(10, S - cx2);
      if (cw <= 0) continue;
      const shade = ['#a89878','#a09078','#808078','#989890'][(row+col)&3];
      blk(c,i,cx2,by,cw,3,shade);
      blk(c,i,cx2,by,cw,1,'#a0a098');
      if (bx > 0 && bx < S) blk(c,i,bx,by,1,3,'#585850');
    }
  }

  // === MAIN BLOOD POOL (irregular shape, center-left) ===
  // Outer dried edge (darkest, oldest blood)
  blk(c,i,6,7,16,12,'#4a1818');
  // Irregular outer shape — organic, not rectangular
  px(c,i,5,8,'#4a1818'); px(c,i,5,10,'#4a1818'); px(c,i,5,12,'#4a1818');
  px(c,i,22,9,'#4a1818'); px(c,i,22,11,'#4a1818'); px(c,i,22,13,'#4a1818');
  px(c,i,8,6,'#4a1818'); px(c,i,10,6,'#4a1818'); px(c,i,14,6,'#4a1818');
  px(c,i,8,19,'#4a1818'); px(c,i,12,19,'#4a1818'); px(c,i,16,19,'#4a1818');
  // Mid layer (semi-dried)
  blk(c,i,8,9,12,8,'#6a2020');
  px(c,i,7,10,'#6a2020'); px(c,i,7,12,'#6a2020'); px(c,i,20,10,'#6a2020');
  px(c,i,20,12,'#6a2020');
  // Inner wet pool (brighter, fresher blood)
  blk(c,i,10,10,8,5,'#802828');
  blk(c,i,11,11,6,3,'#903030');
  // Wet shiny center (freshest)
  blk(c,i,12,12,4,1,'#a83838');
  px(c,i,13,12,'#b84040'); px(c,i,14,12,'#b84040'); // glint

  // === SECONDARY POOL (bottom-right, smaller) ===
  blk(c,i,20,20,8,6,'#4a1818');
  blk(c,i,21,21,6,4,'#6a2020');
  blk(c,i,22,22,4,2,'#802828');
  px(c,i,23,22,'#903030'); // wet center
  // Irregular edges
  px(c,i,19,21,'#4a1818'); px(c,i,28,22,'#4a1818');
  px(c,i,22,26,'#4a1818'); px(c,i,24,26,'#4a1818');

  // === SPLATTER MARKS (single dark red pixels scattered outward) ===
  // From main pool
  px(c,i,4,5,'#702020'); px(c,i,3,4,'#601818');
  px(c,i,24,6,'#702020'); px(c,i,26,5,'#681818');
  px(c,i,2,14,'#682020'); px(c,i,1,16,'#601818');
  px(c,i,24,16,'#702020'); px(c,i,26,18,'#681818');
  // From secondary pool
  px(c,i,18,20,'#682020'); px(c,i,29,20,'#601818');
  px(c,i,22,27,'#682020'); px(c,i,20,28,'#601818');

  // === DROPLET TRAIL (leading to main pool) ===
  px(c,i,28,2,'#702020'); px(c,i,27,4,'#6a2020');
  px(c,i,26,6,'#682020'); px(c,i,25,7,'#6a2020');

  // === DRIED BLOOD IN MORTAR CRACKS ===
  // Horizontal mortar lines with blood seeped in
  for (let x = 6; x < 22; x++) {
    if (x % 2 === 0) px(c,i,x,7,'#501818');
    if (x % 2 === 1) px(c,i,x,11,'#481010');
    if (x % 3 === 0) px(c,i,x,15,'#501818');
    if (x % 2 === 0) px(c,i,x,19,'#481010');
  }
  // Vertical mortar cracks with blood
  px(c,i,5,8,'#501818'); px(c,i,5,9,'#481010'); px(c,i,5,10,'#501818');
  px(c,i,15,8,'#481010'); px(c,i,15,9,'#501818'); px(c,i,15,10,'#481010');

  // === SMEAR MARKS (drag marks in blood) ===
  blk(c,i,4,20,3,1,'#582020'); blk(c,i,3,21,4,1,'#501818');
  blk(c,i,2,22,3,1,'#481010');
  // Another smear
  blk(c,i,14,24,5,1,'#582020'); blk(c,i,13,25,4,1,'#501818');
}
