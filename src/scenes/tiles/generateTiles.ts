import * as Phaser from 'phaser';

/**
 * Procedural pixel-art tileset — 32 tiles, ALTTP/Pokemon quality target.
 *
 * Tiles 0-15:  terrain (grass, path, walls, roof, etc.)
 * Tiles 16-31: furniture & decoration (bookshelf, bed, table, etc.)
 *
 * Every tile is 32×32 with 4-8 colors, deliberate pixel patterns,
 * highlight/shadow edges, and enough detail to read as hand-drawn.
 */

export const TILE = {
  GRASS_DARK: 0, GRASS_LIGHT: 1, PATH: 2, WALL_STONE: 3,
  WALL_WOOD: 4, DOOR: 5, FLOOR_WOOD: 6, FLOOR_STONE: 7,
  ROOF: 8, ROOF_EDGE: 9, SHADOW: 10, BUSH: 11,
  FENCE: 12, PATH_EDGE: 13, WELL: 14, WATER: 15,
  // Furniture & decor
  BOOKSHELF: 16, COUNTER: 17, BED_HEAD: 18, BED_FOOT: 19,
  TABLE: 20, CHAIR: 21, BARREL: 22, CRATE: 23,
  FIREPLACE: 24, PLANT: 25, RUG_CENTER: 26, RUG_EDGE: 27,
  WEAPON_RACK: 28, WINDOW: 29, TORCH: 30, DISPLAY: 31,
} as const;

export const TILE_SIZE = 32;
const TILE_COUNT = 32;
const S = TILE_SIZE;

export function generateTileset(scene: Phaser.Scene): void {
  if (scene.textures.exists('tileset')) return;
  const canvas = document.createElement('canvas');
  canvas.width = TILE_COUNT * S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  // Terrain
  drawGrassDark(ctx, 0); drawGrassLight(ctx, 1); drawPath(ctx, 2);
  drawWallStone(ctx, 3); drawWallWood(ctx, 4); drawDoor(ctx, 5);
  drawFloorWood(ctx, 6); drawFloorStone(ctx, 7); drawRoof(ctx, 8);
  drawRoofEdge(ctx, 9); drawShadow(ctx, 10); drawBush(ctx, 11);
  drawFence(ctx, 12); drawPathEdge(ctx, 13); drawWell(ctx, 14);
  drawWater(ctx, 15);
  // Furniture
  drawBookshelf(ctx, 16); drawCounter(ctx, 17); drawBedHead(ctx, 18);
  drawBedFoot(ctx, 19); drawTable(ctx, 20); drawChair(ctx, 21);
  drawBarrel(ctx, 22); drawCrate(ctx, 23); drawFireplace(ctx, 24);
  drawPlant(ctx, 25); drawRugCenter(ctx, 26); drawRugEdge(ctx, 27);
  drawWeaponRack(ctx, 28); drawWindow(ctx, 29); drawTorch(ctx, 30);
  drawDisplay(ctx, 31);

  const tex = scene.textures.addCanvas('tileset', canvas);
  if (tex) { for (let i = 0; i < TILE_COUNT; i++) tex.add(i, 0, i * S, 0, S, S); }
}

// ─── Helpers ──────────────────────────────────────────────────
type Ctx = CanvasRenderingContext2D;
function ox(i: number) { return i * S; }
function px(c: Ctx, i: number, x: number, y: number, col: string) { c.fillStyle = col; c.fillRect(ox(i)+x, y, 1, 1); }
function blk(c: Ctx, i: number, x: number, y: number, w: number, h: number, col: string) { c.fillStyle = col; c.fillRect(ox(i)+x, y, w, h); }
function fill(c: Ctx, i: number, col: string) { blk(c, i, 0, 0, S, S, col); }

// ═══════════════════════════════════════════════════════════════
// TERRAIN TILES (0-15) — same ALTTP-quality as before
// ═══════════════════════════════════════════════════════════════

function drawGrassDark(c: Ctx, i: number) {
  fill(c, i, '#48a020');
  const blades: [number,number][] = [[3,5],[10,2],[20,7],[28,4],[6,16],[15,14],[24,18],[30,12],[8,24],[18,26],[26,22],[14,8]];
  for (const [bx,by] of blades) { px(c,i,bx,by+2,'#389018'); px(c,i,bx+1,by+2,'#389018'); px(c,i,bx,by+1,'#50b028'); px(c,i,bx+2,by+1,'#50b028'); px(c,i,bx+1,by,'#68c038'); }
  const fl: [number,number][] = [[7,9],[19,5],[29,15],[4,22],[16,20],[25,28],[11,30],[31,8]];
  for (const [fx,fy] of fl) { px(c,i,fx,fy,'#e8e8d8'); px(c,i,fx+1,fy,'#d8d8c8'); }
}
function drawGrassLight(c: Ctx, i: number) {
  fill(c, i, '#58b028');
  const bl: [number,number][] = [[5,8],[18,4],[28,12],[10,22],[24,26]];
  for (const [bx,by] of bl) { px(c,i,bx+1,by,'#78d048'); px(c,i,bx,by+1,'#60b830'); px(c,i,bx+2,by+1,'#60b830'); }
  const fl: [number,number][] = [[3,4],[12,7],[22,3],[30,10],[8,18],[17,22],[27,26],[5,28],[20,14]];
  for (const [fx,fy] of fl) { px(c,i,fx,fy,'#f0f0e0'); }
}
function drawPath(c: Ctx, i: number) {
  fill(c, i, '#c8a058');
  blk(c,i,0,0,S,3,'#b09048'); blk(c,i,0,S-3,S,3,'#b09048');
  const st: [number,number,number,number][] = [[3,4,5,4],[12,2,6,4],[22,5,5,3],[5,12,6,5],[16,10,5,4],[26,13,4,3],[8,20,5,4],[18,22,6,3],[28,20,4,4],[14,26,5,3],[3,28,4,3],[24,27,5,4]];
  for (const [sx,sy,sw,sh] of st) { blk(c,i,sx,sy,sw,sh,'#b89850'); blk(c,i,sx,sy,sw,1,'#d8b868'); blk(c,i,sx,sy+sh-1,sw,1,'#987838'); }
}
function drawWallStone(c: Ctx, i: number) {
  fill(c, i, '#888880');
  for (let r=0;r<4;r++){const by=r*8;const off=r%2===0?0:7;blk(c,i,0,by+7,S,1,'#585850');
  for(let col=-1;col<4;col++){const bx=off+col*16;if(bx>=S)break;const cx=Math.max(0,bx);const cw=Math.min(14,S-cx);if(cw<=0)continue;
  const sh=['#909088','#888880','#808078','#989890'][(r+col)&3];blk(c,i,cx,by,cw,7,sh);blk(c,i,cx,by,cw,1,'#a8a8a0');blk(c,i,cx,by,1,7,'#a0a098');blk(c,i,cx,by+6,cw,1,'#686860');blk(c,i,cx+cw-1,by,1,7,'#707068');if(bx>0)blk(c,i,bx-1,by,2,7,'#585850');}}
  blk(c,i,0,0,S,1,'#b0b0a8');
}
function drawWallWood(c: Ctx, i: number) {
  fill(c, i, '#906830'); let p=0;
  for(let n=0;n<5;n++){const w=n<4?6:S-p;const sh=n%2===0?'#987038':'#886028';blk(c,i,p,0,w,S,sh);blk(c,i,p,0,1,S,'#a88848');blk(c,i,p+w-1,0,1,S,'#704820');if(n%2===0){const ky=6+n*6;blk(c,i,p+2,ky,3,3,'#705020');}blk(c,i,p+w,0,1,S,'#503818');p+=w+1;}
  blk(c,i,0,0,S,1,'#b89850');
}
function drawDoor(c: Ctx, i: number) {
  fill(c,i,'#181010');blk(c,i,0,0,S,3,'#886838');blk(c,i,0,0,4,S,'#785828');blk(c,i,S-4,0,4,S,'#785828');
  blk(c,i,0,0,S,1,'#a88848');blk(c,i,6,4,S-12,S-6,'#281810');blk(c,i,10,8,S-20,S-12,'#302018');
  blk(c,i,4,S-3,S-8,3,'#a09880');blk(c,i,4,S-3,S-8,1,'#b8b0a0');
}
function drawFloorWood(c: Ctx, i: number) {
  fill(c,i,'#987048');for(let r=0;r<4;r++){const py=r*8;blk(c,i,0,py,S,7,r%2===0?'#987048':'#a07850');blk(c,i,0,py,S,1,'#a88858');blk(c,i,0,py+7,S,1,'#705028');px(c,i,5+r*3,py+3,'#685020');}
}
function drawFloorStone(c: Ctx, i: number) {
  fill(c,i,'#787870');for(let r=0;r<2;r++)for(let cl=0;cl<2;cl++){const sx=cl*16+(r%2===0?0:8),sy=r*16;const sh=(r+cl)%2===0?'#808078':'#707068';blk(c,i,sx,sy,15,15,sh);blk(c,i,sx,sy,15,1,'#909088');blk(c,i,sx,sy,1,15,'#888880');blk(c,i,sx+14,sy,1,15,'#606058');blk(c,i,sx,sy+14,15,1,'#585850');}
}
function drawRoof(c: Ctx, i: number) {
  fill(c,i,'#a04830');for(let r=0;r<4;r++){const ry=r*8;const off=r%2===0?0:8;for(let cl=-1;cl<3;cl++){const tx=off+cl*16;for(let dy=0;dy<8;dy++){const color=dy<2?'#c06848':dy<4?'#b05838':dy<6?'#a04830':'#883828';const tx0=Math.max(0,tx);const tw=Math.min(16,S-tx0);if(tw>0)blk(c,i,tx0,ry+dy,tw,1,color);}}}
}
function drawRoofEdge(c: Ctx, i: number) {
  fill(c,i,'#984028');for(let dy=0;dy<14;dy++){blk(c,i,0,dy,S,1,dy<4?'#b05838':dy<8?'#a04830':dy<12?'#984028':'#883020');}
  blk(c,i,0,12,S,4,'#682818');blk(c,i,0,16,S,4,'#303028');blk(c,i,0,20,S,4,'#484840');blk(c,i,0,24,S,4,'#585850');blk(c,i,0,28,S,4,'#686860');
}
function drawShadow(c: Ctx, i: number) {
  blk(c,i,0,0,S,6,'#1a2a10');blk(c,i,0,6,S,6,'#283818');blk(c,i,0,12,S,6,'#344820');blk(c,i,0,18,S,6,'#408028');blk(c,i,0,24,S,8,'#48a020');
}
function drawBush(c: Ctx, i: number) {
  fill(c,i,'#48a020');const cx=16,cy=16;
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){const dx=(x-cx)/14,dy=(y-cy)/13,d2=dx*dx+dy*dy;if(d2<=1){const v=(y-4)/28,dark=v*0.6+d2*0.4;px(c,i,x,y,dark<0.25?'#58c838':dark<0.4?'#48b028':dark<0.55?'#389818':dark<0.7?'#288010':'#1a6808');}}
  blk(c,i,11,6,4,2,'#68d848');blk(c,i,17,5,3,2,'#68d848');
}
function drawFence(c: Ctx, i: number) {
  fill(c,i,'#48a020');const pX=12;blk(c,i,pX+2,26,8,4,'#2a5a10');blk(c,i,pX,6,8,20,'#a07840');blk(c,i,pX,6,2,20,'#b89050');blk(c,i,pX+6,6,2,20,'#786030');blk(c,i,pX+1,2,6,4,'#b89050');blk(c,i,pX+2,0,4,2,'#c8a060');blk(c,i,0,12,pX,4,'#987040');blk(c,i,pX+8,12,S-pX-8,4,'#987040');
}
function drawPathEdge(c: Ctx, i: number) {
  fill(c,i,'#c8a058');blk(c,i,0,0,S,12,'#48a020');
  const e=[13,12,13,14,12,11,13,14,13,12,11,13,14,12,13,12,14,13,12,11,13,14,12,13,11,12,14,13,12,13,14,12];
  for(let x=0;x<S;x++){blk(c,i,x,e[x]-1,1,1,'#389018');}
  px(c,i,5,4,'#e8e8d8');px(c,i,18,6,'#e8e8d8');px(c,i,28,3,'#e0e0d0');
}
function drawWell(c: Ctx, i: number) {
  fill(c,i,'#48a020');for(let y=6;y<28;y++)for(let x=6;x<26;x++){const d=(x-16)*(x-16)/100+(y-17)*(y-17)/100;if(d<=1)px(c,i,x,y,d<0.45?y<14?'#285878':'#304860':y<14?'#a0a098':y<20?'#888880':'#686860');}
}
function drawWater(c: Ctx, i: number) {
  fill(c,i,'#4080b0');blk(c,i,0,0,S,8,'#4888b8');blk(c,i,0,24,S,8,'#3870a0');
  for(let r=0;r<4;r++){const wy=r*8+3;const off=r%2===0?0:4;for(let x=0;x<S;x++){const ph=(x+off)%10;if(ph<3)px(c,i,x,wy,'#60a0d0');else if(ph<5)px(c,i,x,wy,'#78b8e0');else if(ph===5)px(c,i,x,wy,'#88c8e8');px(c,i,x,wy+1,'#3070a0');}}
}

// ═══════════════════════════════════════════════════════════════
// FURNITURE TILES (16-31) — Pokemon interior quality
// ═══════════════════════════════════════════════════════════════

function drawBookshelf(c: Ctx, i: number) {
  // Wood frame with visible book spines in multiple colors
  fill(c, i, '#604828');
  // Shelf frame
  blk(c,i,0,0,S,S,'#5a4020'); blk(c,i,1,0,S-2,S,'#6a5030');
  // 3 shelves (horizontal dividers)
  for (let sh = 0; sh < 3; sh++) {
    const sy = 2 + sh * 10;
    blk(c,i,2,sy,S-4,1,'#4a3018'); // shelf board shadow
    blk(c,i,2,sy-1,S-4,1,'#7a6040'); // shelf board top
    // Books on this shelf — varied colors and widths
    const books = ['#c04040','#4060a0','#40a060','#a06040','#6040a0','#a0a040','#40a0a0','#a04080'];
    let bx = 3;
    for (let b = 0; b < 6 && bx < S-4; b++) {
      const bw = 2 + (b % 3);
      const bh = 7 + (b % 2);
      const color = books[(sh * 3 + b) % books.length];
      blk(c,i,bx,sy-bh,bw,bh,color);
      // Book top highlight
      blk(c,i,bx,sy-bh,bw,1,'#ffffff20');
      px(c,i,bx,sy-bh,'#e0e0d0'); // spine dot
      bx += bw + 1;
    }
  }
  // Frame highlight
  blk(c,i,0,0,1,S,'#7a6040'); blk(c,i,0,0,S,1,'#7a6040');
  blk(c,i,S-1,0,1,S,'#3a2810'); blk(c,i,0,S-1,S,1,'#3a2810');
}

function drawCounter(c: Ctx, i: number) {
  // Wood counter top with visible edge and items
  fill(c, i, '#987048'); // floor shows through at bottom
  // Counter body
  blk(c,i,0,4,S,20,'#886838');
  blk(c,i,0,4,S,2,'#a88848'); // top surface highlight
  blk(c,i,0,22,S,2,'#685028'); // bottom shadow
  // Front panel detail
  blk(c,i,2,8,S-4,12,'#7a5830');
  blk(c,i,4,10,S-8,8,'#6a4828');
  // Vertical panel lines
  for (let x = 6; x < S-4; x += 8) blk(c,i,x,8,1,12,'#584020');
  // Top surface items — a plate, a mug
  blk(c,i,6,2,6,3,'#d0c8b8'); blk(c,i,7,1,4,1,'#e0d8c8'); // plate
  blk(c,i,20,1,4,5,'#806050'); blk(c,i,21,0,2,1,'#907060'); // mug
}

function drawBedHead(c: Ctx, i: number) {
  // Top of bed: headboard + pillow
  fill(c, i, '#987048'); // floor
  // Headboard (dark wood)
  blk(c,i,2,0,S-4,8,'#604020');
  blk(c,i,3,1,S-6,6,'#704828');
  blk(c,i,2,0,S-4,1,'#806038'); // top edge
  // Carved detail on headboard
  blk(c,i,8,2,S-16,4,'#5a3818');
  blk(c,i,10,3,S-20,2,'#684828');
  // Pillow (white, puffy)
  blk(c,i,4,10,S-8,8,'#e8e0d0');
  blk(c,i,5,11,S-10,6,'#f0e8d8');
  blk(c,i,4,10,S-8,1,'#f8f0e0'); // pillow top highlight
  blk(c,i,4,17,S-8,1,'#c8c0b0'); // pillow bottom shadow
  // Pillow center crease
  blk(c,i,14,12,4,4,'#d8d0c0');
  // Sheet start
  blk(c,i,2,20,S-4,12,'#d0c0a0');
  blk(c,i,2,20,S-4,1,'#e0d0b0');
}

function drawBedFoot(c: Ctx, i: number) {
  // Bottom of bed: blanket + footboard
  fill(c, i, '#987048');
  // Blanket body with fold lines
  blk(c,i,2,0,S-4,22,'#8068a0'); // purple-ish blanket
  blk(c,i,2,0,S-4,1,'#9078b0'); // top fold
  blk(c,i,4,4,S-8,1,'#705890'); // fold crease
  blk(c,i,3,8,S-6,1,'#705890');
  blk(c,i,4,14,S-8,1,'#6048800');
  // Pattern on blanket — diamond shapes
  for (let y = 2; y < 20; y += 6) {
    for (let x = 6; x < S-6; x += 8) {
      px(c,i,x,y,'#9880b8');
      px(c,i,x+1,y+1,'#9880b8');
      px(c,i,x-1,y+1,'#9880b8');
    }
  }
  // Footboard
  blk(c,i,2,22,S-4,8,'#604020');
  blk(c,i,3,23,S-6,6,'#704828');
  blk(c,i,2,22,S-4,1,'#806038');
  blk(c,i,2,S-2,S-4,2,'#503018');
}

function drawTable(c: Ctx, i: number) {
  // Top-down table with visible wood grain and items
  fill(c, i, '#987048');
  // Table top (lighter wood)
  blk(c,i,2,4,S-4,S-8,'#c0a060');
  blk(c,i,3,5,S-6,S-10,'#b89858');
  // Top highlight
  blk(c,i,2,4,S-4,1,'#d0b070');
  // Wood grain lines
  for (let y = 8; y < S-6; y += 4) blk(c,i,4,y,S-8,1,'#a88848');
  // Shadow
  blk(c,i,2,S-5,S-4,1,'#907840');
  // Legs (corner shadows)
  blk(c,i,3,5,2,2,'#806830'); blk(c,i,S-5,5,2,2,'#806830');
  blk(c,i,3,S-7,2,2,'#806830'); blk(c,i,S-5,S-7,2,2,'#806830');
  // Items on table: candle + plate
  blk(c,i,8,8,3,3,'#e0c020'); px(c,i,9,7,'#f0d830'); // candle
  blk(c,i,18,10,6,5,'#d8d0c0'); blk(c,i,19,9,4,1,'#e8e0d0'); // plate
}

function drawChair(c: Ctx, i: number) {
  // Small wooden stool seen from above
  fill(c, i, '#987048');
  // Seat (round-ish)
  for (let y = 6; y < 26; y++) for (let x = 6; x < 26; x++) {
    const d = ((x-16)*(x-16)+(y-16)*(y-16));
    if (d < 100) px(c,i,x,y,d<40?'#b89050':d<70?'#a88040':'#987038');
  }
  // Seat highlight
  blk(c,i,10,8,12,2,'#c8a060');
  // Shadow
  for (let x = 8; x < 24; x++) px(c,i,x,25,'#705028');
}

function drawBarrel(c: Ctx, i: number) {
  // Barrel seen from above — circular with metal bands
  fill(c, i, '#987048');
  const cx = 16, cy = 16;
  for (let y = 4; y < 28; y++) for (let x = 4; x < 28; x++) {
    const dx = (x-cx)/12, dy = (y-cy)/12;
    if (dx*dx+dy*dy <= 1) {
      const ring = Math.abs(y - cy);
      const isband = ring >= 5 && ring <= 6 || ring >= 10 && ring <= 11;
      px(c,i,x,y, isband ? '#808080' : y < cy ? '#a07838' : '#886028');
    }
  }
  // Top highlight
  for (let x = 10; x < 22; x++) px(c,i,x,6,'#b89050');
  // Band shine
  for (let x = 8; x < 24; x++) { px(c,i,x,10,'#909898'); px(c,i,x,22,'#909898'); }
  // Center cross
  blk(c,i,15,14,2,4,'#705028');blk(c,i,13,15,6,2,'#705028');
}

function drawCrate(c: Ctx, i: number) {
  // Wooden crate with visible plank pattern and nails
  fill(c, i, '#987048');
  blk(c,i,2,2,S-4,S-4,'#a08040');
  // Plank lines
  blk(c,i,2,2,S-4,1,'#b89050');blk(c,i,2,S-3,S-4,1,'#806030');
  for (let y = 8; y < S-4; y += 8) blk(c,i,3,y,S-6,1,'#886830');
  // Cross brace
  for (let d = 0; d < S-6; d++) { px(c,i,3+d,3+Math.floor(d*0.9),'#705020'); px(c,i,S-4-d,3+Math.floor(d*0.9),'#705020'); }
  // Nails
  px(c,i,6,6,'#c0c0b0');px(c,i,S-7,6,'#c0c0b0');px(c,i,6,S-7,'#c0c0b0');px(c,i,S-7,S-7,'#c0c0b0');
  // Shadow
  blk(c,i,2,S-3,S-4,1,'#806030');blk(c,i,S-3,2,1,S-4,'#806030');
}

function drawFireplace(c: Ctx, i: number) {
  // Stone fireplace with visible flames
  fill(c, i, '#987048');
  // Stone surround
  blk(c,i,0,0,S,S,'#585858');
  blk(c,i,2,2,S-4,S-4,'#4a4a4a');
  // Opening
  blk(c,i,6,8,S-12,S-10,'#1a1210');
  // Fire! Multiple flame colors
  blk(c,i,10,14,12,12,'#c03010'); // deep red base
  blk(c,i,11,12,10,10,'#e06020'); // orange
  blk(c,i,12,10,8,8,'#f0a030'); // yellow
  blk(c,i,14,8,4,6,'#f8d040'); // bright core
  px(c,i,15,7,'#ffe860'); px(c,i,16,6,'#fff880'); // flame tips
  // Embers
  px(c,i,10,24,'#f08020');px(c,i,18,25,'#e06010');px(c,i,14,26,'#d04008');
  // Mantle top
  blk(c,i,0,0,S,4,'#686868');blk(c,i,0,0,S,1,'#888888');
  // Stone highlight
  blk(c,i,1,1,1,S-2,'#707070');
}

function drawPlant(c: Ctx, i: number) {
  // Potted plant with visible leaves and terra cotta pot
  fill(c, i, '#987048');
  // Pot (terra cotta)
  blk(c,i,10,18,12,12,'#c06030');
  blk(c,i,8,16,16,3,'#d07040'); // rim
  blk(c,i,9,16,14,1,'#e08050'); // rim highlight
  blk(c,i,11,20,10,8,'#b05828'); // pot shadow side
  blk(c,i,12,28,8,2,'#a04820'); // base
  // Soil
  blk(c,i,11,17,10,2,'#4a3020');
  // Leaves (varied greens, overlapping)
  const leaves: [number,number,number,number,string][] = [
    [8,6,8,8,'#38a830'],[16,4,10,7,'#30a028'],[6,10,7,6,'#48b838'],
    [20,8,8,7,'#40a830'],[12,2,8,6,'#50c040'],[14,8,6,5,'#389828'],
  ];
  for (const [lx,ly,lw,lh,col] of leaves) {
    blk(c,i,lx,ly,lw,lh,col);
    blk(c,i,lx,ly,lw,1,`${col}dd`); // lighter top
  }
  // Leaf veins
  px(c,i,12,8,'#288820');px(c,i,20,6,'#288820');px(c,i,10,12,'#288820');
}

function drawRugCenter(c: Ctx, i: number) {
  // Woven rug with diamond pattern — drawn on floor
  fill(c, i, '#987048');
  // Rug body (deep red)
  blk(c,i,0,0,S,S,'#903030');
  // Gold border
  blk(c,i,0,0,S,2,'#c09030');blk(c,i,0,S-2,S,2,'#c09030');
  blk(c,i,0,0,2,S,'#c09030');blk(c,i,S-2,0,2,S,'#c09030');
  // Diamond pattern
  for (let y = 4; y < S-4; y += 4) for (let x = 4; x < S-4; x += 4) {
    if ((x+y)%8 < 4) px(c,i,x+1,y+1,'#b04040');
    else px(c,i,x+1,y+1,'#803020');
  }
  // Central medallion
  blk(c,i,12,12,8,8,'#c09030');blk(c,i,13,13,6,6,'#903030');blk(c,i,14,14,4,4,'#c09030');
}

function drawRugEdge(c: Ctx, i: number) {
  fill(c, i, '#987048');
  // Half rug fading into floor
  blk(c,i,0,0,S,16,'#903030');
  blk(c,i,0,0,S,2,'#c09030');
  blk(c,i,0,14,S,2,'#c09030');
  // Fringe at bottom
  for (let x = 2; x < S; x += 3) { blk(c,i,x,16,1,4,'#c09030'); blk(c,i,x,20,1,2,'#a07828'); }
}

function drawWeaponRack(c: Ctx, i: number) {
  // Wall-mounted rack with sword and shield
  fill(c, i, '#888880'); // stone wall bg
  // Rack (wood board)
  blk(c,i,4,8,S-8,16,'#6a5030');blk(c,i,4,8,S-8,1,'#8a7040');
  // Sword (diagonal)
  for (let d = 0; d < 20; d++) { px(c,i,8+d,10+Math.floor(d*0.5),'#c0c0c8'); }
  blk(c,i,7,9,3,3,'#a08830'); // pommel
  px(c,i,27,19,'#d0d0d8'); // tip shine
  // Shield (small circle)
  for (let y = 12; y < 22; y++) for (let x = 14; x < 24; x++) {
    const d = (x-19)*(x-19)+(y-17)*(y-17);
    if (d < 25) px(c,i,x,y,d<8?'#d0b040':d<16?'#a08830':'#806828');
  }
  // Pegs
  blk(c,i,8,10,2,2,'#505050');blk(c,i,22,10,2,2,'#505050');
}

function drawWindow(c: Ctx, i: number) {
  // Window in wall — shows light coming through
  fill(c, i, '#906830'); // wood wall bg
  // Window frame
  blk(c,i,4,2,S-8,S-4,'#604020');
  // Glass panes (light blue with light)
  blk(c,i,6,4,S-12,S-8,'#90c0e0');
  // Bright center (light streaming in)
  blk(c,i,10,8,12,12,'#b0d8f0');
  blk(c,i,12,10,8,8,'#d0e8f8');
  // Cross frame dividers
  blk(c,i,15,4,2,S-8,'#604020');
  blk(c,i,6,15,S-12,2,'#604020');
  // Frame highlight
  blk(c,i,4,2,S-8,1,'#806038');
  // Sill
  blk(c,i,3,S-3,S-6,3,'#705030');blk(c,i,3,S-3,S-6,1,'#907040');
}

function drawTorch(c: Ctx, i: number) {
  // Wall-mounted torch with flame
  fill(c, i, '#888880'); // stone wall bg
  // Bracket
  blk(c,i,12,16,8,10,'#505050');blk(c,i,14,14,4,4,'#606060');
  // Torch handle
  blk(c,i,14,8,4,10,'#705030');
  // Flame
  blk(c,i,12,2,8,8,'#e06020');
  blk(c,i,13,1,6,6,'#f0a030');
  blk(c,i,14,0,4,4,'#f8d040');
  px(c,i,15,0,'#ffe860');px(c,i,16,0,'#fff880');
  // Glow around flame
  for (let y = 0; y < 12; y++) for (let x = 8; x < 24; x++) {
    const d = (x-16)*(x-16)+(y-4)*(y-4);
    if (d < 40 && d > 16) {
      const existing = c.getImageData(ox(i)+x, y, 1, 1).data;
      if (existing[0] < 200) px(c,i,x,y,'#f0a03018');
    }
  }
}

function drawDisplay(c: Ctx, i: number) {
  // Glass display case with items visible inside
  fill(c, i, '#987048');
  // Case frame (light wood)
  blk(c,i,2,2,S-4,S-4,'#a88850');
  blk(c,i,2,2,S-4,1,'#c0a060');blk(c,i,2,S-3,S-4,1,'#806830');
  // Glass top (translucent light)
  blk(c,i,4,4,S-8,S-8,'#c0d8e8');
  blk(c,i,4,4,S-8,2,'#d8e8f0');
  // Items inside (visible through glass)
  // Potion bottle
  blk(c,i,8,10,4,8,'#d04040');blk(c,i,9,8,2,3,'#c0c0b8');
  // Ring
  for (let a = 0; a < 8; a++) { const ax = 20+Math.round(Math.cos(a*0.8)*3); const ay = 14+Math.round(Math.sin(a*0.8)*3); px(c,i,ax,ay,'#e0c040'); }
  // Scroll
  blk(c,i,16,20,8,4,'#e0d8c0');blk(c,i,16,20,1,4,'#c8c0a8');blk(c,i,23,20,1,4,'#c8c0a8');
  // Glass reflection
  blk(c,i,6,6,4,1,'#f0f0ff');blk(c,i,20,5,3,1,'#e8e8f8');
}
