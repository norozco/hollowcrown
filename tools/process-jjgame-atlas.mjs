#!/usr/bin/env node
/**
 * Pre-process the JJGame top-down RPG atlas:
 * 1. Add an alpha channel (the source PNG is RGB only).
 * 2. Color-key the dark-navy background to transparent so floating
 *    sprites don't render with a black square around them.
 *
 * Output: `public/assets/jjgame/atlas.png` — same dimensions, RGBA,
 * with the bg color replaced by alpha=0.
 *
 * Source: https://jjgame4.itch.io/ultimate-top-down-rpg-fantasy-pixel-art-asset-pack
 * Page text: "Perfect for prototyping or commercial games."
 * Pay-what-you-want pricing. Attribution in CREDITS.md.
 */
import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, '..', 'public', 'assets', 'jjgame', 'spritesheet.png');
const DST = join(__dirname, '..', 'public', 'assets', 'jjgame', 'atlas.png');

/** Background tolerance — a generous threshold catches edge anti-aliased
 *  pixels that are slightly lighter than the pure bg. */
const BG_TOL = 35;

async function main() {
  const img = await loadImage(SRC);
  const W = img.width, H = img.height;
  console.log(`Source: ${SRC} (${W}x${H})`);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, W, H);
  const data = imgData.data;

  // Detect bg color from the top-left 4x4 corner.
  let br = 0, bg = 0, bb = 0;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const i = (y * W + x) * 4;
      br += data[i]; bg += data[i + 1]; bb += data[i + 2];
    }
  }
  br = Math.round(br / 16);
  bg = Math.round(bg / 16);
  bb = Math.round(bb / 16);
  console.log(`Background color: rgb(${br}, ${bg}, ${bb})`);

  // Walk every pixel; clear alpha if it matches the bg.
  let cleared = 0;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - br;
    const dg = data[i + 1] - bg;
    const db = data[i + 2] - bb;
    if (Math.abs(dr) < BG_TOL && Math.abs(dg) < BG_TOL && Math.abs(db) < BG_TOL) {
      data[i + 3] = 0;
      cleared++;
    }
  }
  console.log(`Cleared ${cleared} pixels (${(cleared / (W * H) * 100).toFixed(1)}% of image) to alpha=0`);

  ctx.putImageData(imgData, 0, 0);
  const buf = canvas.toBuffer('image/png');
  writeFileSync(DST, buf);
  console.log(`Wrote ${DST} (${(buf.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
