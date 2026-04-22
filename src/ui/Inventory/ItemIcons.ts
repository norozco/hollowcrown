/**
 * Procedural pixel-art item icons. Each item type gets a unique 24x24
 * icon drawn on a canvas, cached as a data URL for use in React.
 *
 * Every icon uses 3-4 color shading with:
 *  - 1px dark outline
 *  - Top-left highlight
 *  - Bottom-right shadow
 *  - Readable silhouette at 24x24
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
    // === Consumables ===
    case 'health_potion': drawPotion(c, '#b02020', '#d04040', '#ff6060', '#801010'); break;
    case 'mana_potion': drawPotion(c, '#2040b0', '#4060d0', '#6088ff', '#102080'); break;
    case 'antidote': drawPotion(c, '#20a030', '#40c048', '#60e068', '#108020'); break;
    case 'grilled_pike': drawFood(c, '#a08040', '#c09850', '#d8b068'); break;
    case 'smoked_eel': drawFood(c, '#706048', '#887058', '#a08868'); break;
    case 'lake_tonic': drawPotion(c, '#3080a0', '#48a0c0', '#68c0e0', '#206080'); break;

    // === Helmets ===
    case 'leather_cap': drawHelm(c, '#705828', '#906830', '#a87840', '#503818'); break;
    case 'iron_helm': drawHelm(c, '#607080', '#788898', '#909ca8', '#485868'); break;

    // === Armor ===
    case 'leather_armor': drawArmor(c, '#604820', '#806028', '#a07838', '#483818'); break;
    case 'chainmail': drawChainmail(c); break;
    case 'kael_chainmail': drawChainmail(c); break;
    case 'kael_leather_armor': drawArmor(c, '#604820', '#806028', '#a07838', '#483818'); break;

    // === Boots ===
    case 'traveler_boots': drawBoots(c, '#604020', '#805030', '#a06840', '#402810'); break;

    // === Weapons ===
    case 'iron_sword': drawSword(c, '#808890', '#909ca8', '#b0b8c0', '#606870', '#8a6828', '#604020'); break;
    case 'steel_sword': drawSword(c, '#98a0b0', '#b0b8c8', '#d0d8e0', '#707880', '#c0a030', '#806010'); break;
    case 'hunting_bow': drawBow(c, '#705028', '#906838', '#b08048', '#503818'); break;
    case 'shadow_dagger': drawDagger(c, '#383848', '#505068', '#686880', '#202030'); break;
    case 'iron_mace': drawMace(c, '#606870', '#808890', '#a0a8b0', '#404850'); break;
    case 'oak_staff':
    case 'runed_staff': drawStaff(c, '#604020', '#805030', '#a06840', '#8060c0', '#b090f0'); break;
    case 'silver_rapier': drawRapier(c, '#a0a8b8', '#c0c8d8', '#e0e8f0', '#707880'); break;
    case 'crownless_blade': drawSword(c, '#404050', '#606078', '#8080a0', '#282838', '#a030a0', '#601060'); break;

    // === Kael weapons (slightly different tint) ===
    case 'kael_iron_sword': drawSword(c, '#808890', '#909ca8', '#b0b8c0', '#606870', '#90a830', '#607010'); break;
    case 'kael_steel_sword': drawSword(c, '#98a0b0', '#b0b8c8', '#d0d8e0', '#707880', '#30a0c0', '#107080'); break;
    case 'kael_hunting_bow': drawBow(c, '#705028', '#906838', '#b08048', '#503818'); break;
    case 'kael_shadow_dagger': drawDagger(c, '#383848', '#505068', '#686880', '#202030'); break;
    case 'kael_iron_mace': drawMace(c, '#606870', '#808890', '#a0a8b0', '#404850'); break;
    case 'kael_runed_staff': drawStaff(c, '#604020', '#805030', '#a06840', '#8060c0', '#b090f0'); break;
    case 'kael_silver_rapier': drawRapier(c, '#a0a8b8', '#c0c8d8', '#e0e8f0', '#707880'); break;

    // === Shields ===
    case 'wooden_shield': drawShield(c, '#705028', '#906838', '#b08048', '#c0a030', '#e0c050'); break;

    // === Rings & Amulets ===
    case 'copper_ring': drawRing(c, '#b07030', '#d09048', '#60c0e0'); break;

    // === Materials ===
    case 'wolf_pelt': drawPelt(c, '#686868', '#888888', '#a0a0a0', '#505050'); break;
    case 'bone_shard': drawBone(c, '#c8c0a8', '#e0d8c0', '#f0e8d8', '#a8a088'); break;
    case 'iron_ore': drawOre(c, '#505860', '#687078', '#808890', '#384048'); break;
    case 'silver_ore': drawOre(c, '#707880', '#a0a8b0', '#d8e0e8', '#484850'); break;
    case 'gold_ore': drawOre(c, '#8a6018', '#c89028', '#f0c040', '#503010'); break;
    case 'moonpetal': drawFlower(c, '#d0c0e0', '#e8d8f0', '#f8f0ff', '#9060b0'); break;
    case 'shadow_essence': drawOrb(c, '#402060', '#6030a0', '#9050d0', '#b080f0'); break;
    case 'spider_silk': drawSilk(c); break;
    case 'wraith_dust': drawDust(c); break;
    case 'troll_heart': drawHeart(c, '#901020', '#c02030', '#e04048', '#680810'); break;

    // === Quest Items ===
    case 'dungeon_key': drawKey(c, '#806040', '#a08050', '#c0a068', '#604020'); break;
    case 'boss_key': drawKey(c, '#c09030', '#e0b040', '#f0d060', '#907020'); break;
    case 'gallery_key': drawKey(c, '#a08848', '#c0a858', '#d8c070', '#806828'); break;
    case 'sanctum_key': drawKey(c, '#c09030', '#e0b040', '#f0d060', '#907020'); break;
    case 'tower_key': drawKey(c, '#806040', '#a08050', '#c0a068', '#604020'); break;
    case 'frost_key': drawKey(c, '#6090b0', '#80b0d0', '#a0d0f0', '#406880'); break;
    case 'torn_journal': drawJournal(c); break;

    // === Crown ===
    case 'kings_crown': drawCrown(c); break;

    // === Fallback by item type prefix ===
    default: drawGenericByKey(c, key); break;
  }
}

// ─── CONSUMABLES ────────────────────────────────────

function drawPotion(c: Ctx, dark: string, body: string, hi: string, outline: string) {
  // Cork
  bk(c, 10, 2, 4, 3, '#a09878'); bk(c, 11, 1, 2, 2, '#b0a888');
  px(c, 11, 1, '#c0b898'); px(c, 12, 2, '#908868'); // cork detail

  // Bottle neck
  bk(c, 10, 5, 4, 2, body);
  px(c, 10, 5, hi); px(c, 13, 6, dark);

  // Bottle body — rounded shape
  bk(c, 7, 7, 10, 12, body);
  bk(c, 6, 9, 12, 8, body);
  bk(c, 8, 8, 8, 10, hi);

  // Liquid shine (vertical highlight on left side)
  bk(c, 8, 9, 2, 7, hi);
  px(c, 9, 10, '#ffffff60');
  px(c, 9, 11, '#ffffff40');

  // Outline
  bk(c, 6, 7, 1, 12, outline); bk(c, 17, 7, 1, 12, outline);
  bk(c, 7, 7, 10, 1, outline); bk(c, 6, 9, 1, 8, outline);
  bk(c, 17, 9, 1, 8, outline);
  bk(c, 7, 19, 10, 1, outline);

  // Bottom shadow
  bk(c, 7, 18, 10, 1, dark);
  px(c, 16, 17, dark); px(c, 16, 16, dark);

  // Label band
  bk(c, 7, 13, 10, 2, '#d0c8a0');
  bk(c, 8, 13, 8, 1, '#e0d8b0');
}

function drawFood(c: Ctx, dark: string, body: string, hi: string) {
  // Plate
  bk(c, 4, 14, 16, 6, '#d0c8b8');
  bk(c, 5, 15, 14, 4, '#e0d8c8');
  bk(c, 4, 14, 16, 1, '#e8e0d0');
  bk(c, 4, 19, 16, 1, '#b0a898');
  // Food on plate
  bk(c, 6, 10, 12, 6, body);
  bk(c, 7, 9, 10, 3, hi);
  bk(c, 8, 11, 8, 4, dark);
  // Highlight
  px(c, 8, 9, hi); px(c, 9, 9, hi);
  // Shadow
  px(c, 16, 14, dark); px(c, 15, 15, dark);
  // Steam
  px(c, 10, 6, '#c0c0c060'); px(c, 13, 5, '#c0c0c040');
  px(c, 11, 4, '#c0c0c030');
}

// ─── ARMOR ──────────────────────────────────────────

function drawHelm(c: Ctx, dark: string, body: string, hi: string, outline: string) {
  // Dome shape
  bk(c, 6, 6, 12, 14, body);
  bk(c, 8, 4, 8, 4, body);
  bk(c, 7, 5, 10, 2, body);

  // Top shine
  bk(c, 8, 4, 8, 2, hi);
  px(c, 9, 4, hi); px(c, 10, 3, hi);

  // Visor slit
  bk(c, 8, 14, 8, 2, '#1a1210');
  bk(c, 9, 14, 6, 1, '#2a2018');

  // Left edge highlight
  bk(c, 6, 8, 1, 10, hi);
  // Right edge shadow
  bk(c, 17, 8, 1, 10, dark);

  // Nose guard
  bk(c, 11, 10, 2, 6, dark);
  px(c, 11, 10, body);

  // Outline
  bk(c, 6, 4, 12, 1, outline);
  bk(c, 5, 6, 1, 14, outline);
  bk(c, 18, 6, 1, 14, outline);
  bk(c, 6, 19, 12, 1, outline);

  // Rivet detail
  px(c, 8, 8, '#c0c0b0'); px(c, 15, 8, '#c0c0b0');
}

function drawArmor(c: Ctx, dark: string, body: string, hi: string, outline: string) {
  // Torso shape
  bk(c, 5, 5, 14, 14, body);
  bk(c, 7, 4, 10, 2, body);
  bk(c, 6, 6, 12, 12, hi);

  // Shoulder straps
  bk(c, 3, 5, 4, 5, body); bk(c, 17, 5, 4, 5, body);
  px(c, 3, 5, hi); px(c, 20, 5, dark);

  // Center line
  bk(c, 11, 6, 2, 12, dark);
  // Left panel highlight
  bk(c, 7, 6, 4, 10, hi);
  px(c, 7, 6, hi); px(c, 8, 7, hi);

  // Belt
  bk(c, 5, 16, 14, 2, '#504028');
  bk(c, 5, 16, 14, 1, '#605030');
  // Buckle
  px(c, 11, 16, '#c0a040'); px(c, 12, 16, '#a08030');
  px(c, 11, 17, '#a08030'); px(c, 12, 17, '#c0a040');

  // Outline
  bk(c, 5, 3, 14, 1, outline); bk(c, 4, 5, 1, 14, outline);
  bk(c, 19, 5, 1, 14, outline); bk(c, 5, 19, 14, 1, outline);
  // Stitching detail
  for (let y = 8; y < 16; y += 2) { px(c, 7, y, dark); px(c, 16, y, dark); }
}

function drawChainmail(c: Ctx) {
  // Chain mesh pattern armor
  bk(c, 5, 5, 14, 14, '#708088');
  bk(c, 7, 4, 10, 2, '#708088');
  bk(c, 3, 5, 4, 5, '#708088'); bk(c, 17, 5, 4, 5, '#708088');

  // Chain link pattern
  for (let y = 5; y < 18; y += 2) {
    for (let x = 6; x < 18; x += 2) {
      const off = (y % 4 === 0) ? 0 : 1;
      px(c, x + off, y, '#90a0a8');
      px(c, x + off + 1, y + 1, '#607078');
    }
  }
  // Highlights
  bk(c, 6, 5, 3, 1, '#a0b0b8'); bk(c, 7, 6, 2, 1, '#b0c0c8');
  // Belt
  bk(c, 5, 16, 14, 2, '#504028');
  px(c, 11, 16, '#c0a040'); px(c, 12, 17, '#a08030');
  // Outline
  bk(c, 5, 3, 14, 1, '#485868'); bk(c, 4, 5, 1, 14, '#485868');
  bk(c, 19, 5, 1, 14, '#485868'); bk(c, 5, 19, 14, 1, '#485868');
}

function drawBoots(c: Ctx, dark: string, body: string, hi: string, outline: string) {
  // Two boots side by side
  // Left boot
  bk(c, 2, 6, 8, 10, body);
  bk(c, 3, 7, 6, 8, hi);
  bk(c, 1, 16, 10, 4, dark); // sole
  bk(c, 2, 16, 8, 1, body);
  px(c, 3, 7, hi); px(c, 3, 8, hi); // shine

  // Right boot
  bk(c, 14, 6, 8, 10, body);
  bk(c, 15, 7, 6, 8, hi);
  bk(c, 13, 16, 10, 4, dark);
  bk(c, 14, 16, 8, 1, body);
  px(c, 15, 7, hi); px(c, 15, 8, hi);

  // Buckles
  px(c, 5, 11, '#a0a098'); px(c, 6, 11, '#808078');
  px(c, 17, 11, '#a0a098'); px(c, 18, 11, '#808078');

  // Soles detail
  bk(c, 1, 19, 10, 1, outline); bk(c, 13, 19, 10, 1, outline);
  // Laces
  px(c, 6, 8, dark); px(c, 6, 10, dark); px(c, 6, 12, dark);
  px(c, 18, 8, dark); px(c, 18, 10, dark); px(c, 18, 12, dark);
}

// ─── WEAPONS ────────────────────────────────────────

function drawSword(c: Ctx, dark: string, blade: string, hi: string, edge: string, guard: string, grip: string) {
  // Diagonal blade from top-right to bottom-left
  for (let d = 0; d < 14; d++) {
    const sx = 17 - d;
    const sy = 2 + d;
    bk(c, sx, sy, 3, 2, blade);
    // Edge highlight on top
    px(c, sx, sy, hi);
    // Edge shadow on bottom
    px(c, sx + 2, sy + 1, dark);
  }
  // Tip — bright point
  px(c, 18, 1, hi); px(c, 19, 1, edge);
  // Fuller (groove in blade center)
  for (let d = 2; d < 12; d++) {
    px(c, 17 - d + 1, 2 + d + 1, edge);
  }

  // Crossguard
  bk(c, 2, 16, 10, 2, guard);
  bk(c, 2, 16, 10, 1, hi.replace(/[a-f0-9]{2}$/i, (m) => {
    const n = Math.min(255, parseInt(m, 16) + 20);
    return n.toString(16).padStart(2, '0');
  }));
  px(c, 2, 16, guard); px(c, 11, 17, dark);

  // Grip
  bk(c, 5, 18, 3, 4, grip);
  bk(c, 6, 18, 1, 4, blade); // grip wrap highlight
  // Pommel
  bk(c, 5, 22, 3, 1, guard);
  px(c, 6, 22, hi);
}

function drawBow(c: Ctx, dark: string, body: string, hi: string, _outline: string) {
  // Curved bow body (vertical arc)
  // Left limb
  for (let y = 2; y < 22; y++) {
    const curve = Math.round(Math.sin((y - 2) / 20 * Math.PI) * 6);
    const bx = 6 + curve;
    bk(c, bx, y, 2, 1, body);
    px(c, bx, y, y < 12 ? hi : dark);
  }
  // Limb tips
  px(c, 6, 2, hi); px(c, 6, 21, dark);

  // String (vertical line, slightly curved)
  for (let y = 3; y < 21; y++) {
    const sx = 16 - Math.round(Math.sin((y - 3) / 18 * Math.PI) * 2);
    px(c, sx, y, '#c0b890');
  }

  // Arrow notched
  bk(c, 14, 10, 6, 1, '#806040');
  px(c, 20, 10, '#a0a8b0'); // arrowhead
  px(c, 21, 10, '#c0c8d0');
  // Fletching
  px(c, 14, 9, '#c04040'); px(c, 14, 11, '#c04040');

  // Grip wrap (center of bow)
  bk(c, 11, 10, 2, 4, '#504028');
  px(c, 11, 10, '#605030');
}

function drawDagger(c: Ctx, dark: string, body: string, hi: string, outline: string) {
  // Short blade, angled
  for (let d = 0; d < 8; d++) {
    const sx = 15 - d;
    const sy = 4 + d;
    bk(c, sx, sy, 3, 2, body);
    px(c, sx, sy, hi);
    px(c, sx + 2, sy + 1, dark);
  }
  // Tip shine
  px(c, 16, 3, hi); px(c, 17, 3, hi);

  // Guard
  bk(c, 5, 12, 8, 2, '#606070');
  px(c, 5, 12, '#808090');

  // Grip — wrapped leather
  bk(c, 8, 14, 3, 6, '#403020');
  px(c, 8, 15, '#504030'); px(c, 8, 17, '#504030'); // wrapping
  bk(c, 9, 14, 1, 6, '#504030');

  // Pommel
  px(c, 9, 20, '#606070'); px(c, 8, 20, '#505060');

  // Outline
  bk(c, 7, 4, 1, 8, outline);
}

function drawMace(c: Ctx, dark: string, body: string, hi: string, outline: string) {
  // Mace head (spiked ball)
  for (let y = 2; y < 12; y++) for (let x = 7; x < 17; x++) {
    const dx = x - 12, dy = y - 7;
    const d = dx * dx + dy * dy;
    if (d < 25) {
      const shade = (dx * -0.5 + dy * -0.5);
      px(c, x, y, shade > 0.3 ? hi : shade > 0 ? body : shade > -0.3 ? dark : outline);
    }
  }
  // Flanges/spikes
  px(c, 12, 1, body); px(c, 7, 4, body); px(c, 17, 4, body);
  px(c, 7, 10, body); px(c, 17, 10, body); px(c, 12, 12, dark);
  // Head highlight
  px(c, 10, 4, hi); px(c, 11, 4, hi); px(c, 10, 5, hi);

  // Handle
  bk(c, 11, 12, 2, 10, '#604020');
  bk(c, 12, 12, 1, 10, '#705028');
  // Grip wrap
  px(c, 11, 15, '#504018'); px(c, 11, 17, '#504018'); px(c, 11, 19, '#504018');

  // Pommel
  bk(c, 10, 21, 4, 2, body);
  px(c, 10, 21, hi);
}

function drawStaff(c: Ctx, dark: string, body: string, hi: string, orb: string, orbHi: string) {
  // Shaft
  bk(c, 11, 6, 2, 16, body);
  bk(c, 12, 6, 1, 16, hi);
  px(c, 11, 21, dark); // bottom shadow

  // Rune markings on shaft
  px(c, 11, 10, orb); px(c, 12, 13, orb); px(c, 11, 16, orb);

  // Orb at top (glowing)
  for (let y = 0; y < 8; y++) for (let x = 7; x < 17; x++) {
    const dx = x - 12, dy = y - 3;
    const d = dx * dx + dy * dy;
    if (d < 12) {
      px(c, x, y, d < 4 ? orbHi : d < 8 ? orb : dark);
    }
  }
  // Orb glow highlight
  px(c, 10, 2, '#ffffff80'); px(c, 11, 1, '#ffffff40');

  // Staff head prongs
  px(c, 9, 6, body); px(c, 14, 6, body);
  px(c, 9, 5, hi); px(c, 14, 5, hi);
}

function drawRapier(c: Ctx, dark: string, blade: string, hi: string, _outline: string) {
  // Thin elegant blade, nearly vertical
  for (let d = 0; d < 16; d++) {
    const sx = 12;
    const sy = 1 + d;
    px(c, sx, sy, blade);
    px(c, sx + 1, sy, d < 4 ? hi : dark);
  }
  // Tip
  px(c, 12, 0, hi); px(c, 13, 0, '#ffffff60');

  // Ornate guard (curved cup)
  bk(c, 6, 16, 12, 2, '#c0a030');
  bk(c, 5, 17, 2, 3, '#c0a030'); bk(c, 17, 17, 2, 3, '#c0a030');
  px(c, 6, 16, '#e0c050'); px(c, 17, 17, '#907020');
  // Cup inner
  bk(c, 8, 18, 8, 1, '#a08020');

  // Grip
  bk(c, 11, 19, 2, 3, '#402818');
  px(c, 12, 19, '#503020');
  // Pommel
  px(c, 11, 22, '#c0a030'); px(c, 12, 22, '#e0c050');
}

// ─── SHIELDS ────────────────────────────────────────

function drawShield(c: Ctx, dark: string, body: string, hi: string, emblem: string, emblemHi: string) {
  // Round shield with boss
  for (let y = 3; y < 21; y++) {
    const ry = 1 - Math.abs(y - 12) / 9;
    const hw = Math.round(ry * 10);
    if (hw > 0) {
      bk(c, 12 - hw, y, hw * 2, 1, body);
      // Directional shading
      px(c, 12 - hw, y, hi);
      px(c, 12 + hw - 1, y, dark);
    }
  }
  // Top highlight arc
  for (let x = 8; x < 16; x++) px(c, x, 4, hi);

  // Rim
  for (let y = 3; y < 21; y++) {
    const ry = 1 - Math.abs(y - 12) / 9;
    const hw = Math.round(ry * 10);
    if (hw > 0) {
      px(c, 12 - hw, y, '#3a2810');
      px(c, 12 + hw - 1, y, '#3a2810');
    }
  }

  // Metal bands (cross)
  bk(c, 11, 5, 2, 14, '#808070');
  bk(c, 5, 11, 14, 2, '#808070');

  // Boss (center)
  bk(c, 10, 10, 4, 4, emblem);
  bk(c, 11, 11, 2, 2, emblemHi);
  px(c, 10, 10, emblemHi);
}

// ─── RINGS ──────────────────────────────────────────

function drawRing(c: Ctx, body: string, hi: string, gem: string) {
  // Ring circle
  for (let a = 0; a < 20; a++) {
    const angle = (a / 20) * Math.PI * 2;
    const x = 12 + Math.round(Math.cos(angle) * 6);
    const y = 13 + Math.round(Math.sin(angle) * 6);
    const col = a < 5 ? hi : a < 15 ? body : hi;
    px(c, x, y, col); px(c, x + 1, y, col);
  }

  // Gem setting
  bk(c, 10, 5, 4, 4, gem);
  bk(c, 11, 4, 2, 2, gem);
  px(c, 10, 5, '#ffffff80'); // gem highlight
  px(c, 13, 8, '#00000040'); // gem shadow

  // Band thickness on sides
  px(c, 6, 13, body); px(c, 18, 13, body);
}

// ─── MATERIALS ──────────────────────────────────────

function drawPelt(c: Ctx, dark: string, body: string, hi: string, outline: string) {
  // Fur pelt — organic shape
  bk(c, 3, 7, 18, 10, body);
  bk(c, 5, 8, 14, 8, hi);
  // Irregular edges (fur tufts)
  px(c, 3, 6, body); px(c, 6, 6, body); px(c, 14, 6, body); px(c, 19, 7, body);
  px(c, 4, 17, body); px(c, 10, 17, body); px(c, 18, 17, body);
  // Fur texture lines
  for (let x = 4; x < 20; x += 2) { px(c, x, 8, dark); px(c, x + 1, 16, dark); }
  for (let x = 5; x < 19; x += 3) { px(c, x, 11, outline); }
  // Highlight
  px(c, 7, 9, hi); px(c, 8, 9, hi); px(c, 9, 10, hi);
}

function drawBone(c: Ctx, dark: string, body: string, hi: string, outline: string) {
  // Jagged bone shard
  bk(c, 5, 8, 14, 6, body);
  bk(c, 6, 9, 12, 4, hi);

  // Knobs at ends
  bk(c, 3, 7, 4, 4, body); bk(c, 3, 12, 4, 4, body);
  bk(c, 17, 7, 4, 4, body); bk(c, 17, 12, 4, 4, body);

  // Jagged break at top
  px(c, 8, 7, hi); px(c, 11, 6, hi); px(c, 14, 7, hi);
  px(c, 10, 5, body); px(c, 13, 5, body);

  // Highlight
  bk(c, 6, 8, 12, 1, hi);
  px(c, 4, 7, hi); px(c, 18, 7, hi);

  // Shadow
  bk(c, 6, 14, 12, 1, outline);
  px(c, 4, 14, dark); px(c, 18, 14, dark);
  // Cracks
  px(c, 9, 10, outline); px(c, 13, 11, outline);
}

function drawOre(c: Ctx, dark: string, body: string, hi: string, outline: string) {
  // Rock chunk with metallic glints
  bk(c, 5, 8, 14, 10, body);
  bk(c, 7, 6, 10, 4, body);
  bk(c, 6, 9, 12, 8, dark);

  // Faceted surface
  bk(c, 7, 7, 8, 3, hi);
  bk(c, 5, 10, 6, 5, body);
  bk(c, 13, 12, 5, 4, dark);

  // Metallic glints
  px(c, 8, 7, '#c0c8d0'); px(c, 10, 8, '#a0a8b0');
  px(c, 14, 10, '#c0c8d0'); px(c, 7, 13, '#b0b8c0');

  // Rock outline
  px(c, 5, 8, outline); px(c, 18, 10, outline);
  bk(c, 5, 17, 14, 1, outline);

  // Shadow
  bk(c, 7, 18, 10, 1, '#28303840');
}

function drawFlower(c: Ctx, dark: string, body: string, hi: string, stem: string) {
  // Moonpetal flower — white/purple
  // Stem
  bk(c, 11, 12, 2, 10, stem);
  px(c, 12, 12, '#a070c0');
  // Leaves on stem
  bk(c, 9, 16, 3, 2, '#40a040'); bk(c, 13, 14, 3, 2, '#40a040');
  px(c, 9, 16, '#50b050');

  // Petals (5 around center)
  const petals: [number,number][] = [[10,4],[7,7],[13,7],[8,10],[14,4]];
  for (const [px2,py] of petals) {
    bk(c, px2, py, 4, 3, body);
    px(c, px2, py, hi);
    px(c, px2 + 3, py + 2, dark);
  }
  // Center
  bk(c, 10, 7, 4, 3, '#f0e060');
  px(c, 11, 7, '#fff080');
}

function drawOrb(c: Ctx, dark: string, body: string, hi: string, glow: string) {
  // Glowing shadow orb
  for (let y = 4; y < 20; y++) for (let x = 4; x < 20; x++) {
    const dx = x - 12, dy = y - 12;
    const d = dx * dx + dy * dy;
    if (d < 56) {
      const shade = d < 12 ? glow : d < 28 ? hi : d < 42 ? body : dark;
      px(c, x, y, shade);
    }
  }
  // Highlight sparkle
  px(c, 9, 7, '#ffffff80'); px(c, 10, 6, '#ffffff60');
  px(c, 8, 8, '#ffffff40');
  // Glow ring (faint outer)
  for (let y = 3; y < 21; y++) for (let x = 3; x < 21; x++) {
    const dx = x - 12, dy = y - 12;
    const d = dx * dx + dy * dy;
    if (d >= 56 && d < 72) px(c, x, y, '#6030a020');
  }
}

function drawSilk(c: Ctx) {
  // White thread bundle
  bk(c, 6, 4, 12, 16, '#e0e0e0');
  bk(c, 8, 6, 8, 12, '#f0f0f0');
  // Thread lines
  for (let y = 5; y < 19; y += 2) {
    bk(c, 7, y, 10, 1, '#d0d0d0');
  }
  // Cross wrapping
  bk(c, 10, 8, 4, 2, '#c0c0c0'); bk(c, 10, 14, 4, 2, '#c0c0c0');
  // Highlight
  px(c, 9, 6, '#ffffff'); px(c, 10, 7, '#f8f8f8');
  // Shadow
  bk(c, 16, 8, 1, 8, '#b0b0b0');
  bk(c, 6, 19, 12, 1, '#c0c0c0');
  // Loose threads
  px(c, 7, 4, '#e8e8e8'); px(c, 16, 4, '#d8d8d8');
  px(c, 6, 20, '#e0e0e0'); px(c, 17, 19, '#d0d0d0');
}

function drawDust(c: Ctx) {
  // Grey sparkle dust — scattered particles
  // Container (small pouch)
  bk(c, 6, 10, 12, 10, '#706858');
  bk(c, 7, 11, 10, 8, '#807868');
  bk(c, 8, 8, 8, 3, '#706858');
  bk(c, 9, 8, 6, 1, '#908878');
  // Drawstring
  px(c, 9, 9, '#a09880'); px(c, 14, 9, '#a09880');

  // Sparkle particles floating above
  px(c, 8, 4, '#c0c0d0'); px(c, 12, 2, '#d0d0e0'); px(c, 16, 5, '#b0b0c0');
  px(c, 10, 6, '#e0e0f0'); px(c, 14, 3, '#c8c8d8'); px(c, 6, 6, '#b8b8c8');
  px(c, 18, 3, '#a0a0b0');
  // Star sparkle
  px(c, 12, 1, '#ffffff'); px(c, 11, 2, '#e0e0f0'); px(c, 13, 2, '#e0e0f0');

  // Shadow
  bk(c, 6, 19, 12, 1, '#605848');
  px(c, 17, 12, '#605848');
}

function drawHeart(c: Ctx, dark: string, body: string, hi: string, outline: string) {
  // Organic heart shape
  // Two lobes at top
  for (let y = 4; y < 20; y++) for (let x = 4; x < 20; x++) {
    // Heart shape equation
    const nx = (x - 12) / 8;
    const ny = (y - 10) / 10;
    const h = nx * nx + Math.pow(ny - Math.sqrt(Math.abs(nx)), 2);
    if (h < 0.6) {
      const shade = h < 0.15 ? hi : h < 0.35 ? body : dark;
      px(c, x, y, shade);
    }
  }
  // Veins/texture
  px(c, 11, 10, dark); px(c, 12, 12, dark); px(c, 10, 14, dark);
  px(c, 14, 11, dark); px(c, 13, 15, dark);
  // Highlight
  px(c, 9, 7, hi); px(c, 10, 6, hi);
  // Drip at bottom
  px(c, 12, 19, dark); px(c, 12, 20, outline);
}

// ─── QUEST ITEMS ────────────────────────────────────

function drawKey(c: Ctx, dark: string, body: string, hi: string, outline: string) {
  // Classic key shape
  // Ring (top)
  for (let a = 0; a < 16; a++) {
    const angle = (a / 16) * Math.PI * 2;
    const x = 8 + Math.round(Math.cos(angle) * 4);
    const y = 6 + Math.round(Math.sin(angle) * 4);
    px(c, x, y, a < 4 ? hi : a < 12 ? body : dark);
    px(c, x + 1, y, a < 4 ? hi : body);
  }
  // Ring inner hole
  bk(c, 7, 5, 3, 3, '#00000000');
  // Clear center (transparent)
  c.clearRect(7, 5, 3, 3);

  // Shaft
  bk(c, 9, 10, 2, 10, body);
  bk(c, 10, 10, 1, 10, hi);
  px(c, 9, 10, dark); // shadow at join

  // Teeth (bit)
  bk(c, 11, 17, 4, 2, body);
  bk(c, 11, 15, 3, 2, body);
  px(c, 14, 17, hi); px(c, 13, 15, hi);
  px(c, 11, 18, dark); px(c, 11, 16, dark);

  // Outline accents
  px(c, 5, 3, outline); px(c, 12, 3, outline);
}

function drawJournal(c: Ctx) {
  // Torn paper with writing
  bk(c, 4, 3, 16, 18, '#d8d0b0');
  bk(c, 5, 4, 14, 16, '#e8e0c8');
  // Torn edge (right side)
  px(c, 19, 5, '#d8d0b0'); px(c, 18, 8, '#d0c8a8');
  px(c, 19, 12, '#d8d0b0'); px(c, 18, 15, '#d0c8a8');
  px(c, 19, 18, '#d8d0b0');
  // Clear torn edge pixels for jagged look
  c.clearRect(19, 6, 1, 2); c.clearRect(19, 13, 1, 2);

  // Writing lines
  for (let y = 6; y < 18; y += 2) {
    bk(c, 7, y, 10, 1, '#4a3828');
    // Some lines shorter (broken text)
    if (y === 10) bk(c, 13, y, 4, 1, '#e8e0c8'); // gap
    if (y === 14) bk(c, 7, y, 6, 1, '#4a3828'); // short line
  }

  // Ink blot
  px(c, 15, 12, '#302018'); px(c, 16, 12, '#302018');

  // Page fold corner
  bk(c, 4, 3, 3, 3, '#c0b898');
  px(c, 4, 3, '#b0a888'); px(c, 5, 4, '#d0c8a8');

  // Shadow
  bk(c, 5, 20, 14, 1, '#b0a888');
}

function drawCrown(c: Ctx) {
  // Golden crown with gems
  // Crown band
  bk(c, 4, 12, 16, 6, '#c09830');
  bk(c, 5, 13, 14, 4, '#d0a838');
  bk(c, 4, 12, 16, 1, '#e0c050'); // top edge highlight
  bk(c, 4, 17, 16, 1, '#907020'); // bottom shadow

  // Points (3 prongs)
  // Left point
  bk(c, 5, 6, 3, 7, '#c09830');
  bk(c, 6, 4, 1, 3, '#d0a838');
  px(c, 6, 3, '#e0c050');
  // Center point (tallest)
  bk(c, 10, 4, 4, 9, '#c09830');
  bk(c, 11, 2, 2, 3, '#d0a838');
  px(c, 11, 1, '#e0c050'); px(c, 12, 1, '#d0a838');
  // Right point
  bk(c, 16, 6, 3, 7, '#c09830');
  bk(c, 17, 4, 1, 3, '#d0a838');
  px(c, 17, 3, '#e0c050');

  // Gems
  bk(c, 7, 13, 3, 3, '#d03030'); px(c, 7, 13, '#f04848'); // ruby
  bk(c, 11, 13, 3, 3, '#3060d0'); px(c, 11, 13, '#4880f0'); // sapphire
  bk(c, 15, 13, 3, 3, '#30a040'); px(c, 15, 13, '#48c058'); // emerald

  // Crown highlights
  px(c, 5, 12, '#e8d060'); px(c, 8, 12, '#e8d060'); px(c, 14, 12, '#e8d060');
  // Crown inner shadow
  bk(c, 5, 17, 14, 1, '#805818');

  // Band detail (filigree line)
  bk(c, 5, 15, 14, 1, '#a08028');
}

// ─── FALLBACK ───────────────────────────────────────

function drawGenericByKey(c: Ctx, key: string) {
  // Infer type from key name for appropriate fallback shape
  if (key.includes('sword') || key.includes('blade') || key.includes('rapier')) {
    drawSword(c, '#808890', '#909ca8', '#b0b8c0', '#606870', '#8a6828', '#604020');
  } else if (key.includes('bow')) {
    drawBow(c, '#705028', '#906838', '#b08048', '#503818');
  } else if (key.includes('dagger')) {
    drawDagger(c, '#383848', '#505068', '#686880', '#202030');
  } else if (key.includes('mace') || key.includes('hammer')) {
    drawMace(c, '#606870', '#808890', '#a0a8b0', '#404850');
  } else if (key.includes('staff') || key.includes('wand')) {
    drawStaff(c, '#604020', '#805030', '#a06840', '#8060c0', '#b090f0');
  } else if (key.includes('helm') || key.includes('cap') || key.includes('crown')) {
    drawHelm(c, '#707880', '#889098', '#a0a8b0', '#505860');
  } else if (key.includes('armor') || key.includes('mail') || key.includes('vest')) {
    drawArmor(c, '#604820', '#806028', '#a07838', '#483818');
  } else if (key.includes('shield') || key.includes('buckler')) {
    drawShield(c, '#705028', '#906838', '#b08048', '#c0a030', '#e0c050');
  } else if (key.includes('boots') || key.includes('greaves')) {
    drawBoots(c, '#604020', '#805030', '#a06840', '#402810');
  } else if (key.includes('ring') || key.includes('amulet') || key.includes('band')) {
    drawRing(c, '#b07030', '#d09048', '#60c0e0');
  } else if (key.includes('potion') || key.includes('tonic') || key.includes('elixir')) {
    drawPotion(c, '#808040', '#a0a050', '#c0c060', '#606020');
  } else if (key.includes('key')) {
    drawKey(c, '#806040', '#a08050', '#c0a068', '#604020');
  } else if (key.includes('journal') || key.includes('scroll') || key.includes('page') || key.includes('tome')) {
    drawJournal(c);
  } else if (key.includes('pelt') || key.includes('hide') || key.includes('fur')) {
    drawPelt(c, '#686868', '#888888', '#a0a0a0', '#505050');
  } else if (key.includes('ore') || key.includes('stone') || key.includes('gem')) {
    drawOre(c, '#505860', '#687078', '#808890', '#384048');
  } else if (key.includes('heart') || key.includes('organ')) {
    drawHeart(c, '#901020', '#c02030', '#e04048', '#680810');
  } else if (key.includes('dust') || key.includes('powder') || key.includes('ash')) {
    drawDust(c);
  } else if (key.includes('silk') || key.includes('thread') || key.includes('string')) {
    drawSilk(c);
  } else if (key.includes('flower') || key.includes('petal') || key.includes('herb')) {
    drawFlower(c, '#d0c0e0', '#e8d8f0', '#f8f0ff', '#40a040');
  } else if (key.includes('bone') || key.includes('fang') || key.includes('claw') || key.includes('shard')) {
    drawBone(c, '#c8c0a8', '#e0d8c0', '#f0e8d8', '#a8a088');
  } else if (key.includes('essence') || key.includes('spirit') || key.includes('soul')) {
    drawOrb(c, '#402060', '#6030a0', '#9050d0', '#b080f0');
  } else {
    drawGeneric(c);
  }
}

function drawGeneric(c: Ctx) {
  // Generic question-mark-shaped item
  bk(c, 6, 6, 12, 12, '#706858');
  bk(c, 7, 7, 10, 10, '#908878');
  bk(c, 8, 8, 8, 8, '#a0a088');
  // Question mark
  bk(c, 10, 9, 4, 2, '#504838');
  bk(c, 13, 10, 1, 3, '#504838');
  bk(c, 10, 12, 4, 1, '#504838');
  bk(c, 10, 12, 1, 2, '#504838');
  px(c, 11, 15, '#504838');
  // Highlight
  px(c, 7, 7, '#b0a898');
}
