import * as Phaser from 'phaser';

/**
 * Procedural monster sprite generator. Each monster type gets a unique
 * pixel-art shape drawn at 48×48, scaled up in the combat scene.
 *
 * Monster sprites face LEFT (toward the player on the left side).
 */

const MW = 48;
const MH = 48;

type Ctx = CanvasRenderingContext2D;
function px(c:Ctx,x:number,y:number,col:string){c.fillStyle=col;c.fillRect(x,y,1,1);}
function bk(c:Ctx,x:number,y:number,w:number,h:number,col:string){c.fillStyle=col;c.fillRect(x,y,w,h);}

export function generateMonsterSprite(scene: Phaser.Scene, key: string, monsterKey: string): void {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement('canvas');
  canvas.width = MW;
  canvas.height = MH;
  const ctx = canvas.getContext('2d')!;

  switch (monsterKey) {
    case 'wolf': drawWolf(ctx); break;
    case 'skeleton': drawSkeleton(ctx); break;
    case 'hollow_knight': drawHollowKnight(ctx); break;
    case 'spider': drawSpider(ctx); break;
    case 'wraith': drawWraith(ctx); break;
    case 'hollow_king': drawHollowKing(ctx); break;
    case 'boar': drawBoar(ctx); break;
    case 'bandit': drawBandit(ctx); break;
    case 'cave_bat': drawCaveBat(ctx); break;
    case 'mine_golem': drawMineGolem(ctx); break;
    case 'bog_lurker': drawBogLurker(ctx); break;
    case 'drowned_warden': drawDrownedWarden(ctx); break;
    default: drawWolf(ctx); break;
  }

  // Outline pass
  drawOutline(ctx);

  const tex = scene.textures.addCanvas(key, canvas);
  if (tex) tex.add(0, 0, 0, 0, MW, MH);
}

// ─── WOLF ─────────────────────────────────────────────────────

function drawWolf(c: Ctx) {
  const body = '#707878';
  const dark = '#505858';
  const lite = '#909898';
  const belly = '#a0a8a8';
  const eye = '#e0c020';
  const nose = '#282020';
  const teeth = '#e0e0d0';

  // Shadow
  bk(c, 10, 42, 28, 6, 'rgba(0,0,0,0.2)');

  // Tail (curves up from rear)
  bk(c, 36, 18, 3, 8, dark);
  bk(c, 38, 16, 3, 6, body);
  bk(c, 40, 14, 2, 4, lite);
  px(c, 41, 13, lite);

  // Hind legs
  bk(c, 30, 34, 4, 10, dark);
  bk(c, 31, 35, 2, 8, body);
  bk(c, 35, 34, 4, 10, dark);
  bk(c, 36, 35, 2, 8, body);
  // Paws
  bk(c, 29, 42, 6, 3, dark);
  bk(c, 34, 42, 6, 3, dark);

  // Body (elongated horizontal)
  bk(c, 10, 22, 28, 14, body);
  bk(c, 12, 24, 24, 10, lite);
  // Back line (darker)
  bk(c, 10, 22, 28, 3, dark);
  // Belly (lighter underneath)
  bk(c, 14, 33, 18, 3, belly);

  // Front legs
  bk(c, 12, 34, 4, 10, body);
  bk(c, 13, 35, 2, 8, lite);
  bk(c, 17, 34, 4, 10, body);
  bk(c, 18, 35, 2, 8, lite);
  // Front paws
  bk(c, 11, 42, 6, 3, body);
  bk(c, 16, 42, 6, 3, body);

  // Neck (thicker, connects to head)
  bk(c, 6, 20, 8, 10, body);
  bk(c, 7, 21, 6, 8, lite);

  // Head
  bk(c, 2, 16, 10, 10, body);
  bk(c, 3, 17, 8, 8, lite);
  // Snout (extends left)
  bk(c, 0, 20, 5, 5, body);
  bk(c, 0, 21, 4, 3, lite);
  // Nose
  bk(c, 0, 20, 2, 2, nose);
  // Teeth (small white line under snout)
  px(c, 1, 24, teeth); px(c, 3, 24, teeth); px(c, 5, 24, teeth);

  // Eyes (yellow, menacing)
  bk(c, 4, 18, 3, 2, eye);
  px(c, 5, 18, '#f0d830'); // bright center
  // Eye glow
  px(c, 3, 17, '#e0c020');

  // Ears (pointed, on top of head)
  bk(c, 4, 12, 3, 5, dark);
  bk(c, 5, 11, 2, 3, body);
  px(c, 5, 10, lite);
  bk(c, 8, 13, 3, 4, dark);
  bk(c, 9, 12, 2, 3, body);
  px(c, 9, 11, lite);

  // Fur texture (darker streaks on back)
  for (let fx = 14; fx < 36; fx += 4) {
    px(c, fx, 23, dark);
    px(c, fx + 1, 24, dark);
  }
}

// ─── SKELETON ─────────────────────────────────────────────────

function drawSkeleton(c: Ctx) {
  const bone = '#d8d0c0';
  const boneDk = '#b0a890';
  const boneLt = '#e8e0d0';
  const socket = '#201810';
  const armor = '#606868';
  const armorLt = '#808888';
  const sword = '#a0a8b0';
  const swordHi = '#c0c8d0';

  // Shadow
  bk(c, 14, 44, 20, 4, 'rgba(0,0,0,0.2)');

  // Feet (bone)
  bk(c, 18, 40, 4, 4, bone);
  bk(c, 26, 40, 4, 4, bone);

  // Legs (thin bones)
  bk(c, 19, 30, 2, 10, bone);
  bk(c, 27, 30, 2, 10, bone);
  // Knee joints
  bk(c, 18, 34, 4, 2, boneDk);
  bk(c, 26, 34, 4, 2, boneDk);

  // Pelvis
  bk(c, 16, 28, 16, 4, bone);
  bk(c, 17, 29, 14, 2, boneDk);

  // Ribcage
  bk(c, 16, 16, 16, 12, bone);
  // Individual ribs (dark gaps)
  for (let ry = 18; ry < 28; ry += 2) {
    bk(c, 18, ry, 12, 1, socket);
  }
  // Spine (center dark line)
  bk(c, 23, 16, 2, 14, boneDk);

  // Tattered armor piece (one shoulder)
  bk(c, 12, 14, 8, 6, armor);
  bk(c, 13, 15, 6, 4, armorLt);
  bk(c, 12, 14, 8, 1, armorLt); // highlight

  // Arms (bone thin)
  bk(c, 14, 18, 2, 12, bone);
  bk(c, 32, 18, 2, 12, bone);
  // Hands
  bk(c, 13, 28, 4, 3, boneDk);
  bk(c, 31, 28, 4, 3, boneDk);

  // Skull
  bk(c, 18, 4, 12, 12, bone);
  bk(c, 17, 6, 14, 8, bone);
  bk(c, 19, 5, 10, 10, boneLt);
  // Eye sockets (dark holes)
  bk(c, 20, 7, 3, 3, socket);
  bk(c, 25, 7, 3, 3, socket);
  // Red glow in sockets
  px(c, 21, 8, '#c02020');
  px(c, 26, 8, '#c02020');
  // Nose hole
  bk(c, 23, 11, 2, 2, socket);
  // Jaw / teeth
  bk(c, 19, 13, 10, 3, bone);
  bk(c, 20, 14, 2, 1, socket); bk(c, 23, 14, 2, 1, socket); bk(c, 26, 14, 2, 1, socket);

  // Sword in right hand
  bk(c, 8, 6, 2, 24, sword);
  bk(c, 8, 6, 2, 1, swordHi); // tip shine
  bk(c, 7, 28, 4, 2, '#806030'); // crossguard
  bk(c, 8, 30, 2, 4, '#604020'); // grip
  px(c, 8, 4, swordHi); px(c, 9, 5, swordHi); // blade gleam
}

// ─── HOLLOW KNIGHT ────────────────────────────────────────────

function drawHollowKnight(c: Ctx) {
  const armor = '#506068';
  const armorDk = '#384048';
  const armorLt = '#687880';
  const rust = '#785838';
  const cape = '#302838';
  const capeLt = '#483858';
  const visor = '#101018';
  const sword = '#8890a0';
  const swordHi = '#b0b8c8';
  const glow = '#c02030';

  // Shadow (large)
  bk(c, 8, 44, 32, 4, 'rgba(0,0,0,0.25)');

  // Cape (behind body, flowing)
  bk(c, 18, 14, 20, 30, cape);
  bk(c, 20, 16, 16, 26, capeLt);
  // Cape flow lines
  for (let fx = 22; fx < 36; fx += 4) bk(c, fx, 18, 1, 24, cape);
  // Cape bottom hem
  bk(c, 18, 42, 20, 2, cape);
  // Cape tatter
  bk(c, 36, 38, 3, 6, cape);
  bk(c, 19, 40, 2, 4, capeLt);

  // Legs (armored)
  bk(c, 16, 34, 6, 10, armor);
  bk(c, 17, 35, 4, 8, armorLt);
  bk(c, 26, 34, 6, 10, armor);
  bk(c, 27, 35, 4, 8, armorLt);
  // Knee guards
  bk(c, 15, 36, 8, 3, armorDk);
  bk(c, 25, 36, 8, 3, armorDk);
  // Armored boots
  bk(c, 14, 42, 10, 4, armorDk);
  bk(c, 24, 42, 10, 4, armorDk);
  bk(c, 15, 42, 8, 1, armorLt);
  bk(c, 25, 42, 8, 1, armorLt);

  // Body (heavy plate)
  bk(c, 12, 16, 24, 18, armor);
  bk(c, 14, 18, 20, 14, armorLt);
  // Plate bands
  for (let by = 20; by < 32; by += 4) bk(c, 14, by, 20, 1, armorDk);
  // Rust spots
  px(c, 16, 22, rust); px(c, 28, 26, rust); px(c, 20, 30, rust);
  // Center line
  bk(c, 23, 18, 2, 14, armorDk);

  // Pauldrons (massive shoulder plates)
  bk(c, 6, 12, 12, 8, armor);
  bk(c, 7, 13, 10, 6, armorLt);
  bk(c, 6, 12, 12, 1, armorLt);
  bk(c, 30, 12, 12, 8, armor);
  bk(c, 31, 13, 10, 6, armorLt);
  bk(c, 30, 12, 12, 1, armorLt);
  // Pauldron rivets
  px(c, 8, 14, '#909898'); px(c, 15, 14, '#909898');
  px(c, 32, 14, '#909898'); px(c, 39, 14, '#909898');

  // Arms
  bk(c, 8, 18, 5, 14, armor);
  bk(c, 9, 19, 3, 12, armorLt);
  bk(c, 35, 18, 5, 14, armor);
  bk(c, 36, 19, 3, 12, armorLt);
  // Gauntlets
  bk(c, 7, 30, 7, 4, armorDk);
  bk(c, 34, 30, 7, 4, armorDk);

  // Helmet
  bk(c, 14, 2, 20, 14, armor);
  bk(c, 16, 4, 16, 10, armorLt);
  bk(c, 14, 2, 20, 2, armorLt); // top shine
  // Visor slit (pure darkness — no face)
  bk(c, 18, 8, 12, 3, visor);
  // Red glow behind visor
  px(c, 20, 9, glow); px(c, 27, 9, glow);
  px(c, 21, 9, '#e03040'); px(c, 26, 9, '#e03040');
  // Helmet crest
  bk(c, 22, 0, 4, 4, armorDk);
  bk(c, 23, 0, 2, 2, armorLt);

  // GREATSWORD (massive, held in right hand)
  bk(c, 2, 0, 3, 34, sword);
  bk(c, 2, 0, 3, 2, swordHi); // tip
  bk(c, 1, 0, 1, 8, swordHi); // edge gleam
  bk(c, 0, 30, 7, 3, '#806030'); // crossguard
  bk(c, 1, 33, 5, 6, '#604020'); // grip
  bk(c, 2, 38, 3, 3, '#806030'); // pommel
  // Blood on blade
  px(c, 3, 8, '#802020'); px(c, 3, 12, '#802020');
}

// ─── SPIDER ──────────────────────────────────────────────────

function drawSpider(c: Ctx) {
  const body = '#3a3a2a';
  const bodyDk = '#2a2a1a';
  const bodyLt = '#4a4a38';
  const leg = '#2e2e20';
  const legLt = '#484830';
  const eye = '#c02020';
  const fang = '#d0d0c0';

  // Shadow (wide)
  bk(c, 4, 42, 40, 4, 'rgba(0,0,0,0.2)');

  // Legs — 4 on each side, curving outward
  // Left legs (facing left toward player)
  // Front left
  bk(c, 4, 26, 10, 2, leg); bk(c, 2, 28, 4, 2, leg); bk(c, 0, 30, 4, 12, leg); px(c, 0, 42, legLt);
  // Mid-front left
  bk(c, 6, 30, 8, 2, leg); bk(c, 2, 32, 6, 2, leg); bk(c, 0, 34, 4, 2, legLt);
  // Mid-rear left
  bk(c, 6, 34, 8, 2, leg); bk(c, 2, 36, 6, 2, leg); bk(c, 0, 38, 4, 4, leg);
  // Rear left
  bk(c, 8, 36, 6, 2, leg); bk(c, 4, 38, 6, 2, leg); bk(c, 2, 40, 4, 4, leg);

  // Right legs
  // Front right
  bk(c, 34, 26, 10, 2, leg); bk(c, 42, 28, 4, 2, leg); bk(c, 44, 30, 4, 12, leg); px(c, 47, 42, legLt);
  // Mid-front right
  bk(c, 34, 30, 8, 2, leg); bk(c, 40, 32, 6, 2, leg); bk(c, 44, 34, 4, 2, legLt);
  // Mid-rear right
  bk(c, 34, 34, 8, 2, leg); bk(c, 40, 36, 6, 2, leg); bk(c, 44, 38, 4, 4, leg);
  // Rear right
  bk(c, 30, 36, 6, 2, leg); bk(c, 36, 38, 6, 2, leg); bk(c, 42, 40, 4, 4, leg);

  // Abdomen (large, rear section)
  bk(c, 16, 28, 16, 14, body);
  bk(c, 18, 30, 12, 10, bodyLt);
  // Abdomen markings
  bk(c, 20, 32, 8, 2, bodyDk);
  bk(c, 22, 36, 4, 2, bodyDk);
  px(c, 21, 34, '#4a3a2a'); px(c, 27, 34, '#4a3a2a');

  // Cephalothorax (front body)
  bk(c, 14, 22, 20, 10, body);
  bk(c, 16, 24, 16, 6, bodyLt);

  // Eyes (cluster of small red dots)
  bk(c, 16, 22, 2, 2, eye); bk(c, 20, 22, 2, 2, eye);
  bk(c, 24, 22, 2, 2, eye); bk(c, 28, 22, 2, 2, eye);
  px(c, 18, 24, eye); px(c, 26, 24, eye);
  // Eye shine
  px(c, 17, 22, '#ff4040'); px(c, 25, 22, '#ff4040');

  // Fangs (chelicerae)
  bk(c, 18, 20, 2, 4, fang);
  bk(c, 26, 20, 2, 4, fang);
  px(c, 18, 23, '#a0a090'); px(c, 26, 23, '#a0a090');
}

// ─── WRAITH ─────────────────────────────────────────────────

function drawWraith(c: Ctx) {
  const cloak = '#304060';
  const cloakDk = '#1c2840';
  const cloakLt = '#405878';
  const glow = '#80c0ff';
  const glowBr = '#c0e8ff';
  const wisp = 'rgba(64,96,160,0.4)';

  // Ethereal wisps below (floating, no legs)
  bk(c, 16, 40, 16, 4, wisp);
  bk(c, 14, 42, 20, 4, wisp);
  bk(c, 18, 44, 12, 4, 'rgba(48,64,96,0.3)');

  // Cloak body (flowing, tapers at bottom)
  bk(c, 14, 16, 20, 28, cloak);
  bk(c, 16, 18, 16, 24, cloakLt);
  // Cloak flow lines
  for (let fx = 17; fx < 32; fx += 3) bk(c, fx, 20, 1, 22, cloakDk);
  // Tattered bottom edges
  bk(c, 12, 40, 4, 6, cloakDk);
  bk(c, 32, 40, 4, 6, cloakDk);
  bk(c, 15, 42, 3, 4, cloakLt);
  bk(c, 30, 42, 3, 4, cloakLt);

  // Cloak shoulders (wider)
  bk(c, 10, 14, 28, 6, cloak);
  bk(c, 12, 15, 24, 4, cloakLt);

  // Arms (spectral, thin, reaching forward)
  bk(c, 6, 20, 8, 3, cloakDk);
  bk(c, 4, 22, 6, 3, cloak);
  bk(c, 2, 24, 4, 2, cloakLt);
  // Ghostly fingers
  px(c, 1, 24, glow); px(c, 2, 25, glow); px(c, 4, 25, glow);

  bk(c, 34, 20, 8, 3, cloakDk);
  bk(c, 38, 22, 6, 3, cloak);
  bk(c, 42, 24, 4, 2, cloakLt);
  px(c, 45, 24, glow); px(c, 44, 25, glow); px(c, 42, 25, glow);

  // Hood
  bk(c, 14, 4, 20, 14, cloak);
  bk(c, 16, 6, 16, 10, cloakDk);
  bk(c, 14, 4, 20, 2, cloakLt);
  // Hood peak
  bk(c, 20, 2, 8, 4, cloak);
  bk(c, 22, 0, 4, 4, cloakDk);

  // Face void (pure darkness inside hood)
  bk(c, 18, 8, 12, 6, '#080810');

  // Glowing eyes
  bk(c, 20, 9, 3, 3, glow);
  bk(c, 25, 9, 3, 3, glow);
  px(c, 21, 10, glowBr); px(c, 26, 10, glowBr);
  // Eye trails (ghostly streaks)
  px(c, 19, 10, 'rgba(128,192,255,0.5)');
  px(c, 28, 10, 'rgba(128,192,255,0.5)');
  px(c, 18, 11, 'rgba(128,192,255,0.3)');
  px(c, 29, 11, 'rgba(128,192,255,0.3)');
}

// ─── HOLLOW KING ─────────────────────────────────────────────

function drawHollowKing(c: Ctx) {
  const armor = '#302848';
  const armorDk = '#1c1830';
  const armorLt = '#483860';
  const purple = '#503878';
  const purpleLt = '#685090';
  const gold = '#c0a040';
  const goldDk = '#907020';
  const goldLt = '#e0c860';
  const cape = '#180c28';
  const capeLt = '#281840';
  const visor = '#080010';
  const glow = '#a020c0';
  const glowBr = '#d050f0';
  const sword = '#8888a0';
  const swordHi = '#b0b0c8';

  // Shadow (very large)
  bk(c, 4, 44, 40, 4, 'rgba(0,0,0,0.3)');

  // Cape (behind body, massive and flowing)
  bk(c, 14, 10, 28, 36, cape);
  bk(c, 16, 12, 24, 32, capeLt);
  for (let fx = 18; fx < 40; fx += 3) bk(c, fx, 14, 1, 30, cape);
  bk(c, 14, 42, 28, 4, cape);
  bk(c, 40, 36, 4, 10, cape);
  bk(c, 15, 40, 3, 6, capeLt);

  // Legs (heavy plate)
  bk(c, 14, 34, 8, 10, armor);
  bk(c, 15, 35, 6, 8, armorLt);
  bk(c, 26, 34, 8, 10, armor);
  bk(c, 27, 35, 6, 8, armorLt);
  // Knee guards with gold trim
  bk(c, 13, 36, 10, 3, armorDk);
  bk(c, 25, 36, 10, 3, armorDk);
  bk(c, 13, 36, 10, 1, goldDk);
  bk(c, 25, 36, 10, 1, goldDk);
  // Armored boots
  bk(c, 12, 42, 12, 4, armorDk);
  bk(c, 24, 42, 12, 4, armorDk);
  bk(c, 13, 42, 10, 1, armorLt);
  bk(c, 25, 42, 10, 1, armorLt);

  // Body (ornate dark plate)
  bk(c, 10, 14, 28, 20, armor);
  bk(c, 12, 16, 24, 16, armorLt);
  // Purple accents on plate
  bk(c, 14, 18, 20, 2, purple);
  bk(c, 14, 24, 20, 2, purple);
  bk(c, 14, 30, 20, 2, purple);
  // Gold center emblem
  bk(c, 21, 20, 6, 6, goldDk);
  bk(c, 22, 21, 4, 4, gold);
  px(c, 23, 22, goldLt); px(c, 24, 23, goldLt);
  // Center line
  bk(c, 23, 16, 2, 16, armorDk);

  // Massive pauldrons with gold trim
  bk(c, 2, 10, 14, 10, armor);
  bk(c, 3, 11, 12, 8, armorLt);
  bk(c, 2, 10, 14, 1, gold);
  bk(c, 2, 19, 14, 1, goldDk);
  // Spikes on pauldrons
  bk(c, 4, 6, 3, 5, armorDk);
  bk(c, 5, 5, 2, 3, armorLt);
  bk(c, 10, 7, 3, 4, armorDk);
  bk(c, 11, 6, 2, 3, armorLt);

  bk(c, 32, 10, 14, 10, armor);
  bk(c, 33, 11, 12, 8, armorLt);
  bk(c, 32, 10, 14, 1, gold);
  bk(c, 32, 19, 14, 1, goldDk);
  bk(c, 41, 6, 3, 5, armorDk);
  bk(c, 42, 5, 2, 3, armorLt);
  bk(c, 35, 7, 3, 4, armorDk);
  bk(c, 36, 6, 2, 3, armorLt);

  // Pauldron rivets (gold)
  px(c, 5, 12, gold); px(c, 13, 12, gold);
  px(c, 34, 12, gold); px(c, 42, 12, gold);

  // Arms
  bk(c, 6, 18, 6, 14, armor);
  bk(c, 7, 19, 4, 12, armorLt);
  bk(c, 36, 18, 6, 14, armor);
  bk(c, 37, 19, 4, 12, armorLt);
  // Gauntlets with gold
  bk(c, 5, 30, 8, 4, armorDk);
  bk(c, 35, 30, 8, 4, armorDk);
  bk(c, 5, 30, 8, 1, goldDk);
  bk(c, 35, 30, 8, 1, goldDk);

  // Helmet (larger, more ornate)
  bk(c, 12, 0, 24, 14, armor);
  bk(c, 14, 2, 20, 10, armorLt);
  bk(c, 12, 0, 24, 2, purple); // purple band
  // Visor slit
  bk(c, 16, 6, 16, 4, visor);
  // Purple glow behind visor
  px(c, 18, 7, glow); px(c, 29, 7, glow);
  px(c, 19, 7, glowBr); px(c, 28, 7, glowBr);
  px(c, 20, 8, glow); px(c, 27, 8, glow);

  // THE CROWN — tarnished gold atop the helmet
  bk(c, 14, -2, 20, 4, goldDk);
  bk(c, 15, -1, 18, 2, gold);
  // Crown points
  bk(c, 16, -4, 3, 3, gold); px(c, 17, -5, goldLt);
  bk(c, 22, -4, 4, 3, gold); px(c, 23, -5, goldLt);
  bk(c, 29, -4, 3, 3, gold); px(c, 30, -5, goldLt);
  // Jewel in center crown point
  px(c, 23, -4, '#c02060'); px(c, 24, -4, '#c02060');

  // GREATSWORD (even larger than hollow knight's)
  bk(c, 0, -4, 4, 38, sword);
  bk(c, 0, -4, 4, 2, swordHi);
  bk(c, -1, -2, 1, 10, swordHi); // edge gleam left
  bk(c, 4, -2, 1, 10, swordHi); // edge gleam right
  // Ornate crossguard
  bk(c, -2, 30, 10, 3, goldDk);
  bk(c, -1, 31, 8, 1, gold);
  // Purple grip
  bk(c, 0, 33, 4, 6, purple);
  bk(c, 1, 34, 2, 4, purpleLt);
  // Gold pommel
  bk(c, 0, 39, 4, 3, gold);
  px(c, 1, 40, goldLt);
  // Dark energy on blade
  px(c, 1, 4, glow); px(c, 2, 10, glow); px(c, 1, 18, glow);
  px(c, 3, 8, '#800060'); px(c, 2, 22, '#800060');
}

// ─── BOAR ───────────────────────────────────────────────────

function drawBoar(c: Ctx) {
  const body = '#8a6040';
  const bodyDk = '#6a4828';
  const bodyLt = '#a07850';
  const belly = '#b09068';
  const tusk = '#e0d8c0';
  const eye = '#c02020';
  const nose = '#3a2018';
  const hoof = '#402818';

  // Shadow
  bk(c, 8, 42, 32, 6, 'rgba(0,0,0,0.2)');

  // Tail (short curly)
  bk(c, 38, 22, 3, 3, bodyDk);
  px(c, 40, 21, bodyDk);
  px(c, 41, 22, body);

  // Hind legs (short, sturdy)
  bk(c, 30, 36, 5, 8, bodyDk);
  bk(c, 31, 37, 3, 6, body);
  bk(c, 36, 36, 5, 8, bodyDk);
  bk(c, 37, 37, 3, 6, body);
  // Hooves
  bk(c, 30, 42, 5, 4, hoof);
  bk(c, 36, 42, 5, 4, hoof);

  // Body (squat, barrel-shaped)
  bk(c, 8, 24, 32, 14, body);
  bk(c, 10, 26, 28, 10, bodyLt);
  // Back bristles (darker ridge)
  bk(c, 8, 24, 32, 3, bodyDk);
  // Belly
  bk(c, 12, 35, 22, 3, belly);

  // Front legs (sturdy)
  bk(c, 10, 36, 5, 8, body);
  bk(c, 11, 37, 3, 6, bodyLt);
  bk(c, 16, 36, 5, 8, body);
  bk(c, 17, 37, 3, 6, bodyLt);
  // Front hooves
  bk(c, 10, 42, 5, 4, hoof);
  bk(c, 16, 42, 5, 4, hoof);

  // Neck (thick)
  bk(c, 4, 22, 10, 12, body);
  bk(c, 5, 23, 8, 10, bodyLt);

  // Head (wide, low)
  bk(c, 0, 20, 12, 12, body);
  bk(c, 1, 21, 10, 10, bodyLt);
  // Snout (broad, blunt)
  bk(c, 0, 26, 6, 6, bodyDk);
  bk(c, 0, 27, 5, 4, body);
  // Nose
  bk(c, 0, 27, 3, 3, nose);
  px(c, 1, 28, '#502818');

  // Tusks (curved white)
  bk(c, 0, 30, 2, 5, tusk);
  bk(c, 4, 30, 2, 5, tusk);
  px(c, 0, 34, tusk); px(c, 4, 34, tusk);

  // Eyes (small, angry red)
  bk(c, 3, 22, 2, 2, eye);
  px(c, 3, 22, '#ff3030');

  // Ears (small, pointed)
  bk(c, 4, 16, 3, 5, bodyDk);
  bk(c, 5, 15, 2, 3, body);
  bk(c, 8, 17, 3, 4, bodyDk);
  bk(c, 9, 16, 2, 3, body);

  // Bristle texture on back
  for (let fx = 12; fx < 38; fx += 3) {
    px(c, fx, 25, bodyDk);
    px(c, fx + 1, 24, bodyDk);
  }
}

// ─── BANDIT ─────────────────────────────────────────────────

function drawBandit(c: Ctx) {
  const hood = '#3a4a30';
  const hoodDk = '#2a3820';
  const hoodLt = '#4a5a40';
  const tunic = '#5a4a3a';
  const tunicDk = '#403020';
  const tunicLt = '#6a5a48';
  const skin = '#c0a080';
  const skinDk = '#a08060';
  const pants = '#3a3228';
  const boot = '#2a2018';
  const blade = '#a0a8b0';
  const bladeHi = '#c8d0d8';
  const mask = '#2a2a20';
  const eye = '#c0c8a0';
  const belt = '#806030';

  // Shadow
  bk(c, 14, 44, 20, 4, 'rgba(0,0,0,0.2)');

  // Boots
  bk(c, 16, 42, 6, 4, boot);
  bk(c, 26, 42, 6, 4, boot);
  bk(c, 17, 42, 4, 1, '#3a2818');

  // Legs (dark pants)
  bk(c, 17, 34, 5, 8, pants);
  bk(c, 26, 34, 5, 8, pants);
  bk(c, 18, 35, 3, 6, '#4a4238');

  // Body (tunic)
  bk(c, 14, 16, 20, 18, tunic);
  bk(c, 16, 18, 16, 14, tunicLt);
  // Tunic fold lines
  bk(c, 23, 18, 2, 14, tunicDk);
  bk(c, 18, 20, 1, 10, tunicDk);

  // Belt
  bk(c, 14, 30, 20, 3, belt);
  bk(c, 22, 30, 4, 3, '#a07840'); // buckle

  // Arms
  bk(c, 10, 18, 5, 12, tunic);
  bk(c, 11, 19, 3, 10, tunicLt);
  bk(c, 33, 18, 5, 12, tunic);
  bk(c, 34, 19, 3, 10, tunicLt);
  // Hands (skin)
  bk(c, 10, 28, 5, 4, skin);
  bk(c, 33, 28, 5, 4, skin);

  // Cloak/cape (behind, subtle)
  bk(c, 16, 14, 18, 28, hoodDk);
  bk(c, 18, 16, 14, 24, hood);
  for (let fx = 19; fx < 32; fx += 3) bk(c, fx, 18, 1, 22, hoodDk);

  // Re-draw body over cape
  bk(c, 14, 16, 20, 18, tunic);
  bk(c, 16, 18, 16, 14, tunicLt);
  bk(c, 23, 18, 2, 14, tunicDk);
  bk(c, 14, 30, 20, 3, belt);
  bk(c, 22, 30, 4, 3, '#a07840');

  // Hood
  bk(c, 14, 2, 20, 16, hood);
  bk(c, 16, 4, 16, 12, hoodLt);
  bk(c, 14, 2, 20, 2, hoodLt); // top edge
  // Hood peak
  bk(c, 20, 0, 8, 4, hood);
  bk(c, 22, 0, 4, 2, hoodDk);

  // Face (in shadow of hood)
  bk(c, 18, 6, 12, 10, '#181810');
  // Mask across lower face
  bk(c, 18, 10, 12, 5, mask);
  // Eyes (gleaming in shadow)
  bk(c, 20, 8, 3, 2, eye);
  bk(c, 25, 8, 3, 2, eye);
  px(c, 21, 8, '#e0e8c0'); px(c, 26, 8, '#e0e8c0');

  // DAGGER (left hand, short blade)
  bk(c, 6, 14, 2, 16, blade);
  bk(c, 6, 14, 2, 2, bladeHi); // tip
  px(c, 5, 16, bladeHi); // edge gleam
  bk(c, 5, 28, 4, 2, '#806030'); // crossguard
  bk(c, 6, 30, 2, 4, '#604020'); // grip
}

// ─── CAVE BAT ────────────────────────────────────────────────

function drawCaveBat(c: Ctx) {
  const body = '#3a3040';
  const bodyDk = '#2a2030';
  const bodyLt = '#4a3850';
  const wing = '#302838';
  const wingLt = '#483858';
  const wingEdge = '#201828';
  const eye = '#c02020';
  const eyeBr = '#ff4040';
  const ear = '#4a3850';
  const fang = '#d0d0c0';

  // Shadow (wide, bat is airborne)
  bk(c, 8, 42, 32, 4, 'rgba(0,0,0,0.15)');

  // Left wing — spread wide
  bk(c, 0, 18, 16, 14, wing);
  bk(c, 2, 20, 12, 10, wingLt);
  // Wing membrane lines
  bk(c, 4, 20, 1, 12, wingEdge);
  bk(c, 8, 18, 1, 14, wingEdge);
  bk(c, 12, 20, 1, 10, wingEdge);
  // Wing tip points
  bk(c, 0, 16, 3, 4, wingEdge);
  bk(c, 0, 30, 3, 4, wingEdge);
  bk(c, 6, 14, 3, 6, wing);

  // Right wing
  bk(c, 32, 18, 16, 14, wing);
  bk(c, 34, 20, 12, 10, wingLt);
  bk(c, 36, 20, 1, 12, wingEdge);
  bk(c, 40, 18, 1, 14, wingEdge);
  bk(c, 44, 20, 1, 10, wingEdge);
  bk(c, 45, 16, 3, 4, wingEdge);
  bk(c, 45, 30, 3, 4, wingEdge);
  bk(c, 39, 14, 3, 6, wing);

  // Body (small, round)
  bk(c, 18, 20, 12, 14, body);
  bk(c, 20, 22, 8, 10, bodyLt);

  // Head
  bk(c, 19, 14, 10, 8, body);
  bk(c, 20, 15, 8, 6, bodyLt);

  // Ears (pointed, tall)
  bk(c, 19, 8, 3, 7, ear);
  bk(c, 20, 7, 2, 4, bodyLt);
  bk(c, 26, 8, 3, 7, ear);
  bk(c, 27, 7, 2, 4, bodyLt);

  // Eyes (red, glowing)
  bk(c, 20, 16, 3, 2, eye);
  bk(c, 25, 16, 3, 2, eye);
  px(c, 21, 16, eyeBr);
  px(c, 26, 16, eyeBr);

  // Nose (tiny)
  px(c, 23, 19, bodyDk);
  px(c, 24, 19, bodyDk);

  // Fangs
  px(c, 22, 21, fang);
  px(c, 25, 21, fang);

  // Fur texture on body
  px(c, 20, 24, bodyDk);
  px(c, 26, 26, bodyDk);
  px(c, 22, 28, bodyDk);

  // Small feet (tucked)
  bk(c, 21, 33, 2, 3, bodyDk);
  bk(c, 25, 33, 2, 3, bodyDk);
}

// ─── MINE GOLEM ──────────────────────────────────────────────

function drawMineGolem(c: Ctx) {
  const body = '#606870';
  const bodyDk = '#484e58';
  const bodyLt = '#788088';
  const ore = '#c08030';
  const oreLt = '#e0a040';
  const crack = '#383840';
  const eye = '#e08020';
  const eyeBr = '#ffa030';
  const joint = '#505860';

  // Shadow (large, heavy)
  bk(c, 8, 44, 32, 4, 'rgba(0,0,0,0.3)');

  // Legs (thick, blocky)
  bk(c, 14, 34, 8, 12, body);
  bk(c, 15, 35, 6, 10, bodyLt);
  bk(c, 26, 34, 8, 12, body);
  bk(c, 27, 35, 6, 10, bodyLt);
  // Feet (massive blocks)
  bk(c, 12, 42, 12, 6, bodyDk);
  bk(c, 24, 42, 12, 6, bodyDk);
  bk(c, 13, 42, 10, 2, bodyLt);
  bk(c, 25, 42, 10, 2, bodyLt);
  // Knee joints
  bk(c, 13, 36, 10, 3, joint);
  bk(c, 25, 36, 10, 3, joint);

  // Torso (massive, angular block)
  bk(c, 8, 12, 32, 22, body);
  bk(c, 10, 14, 28, 18, bodyLt);
  // Angular edges
  bk(c, 8, 12, 32, 2, bodyLt);
  bk(c, 8, 32, 32, 2, bodyDk);
  // Center line
  bk(c, 23, 14, 2, 18, bodyDk);

  // Cracks with ore showing through
  bk(c, 14, 18, 6, 2, crack);
  bk(c, 15, 19, 4, 1, ore);
  bk(c, 28, 22, 5, 2, crack);
  bk(c, 29, 23, 3, 1, ore);
  bk(c, 18, 28, 4, 2, crack);
  bk(c, 19, 29, 2, 1, oreLt);
  // Ore veins on surface
  px(c, 12, 16, ore); px(c, 34, 20, ore);
  px(c, 20, 26, oreLt); px(c, 30, 14, ore);

  // Arms (thick, angular)
  bk(c, 2, 14, 8, 18, body);
  bk(c, 3, 15, 6, 16, bodyLt);
  bk(c, 38, 14, 8, 18, body);
  bk(c, 39, 15, 6, 16, bodyLt);
  // Fists (blocky)
  bk(c, 1, 30, 10, 6, bodyDk);
  bk(c, 37, 30, 10, 6, bodyDk);
  bk(c, 2, 30, 8, 2, body);
  bk(c, 38, 30, 8, 2, body);

  // Pauldrons (angular rock)
  bk(c, 4, 10, 12, 6, bodyDk);
  bk(c, 5, 11, 10, 4, body);
  bk(c, 32, 10, 12, 6, bodyDk);
  bk(c, 33, 11, 10, 4, body);

  // Head (blocky, smaller than body)
  bk(c, 16, 2, 16, 12, body);
  bk(c, 17, 3, 14, 10, bodyLt);
  bk(c, 16, 2, 16, 2, bodyLt);

  // Eyes (glowing orange, deep-set)
  bk(c, 19, 6, 4, 3, '#201818');
  bk(c, 27, 6, 4, 3, '#201818');
  bk(c, 20, 7, 2, 2, eye);
  bk(c, 28, 7, 2, 2, eye);
  px(c, 20, 7, eyeBr);
  px(c, 28, 7, eyeBr);

  // Mouth (dark slit)
  bk(c, 20, 11, 8, 2, crack);
}

// ─── BOG LURKER ──────────────────────────────────────────────

function drawBogLurker(c: Ctx) {
  const body = '#304828';
  const bodyDk = '#203018';
  const bodyLt = '#406038';
  const belly = '#486040';
  const slime = '#508040';
  const slimeLt = '#60a050';
  const eye = '#c0c020';
  const eyeBr = '#e0e040';
  const mouth = '#181810';
  const teeth = '#d0d0b0';
  const water = 'rgba(32,48,64,0.5)';

  // Water/mud at base (partially submerged)
  bk(c, 6, 38, 36, 10, water);
  bk(c, 8, 40, 32, 8, 'rgba(24,40,56,0.6)');
  // Ripples
  bk(c, 10, 39, 8, 1, 'rgba(64,80,96,0.4)');
  bk(c, 30, 40, 6, 1, 'rgba(64,80,96,0.4)');

  // Legs (short, thick, partially hidden by water)
  bk(c, 16, 36, 6, 8, body);
  bk(c, 17, 37, 4, 6, bodyLt);
  bk(c, 26, 36, 6, 8, body);
  bk(c, 27, 37, 4, 6, bodyLt);

  // Body (hunched, rounded)
  bk(c, 12, 20, 24, 18, body);
  bk(c, 14, 22, 20, 14, bodyLt);
  // Belly (lighter, bloated)
  bk(c, 16, 28, 16, 8, belly);
  // Back hunch
  bk(c, 14, 18, 20, 6, bodyDk);

  // Long arms (reaching forward, past body)
  bk(c, 4, 22, 10, 4, body);
  bk(c, 2, 24, 6, 4, bodyLt);
  bk(c, 0, 26, 4, 4, body);
  // Clawed hand left
  px(c, 0, 29, bodyDk); px(c, 1, 30, bodyDk); px(c, 3, 29, bodyDk);

  bk(c, 34, 22, 10, 4, body);
  bk(c, 40, 24, 6, 4, bodyLt);
  bk(c, 44, 26, 4, 4, body);
  // Clawed hand right
  px(c, 47, 29, bodyDk); px(c, 46, 30, bodyDk); px(c, 44, 29, bodyDk);

  // Head (wide, flat)
  bk(c, 14, 10, 20, 12, body);
  bk(c, 16, 12, 16, 8, bodyLt);

  // Eyes (wide-set, yellow)
  bk(c, 16, 12, 4, 3, eye);
  bk(c, 28, 12, 4, 3, eye);
  px(c, 17, 13, eyeBr);
  px(c, 29, 13, eyeBr);

  // Wide mouth (gaping)
  bk(c, 16, 18, 16, 4, mouth);
  // Teeth
  px(c, 17, 18, teeth); px(c, 20, 18, teeth); px(c, 23, 18, teeth);
  px(c, 26, 18, teeth); px(c, 29, 18, teeth);
  px(c, 18, 21, teeth); px(c, 22, 21, teeth);
  px(c, 26, 21, teeth);

  // Dripping slime
  px(c, 18, 22, slime); bk(c, 18, 23, 1, 3, slimeLt);
  px(c, 24, 22, slime); bk(c, 24, 23, 1, 2, slimeLt);
  px(c, 30, 20, slime); bk(c, 30, 21, 1, 2, slimeLt);

  // Warts/bumps on skin
  px(c, 14, 24, slime); px(c, 32, 26, slime);
  px(c, 20, 30, bodyDk); px(c, 28, 28, bodyDk);
}

// ─── DROWNED WARDEN ──────────────────────────────────────────

function drawDrownedWarden(c: Ctx) {
  const armor = '#283848';
  const armorDk = '#182030';
  const armorLt = '#384858';
  const rust = '#5a4828';
  const rustLt = '#7a6038';
  const barnacle = '#808878';
  const cape = '#182028';
  const capeLt = '#283038';
  const visor = '#081018';
  const glow = '#4080c0';
  const glowBr = '#60a0e0';
  const sword = '#6878a0';
  const swordHi = '#8898b8';
  const seaweed = '#305030';

  // Shadow (very large)
  bk(c, 6, 44, 36, 4, 'rgba(0,0,0,0.3)');

  // Cape (waterlogged, heavy, behind body)
  bk(c, 16, 12, 24, 34, cape);
  bk(c, 18, 14, 20, 30, capeLt);
  for (let fx = 20; fx < 38; fx += 3) bk(c, fx, 16, 1, 28, cape);
  bk(c, 16, 42, 24, 4, cape);
  // Cape drip lines
  bk(c, 38, 36, 3, 8, cape);
  bk(c, 17, 40, 2, 6, capeLt);

  // Legs (heavy plate, corroded)
  bk(c, 14, 34, 8, 10, armor);
  bk(c, 15, 35, 6, 8, armorLt);
  bk(c, 26, 34, 8, 10, armor);
  bk(c, 27, 35, 6, 8, armorLt);
  // Knee guards
  bk(c, 13, 36, 10, 3, armorDk);
  bk(c, 25, 36, 10, 3, armorDk);
  // Boots (barnacle-encrusted)
  bk(c, 12, 42, 12, 6, armorDk);
  bk(c, 24, 42, 12, 6, armorDk);
  bk(c, 13, 42, 10, 2, armorLt);
  bk(c, 25, 42, 10, 2, armorLt);
  // Barnacles on boots
  px(c, 14, 44, barnacle); px(c, 22, 45, barnacle);
  px(c, 26, 44, barnacle); px(c, 34, 45, barnacle);

  // Body (heavy corroded plate)
  bk(c, 10, 14, 28, 20, armor);
  bk(c, 12, 16, 24, 16, armorLt);
  // Plate bands
  for (let by = 18; by < 32; by += 4) bk(c, 12, by, 24, 1, armorDk);
  // Rust patches
  px(c, 14, 20, rust); px(c, 30, 24, rust); px(c, 18, 28, rustLt);
  px(c, 26, 18, rust); px(c, 20, 22, rustLt);
  // Center line
  bk(c, 23, 16, 2, 16, armorDk);
  // Barnacles on torso
  px(c, 16, 26, barnacle); px(c, 32, 22, barnacle);
  px(c, 12, 18, barnacle); px(c, 28, 30, barnacle);

  // Pauldrons (large, corroded)
  bk(c, 4, 10, 14, 8, armor);
  bk(c, 5, 11, 12, 6, armorLt);
  bk(c, 4, 10, 14, 1, armorLt);
  bk(c, 30, 10, 14, 8, armor);
  bk(c, 31, 11, 12, 6, armorLt);
  bk(c, 30, 10, 14, 1, armorLt);
  // Barnacles on pauldrons
  px(c, 7, 14, barnacle); px(c, 15, 12, barnacle);
  px(c, 33, 14, barnacle); px(c, 41, 12, barnacle);
  // Seaweed draped on shoulder
  bk(c, 6, 16, 2, 6, seaweed);
  bk(c, 40, 16, 2, 5, seaweed);

  // Arms
  bk(c, 6, 16, 6, 16, armor);
  bk(c, 7, 17, 4, 14, armorLt);
  bk(c, 36, 16, 6, 16, armor);
  bk(c, 37, 17, 4, 14, armorLt);
  // Gauntlets
  bk(c, 5, 30, 8, 4, armorDk);
  bk(c, 35, 30, 8, 4, armorDk);

  // Helmet (larger than hollow_knight, corroded)
  bk(c, 12, 0, 24, 14, armor);
  bk(c, 14, 2, 20, 10, armorLt);
  bk(c, 12, 0, 24, 2, armorLt);
  // Visor slit
  bk(c, 16, 6, 16, 4, visor);
  // Blue glow behind visor
  px(c, 18, 7, glow); px(c, 29, 7, glow);
  px(c, 19, 7, glowBr); px(c, 28, 7, glowBr);
  px(c, 20, 8, glow); px(c, 27, 8, glow);
  // Rust on helmet
  px(c, 14, 4, rust); px(c, 32, 6, rust); px(c, 20, 12, rustLt);
  // Barnacles on helmet
  px(c, 16, 2, barnacle); px(c, 30, 4, barnacle); px(c, 24, 0, barnacle);
  // Helmet crest (corroded)
  bk(c, 22, -2, 4, 4, armorDk);
  bk(c, 23, -2, 2, 2, armor);

  // CORRODED GREATSWORD
  bk(c, 0, -2, 3, 36, sword);
  bk(c, 0, -2, 3, 2, swordHi);
  px(c, -1, 0, swordHi);
  // Rust and pitting on blade
  px(c, 1, 6, rust); px(c, 2, 14, rust); px(c, 0, 20, rustLt);
  px(c, 1, 10, armorDk); px(c, 2, 24, armorDk);
  // Barnacles on blade
  px(c, 0, 16, barnacle); px(c, 2, 28, barnacle);
  // Crossguard
  bk(c, -2, 30, 8, 3, armorDk);
  bk(c, -1, 31, 6, 1, armor);
  // Grip (waterlogged)
  bk(c, 0, 33, 3, 6, '#2a3830');
  // Pommel
  bk(c, 0, 39, 3, 3, armorDk);

  // Water drips from armor
  px(c, 10, 32, 'rgba(64,128,192,0.5)');
  px(c, 34, 28, 'rgba(64,128,192,0.5)');
  px(c, 22, 34, 'rgba(64,128,192,0.5)');
}

// ─── OUTLINE ──────────────────────────────────────────────────

function drawOutline(c: Ctx) {
  const d = c.getImageData(0, 0, MW, MH).data;
  const op = (x: number, y: number) => x >= 0 && x < MW && y >= 0 && y < MH && d[(y * MW + x) * 4 + 3] > 20;
  const pts: [number, number][] = [];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++)
    if (!op(x, y) && (op(x-1, y) || op(x+1, y) || op(x, y-1) || op(x, y+1)))
      pts.push([x, y]);
  c.fillStyle = '#0a0808';
  for (const [x, y] of pts) c.fillRect(x, y, 1, 1);
}
