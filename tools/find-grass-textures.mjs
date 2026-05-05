#!/usr/bin/env node
/**
 * Crop every cell that might be a grass-detail / grass-scatter sprite
 * so we can see what's actually available for adding texture to grass
 * cells. Targets:
 *   - Row 25-27 cols 9-11: the 9-slice grass block (just solid greens)
 *   - Row 9-11 cols 19-26: small scatter bushes / flowers
 *   - Row 6-13 cols 0-4: crop / flower fields
 *   - Row 23-24 cols 41-44: leaves / grass tufts (per zoom-flora hints)
 */
import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHEET = join(__dirname, '..', 'public', 'assets', 'tilesets', 'roguelike-rpg_packed.png');
const OUT = join(__dirname, '_out', 'grass-candidates.png');
const TILE = 16;
const PITCH = 17;

// (label, rowStart, colStart, rowsH, colsW)
const REGIONS = [
  ['9-slice grass block', 25, 9, 3, 3],
  ['scatter bushes (cols 19-26 row 9)', 9, 19, 1, 8],
  ['scatter row 10', 10, 19, 1, 8],
  ['scatter row 11', 11, 19, 1, 8],
  ['flower clusters (row 9 cols 28-30)', 9, 28, 1, 3],
  ['lily pads / small flora (rows 10-11 cols 25-26)', 10, 25, 2, 2],
  ['grass tufts? row 23 cols 41-44', 23, 41, 2, 4],
];

async function main() {
  const img = await loadImage(SHEET);
  const SCALE = 8;
  const CELL = TILE * SCALE;
  const PAD = 6;
  const LABEL_H = 22;

  const totalRows = REGIONS.reduce((sum, [, , , rh]) => sum + rh + 1, 0);
  const maxCols = Math.max(...REGIONS.map(([, , , , cw]) => cw));
  const W = PAD + maxCols * (CELL + PAD) + 250;
  const H = totalRows * (CELL + PAD) + REGIONS.length * LABEL_H + PAD;
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.font = '12px monospace';

  let cursorY = PAD;
  for (const [label, rowStart, colStart, rowsH, colsW] of REGIONS) {
    ctx.fillStyle = '#000';
    ctx.fillText(label, PAD, cursorY + 12);
    cursorY += LABEL_H;
    for (let r = 0; r < rowsH; r++) {
      for (let c = 0; c < colsW; c++) {
        const sx = (colStart + c) * PITCH;
        const sy = (rowStart + r) * PITCH;
        const dx = PAD + c * (CELL + PAD);
        const dy = cursorY + r * (CELL + PAD);
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(dx, dy, CELL, CELL);
        ctx.drawImage(img, sx, sy, TILE, TILE, dx, dy, CELL, CELL);
        ctx.fillStyle = '#666';
        ctx.font = '8px monospace';
        ctx.fillText(`(${rowStart + r},${colStart + c})`, dx, dy + CELL + 9);
        ctx.font = '12px monospace';
      }
    }
    cursorY += rowsH * (CELL + PAD) + 12;
  }

  const buf = cv.toBuffer('image/png');
  writeFileSync(OUT, buf);
  console.log(`Wrote ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
