#!/usr/bin/env node
/**
 * Classify each 16x16 tile in the Kenney Roguelike/RPG Pack spritesheet.
 *
 * The sheet is 968x526 = 57 cols x 31 rows of 16x16 tiles with a 1px gap
 * (pitch = 17, no leading margin). For each tile we sample its pixels
 * and emit a coarse summary: dominant color family, alpha coverage, edge
 * transparency — enough to pick out plain grass, dirt, walls, water, etc.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const SHEET = 'public/assets/tilesets/roguelike-rpg_packed.png';
const TILE = 16, PITCH = 17;

const png = PNG.sync.read(fs.readFileSync(SHEET));
const { width: W, height: H, data } = png;
const COLS = Math.floor((W + 1) / PITCH);
const ROWS = Math.floor((H + 1) / PITCH);

function pixel(x, y) {
  const i = (y * W + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}

function classify(r, c) {
  const x0 = c * PITCH, y0 = r * PITCH;
  let opaque = 0, sumR = 0, sumG = 0, sumB = 0;
  const hist = { green: 0, brown: 0, grey: 0, blue: 0, red: 0, white: 0, other: 0 };
  for (let dy = 0; dy < TILE; dy++) {
    for (let dx = 0; dx < TILE; dx++) {
      const [R, G, B, A] = pixel(x0 + dx, y0 + dy);
      if (A < 16) continue;
      opaque++; sumR += R; sumG += G; sumB += B;
      // Simple color bucket.
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      const sat = mx - mn;
      if (mx < 40) hist.other++;
      else if (sat < 20) {
        if (mx > 200) hist.white++; else hist.grey++;
      } else if (G > R && G > B) hist.green++;
      else if (R > 120 && G > 60 && B < 100 && R > B + 20) hist.brown++;
      else if (B > R && B > G) hist.blue++;
      else if (R > G && R > B) hist.red++;
      else hist.other++;
    }
  }
  const total = TILE * TILE;
  const coverage = opaque / total;
  if (opaque === 0) return { label: 'empty', coverage: 0 };
  const avg = [Math.round(sumR / opaque), Math.round(sumG / opaque), Math.round(sumB / opaque)];
  // Dominant bucket
  const dom = Object.entries(hist).sort((a, b) => b[1] - a[1])[0][0];
  // Heuristic label
  let label = dom;
  if (coverage < 0.5) label = 'sparse-' + dom;
  return { label, coverage: +coverage.toFixed(2), avg, hist };
}

const results = [];
for (let r = 0; r < ROWS; r++) {
  const row = [];
  for (let c = 0; c < COLS; c++) {
    row.push(classify(r, c));
  }
  results.push(row);
}

// Also, for convenience, produce a compact grid of one-letter labels.
const letter = (x) => ({
  green: 'G', brown: 'b', grey: '#', blue: 'W', red: 'R',
  white: '.', other: '?', empty: ' ',
}[x.label.replace('sparse-', '')] || '?');

console.log(`Sheet: ${W}x${H}, ${COLS}x${ROWS} tiles`);
for (let r = 0; r < ROWS; r++) {
  const line = results[r].map(t => (t.coverage > 0.85 ? letter(t).toUpperCase() : letter(t).toLowerCase())).join('');
  console.log(String(r).padStart(2) + ' ' + line);
}

// Dump full classification for specific interesting rows.
// Also write to a JSON for downstream.
fs.writeFileSync('scripts/_tmp/roguelike-classification.json', JSON.stringify(results, null, 0));
