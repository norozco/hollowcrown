import fs from 'node:fs';
import { PNG } from 'pngjs';

const png = PNG.sync.read(fs.readFileSync('public/assets/tilesets/roguelike-rpg_packed.png'));
const { width: W, data } = png;
const PITCH = 17, TILE = 16;

function avgCenter(r, c) {
  const x0 = c*PITCH, y0 = r*PITCH;
  let R=0,G=0,B=0,n=0,opaque=0;
  for (let dy=0;dy<TILE;dy++) for (let dx=0;dx<TILE;dx++) {
    const i=((y0+dy)*W+(x0+dx))*4;
    if (data[i+3] < 16) continue;
    opaque++; R+=data[i]; G+=data[i+1]; B+=data[i+2];
  }
  return { coverage: +(opaque/(TILE*TILE)).toFixed(2), rgb: n=opaque?[Math.round(R/opaque),Math.round(G/opaque),Math.round(opaque?B/opaque:0)]:null };
}

// Scan everything — produce full grid CSV-like
const rows = Math.floor((png.height+1)/PITCH);
const cols = Math.floor((W+1)/PITCH);
const grid = [];
for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) {
  const t = avgCenter(r,c);
  grid.push({r,c,...t});
}

// Center of colored floor blocks (9-slice layout):
// Each 3x3 color block starts at (25, 0), (25, 3), (25, 6), (25, 9), (25, 12), (25, 15).
// Centers: (26, 1), (26, 4), (26, 7), (26, 10), (26, 13), (26, 16).
const names = ['brown-dirt','grey-stone','sand','grass-green','terracotta','teal'];
console.log('=== PLAIN FLOOR CENTERS ===');
[1,4,7,10,13,16].forEach((c,i) => {
  const t = avgCenter(26,c);
  console.log(`(26,${c}) ${names[i].padEnd(12)} rgb=${t.rgb} cov=${t.coverage}`);
});

// Top-left area 9-slice ponds. Each seems to be 3x3 with decorative edges.
// Looking at my grid: (0,0-4) all cyan solid-ish (water), (6-7) brown pond, (9-10) olive.
// Let me examine row 3-4 cols 0-4 (white snow?)
console.log('\n=== TOP-LEFT 3x3 BLOCKS (decorative ponds) ===');
for (let r=0;r<12;r++) {
  let line = `row ${r.toString().padStart(2)}: `;
  for (let c=0;c<18;c++) {
    const t = avgCenter(r,c);
    line += t.coverage === 0 ? '___ ' : `${t.rgb?.join(',').padEnd(14)}  `;
  }
  console.log(line);
}
