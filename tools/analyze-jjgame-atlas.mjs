#!/usr/bin/env node
/**
 * One-off analyzer for the JJGame top-down RPG atlas.
 *
 * The atlas is a single 1536x1024 spritesheet with sprites separated
 * by a uniform dark-navy background. Goal: figure out the grid cell
 * size + how many "occupied" cells exist at each candidate size.
 *
 * A cell is "occupied" if its center 50% has any non-background pixels.
 * The cell size with the most occupied + best alignment wins.
 */
import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPRITESHEET = join(__dirname, '..', 'public', 'assets', 'jjgame', 'spritesheet.png');

/** Background color tolerance — pixels within this RGB distance count as "dark bg". */
const BG_TOL = 25;

async function main() {
  const img = await loadImage(SPRITESHEET);
  const W = img.width, H = img.height;
  console.log(`Image: ${W}x${H}`);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, W, H).data;

  // Sample top-left 4x4 pixel block to determine the background color.
  // The atlas's outer edge is uniformly dark.
  let br = 0, bg = 0, bb = 0, bn = 0;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const i = (y * W + x) * 4;
      br += data[i]; bg += data[i + 1]; bb += data[i + 2];
      bn++;
    }
  }
  const BG = { r: Math.round(br / bn), g: Math.round(bg / bn), b: Math.round(bb / bn) };
  console.log(`Detected bg color: rgb(${BG.r}, ${BG.g}, ${BG.b}) = #${[BG.r, BG.g, BG.b].map(v => v.toString(16).padStart(2, '0')).join('')}`);

  function isBg(x, y) {
    const i = (y * W + x) * 4;
    const dr = data[i] - BG.r, dg = data[i + 1] - BG.g, db = data[i + 2] - BG.b;
    return Math.abs(dr) < BG_TOL && Math.abs(dg) < BG_TOL && Math.abs(db) < BG_TOL;
  }

  // For each candidate cell size, count occupied cells.
  // "Occupied" = center 16x16 region has at least 30% non-bg pixels.
  for (const N of [16, 32, 48, 64, 96, 128]) {
    if (W % N !== 0 || H % N !== 0) {
      console.log(`N=${N}: skip (doesn't divide ${W}x${H})`);
      continue;
    }
    const cols = W / N, rows = H / N;
    let occupied = 0;
    let total = 0;
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        total++;
        // Sample center 50% of the cell
        const x0 = cx * N + Math.floor(N * 0.25);
        const y0 = cy * N + Math.floor(N * 0.25);
        const x1 = cx * N + Math.floor(N * 0.75);
        const y1 = cy * N + Math.floor(N * 0.75);
        let nonBg = 0, sampled = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            sampled++;
            if (!isBg(x, y)) nonBg++;
          }
        }
        if (nonBg / sampled > 0.30) occupied++;
      }
    }
    console.log(`N=${N}: ${cols}x${rows} = ${total} cells, ${occupied} occupied (${(occupied / total * 100).toFixed(1)}%)`);
  }

  // ── Separator-row detection ──
  // Scan each row: how many of its pixels are background? A row that is
  // ~95%+ bg is a "separator" — between content rows. Then look at the
  // gaps between separators to derive the actual row pitch.
  const rowBgPct = new Array(H).fill(0);
  for (let y = 0; y < H; y++) {
    let bgCount = 0;
    for (let x = 0; x < W; x++) {
      if (isBg(x, y)) bgCount++;
    }
    rowBgPct[y] = bgCount / W;
  }
  const SEPARATOR_THRESHOLD = 0.92;
  const separatorRows = [];
  for (let y = 0; y < H; y++) {
    if (rowBgPct[y] >= SEPARATOR_THRESHOLD) separatorRows.push(y);
  }
  // Cluster contiguous separator rows into "gaps"
  const gaps = [];
  if (separatorRows.length > 0) {
    let gStart = separatorRows[0];
    let gEnd = separatorRows[0];
    for (let i = 1; i < separatorRows.length; i++) {
      if (separatorRows[i] === gEnd + 1) {
        gEnd = separatorRows[i];
      } else {
        gaps.push({ start: gStart, end: gEnd, height: gEnd - gStart + 1 });
        gStart = separatorRows[i];
        gEnd = separatorRows[i];
      }
    }
    gaps.push({ start: gStart, end: gEnd, height: gEnd - gStart + 1 });
  }
  console.log(`\nFound ${gaps.length} horizontal separator gaps:`);
  for (const g of gaps.slice(0, 30)) {
    console.log(`  rows ${g.start}-${g.end} (${g.height}px gap)`);
  }
  // Compute the spacing between gap centers — that's the row pitch.
  const pitches = [];
  for (let i = 1; i < gaps.length; i++) {
    const c1 = (gaps[i - 1].start + gaps[i - 1].end) / 2;
    const c2 = (gaps[i].start + gaps[i].end) / 2;
    pitches.push(c2 - c1);
  }
  console.log(`Row pitches between separator centers: ${pitches.slice(0, 20).map((p) => p.toFixed(0)).join(', ')}`);

  // Same for columns
  const colBgPct = new Array(W).fill(0);
  for (let x = 0; x < W; x++) {
    let bgCount = 0;
    for (let y = 0; y < H; y++) {
      if (isBg(x, y)) bgCount++;
    }
    colBgPct[x] = bgCount / H;
  }
  const colSeparators = [];
  for (let x = 0; x < W; x++) {
    if (colBgPct[x] >= SEPARATOR_THRESHOLD) colSeparators.push(x);
  }
  const colGaps = [];
  if (colSeparators.length > 0) {
    let gStart = colSeparators[0];
    let gEnd = colSeparators[0];
    for (let i = 1; i < colSeparators.length; i++) {
      if (colSeparators[i] === gEnd + 1) gEnd = colSeparators[i];
      else {
        colGaps.push({ start: gStart, end: gEnd, height: gEnd - gStart + 1 });
        gStart = colSeparators[i];
        gEnd = colSeparators[i];
      }
    }
    colGaps.push({ start: gStart, end: gEnd, height: gEnd - gStart + 1 });
  }
  console.log(`\nFound ${colGaps.length} vertical separator gaps (showing first 10):`);
  for (const g of colGaps.slice(0, 10)) {
    console.log(`  cols ${g.start}-${g.end} (${g.height}px gap)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
