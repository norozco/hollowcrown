#!/usr/bin/env node
/**
 * Character sprite PNG generator for Hollowcrown.
 *
 * Produces one 256×48 PNG per race in `src/assets/sprites/`.
 * Each sprite sheet has 8 frames: 4 directions (front, back, left, right)
 * × 2 states (idle, walk).
 *
 * Uses the same drawing logic as generateSprites.ts but runs in Node.js
 * with node-canvas, producing static PNGs that can be hand-edited later.
 *
 * Run:  node tools/generate-sprites.mjs
 */

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../src/assets/sprites');
mkdirSync(OUT_DIR, { recursive: true });

const SW = 32;
const SH = 48;
const FRAMES = 8;

// ─── Color helpers ───────────────────────────────────────────────
function clamp(v) { return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'); }
function dk(h, a = 40) {
  const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
  return `#${clamp(r - a)}${clamp(g - a)}${clamp(b - a)}`;
}
function lt(h, a = 30) {
  const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
  return `#${clamp(r + a)}${clamp(g + a)}${clamp(b + a)}`;
}

// ─── Race bodies ─────────────────────────────────────────────────
const RB = {
  human:      { headW:12, headH:12, headY:6,  bodyW:14, bodyH:12, bodyY:20, legH:8,  armW:3 },
  elf:        { headW:10, headH:13, headY:3,  bodyW:12, bodyH:14, bodyY:18, legH:10, armW:2, pointedEars:true, longEars:true },
  dwarf:      { headW:14, headH:10, headY:12, bodyW:18, bodyH:10, bodyY:24, legH:6,  armW:4, beard:true },
  halfling:   { headW:12, headH:11, headY:11, bodyW:11, bodyH:10, bodyY:24, legH:6,  armW:2, barefoot:true },
  orc:        { headW:15, headH:13, headY:4,  bodyW:20, bodyH:12, bodyY:20, legH:8,  armW:5, tusks:true },
  tiefling:   { headW:12, headH:12, headY:6,  bodyW:14, bodyH:12, bodyY:20, legH:8,  armW:3, horns:true, hornCol:'#483030' },
  dragonborn: { headW:15, headH:14, headY:3,  bodyW:18, bodyH:13, bodyY:20, legH:8,  armW:4, snout:true, tail:true },
  gnome:      { headW:15, headH:13, headY:9,  bodyW:11, bodyH:10, bodyY:24, legH:6,  armW:2, bigEyes:true },
  'half-elf': { headW:11, headH:13, headY:4,  bodyW:13, bodyH:13, bodyY:19, legH:10, armW:3, pointedEars:true, longHair:true },
  tabaxi:     { headW:12, headH:12, headY:5,  bodyW:14, bodyH:12, bodyY:19, legH:9,  armW:3, catEars:true, tail:true, furStripes:true },
};

// Default fighter equipment for race showcase sprites
const FIGHTER_EQUIP = { head:'helmet', armor:'heavy', weapon:'sword', shield:true, chestDetail:'plate_bands' };

// ─── Race palettes ───────────────────────────────────────────────
const RL = {
  human:      { skin:'#e8c090', skinShadow:'#c8a070', hair:'#705030', hairHighlight:'#907050' },
  elf:        { skin:'#f0e0d0', skinShadow:'#d0c0b0', hair:'#b8a848', hairHighlight:'#d0c060' },
  dwarf:      { skin:'#d0a070', skinShadow:'#b08050', hair:'#a05020', hairHighlight:'#c07030' },
  halfling:   { skin:'#e0b888', skinShadow:'#c09868', hair:'#706028', hairHighlight:'#908040' },
  orc:        { skin:'#589050', skinShadow:'#407030', hair:'#303030', hairHighlight:'#484848' },
  tiefling:   { skin:'#c06058', skinShadow:'#a04038', hair:'#201020', hairHighlight:'#382838' },
  dragonborn: { skin:'#708870', skinShadow:'#506850', hair:'#506850', hairHighlight:'#608060' },
  gnome:      { skin:'#f0e0b0', skinShadow:'#d0c090', hair:'#d06020', hairHighlight:'#e07830' },
  'half-elf': { skin:'#d8c8a0', skinShadow:'#b8a880', hair:'#785830', hairHighlight:'#907040' },
  tabaxi:     { skin:'#c0a070', skinShadow:'#a08050', hair:'#604020', hairHighlight:'#805030' },
};

// Fighter class colors
const FIGHTER_COL = { tunic:'#707888', tunicDark:'#505868', tunicLight:'#909898', belt:'#606068' };

function racePalette(race) {
  const r = RL[race] ?? RL.human;
  return { ...r, ...FIGHTER_COL, boots:'#503820', eyes:'#181818' };
}

// ─── Drawing ─────────────────────────────────────────────────────
function px(c, f, x, y, cl) { c.fillStyle = cl; c.fillRect(f * SW + x, y, 1, 1); }
function bk(c, f, x, y, w, h, cl) { c.fillStyle = cl; c.fillRect(f * SW + x, y, w, h); }

function outline(c, f) {
  const ox = f * SW;
  const d = c.getImageData(ox, 0, SW, SH).data;
  const op = (x, y) => x >= 0 && x < SW && y >= 0 && y < SH && d[(y * SW + x) * 4 + 3] > 20;
  const pts = [];
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++)
    if (!op(x, y) && (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1))) pts.push([x, y]);
  c.fillStyle = '#1a1008';
  for (const [x, y] of pts) c.fillRect(ox + x, y, 1, 1);
}

function draw(c, f, col, rb, ce, dir, walk, race) {
  const cx = 16, isFr = dir === 0, isBk = dir === 1, isSd = dir >= 2;
  const bx = cx - rb.bodyW / 2, legOff = walk ? 2 : 0;

  // Shadow
  bk(c, f, cx - 6, 44, 12, 3, 'rgba(0,0,0,0.2)');

  // BOOTS
  const bY = rb.bodyY + rb.bodyH + rb.legH - 6;
  const btC = ce.armor === 'heavy' ? '#505860' : col.boots;
  const btH = lt(btC, 25);
  if (rb.barefoot) {
    if (!isSd) {
      bk(c, f, cx - 6, bY + legOff, 5, 5 - legOff, col.skin); bk(c, f, cx + 1, bY - legOff, 5, 5 + legOff, col.skin);
      bk(c, f, cx - 6, bY + legOff, 5, 1, lt(col.skin, 15)); bk(c, f, cx + 1, bY - legOff, 5, 1, lt(col.skin, 15));
      px(c, f, cx - 5, bY + legOff + 3, col.skinShadow); px(c, f, cx - 3, bY + legOff + 3, col.skinShadow);
      px(c, f, cx + 2, bY - legOff + 3, col.skinShadow); px(c, f, cx + 4, bY - legOff + 3, col.skinShadow);
    } else { bk(c, f, cx - 3, bY, 5, 5, col.skin); }
  } else {
    if (!isSd) {
      bk(c, f, cx - 5, bY + legOff, 4, 6 - legOff, btC); bk(c, f, cx + 1, bY - legOff, 4, 6 + legOff, btC);
      bk(c, f, cx - 5, bY + legOff, 4, 1, btH); bk(c, f, cx + 1, bY - legOff, 4, 1, btH);
      px(c, f, cx - 4, bY + legOff + 2, '#909088'); px(c, f, cx + 2, bY - legOff + 2, '#909088');
    } else { bk(c, f, cx - 3, bY - legOff, 5, 6 + legOff, btC); bk(c, f, cx - 3, bY - legOff, 5, 1, btH); }
  }

  // LEGS
  const lY = rb.bodyY + rb.bodyH;
  const lC = ce.armor === 'robes' ? col.tunic : col.tunicDark;
  bk(c, f, bx, lY, rb.bodyW, rb.legH, lC);
  if (isFr && ce.armor !== 'robes') bk(c, f, cx - 1, lY + 2, 2, rb.legH - 2, dk(lC, 15));

  // BODY / ARMOR
  bk(c, f, bx, rb.bodyY, rb.bodyW, rb.bodyH, col.tunic);
  if (ce.armor === 'heavy') {
    bk(c, f, bx + 1, rb.bodyY + 1, rb.bodyW - 2, rb.bodyH - 2, col.tunicLight);
    for (let ay = rb.bodyY + 3; ay < rb.bodyY + rb.bodyH; ay += 3) bk(c, f, bx + 1, ay, rb.bodyW - 2, 1, col.tunicDark);
    bk(c, f, bx - 3, rb.bodyY, rb.bodyW + 6, 4, col.tunicLight);
    bk(c, f, bx - 3, rb.bodyY, rb.bodyW + 6, 1, lt(col.tunicLight, 20));
    bk(c, f, bx - 3, rb.bodyY + 3, rb.bodyW + 6, 1, col.tunicDark);
    px(c, f, bx - 2, rb.bodyY + 1, '#c0c0b8'); px(c, f, bx + rb.bodyW + 1, rb.bodyY + 1, '#c0c0b8');
    if (isFr) { px(c, f, cx - 4, lY + 2, '#606868'); px(c, f, cx + 3, lY + 2, '#606868'); }
  } else if (ce.armor === 'robes') {
    bk(c, f, bx - 1, rb.bodyY + 4, rb.bodyW + 2, rb.bodyH - 4, col.tunic);
    bk(c, f, bx - 2, lY, rb.bodyW + 4, rb.legH + 2, col.tunic);
    bk(c, f, bx - 2, lY + rb.legH, rb.bodyW + 4, 2, col.tunicLight);
    if (isFr) bk(c, f, cx - 1, rb.bodyY + 2, 2, rb.bodyH + rb.legH, col.tunicDark);
    bk(c, f, bx - rb.armW - 1, rb.bodyY + rb.bodyH - 4, rb.armW + 2, 3, col.tunicLight);
    bk(c, f, bx + rb.bodyW - 1, rb.bodyY + rb.bodyH - 4, rb.armW + 2, 3, col.tunicLight);
  } else if (ce.armor === 'medium') {
    bk(c, f, bx + 1, rb.bodyY + 1, rb.bodyW - 2, rb.bodyH - 2, col.tunicLight);
    for (let ay = rb.bodyY + 2; ay < rb.bodyY + rb.bodyH - 2; ay += 2)
      for (let ax = bx + 2; ax < bx + rb.bodyW - 2; ax += 2) px(c, f, ax, ay, col.tunicDark);
  } else {
    bk(c, f, bx + 1, rb.bodyY + 1, rb.bodyW - 2, rb.bodyH - 2, col.tunicLight);
    if (isFr) bk(c, f, cx - 1, rb.bodyY + 3, 2, rb.bodyH - 4, col.tunicDark);
  }

  // CHEST DETAIL
  if (isFr && ce.chestDetail) {
    const cdY = rb.bodyY + 3;
    if (ce.chestDetail === 'plate_bands') {
      px(c, f, cx, cdY, '#c0c0b8'); px(c, f, cx - 1, cdY + 1, '#c0c0b8');
      px(c, f, cx + 1, cdY + 1, '#c0c0b8'); px(c, f, cx, cdY + 2, '#c0c0b8');
    }
  }

  // Belt
  bk(c, f, bx, rb.bodyY + rb.bodyH - 3, rb.bodyW, 3, col.belt);
  px(c, f, cx, rb.bodyY + rb.bodyH - 2, lt(col.belt, 40));

  // ARMS
  const armC = ce.armor === 'heavy' ? col.tunicLight : col.tunic;
  if (!isSd) {
    bk(c, f, bx - rb.armW, rb.bodyY + 2, rb.armW, rb.bodyH - 2, armC);
    bk(c, f, bx + rb.bodyW, rb.bodyY + 2, rb.armW, rb.bodyH - 2, armC);
    bk(c, f, bx - rb.armW, rb.bodyY + rb.bodyH - 2, rb.armW, 2, col.skin);
    bk(c, f, bx + rb.bodyW, rb.bodyY + rb.bodyH - 2, rb.armW, 2, col.skin);
    if (ce.armor === 'heavy') {
      bk(c, f, bx - rb.armW, rb.bodyY + rb.bodyH - 4, rb.armW, 2, '#606868');
      bk(c, f, bx + rb.bodyW, rb.bodyY + rb.bodyH - 4, rb.armW, 2, '#606868');
    }
  } else {
    bk(c, f, bx, rb.bodyY + 2, rb.armW, rb.bodyH - 2, armC);
    bk(c, f, bx, rb.bodyY + rb.bodyH - 2, rb.armW, 2, col.skin);
  }

  // CAPE (for fighter, no cape)

  // SHIELD
  if (ce.shield && (isBk || isSd)) {
    const sx = isBk ? bx + rb.bodyW - 2 : bx - 5;
    bk(c, f, sx, rb.bodyY + 2, 6, 8, '#a08030'); bk(c, f, sx + 1, rb.bodyY + 3, 4, 6, '#c0a040');
    px(c, f, sx + 3, rb.bodyY + 5, '#e0c060');
  }

  // NECK
  bk(c, f, cx - 3, rb.headY + rb.headH - 2, 6, 4, col.skin);

  // HEAD
  const hx = cx - rb.headW / 2;
  if (isBk) {
    bk(c, f, hx, rb.headY, rb.headW, rb.headH, col.hair);
    bk(c, f, hx + 2, rb.headY, rb.headW - 4, 2, col.hairHighlight);
    if (rb.longHair) bk(c, f, cx - 3, rb.headY + rb.headH, 6, 6, col.hair);
    if (rb.pointedEars) {
      px(c, f, hx - 1, rb.headY + 4, col.skin); px(c, f, hx + rb.headW, rb.headY + 4, col.skin);
      if (rb.longEars) { px(c, f, hx - 2, rb.headY + 3, col.skin); px(c, f, hx + rb.headW + 1, rb.headY + 3, col.skin); }
    }
  } else if (isSd) {
    bk(c, f, hx, rb.headY, rb.headW, rb.headH, col.skin);
    bk(c, f, hx, rb.headY, rb.headW, 5, col.hair);
    bk(c, f, hx + rb.headW - 4, rb.headY, 4, rb.headH, col.hair);
    bk(c, f, hx + 2, rb.headY, rb.headW - 4, 2, col.hairHighlight);
    const ex = hx + 3;
    if (rb.bigEyes) { bk(c, f, ex, rb.headY + 4, 3, 3, col.eyes); px(c, f, ex, rb.headY + 4, '#ffffff'); px(c, f, ex + 1, rb.headY + 4, '#ffffff'); }
    else { bk(c, f, ex, rb.headY + 5, 2, 2, col.eyes); px(c, f, ex, rb.headY + 5, '#ffffff'); }
    if (rb.pointedEars) { px(c, f, hx - 2, rb.headY + 4, col.skin); if (rb.longEars) px(c, f, hx - 3, rb.headY + 3, col.skin); }
    if (rb.longHair) bk(c, f, hx + rb.headW - 2, rb.headY + rb.headH - 2, 3, 5, col.hair);
    if (rb.furStripes) { px(c, f, hx + 2, rb.headY + 3, col.hairHighlight); px(c, f, hx + 5, rb.headY + 6, col.hairHighlight); }
  } else {
    // Front
    bk(c, f, hx, rb.headY, rb.headW, rb.headH, col.skin);
    bk(c, f, hx - 1, rb.headY + 2, rb.headW + 2, rb.headH - 4, col.skin);
    bk(c, f, hx, rb.headY + rb.headH - 3, rb.headW, 3, col.skinShadow);
    // Hair
    if (race !== 'dragonborn') {
      bk(c, f, hx - 1, rb.headY - 2, rb.headW + 2, 5, col.hair);
      bk(c, f, hx, rb.headY + 2, 3, 3, col.hair); bk(c, f, hx + rb.headW - 3, rb.headY + 2, 3, 3, col.hair);
      bk(c, f, hx + 2, rb.headY - 2, rb.headW - 4, 2, col.hairHighlight);
      if (rb.longHair) { bk(c, f, hx - 1, rb.headY + rb.headH - 2, 2, 4, col.hair); bk(c, f, hx + rb.headW - 1, rb.headY + rb.headH - 2, 2, 4, col.hair); }
      if (rb.bigEyes) { bk(c, f, hx + 2, rb.headY - 4, rb.headW - 4, 3, col.hair); px(c, f, hx + 3, rb.headY - 5, col.hairHighlight); px(c, f, hx + rb.headW - 4, rb.headY - 5, col.hairHighlight); }
    } else {
      bk(c, f, hx, rb.headY - 2, rb.headW, 3, col.skin);
      for (let sx = hx + 2; sx < hx + rb.headW - 1; sx += 3) px(c, f, sx, rb.headY - 1, col.skinShadow);
    }
    // Eyes
    if (rb.bigEyes) {
      bk(c, f, hx + 2, rb.headY + 4, 3, 3, col.eyes); bk(c, f, hx + rb.headW - 5, rb.headY + 4, 3, 3, col.eyes);
      px(c, f, hx + 2, rb.headY + 4, '#ffffff'); px(c, f, hx + 3, rb.headY + 4, '#ffffff');
      px(c, f, hx + rb.headW - 5, rb.headY + 4, '#ffffff'); px(c, f, hx + rb.headW - 4, rb.headY + 4, '#ffffff');
    } else {
      bk(c, f, hx + 2, rb.headY + 5, 2, 2, col.eyes); bk(c, f, hx + rb.headW - 4, rb.headY + 5, 2, 2, col.eyes);
      px(c, f, hx + 2, rb.headY + 5, '#ffffff'); px(c, f, hx + rb.headW - 4, rb.headY + 5, '#ffffff');
    }
    // Mouth
    px(c, f, cx - 1, rb.headY + rb.headH - 3, col.skinShadow); px(c, f, cx, rb.headY + rb.headH - 3, col.skinShadow);
    if (rb.pointedEars) {
      px(c, f, hx - 2, rb.headY + 4, col.skin); px(c, f, hx + rb.headW + 1, rb.headY + 4, col.skin);
      if (rb.longEars) { px(c, f, hx - 3, rb.headY + 3, col.skin); px(c, f, hx + rb.headW + 2, rb.headY + 3, col.skin); }
    }
    if (rb.furStripes) {
      px(c, f, hx + 1, rb.headY + 3, col.hairHighlight); px(c, f, hx + rb.headW - 2, rb.headY + 3, col.hairHighlight);
      px(c, f, hx + 3, rb.headY + rb.headH - 4, col.hairHighlight);
    }
  }

  // RACE FEATURES
  if (rb.beard && !isBk) {
    bk(c, f, cx - 4, rb.headY + rb.headH - 4, 8, 6, col.hair);
    bk(c, f, cx - 3, rb.headY + rb.headH, 6, 4, col.hair);
    bk(c, f, cx - 2, rb.headY + rb.headH + 3, 4, 2, dk(col.hair, 20));
    px(c, f, cx, rb.headY + rb.headH + 2, col.hairHighlight);
  }
  if (rb.tusks && isFr) { px(c, f, hx + 1, rb.headY + rb.headH - 2, '#e0e0d0'); px(c, f, hx + rb.headW - 2, rb.headY + rb.headH - 2, '#e0e0d0'); }
  if (rb.horns) {
    const hc = rb.hornCol ?? '#483030';
    bk(c, f, hx + 1, rb.headY - 5, 2, 5, hc); bk(c, f, hx + rb.headW - 3, rb.headY - 5, 2, 5, hc);
    px(c, f, hx, rb.headY - 6, lt(hc, 20)); px(c, f, hx + rb.headW - 2, rb.headY - 6, lt(hc, 20));
  }
  if (rb.snout && isFr) {
    bk(c, f, cx - 4, rb.headY + rb.headH - 5, 8, 5, col.skinShadow);
    bk(c, f, cx - 3, rb.headY + rb.headH - 4, 6, 3, col.skin);
    px(c, f, cx - 2, rb.headY + rb.headH - 4, dk(col.skin, 30));
    px(c, f, cx + 2, rb.headY + rb.headH - 4, dk(col.skin, 30));
    bk(c, f, hx - 1, rb.headY + rb.headH - 2, rb.headW + 2, 2, col.skinShadow);
  }
  if (rb.snout && isSd) {
    bk(c, f, hx - 2, rb.headY + rb.headH - 4, 3, 3, col.skin);
    px(c, f, hx - 3, rb.headY + rb.headH - 3, col.skinShadow);
  }
  if (rb.catEars) {
    px(c, f, hx + 1, rb.headY - 3, col.hair); px(c, f, hx + 2, rb.headY - 4, col.hair); px(c, f, hx + 3, rb.headY - 5, col.hair);
    px(c, f, hx + rb.headW - 2, rb.headY - 3, col.hair); px(c, f, hx + rb.headW - 3, rb.headY - 4, col.hair); px(c, f, hx + rb.headW - 4, rb.headY - 5, col.hair);
    px(c, f, hx + 2, rb.headY - 3, '#e0a090'); px(c, f, hx + rb.headW - 3, rb.headY - 3, '#e0a090');
  }
  if (rb.tail && !isFr) {
    if (race === 'dragonborn') {
      if (isBk) {
        const tailBase = lY + rb.legH - 4;
        for (let t = 0; t < 8; t++) {
          const tw = 3 - Math.floor(t / 3);
          const tx = cx + 1 + Math.floor(t / 2);
          bk(c, f, tx - 1, tailBase + t, tw, 2, col.skin);
          if (t % 2 === 0) px(c, f, tx, tailBase + t, col.skinShadow);
        }
        px(c, f, cx + 5, tailBase + 8, col.skinShadow);
      } else {
        const tailBase = lY + rb.legH / 2;
        for (let t = 0; t < 8; t++) {
          const tw = 3 - Math.floor(t / 3);
          bk(c, f, bx + rb.bodyW + t, tailBase + t, tw, 2, col.skin);
          if (t % 2 === 0) px(c, f, bx + rb.bodyW + t + 1, tailBase + t, col.skinShadow);
        }
      }
    } else {
      // Tabaxi cat tail
      if (isBk) {
        for (let t = 0; t < 6; t++) { px(c, f, cx + 2 + t, lY + rb.legH - 3 + t, col.hair); px(c, f, cx + 2 + t, lY + rb.legH - 2 + t, dk(col.hair, 20)); }
      } else {
        for (let t = 0; t < 6; t++) { px(c, f, bx + rb.bodyW + t, lY + t, col.hair); px(c, f, bx + rb.bodyW + t, lY + t + 1, dk(col.hair, 20)); }
      }
    }
  }

  // DRAGONBORN EXTRAS
  if (race === 'dragonborn') {
    if (isFr) {
      for (let sy = rb.bodyY + 2; sy < rb.bodyY + rb.bodyH - 3; sy += 3)
        for (let sx = bx + 2; sx < bx + rb.bodyW - 2; sx += 4) {
          px(c, f, sx, sy, col.skinShadow);
          px(c, f, sx + 1, sy + 1, col.skinShadow);
          px(c, f, sx + 2, sy, col.skinShadow);
        }
    }
    if (isBk) {
      for (let sp = 0; sp < 4; sp++) {
        const spY = rb.bodyY + 2 + sp * 3;
        px(c, f, cx, spY - 1, lt(col.skin, 30));
        px(c, f, cx - 1, spY, col.skin); px(c, f, cx + 1, spY, col.skin);
        px(c, f, cx, spY, lt(col.skin, 15));
      }
    }
    if (!isSd) {
      bk(c, f, bx - rb.armW, rb.bodyY + rb.bodyH - 2, rb.armW, 2, col.skinShadow);
      bk(c, f, bx + rb.bodyW, rb.bodyY + rb.bodyH - 2, rb.armW, 2, col.skinShadow);
      px(c, f, bx - rb.armW, rb.bodyY + rb.bodyH, dk(col.skin, 30));
      px(c, f, bx + rb.bodyW + rb.armW - 1, rb.bodyY + rb.bodyH, dk(col.skin, 30));
    }
    bk(c, f, cx - 4, rb.headY + rb.headH - 2, 8, 4, col.skin);
    if (isFr) bk(c, f, hx + 1, rb.headY + 3, rb.headW - 2, 2, col.skinShadow);
    const glowBright = lt(col.skin, 50);
    if (isFr) {
      px(c, f, bx - rb.armW - 1, rb.bodyY + rb.bodyH - 1, glowBright);
      px(c, f, bx + rb.bodyW + rb.armW, rb.bodyY + rb.bodyH - 1, glowBright);
      px(c, f, cx, rb.bodyY + 4, glowBright);
      px(c, f, cx - 1, rb.bodyY + 5, lt(col.skin, 30));
      px(c, f, cx + 1, rb.bodyY + 5, lt(col.skin, 30));
    }
  }

  // HEADGEAR (helmet for fighter)
  if (ce.head === 'helmet') {
    bk(c, f, hx - 1, rb.headY - 2, rb.headW + 2, 7, '#808888');
    bk(c, f, hx, rb.headY - 2, rb.headW, 1, '#a0a8a8');
    if (isFr) { bk(c, f, cx - 4, rb.headY + 3, 8, 2, '#707878'); px(c, f, cx, rb.headY - 3, '#b0b8b8'); }
    px(c, f, hx, rb.headY, '#c0c0b8'); px(c, f, hx + rb.headW - 1, rb.headY, '#c0c0b8');
  }

  // TIEFLING HORNS THROUGH HEADGEAR
  if (rb.horns && ce.head !== 'none') {
    const hc = rb.hornCol ?? '#483030';
    px(c, f, hx + 1, rb.headY - 6, hc); px(c, f, hx + rb.headW - 2, rb.headY - 6, hc);
    px(c, f, hx, rb.headY - 7, lt(hc, 20)); px(c, f, hx + rb.headW - 1, rb.headY - 7, lt(hc, 20));
  }

  // HALF-ELF NECK CLASP
  if (rb.longHair && isFr) px(c, f, cx, rb.headY + rb.headH + 1, '#90a0b0');

  // WEAPON (sword for fighter)
  if (ce.weapon === 'sword' && (isFr || isSd)) {
    const wx = isSd ? bx - 3 : bx + rb.bodyW + rb.armW;
    bk(c, f, wx, rb.bodyY - 4, 2, 16, '#b0b0b8'); px(c, f, wx, rb.bodyY - 5, '#d0d0d8');
    bk(c, f, wx - 1, rb.bodyY + 10, 4, 2, '#a08030'); bk(c, f, wx, rb.bodyY + 12, 2, 4, '#705030');
  }

  // OUTLINE
  outline(c, f);
}

// ═══════════════════════════════════════════════════════════════════
// GENERATE ALL RACES
// ═══════════════════════════════════════════════════════════════════

const races = Object.keys(RB);
let totalSize = 0;

for (const race of races) {
  const canvas = createCanvas(FRAMES * SW, SH);
  const ctx = canvas.getContext('2d');
  const col = racePalette(race);
  const rb = RB[race];
  const ce = FIGHTER_EQUIP;

  for (let f = 0; f < 8; f++) {
    draw(ctx, f, col, rb, ce, f % 4, f >= 4, race);
  }

  const outPath = resolve(OUT_DIR, `${race}.png`);
  const buf = canvas.toBuffer('image/png');
  writeFileSync(outPath, buf);
  totalSize += buf.length;
  console.log(`  ${race}.png  (${buf.length} bytes)`);
}

console.log(`\n✓ ${races.length} race sprites written → ${OUT_DIR}  (${(totalSize/1024).toFixed(1)} KB total)`);
