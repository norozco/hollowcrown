#!/usr/bin/env node
/**
 * Tree sprite generator for Hollowcrown.
 *
 * Produces `src/assets/tiles/trees.png` — a horizontal strip of tree variants.
 * Each tree is 48×64, designed for Greenhollow's forest areas.
 *
 * Variants:
 *   0: Oak (broad canopy, Greenhollow standard)
 *   1: Pine (tall conifer, darker)
 *   2: Dead tree (leafless, branches only — for forest edge / atmosphere)
 *   3: Stump (cut trunk, low obstacle)
 *
 * Run:  node tools/generate-trees.mjs
 */

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/assets/tiles/trees.png');
mkdirSync(dirname(OUT), { recursive: true });

const W = 48;
const H = 64;
const TREE_COUNT = 4;
const canvas = createCanvas(TREE_COUNT * W, H);
const ctx = canvas.getContext('2d');

function ox(i) { return i * W; }
function px(i, x, y, col) { ctx.fillStyle = col; ctx.fillRect(ox(i) + x, y, 1, 1); }
function blk(i, x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(ox(i) + x, y, w, h); }

let _seed = 77;
function srand(s) { _seed = s; }
function rand() { _seed = (_seed * 16807) % 2147483647; return (_seed & 0x7fffffff) / 0x7fffffff; }

// ── Tree 0: Oak (broad canopy) ──────────────────────────────────

function drawOak(i) {
  srand(500);
  // Ground shadow (ellipse)
  for (let y = 56; y < 64; y++) for (let x = 8; x < 40; x++) {
    const dx = (x - 24) / 16, dy = (y - 60) / 4;
    if (dx * dx + dy * dy < 1) px(i, x, y, '#1a2a10');
  }

  // Trunk
  blk(i, 21, 34, 6, 26, '#5a3818');
  blk(i, 22, 34, 4, 26, '#6a4828');
  blk(i, 21, 34, 1, 26, '#4a2810'); // left bark shadow
  blk(i, 26, 34, 1, 26, '#503018'); // right bark shadow
  // Bark texture
  for (let y = 36; y < 58; y += 3) {
    px(i, 23, y, '#503018'); px(i, 24, y + 1, '#7a5838');
  }
  // Roots
  blk(i, 19, 56, 3, 3, '#5a3818'); blk(i, 26, 57, 3, 2, '#5a3818');

  // Canopy (layered circles for organic shape)
  const canopyLayers = [
    { cx: 24, cy: 22, rx: 18, ry: 14, base: '#1a6808', mid: '#288010', hi: '#389818' },
    { cx: 20, cy: 18, rx: 12, ry: 10, base: '#288010', mid: '#389818', hi: '#48b028' },
    { cx: 28, cy: 16, rx: 12, ry: 10, base: '#288010', mid: '#389818', hi: '#48b028' },
    { cx: 24, cy: 14, rx: 14, ry: 10, base: '#389818', mid: '#48b028', hi: '#58c838' },
    { cx: 22, cy: 10, rx: 10, ry: 8,  base: '#48b028', mid: '#58c838', hi: '#68d848' },
    { cx: 26, cy: 8,  rx: 8,  ry: 7,  base: '#50b830', mid: '#60c840', hi: '#70d850' },
  ];
  for (const l of canopyLayers) {
    for (let y = l.cy - l.ry; y <= l.cy + l.ry; y++) {
      for (let x = l.cx - l.rx; x <= l.cx + l.rx; x++) {
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const dx = (x - l.cx) / l.rx, dy = (y - l.cy) / l.ry;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        // Wobble the edge for organic shape
        const edge = d2 > 0.7 && rand() > 0.6;
        if (edge) continue;
        const shade = d2 < 0.3 ? l.hi : d2 < 0.6 ? l.mid : l.base;
        px(i, x, y, shade);
      }
    }
  }
  // Canopy highlights (dappled light)
  for (let n = 0; n < 20; n++) {
    const hx = 10 + Math.floor(rand() * 28);
    const hy = 4 + Math.floor(rand() * 24);
    px(i, hx, hy, '#78e058');
  }
}

// ── Tree 1: Pine (conifer) ──────────────────────────────────────

function drawPine(i) {
  srand(600);
  // Shadow
  for (let y = 58; y < 64; y++) for (let x = 14; x < 34; x++) {
    const dx = (x - 24) / 10, dy = (y - 61) / 3;
    if (dx * dx + dy * dy < 1) px(i, x, y, '#1a2a10');
  }

  // Trunk (thinner)
  blk(i, 22, 38, 4, 22, '#4a2810');
  blk(i, 23, 38, 2, 22, '#5a3818');
  blk(i, 22, 38, 1, 22, '#3a1808');

  // Triangular canopy layers (3 tiers, bottom to top)
  const tiers = [
    { topY: 26, botY: 42, topW: 4, botW: 24 },
    { topY: 14, botY: 32, topW: 4, botW: 20 },
    { topY: 4,  botY: 22, topW: 2, botW: 16 },
  ];
  const greens = ['#0e3a08', '#1a5010', '#1a6808', '#288010', '#307818'];
  for (const t of tiers) {
    for (let y = t.topY; y <= t.botY; y++) {
      const frac = (y - t.topY) / (t.botY - t.topY);
      const hw = (t.topW + (t.botW - t.topW) * frac) / 2;
      for (let x = Math.floor(24 - hw); x <= Math.ceil(24 + hw); x++) {
        if (x < 0 || x >= W) continue;
        const d = Math.abs(x - 24) / hw;
        const gi = Math.min(greens.length - 1, Math.floor(d * greens.length));
        px(i, x, y, greens[greens.length - 1 - gi]);
        // Snow/frost on edges
        if (d > 0.8 && rand() > 0.7) px(i, x, y, '#c0d8c0');
      }
    }
  }
  // Top point
  px(i, 24, 3, '#307818'); px(i, 23, 4, '#288010'); px(i, 25, 4, '#288010');
}

// ── Tree 2: Dead tree (leafless) ────────────────────────────────

function drawDeadTree(i) {
  srand(700);
  // Shadow
  for (let y = 58; y < 64; y++) for (let x = 12; x < 36; x++) {
    const dx = (x - 24) / 12, dy = (y - 61) / 3;
    if (dx * dx + dy * dy < 1) px(i, x, y, '#1a1a10');
  }

  // Trunk (gnarled)
  blk(i, 21, 20, 6, 40, '#3a2010');
  blk(i, 22, 20, 4, 40, '#4a2818');
  blk(i, 21, 20, 1, 40, '#2a1808');
  // Bark cracks
  for (let y = 22; y < 56; y += 4) { px(i, 23, y, '#2a1808'); px(i, 24, y + 2, '#5a3828'); }

  // Main branches (drawn as thick lines)
  // Left branch
  for (let d = 0; d < 14; d++) {
    const bx = 21 - d, by = 24 + Math.floor(d * 0.4);
    if (bx >= 0 && bx < W) { blk(i, bx, by, 2, 2, '#3a2010'); }
  }
  // Right branch
  for (let d = 0; d < 16; d++) {
    const bx = 27 + d, by = 20 + Math.floor(d * 0.3);
    if (bx < W) { blk(i, bx, by, 2, 2, '#3a2010'); }
  }
  // Upper left
  for (let d = 0; d < 10; d++) {
    const bx = 20 - d, by = 16 - Math.floor(d * 0.6);
    if (bx >= 0 && by >= 0) px(i, bx, by, '#4a2818');
  }
  // Upper right
  for (let d = 0; d < 12; d++) {
    const bx = 28 + d, by = 14 - Math.floor(d * 0.5);
    if (bx < W && by >= 0) px(i, bx, by, '#4a2818');
  }
  // Top
  for (let d = 0; d < 8; d++) {
    px(i, 23, 20 - d, '#3a2010'); px(i, 24, 19 - d, '#4a2818');
  }
  // Twigs at branch ends
  px(i, 7, 28, '#3a2010'); px(i, 8, 27, '#3a2010');
  px(i, 42, 22, '#3a2010'); px(i, 43, 21, '#3a2010');
  px(i, 10, 10, '#4a2818'); px(i, 11, 9, '#4a2818');
  px(i, 39, 8, '#4a2818'); px(i, 40, 7, '#4a2818');
}

// ── Tree 3: Stump ───────────────────────────────────────────────

function drawStump(i) {
  srand(800);
  // Shadow (small)
  for (let y = 50; y < 58; y++) for (let x = 14; x < 34; x++) {
    const dx = (x - 24) / 10, dy = (y - 54) / 4;
    if (dx * dx + dy * dy < 1) px(i, x, y, '#1a2a10');
  }

  // Stump body (wider than a trunk)
  blk(i, 16, 38, 16, 16, '#5a3818');
  blk(i, 17, 38, 14, 16, '#6a4828');
  blk(i, 16, 38, 1, 16, '#4a2810');
  blk(i, 31, 38, 1, 16, '#4a2810');
  // Bark texture
  for (let y = 40; y < 52; y += 2) {
    px(i, 19, y, '#503018'); px(i, 28, y + 1, '#7a5838');
  }

  // Top surface (rings visible)
  for (let y = 34; y < 40; y++) for (let x = 14; x < 34; x++) {
    const dx = (x - 24) / 10, dy = (y - 37) / 3;
    const d2 = dx * dx + dy * dy;
    if (d2 > 1) continue;
    // Rings
    const ring = Math.floor(d2 * 5);
    const col = ring % 2 === 0 ? '#c8a068' : '#b89058';
    px(i, x, y, col);
  }
  // Top highlight
  blk(i, 18, 34, 12, 1, '#d8b878');
  // Center heartwood
  px(i, 24, 37, '#a07838'); px(i, 23, 37, '#a07838'); px(i, 25, 37, '#a07838');

  // Small mushrooms growing on the side
  px(i, 15, 44, '#c0b8a0'); px(i, 14, 44, '#d0c8b0');
  px(i, 15, 43, '#e0d8c0');
  px(i, 32, 46, '#c0b8a0'); px(i, 33, 46, '#d0c8b0');
  px(i, 32, 45, '#e0d8c0');
}

// ═══════════════════════════════════════════════════════════════════
// RENDER ALL
// ═══════════════════════════════════════════════════════════════════

drawOak(0);
drawPine(1);
drawDeadTree(2);
drawStump(3);

const buf = canvas.toBuffer('image/png');
writeFileSync(OUT, buf);
console.log(`✓ trees.png written → ${OUT}  (${TREE_COUNT} trees × ${W}×${H}, ${(buf.length/1024).toFixed(1)} KB)`);
