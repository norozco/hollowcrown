import * as Phaser from 'phaser';

/**
 * Procedural pixel-art tile generator — targeting ALTTP overworld quality.
 *
 * ALTTP palette reference (from screenshot analysis):
 *   Grass: bright #58a828, mid #48902, dark #307018, flowers #e8e8e8
 *   Path:  light #d0a868, mid #b08848, dark #886830, edge #604820
 *   Stone: light #a0a098, mid #787870, dark #585850, mortar #484840
 *   Wood:  light #b88848, mid #906830, dark #685020
 *   Roof:  light #c05040, mid #a04030, dark #803020
 *   Water: light #68a8d0, mid #4080b0, dark #285080, foam #a0d0e0
 */

export const TILE = {
  GRASS_DARK: 0,
  GRASS_LIGHT: 1,
  PATH: 2,
  WALL_STONE: 3,
  WALL_WOOD: 4,
  DOOR: 5,
  FLOOR_WOOD: 6,
  FLOOR_STONE: 7,
  ROOF: 8,
  ROOF_EDGE: 9,
  SHADOW: 10,
  BUSH: 11,
  FENCE: 12,
  PATH_EDGE: 13,
  WELL: 14,
  WATER: 15,
} as const;

export const TILE_SIZE = 32;
const TILE_COUNT = 16;
const S = TILE_SIZE;

export function generateTileset(scene: Phaser.Scene): void {
  if (scene.textures.exists('tileset')) return;

  const canvas = document.createElement('canvas');
  canvas.width = TILE_COUNT * S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  drawGrassDark(ctx, 0);
  drawGrassLight(ctx, 1);
  drawPath(ctx, 2);
  drawWallStone(ctx, 3);
  drawWallWood(ctx, 4);
  drawDoor(ctx, 5);
  drawFloorWood(ctx, 6);
  drawFloorStone(ctx, 7);
  drawRoof(ctx, 8);
  drawRoofEdge(ctx, 9);
  drawShadow(ctx, 10);
  drawBush(ctx, 11);
  drawFence(ctx, 12);
  drawPathEdge(ctx, 13);
  drawWell(ctx, 14);
  drawWater(ctx, 15);

  const tex = scene.textures.addCanvas('tileset', canvas);
  if (tex) {
    for (let i = 0; i < TILE_COUNT; i++) {
      tex.add(i, 0, i * S, 0, S, S);
    }
  }
}

// ─── Core helpers ─────────────────────────────────────────────

type Ctx = CanvasRenderingContext2D;

function ox(idx: number) { return idx * S; }

function px(c: Ctx, i: number, x: number, y: number, col: string) {
  c.fillStyle = col;
  c.fillRect(ox(i) + x, y, 1, 1);
}

function blk(c: Ctx, i: number, x: number, y: number, w: number, h: number, col: string) {
  c.fillStyle = col;
  c.fillRect(ox(i) + x, y, w, h);
}

function fill(c: Ctx, i: number, col: string) { blk(c, i, 0, 0, S, S, col); }

// Deterministic hash scatter — fixed positions every boot
function scatter(c: Ctx, i: number, col: string, count: number, w: number, h: number, seed: number) {
  c.fillStyle = col;
  let s = seed;
  for (let n = 0; n < count; n++) {
    s = (s * 16807 + 1) % 2147483647;
    const sx = (s % (S - w));
    s = (s * 16807 + 1) % 2147483647;
    const sy = (s % (S - h));
    c.fillRect(ox(i) + sx, sy, w, h);
  }
}

// ─── GRASS DARK ───────────────────────────────────────────────
// Vibrant green base with grass blade shapes and white flower dots

function drawGrassDark(c: Ctx, i: number) {
  fill(c, i, '#48a020'); // bright base

  // Darker grass patches for variation
  scatter(c, i, '#389018', 12, 4, 4, 101);
  scatter(c, i, '#308010', 6, 3, 3, 202);

  // Individual grass blade Vs (lighter tips)
  const blades: [number, number][] = [
    [3,5],[10,2],[20,7],[28,4],[6,16],[15,14],[24,18],[30,12],
    [8,24],[18,26],[26,22],[2,20],[14,8],[22,28],
  ];
  for (const [bx, by] of blades) {
    px(c, i, bx, by+2, '#389018');     // shadow
    px(c, i, bx+1, by+2, '#389018');
    px(c, i, bx, by+1, '#50b028');     // mid
    px(c, i, bx+2, by+1, '#50b028');
    px(c, i, bx+1, by, '#68c038');     // bright tip
  }

  // White flower dots — the signature ALTTP detail
  const flowers: [number, number][] = [
    [7,9],[19,5],[29,15],[4,22],[16,20],[25,28],[11,30],[31,8],
  ];
  for (const [fx, fy] of flowers) {
    px(c, i, fx, fy, '#e8e8d8');
    px(c, i, fx+1, fy, '#d8d8c8');
    px(c, i, fx, fy+1, '#d0d0c0');
  }
}

// ─── GRASS LIGHT ──────────────────────────────────────────────

function drawGrassLight(c: Ctx, i: number) {
  fill(c, i, '#58b028');

  scatter(c, i, '#48a020', 8, 3, 3, 303);
  scatter(c, i, '#68c038', 5, 2, 3, 404);

  // Fewer blades, more flowers (transition feel)
  const blades: [number, number][] = [[5,8],[18,4],[28,12],[10,22],[24,26]];
  for (const [bx, by] of blades) {
    px(c, i, bx+1, by, '#78d048');
    px(c, i, bx, by+1, '#60b830');
    px(c, i, bx+2, by+1, '#60b830');
  }

  const flowers: [number, number][] = [
    [3,4],[12,7],[22,3],[30,10],[8,18],[17,22],[27,26],[5,28],[20,14],
  ];
  for (const [fx, fy] of flowers) {
    px(c, i, fx, fy, '#f0f0e0');
    px(c, i, fx+1, fy, '#e0e0d0');
  }
}

// ─── DIRT PATH ────────────────────────────────────────────────
// ALTTP paths have a warm center with dark edges and visible stones

function drawPath(c: Ctx, i: number) {
  fill(c, i, '#c8a058'); // warm tan center

  // Darker edge tones
  blk(c, i, 0, 0, S, 3, '#b09048');
  blk(c, i, 0, S-3, S, 3, '#b09048');

  // Embedded pebbles/stones with highlight+shadow
  const stones: [number, number, number, number][] = [
    [3,4,5,4],[12,2,6,4],[22,5,5,3],[30,3,2,3],
    [5,12,6,5],[16,10,5,4],[26,13,4,3],[2,8,3,3],
    [8,20,5,4],[18,22,6,3],[28,20,4,4],[14,26,5,3],
    [3,28,4,3],[24,27,5,4],
  ];
  for (const [sx, sy, sw, sh] of stones) {
    blk(c, i, sx, sy, sw, sh, '#b89850');
    blk(c, i, sx, sy, sw, 1, '#d8b868');     // top highlight
    blk(c, i, sx, sy+sh-1, sw, 1, '#987838'); // bottom shadow
  }

  // Dark cracks between stones
  scatter(c, i, '#906828', 6, 1, 2, 505);
}

// ─── STONE WALL ───────────────────────────────────────────────
// 3D bricks: each brick has top-left highlight, bottom-right shadow

function drawWallStone(c: Ctx, i: number) {
  fill(c, i, '#888880');

  for (let row = 0; row < 4; row++) {
    const by = row * 8;
    const brickW = 14;
    const off = row % 2 === 0 ? 0 : 7;

    // Mortar (darker than brick)
    blk(c, i, 0, by + 7, S, 1, '#585850');

    for (let col = -1; col < 4; col++) {
      const bx = off + col * (brickW + 2);
      if (bx >= S) break;
      const cx = Math.max(0, bx);
      const cw = Math.min(brickW, S - cx);
      if (cw <= 0) continue;

      // Brick face — varied shade per brick
      const shade = ['#909088','#888880','#808078','#989890'][(row + col) & 3];
      blk(c, i, cx, by, cw, 7, shade);

      // Top + left highlight (light catches)
      blk(c, i, cx, by, cw, 1, '#a8a8a0');
      blk(c, i, cx, by, 1, 7, '#a0a098');

      // Bottom + right shadow (depth)
      blk(c, i, cx, by + 6, cw, 1, '#686860');
      blk(c, i, cx + cw - 1, by, 1, 7, '#707068');

      // Vertical mortar between bricks
      if (bx > 0) blk(c, i, bx - 1, by, 2, 7, '#585850');
    }
  }

  // Top edge shine (wall top catches light)
  blk(c, i, 0, 0, S, 1, '#b0b0a8');
}

// ─── WOOD WALL ────────────────────────────────────────────────

function drawWallWood(c: Ctx, i: number) {
  fill(c, i, '#906830');

  // Vertical planks with gaps
  const plankWidths = [6, 7, 6, 7, 6];
  let px0 = 0;
  for (let p = 0; p < plankWidths.length; p++) {
    const w = plankWidths[p];
    const shade = p % 2 === 0 ? '#987038' : '#886028';

    blk(c, i, px0, 0, w, S, shade);
    // Left highlight
    blk(c, i, px0, 0, 1, S, '#a88848');
    // Right shadow
    blk(c, i, px0 + w - 1, 0, 1, S, '#704820');
    // Knot
    if (p % 2 === 0) {
      const ky = 6 + p * 6;
      blk(c, i, px0 + 2, ky, 3, 3, '#705020');
      px(c, i, px0 + 3, ky + 1, '#604018');
    }
    // Gap between planks
    blk(c, i, px0 + w, 0, 1, S, '#503818');

    px0 += w + 1;
  }

  // Top shine
  blk(c, i, 0, 0, S, 1, '#b89850');
}

// ─── DOOR ─────────────────────────────────────────────────────

function drawDoor(c: Ctx, i: number) {
  fill(c, i, '#181010');

  // Frame
  blk(c, i, 0, 0, S, 3, '#886838');
  blk(c, i, 0, 0, 4, S, '#785828');
  blk(c, i, S-4, 0, 4, S, '#785828');
  // Frame highlights
  blk(c, i, 0, 0, S, 1, '#a88848');
  blk(c, i, 1, 0, 1, S, '#987038');
  // Interior warmth
  blk(c, i, 6, 4, S-12, S-6, '#281810');
  blk(c, i, 10, 8, S-20, S-12, '#302018');
  // Threshold
  blk(c, i, 4, S-3, S-8, 3, '#a09880');
  blk(c, i, 4, S-3, S-8, 1, '#b8b0a0');
}

// ─── WOOD FLOOR ───────────────────────────────────────────────

function drawFloorWood(c: Ctx, i: number) {
  fill(c, i, '#987048');

  for (let row = 0; row < 4; row++) {
    const py = row * 8;
    const shade = row % 2 === 0 ? '#987048' : '#a07850';
    blk(c, i, 0, py, S, 7, shade);
    blk(c, i, 0, py, S, 1, '#a88858'); // plank top highlight
    blk(c, i, 0, py + 7, S, 1, '#705028'); // gap
    // Nail marks
    px(c, i, 5 + row * 3, py + 3, '#685020');
    px(c, i, 21 + row * 2, py + 4, '#685020');
  }
}

// ─── STONE FLOOR ──────────────────────────────────────────────

function drawFloorStone(c: Ctx, i: number) {
  fill(c, i, '#787870');

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const sx = col * 16 + (row % 2 === 0 ? 0 : 8);
      const sy = row * 16;
      const shade = (row + col) % 2 === 0 ? '#808078' : '#707068';
      blk(c, i, sx, sy, 15, 15, shade);
      blk(c, i, sx, sy, 15, 1, '#909088');      // top highlight
      blk(c, i, sx, sy, 1, 15, '#888880');       // left highlight
      blk(c, i, sx + 14, sy, 1, 15, '#606058');  // right shadow
      blk(c, i, sx, sy + 14, 15, 1, '#585850');  // bottom shadow
      blk(c, i, sx + 15, sy, 1, 15, '#484840');  // mortar right
      blk(c, i, sx, sy + 15, 16, 1, '#484840');  // mortar bottom
    }
  }
}

// ─── ROOF ─────────────────────────────────────────────────────
// Overlapping clay tiles with ALTTP-style scallop pattern

function drawRoof(c: Ctx, i: number) {
  fill(c, i, '#a04830');

  for (let row = 0; row < 4; row++) {
    const ry = row * 8;
    const off = row % 2 === 0 ? 0 : 8;

    for (let col = -1; col < 3; col++) {
      const tx = off + col * 16;
      // Each tile: lighter at top, darker at bottom (overlap shadow)
      for (let dy = 0; dy < 8; dy++) {
        const color = dy < 2 ? '#c06848' : dy < 4 ? '#b05838' : dy < 6 ? '#a04830' : '#883828';
        const indent = dy > 5 ? 1 : 0;
        const tx0 = Math.max(0, tx + indent);
        const tw = Math.min(16 - indent * 2, S - tx0);
        if (tw > 0) blk(c, i, tx0, ry + dy, tw, 1, color);
      }
      // Tile top highlight
      if (tx >= 0 && tx < S) blk(c, i, Math.max(0, tx), ry, Math.min(16, S - Math.max(0, tx)), 1, '#d07858');
    }
  }
}

// ─── ROOF EDGE ────────────────────────────────────────────────

function drawRoofEdge(c: Ctx, i: number) {
  // Top: roof continuing
  fill(c, i, '#984028');

  // Roof portion (top 14px)
  for (let dy = 0; dy < 14; dy++) {
    const color = dy < 4 ? '#b05838' : dy < 8 ? '#a04830' : dy < 12 ? '#984028' : '#883020';
    blk(c, i, 0, dy, S, 1, color);
  }

  // Overhang lip — thick dark edge
  blk(c, i, 0, 12, S, 4, '#682818');
  blk(c, i, 0, 12, S, 1, '#984028');

  // Shadow below overhang (on the wall beneath)
  blk(c, i, 0, 16, S, 4, '#303028');
  blk(c, i, 0, 20, S, 4, '#484840');
  blk(c, i, 0, 24, S, 4, '#585850');
  blk(c, i, 0, 28, S, 4, '#686860');
}

// ─── SHADOW ───────────────────────────────────────────────────

function drawShadow(c: Ctx, i: number) {
  // Gradient: very dark at top → grass at bottom
  blk(c, i, 0, 0, S, 6, '#1a2a10');
  blk(c, i, 0, 6, S, 6, '#283818');
  blk(c, i, 0, 12, S, 6, '#344820');
  blk(c, i, 0, 18, S, 6, '#408028');
  blk(c, i, 0, 24, S, 8, '#48a020');

  // Grass tips at bottom
  const tips: [number, number][] = [[4,26],[12,24],[22,25],[30,27]];
  for (const [tx, ty] of tips) {
    px(c, i, tx, ty, '#58b028');
    px(c, i, tx+1, ty-1, '#68c038');
  }
}

// ─── BUSH ─────────────────────────────────────────────────────
// Round hedge with ALTTP-style shading: bright top, dark bottom

function drawBush(c: Ctx, i: number) {
  fill(c, i, '#48a020'); // grass base

  const cx = 16, cy = 16;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x - cx) / 14;
      const dy = (y - cy) / 13;
      const d2 = dx * dx + dy * dy;
      if (d2 <= 1) {
        // Vertical gradient: bright top → dark bottom + radial darkening at edges
        const vert = (y - 4) / 28; // 0 at top, 1 at bottom
        const edge = d2;
        const darkness = vert * 0.6 + edge * 0.4;

        let color: string;
        if (darkness < 0.25) color = '#58c838';
        else if (darkness < 0.4) color = '#48b028';
        else if (darkness < 0.55) color = '#389818';
        else if (darkness < 0.7) color = '#288010';
        else color = '#1a6808';

        px(c, i, x, y, color);
      }
    }
  }

  // Highlight spots (top of bush catches light)
  blk(c, i, 11, 6, 4, 2, '#68d848');
  blk(c, i, 17, 5, 3, 2, '#68d848');
  px(c, i, 14, 4, '#78e858');

  // Dark outline at bottom (ground shadow)
  for (let x = 6; x < 26; x++) {
    const ey = 28 + Math.round(Math.sin((x - 6) * 0.3) * 1);
    if (ey < S) px(c, i, x, ey, '#104008');
    if (ey + 1 < S) px(c, i, x, ey + 1, '#1a3a10');
  }
}

// ─── FENCE ────────────────────────────────────────────────────
// ALTTP-style: rounded-top wooden posts with shadow

function drawFence(c: Ctx, i: number) {
  fill(c, i, '#48a020'); // grass base

  const postW = 8, postH = 24;
  const postX = (S - postW) / 2;
  const postY = 2;

  // Post shadow on ground
  blk(c, i, postX + 2, postY + postH, postW, 4, '#2a5a10');

  // Post body
  blk(c, i, postX, postY + 4, postW, postH - 4, '#a07840');
  // Left highlight
  blk(c, i, postX, postY + 4, 2, postH - 4, '#b89050');
  // Right shadow
  blk(c, i, postX + postW - 2, postY + 4, 2, postH - 4, '#786030');

  // Rounded top (3 rows tapering)
  blk(c, i, postX + 1, postY + 2, postW - 2, 2, '#b89050');
  blk(c, i, postX + 2, postY, postW - 4, 2, '#c8a060');
  blk(c, i, postX + 3, postY, postW - 6, 1, '#d8b070'); // top shine

  // Horizontal rail stubs
  blk(c, i, 0, 12, postX, 4, '#987040');
  blk(c, i, postX + postW, 12, S - postX - postW, 4, '#987040');
  blk(c, i, 0, 12, postX, 1, '#a88848');
  blk(c, i, postX + postW, 12, S - postX - postW, 1, '#a88848');
  blk(c, i, 0, 15, postX, 1, '#786030');
  blk(c, i, postX + postW, 15, S - postX - postW, 1, '#786030');
}

// ─── PATH EDGE ────────────────────────────────────────────────

function drawPathEdge(c: Ctx, i: number) {
  // Top: grass, bottom: path — ragged blend
  fill(c, i, '#c8a058');
  blk(c, i, 0, 0, S, 12, '#48a020');

  // Ragged transition
  const edge = [13,12,13,14,12,11,13,14,13,12,11,13,14,12,13,12,
                14,13,12,11,13,14,12,13,11,12,14,13,12,13,14,12];
  for (let x = 0; x < S; x++) {
    const ey = edge[x];
    blk(c, i, x, ey - 1, 1, 3, '#88782'); // dark dirt edge
    blk(c, i, x, ey - 1, 1, 1, '#389018'); // dark grass at edge
    if (x % 4 === 0 && ey > 2) px(c, i, x, ey - 2, '#308010');
  }

  // Grass flowers in upper portion
  px(c, i, 5, 4, '#e8e8d8');
  px(c, i, 18, 6, '#e8e8d8');
  px(c, i, 28, 3, '#e0e0d0');
}

// ─── WELL ─────────────────────────────────────────────────────

function drawWell(c: Ctx, i: number) {
  fill(c, i, '#48a020');

  // Stone rim (circular, 3D)
  for (let y = 6; y < 28; y++) {
    for (let x = 6; x < 26; x++) {
      const dx = (x - 16) / 10;
      const dy = (y - 17) / 10;
      const d2 = dx * dx + dy * dy;
      if (d2 <= 1) {
        if (d2 < 0.45) {
          // Water inside
          px(c, i, x, y, y < 14 ? '#285878' : '#304860');
        } else {
          // Stone rim with 3D shading
          const rimColor = y < 14 ? '#a0a098' : y < 20 ? '#888880' : '#686860';
          px(c, i, x, y, rimColor);
        }
      }
    }
  }

  // Rim top highlight
  for (let x = 10; x < 22; x++) {
    px(c, i, x, 7, '#b8b8b0');
    px(c, i, x, 8, '#a8a8a0');
  }

  // Shadow below well
  blk(c, i, 10, 27, 12, 2, '#2a5a10');
}

// ─── WATER ────────────────────────────────────────────────────

function drawWater(c: Ctx, i: number) {
  fill(c, i, '#4080b0');

  // Depth variation
  blk(c, i, 0, 0, S, 8, '#4888b8');
  blk(c, i, 0, 24, S, 8, '#3870a0');

  // Bright ripple lines (ALTTP's animated feel, static version)
  for (let row = 0; row < 4; row++) {
    const wy = row * 8 + 3;
    const off = row % 2 === 0 ? 0 : 4;
    for (let x = 0; x < S; x++) {
      const phase = (x + off) % 10;
      if (phase < 3) px(c, i, x, wy, '#60a0d0');
      else if (phase < 5) px(c, i, x, wy, '#78b8e0');
      else if (phase === 5) px(c, i, x, wy, '#88c8e8'); // sparkle
    }
    // Darker under ripple
    for (let x = 0; x < S; x++) {
      px(c, i, x, wy + 1, '#3070a0');
    }
  }

  // Foam / shore edge hints
  px(c, i, 2, 2, '#a0d0e0');
  px(c, i, 14, 1, '#90c0d8');
  px(c, i, 28, 3, '#a0d0e0');
}
