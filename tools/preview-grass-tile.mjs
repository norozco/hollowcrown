#!/usr/bin/env node
/**
 * Render four candidate base-color options for the grass tile, each
 * shown with a Kenney oak tree alongside for color-match comparison.
 * Pick whichever option looks best, then update GRASS_BASE in
 * src/scenes/tiles/generateTiles.ts to match.
 */
import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '_out', 'grass-tile-preview.png');
const SHEET = join(__dirname, '..', 'public', 'assets', 'tilesets', 'roguelike-rpg_packed.png');

const S = 32;
const PITCH = 17, TILE_PX = 16;

// Four base candidates, dark → bright. Blade palette stays the same.
const OPTIONS = [
  { label: 'A: dark forest #3a7228',  base: '#3a7228', patch1: '#3e7a2c', patch2: '#36702a' },
  { label: 'B: med forest #4a8830',   base: '#4a8830', patch1: '#4e9034', patch2: '#46802c' },
  { label: 'C: bright fern #5ca035',  base: '#5ca035', patch1: '#60a838', patch2: '#589832' },
  { label: 'D: kenney emerald #6cb838', base: '#6cb838', patch1: '#70c03c', patch2: '#68b034' },
];

const GRASS_BLADE_DRK = '#1f4818';
const GRASS_BLADE_MID = '#2a5a20';
const GRASS_HIGHLIGHT = '#88c845';

function ox(i) { return i * S; }
function px(c, i, x, y, col) { c.fillStyle = col; c.fillRect(ox(i)+x, y, 1, 1); }
function blk(c, i, x, y, w, h, col) { c.fillStyle = col; c.fillRect(ox(i)+x, y, w, h); }
function fill(c, i, col) { blk(c, i, 0, 0, S, S, col); }

function paintGrassBase(c, i, opt) {
  fill(c, i, opt.base);
  blk(c,i,4,6,6,4,opt.patch1); blk(c,i,18,4,5,4,opt.patch2);
  blk(c,i,2,18,4,5,opt.patch1); blk(c,i,22,20,6,4,opt.patch2);
  blk(c,i,12,24,5,4,opt.patch1);
}

function blade(c, i, x, y, dark, tip) {
  px(c, i, x, y + 1, dark);
  px(c, i, x, y, tip ?? dark);
}

function scatterBlades(c, i, seed, count, dark, tip) {
  let s = (seed * 2654435761) >>> 0;
  for (let n = 0; n < count; n++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const x = 1 + (s % 30);
    s = (s * 1664525 + 1013904223) >>> 0;
    const y = 1 + (s % 28);
    blade(c, i, x, y, dark, tip);
  }
}

function paintDecorations(c, i, isLight) {
  const seedA = isLight ? 0xE5 : 0xA1;
  const seedB = isLight ? 0xF6 : 0xB2;
  const seedC = isLight ? 0x18 : 0xD4;
  scatterBlades(c, i, seedA, 28, GRASS_BLADE_DRK);
  scatterBlades(c, i, seedB, 16, GRASS_BLADE_MID);
  scatterBlades(c, i, seedC, 8,  GRASS_BLADE_MID, GRASS_HIGHLIGHT);
  // Authored clusters
  if (isLight) {
    px(c,i,9,4,GRASS_BLADE_DRK); px(c,i,10,4,GRASS_BLADE_DRK); px(c,i,11,4,GRASS_BLADE_DRK);
    px(c,i,10,3,GRASS_HIGHLIGHT);
    px(c,i,17,18,GRASS_BLADE_DRK); px(c,i,18,18,GRASS_BLADE_DRK);
    px(c,i,17,17,GRASS_BLADE_MID); px(c,i,18,17,GRASS_HIGHLIGHT);
    px(c,i,3,9,'#fff8e8'); px(c,i,25,5,'#f098b0');
  } else {
    px(c,i,4,3,GRASS_BLADE_DRK); px(c,i,5,3,GRASS_BLADE_DRK);
    px(c,i,4,2,GRASS_BLADE_MID); px(c,i,5,2,GRASS_HIGHLIGHT);
    px(c,i,14,15,GRASS_BLADE_DRK); px(c,i,15,15,GRASS_BLADE_DRK); px(c,i,16,15,GRASS_BLADE_DRK);
    px(c,i,15,14,GRASS_HIGHLIGHT);
    px(c,i,12,7,'#fff8e8'); px(c,i,21,19,'#f098b0');
  }
}

const SCALE = 6;
const FIELD_W = 4;       // grass tiles wide per option
const FIELD_H = 3;       // grass tiles tall per option (3 = same height as one oak)
const TREE_W  = 1;       // tree column width
const COL_W   = (FIELD_W + TREE_W) * S * SCALE;  // px per option column
const ROW_H   = FIELD_H * S * SCALE;             // px per option row
const LABEL_H = 18;
const PAD     = 8;
const COLS    = 2;       // 2x2 grid of options
const ROWS    = 2;
const W       = PAD + COLS * (COL_W + PAD);
const H       = PAD + ROWS * (ROW_H + LABEL_H + PAD);

const cv = createCanvas(W, H);
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
ctx.fillStyle = '#181818';
ctx.fillRect(0, 0, W, H);

const sheet = await loadImage(SHEET);

OPTIONS.forEach((opt, idx) => {
  const colIdx = idx % COLS;
  const rowIdx = Math.floor(idx / COLS);
  const x0 = PAD + colIdx * (COL_W + PAD);
  const y0 = PAD + rowIdx * (ROW_H + LABEL_H + PAD);

  // Bake the two grass tiles for this option onto a strip canvas.
  const tile = createCanvas(2 * S, S);
  const tctx = tile.getContext('2d');
  tctx.imageSmoothingEnabled = false;
  paintGrassBase(tctx, 0, opt);
  paintGrassBase(tctx, 1, opt);
  paintDecorations(tctx, 0, false);
  paintDecorations(tctx, 1, true);

  // Field: 4×3 of the grass tiles (alternating dark/light)
  for (let ty = 0; ty < FIELD_H; ty++) {
    for (let tx = 0; tx < FIELD_W; tx++) {
      const isLight = (tx + ty) % 2 === 1;
      const srcX = isLight ? S : 0;
      ctx.drawImage(tile, srcX, 0, S, S,
        x0 + tx * S * SCALE, y0 + ty * S * SCALE,
        S * SCALE, S * SCALE);
    }
  }

  // Tree column on the right — paint grass base behind, then 3-cell oak slice on top.
  for (let ty = 0; ty < 3; ty++) {
    const isLight = ty % 2 === 1;
    const srcX = isLight ? S : 0;
    const tx = FIELD_W;
    ctx.drawImage(tile, srcX, 0, S, S,
      x0 + tx * S * SCALE, y0 + ty * S * SCALE,
      S * SCALE, S * SCALE);
    const sx = 13 * PITCH;
    const sy = (9 + ty) * PITCH;
    ctx.drawImage(sheet, sx, sy, TILE_PX, TILE_PX,
      x0 + tx * S * SCALE, y0 + ty * S * SCALE,
      S * SCALE, S * SCALE);
  }

  // Label below the panel
  ctx.fillStyle = '#f0f0f0';
  ctx.font = '12px monospace';
  ctx.fillText(opt.label, x0, y0 + ROW_H + 14);
});

writeFileSync(OUT, cv.toBuffer('image/png'));
console.log(`Wrote ${OUT}`);
