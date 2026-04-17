#!/usr/bin/env node
/**
 * Tileset PNG generator for Hollowcrown.
 *
 * Produces `src/assets/tiles/tileset.png` — a horizontal strip of 36 tiles
 * at 32×32 each, matching the TILE indices in generateTiles.ts.
 *
 * Run:  node tools/generate-tileset.mjs
 */

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/assets/tiles/tileset.png');
mkdirSync(dirname(OUT), { recursive: true });

const S = 32;
const TILE_COUNT = 36;
const canvas = createCanvas(TILE_COUNT * S, S);
const ctx = canvas.getContext('2d');

// ── Helpers ───────────────────────────────────────────────────────
function ox(i) { return i * S; }
function px(i, x, y, col) { ctx.fillStyle = col; ctx.fillRect(ox(i) + x, y, 1, 1); }
function blk(i, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(ox(i) + x, y, w, h); }
function fill(i, col) { blk(i, 0, 0, S, S, col); }

// Seeded RNG for reproducible dithering
let _seed = 42;
function srand(s) { _seed = s; }
function rand() { _seed = (_seed * 16807 + 0) % 2147483647; return (_seed & 0x7fffffff) / 0x7fffffff; }

function dither(i, x, y, cols, weights) {
  const r = rand();
  let acc = 0;
  for (let k = 0; k < cols.length; k++) {
    acc += weights[k];
    if (r < acc) { px(i, x, y, cols[k]); return; }
  }
  px(i, x, y, cols[cols.length - 1]);
}

// ═══════════════════════════════════════════════════════════════════
// TERRAIN (0-15)
// ═══════════════════════════════════════════════════════════════════

function drawGrassDark(i) {
  // Ashenvale grass — rich green with blade clusters and wildflowers
  fill(i, '#48a020');
  srand(100);
  // Base dithering for organic texture
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    dither(i, x, y,
      ['#48a020', '#40961c', '#50a828', '#3c8e18', '#44a020'],
      [0.35, 0.2, 0.2, 0.15, 0.1]);
  }
  // Grass blade clusters (3px tall tufts)
  const blades = [[3,5],[10,2],[20,7],[28,4],[6,16],[15,14],[24,18],[30,12],[8,24],[18,26],[26,22],[14,8],[1,28],[22,1],[31,20]];
  for (const [bx, by] of blades) {
    px(i, bx, by + 2, '#389018'); px(i, bx + 1, by + 2, '#389018');
    px(i, bx, by + 1, '#50b028'); px(i, bx + 2, by + 1, '#50b028');
    px(i, bx + 1, by, '#68c038');
  }
  // Tiny wildflowers
  const fl = [[7,9],[19,5],[29,15],[4,22],[16,20],[25,28],[11,30],[31,8]];
  for (const [fx, fy] of fl) { px(i, fx, fy, '#e8e8d8'); px(i, fx + 1, fy, '#d8d8c8'); }
}

function drawGrassLight(i) {
  // Lighter grass variant for Ashenvale
  fill(i, '#58b028');
  srand(200);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    dither(i, x, y,
      ['#58b028', '#52a824', '#60b830', '#4ca020', '#5cb42c'],
      [0.35, 0.2, 0.2, 0.15, 0.1]);
  }
  const bl = [[5,8],[18,4],[28,12],[10,22],[24,26],[2,14],[15,1],[30,28]];
  for (const [bx, by] of bl) {
    px(i, bx + 1, by, '#78d048'); px(i, bx, by + 1, '#60b830'); px(i, bx + 2, by + 1, '#60b830');
  }
  const fl = [[3,4],[12,7],[22,3],[30,10],[8,18],[17,22],[27,26],[5,28],[20,14]];
  for (const [fx, fy] of fl) px(i, fx, fy, '#f0f0e0');
}

function drawPath(i) {
  // Dirt path — warm, smooth, no edge seams
  fill(i, '#c8a058');
  srand(300);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    dither(i, x, y,
      ['#c8a058', '#c49c54', '#ccaa60', '#c09850'],
      [0.4, 0.25, 0.2, 0.15]);
  }
  // Scattered pebbles
  const st = [[3,4,5,4],[12,2,6,4],[22,5,5,3],[5,12,6,5],[16,10,5,4],[26,13,4,3],[8,20,5,4],[18,22,6,3],[28,20,4,4],[14,26,5,3],[3,28,4,3],[24,27,5,4]];
  for (const [sx, sy, sw, sh] of st) {
    blk(i, sx, sy, sw, sh, '#b89850');
    blk(i, sx, sy, sw, 1, '#d8b868');
    blk(i, sx, sy + sh - 1, sw, 1, '#987838');
  }
}

function drawWallStone(i) {
  fill(i, '#888880');
  for (let r = 0; r < 4; r++) {
    const by = r * 8;
    const off = r % 2 === 0 ? 0 : 7;
    blk(i, 0, by + 7, S, 1, '#585850');
    for (let col = -1; col < 4; col++) {
      const bx = off + col * 16;
      if (bx >= S) break;
      const cx = Math.max(0, bx);
      const cw = Math.min(14, S - cx);
      if (cw <= 0) continue;
      const sh = ['#909088', '#888880', '#808078', '#989890'][(r + col) & 3];
      blk(i, cx, by, cw, 7, sh);
      blk(i, cx, by, cw, 1, '#a8a8a0');
      blk(i, cx, by, 1, 7, '#a0a098');
      blk(i, cx, by + 6, cw, 1, '#686860');
      blk(i, cx + cw - 1, by, 1, 7, '#707068');
      if (bx > 0) blk(i, bx - 1, by, 2, 7, '#585850');
    }
  }
  blk(i, 0, 0, S, 1, '#b0b0a8');
}

function drawWallWood(i) {
  fill(i, '#906830');
  let p = 0;
  for (let n = 0; n < 5; n++) {
    const w = n < 4 ? 6 : S - p;
    const sh = n % 2 === 0 ? '#987038' : '#886028';
    blk(i, p, 0, w, S, sh);
    blk(i, p, 0, 1, S, '#a88848');
    blk(i, p + w - 1, 0, 1, S, '#704820');
    if (n % 2 === 0) { const ky = 6 + n * 6; blk(i, p + 2, ky, 3, 3, '#705020'); }
    blk(i, p + w, 0, 1, S, '#503818');
    p += w + 1;
  }
  blk(i, 0, 0, S, 1, '#b89850');
}

function drawDoor(i) {
  fill(i, '#181010');
  blk(i, 0, 0, S, 3, '#886838'); blk(i, 0, 0, 4, S, '#785828'); blk(i, S - 4, 0, 4, S, '#785828');
  blk(i, 0, 0, S, 1, '#a88848');
  blk(i, 6, 4, S - 12, S - 6, '#281810'); blk(i, 10, 8, S - 20, S - 12, '#302018');
  blk(i, 4, S - 3, S - 8, 3, '#a09880'); blk(i, 4, S - 3, S - 8, 1, '#b8b0a0');
  // Door handle
  px(i, 22, 18, '#c0b098'); px(i, 22, 19, '#a89878');
}

function drawFloorWood(i) {
  fill(i, '#a08058');
  for (let row = 0; row < 8; row++) {
    const by = row * 4;
    const off = row % 2 === 0 ? 0 : 4;
    blk(i, 0, by + 3, S, 1, '#706040');
    for (let col = -1; col < 5; col++) {
      const bx = off + col * 8;
      if (bx >= S) break;
      const cx = Math.max(0, bx);
      const cw = Math.min(8, S - cx);
      if (cw <= 0) continue;
      const shade = ['#a88860', '#a08058', '#988050', '#a89060'][(row + col) & 3];
      blk(i, cx, by, cw, 3, shade);
      blk(i, cx, by, cw, 1, row % 2 === 0 ? '#b89868' : '#b09060');
      if (bx > 0 && bx < S) blk(i, bx, by, 1, 3, '#706040');
    }
  }
}

function drawFloorStone(i) {
  fill(i, '#888880');
  for (let row = 0; row < 8; row++) {
    const by = row * 4;
    const off = row % 2 === 0 ? 0 : 5;
    blk(i, 0, by + 3, S, 1, '#585850');
    for (let col = -1; col < 5; col++) {
      const bx = off + col * 10;
      if (bx >= S) break;
      const cx = Math.max(0, bx);
      const cw = Math.min(10, S - cx);
      if (cw <= 0) continue;
      const shade = ['#909088', '#888880', '#808078', '#989890'][(row + col) & 3];
      blk(i, cx, by, cw, 3, shade);
      blk(i, cx, by, cw, 1, '#a0a098');
      if (bx > 0 && bx < S) blk(i, bx, by, 1, 3, '#585850');
    }
  }
}

function drawRoof(i) {
  fill(i, '#a04830');
  for (let r = 0; r < 4; r++) {
    const ry = r * 8;
    const off = r % 2 === 0 ? 0 : 8;
    for (let cl = -1; cl < 3; cl++) {
      const tx = off + cl * 16;
      for (let dy = 0; dy < 8; dy++) {
        const color = dy < 2 ? '#c06848' : dy < 4 ? '#b05838' : dy < 6 ? '#a04830' : '#883828';
        const tx0 = Math.max(0, tx);
        const tw = Math.min(16, S - tx0);
        if (tw > 0) blk(i, tx0, ry + dy, tw, 1, color);
      }
    }
  }
}

function drawRoofEdge(i) {
  fill(i, '#984028');
  for (let dy = 0; dy < 14; dy++) blk(i, 0, dy, S, 1, dy < 4 ? '#b05838' : dy < 8 ? '#a04830' : dy < 12 ? '#984028' : '#883020');
  blk(i, 0, 12, S, 4, '#682818');
  blk(i, 0, 16, S, 4, '#303028'); blk(i, 0, 20, S, 4, '#484840');
  blk(i, 0, 24, S, 4, '#585850'); blk(i, 0, 28, S, 4, '#686860');
}

function drawShadow(i) {
  blk(i, 0, 0, S, 6, '#1a2a10'); blk(i, 0, 6, S, 6, '#283818');
  blk(i, 0, 12, S, 6, '#344820'); blk(i, 0, 18, S, 6, '#408028');
  blk(i, 0, 24, S, 8, '#48a020');
}

function drawBush(i) {
  fill(i, '#48a020');
  const cx = 16, cy = 16;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (x - cx) / 14, dy = (y - cy) / 13, d2 = dx * dx + dy * dy;
    if (d2 <= 1) {
      const v = (y - 4) / 28, dark = v * 0.6 + d2 * 0.4;
      px(i, x, y, dark < 0.25 ? '#58c838' : dark < 0.4 ? '#48b028' : dark < 0.55 ? '#389818' : dark < 0.7 ? '#288010' : '#1a6808');
    }
  }
  blk(i, 11, 6, 4, 2, '#68d848'); blk(i, 17, 5, 3, 2, '#68d848');
}

function drawFence(i) {
  fill(i, '#48a020');
  const pX = 12;
  blk(i, pX + 2, 26, 8, 4, '#2a5a10');
  blk(i, pX, 6, 8, 20, '#a07840'); blk(i, pX, 6, 2, 20, '#b89050');
  blk(i, pX + 6, 6, 2, 20, '#786030');
  blk(i, pX + 1, 2, 6, 4, '#b89050'); blk(i, pX + 2, 0, 4, 2, '#c8a060');
  blk(i, 0, 12, pX, 4, '#987040'); blk(i, pX + 8, 12, S - pX - 8, 4, '#987040');
}

function drawPathEdge(i) {
  fill(i, '#c8a058');
  blk(i, 0, 0, S, 12, '#48a020');
  // Organic edge
  const e = [13, 12, 13, 14, 12, 11, 13, 14, 13, 12, 11, 13, 14, 12, 13, 12, 14, 13, 12, 11, 13, 14, 12, 13, 11, 12, 14, 13, 12, 13, 14, 12];
  for (let x = 0; x < S; x++) px(i, x, e[x] - 1, '#389018');
  px(i, 5, 4, '#e8e8d8'); px(i, 18, 6, '#e8e8d8'); px(i, 28, 3, '#e0e0d0');
}

function drawWell(i) {
  fill(i, '#48a020');
  for (let y = 6; y < 28; y++) for (let x = 6; x < 26; x++) {
    const d = (x - 16) * (x - 16) / 100 + (y - 17) * (y - 17) / 100;
    if (d <= 1) px(i, x, y, d < 0.45 ? y < 14 ? '#285878' : '#304860' : y < 14 ? '#a0a098' : y < 20 ? '#888880' : '#686860');
  }
}

function drawWater(i) {
  fill(i, '#4080b0');
  blk(i, 0, 0, S, 8, '#4888b8'); blk(i, 0, 24, S, 8, '#3870a0');
  for (let r = 0; r < 4; r++) {
    const wy = r * 8 + 3;
    const off = r % 2 === 0 ? 0 : 4;
    for (let x = 0; x < S; x++) {
      const ph = (x + off) % 10;
      if (ph < 3) px(i, x, wy, '#60a0d0');
      else if (ph < 5) px(i, x, wy, '#78b8e0');
      else if (ph === 5) px(i, x, wy, '#88c8e8');
      px(i, x, wy + 1, '#3070a0');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// FURNITURE (16-31)
// ═══════════════════════════════════════════════════════════════════

function drawBookshelf(i) {
  fill(i, '#604828');
  blk(i, 0, 0, S, S, '#5a4020'); blk(i, 1, 0, S - 2, S, '#6a5030');
  for (let sh = 0; sh < 3; sh++) {
    const sy = 2 + sh * 10;
    blk(i, 2, sy, S - 4, 1, '#4a3018'); blk(i, 2, sy - 1, S - 4, 1, '#7a6040');
    const books = ['#c04040', '#4060a0', '#40a060', '#a06040', '#6040a0', '#a0a040', '#40a0a0', '#a04080'];
    let bx = 3;
    for (let b = 0; b < 6 && bx < S - 4; b++) {
      const bw = 2 + (b % 3);
      const bh = 7 + (b % 2);
      blk(i, bx, sy - bh, bw, bh, books[(sh * 3 + b) % books.length]);
      px(i, bx, sy - bh, '#e0e0d0');
      bx += bw + 1;
    }
  }
  blk(i, 0, 0, 1, S, '#7a6040'); blk(i, 0, 0, S, 1, '#7a6040');
  blk(i, S - 1, 0, 1, S, '#3a2810'); blk(i, 0, S - 1, S, 1, '#3a2810');
}

function drawCounter(i) {
  fill(i, '#987048');
  blk(i, 0, 4, S, 20, '#886838');
  blk(i, 0, 4, S, 2, '#a88848'); blk(i, 0, 22, S, 2, '#685028');
  blk(i, 2, 8, S - 4, 12, '#7a5830'); blk(i, 4, 10, S - 8, 8, '#6a4828');
  for (let x = 6; x < S - 4; x += 8) blk(i, x, 8, 1, 12, '#584020');
  blk(i, 6, 2, 6, 3, '#d0c8b8'); blk(i, 7, 1, 4, 1, '#e0d8c8');
  blk(i, 20, 1, 4, 5, '#806050'); blk(i, 21, 0, 2, 1, '#907060');
}

function drawBedHead(i) {
  fill(i, '#987048');
  blk(i, 2, 0, S - 4, 8, '#604020'); blk(i, 3, 1, S - 6, 6, '#704828');
  blk(i, 2, 0, S - 4, 1, '#806038');
  blk(i, 8, 2, S - 16, 4, '#5a3818'); blk(i, 10, 3, S - 20, 2, '#684828');
  blk(i, 4, 10, S - 8, 8, '#e8e0d0'); blk(i, 5, 11, S - 10, 6, '#f0e8d8');
  blk(i, 4, 10, S - 8, 1, '#f8f0e0'); blk(i, 4, 17, S - 8, 1, '#c8c0b0');
  blk(i, 14, 12, 4, 4, '#d8d0c0');
  blk(i, 2, 20, S - 4, 12, '#d0c0a0'); blk(i, 2, 20, S - 4, 1, '#e0d0b0');
}

function drawBedFoot(i) {
  fill(i, '#987048');
  blk(i, 2, 0, S - 4, 22, '#8068a0'); blk(i, 2, 0, S - 4, 1, '#9078b0');
  blk(i, 4, 4, S - 8, 1, '#705890'); blk(i, 3, 8, S - 6, 1, '#705890');
  blk(i, 4, 14, S - 8, 1, '#604880');
  for (let y = 2; y < 20; y += 6)
    for (let x = 6; x < S - 6; x += 8) {
      px(i, x, y, '#9880b8'); px(i, x + 1, y + 1, '#9880b8'); px(i, x - 1, y + 1, '#9880b8');
    }
  blk(i, 2, 22, S - 4, 8, '#604020'); blk(i, 3, 23, S - 6, 6, '#704828');
  blk(i, 2, 22, S - 4, 1, '#806038'); blk(i, 2, S - 2, S - 4, 2, '#503018');
}

function drawTable(i) {
  fill(i, '#987048');
  blk(i, 4, S - 3, S - 6, 3, '#705028'); blk(i, 5, S - 2, S - 8, 2, '#604018');
  blk(i, 3, 4, 3, 3, '#604020'); blk(i, S - 6, 4, 3, 3, '#604020');
  blk(i, 3, S - 7, 3, 3, '#604020'); blk(i, S - 6, S - 7, 3, 3, '#604020');
  blk(i, 2, 3, S - 4, S - 6, '#c0a060'); blk(i, 3, 4, S - 6, S - 8, '#b89858');
  blk(i, 2, 3, S - 4, 2, '#d8c078'); blk(i, 2, S - 5, S - 4, 2, '#a08040');
  for (let y = 7; y < S - 7; y += 4) blk(i, 5, y, S - 10, 1, '#a88848');
  blk(i, 8, 7, 3, 4, '#e0c020'); px(i, 9, 6, '#f8e040'); px(i, 9, 5, '#ffe860');
  blk(i, 18, 9, 6, 5, '#d8d0c0'); blk(i, 19, 8, 4, 1, '#e8e0d0');
}

function drawChair(i) {
  fill(i, '#987048');
  for (let y = 6; y < 26; y++) for (let x = 6; x < 26; x++) {
    const d = (x - 16) * (x - 16) + (y - 16) * (y - 16);
    if (d < 100) px(i, x, y, d < 40 ? '#b89050' : d < 70 ? '#a88040' : '#987038');
  }
  blk(i, 10, 8, 12, 2, '#c8a060');
  for (let x = 8; x < 24; x++) px(i, x, 25, '#705028');
}

function drawBarrel(i) {
  fill(i, '#987048');
  const cx = 16, cy = 16;
  for (let y = 4; y < 28; y++) for (let x = 4; x < 28; x++) {
    const dx = (x - cx) / 12, dy = (y - cy) / 12;
    if (dx * dx + dy * dy <= 1) {
      const ring = Math.abs(y - cy);
      const isband = (ring >= 5 && ring <= 6) || (ring >= 10 && ring <= 11);
      px(i, x, y, isband ? '#808080' : y < cy ? '#a07838' : '#886028');
    }
  }
  for (let x = 10; x < 22; x++) px(i, x, 6, '#b89050');
  for (let x = 8; x < 24; x++) { px(i, x, 10, '#909898'); px(i, x, 22, '#909898'); }
  blk(i, 15, 14, 2, 4, '#705028'); blk(i, 13, 15, 6, 2, '#705028');
}

function drawCrate(i) {
  fill(i, '#987048');
  blk(i, 2, 2, S - 4, S - 4, '#a08040');
  blk(i, 2, 2, S - 4, 1, '#b89050'); blk(i, 2, S - 3, S - 4, 1, '#806030');
  for (let y = 8; y < S - 4; y += 8) blk(i, 3, y, S - 6, 1, '#886830');
  for (let d = 0; d < S - 6; d++) { px(i, 3 + d, 3 + Math.floor(d * 0.9), '#705020'); px(i, S - 4 - d, 3 + Math.floor(d * 0.9), '#705020'); }
  px(i, 6, 6, '#c0c0b0'); px(i, S - 7, 6, '#c0c0b0'); px(i, 6, S - 7, '#c0c0b0'); px(i, S - 7, S - 7, '#c0c0b0');
  blk(i, 2, S - 3, S - 4, 1, '#806030'); blk(i, S - 3, 2, 1, S - 4, '#806030');
}

function drawFireplace(i) {
  fill(i, '#987048');
  blk(i, 0, 0, S, S, '#585858'); blk(i, 2, 2, S - 4, S - 4, '#4a4a4a');
  blk(i, 6, 8, S - 12, S - 10, '#1a1210');
  blk(i, 10, 14, 12, 12, '#c03010'); blk(i, 11, 12, 10, 10, '#e06020');
  blk(i, 12, 10, 8, 8, '#f0a030'); blk(i, 14, 8, 4, 6, '#f8d040');
  px(i, 15, 7, '#ffe860'); px(i, 16, 6, '#fff880');
  px(i, 10, 24, '#f08020'); px(i, 18, 25, '#e06010'); px(i, 14, 26, '#d04008');
  blk(i, 0, 0, S, 4, '#686868'); blk(i, 0, 0, S, 1, '#888888');
  blk(i, 1, 1, 1, S - 2, '#707070');
}

function drawPlant(i) {
  fill(i, '#987048');
  blk(i, 10, 18, 12, 12, '#c06030'); blk(i, 8, 16, 16, 3, '#d07040');
  blk(i, 9, 16, 14, 1, '#e08050'); blk(i, 11, 20, 10, 8, '#b05828');
  blk(i, 12, 28, 8, 2, '#a04820'); blk(i, 11, 17, 10, 2, '#4a3020');
  const leaves = [[8,6,8,8,'#38a830'],[16,4,10,7,'#30a028'],[6,10,7,6,'#48b838'],[20,8,8,7,'#40a830'],[12,2,8,6,'#50c040'],[14,8,6,5,'#389828']];
  for (const [lx, ly, lw, lh, col] of leaves) {
    blk(i, lx, ly, lw, lh, col);
    blk(i, lx, ly, lw, 1, '#60d848');
  }
  px(i, 12, 8, '#288820'); px(i, 20, 6, '#288820'); px(i, 10, 12, '#288820');
}

function drawRugCenter(i) {
  fill(i, '#987048');
  blk(i, 0, 0, S, S, '#903030');
  blk(i, 0, 0, S, 2, '#c09030'); blk(i, 0, S - 2, S, 2, '#c09030');
  blk(i, 0, 0, 2, S, '#c09030'); blk(i, S - 2, 0, 2, S, '#c09030');
  for (let y = 4; y < S - 4; y += 4) for (let x = 4; x < S - 4; x += 4) {
    if ((x + y) % 8 < 4) px(i, x + 1, y + 1, '#b04040');
    else px(i, x + 1, y + 1, '#803020');
  }
  blk(i, 12, 12, 8, 8, '#c09030'); blk(i, 13, 13, 6, 6, '#903030'); blk(i, 14, 14, 4, 4, '#c09030');
}

function drawRugEdge(i) {
  fill(i, '#987048');
  blk(i, 0, 0, S, 16, '#903030');
  blk(i, 0, 0, S, 2, '#c09030'); blk(i, 0, 14, S, 2, '#c09030');
  for (let x = 2; x < S; x += 3) { blk(i, x, 16, 1, 4, '#c09030'); blk(i, x, 20, 1, 2, '#a07828'); }
}

function drawWeaponRack(i) {
  fill(i, '#888880');
  blk(i, 4, 8, S - 8, 16, '#6a5030'); blk(i, 4, 8, S - 8, 1, '#8a7040');
  for (let d = 0; d < 20; d++) px(i, 8 + d, 10 + Math.floor(d * 0.5), '#c0c0c8');
  blk(i, 7, 9, 3, 3, '#a08830'); px(i, 27, 19, '#d0d0d8');
  for (let y = 12; y < 22; y++) for (let x = 14; x < 24; x++) {
    const d = (x - 19) * (x - 19) + (y - 17) * (y - 17);
    if (d < 25) px(i, x, y, d < 8 ? '#d0b040' : d < 16 ? '#a08830' : '#806828');
  }
  blk(i, 8, 10, 2, 2, '#505050'); blk(i, 22, 10, 2, 2, '#505050');
}

function drawWindow(i) {
  fill(i, '#906830');
  for (let n = 0; n < 5; n++) {
    const p0 = n * 7; const pw = n < 4 ? 6 : S - p0;
    blk(i, p0, 0, pw, 10, n % 2 === 0 ? '#987038' : '#886028');
    blk(i, p0, 22, pw, 10, n % 2 === 0 ? '#987038' : '#886028');
  }
  blk(i, 0, 0, S, 1, '#a88848'); blk(i, 0, S - 1, S, 1, '#604020');
  blk(i, 6, 10, S - 12, 12, '#604020');
  blk(i, 8, 11, S - 16, 10, '#80b8d8'); blk(i, 10, 12, S - 20, 8, '#a0d0e8');
  blk(i, 12, 13, S - 24, 6, '#c0e0f0');
  blk(i, 15, 10, 2, 12, '#604020'); blk(i, 6, 15, S - 12, 2, '#604020');
  blk(i, 5, 21, S - 10, 2, '#806038'); blk(i, 5, 21, S - 10, 1, '#a08048');
}

function drawTorch(i) {
  fill(i, '#888880');
  blk(i, 12, 16, 8, 10, '#505050'); blk(i, 14, 14, 4, 4, '#606060');
  blk(i, 14, 8, 4, 10, '#705030');
  blk(i, 12, 2, 8, 8, '#e06020'); blk(i, 13, 1, 6, 6, '#f0a030');
  blk(i, 14, 0, 4, 4, '#f8d040');
  px(i, 15, 0, '#ffe860'); px(i, 16, 0, '#fff880');
  // Glow ring
  for (let y = 0; y < 10; y++) for (let x = 10; x < 22; x++) {
    const d = (x - 16) * (x - 16) + (y - 4) * (y - 4);
    if (d >= 20 && d < 36) px(i, x, y, '#f0a030');
  }
}

function drawDisplay(i) {
  fill(i, '#987048');
  blk(i, 4, S - 4, S - 6, 4, '#705028');
  blk(i, 2, 8, S - 4, S - 12, '#705838'); blk(i, 3, 9, S - 6, S - 14, '#806840');
  blk(i, 5, 10, S - 10, S - 16, '#90b8d0');
  blk(i, 8, 12, 4, 8, '#d04040'); blk(i, 9, 10, 2, 3, '#c0c0b8');
  blk(i, 18, 14, 4, 4, '#e0c040'); blk(i, 16, 20, 6, 3, '#e0d8c0');
  blk(i, 2, 2, S - 4, 7, '#c0a868'); blk(i, 3, 3, S - 6, 5, '#d0b878');
  blk(i, 2, 2, S - 4, 1, '#e0c888');
  blk(i, 6, 11, 3, 1, '#d0e8f8'); blk(i, 20, 12, 2, 1, '#c0d8e8');
}

// ═══════════════════════════════════════════════════════════════════
// INTERIOR ARCHITECTURE (32-35)
// ═══════════════════════════════════════════════════════════════════

function drawWallInner(i) {
  fill(i, '#c0a880');
  for (let row = 0; row < 4; row++) {
    const by = row * 8;
    blk(i, 0, by + 7, S, 1, '#9a8060');
    for (let col = 0; col < 3; col++) {
      const bx = col * 11 + (row % 2 === 0 ? 0 : 5);
      const cw = Math.min(10, S - Math.max(0, bx));
      if (cw <= 0) continue;
      const cx = Math.max(0, bx);
      const shade = ['#c8b088', '#c0a880', '#b8a078', '#c8b090'][(row + col) & 3];
      blk(i, cx, by, cw, 7, shade);
      blk(i, cx, by, cw, 1, '#d0b890'); blk(i, cx, by + 6, cw, 1, '#a89068');
    }
  }
  blk(i, 0, 0, 2, S, '#a89068'); blk(i, S - 2, 0, 2, S, '#d0b890');
}

function drawWallCorner(i) {
  fill(i, '#685848');
  const cx = 16, cy = 16;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (x - cx) / 11, dy = (y - cy) / 11;
    const d2 = dx * dx + dy * dy;
    if (d2 <= 1) {
      if (d2 < 0.3) px(i, x, y, '#c09838');
      else if (d2 < 0.5) px(i, x, y, '#a08030');
      else if (d2 < 0.7) px(i, x, y, '#886828');
      else if (d2 < 0.85) px(i, x, y, '#705820');
      else px(i, x, y, '#584818');
    }
  }
  blk(i, 12, 8, 8, 2, '#d0a848');
  blk(i, 15, 10, 2, 12, '#886828'); blk(i, 10, 15, 12, 2, '#886828');
  blk(i, 0, 0, S, 2, '#584838'); blk(i, 0, S - 2, S, 2, '#584838');
  blk(i, 0, 0, 2, S, '#584838'); blk(i, S - 2, 0, 2, S, '#584838');
}

function drawWallShelf(i) {
  fill(i, '#a09070');
  blk(i, 0, 0, S, 20, '#a89878');
  blk(i, 0, 4, S, 2, '#908060'); blk(i, 0, 4, S, 1, '#b0a080');
  blk(i, 0, 18, S, 4, '#907858'); blk(i, 0, 18, S, 1, '#b09868'); blk(i, 0, 21, S, 1, '#705838');
  blk(i, 6, 12, 4, 6, '#c06848'); blk(i, 7, 10, 2, 2, '#c87858'); blk(i, 6, 12, 4, 1, '#d87858');
  blk(i, 14, 14, 3, 4, '#408060'); blk(i, 15, 11, 1, 3, '#50906a');
  blk(i, 22, 14, 4, 4, '#c0b8a0'); blk(i, 22, 14, 4, 1, '#d0c8b0');
  blk(i, 0, 22, S, 10, '#685048'); blk(i, 0, 22, S, 2, '#584038');
}

function drawBaseboard(i) {
  fill(i, '#684838');
  blk(i, 0, 0, S, 6, '#584030'); blk(i, 0, 6, S, 8, '#785848');
  blk(i, 0, 10, S, 2, '#886858'); blk(i, 0, 14, S, 4, '#685040');
  blk(i, 0, 18, S, 2, '#584030');
  blk(i, 0, 20, S, 12, '#a08058');
  for (let col = 0; col < 4; col++) {
    const bx = col * 8;
    blk(i, bx, 22, 7, 3, '#a88860'); blk(i, bx, 22, 7, 1, '#b89868');
    blk(i, bx + 7, 22, 1, 3, '#706040');
  }
  blk(i, 0, 25, S, 1, '#706040');
}

// ═══════════════════════════════════════════════════════════════════
// RENDER ALL
// ═══════════════════════════════════════════════════════════════════

drawGrassDark(0); drawGrassLight(1); drawPath(2);
drawWallStone(3); drawWallWood(4); drawDoor(5);
drawFloorWood(6); drawFloorStone(7); drawRoof(8);
drawRoofEdge(9); drawShadow(10); drawBush(11);
drawFence(12); drawPathEdge(13); drawWell(14);
drawWater(15);
drawBookshelf(16); drawCounter(17); drawBedHead(18);
drawBedFoot(19); drawTable(20); drawChair(21);
drawBarrel(22); drawCrate(23); drawFireplace(24);
drawPlant(25); drawRugCenter(26); drawRugEdge(27);
drawWeaponRack(28); drawWindow(29); drawTorch(30);
drawDisplay(31);
drawWallInner(32); drawWallCorner(33);
drawWallShelf(34); drawBaseboard(35);

// ── Write PNG ─────────────────────────────────────────────────────
const buf = canvas.toBuffer('image/png');
writeFileSync(OUT, buf);
console.log(`✓ tileset.png written → ${OUT}  (${TILE_COUNT} tiles × ${S}px = ${canvas.width}×${canvas.height}, ${(buf.length/1024).toFixed(1)} KB)`);
