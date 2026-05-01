#!/usr/bin/env node
/**
 * Pixel-verification tool for the Kenney Roguelike/RPG sprite atlas.
 *
 * Generates two contact sheets we can read with the Read tool to
 * eyeball the actual sprite at each (row, col) on the sheet:
 *
 *   tools/_out/contact-sheet-mapped.png — all current TILE_SPRITE_MAP
 *     entries cropped & labeled with their semantic name. Use this to
 *     spot which mappings are wrong (e.g. GRASS_FLOWER_YELLOW pointing
 *     at a barrel sprite).
 *
 *   tools/_out/full-grid-overview.png — every cell in rows 0-30 cols
 *     0-50 with row/col labels. Use this to find correct coords for
 *     any mapping that needs to be fixed.
 *
 * Atlas layout: 968×526, 57×31 cells of 16×16 with 1px gap (pitch 17).
 */
import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHEET = join(__dirname, '..', 'public', 'assets', 'tilesets', 'roguelike-rpg_packed.png');
const OUT_DIR = join(__dirname, '_out');
const TILE = 16;
const PITCH = 17;

// Every entry in TILE_SPRITE_MAP from src/scenes/tiles/tileMap.ts as of c112a41.
const MAPPED = [
  // Ground
  ['GRASS_DARK', 26, 10],
  ['GRASS_LIGHT', 26, 10],
  ['PATH', 26, 1],
  ['PATH_EDGE', 25, 1],
  ['WATER', 1, 1],
  ['BUSH', 9, 25],
  ['FENCE', 8, 37],
  ['WELL', 6, 32],
  // Buildings (currently disabled but listed)
  ['FLOOR_WOOD', 14, 7],
  ['FLOOR_STONE', 26, 4],
  // Expanded outdoor
  ['GRASS_FLOWER_RED', 9, 35],
  ['GRASS_FLOWER_YELLOW', 9, 36],
  ['GRASS_FLOWER_BLUE', 9, 37],
  ['GRASS_TUFT', 10, 25],
  ['SAND', 26, 7],
  ['SAND_EDGE', 25, 7],
  ['TEAL_FLOOR', 26, 16],
  ['COBBLE', 27, 4],
  ['COBBLE_EDGE', 25, 4],
  ['PATH_CORNER_NW', 25, 0],
  ['PATH_CORNER_NE', 25, 2],
  ['PATH_CORNER_SW', 27, 0],
  ['PATH_CORNER_SE', 27, 2],
  ['PATH_EDGE_W', 26, 0],
  ['PATH_EDGE_E', 26, 2],
  ['PATH_EDGE_S', 27, 1],
  ['WATER_EDGE_N', 0, 1],
  ['WATER_EDGE_S', 2, 1],
  ['WATER_EDGE_W', 1, 0],
  ['WATER_EDGE_E', 1, 2],
  ['WATER_ROCK', 2, 0],
  ['STAIRS_UP', 4, 32],
  ['STAIRS_DOWN', 4, 33],
  // Flora
  ['TREE_PINE', 9, 28],
  ['TREE_OAK', 11, 28],
  ['TREE_DEAD', 9, 27],
  ['BUSH_BERRY', 9, 26],
  ['ROCK_SMALL', 8, 34],
  ['ROCK_LARGE', 7, 34],
  ['BOULDER', 7, 33],
  ['STUMP', 10, 27],
  // Decorations / furniture
  ['FENCE_H', 8, 38],
  ['FENCE_V', 9, 37],
  ['FENCE_GATE', 10, 37],
  ['SIGN', 7, 32],
  ['LAMP_POST', 5, 32],
  ['LANTERN', 5, 33],
  // Interiors
  ['FLOOR_PLANK_V', 14, 7],
  ['FLOOR_PLANK_H', 15, 7],
  ['CARPET_RED', 16, 15],
  ['CARPET_BLUE', 16, 17],
  ['CARPET_EDGE', 15, 15],
  ['TABLE_SMALL', 6, 39],
  ['BENCH', 7, 39],
  ['CHAIR_WOOD', 6, 40],
];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const img = await loadImage(SHEET);
  console.log(`Loaded ${SHEET} (${img.width}×${img.height})`);

  // ── Contact sheet 1: every mapped entry, scaled 6x with label ──
  {
    const SCALE = 6;
    const CELL = TILE * SCALE; // 96
    const COLS = 6;
    const PAD = 6;
    const LABEL_H = 22;
    const COL_W = CELL + PAD * 2 + 80;
    const ROW_H = CELL + PAD * 2 + LABEL_H;
    const ROWS = Math.ceil(MAPPED.length / COLS);
    const W = COL_W * COLS;
    const H = ROW_H * ROWS;
    const cv = createCanvas(W, H);
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    // White background so transparency is obvious
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.font = '11px monospace';

    MAPPED.forEach(([name, row, col], idx) => {
      const cy = Math.floor(idx / COLS);
      const cx = idx % COLS;
      const dx = cx * COL_W + PAD;
      const dy = cy * ROW_H + PAD;
      const sx = col * PITCH;
      const sy = row * PITCH;
      // Magenta backdrop behind the cell so transparency is visible
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(dx, dy, CELL, CELL);
      ctx.drawImage(img, sx, sy, TILE, TILE, dx, dy, CELL, CELL);
      // Border
      ctx.strokeStyle = '#000';
      ctx.strokeRect(dx, dy, CELL, CELL);
      // Label
      ctx.fillStyle = '#000';
      ctx.fillText(`${name}`, dx, dy + CELL + 14);
      ctx.fillText(`(${row},${col})`, dx, dy + CELL + 26);
    });

    const buf = cv.toBuffer('image/png');
    const out = join(OUT_DIR, 'contact-sheet-mapped.png');
    writeFileSync(out, buf);
    console.log(`Wrote ${out} (${(buf.length / 1024).toFixed(1)} KB, ${COLS}x${ROWS} grid)`);
  }

  // ── Contact sheet 2: full grid overview rows 0-31 cols 0-30 ──
  {
    const SCALE = 4;
    const CELL = TILE * SCALE; // 64
    const COLS_TO_SHOW = 31; // first half of the sheet (cols 0-30)
    const ROWS_TO_SHOW = 31;
    const PAD = 1;
    const LABEL_W = 22;
    const LABEL_H = 14;
    const W = LABEL_W + COLS_TO_SHOW * (CELL + PAD);
    const H = LABEL_H + ROWS_TO_SHOW * (CELL + PAD);
    const cv = createCanvas(W, H);
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.font = '8px monospace';
    // Column labels
    ctx.fillStyle = '#000';
    for (let c = 0; c < COLS_TO_SHOW; c++) {
      ctx.fillText(String(c), LABEL_W + c * (CELL + PAD) + 2, 10);
    }
    for (let r = 0; r < ROWS_TO_SHOW; r++) {
      ctx.fillText(String(r), 2, LABEL_H + r * (CELL + PAD) + 12);
      for (let c = 0; c < COLS_TO_SHOW; c++) {
        const sx = c * PITCH;
        const sy = r * PITCH;
        const dx = LABEL_W + c * (CELL + PAD);
        const dy = LABEL_H + r * (CELL + PAD);
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(dx, dy, CELL, CELL);
        ctx.drawImage(img, sx, sy, TILE, TILE, dx, dy, CELL, CELL);
      }
    }
    const buf = cv.toBuffer('image/png');
    const out = join(OUT_DIR, 'full-grid-left-half.png');
    writeFileSync(out, buf);
    console.log(`Wrote ${out} (${(buf.length / 1024).toFixed(1)} KB)`);
  }

  // ── Contact sheet 3: full grid right half (cols 31-56) ──
  {
    const SCALE = 4;
    const CELL = TILE * SCALE;
    const COLS_TO_SHOW = 26; // cols 31-56
    const ROWS_TO_SHOW = 31;
    const COL_OFFSET = 31;
    const PAD = 1;
    const LABEL_W = 22;
    const LABEL_H = 14;
    const W = LABEL_W + COLS_TO_SHOW * (CELL + PAD);
    const H = LABEL_H + ROWS_TO_SHOW * (CELL + PAD);
    const cv = createCanvas(W, H);
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#000';
    for (let c = 0; c < COLS_TO_SHOW; c++) {
      ctx.fillText(String(c + COL_OFFSET), LABEL_W + c * (CELL + PAD) + 2, 10);
    }
    for (let r = 0; r < ROWS_TO_SHOW; r++) {
      ctx.fillText(String(r), 2, LABEL_H + r * (CELL + PAD) + 12);
      for (let c = 0; c < COLS_TO_SHOW; c++) {
        const sx = (c + COL_OFFSET) * PITCH;
        const sy = r * PITCH;
        const dx = LABEL_W + c * (CELL + PAD);
        const dy = LABEL_H + r * (CELL + PAD);
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(dx, dy, CELL, CELL);
        ctx.drawImage(img, sx, sy, TILE, TILE, dx, dy, CELL, CELL);
      }
    }
    const buf = cv.toBuffer('image/png');
    const out = join(OUT_DIR, 'full-grid-right-half.png');
    writeFileSync(out, buf);
    console.log(`Wrote ${out} (${(buf.length / 1024).toFixed(1)} KB)`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
