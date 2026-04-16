import * as Phaser from 'phaser';

/**
 * Procedural pixel-art tile generator. Creates a single spritesheet
 * canvas with all tile types arranged in a row, then registers it as
 * a Phaser texture called 'tileset'. Each tile is 32×32.
 *
 * Tile indices:
 *   0 = grass dark
 *   1 = grass light (path-edge variant)
 *   2 = dirt path
 *   3 = stone wall
 *   4 = wood wall
 *   5 = door threshold
 *   6 = wood floor (interior)
 *   7 = stone floor (interior)
 *
 * Visual target: SNES-era Zelda (A Link to the Past) — crisp pixel
 * patterns, warm earth palette, clear walkable/wall distinction.
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
} as const;

export const TILE_SIZE = 32;
const TILE_COUNT = 8;

/** Call once in a scene's create() before building any tilemap. */
export function generateTileset(scene: Phaser.Scene): void {
  if (scene.textures.exists('tileset')) return; // idempotent

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

  // Phaser 4's addSpriteSheet doesn't accept canvas directly.
  // Use addCanvas to create the base texture, then manually register
  // frames so the tilemap can look up each tile by index.
  const tex = scene.textures.addCanvas('tileset', canvas);
  if (tex) {
    for (let i = 0; i < TILE_COUNT; i++) {
      tex.add(i, 0, i * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
    }
  }
}

// ─── Tile painters ─────────────────────────────────────────────

function fill(ctx: CanvasRenderingContext2D, idx: number, color: string) {
  const x = idx * TILE_SIZE;
  ctx.fillStyle = color;
  ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
}

/** Seeded deterministic scatter — same pattern every boot. */
function scatter(
  ctx: CanvasRenderingContext2D,
  idx: number,
  color: string,
  count: number,
  w: number,
  h: number,
  seed: number,
) {
  ctx.fillStyle = color;
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 16807 + 1) % 2147483647; // Park-Miller LCG
    const px = (s % (TILE_SIZE - w)) + idx * TILE_SIZE;
    s = (s * 16807 + 1) % 2147483647;
    const py = s % (TILE_SIZE - h);
    ctx.fillRect(px, py, w, h);
  }
}

function drawGrassDark(ctx: CanvasRenderingContext2D, idx: number) {
  fill(ctx, idx, '#223a1e');
  scatter(ctx, idx, '#1a2e16', 10, 2, 2, 42);   // dark spots
  scatter(ctx, idx, '#2e4a28', 6, 1, 3, 99);     // light blades
  scatter(ctx, idx, '#2a4222', 4, 2, 4, 7);       // mid blades
}

function drawGrassLight(ctx: CanvasRenderingContext2D, idx: number) {
  fill(ctx, idx, '#2e4a28');
  scatter(ctx, idx, '#223a1e', 6, 2, 2, 55);
  scatter(ctx, idx, '#3a5a34', 5, 1, 3, 33);
  scatter(ctx, idx, '#264420', 3, 2, 3, 11);
}

function drawPath(ctx: CanvasRenderingContext2D, idx: number) {
  fill(ctx, idx, '#5a4a30');
  scatter(ctx, idx, '#4a3a22', 8, 2, 2, 17);     // darker pebbles
  scatter(ctx, idx, '#6a5a3a', 5, 2, 1, 31);     // lighter flecks
  scatter(ctx, idx, '#4e4228', 3, 3, 2, 61);     // wear marks
}

function drawWallStone(ctx: CanvasRenderingContext2D, idx: number) {
  const x = idx * TILE_SIZE;
  fill(ctx, idx, '#4a4a48');
  // Horizontal mortar lines every 8px
  ctx.fillStyle = '#3a3a38';
  for (let row = 0; row < 4; row++) {
    ctx.fillRect(x, row * 8, TILE_SIZE, 1);
  }
  // Vertical mortar — offset each row for a brick pattern
  for (let row = 0; row < 4; row++) {
    const offset = row % 2 === 0 ? 0 : 16;
    ctx.fillRect(x + offset, row * 8, 1, 8);
    ctx.fillRect(x + offset + 16, row * 8, 1, 8);
  }
  // Slight color variation per brick
  scatter(ctx, idx, '#525250', 6, 4, 3, 77);
  scatter(ctx, idx, '#424240', 4, 3, 2, 88);
  // Top highlight
  ctx.fillStyle = '#5a5a58';
  ctx.fillRect(x, 0, TILE_SIZE, 1);
}

function drawWallWood(ctx: CanvasRenderingContext2D, idx: number) {
  const x = idx * TILE_SIZE;
  fill(ctx, idx, '#5a3a1a');
  // Vertical grain lines every 4px
  ctx.fillStyle = '#4a2a12';
  for (let col = 0; col < 8; col++) {
    ctx.fillRect(x + col * 4, 0, 1, TILE_SIZE);
  }
  // Knot marks
  scatter(ctx, idx, '#3a2210', 3, 3, 3, 19);
  // Highlight strips
  scatter(ctx, idx, '#6a4a2a', 4, 1, 6, 47);
  // Top highlight
  ctx.fillStyle = '#6a4a2a';
  ctx.fillRect(x, 0, TILE_SIZE, 1);
}

function drawDoor(ctx: CanvasRenderingContext2D, idx: number) {
  const x = idx * TILE_SIZE;
  fill(ctx, idx, '#1a1210');
  // Door frame (lighter border)
  ctx.fillStyle = '#4a3a20';
  ctx.fillRect(x, 0, TILE_SIZE, 2);           // top frame
  ctx.fillRect(x, 0, 3, TILE_SIZE);           // left frame
  ctx.fillRect(x + TILE_SIZE - 3, 0, 3, TILE_SIZE); // right frame
  // A slight warm glow at center (interior light)
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(x + 8, 4, 16, 24);
}

function drawFloorWood(ctx: CanvasRenderingContext2D, idx: number) {
  const x = idx * TILE_SIZE;
  fill(ctx, idx, '#4a3a28');
  // Plank lines every 8px
  ctx.fillStyle = '#3a2a18';
  for (let row = 0; row < 4; row++) {
    ctx.fillRect(x, row * 8 + 7, TILE_SIZE, 1);
  }
  scatter(ctx, idx, '#5a4a34', 4, 4, 2, 53);
  scatter(ctx, idx, '#3a2e1e', 3, 2, 2, 63);
}

function drawFloorStone(ctx: CanvasRenderingContext2D, idx: number) {
  const x = idx * TILE_SIZE;
  fill(ctx, idx, '#3a3a38');
  // Grid of stone slabs
  ctx.fillStyle = '#2a2a28';
  for (let row = 0; row < 2; row++) {
    ctx.fillRect(x, row * 16 + 15, TILE_SIZE, 1);
  }
  for (let col = 0; col < 2; col++) {
    ctx.fillRect(x + col * 16 + 15, 0, 1, TILE_SIZE);
  }
  scatter(ctx, idx, '#444442', 5, 3, 3, 29);
  scatter(ctx, idx, '#323230', 3, 2, 2, 41);
}
