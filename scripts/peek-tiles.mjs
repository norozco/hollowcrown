import fs from 'node:fs';
import { PNG } from 'pngjs';

const png = PNG.sync.read(fs.readFileSync('public/assets/tilesets/roguelike-rpg_packed.png'));
const { width: W, data } = png;
const PITCH = 17, TILE = 16;

function tileInfo(r, c) {
  const x0 = c * PITCH, y0 = r * PITCH;
  let R = 0, G = 0, B = 0, n = 0, minA = 255, maxA = 0;
  // center 8x8
  for (let dy = 4; dy < 12; dy++) for (let dx = 4; dx < 12; dx++) {
    const i = ((y0 + dy) * W + (x0 + dx)) * 4;
    const a = data[i+3]; if (a < 16) continue;
    R += data[i]; G += data[i+1]; B += data[i+2]; n++;
    minA = Math.min(minA, a); maxA = Math.max(maxA, a);
  }
  // edge opacity: sample perimeter pixels
  let edgeOpaque = 0, edgeTotal = 0;
  for (let d = 0; d < TILE; d++) {
    for (const [x, y] of [[x0+d, y0], [x0+d, y0+TILE-1], [x0, y0+d], [x0+TILE-1, y0+d]]) {
      edgeTotal++;
      if (data[(y*W+x)*4+3] >= 16) edgeOpaque++;
    }
  }
  return {
    r, c, rgb: n ? [Math.round(R/n), Math.round(G/n), Math.round(B/n)] : null,
    edgeCoverage: +(edgeOpaque/edgeTotal).toFixed(2),
  };
}

// Specific candidates to inspect
const probes = [
  // The colored blocks in the bottom-left: rows 25-30, cols 0-17
  ...[25,26,27,28,29,30].flatMap(r => [0,3,6,9,12,15].map(c => [r,c])),
  // Row 0-11 leftmost columns (should be grass with decorations)
  ...[0,1,2,3,4,5,6,7,8,9,10,11].map(r => [r, 0]),
  // Water candidates
  [0,0],[0,1],[0,2],[0,3],[0,4],
  // Right side "trees"
  [5,25],[5,26],[6,30],[7,30],
  // Walls middle area
  [0,13],[0,14],[1,13],[2,13],
];

const seen = new Set();
for (const [r,c] of probes) {
  const k = `${r},${c}`; if (seen.has(k)) continue; seen.add(k);
  const t = tileInfo(r,c);
  console.log(`(${r},${c}) rgb=${t.rgb?.join(',') ?? 'empty'} edge=${t.edgeCoverage}`);
}
