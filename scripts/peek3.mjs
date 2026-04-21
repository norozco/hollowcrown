import fs from 'node:fs';
import { PNG } from 'pngjs';

const png = PNG.sync.read(fs.readFileSync('public/assets/tilesets/roguelike-rpg_packed.png'));
const { width: W, data } = png;
const PITCH = 17, TILE = 16;

function tile(r, c) {
  const x0 = c*PITCH, y0 = r*PITCH;
  let R=0,G=0,B=0,opaque=0;
  for (let dy=0;dy<TILE;dy++) for (let dx=0;dx<TILE;dx++) {
    const i=((y0+dy)*W+(x0+dx))*4;
    if (data[i+3] < 16) continue;
    opaque++; R+=data[i]; G+=data[i+1]; B+=data[i+2];
  }
  return { cov: +(opaque/(TILE*TILE)).toFixed(2), rgb: opaque?[Math.round(R/opaque),Math.round(G/opaque),Math.round(B/opaque)]:null };
}

// Tree/bush row 6-11, cols 25-40
console.log('=== TREES/BUSHES rows 6-11, cols 25-40 ===');
for (let r=6;r<12;r++) {
  let line = `r${r.toString().padStart(2)}: `;
  for (let c=25;c<42;c++) {
    const t = tile(r,c);
    line += (t.cov===0?'___':`${String(t.rgb||[]).padEnd(11)}`).padEnd(15);
    line += `[${c}] `;
  }
  console.log(line);
}

// Stone wall area rows 12-17, cols 18-32
console.log('\n=== STONE WALL rows 12-17, cols 18-32 ===');
for (let r=12;r<18;r++) {
  let line = `r${r.toString().padStart(2)}: `;
  for (let c=18;c<33;c++) {
    const t = tile(r,c);
    line += (t.cov===0?'___':`${String(t.rgb||[]).padEnd(11)}`).padEnd(13);
  }
  console.log(line);
}

// Doors/windows — rows 0-4 cols 10-30
console.log('\n=== DOORS/WINDOWS rows 0-4, cols 12-28 ===');
for (let r=0;r<5;r++) {
  let line = `r${r.toString().padStart(2)}: `;
  for (let c=12;c<28;c++) {
    const t = tile(r,c);
    line += (t.cov===0?'___':`${String(t.rgb||[]).padEnd(11)}`).padEnd(13);
  }
  console.log(line);
}
