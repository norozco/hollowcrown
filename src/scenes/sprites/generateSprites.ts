import * as Phaser from 'phaser';

/**
 * Procedural character sprite generator v2.
 *
 * Each race has UNIQUE proportions + features (dwarf = short+wide+beard,
 * elf = tall+thin+ears, orc = bulky+tusks, etc.).
 *
 * Each class has UNIQUE equipment silhouettes (fighter = helmet+armor,
 * rogue = hood+cloak, wizard = pointed hat+robes, etc.).
 *
 * 8 frames: 0-3 idle (down/up/left/right), 4-7 walk variants.
 */

export const SPRITE_W = 32;
export const SPRITE_H = 48;
const FRAMES = 8;

export interface CharacterColors {
  skin: string; skinShadow: string;
  hair: string; hairHighlight: string;
  tunic: string; tunicDark: string; tunicLight: string;
  boots: string; belt: string; eyes: string;
}

export const DEFAULT_COLORS: CharacterColors = {
  skin: '#e8c090', skinShadow: '#c8a070',
  hair: '#705030', hairHighlight: '#907050',
  tunic: '#408060', tunicDark: '#306050', tunicLight: '#50a070',
  boots: '#604020', belt: '#806040', eyes: '#202020',
};

// ─── Race body definitions ────────────────────────────────────

interface RaceBody {
  headW: number; headH: number; headY: number;
  bodyW: number; bodyH: number; bodyY: number;
  legH: number; armW: number;
  hasBeard?: boolean; beardColor?: string;
  hasPointedEars?: boolean;
  hasTusks?: boolean;
  hasHorns?: boolean; hornColor?: string;
  hasSnout?: boolean;
  hasCatEars?: boolean;
  hasTail?: boolean;
}

const RACE_BODIES: Record<string, RaceBody> = {
  human:     { headW: 12, headH: 12, headY: 6, bodyW: 14, bodyH: 12, bodyY: 20, legH: 8, armW: 3 },
  elf:       { headW: 10, headH: 12, headY: 4, bodyW: 12, bodyH: 14, bodyY: 18, legH: 10, armW: 2, hasPointedEars: true },
  dwarf:     { headW: 14, headH: 10, headY: 12, bodyW: 18, bodyH: 10, bodyY: 24, legH: 6, armW: 4, hasBeard: true },
  halfling:  { headW: 12, headH: 10, headY: 12, bodyW: 12, bodyH: 10, bodyY: 24, legH: 6, armW: 3 },
  orc:       { headW: 14, headH: 13, headY: 4, bodyW: 20, bodyH: 12, bodyY: 20, legH: 8, armW: 4, hasTusks: true },
  tiefling:  { headW: 12, headH: 12, headY: 6, bodyW: 14, bodyH: 12, bodyY: 20, legH: 8, armW: 3, hasHorns: true, hornColor: '#483030' },
  dragonborn:{ headW: 14, headH: 14, headY: 4, bodyW: 18, bodyH: 12, bodyY: 20, legH: 8, armW: 4, hasSnout: true },
  gnome:     { headW: 14, headH: 12, headY: 10, bodyW: 12, bodyH: 10, bodyY: 24, legH: 6, armW: 2 },
  'half-elf':{ headW: 12, headH: 12, headY: 5, bodyW: 13, bodyH: 13, bodyY: 19, legH: 9, armW: 3, hasPointedEars: true },
  tabaxi:    { headW: 12, headH: 12, headY: 5, bodyW: 14, bodyH: 12, bodyY: 19, legH: 9, armW: 3, hasCatEars: true, hasTail: true },
};

// ─── Class equipment definitions ──────────────────────────────

interface ClassEquip {
  headgear: 'none' | 'helmet' | 'hood' | 'hat' | 'crown' | 'feather' | 'cowl';
  armor: 'light' | 'medium' | 'heavy' | 'robes';
  weapon: 'sword' | 'dagger' | 'staff' | 'mace' | 'bow' | 'lute';
  hasCape?: boolean;
  hasShield?: boolean;
  hasQuiver?: boolean;
}

const CLASS_EQUIP: Record<string, ClassEquip> = {
  fighter: { headgear: 'helmet', armor: 'heavy', weapon: 'sword', hasShield: true },
  rogue:   { headgear: 'hood', armor: 'light', weapon: 'dagger', hasCape: true },
  wizard:  { headgear: 'hat', armor: 'robes', weapon: 'staff' },
  cleric:  { headgear: 'crown', armor: 'medium', weapon: 'mace' },
  ranger:  { headgear: 'cowl', armor: 'medium', weapon: 'bow', hasCape: true, hasQuiver: true },
  bard:    { headgear: 'feather', armor: 'light', weapon: 'lute' },
};

// ─── Palette constructors ─────────────────────────────────────

function clamp(v: number): string { return Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0'); }
function darker(h: string, a=40): string { const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16); return `#${clamp(r-a)}${clamp(g-a)}${clamp(b-a)}`; }
function lighter(h: string, a=30): string { const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16); return `#${clamp(r+a)}${clamp(g+a)}${clamp(b+a)}`; }

export const NPC_PALETTES: Record<string, CharacterColors> = {
  brenna: { skin:'#d8b888',skinShadow:'#b89868',hair:'#808080',hairHighlight:'#a0a0a0',tunic:'#6a4828',tunicDark:'#4a3018',tunicLight:'#8a6838',boots:'#3a2010',belt:'#504028',eyes:'#304050' },
  tomas:  { skin:'#e8c8a0',skinShadow:'#c8a880',hair:'#302018',hairHighlight:'#504030',tunic:'#c0b8a0',tunicDark:'#a09880',tunicLight:'#d8d0b8',boots:'#504030',belt:'#705838',eyes:'#203020' },
  vira:   { skin:'#e0b890',skinShadow:'#c09870',hair:'#181018',hairHighlight:'#302830',tunic:'#782040',tunicDark:'#581030',tunicLight:'#983050',boots:'#302020',belt:'#a08030',eyes:'#282028' },
  orric:  { skin:'#c8a078',skinShadow:'#a88058',hair:'#909090',hairHighlight:'#b0b0b0',tunic:'#4a6038',tunicDark:'#3a4828',tunicLight:'#5a7048',boots:'#3a2818',belt:'#584028',eyes:'#506060' },
};

export function getNpcPalette(key: string, fallbackColor: string): CharacterColors {
  return NPC_PALETTES[key] ?? { ...DEFAULT_COLORS, tunic: fallbackColor, tunicDark: darker(fallbackColor), tunicLight: lighter(fallbackColor), belt: darker(fallbackColor) };
}

const RACE_LOOKS: Record<string,{skin:string;skinShadow:string;hair:string;hairHighlight:string}> = {
  human:     {skin:'#e8c090',skinShadow:'#c8a070',hair:'#705030',hairHighlight:'#907050'},
  elf:       {skin:'#f0d8b8',skinShadow:'#d0b898',hair:'#c0a060',hairHighlight:'#d8b878'},
  dwarf:     {skin:'#d0a070',skinShadow:'#b08050',hair:'#a05020',hairHighlight:'#c07030'},
  halfling:  {skin:'#e8c8a0',skinShadow:'#c8a880',hair:'#908050',hairHighlight:'#a89860'},
  orc:       {skin:'#709060',skinShadow:'#507040',hair:'#303030',hairHighlight:'#484848'},
  tiefling:  {skin:'#c07060',skinShadow:'#a05040',hair:'#201020',hairHighlight:'#382838'},
  dragonborn:{skin:'#708870',skinShadow:'#506850',hair:'#506850',hairHighlight:'#608060'},
  gnome:     {skin:'#e8d0a0',skinShadow:'#c8b080',hair:'#d06020',hairHighlight:'#e07830'},
  'half-elf':{skin:'#e8d0a8',skinShadow:'#c8b088',hair:'#a08050',hairHighlight:'#b89060'},
  tabaxi:    {skin:'#c0a070',skinShadow:'#a08050',hair:'#604020',hairHighlight:'#805030'},
};

const CLASS_OUTFIT: Record<string,{tunic:string;tunicDark:string;tunicLight:string;belt:string}> = {
  fighter:{tunic:'#707888',tunicDark:'#505868',tunicLight:'#909898',belt:'#606068'},
  rogue:  {tunic:'#383840',tunicDark:'#202028',tunicLight:'#505058',belt:'#282830'},
  wizard: {tunic:'#5040a0',tunicDark:'#302880',tunicLight:'#7060b8',belt:'#a08030'},
  cleric: {tunic:'#d8d0b8',tunicDark:'#b8b098',tunicLight:'#f0e8d0',belt:'#c0a040'},
  ranger: {tunic:'#408048',tunicDark:'#306038',tunicLight:'#50a058',belt:'#604828'},
  bard:   {tunic:'#a04050',tunicDark:'#802838',tunicLight:'#c05868',belt:'#c09030'},
};

const DRAGONBORN_ELEMENTS: Record<string, { skin: string; skinShadow: string; hair: string; hairHighlight: string }> = {
  fire:      { skin: '#c06030', skinShadow: '#a04820', hair: '#a04020', hairHighlight: '#c06030' },
  cold:      { skin: '#6090b0', skinShadow: '#407090', hair: '#4070a0', hairHighlight: '#6090c0' },
  lightning: { skin: '#b0a050', skinShadow: '#908030', hair: '#908030', hairHighlight: '#c0b060' },
  acid:      { skin: '#60a040', skinShadow: '#408028', hair: '#408028', hairHighlight: '#60b040' },
  poison:    { skin: '#806080', skinShadow: '#604060', hair: '#604060', hairHighlight: '#907090' },
};

export function playerPalette(raceKey: string, classKey: string, playerChoice?: string): CharacterColors {
  let r = { ...(RACE_LOOKS[raceKey] ?? RACE_LOOKS.human) };
  // Dragonborn element overrides their scale/skin color.
  if (raceKey === 'dragonborn' && playerChoice && DRAGONBORN_ELEMENTS[playerChoice]) {
    r = { ...r, ...DRAGONBORN_ELEMENTS[playerChoice] };
  }
  const c = CLASS_OUTFIT[classKey] ?? CLASS_OUTFIT.fighter;
  return { ...r, ...c, boots: '#503820', eyes: '#181818' };
}

// ─── Main generator ───────────────────────────────────────────

export function generateCharacterSprite(
  scene: Phaser.Scene, key: string,
  colors: CharacterColors = DEFAULT_COLORS,
  raceKey = 'human', classKey = 'fighter',
): void {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement('canvas');
  canvas.width = FRAMES * SPRITE_W;
  canvas.height = SPRITE_H;
  const ctx = canvas.getContext('2d')!;

  const rb = RACE_BODIES[raceKey] ?? RACE_BODIES.human;
  const ce = CLASS_EQUIP[classKey] ?? CLASS_EQUIP.fighter;

  for (let f = 0; f < 8; f++) {
    const dir = f % 4; // 0=down,1=up,2=left,3=right
    const walk = f >= 4;
    drawCharacter(ctx, f, colors, rb, ce, dir, walk, raceKey);
  }

  const tex = scene.textures.addCanvas(key, canvas);
  if (tex) { for (let i = 0; i < FRAMES; i++) tex.add(i, 0, i*SPRITE_W, 0, SPRITE_W, SPRITE_H); }
}

// ─── Drawing ──────────────────────────────────────────────────

type Ctx = CanvasRenderingContext2D;
function px(c:Ctx,f:number,x:number,y:number,col:string){c.fillStyle=col;c.fillRect(f*SPRITE_W+x,y,1,1);}
function blk(c:Ctx,f:number,x:number,y:number,w:number,h:number,col:string){c.fillStyle=col;c.fillRect(f*SPRITE_W+x,y,w,h);}

function drawCharacter(c: Ctx, f: number, col: CharacterColors, rb: RaceBody, ce: ClassEquip, dir: number, walk: boolean, raceKey: string) {
  const cx = 16; // center x
  const legOff = walk ? 2 : 0;
  const isFront = dir === 0;
  const isBack = dir === 1;
  const isSide = dir >= 2;
  const isRight = dir === 3;

  // Shadow
  blk(c, f, cx - 6, 44, 12, 3, 'rgba(0,0,0,0.2)');

  // ─── BOOTS (with toe highlight + sole) ──────────────────
  const bootY = rb.bodyY + rb.bodyH + rb.legH - 6;
  const bootColor = ce.armor === 'heavy' ? '#505860' : col.boots;
  const bootHi = lighter(bootColor, 25);
  const bootSole = darker(bootColor, 30);
  if (!isSide) {
    blk(c, f, cx-5, bootY+legOff, 4, 6-legOff, bootColor);
    blk(c, f, cx+1, bootY-legOff, 4, 6+legOff, bootColor);
    // Toe highlights
    blk(c, f, cx-5, bootY+legOff, 4, 1, bootHi);
    blk(c, f, cx+1, bootY-legOff, 4, 1, bootHi);
    // Soles
    px(c, f, cx-4, bootY+legOff+5-legOff, bootSole);
    px(c, f, cx+2, bootY-legOff+5+legOff, bootSole);
    // Boot buckle
    px(c, f, cx-4, bootY+legOff+2, '#a0a098');
    px(c, f, cx+2, bootY-legOff+2, '#a0a098');
  } else {
    blk(c, f, isRight?cx-3:cx-2, bootY-legOff, 5, 6+legOff, bootColor);
    blk(c, f, isRight?cx+1:cx-1, bootY+legOff, 4, 6-legOff, bootColor);
    blk(c, f, isRight?cx-3:cx-2, bootY-legOff, 5, 1, bootHi);
  }

  // ─── LEGS ───────────────────────────────────────────────
  const legY = rb.bodyY + rb.bodyH;
  const legColor = ce.armor === 'robes' ? col.tunic : col.tunicDark;
  blk(c, f, cx-rb.bodyW/2, legY, rb.bodyW, rb.legH, legColor);
  if (isFront && ce.armor !== 'robes') blk(c, f, cx-1, legY+2, 2, rb.legH-2, darker(legColor, 20));

  // ─── BODY / ARMOR ───────────────────────────────────────
  const bx = cx - rb.bodyW/2;
  const armorColor = col.tunic;
  blk(c, f, bx, rb.bodyY, rb.bodyW, rb.bodyH, armorColor);

  if (ce.armor === 'heavy') {
    // Plate armor: metallic highlight strips, shoulder plates
    blk(c, f, bx+1, rb.bodyY+1, rb.bodyW-2, rb.bodyH-2, col.tunicLight);
    // Horizontal armor bands
    for (let ay = rb.bodyY+3; ay < rb.bodyY+rb.bodyH; ay += 3) {
      blk(c, f, bx+1, ay, rb.bodyW-2, 1, col.tunicDark);
    }
    // Shoulder pauldrons (wider than body)
    blk(c, f, bx-2, rb.bodyY, rb.bodyW+4, 4, col.tunicLight);
    blk(c, f, bx-2, rb.bodyY, rb.bodyW+4, 1, lighter(col.tunicLight, 20));
    blk(c, f, bx-2, rb.bodyY+3, rb.bodyW+4, 1, col.tunicDark);
  } else if (ce.armor === 'robes') {
    // Flowing robes: wider at bottom, decorative trim
    blk(c, f, bx-1, rb.bodyY+4, rb.bodyW+2, rb.bodyH-4, col.tunic);
    blk(c, f, bx-2, legY, rb.bodyW+4, rb.legH+2, col.tunic);
    // Robe trim
    blk(c, f, bx-2, legY+rb.legH, rb.bodyW+4, 2, col.tunicLight);
    // Center seam
    if (isFront) blk(c, f, cx-1, rb.bodyY+2, 2, rb.bodyH+rb.legH, col.tunicDark);
  } else if (ce.armor === 'medium') {
    // Chainmail/leather combo
    blk(c, f, bx+1, rb.bodyY+1, rb.bodyW-2, rb.bodyH-2, col.tunicLight);
    // Chainmail pattern (checkerboard)
    for (let ay = rb.bodyY+2; ay < rb.bodyY+rb.bodyH-2; ay += 2) {
      for (let ax = bx+2; ax < bx+rb.bodyW-2; ax += 2) {
        px(c, f, ax, ay, col.tunicDark);
      }
    }
  } else {
    // Light armor: leather with stitching
    blk(c, f, bx+1, rb.bodyY+1, rb.bodyW-2, rb.bodyH-2, col.tunicLight);
    // Stitching line
    if (isFront) blk(c, f, cx-1, rb.bodyY+3, 2, rb.bodyH-4, col.tunicDark);
  }

  // Belt
  blk(c, f, bx, rb.bodyY+rb.bodyH-3, rb.bodyW, 3, col.belt);
  px(c, f, cx, rb.bodyY+rb.bodyH-2, lighter(col.belt, 40)); // buckle

  // ─── ARMS ───────────────────────────────────────────────
  const armColor = ce.armor === 'heavy' ? col.tunicLight : col.tunic;
  if (!isSide) {
    blk(c, f, bx-rb.armW, rb.bodyY+2, rb.armW, rb.bodyH-2, armColor);
    blk(c, f, bx+rb.bodyW, rb.bodyY+2, rb.armW, rb.bodyH-2, armColor);
    blk(c, f, bx-rb.armW, rb.bodyY+rb.bodyH-2, rb.armW, 2, col.skin);
    blk(c, f, bx+rb.bodyW, rb.bodyY+rb.bodyH-2, rb.armW, 2, col.skin);
  } else {
    const ax = isRight ? bx+rb.bodyW-1 : bx;
    blk(c, f, ax, rb.bodyY+2, rb.armW, rb.bodyH-2, armColor);
    blk(c, f, ax, rb.bodyY+rb.bodyH-2, rb.armW, 2, col.skin);
  }

  // ─── CAPE / CLOAK (with flow lines + hem) ──────────────
  if (ce.hasCape) {
    if (isBack) {
      blk(c, f, bx-1, rb.bodyY+2, rb.bodyW+2, rb.bodyH+rb.legH-2, col.tunicDark);
      blk(c, f, bx, rb.bodyY+3, rb.bodyW, rb.bodyH+rb.legH-4, col.tunic);
      // Flow lines (vertical folds in the cape)
      for (let fx = bx+3; fx < bx+rb.bodyW-2; fx += 4) {
        blk(c, f, fx, rb.bodyY+5, 1, rb.bodyH+rb.legH-8, col.tunicDark);
      }
      // Hem highlight
      blk(c, f, bx-1, rb.bodyY+rb.bodyH+rb.legH-2, rb.bodyW+2, 1, col.tunicLight);
    } else if (isSide) {
      // Side cape drape
      const capeX = isRight ? bx-2 : bx+rb.bodyW;
      blk(c, f, capeX, rb.bodyY+4, 3, rb.bodyH+rb.legH-6, col.tunicDark);
      blk(c, f, capeX+1, rb.bodyY+5, 1, rb.bodyH+rb.legH-8, col.tunic);
    }
  }

  // ─── QUIVER (ranger) ───────────────────────────────────
  if (ce.hasQuiver && (isBack || isSide)) {
    const qx = isRight ? bx-3 : bx+rb.bodyW;
    blk(c, f, qx, rb.bodyY-2, 3, rb.bodyH+4, '#705030');
    // Arrow tips
    px(c, f, qx+1, rb.bodyY-3, '#a0a0a0');
    px(c, f, qx+2, rb.bodyY-2, '#a0a0a0');
  }

  // ─── SHIELD (fighter) ──────────────────────────────────
  if (ce.hasShield && (isBack || (isSide && !isRight))) {
    const sx = isBack ? bx+rb.bodyW-2 : bx-5;
    blk(c, f, sx, rb.bodyY+2, 6, 8, '#a08030');
    blk(c, f, sx+1, rb.bodyY+3, 4, 6, '#c0a040');
    px(c, f, sx+3, rb.bodyY+5, '#e0c060'); // boss
  }

  // ─── NECK ───────────────────────────────────────────────
  blk(c, f, cx-3, rb.headY+rb.headH-2, 6, 4, col.skin);

  // ─── HEAD ───────────────────────────────────────────────
  const hx = cx - rb.headW/2;
  if (isBack) {
    // Back of head = all hair
    blk(c, f, hx, rb.headY, rb.headW, rb.headH, col.hair);
    blk(c, f, hx+1, rb.headY+1, rb.headW-2, rb.headH-2, col.hair);
    blk(c, f, hx+2, rb.headY, rb.headW-4, 2, col.hairHighlight);
    if (rb.hasPointedEars) { px(c,f,hx-1,rb.headY+4,col.skin); px(c,f,hx+rb.headW,rb.headY+4,col.skin); }
  } else if (isSide) {
    blk(c, f, hx, rb.headY, rb.headW, rb.headH, col.skin);
    // Hair on one side
    const hairSide = isRight ? hx+rb.headW-4 : hx;
    blk(c, f, hx, rb.headY, rb.headW, 5, col.hair);
    blk(c, f, hairSide, rb.headY, 5, rb.headH, col.hair);
    blk(c, f, hx+2, rb.headY, rb.headW-4, 2, col.hairHighlight);
    // Eye
    const ex = isRight ? hx+3 : hx+rb.headW-5;
    blk(c, f, ex, rb.headY+5, 2, 2, col.eyes);
    px(c, f, ex, rb.headY+5, '#ffffff');
    if (rb.hasPointedEars) px(c,f,isRight?hx+rb.headW+1:hx-2,rb.headY+4,col.skin);
  } else {
    // Front face
    blk(c, f, hx, rb.headY, rb.headW, rb.headH, col.skin);
    blk(c, f, hx-1, rb.headY+2, rb.headW+2, rb.headH-4, col.skin);
    blk(c, f, hx, rb.headY+rb.headH-3, rb.headW, 3, col.skinShadow);
    // Hair
    blk(c, f, hx-1, rb.headY-2, rb.headW+2, 5, col.hair);
    blk(c, f, hx, rb.headY+2, 3, 3, col.hair); // left bang
    blk(c, f, hx+rb.headW-3, rb.headY+2, 3, 3, col.hair); // right bang
    blk(c, f, hx+2, rb.headY-2, rb.headW-4, 2, col.hairHighlight);
    // Eyes
    blk(c, f, hx+2, rb.headY+5, 2, 2, col.eyes);
    blk(c, f, hx+rb.headW-4, rb.headY+5, 2, 2, col.eyes);
    px(c, f, hx+2, rb.headY+5, '#ffffff');
    px(c, f, hx+rb.headW-4, rb.headY+5, '#ffffff');
    // Mouth
    px(c, f, cx-1, rb.headY+rb.headH-3, col.skinShadow);
    px(c, f, cx, rb.headY+rb.headH-3, col.skinShadow);
    if (rb.hasPointedEars) { px(c,f,hx-2,rb.headY+4,col.skin); px(c,f,hx+rb.headW+1,rb.headY+4,col.skin); }
  }

  // ─── RACE FEATURES ─────────────────────────────────────
  if (rb.hasBeard && !isBack) {
    const beardCol = col.hair;
    blk(c, f, cx-4, rb.headY+rb.headH-4, 8, 6, beardCol);
    blk(c, f, cx-3, rb.headY+rb.headH, 6, 4, beardCol);
    blk(c, f, cx-2, rb.headY+rb.headH+3, 4, 2, darker(beardCol, 20));
  }

  if (rb.hasTusks && isFront) {
    px(c, f, hx+1, rb.headY+rb.headH-2, '#e0e0d0');
    px(c, f, hx+rb.headW-2, rb.headY+rb.headH-2, '#e0e0d0');
  }

  if (rb.hasHorns) {
    const hornC = rb.hornColor ?? '#483030';
    blk(c, f, hx+1, rb.headY-4, 2, 4, hornC);
    blk(c, f, hx+rb.headW-3, rb.headY-4, 2, 4, hornC);
    px(c, f, hx, rb.headY-5, lighter(hornC, 20));
    px(c, f, hx+rb.headW-2, rb.headY-5, lighter(hornC, 20));
  }

  if (rb.hasSnout && isFront) {
    blk(c, f, cx-3, rb.headY+rb.headH-4, 6, 4, col.skinShadow);
    px(c, f, cx-1, rb.headY+rb.headH-4, col.skin);
    px(c, f, cx+1, rb.headY+rb.headH-4, col.skin);
  }

  if (rb.hasCatEars) {
    px(c, f, hx+1, rb.headY-3, col.hair); px(c, f, hx+2, rb.headY-4, col.hair);
    px(c, f, hx+rb.headW-2, rb.headY-3, col.hair); px(c, f, hx+rb.headW-3, rb.headY-4, col.hair);
    px(c, f, hx+2, rb.headY-3, '#e0a090'); // inner ear
    px(c, f, hx+rb.headW-3, rb.headY-3, '#e0a090');
  }

  if (rb.hasTail && !isFront) {
    for (let t = 0; t < 6; t++) {
      px(c, f, bx+rb.bodyW+t, legY+t, col.hair);
      px(c, f, bx+rb.bodyW+t, legY+t+1, darker(col.hair, 20));
    }
  }

  // Dragonborn: no hair, scales on head
  if (raceKey === 'dragonborn' && isFront) {
    // Replace hair with scale pattern
    blk(c, f, hx, rb.headY-2, rb.headW, 4, col.skin);
    for (let sx = hx+1; sx < hx+rb.headW-1; sx += 3) {
      px(c, f, sx, rb.headY-1, col.skinShadow);
    }
  }

  // ─── HEADGEAR ──────────────────────────────────────────
  if (ce.headgear === 'helmet') {
    blk(c, f, hx-1, rb.headY-2, rb.headW+2, 6, '#808888');
    blk(c, f, hx, rb.headY-2, rb.headW, 1, '#a0a8a8'); // shine
    if (isFront) blk(c, f, cx-4, rb.headY+3, 8, 2, '#707878'); // visor
  } else if (ce.headgear === 'hood') {
    blk(c, f, hx-2, rb.headY-3, rb.headW+4, rb.headH+2, col.tunicDark);
    blk(c, f, hx-1, rb.headY-2, rb.headW+2, rb.headH, col.tunic);
    if (isFront) { // face opening
      blk(c, f, hx+1, rb.headY+2, rb.headW-2, rb.headH-4, col.skin);
      blk(c, f, hx+2, rb.headY+5, 2, 2, col.eyes);
      blk(c, f, hx+rb.headW-4, rb.headY+5, 2, 2, col.eyes);
      px(c, f, hx+2, rb.headY+5, '#ffffff');
      px(c, f, hx+rb.headW-4, rb.headY+5, '#ffffff');
    }
  } else if (ce.headgear === 'hat') {
    // Wizard pointed hat
    blk(c, f, hx-2, rb.headY-2, rb.headW+4, 4, col.tunic);
    blk(c, f, hx, rb.headY-5, rb.headW, 3, col.tunic);
    blk(c, f, hx+2, rb.headY-8, rb.headW-4, 3, col.tunic);
    blk(c, f, cx-1, rb.headY-10, 3, 3, col.tunic);
    px(c, f, cx, rb.headY-11, col.tunicLight); // hat tip
    blk(c, f, hx-3, rb.headY-1, rb.headW+6, 2, col.tunicDark); // brim
  } else if (ce.headgear === 'crown') {
    blk(c, f, hx, rb.headY-3, rb.headW, 3, '#c0a040');
    px(c, f, hx+2, rb.headY-4, '#e0c060');
    px(c, f, cx, rb.headY-4, '#e0c060');
    px(c, f, hx+rb.headW-3, rb.headY-4, '#e0c060');
  } else if (ce.headgear === 'feather') {
    // Bard's feathered cap
    blk(c, f, hx-1, rb.headY-2, rb.headW+2, 4, col.tunic);
    blk(c, f, hx+rb.headW-2, rb.headY-6, 2, 4, '#e04040'); // feather
    px(c, f, hx+rb.headW-1, rb.headY-7, '#f06060');
  } else if (ce.headgear === 'cowl') {
    blk(c, f, hx-1, rb.headY-2, rb.headW+2, 5, col.tunicDark);
    blk(c, f, hx, rb.headY-1, rb.headW, 3, col.tunic);
  }

  // ─── WEAPON ────────────────────────────────────────────
  if (ce.weapon === 'sword' && (isFront || isSide)) {
    const wx = isSide ? (isRight?bx-3:bx+rb.bodyW+1) : bx+rb.bodyW+rb.armW;
    blk(c, f, wx, rb.bodyY-4, 2, 16, '#b0b0b8'); // blade
    blk(c, f, wx-1, rb.bodyY+10, 4, 2, '#a08030'); // crossguard
    blk(c, f, wx, rb.bodyY+12, 2, 4, '#705030'); // grip
    px(c, f, wx, rb.bodyY-5, '#d0d0d8'); // tip
  } else if (ce.weapon === 'staff' && (isFront || isSide)) {
    const wx = isSide ? (isRight?bx+rb.bodyW+1:bx-3) : bx-rb.armW-1;
    blk(c, f, wx, rb.headY-6, 2, rb.bodyY+rb.bodyH-rb.headY+10, '#705030');
    // Orb at top
    blk(c, f, wx-1, rb.headY-8, 4, 4, '#8060c0');
    px(c, f, wx, rb.headY-8, '#a080e0');
  } else if (ce.weapon === 'bow' && isSide) {
    const wx = isRight ? bx-4 : bx+rb.bodyW+2;
    // Bow curve
    for (let by = 0; by < 14; by++) {
      const curve = Math.round(Math.sin(by/14*Math.PI)*3);
      px(c, f, wx+curve, rb.bodyY+by, '#906830');
    }
    // String
    blk(c, f, wx, rb.bodyY, 1, 14, '#c0c0b8');
  } else if (ce.weapon === 'dagger' && isFront) {
    blk(c, f, bx+rb.bodyW+rb.armW, rb.bodyY+4, 1, 6, '#b0b0b8');
    px(c, f, bx+rb.bodyW+rb.armW, rb.bodyY+3, '#d0d0d8');
  } else if (ce.weapon === 'mace' && (isFront || isSide)) {
    const wx = isSide ? (isRight?bx-2:bx+rb.bodyW) : bx+rb.bodyW+rb.armW;
    blk(c, f, wx, rb.bodyY, 2, 12, '#705030'); // handle
    blk(c, f, wx-1, rb.bodyY-3, 4, 4, '#808888'); // head
    px(c, f, wx, rb.bodyY-3, '#a0a8a8');
  }

  // ─── OUTLINE ───────────────────────────────────────────
  drawOutline(c, f, '#1a1008');
}

function drawOutline(c: Ctx, f: number, outlineColor: string) {
  const ox = f * SPRITE_W;
  const imgData = c.getImageData(ox, 0, SPRITE_W, SPRITE_H);
  const d = imgData.data;
  const isOpaque = (x:number,y:number):boolean => {
    if(x<0||x>=SPRITE_W||y<0||y>=SPRITE_H)return false;
    return d[(y*SPRITE_W+x)*4+3]>20;
  };
  const pts:[number,number][] = [];
  for(let y=0;y<SPRITE_H;y++)for(let x=0;x<SPRITE_W;x++){
    if(!isOpaque(x,y)&&(isOpaque(x-1,y)||isOpaque(x+1,y)||isOpaque(x,y-1)||isOpaque(x,y+1)))
      pts.push([x,y]);
  }
  c.fillStyle = outlineColor;
  for(const[x,y] of pts) c.fillRect(ox+x,y,1,1);
}
