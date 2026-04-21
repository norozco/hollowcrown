// Crop a small region of the sheet for visual inspection.
import fs from 'node:fs';
import { PNG } from 'pngjs';

const [,, rStart, cStart, rCount, cCount, outName] = process.argv;
const src = PNG.sync.read(fs.readFileSync('public/assets/tilesets/roguelike-rpg_packed.png'));
const PITCH = 17, TILE = 16;
const RS = +rStart, CS = +cStart, RC = +rCount, CC = +cCount;
const W = CC * PITCH, H = RC * PITCH;
const out = new PNG({ width: W, height: H });
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const sx = CS * PITCH + x, sy = RS * PITCH + y;
  const si = (sy * src.width + sx) * 4;
  const di = (y * W + x) * 4;
  out.data[di] = src.data[si];
  out.data[di+1] = src.data[si+1];
  out.data[di+2] = src.data[si+2];
  out.data[di+3] = src.data[si+3];
}
fs.writeFileSync(outName, PNG.sync.write(out));
console.log('wrote', outName);
