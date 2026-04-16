import * as Phaser from 'phaser';

/**
 * Procedural pixel-art character sprite generator. Creates ALTTP-style
 * humanoid sprites with 4 directional facing + walk variants.
 *
 * Each spritesheet is 8 frames (256×48):
 *   0=down, 1=up, 2=left, 3=right (idle)
 *   4=down-walk, 5=up-walk, 6=left-walk, 7=right-walk
 *
 * Characters are 32×48 — slightly taller than one tile, matching
 * ALTTP Link's proportions.
 */

export const SPRITE_W = 32;
export const SPRITE_H = 48;
const FRAMES = 8;

export interface CharacterColors {
  skin: string;
  skinShadow: string;
  hair: string;
  hairHighlight: string;
  tunic: string;
  tunicDark: string;
  tunicLight: string;
  boots: string;
  belt: string;
  eyes: string;
}

/** Default adventurer palette. */
export const DEFAULT_COLORS: CharacterColors = {
  skin: '#e8c090',
  skinShadow: '#c8a070',
  hair: '#705030',
  hairHighlight: '#907050',
  tunic: '#408060',
  tunicDark: '#306050',
  tunicLight: '#50a070',
  boots: '#604020',
  belt: '#806040',
  eyes: '#202020',
};

/** Generate a palette from a single base color (for NPCs). */
export function paletteFromColor(base: string): CharacterColors {
  // Parse hex
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  const dark = `#${clamp(r-40)}${clamp(g-40)}${clamp(b-40)}`;
  const light = `#${clamp(r+30)}${clamp(g+30)}${clamp(b+30)}`;
  return {
    ...DEFAULT_COLORS,
    tunic: base,
    tunicDark: dark,
    tunicLight: light,
    belt: dark,
  };
}

function clamp(v: number): string {
  return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
}

/**
 * Generate a character spritesheet and register it as a Phaser texture.
 * Call once per unique character key.
 */
export function generateCharacterSprite(
  scene: Phaser.Scene,
  key: string,
  colors: CharacterColors = DEFAULT_COLORS,
): void {
  if (scene.textures.exists(key)) return;

  const canvas = document.createElement('canvas');
  canvas.width = FRAMES * SPRITE_W;
  canvas.height = SPRITE_H;
  const ctx = canvas.getContext('2d')!;

  drawFront(ctx, 0, colors, false);   // down idle
  drawBack(ctx, 1, colors, false);    // up idle
  drawSide(ctx, 2, colors, false, false); // left idle
  drawSide(ctx, 3, colors, false, true);  // right idle
  drawFront(ctx, 4, colors, true);    // down walk
  drawBack(ctx, 5, colors, true);     // up walk
  drawSide(ctx, 6, colors, true, false);  // left walk
  drawSide(ctx, 7, colors, true, true);   // right walk

  // Phaser 4: addSpriteSheet doesn't accept canvas. Use addCanvas
  // + manually register frames.
  const tex = scene.textures.addCanvas(key, canvas);
  if (tex) {
    for (let i = 0; i < FRAMES; i++) {
      tex.add(i, 0, i * SPRITE_W, 0, SPRITE_W, SPRITE_H);
    }
  }
}

// ─── Drawing helpers ──────────────────────────────────────────

type Ctx = CanvasRenderingContext2D;

function px(c: Ctx, frame: number, x: number, y: number, col: string) {
  c.fillStyle = col;
  c.fillRect(frame * SPRITE_W + x, y, 1, 1);
}

function blk(c: Ctx, frame: number, x: number, y: number, w: number, h: number, col: string) {
  c.fillStyle = col;
  c.fillRect(frame * SPRITE_W + x, y, w, h);
}

// ─── Front-facing (frame 0 = idle, frame 4 = walk) ───────────

function drawFront(c: Ctx, frame: number, col: CharacterColors, walk: boolean) {
  const legOffset = walk ? 2 : 0;

  // Shadow on ground
  blk(c, frame, 10, 44, 12, 4, 'rgba(0,0,0,0.25)');

  // Boots
  blk(c, frame, 11, 38 + legOffset, 4, 6 - legOffset, col.boots);
  blk(c, frame, 17, 38 - legOffset, 4, 6 + legOffset, col.boots);

  // Legs (tunic skirt)
  blk(c, frame, 10, 32, 12, 8, col.tunic);
  blk(c, frame, 10, 32, 12, 1, col.belt);
  // Leg split
  blk(c, frame, 15, 34, 2, 6, col.tunicDark);

  // Body / torso
  blk(c, frame, 8, 20, 16, 12, col.tunic);
  blk(c, frame, 9, 21, 14, 10, col.tunicLight);
  // Belt
  blk(c, frame, 8, 30, 16, 3, col.belt);

  // Arms
  blk(c, frame, 6, 22, 3, 12, col.tunic);
  blk(c, frame, 23, 22, 3, 12, col.tunic);
  // Hands
  blk(c, frame, 6, 32, 3, 2, col.skin);
  blk(c, frame, 23, 32, 3, 2, col.skin);

  // Neck
  blk(c, frame, 13, 17, 6, 4, col.skin);

  // Head
  blk(c, frame, 10, 4, 12, 14, col.skin);
  blk(c, frame, 9, 6, 14, 10, col.skin);
  // Shadow on face
  blk(c, frame, 10, 14, 12, 3, col.skinShadow);

  // Eyes
  blk(c, frame, 12, 10, 2, 3, col.eyes);
  blk(c, frame, 18, 10, 2, 3, col.eyes);
  // Eye highlights
  px(c, frame, 12, 10, '#ffffff');
  px(c, frame, 18, 10, '#ffffff');

  // Mouth
  px(c, frame, 15, 14, col.skinShadow);
  px(c, frame, 16, 14, col.skinShadow);

  // Hair
  blk(c, frame, 9, 2, 14, 6, col.hair);
  blk(c, frame, 8, 4, 2, 4, col.hair);
  blk(c, frame, 22, 4, 2, 4, col.hair);
  // Hair bangs
  blk(c, frame, 10, 6, 4, 3, col.hair);
  blk(c, frame, 18, 6, 4, 3, col.hair);
  // Hair highlight
  blk(c, frame, 12, 2, 4, 2, col.hairHighlight);

  // Outline (1px dark border for readability)
  drawOutline(c, frame, '#1a1008');
}

// ─── Back-facing (frame 1 = idle, frame 5 = walk) ─────────────

function drawBack(c: Ctx, frame: number, col: CharacterColors, walk: boolean) {
  const legOffset = walk ? 2 : 0;

  blk(c, frame, 10, 44, 12, 4, 'rgba(0,0,0,0.25)');

  // Boots
  blk(c, frame, 11, 38 + legOffset, 4, 6 - legOffset, col.boots);
  blk(c, frame, 17, 38 - legOffset, 4, 6 + legOffset, col.boots);

  // Legs
  blk(c, frame, 10, 32, 12, 8, col.tunic);
  blk(c, frame, 15, 34, 2, 6, col.tunicDark);

  // Body
  blk(c, frame, 8, 20, 16, 12, col.tunic);
  blk(c, frame, 9, 21, 14, 10, col.tunicDark);
  blk(c, frame, 8, 30, 16, 3, col.belt);

  // Arms
  blk(c, frame, 6, 22, 3, 12, col.tunic);
  blk(c, frame, 23, 22, 3, 12, col.tunic);
  blk(c, frame, 6, 32, 3, 2, col.skin);
  blk(c, frame, 23, 32, 3, 2, col.skin);

  // Neck
  blk(c, frame, 13, 17, 6, 4, col.skin);

  // Head (back of head — all hair, no face)
  blk(c, frame, 10, 4, 12, 14, col.hair);
  blk(c, frame, 9, 6, 14, 10, col.hair);
  // Hair detail
  blk(c, frame, 12, 6, 8, 2, col.hairHighlight);
  blk(c, frame, 10, 14, 12, 3, col.hair);
  // Ear hints
  px(c, frame, 9, 10, col.skin);
  px(c, frame, 22, 10, col.skin);

  drawOutline(c, frame, '#1a1008');
}

// ─── Side-facing (frames 2/3 idle, 6/7 walk) ──────────────────

function drawSide(c: Ctx, frame: number, col: CharacterColors, walk: boolean, flip: boolean) {
  const legOffset = walk ? 2 : 0;
  // For right-facing, mirror by adjusting x positions
  const fx = (x: number, w: number) => flip ? SPRITE_W - x - w : x;

  blk(c, frame, 10, 44, 12, 4, 'rgba(0,0,0,0.25)');

  // Boots (one in front, one behind)
  blk(c, frame, fx(12, 5), 38 - legOffset, 5, 6 + legOffset, col.boots);
  blk(c, frame, fx(16, 4), 38 + legOffset, 4, 6 - legOffset, col.boots);

  // Legs
  blk(c, frame, fx(11, 10), 32, 10, 8, col.tunic);

  // Body
  blk(c, frame, fx(9, 14), 20, 14, 12, col.tunic);
  blk(c, frame, fx(10, 12), 21, 12, 10, flip ? col.tunicDark : col.tunicLight);
  blk(c, frame, fx(9, 14), 30, 14, 3, col.belt);

  // Arm (one visible on this side)
  blk(c, frame, fx(7, 3), 22, 3, 12, col.tunic);
  blk(c, frame, fx(7, 3), 32, 3, 2, col.skin);

  // Neck
  blk(c, frame, fx(13, 6), 17, 6, 4, col.skin);

  // Head
  blk(c, frame, fx(10, 12), 4, 12, 14, col.skin);
  blk(c, frame, fx(9, 13), 6, 13, 10, col.skin);
  // Shadow side
  blk(c, frame, fx(flip ? 9 : 17, 4), 8, 4, 8, col.skinShadow);

  // Eye (one visible)
  blk(c, frame, fx(flip ? 12 : 16, 2), 10, 2, 3, col.eyes);
  px(c, frame, fx(flip ? 12 : 16, 1), 10, '#ffffff');

  // Hair
  blk(c, frame, fx(9, 14), 2, 14, 6, col.hair);
  blk(c, frame, fx(flip ? 8 : 8, 2), 4, 2, 6, col.hair);
  // Hair flows to one side
  blk(c, frame, fx(flip ? 20 : 9, 4), 6, 4, 8, col.hair);
  blk(c, frame, fx(12, 4), 2, 4, 2, col.hairHighlight);

  drawOutline(c, frame, '#1a1008');
}

// ─── Outline pass ─────────────────────────────────────────────

function drawOutline(c: Ctx, frame: number, outlineColor: string) {
  // Read the frame's pixels, then draw a 1px outline around
  // any non-transparent pixel that borders a transparent one.
  const ox = frame * SPRITE_W;
  const imgData = c.getImageData(ox, 0, SPRITE_W, SPRITE_H);
  const d = imgData.data;

  const isOpaque = (x: number, y: number): boolean => {
    if (x < 0 || x >= SPRITE_W || y < 0 || y >= SPRITE_H) return false;
    return d[(y * SPRITE_W + x) * 4 + 3] > 20;
  };

  const outlinePixels: [number, number][] = [];
  for (let y = 0; y < SPRITE_H; y++) {
    for (let x = 0; x < SPRITE_W; x++) {
      if (!isOpaque(x, y)) {
        // If any neighbor is opaque, this is an outline pixel
        if (isOpaque(x-1,y) || isOpaque(x+1,y) || isOpaque(x,y-1) || isOpaque(x,y+1)) {
          outlinePixels.push([x, y]);
        }
      }
    }
  }

  c.fillStyle = outlineColor;
  for (const [x, y] of outlinePixels) {
    c.fillRect(ox + x, y, 1, 1);
  }
}
