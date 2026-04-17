/**
 * Procedural pixel-art item icons. Each item type gets a unique 24×24
 * icon drawn on a canvas, cached for reuse.
 */

const ICON_SIZE = 24;
const cache: Record<string, string> = {};

type Ctx = CanvasRenderingContext2D;
function px(c:Ctx,x:number,y:number,col:string){c.fillStyle=col;c.fillRect(x,y,1,1);}
function bk(c:Ctx,x:number,y:number,w:number,h:number,col:string){c.fillStyle=col;c.fillRect(x,y,w,h);}

export function getItemIcon(itemKey: string): string {
  if (cache[itemKey]) return cache[itemKey];
  const canvas = document.createElement('canvas');
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext('2d')!;
  drawIcon(ctx, itemKey);
  cache[itemKey] = canvas.toDataURL();
  return cache[itemKey];
}

function drawIcon(c: Ctx, key: string): void {
  switch (key) {
    case 'health_potion': drawPotion(c, '#e04040', '#ff6060'); break;
    case 'mana_potion': drawPotion(c, '#4060e0', '#6080ff'); break;
    case 'antidote': drawPotion(c, '#40c040', '#60e060'); break;
    case 'leather_cap': drawHelm(c, '#906830', '#a07840'); break;
    case 'iron_helm': drawHelm(c, '#707880', '#909898'); break;
    case 'leather_armor': drawArmor(c, '#806028', '#a07838'); break;
    case 'chainmail': drawArmor(c, '#708088', '#90a0a8'); break;
    case 'traveler_boots': drawBoots(c, '#705030', '#907040'); break;
    case 'iron_sword': drawSword(c, '#909898', '#b0b8b8'); break;
    case 'steel_sword': drawSword(c, '#a0a8b8', '#c0c8d8'); break;
    case 'oak_staff': drawStaff(c, '#705030', '#8060c0'); break;
    case 'wooden_shield': drawShield(c, '#906830', '#c0a040'); break;
    case 'wolf_pelt': drawPelt(c, '#808080', '#a0a0a0'); break;
    case 'bone_shard': drawBone(c, '#d0c8b8', '#e0d8c8'); break;
    case 'copper_ring': drawRing(c, '#c08040', '#e0a060'); break;
    default: drawGeneric(c); break;
  }
}

function drawPotion(c: Ctx, body: string, hi: string) {
  // Bottle shape
  bk(c, 9, 2, 6, 4, '#c0c0b8'); // cork
  bk(c, 10, 1, 4, 2, '#a0a098');
  bk(c, 7, 6, 10, 14, body);
  bk(c, 8, 7, 8, 12, hi);
  bk(c, 6, 8, 12, 10, body);
  // Liquid shine
  bk(c, 9, 9, 2, 6, '#ffffff40');
  // Bottle outline
  bk(c, 6, 6, 1, 14, '#3a2818'); bk(c, 17, 6, 1, 14, '#3a2818');
  bk(c, 6, 20, 12, 1, '#3a2818'); bk(c, 6, 6, 12, 1, '#3a2818');
}

function drawHelm(c: Ctx, body: string, hi: string) {
  bk(c, 4, 6, 16, 14, body);
  bk(c, 6, 4, 12, 4, body);
  bk(c, 5, 7, 14, 12, hi);
  bk(c, 4, 6, 16, 2, hi); // top shine
  // Visor slit
  bk(c, 7, 14, 10, 3, '#1a1210');
  // Outline
  bk(c, 4, 4, 16, 1, '#3a2818');
}

function drawArmor(c: Ctx, body: string, hi: string) {
  // Torso shape
  bk(c, 4, 4, 16, 16, body);
  bk(c, 6, 5, 12, 14, hi);
  // Shoulder straps
  bk(c, 2, 4, 4, 6, body); bk(c, 18, 4, 4, 6, body);
  // Belt
  bk(c, 4, 16, 16, 2, '#504028');
  px(c, 12, 17, '#a08040'); // buckle
}

function drawBoots(c: Ctx, body: string, hi: string) {
  bk(c, 4, 4, 6, 14, body);
  bk(c, 14, 4, 6, 14, body);
  bk(c, 5, 5, 4, 12, hi);
  bk(c, 15, 5, 4, 12, hi);
  // Soles
  bk(c, 3, 18, 8, 3, '#3a2010');
  bk(c, 13, 18, 8, 3, '#3a2010');
  // Buckle
  px(c, 6, 10, '#a0a098'); px(c, 16, 10, '#a0a098');
}

function drawSword(c: Ctx, blade: string, hi: string) {
  // Blade (diagonal)
  for (let i = 0; i < 14; i++) {
    bk(c, 16 - i, 2 + i, 3, 2, blade);
  }
  bk(c, 15, 3, 2, 2, hi); // tip shine
  // Crossguard
  bk(c, 2, 16, 10, 2, '#a08030');
  // Grip
  bk(c, 5, 18, 3, 4, '#604020');
  px(c, 6, 22, '#a08030'); // pommel
}

function drawStaff(c: Ctx, wood: string, orb: string) {
  // Shaft
  bk(c, 11, 4, 2, 18, wood);
  bk(c, 12, 4, 1, 18, '#907040');
  // Orb
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const d = (x-4)*(x-4)+(y-4)*(y-4);
    if (d < 14) px(c, 8+x, y, d < 6 ? '#c0a0f0' : orb);
  }
}

function drawShield(c: Ctx, body: string, emblem: string) {
  for (let y = 2; y < 20; y++) {
    const w = y < 10 ? 16 : 16 - (y - 10) * 2;
    if (w > 0) bk(c, 12 - w/2, y, w, 1, body);
  }
  // Emblem
  bk(c, 10, 8, 4, 6, emblem);
  bk(c, 9, 10, 6, 2, emblem);
  px(c, 12, 10, '#f0d860');
}

function drawPelt(c: Ctx, body: string, hi: string) {
  bk(c, 3, 6, 18, 12, body);
  bk(c, 5, 8, 14, 8, hi);
  // Fur texture
  for (let x = 4; x < 20; x += 3) px(c, x, 7, '#606060');
  for (let x = 5; x < 19; x += 3) px(c, x, 15, '#606060');
}

function drawBone(c: Ctx, body: string, hi: string) {
  bk(c, 4, 10, 16, 4, body);
  bk(c, 5, 11, 14, 2, hi);
  // Knobs
  bk(c, 2, 8, 4, 3, body); bk(c, 2, 13, 4, 3, body);
  bk(c, 18, 8, 4, 3, body); bk(c, 18, 13, 4, 3, body);
}

function drawRing(c: Ctx, body: string, hi: string) {
  for (let a = 0; a < 16; a++) {
    const angle = (a / 16) * Math.PI * 2;
    const x = 12 + Math.round(Math.cos(angle) * 7);
    const y = 12 + Math.round(Math.sin(angle) * 7);
    px(c, x, y, a < 4 ? hi : body);
    px(c, x+1, y, a < 4 ? hi : body);
  }
  // Gem
  bk(c, 10, 4, 4, 3, '#60c0e0');
  px(c, 11, 4, '#a0e0f0');
}

function drawGeneric(c: Ctx) {
  bk(c, 6, 6, 12, 12, '#808060');
  bk(c, 8, 8, 8, 8, '#a0a080');
  px(c, 12, 12, '#c0c0a0');
}
