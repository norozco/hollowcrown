import * as Phaser from 'phaser';

/**
 * Procedural pixel-art tile generator — SNES Zelda (ALTTP) quality target.
 *
 * Each tile is 32×32 with 4-6 colors, deliberate pixel patterns (not
 * random scatter), highlight/shadow edges, and enough detail to read
 * as hand-drawn at 1× zoom.
 *
 * Tile indices:
 *   0  = grass (dark, base)
 *   1  = grass (light, transition variant)
 *   2  = dirt path (center)
 *   3  = stone wall (face — the visible front of a wall)
 *   4  = wood wall (plank face)
 *   5  = door opening
 *   6  = wood floor (interior)
 *   7  = stone floor (interior)
 *   8  = roof (brown/red clay tiles)
 *   9  = roof edge / overhang (casts shadow below)
 *   10 = shadow strip (at building base)
 *   11 = bush / hedge
 *   12 = fence post
 *   13 = path edge (grass-to-path blend)
 *   14 = well / decoration
 *   15 = water
 */

export const TILE = {
  GRASS_DARK: 0,
  GRASS_LIGHT: 1,
  PATH: 2,
  WALL_STONE: 3,
  WALL_WOOD: 4,
  DOOR: 5,
  FLOOR_WOOD: 6,
  FLOOR_STONE: 7,
  ROOF: 8,
  ROOF_EDGE: 9,
  SHADOW: 10,
  BUSH: 11,
  FENCE: 12,
  PATH_EDGE: 13,
  WELL: 14,
  WATER: 15,
} as const;

export const TILE_SIZE = 32;
const TILE_COUNT = 16;

export function generateTileset(scene: Phaser.Scene): void {
  if (scene.textures.exists('tileset')) return;

  const canvas = document.createElement('canvas');
  canvas.width = TILE_COUNT * TILE_SIZE;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext('2d')!;

  drawGrassDark(ctx, 0);
  drawGrassLight(ctx, 1);
  drawPath(ctx, 2);
  drawWallStone(ctx, 3);
  drawWallWood(ctx, 4);
  drawDoor(ctx, 5);
  drawFloorWood(ctx, 6);
  drawFloorStone(ctx, 7);
  drawRoof(ctx, 8);
  drawRoofEdge(ctx, 9);
  drawShadow(ctx, 10);
  drawBush(ctx, 11);
  drawFence(ctx, 12);
  drawPathEdge(ctx, 13);
  drawWell(ctx, 14);
  drawWater(ctx, 15);

  const tex = scene.textures.addCanvas('tileset', canvas);
  if (tex) {
    for (let i = 0; i < TILE_COUNT; i++) {
      tex.add(i, 0, i * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────

type Ctx = CanvasRenderingContext2D;
const S = TILE_SIZE;

function ox(idx: number) {
  return idx * S;
}

function px(ctx: Ctx, idx: number, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(ox(idx) + x, y, 1, 1);
}

function rect(ctx: Ctx, idx: number, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(ox(idx) + x, y, w, h);
}

function fill(ctx: Ctx, idx: number, color: string) {
  rect(ctx, idx, 0, 0, S, S, color);
}

// ─── Grass (dark) ─────────────────────────────────────────────

function drawGrassDark(ctx: Ctx, idx: number) {
  const base = '#2d6b30';
  const dark = '#1e5222';
  const mid  = '#3a7a3a';
  const lite = '#4a8a48';
  const tip  = '#5a9a58';

  fill(ctx, idx, base);

  // Grass tufts — small V-shapes scattered deliberately
  const tufts: [number, number][] = [
    [4, 6], [14, 3], [24, 8], [8, 18], [20, 14], [28, 22], [2, 26], [16, 28], [12, 12],
  ];
  for (const [tx, ty] of tufts) {
    // Shadow under tuft
    px(ctx, idx, tx, ty + 3, dark);
    px(ctx, idx, tx + 1, ty + 3, dark);
    // Tuft body (3px tall V)
    px(ctx, idx, tx, ty + 2, mid);
    px(ctx, idx, tx + 2, ty + 2, mid);
    px(ctx, idx, tx, ty + 1, mid);
    px(ctx, idx, tx + 2, ty + 1, mid);
    // Tips (bright)
    px(ctx, idx, tx, ty, lite);
    px(ctx, idx, tx + 2, ty, lite);
    px(ctx, idx, tx + 1, ty - 1, tip);
  }

  // Subtle dark flecks for depth
  const flecks: [number, number][] = [
    [7, 10], [22, 5], [30, 18], [10, 28], [26, 26], [18, 20], [1, 14],
  ];
  for (const [fx, fy] of flecks) {
    px(ctx, idx, fx, fy, dark);
  }
}

// ─── Grass (light) ────────────────────────────────────────────

function drawGrassLight(ctx: Ctx, idx: number) {
  const base = '#3a7a3a';
  const dark = '#2d6b30';
  const lite = '#4a9248';
  const tip  = '#5aaa58';

  fill(ctx, idx, base);

  const tufts: [number, number][] = [
    [6, 4], [18, 7], [28, 2], [3, 16], [14, 20], [24, 24], [10, 10], [20, 28],
  ];
  for (const [tx, ty] of tufts) {
    px(ctx, idx, tx, ty + 2, dark);
    px(ctx, idx, tx + 1, ty + 2, dark);
    px(ctx, idx, tx, ty + 1, lite);
    px(ctx, idx, tx + 2, ty + 1, lite);
    px(ctx, idx, tx + 1, ty, tip);
  }
}

// ─── Dirt path ────────────────────────────────────────────────

function drawPath(ctx: Ctx, idx: number) {
  const base  = '#c4a060';
  const dark  = '#9a7a48';
  const stone = '#a08850';
  const lite  = '#d4b070';
  const crack = '#8a6a38';

  fill(ctx, idx, base);

  // Embedded stones — rounded rectangles
  const stones: [number, number, number, number][] = [
    [2, 3, 6, 5], [10, 1, 7, 5], [20, 4, 8, 5], [28, 2, 3, 4],
    [4, 14, 5, 4], [12, 12, 7, 5], [22, 15, 6, 4], [1, 24, 6, 5],
    [10, 22, 8, 6], [22, 24, 7, 5], [14, 8, 5, 3],
  ];
  for (const [sx, sy, sw, sh] of stones) {
    rect(ctx, idx, sx, sy, sw, sh, stone);
    // Highlight top edge
    rect(ctx, idx, sx, sy, sw, 1, lite);
    // Shadow bottom edge
    rect(ctx, idx, sx, sy + sh - 1, sw, 1, crack);
    // Dark gap around stone
    rect(ctx, idx, sx - 1, sy, 1, sh, dark);
    rect(ctx, idx, sx + sw, sy, 1, sh, dark);
  }
}

// ─── Stone wall ───────────────────────────────────────────────

function drawWallStone(ctx: Ctx, idx: number) {
  const base   = '#6a6a68';
  const mortar = '#4a4a48';
  const lite   = '#8a8a88';
  const dark   = '#3a3a38';
  const hi     = '#9a9a98';

  fill(ctx, idx, base);

  // 4 rows of bricks, offset pattern
  for (let row = 0; row < 4; row++) {
    const by = row * 8;
    const brickW = 14;
    const off = row % 2 === 0 ? 0 : 7;
    // Mortar line below this row
    rect(ctx, idx, 0, by + 7, S, 1, mortar);
    for (let col = -1; col < 4; col++) {
      const bx = off + col * (brickW + 2);
      if (bx >= S) break;
      const clampX = Math.max(0, bx);
      const clampW = Math.min(brickW, S - clampX);
      if (clampW <= 0) continue;
      // Brick body with slight color variation
      const shade = (row + col) % 3 === 0 ? '#727270' : (row + col) % 3 === 1 ? '#626260' : base;
      rect(ctx, idx, clampX, by, clampW, 7, shade);
      // Top highlight
      rect(ctx, idx, clampX, by, clampW, 1, lite);
      // Bottom shadow
      rect(ctx, idx, clampX, by + 6, clampW, 1, dark);
      // Left highlight
      rect(ctx, idx, clampX, by, 1, 7, lite);
      // Vertical mortar
      if (bx >= 0) rect(ctx, idx, bx, by, 1, 7, mortar);
    }
  }

  // Top shine line
  rect(ctx, idx, 0, 0, S, 1, hi);
}

// ─── Wood wall ────────────────────────────────────────────────

function drawWallWood(ctx: Ctx, idx: number) {
  const base = '#7a5a2e';
  const dark = '#5a3a1a';
  const mid  = '#6a4a22';
  const lite = '#8a6a3a';
  const hi   = '#9a7a4a';

  fill(ctx, idx, base);

  // Vertical planks, each 6-7px wide
  for (let col = 0; col < 5; col++) {
    const px0 = col * 7;
    const w = col < 4 ? 6 : S - px0;
    const shade = col % 2 === 0 ? base : mid;
    rect(ctx, idx, px0, 0, w, S, shade);
    // Left edge highlight
    rect(ctx, idx, px0, 0, 1, S, lite);
    // Right edge shadow
    rect(ctx, idx, px0 + w - 1, 0, 1, S, dark);
    // Knot at pseudo-random position
    if (col % 2 === 0) {
      const ky = 8 + col * 7;
      rect(ctx, idx, px0 + 2, ky, 3, 3, dark);
      px(ctx, idx, px0 + 3, ky + 1, '#4a2a12');
    }
  }
  // Gap lines between planks
  for (let col = 1; col < 5; col++) {
    rect(ctx, idx, col * 7 - 1, 0, 1, S, dark);
  }
  // Top shine
  rect(ctx, idx, 0, 0, S, 1, hi);
}

// ─── Door opening ─────────────────────────────────────────────

function drawDoor(ctx: Ctx, idx: number) {
  fill(ctx, idx, '#1a1210');

  // Door frame (warm wood)
  const frame = '#6a4a28';
  const inner = '#2a2018';
  rect(ctx, idx, 0, 0, S, 3, frame);   // top lintel
  rect(ctx, idx, 0, 0, 4, S, frame);   // left jamb
  rect(ctx, idx, S - 4, 0, 4, S, frame); // right jamb
  // Interior warmth (suggesting light inside)
  rect(ctx, idx, 6, 4, S - 12, S - 4, inner);
  rect(ctx, idx, 10, 8, S - 20, S - 12, '#302418');
  // Threshold stones
  rect(ctx, idx, 4, S - 3, S - 8, 3, '#5a5a48');
  rect(ctx, idx, 4, S - 3, S - 8, 1, '#6a6a58');
}

// ─── Wood floor ───────────────────────────────────────────────

function drawFloorWood(ctx: Ctx, idx: number) {
  const base = '#6a5238';
  const dark = '#5a4228';
  const lite = '#7a6248';
  const gap  = '#4a3220';

  fill(ctx, idx, base);

  // Horizontal planks, each 8px tall
  for (let row = 0; row < 4; row++) {
    const py = row * 8;
    const shade = row % 2 === 0 ? base : lite;
    rect(ctx, idx, 0, py, S, 7, shade);
    rect(ctx, idx, 0, py + 7, S, 1, gap);
    // Offset nail marks
    const nx = row % 2 === 0 ? 6 : 22;
    px(ctx, idx, nx, py + 3, dark);
    px(ctx, idx, nx + 16, py + 3, dark);
  }
}

// ─── Stone floor ──────────────────────────────────────────────

function drawFloorStone(ctx: Ctx, idx: number) {
  const base   = '#5a5a58';
  const mortar = '#3a3a38';
  const lite   = '#6a6a68';
  const dark   = '#4a4a48';

  fill(ctx, idx, base);

  // Large flagstones in a 2×2 grid with offset
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const sx = col * 16 + (row % 2 === 0 ? 0 : 8);
      const sy = row * 16;
      rect(ctx, idx, sx, sy, 15, 15, (row + col) % 2 === 0 ? base : dark);
      rect(ctx, idx, sx, sy, 15, 1, lite);
      rect(ctx, idx, sx, sy, 1, 15, lite);
      rect(ctx, idx, sx + 14, sy, 1, 15, mortar);
      rect(ctx, idx, sx, sy + 14, 15, 1, mortar);
    }
  }
}

// ─── Roof ─────────────────────────────────────────────────────

function drawRoof(ctx: Ctx, idx: number) {
  const base = '#8a3a2a';
  const dark = '#6a2a1a';
  const lite = '#aa4a3a';
  const hi   = '#ba5a4a';

  fill(ctx, idx, base);

  // Overlapping roof tile rows (scalloped pattern like ALTTP)
  for (let row = 0; row < 4; row++) {
    const ry = row * 8;
    const off = row % 2 === 0 ? 0 : 8;
    for (let col = -1; col < 3; col++) {
      const tx = off + col * 16;
      // Individual roof tile — slight arc at bottom
      for (let dy = 0; dy < 8; dy++) {
        const indent = dy < 2 ? 0 : dy < 5 ? 1 : 2;
        const tileColor = dy < 2 ? lite : dy < 6 ? base : dark;
        rect(ctx, idx, Math.max(0, tx + indent), ry + dy,
          Math.min(16 - indent * 2, S - Math.max(0, tx + indent)), 1, tileColor);
      }
      // Highlight at top of each tile
      rect(ctx, idx, Math.max(0, tx + 1), ry, Math.min(14, S - Math.max(0, tx + 1)), 1, hi);
    }
  }
}

// ─── Roof edge (overhang with shadow) ─────────────────────────

function drawRoofEdge(ctx: Ctx, idx: number) {
  // Top half: roof continuation
  const roofBase = '#7a3222';
  const roofDark = '#5a2214';
  fill(ctx, idx, roofBase);

  // Bottom half: shadow it casts on the wall below
  rect(ctx, idx, 0, 16, S, 16, '#2a2a28');
  rect(ctx, idx, 0, 16, S, 4, '#1a1a18');

  // Roof edge lip
  rect(ctx, idx, 0, 14, S, 3, roofDark);
  rect(ctx, idx, 0, 14, S, 1, '#4a1a10');

  // Scalloped edge detail
  for (let col = 0; col < 8; col++) {
    px(ctx, idx, col * 4 + 1, 17, '#3a3a38');
    px(ctx, idx, col * 4 + 2, 17, '#3a3a38');
  }
}

// ─── Shadow strip ─────────────────────────────────────────────

function drawShadow(ctx: Ctx, idx: number) {
  // Dark area at the base of buildings
  const base = '#1a2418';
  fill(ctx, idx, base);

  // Gradient — darkest at top, fading to grass at bottom
  rect(ctx, idx, 0, 0, S, 8, '#0e140e');
  rect(ctx, idx, 0, 8, S, 8, '#141c14');
  rect(ctx, idx, 0, 16, S, 8, '#1a2418');
  rect(ctx, idx, 0, 24, S, 8, '#223a1e');

  // A few grass tips poking through at the bottom
  const tufts: [number, number][] = [[4, 28], [16, 26], [28, 29]];
  for (const [tx, ty] of tufts) {
    px(ctx, idx, tx, ty, '#2d6b30');
    px(ctx, idx, tx + 1, ty - 1, '#3a7a3a');
  }
}

// ─── Bush / hedge ─────────────────────────────────────────────

function drawBush(ctx: Ctx, idx: number) {
  // Grass base underneath
  fill(ctx, idx, '#2d6b30');

  // Round bush shape — a filled ellipse of greens
  const cx = 16, cy = 16, rx = 13, ry = 12;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        const depth = dx * dx + dy * dy;
        const color =
          depth < 0.3 ? '#3a8a3a' :
          depth < 0.6 ? '#2a6a2a' :
          depth < 0.85 ? '#1a5a1a' :
          '#144a14';
        px(ctx, idx, x, y, color);
      }
    }
  }
  // Top highlight spots
  rect(ctx, idx, 12, 6, 3, 2, '#4a9a4a');
  rect(ctx, idx, 18, 8, 2, 2, '#4a9a4a');
  // Bottom shadow
  for (let x = 6; x < 26; x++) {
    px(ctx, idx, x, 27, '#0e3a0e');
    px(ctx, idx, x, 28, '#1a2418');
  }
}

// ─── Fence post ───────────────────────────────────────────────

function drawFence(ctx: Ctx, idx: number) {
  fill(ctx, idx, '#2d6b30'); // grass base

  const wood = '#7a5a30';
  const dark = '#5a3a1a';
  const lite = '#9a7a4a';

  // Vertical post
  rect(ctx, idx, 12, 2, 8, 28, wood);
  rect(ctx, idx, 12, 2, 1, 28, lite);
  rect(ctx, idx, 19, 2, 1, 28, dark);
  // Post cap
  rect(ctx, idx, 10, 0, 12, 4, wood);
  rect(ctx, idx, 10, 0, 12, 1, lite);
  // Post shadow on grass
  rect(ctx, idx, 14, 30, 10, 2, '#1a3a18');
  // Horizontal rail stub extending left and right
  rect(ctx, idx, 0, 10, 12, 4, wood);
  rect(ctx, idx, 20, 10, 12, 4, wood);
  rect(ctx, idx, 0, 10, 12, 1, lite);
  rect(ctx, idx, 20, 10, 12, 1, lite);
}

// ─── Path edge (grass-to-path blend) ──────────────────────────

function drawPathEdge(ctx: Ctx, idx: number) {
  const grass = '#2d6b30';
  const path  = '#c4a060';
  const edge  = '#9a7a48';

  // Top half grass, bottom half path
  fill(ctx, idx, path);
  rect(ctx, idx, 0, 0, S, 14, grass);

  // Ragged transition edge — not a straight line
  const edgeLine = [14, 13, 14, 15, 14, 13, 12, 14, 15, 14, 13, 14, 15, 14, 13, 14,
    14, 15, 13, 14, 12, 14, 15, 14, 13, 14, 15, 14, 13, 12, 14, 15];
  for (let x = 0; x < S; x++) {
    const ey = edgeLine[x];
    rect(ctx, idx, x, ey, 1, 2, edge);
    // A few grass pixels extending into path
    if (x % 5 === 0) {
      px(ctx, idx, x, ey + 2, '#4a7a40');
    }
  }
}

// ─── Well / decoration ────────────────────────────────────────

function drawWell(ctx: Ctx, idx: number) {
  fill(ctx, idx, '#2d6b30'); // grass base

  const stone = '#6a6a68';
  const dark  = '#4a4a48';
  const water = '#2a4a6a';

  // Circular stone well
  for (let y = 6; y < 28; y++) {
    for (let x = 6; x < 26; x++) {
      const dx = (x - 16) / 10;
      const dy = (y - 17) / 10;
      if (dx * dx + dy * dy <= 1) {
        const inner = dx * dx + dy * dy < 0.5;
        px(ctx, idx, x, y, inner ? water : stone);
      }
    }
  }
  // Stone rim highlight
  for (let x = 10; x < 22; x++) {
    px(ctx, idx, x, 7, '#8a8a88');
  }
  // Shadow
  for (let x = 10; x < 24; x++) {
    px(ctx, idx, x, 27, dark);
  }
}

// ─── Water ────────────────────────────────────────────────────

function drawWater(ctx: Ctx, idx: number) {
  const base = '#2a4a6a';
  const dark = '#1a3a5a';
  const lite = '#3a5a7a';
  const hi   = '#4a6a8a';

  fill(ctx, idx, base);

  // Wave ripple lines
  for (let row = 0; row < 4; row++) {
    const wy = row * 8 + 3;
    for (let x = 0; x < S; x++) {
      const off = (row % 2 === 0 ? 0 : 4);
      const phase = (x + off) % 8;
      if (phase < 3) px(ctx, idx, x, wy, lite);
      else if (phase < 5) px(ctx, idx, x, wy, hi);
    }
    // Darker between ripples
    rect(ctx, idx, 0, wy + 2, S, 2, dark);
  }
}
