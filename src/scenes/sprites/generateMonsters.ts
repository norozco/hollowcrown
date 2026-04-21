import * as Phaser from 'phaser';

/**
 * Procedural monster sprite generator. Each monster type gets a unique
 * pixel-art shape drawn at 48×48, scaled up in the combat scene.
 *
 * Monster sprites face LEFT (toward the player on the left side).
 * SNES/ALTTP-quality pixel art with 3-4 shade ramps, strong outlines,
 * top-left light source, deliberate pixel placement.
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
    case 'training_dummy': drawTrainingDummy(ctx); break;
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
    case 'fire_elemental': drawFireElemental(ctx); break;
    case 'lava_drake': drawLavaDrake(ctx); break;
    case 'ash_wraith': drawAshWraith(ctx); break;
    case 'ember_knight': drawEmberKnight(ctx); break;
    case 'frost_wolf': drawFrostWolf(ctx); break;
    case 'ice_golem': drawIceGolem(ctx); break;
    case 'blizzard_wraith': drawBlizzardWraith(ctx); break;
    case 'frost_warden': drawFrostWarden(ctx); break;
    case 'crownless_one': drawCrownlessOne(ctx); break;
    case 'the_forgotten': drawTheForgotten(ctx); break;
    default: drawWolf(ctx); break;
  }

  // Outline pass
  drawOutline(ctx);

  const tex = scene.textures.addCanvas(key, canvas);
  if (tex) tex.add(0, 0, 0, 0, MW, MH);
}

// ─── WOLF ─────────────────────────────────────────────────────
// Full wolf profile facing left: pointed snout, erect ears, bushy tail,
// grey fur with 4-shade ramp, yellow eyes, running stance.

function drawWolf(c: Ctx) {
  const dk   = '#404040';
  const mid  = '#606060';
  const lite = '#808080';
  const hi   = '#a0a0a0';
  const belly = '#b0b0a8';
  const eye  = '#d0b020';
  const eyeHi = '#f0d840';
  const pupil = '#181008';
  const nose = '#1a1010';
  const teeth = '#e0e0d0';
  const gum  = '#804040';
  const pawDk = '#383838';

  // ── Ground shadow ──
  bk(c, 8, 44, 32, 4, 'rgba(0,0,0,0.18)');

  // ── Bushy tail (curves up behind) ──
  bk(c, 37, 18, 4, 3, dk);
  bk(c, 38, 16, 4, 4, mid);
  bk(c, 39, 14, 4, 5, lite);
  bk(c, 40, 12, 3, 4, mid);
  px(c, 42, 11, hi);
  px(c, 41, 11, lite);
  // tail tip fur wisps
  px(c, 43, 13, hi);
  px(c, 42, 15, hi);
  // shadow underside
  bk(c, 38, 20, 4, 2, dk);
  px(c, 40, 19, dk);

  // ── Hind legs (running stance — one forward, one back) ──
  // Rear hind leg (further back)
  bk(c, 34, 34, 3, 9, dk);
  bk(c, 35, 35, 2, 7, mid);
  px(c, 36, 36, lite);
  // Rear hind paw
  bk(c, 33, 42, 5, 3, dk);
  bk(c, 34, 42, 3, 2, mid);
  px(c, 34, 42, lite);

  // Front hind leg (closer)
  bk(c, 29, 33, 4, 10, mid);
  bk(c, 30, 34, 2, 8, lite);
  px(c, 30, 34, hi);
  // upper haunch
  bk(c, 28, 30, 6, 5, mid);
  bk(c, 29, 31, 4, 3, lite);
  // Front hind paw
  bk(c, 28, 42, 6, 3, dk);
  bk(c, 29, 42, 4, 2, mid);
  px(c, 29, 42, lite);

  // ── Body (elongated, muscular) ──
  // dark base layer
  bk(c, 9, 22, 30, 14, dk);
  // mid fill
  bk(c, 10, 23, 28, 12, mid);
  // lighter core
  bk(c, 12, 24, 24, 9, lite);
  // highlight ridge along top-left
  bk(c, 10, 22, 16, 2, hi);
  px(c, 12, 24, hi); px(c, 14, 24, hi);
  // back dark line
  bk(c, 9, 22, 30, 2, dk);
  bk(c, 9, 23, 28, 1, mid);
  // belly lighter
  bk(c, 14, 33, 18, 3, belly);
  bk(c, 16, 34, 14, 2, hi);
  // fur texture dithering on back
  for (let fx = 13; fx < 36; fx += 3) {
    px(c, fx, 24, dk);
    px(c, fx + 1, 25, mid);
  }
  // side shading (right/bottom = shadow)
  bk(c, 36, 26, 2, 8, dk);
  bk(c, 35, 28, 1, 6, dk);

  // ── Front legs (running stance) ──
  // Back front leg
  bk(c, 17, 33, 3, 10, dk);
  bk(c, 18, 34, 2, 8, mid);
  px(c, 18, 34, lite);
  bk(c, 16, 42, 5, 3, dk);
  bk(c, 17, 42, 3, 2, mid);

  // Front front leg (extended forward)
  bk(c, 10, 32, 4, 11, mid);
  bk(c, 11, 33, 2, 9, lite);
  px(c, 11, 33, hi);
  bk(c, 9, 42, 6, 3, dk);
  bk(c, 10, 42, 4, 2, mid);
  px(c, 10, 42, lite);
  // claw details on front paw
  px(c, 9, 44, pawDk); px(c, 11, 44, pawDk);

  // ── Neck (muscular, connects head to body) ──
  bk(c, 5, 20, 9, 10, mid);
  bk(c, 6, 21, 7, 8, lite);
  bk(c, 5, 20, 9, 2, dk); // top dark
  bk(c, 5, 20, 2, 4, hi); // left highlight
  // mane/ruff (darker fur along neck top)
  bk(c, 6, 18, 8, 4, dk);
  bk(c, 7, 19, 6, 2, mid);

  // ── Head (angular wolf head facing left) ──
  bk(c, 2, 16, 10, 10, mid);
  bk(c, 3, 17, 8, 8, lite);
  bk(c, 2, 16, 10, 2, hi); // top highlight
  bk(c, 2, 16, 2, 6, hi);  // left highlight
  // forehead shape
  bk(c, 4, 15, 6, 2, mid);
  px(c, 4, 15, hi); px(c, 5, 15, hi);

  // ── Snout (pointed, extends left) ──
  bk(c, 0, 20, 5, 5, mid);
  bk(c, 0, 21, 4, 3, lite);
  bk(c, 0, 20, 3, 1, hi);  // top of snout highlight
  // bridge of nose
  bk(c, 2, 19, 4, 2, mid);
  bk(c, 2, 19, 3, 1, hi);

  // ── Nose (dark tip) ──
  bk(c, 0, 20, 2, 2, nose);
  px(c, 0, 20, '#281818');
  px(c, 1, 20, '#201010');

  // ── Mouth / jaw ──
  bk(c, 0, 24, 7, 2, dk);
  bk(c, 1, 24, 5, 1, mid);
  // teeth (white pixels showing)
  px(c, 1, 24, teeth); px(c, 3, 24, teeth); px(c, 5, 24, teeth);
  // gum line
  px(c, 2, 24, gum); px(c, 4, 24, gum);
  // lower jaw
  bk(c, 2, 25, 5, 1, dk);

  // ── Eyes (yellow, menacing, with pupil) ──
  // eye socket dark surround
  bk(c, 3, 17, 5, 3, dk);
  // eye fill
  bk(c, 4, 17, 3, 2, eye);
  // bright center
  px(c, 5, 17, eyeHi);
  px(c, 4, 18, eye);
  // pupil (dark slit)
  px(c, 5, 18, pupil);
  // eye shine
  px(c, 4, 17, '#f8e860');
  // brow ridge
  bk(c, 3, 16, 5, 1, dk);

  // ── Ears (tall, pointed, erect) ──
  // Left ear (closer to viewer)
  bk(c, 3, 10, 4, 6, dk);
  bk(c, 4, 10, 2, 5, mid);
  px(c, 4, 10, hi);
  px(c, 5, 11, lite);
  // inner ear
  px(c, 5, 12, '#806060');
  px(c, 5, 13, '#806060');

  // Right ear (behind)
  bk(c, 8, 11, 3, 5, dk);
  bk(c, 9, 11, 2, 4, mid);
  px(c, 9, 11, lite);
  px(c, 10, 12, '#706060');

  // ── Fur detail passes ──
  // light dither along left flank
  px(c, 11, 26, hi); px(c, 11, 28, hi);
  px(c, 12, 30, hi);
  // dark guard hairs
  px(c, 20, 23, dk); px(c, 26, 23, dk); px(c, 32, 24, dk);
  // chest fur tuft
  px(c, 8, 28, belly); px(c, 9, 29, belly); px(c, 8, 30, belly);
}

// ─── BOAR ───────────────────────────────────────────────────
// Stocky quadruped: barrel body, short legs, lowered head, tusks.

function drawBoar(c: Ctx) {
  const dk   = '#5a3a1a';
  const mid  = '#7a5a30';
  const lite = '#9a7a48';
  const hi   = '#b89860';
  const belly = '#c0a878';
  const tusk = '#e0dcc0';
  const tuskSh = '#c0b8a0';
  const eye  = '#c04040';
  const eyeBr = '#e05050';
  const nose = '#2a1810';
  const noseLt = '#4a2818';
  const hoof = '#302010';
  const hoofLt = '#483018';
  const bristle = '#4a2a10';

  // Shadow
  bk(c, 6, 43, 34, 5, 'rgba(0,0,0,0.18)');

  // ── Tail (short, curly) ──
  px(c, 40, 21, dk); px(c, 41, 20, mid);
  px(c, 42, 21, mid); px(c, 41, 22, dk);

  // ── Hind legs ──
  bk(c, 31, 35, 4, 9, dk);
  bk(c, 32, 36, 2, 7, mid);
  px(c, 32, 36, lite);
  bk(c, 36, 35, 4, 9, dk);
  bk(c, 37, 36, 2, 7, mid);
  // Hooves
  bk(c, 30, 43, 6, 4, hoof);
  bk(c, 31, 43, 4, 3, hoofLt);
  bk(c, 35, 43, 6, 4, hoof);
  bk(c, 36, 43, 4, 3, hoofLt);

  // ── Body (massive barrel) ──
  bk(c, 8, 23, 32, 14, dk);
  bk(c, 9, 24, 30, 12, mid);
  bk(c, 11, 25, 26, 9, lite);
  // top highlight (light from top-left)
  bk(c, 9, 23, 20, 2, hi);
  bk(c, 8, 24, 4, 4, hi);
  // belly lighter
  bk(c, 14, 34, 20, 3, belly);
  // dark underside shadow
  bk(c, 10, 36, 28, 1, dk);
  // bristly back ridge (spiky dark pixels)
  for (let bx = 10; bx < 38; bx += 2) {
    px(c, bx, 22, bristle);
    px(c, bx, 23, dk);
    if (bx % 4 === 0) px(c, bx, 21, bristle);
  }
  // body fur texture
  for (let fx = 14; fx < 36; fx += 4) {
    px(c, fx, 26, dk);
    px(c, fx + 1, 28, dk);
    px(c, fx + 2, 30, mid);
  }
  // right side shadow
  bk(c, 38, 26, 2, 8, dk);

  // ── Front legs ──
  bk(c, 10, 35, 4, 9, mid);
  bk(c, 11, 36, 2, 7, lite);
  px(c, 11, 36, hi);
  bk(c, 16, 35, 4, 9, mid);
  bk(c, 17, 36, 2, 7, lite);
  // Front hooves
  bk(c, 9, 43, 6, 4, hoof);
  bk(c, 10, 43, 4, 3, hoofLt);
  bk(c, 15, 43, 6, 4, hoof);
  bk(c, 16, 43, 4, 3, hoofLt);

  // ── Thick neck ──
  bk(c, 4, 22, 10, 12, mid);
  bk(c, 5, 23, 8, 10, lite);
  bk(c, 4, 22, 6, 3, hi); // top-left highlight
  // neck muscle shading
  px(c, 12, 28, dk); px(c, 12, 30, dk);

  // ── Head (wide, low, aggressive) ──
  bk(c, 0, 20, 12, 12, dk);
  bk(c, 1, 21, 10, 10, mid);
  bk(c, 2, 22, 8, 8, lite);
  // top-left highlight
  bk(c, 1, 20, 8, 2, hi);
  bk(c, 0, 21, 2, 4, hi);
  // forehead ridge
  bk(c, 2, 19, 8, 2, mid);
  bk(c, 3, 18, 6, 2, dk);

  // ── Snout (broad, blunt) ──
  bk(c, 0, 26, 6, 6, dk);
  bk(c, 0, 27, 5, 4, mid);
  bk(c, 1, 27, 3, 3, lite);
  // Nostrils
  bk(c, 0, 27, 2, 2, nose);
  px(c, 0, 28, noseLt);
  bk(c, 0, 29, 2, 2, nose);
  // snout highlight
  px(c, 1, 26, hi);

  // ── Tusks (curved upward, 4px each) ──
  // Left tusk
  bk(c, 1, 30, 2, 4, tusk);
  px(c, 1, 29, tusk);
  px(c, 0, 29, tuskSh);
  px(c, 2, 33, tuskSh);
  // Right tusk
  bk(c, 5, 30, 2, 4, tusk);
  px(c, 5, 29, tusk);
  px(c, 6, 29, tuskSh);
  px(c, 6, 33, tuskSh);

  // ── Eyes (small, angry red, deep-set) ──
  bk(c, 3, 22, 3, 3, '#181010'); // socket
  bk(c, 3, 22, 2, 2, eye);
  px(c, 3, 22, eyeBr);
  // brow
  bk(c, 2, 21, 4, 1, dk);

  // ── Ears (small, pointed, folded back) ──
  bk(c, 3, 16, 3, 4, dk);
  bk(c, 4, 15, 2, 3, mid);
  px(c, 4, 15, lite);
  bk(c, 7, 17, 3, 3, dk);
  bk(c, 8, 16, 2, 2, mid);
  px(c, 8, 16, lite);
}

// ─── BANDIT ─────────────────────────────────────────────────
// Hooded humanoid, hunched, dagger in hand, face hidden.

function drawBandit(c: Ctx) {
  const hood   = '#3a4a2a';
  const hoodDk = '#2a3820';
  const hoodMd = '#4a5a3a';
  const hoodLt = '#5a6a4a';
  const tunic  = '#5a4a3a';
  const tunicDk= '#3a3020';
  const tunicLt= '#6a5a48';
  const skin   = '#c0a080';
  const skinDk = '#a08060';
  const pants  = '#3a3228';
  const pantsLt= '#4a4238';
  const boot   = '#2a2018';
  const bootLt = '#3a2820';
  const blade  = '#b0b8c0';
  const bladeHi= '#d0d8e0';
  const bladeDk= '#808898';
  const face   = '#101008';
  const eyeL   = '#c0c8a0';
  const eyeR   = '#e0e8c8';
  const belt   = '#705028';
  const beltLt = '#906838';
  const buckle = '#c0a040';

  // Shadow
  bk(c, 14, 44, 20, 4, 'rgba(0,0,0,0.2)');

  // ── Cape/cloak behind body ──
  bk(c, 17, 14, 18, 30, hoodDk);
  bk(c, 19, 16, 14, 26, hood);
  // cloak flow lines
  for (let fx = 20; fx < 34; fx += 3) bk(c, fx, 18, 1, 24, hoodDk);
  // tattered bottom edge
  px(c, 18, 43, hoodDk); px(c, 20, 44, hood);
  px(c, 33, 43, hoodDk); px(c, 31, 44, hood);
  bk(c, 34, 38, 2, 6, hoodDk);

  // ── Boots ──
  bk(c, 16, 42, 6, 5, boot);
  bk(c, 17, 42, 4, 4, bootLt);
  bk(c, 17, 42, 3, 1, '#4a3828'); // highlight
  bk(c, 26, 42, 6, 5, boot);
  bk(c, 27, 42, 4, 4, bootLt);
  bk(c, 27, 42, 3, 1, '#4a3828');

  // ── Legs ──
  bk(c, 17, 34, 5, 8, pants);
  bk(c, 18, 35, 3, 6, pantsLt);
  bk(c, 27, 34, 5, 8, pants);
  bk(c, 28, 35, 3, 6, pantsLt);
  // knee patches
  px(c, 18, 37, tunicDk); px(c, 28, 37, tunicDk);

  // ── Body (tunic) ──
  bk(c, 14, 16, 20, 18, tunic);
  bk(c, 15, 17, 18, 16, tunicLt);
  bk(c, 14, 16, 12, 2, '#6a5a48'); // top-left highlight
  // fold lines
  bk(c, 23, 18, 1, 14, tunicDk);
  bk(c, 18, 20, 1, 10, tunicDk);
  bk(c, 28, 22, 1, 8, tunicDk);
  // shadow right side
  bk(c, 32, 18, 2, 14, tunicDk);

  // ── Belt with pouches ──
  bk(c, 14, 31, 20, 3, belt);
  bk(c, 15, 31, 18, 1, beltLt); // highlight
  // buckle
  bk(c, 22, 31, 4, 3, buckle);
  px(c, 23, 32, '#e0c060');
  // pouches (small brown rectangles on belt)
  bk(c, 15, 32, 3, 2, '#604020');
  px(c, 16, 32, '#705028');
  bk(c, 30, 32, 3, 2, '#604020');
  px(c, 31, 32, '#705028');

  // ── Arms ──
  bk(c, 10, 18, 5, 12, tunic);
  bk(c, 11, 19, 3, 10, tunicLt);
  bk(c, 10, 18, 3, 2, '#6a5a48'); // highlight
  bk(c, 33, 18, 5, 12, tunic);
  bk(c, 34, 19, 3, 10, tunicLt);
  // Hands (skin tone)
  bk(c, 10, 28, 4, 4, skin);
  bk(c, 10, 28, 3, 2, '#d0b090');
  bk(c, 34, 28, 4, 4, skinDk);
  bk(c, 34, 28, 3, 2, skin);

  // ── Hood ──
  bk(c, 14, 2, 20, 16, hood);
  bk(c, 15, 3, 18, 14, hoodMd);
  bk(c, 16, 4, 16, 12, hoodLt);
  // top edge highlight
  bk(c, 14, 2, 14, 2, hoodLt);
  // hood peak
  bk(c, 20, 0, 8, 4, hood);
  bk(c, 22, 0, 4, 2, hoodDk);
  px(c, 22, 0, hoodMd);
  // hood shadow creases
  bk(c, 14, 4, 2, 10, hoodDk);
  bk(c, 32, 4, 2, 10, hoodDk);
  // hood drape over shoulders
  bk(c, 12, 14, 4, 4, hood);
  bk(c, 32, 14, 4, 4, hood);

  // ── Face (deep shadow under hood) ──
  bk(c, 18, 6, 12, 10, face);
  // mask
  bk(c, 18, 10, 12, 5, '#1a1a10');
  bk(c, 19, 11, 10, 3, '#222218');
  // eyes (gleaming)
  bk(c, 20, 8, 3, 2, eyeL);
  px(c, 21, 8, eyeR); // bright center
  bk(c, 25, 8, 3, 2, eyeL);
  px(c, 26, 8, eyeR);
  // eye glow subtle
  px(c, 19, 8, 'rgba(192,200,160,0.3)');
  px(c, 28, 8, 'rgba(192,200,160,0.3)');

  // ── Dagger (in left hand) ──
  // blade (silver, 1px wide, 8px tall)
  bk(c, 7, 14, 2, 16, blade);
  bk(c, 7, 14, 2, 2, bladeHi); // tip highlight
  px(c, 6, 16, bladeHi); // edge gleam
  px(c, 6, 18, bladeHi);
  bk(c, 8, 20, 1, 8, bladeDk); // shadow edge
  // crossguard
  bk(c, 5, 28, 6, 2, '#705028');
  bk(c, 6, 28, 4, 1, beltLt);
  // grip (wrapped leather)
  bk(c, 7, 30, 2, 4, '#4a3020');
  px(c, 7, 31, '#5a3828');
  px(c, 7, 33, '#5a3828');
}

// ─── SKELETON ─────────────────────────────────────────────────
// Standing skeleton with rusty sword, bone color ramp, visible ribcage.

function drawSkeleton(c: Ctx) {
  const bone   = '#d0d0c0';
  const boneMd = '#c0c0b0';
  const boneDk = '#a0a098';
  const boneSh = '#808078';
  const socket = '#181010';
  const glowG  = '#80c080';
  const glowGb = '#a0e0a0';
  const armor  = '#506068';
  const armorLt= '#688080';
  const sword  = '#909898';
  const swordHi= '#c0c8d0';
  const rust   = '#785838';
  const rustLt = '#906840';
  const grip   = '#604020';

  // Shadow
  bk(c, 14, 44, 20, 4, 'rgba(0,0,0,0.2)');

  // ── Feet (bone) ──
  bk(c, 17, 41, 5, 4, boneDk);
  bk(c, 18, 41, 3, 3, bone);
  px(c, 18, 41, '#e0e0d0');
  bk(c, 26, 41, 5, 4, boneDk);
  bk(c, 27, 41, 3, 3, bone);

  // ── Leg bones (thin with joints) ──
  // Left leg
  bk(c, 19, 30, 2, 11, boneDk);
  bk(c, 19, 31, 1, 9, bone);
  // knee joint
  bk(c, 18, 34, 4, 3, boneSh);
  bk(c, 19, 35, 2, 1, boneMd);
  // Right leg
  bk(c, 27, 30, 2, 11, boneDk);
  bk(c, 27, 31, 1, 9, bone);
  bk(c, 26, 34, 4, 3, boneSh);
  bk(c, 27, 35, 2, 1, boneMd);

  // ── Pelvis ──
  bk(c, 16, 28, 16, 4, boneDk);
  bk(c, 17, 28, 14, 2, bone);
  bk(c, 18, 29, 12, 2, boneMd);
  // hip joint details
  px(c, 18, 30, boneSh); px(c, 28, 30, boneSh);

  // ── Ribcage ──
  bk(c, 16, 16, 16, 12, boneDk);
  bk(c, 17, 16, 14, 11, bone);
  // individual rib bones with gaps
  for (let ry = 17; ry < 27; ry += 2) {
    bk(c, 18, ry, 12, 1, socket); // dark gap between ribs
    // rib bone highlight
    bk(c, 18, ry + 1, 12, 1, bone);
    px(c, 18, ry + 1, '#e0e0d0'); // left highlight
  }
  // Spine (center)
  bk(c, 23, 16, 2, 14, boneSh);
  bk(c, 23, 16, 1, 14, boneDk);
  // sternum
  bk(c, 22, 16, 4, 2, boneMd);

  // ── Shoulder armor piece ──
  bk(c, 12, 14, 8, 6, armor);
  bk(c, 13, 14, 6, 4, armorLt);
  bk(c, 12, 14, 8, 1, armorLt);
  // rust on armor
  px(c, 14, 16, rust); px(c, 18, 18, rust);

  // ── Arms (thin bones) ──
  bk(c, 14, 18, 2, 12, boneDk);
  bk(c, 14, 19, 1, 10, bone);
  bk(c, 32, 18, 2, 12, boneDk);
  bk(c, 32, 19, 1, 10, bone);
  // elbow joints
  bk(c, 13, 24, 4, 2, boneSh);
  bk(c, 31, 24, 4, 2, boneSh);
  // Hands (bony claws)
  bk(c, 13, 29, 4, 3, boneSh);
  bk(c, 14, 29, 2, 2, bone);
  // finger bones
  px(c, 12, 31, boneDk); px(c, 14, 31, boneDk); px(c, 16, 31, boneDk);
  bk(c, 31, 29, 4, 3, boneSh);
  bk(c, 32, 29, 2, 2, bone);

  // ── Skull ──
  // cranium
  bk(c, 18, 4, 12, 12, boneDk);
  bk(c, 17, 6, 14, 8, boneDk);
  bk(c, 19, 5, 10, 10, bone);
  bk(c, 20, 5, 8, 8, '#e0e0d0');
  // top highlight
  bk(c, 19, 4, 8, 2, '#e8e8d8');
  // cranium left highlight
  bk(c, 17, 6, 2, 4, bone);
  // Eye sockets (deep, dark)
  bk(c, 20, 7, 3, 3, socket);
  bk(c, 25, 7, 3, 3, socket);
  // Green glow in sockets
  px(c, 21, 8, glowG);
  px(c, 26, 8, glowG);
  px(c, 21, 7, glowGb);
  px(c, 26, 7, glowGb);
  // glow halo around eyes
  px(c, 19, 8, 'rgba(128,192,128,0.3)');
  px(c, 23, 8, 'rgba(128,192,128,0.3)');
  px(c, 24, 8, 'rgba(128,192,128,0.3)');
  px(c, 28, 8, 'rgba(128,192,128,0.3)');
  // Nose hole
  bk(c, 23, 11, 2, 2, socket);
  // Jaw / teeth
  bk(c, 19, 13, 10, 3, boneDk);
  bk(c, 20, 13, 8, 2, bone);
  // individual teeth gaps
  px(c, 21, 14, socket); px(c, 24, 14, socket); px(c, 27, 14, socket);
  // jaw shadow
  bk(c, 19, 15, 10, 1, boneSh);
  // cheekbones
  px(c, 18, 10, boneMd); px(c, 29, 10, boneMd);

  // ── Rusty Sword (in right hand) ──
  // blade
  bk(c, 8, 4, 2, 26, sword);
  bk(c, 8, 4, 2, 1, swordHi); // tip
  bk(c, 7, 5, 1, 6, swordHi); // edge gleam
  // rust on blade
  px(c, 8, 10, rust); px(c, 9, 16, rust); px(c, 8, 22, rustLt);
  // crossguard
  bk(c, 6, 28, 6, 2, rust);
  bk(c, 7, 28, 4, 1, rustLt);
  // grip (worn)
  bk(c, 8, 30, 2, 5, grip);
  px(c, 8, 31, '#705030'); px(c, 8, 33, '#705030');
  // pommel
  bk(c, 7, 34, 4, 2, boneSh);
}

// ─── SPIDER ──────────────────────────────────────────────────
// Wide low body, 8 articulated legs, cluster of red eyes, fangs.

function drawSpider(c: Ctx) {
  const bodyDk = '#2a2a20';
  const bodyMd = '#3a3a2a';
  const bodyLt = '#4a4a3a';
  const bodyHi = '#585848';
  const leg    = '#2e2e20';
  const legMd  = '#3e3e30';
  const legLt  = '#4e4e3e';
  const eye    = '#c02020';
  const eyeBr  = '#ff4040';
  const fang   = '#d0d0c0';
  const fangDk = '#a0a090';
  const mark   = '#5a5a48';

  // Shadow
  bk(c, 4, 43, 40, 4, 'rgba(0,0,0,0.18)');

  // ── 8 Legs with joints ──
  // Front-left leg
  bk(c, 8, 24, 8, 2, leg);
  bk(c, 4, 26, 6, 2, legMd);
  bk(c, 1, 28, 5, 2, leg);
  bk(c, 0, 30, 3, 12, leg);
  px(c, 0, 42, legLt);
  px(c, 4, 26, legLt); // joint highlight

  // Mid-front-left
  bk(c, 10, 28, 6, 2, leg);
  bk(c, 5, 30, 7, 2, legMd);
  bk(c, 2, 32, 5, 2, leg);
  bk(c, 0, 34, 4, 8, leg);
  px(c, 0, 42, legLt);
  px(c, 5, 30, legLt);

  // Mid-rear-left
  bk(c, 12, 32, 6, 2, leg);
  bk(c, 6, 34, 8, 2, legMd);
  bk(c, 3, 36, 5, 2, leg);
  bk(c, 2, 38, 3, 6, leg);
  px(c, 6, 34, legLt);

  // Rear-left
  bk(c, 14, 34, 6, 2, leg);
  bk(c, 8, 36, 8, 2, legMd);
  bk(c, 5, 38, 5, 2, leg);
  bk(c, 4, 40, 3, 4, leg);
  px(c, 8, 36, legLt);

  // Front-right leg
  bk(c, 32, 24, 8, 2, leg);
  bk(c, 38, 26, 6, 2, legMd);
  bk(c, 42, 28, 5, 2, leg);
  bk(c, 45, 30, 3, 12, leg);
  px(c, 47, 42, legLt);
  px(c, 42, 26, legLt);

  // Mid-front-right
  bk(c, 32, 28, 6, 2, leg);
  bk(c, 36, 30, 7, 2, legMd);
  bk(c, 41, 32, 5, 2, leg);
  bk(c, 44, 34, 4, 8, leg);
  px(c, 42, 30, legLt);

  // Mid-rear-right
  bk(c, 30, 32, 6, 2, leg);
  bk(c, 34, 34, 8, 2, legMd);
  bk(c, 40, 36, 5, 2, leg);
  bk(c, 43, 38, 3, 6, leg);
  px(c, 38, 34, legLt);

  // Rear-right
  bk(c, 28, 34, 6, 2, leg);
  bk(c, 32, 36, 8, 2, legMd);
  bk(c, 38, 38, 5, 2, leg);
  bk(c, 41, 40, 3, 4, leg);
  px(c, 36, 36, legLt);

  // ── Abdomen (large, round) ──
  bk(c, 16, 28, 16, 14, bodyDk);
  bk(c, 17, 29, 14, 12, bodyMd);
  bk(c, 18, 30, 12, 10, bodyLt);
  // sheen highlight top
  bk(c, 19, 29, 8, 2, bodyHi);
  px(c, 20, 28, bodyHi);
  // chevron/diamond markings
  px(c, 22, 32, mark); px(c, 25, 32, mark);
  px(c, 21, 34, mark); px(c, 26, 34, mark);
  px(c, 23, 34, bodyDk); px(c, 24, 34, bodyDk);
  px(c, 22, 36, mark); px(c, 25, 36, mark);
  px(c, 23, 38, mark); px(c, 24, 38, mark);
  // dark bottom shadow
  bk(c, 18, 40, 12, 2, bodyDk);

  // ── Cephalothorax (front, smaller) ──
  bk(c, 16, 20, 16, 10, bodyDk);
  bk(c, 17, 21, 14, 8, bodyMd);
  bk(c, 18, 22, 12, 6, bodyLt);
  // top highlight
  bk(c, 18, 20, 8, 2, bodyHi);

  // ── Eyes (cluster of 6 red dots) ──
  // row 1 (top, 2 big eyes)
  bk(c, 19, 20, 2, 2, eye);
  px(c, 19, 20, eyeBr);
  bk(c, 27, 20, 2, 2, eye);
  px(c, 27, 20, eyeBr);
  // row 2 (middle, 2 medium eyes)
  bk(c, 21, 22, 2, 2, eye);
  px(c, 21, 22, eyeBr);
  bk(c, 25, 22, 2, 2, eye);
  px(c, 25, 22, eyeBr);
  // row 3 (bottom, 2 small eyes)
  px(c, 22, 24, eye);
  px(c, 25, 24, eye);

  // ── Fangs (chelicerae) ──
  bk(c, 20, 18, 2, 5, fang);
  bk(c, 26, 18, 2, 5, fang);
  px(c, 20, 22, fangDk);
  px(c, 26, 22, fangDk);
  // fang tips
  px(c, 20, 17, fang);
  px(c, 26, 17, fang);
}

// ─── WRAITH ─────────────────────────────────────────────────
// Floating hooded figure, ethereal blue/purple, glowing eyes, wispy bottom.

function drawWraith(c: Ctx) {
  const dk   = '#1c2840';
  const mid  = '#304060';
  const lite = '#405878';
  const hi   = '#506890';
  const glow = '#80c0ff';
  const glowBr= '#c0e8ff';
  const glowDm= '#4080c0';
  const void_ = '#080810';
  const wisp = 'rgba(48,64,96,0.4)';
  const wispLt= 'rgba(64,88,128,0.3)';

  // ── Ethereal wisps below (floating, no feet) ──
  bk(c, 18, 42, 12, 4, wisp);
  bk(c, 16, 40, 16, 4, wisp);
  bk(c, 20, 44, 8, 4, wispLt);
  // scattered wisp pixels
  px(c, 14, 42, wispLt); px(c, 33, 43, wispLt);
  px(c, 17, 44, wisp); px(c, 30, 42, wisp);
  px(c, 12, 44, 'rgba(48,64,96,0.2)');
  px(c, 35, 44, 'rgba(48,64,96,0.2)');

  // ── Aura glow (lighter pixels around figure) ──
  px(c, 9, 16, 'rgba(80,104,144,0.15)');
  px(c, 38, 16, 'rgba(80,104,144,0.15)');
  px(c, 8, 20, 'rgba(80,104,144,0.12)');
  px(c, 39, 20, 'rgba(80,104,144,0.12)');
  px(c, 13, 38, 'rgba(80,104,144,0.1)');
  px(c, 34, 38, 'rgba(80,104,144,0.1)');

  // ── Cloak body (flowing, tapers) ──
  bk(c, 14, 16, 20, 28, dk);
  bk(c, 15, 17, 18, 26, mid);
  bk(c, 16, 18, 16, 24, lite);
  // flow lines (darker creases)
  for (let fx = 17; fx < 32; fx += 3) bk(c, fx, 20, 1, 22, dk);
  // highlight left edge (light source)
  bk(c, 14, 16, 2, 20, hi);
  // tattered bottom edges
  bk(c, 12, 38, 4, 6, dk);
  bk(c, 32, 38, 4, 6, dk);
  bk(c, 14, 40, 3, 4, mid);
  bk(c, 31, 40, 3, 4, mid);
  // bottom taper points
  px(c, 12, 43, dk); px(c, 35, 43, dk);
  px(c, 15, 44, mid); px(c, 32, 44, mid);

  // ── Cloak shoulders (wider, draped) ──
  bk(c, 10, 14, 28, 6, mid);
  bk(c, 11, 14, 26, 4, lite);
  bk(c, 10, 14, 16, 2, hi); // top-left highlight

  // ── Spectral arms (thin, reaching forward) ──
  // Left arm
  bk(c, 6, 20, 8, 2, dk);
  bk(c, 4, 22, 6, 2, mid);
  bk(c, 2, 24, 4, 2, lite);
  bk(c, 0, 26, 3, 2, mid);
  // ghostly fingers (glowing tips)
  px(c, 0, 26, glowDm);
  px(c, 1, 27, glow);
  px(c, 3, 27, glowDm);
  // arm glow trail
  px(c, 5, 21, 'rgba(128,192,255,0.2)');

  // Right arm
  bk(c, 34, 20, 8, 2, dk);
  bk(c, 38, 22, 6, 2, mid);
  bk(c, 42, 24, 4, 2, lite);
  bk(c, 45, 26, 3, 2, mid);
  px(c, 47, 26, glowDm);
  px(c, 46, 27, glow);
  px(c, 44, 27, glowDm);

  // ── Hood (deep, pointed) ──
  bk(c, 14, 4, 20, 14, mid);
  bk(c, 15, 5, 18, 12, lite);
  bk(c, 16, 6, 16, 10, dk);
  // top edge highlight
  bk(c, 14, 4, 14, 2, hi);
  bk(c, 14, 4, 2, 6, hi);
  // hood peak
  bk(c, 20, 2, 8, 4, mid);
  bk(c, 22, 0, 4, 4, dk);
  px(c, 22, 0, mid);

  // ── Face void (pure darkness inside hood) ──
  bk(c, 18, 8, 12, 6, void_);

  // ── Glowing eyes (brilliant blue with trails) ──
  bk(c, 20, 9, 3, 3, glow);
  bk(c, 25, 9, 3, 3, glow);
  px(c, 21, 10, glowBr);
  px(c, 26, 10, glowBr);
  // bright center
  px(c, 21, 9, '#e0f0ff');
  px(c, 26, 9, '#e0f0ff');
  // eye trails (ghostly streaks extending outward)
  px(c, 19, 10, glowDm);
  px(c, 18, 10, 'rgba(128,192,255,0.4)');
  px(c, 17, 11, 'rgba(128,192,255,0.2)');
  px(c, 28, 10, glowDm);
  px(c, 29, 10, 'rgba(128,192,255,0.4)');
  px(c, 30, 11, 'rgba(128,192,255,0.2)');
  // upward glow
  px(c, 21, 8, 'rgba(128,192,255,0.3)');
  px(c, 26, 8, 'rgba(128,192,255,0.3)');
}

// ─── HOLLOW KNIGHT ────────────────────────────────────────────
// Full armored figure with shield and sword, tattered cape, dark visor.

function drawHollowKnight(c: Ctx) {
  const armDk  = '#404850';
  const armMd  = '#506068';
  const armLt  = '#607078';
  const armHi  = '#708890';
  const rust   = '#785838';
  const capeDk = '#201828';
  const capeMd = '#302838';
  const capeLt = '#403848';
  const visor  = '#080810';
  const swd    = '#8890a0';
  const swdHi  = '#b0b8c8';
  const swdDk  = '#687080';
  const glow   = '#c02030';
  const glowBr = '#e04050';
  const shield = '#485868';
  const shieldLt= '#607880';
  const emblem = '#8898a8';

  // Shadow
  bk(c, 8, 44, 32, 4, 'rgba(0,0,0,0.25)');

  // ── Cape (behind body, tattered) ──
  bk(c, 18, 14, 20, 30, capeDk);
  bk(c, 20, 16, 16, 26, capeMd);
  bk(c, 22, 18, 12, 22, capeLt);
  for (let fx = 22; fx < 36; fx += 3) bk(c, fx, 18, 1, 24, capeDk);
  // tattered bottom
  bk(c, 18, 42, 20, 3, capeDk);
  bk(c, 36, 38, 3, 6, capeDk);
  px(c, 19, 44, capeMd); px(c, 22, 44, capeDk);
  px(c, 35, 44, capeMd); px(c, 37, 43, capeDk);

  // ── Legs (armored) ──
  bk(c, 16, 34, 6, 10, armMd);
  bk(c, 17, 35, 4, 8, armLt);
  bk(c, 17, 35, 2, 3, armHi); // highlight
  bk(c, 26, 34, 6, 10, armMd);
  bk(c, 27, 35, 4, 8, armLt);
  bk(c, 27, 35, 2, 3, armHi);
  // Knee guards
  bk(c, 15, 36, 8, 3, armDk);
  bk(c, 16, 36, 6, 1, armMd);
  bk(c, 25, 36, 8, 3, armDk);
  bk(c, 26, 36, 6, 1, armMd);
  // Armored boots
  bk(c, 14, 42, 10, 4, armDk);
  bk(c, 15, 42, 8, 1, armLt);
  bk(c, 15, 42, 4, 1, armHi);
  bk(c, 24, 42, 10, 4, armDk);
  bk(c, 25, 42, 8, 1, armLt);
  bk(c, 25, 42, 4, 1, armHi);

  // ── Body (heavy plate) ──
  bk(c, 12, 16, 24, 18, armMd);
  bk(c, 13, 17, 22, 16, armLt);
  bk(c, 14, 18, 20, 14, armHi);
  // plate bands
  for (let by = 20; by < 32; by += 4) {
    bk(c, 14, by, 20, 1, armDk);
  }
  // center line
  bk(c, 23, 18, 2, 14, armDk);
  // rust spots
  px(c, 16, 22, rust); px(c, 28, 26, rust); px(c, 20, 30, rust);
  // top-left highlight
  bk(c, 12, 16, 12, 2, armHi);
  // right shadow
  bk(c, 34, 18, 2, 14, armDk);

  // ── Pauldrons ──
  bk(c, 6, 12, 12, 8, armMd);
  bk(c, 7, 13, 10, 6, armLt);
  bk(c, 8, 13, 8, 4, armHi);
  bk(c, 6, 12, 12, 1, armHi);
  bk(c, 30, 12, 12, 8, armMd);
  bk(c, 31, 13, 10, 6, armLt);
  bk(c, 32, 13, 8, 4, armHi);
  bk(c, 30, 12, 12, 1, armHi);
  // rivets
  px(c, 8, 14, '#90a0a8'); px(c, 15, 14, '#90a0a8');
  px(c, 32, 14, '#90a0a8'); px(c, 39, 14, '#90a0a8');

  // ── Arms ──
  bk(c, 8, 18, 5, 14, armMd);
  bk(c, 9, 19, 3, 12, armLt);
  bk(c, 9, 19, 2, 4, armHi);
  bk(c, 35, 18, 5, 14, armMd);
  bk(c, 36, 19, 3, 12, armLt);
  // Gauntlets
  bk(c, 7, 30, 7, 4, armDk);
  bk(c, 8, 30, 5, 2, armMd);
  bk(c, 34, 30, 7, 4, armDk);
  bk(c, 35, 30, 5, 2, armMd);

  // ── Helmet ──
  bk(c, 14, 2, 20, 14, armMd);
  bk(c, 15, 3, 18, 12, armLt);
  bk(c, 16, 4, 16, 10, armHi);
  bk(c, 14, 2, 14, 2, armHi); // top-left highlight
  // Visor slit
  bk(c, 18, 8, 12, 3, visor);
  // Red glow behind visor
  px(c, 20, 9, glow); px(c, 27, 9, glow);
  px(c, 21, 9, glowBr); px(c, 26, 9, glowBr);
  // subtle glow spread
  px(c, 19, 9, 'rgba(192,32,48,0.3)');
  px(c, 28, 9, 'rgba(192,32,48,0.3)');
  // Helmet crest
  bk(c, 22, 0, 4, 4, armDk);
  bk(c, 23, 0, 2, 3, armMd);
  px(c, 23, 0, armHi);

  // ── Shield (round, held in left hand, with emblem) ──
  bk(c, 34, 20, 10, 12, shield);
  bk(c, 35, 21, 8, 10, shieldLt);
  bk(c, 36, 22, 6, 8, shield);
  // shield rim highlight
  bk(c, 34, 20, 10, 1, armHi);
  bk(c, 34, 20, 1, 6, armHi);
  // emblem (crown/cross shape)
  // vertical bar
  bk(c, 38, 23, 2, 6, emblem);
  // horizontal bar
  bk(c, 36, 25, 6, 2, emblem);
  // center bright
  px(c, 38, 25, '#a0b0c0');
  px(c, 39, 26, '#a0b0c0');

  // ── Greatsword (in right hand) ──
  bk(c, 2, 0, 3, 32, swd);
  bk(c, 2, 0, 3, 2, swdHi); // tip
  bk(c, 1, 0, 1, 8, swdHi); // edge gleam
  bk(c, 5, 4, 1, 6, swdDk); // shadow edge
  // crossguard
  bk(c, 0, 30, 7, 3, '#706038');
  bk(c, 1, 30, 5, 1, '#907848');
  // grip
  bk(c, 1, 33, 5, 6, '#503820');
  px(c, 2, 34, '#604828'); px(c, 2, 36, '#604828');
  // pommel
  bk(c, 2, 38, 3, 3, '#706038');
  px(c, 3, 39, '#907848');
  // blood on blade
  px(c, 3, 8, '#802020'); px(c, 3, 14, '#802020');
}

// ─── HOLLOW KING ─────────────────────────────────────────────
// Large imposing armored figure with crown, massive greatsword, dark energy.

function drawHollowKing(c: Ctx) {
  const armDk  = '#201830';
  const armMd  = '#302848';
  const armLt  = '#403860';
  const armHi  = '#504870';
  const purp   = '#503878';
  const purpLt = '#685090';
  const gold   = '#c0a040';
  const goldDk = '#907020';
  const goldLt = '#e0c860';
  const goldHi = '#f0d870';
  const capeDk = '#100818';
  const capeMd = '#180c28';
  const capeLt = '#281840';
  const visor  = '#060010';
  const glow   = '#a020c0';
  const glowBr = '#d050f0';
  const glowDm = '#801098';
  const swd    = '#8888a0';
  const swdHi  = '#b0b0c8';
  const swdDk  = '#686880';
  const jewel  = '#c02060';
  const jewelBr= '#e04080';

  // Shadow
  bk(c, 4, 44, 40, 4, 'rgba(0,0,0,0.3)');

  // ── Dark energy wisps ──
  px(c, 6, 8, 'rgba(160,32,192,0.2)');
  px(c, 42, 12, 'rgba(160,32,192,0.2)');
  px(c, 8, 32, 'rgba(160,32,192,0.15)');
  px(c, 44, 28, 'rgba(160,32,192,0.15)');
  px(c, 10, 40, 'rgba(128,16,152,0.1)');
  px(c, 40, 38, 'rgba(128,16,152,0.1)');

  // ── Cape (massive, behind body) ──
  bk(c, 14, 10, 28, 36, capeDk);
  bk(c, 16, 12, 24, 32, capeMd);
  bk(c, 18, 14, 20, 28, capeLt);
  for (let fx = 18; fx < 40; fx += 3) bk(c, fx, 14, 1, 30, capeDk);
  bk(c, 14, 42, 28, 4, capeDk);
  bk(c, 40, 34, 4, 12, capeDk);
  // cape bottom tatter
  px(c, 15, 45, capeMd); px(c, 18, 46, capeDk);
  px(c, 38, 45, capeMd); px(c, 40, 45, capeDk);

  // ── Legs (heavy ornate plate) ──
  bk(c, 14, 34, 8, 10, armMd);
  bk(c, 15, 35, 6, 8, armLt);
  bk(c, 15, 35, 3, 4, armHi);
  bk(c, 26, 34, 8, 10, armMd);
  bk(c, 27, 35, 6, 8, armLt);
  bk(c, 27, 35, 3, 4, armHi);
  // Gold trim knee guards
  bk(c, 13, 36, 10, 3, armDk);
  bk(c, 13, 36, 10, 1, goldDk);
  bk(c, 14, 36, 6, 1, gold);
  bk(c, 25, 36, 10, 3, armDk);
  bk(c, 25, 36, 10, 1, goldDk);
  bk(c, 26, 36, 6, 1, gold);
  // Boots
  bk(c, 12, 42, 12, 4, armDk);
  bk(c, 13, 42, 10, 1, armLt);
  bk(c, 13, 42, 5, 1, armHi);
  bk(c, 24, 42, 12, 4, armDk);
  bk(c, 25, 42, 10, 1, armLt);
  bk(c, 25, 42, 5, 1, armHi);

  // ── Body (ornate dark plate) ──
  bk(c, 10, 14, 28, 20, armMd);
  bk(c, 11, 15, 26, 18, armLt);
  bk(c, 12, 16, 24, 16, armHi);
  // purple accent bands
  bk(c, 14, 18, 20, 2, purp);
  bk(c, 15, 18, 12, 1, purpLt);
  bk(c, 14, 24, 20, 2, purp);
  bk(c, 15, 24, 12, 1, purpLt);
  bk(c, 14, 30, 20, 2, purp);
  // gold center emblem
  bk(c, 21, 20, 6, 6, goldDk);
  bk(c, 22, 21, 4, 4, gold);
  px(c, 23, 22, goldLt); px(c, 24, 22, goldHi);
  px(c, 23, 23, gold);
  // center line
  bk(c, 23, 16, 2, 16, armDk);
  // top-left highlight
  bk(c, 10, 14, 14, 2, armHi);
  // right shadow
  bk(c, 36, 16, 2, 16, armDk);

  // ── Massive pauldrons with gold trim and spikes ──
  bk(c, 2, 10, 14, 10, armMd);
  bk(c, 3, 11, 12, 8, armLt);
  bk(c, 4, 12, 10, 6, armHi);
  bk(c, 2, 10, 14, 1, gold);
  bk(c, 3, 10, 8, 1, goldLt);
  bk(c, 2, 19, 14, 1, goldDk);
  // spikes
  bk(c, 4, 6, 3, 5, armDk);
  bk(c, 5, 5, 2, 3, armMd);
  px(c, 5, 4, armHi);
  bk(c, 10, 7, 3, 4, armDk);
  bk(c, 11, 6, 2, 3, armMd);
  px(c, 11, 5, armHi);

  bk(c, 32, 10, 14, 10, armMd);
  bk(c, 33, 11, 12, 8, armLt);
  bk(c, 34, 12, 10, 6, armHi);
  bk(c, 32, 10, 14, 1, gold);
  bk(c, 33, 10, 8, 1, goldLt);
  bk(c, 32, 19, 14, 1, goldDk);
  bk(c, 41, 6, 3, 5, armDk);
  bk(c, 42, 5, 2, 3, armMd);
  px(c, 42, 4, armHi);
  bk(c, 35, 7, 3, 4, armDk);
  bk(c, 36, 6, 2, 3, armMd);
  px(c, 36, 5, armHi);
  // gold rivets
  px(c, 5, 12, gold); px(c, 13, 12, gold);
  px(c, 34, 12, gold); px(c, 42, 12, gold);

  // ── Arms ──
  bk(c, 6, 18, 6, 14, armMd);
  bk(c, 7, 19, 4, 12, armLt);
  bk(c, 7, 19, 2, 6, armHi);
  bk(c, 36, 18, 6, 14, armMd);
  bk(c, 37, 19, 4, 12, armLt);
  // Gauntlets with gold
  bk(c, 5, 30, 8, 4, armDk);
  bk(c, 6, 30, 6, 2, armMd);
  bk(c, 5, 30, 8, 1, goldDk);
  bk(c, 6, 30, 4, 1, gold);
  bk(c, 35, 30, 8, 4, armDk);
  bk(c, 36, 30, 6, 2, armMd);
  bk(c, 35, 30, 8, 1, goldDk);
  bk(c, 36, 30, 4, 1, gold);

  // ── Helmet (ornate, larger) ──
  bk(c, 12, 0, 24, 14, armMd);
  bk(c, 13, 1, 22, 12, armLt);
  bk(c, 14, 2, 20, 10, armHi);
  bk(c, 12, 0, 16, 2, armHi); // top-left highlight
  // purple band
  bk(c, 12, 0, 24, 2, purp);
  bk(c, 13, 0, 14, 1, purpLt);
  // Visor slit
  bk(c, 16, 6, 16, 4, visor);
  // Purple/red glow behind visor
  px(c, 18, 7, glow); px(c, 29, 7, glow);
  px(c, 19, 7, glowBr); px(c, 28, 7, glowBr);
  px(c, 20, 8, glow); px(c, 27, 8, glow);
  // glow spread
  px(c, 17, 7, glowDm); px(c, 30, 7, glowDm);
  px(c, 19, 6, 'rgba(160,32,192,0.3)');
  px(c, 28, 6, 'rgba(160,32,192,0.3)');

  // ── THE CROWN (tarnished gold, 3 points) ──
  bk(c, 14, -2, 20, 4, goldDk);
  bk(c, 15, -1, 18, 2, gold);
  bk(c, 16, -1, 10, 1, goldLt);
  // Crown points
  bk(c, 16, -5, 3, 4, goldDk);
  bk(c, 17, -5, 2, 2, gold);
  px(c, 17, -5, goldLt);
  bk(c, 22, -5, 4, 4, goldDk);
  bk(c, 23, -5, 2, 2, gold);
  px(c, 23, -5, goldHi);
  bk(c, 29, -5, 3, 4, goldDk);
  bk(c, 30, -5, 2, 2, gold);
  px(c, 30, -5, goldLt);
  // Jewel in center crown point
  px(c, 23, -4, jewel); px(c, 24, -4, jewel);
  px(c, 24, -3, jewelBr);

  // ── Greatsword (massive, dark energy) ──
  bk(c, 0, -4, 4, 38, swd);
  bk(c, 0, -4, 4, 2, swdHi); // tip
  bk(c, -1, -2, 1, 10, swdHi); // edge gleam left
  bk(c, 4, -2, 1, 10, swdHi); // edge gleam right
  bk(c, 4, 10, 1, 20, swdDk); // shadow edge
  // Ornate crossguard (gold)
  bk(c, -2, 30, 10, 3, goldDk);
  bk(c, -1, 31, 8, 1, gold);
  px(c, 0, 30, goldLt);
  // Purple grip
  bk(c, 0, 33, 4, 6, purp);
  bk(c, 1, 34, 2, 4, purpLt);
  // Gold pommel
  bk(c, 0, 39, 4, 3, gold);
  px(c, 1, 40, goldLt);
  // Dark energy on blade
  px(c, 1, 4, glow); px(c, 2, 10, glow); px(c, 1, 18, glow);
  px(c, 3, 8, glowDm); px(c, 2, 22, glowDm);
  px(c, 1, 14, 'rgba(160,32,192,0.4)');
  px(c, 3, 26, 'rgba(160,32,192,0.3)');
}

// ─── CAVE BAT ────────────────────────────────────────────────
// Small body, huge wingspan, dark purple/grey, red eyes, fangs.

function drawCaveBat(c: Ctx) {
  const bodyDk = '#2a2030';
  const bodyMd = '#3a3040';
  const bodyLt = '#4a3850';
  const bodyHi = '#584860';
  const wingDk = '#201828';
  const wingMd = '#302838';
  const wingLt = '#403848';
  const wingHi = '#484858';
  const membr  = '#382840';
  const membrLt= '#483848';
  const eye    = '#c02020';
  const eyeBr  = '#ff4040';
  const ear    = '#4a3850';
  const earLt  = '#584860';
  const fang   = '#d0d0c0';

  // Shadow (airborne)
  bk(c, 10, 43, 28, 4, 'rgba(0,0,0,0.12)');

  // ── Left wing ──
  // wing bone structure (finger bones)
  bk(c, 8, 18, 1, 14, wingDk); // main bone
  bk(c, 4, 16, 1, 16, wingDk); // outer bone
  bk(c, 12, 20, 1, 10, wingDk); // inner bone
  bk(c, 0, 14, 1, 18, wingDk); // tip bone
  // membrane between bones
  bk(c, 1, 16, 3, 14, membr);
  bk(c, 5, 18, 3, 12, membrLt);
  bk(c, 9, 20, 3, 10, membr);
  bk(c, 13, 22, 3, 8, membrLt);
  // wing top edge (lighter)
  bk(c, 0, 14, 16, 2, wingMd);
  bk(c, 2, 14, 8, 1, wingLt);
  // wing tip points
  bk(c, 0, 14, 2, 3, wingDk);
  px(c, 0, 13, wingDk);
  // wing bottom scallop
  bk(c, 0, 30, 3, 3, wingDk);
  bk(c, 4, 31, 2, 2, wingDk);
  bk(c, 8, 30, 2, 3, wingDk);
  // highlight on membrane
  px(c, 3, 18, wingHi); px(c, 7, 20, wingHi);

  // ── Right wing ──
  bk(c, 39, 18, 1, 14, wingDk);
  bk(c, 43, 16, 1, 16, wingDk);
  bk(c, 35, 20, 1, 10, wingDk);
  bk(c, 47, 14, 1, 18, wingDk);
  bk(c, 44, 16, 3, 14, membr);
  bk(c, 40, 18, 3, 12, membrLt);
  bk(c, 36, 20, 3, 10, membr);
  bk(c, 32, 22, 3, 8, membrLt);
  bk(c, 32, 14, 16, 2, wingMd);
  bk(c, 38, 14, 8, 1, wingLt);
  bk(c, 46, 14, 2, 3, wingDk);
  px(c, 47, 13, wingDk);
  bk(c, 45, 30, 3, 3, wingDk);
  bk(c, 42, 31, 2, 2, wingDk);
  bk(c, 38, 30, 2, 3, wingDk);

  // ── Body (small, compact) ──
  bk(c, 18, 20, 12, 14, bodyDk);
  bk(c, 19, 21, 10, 12, bodyMd);
  bk(c, 20, 22, 8, 10, bodyLt);
  // highlight top-left
  bk(c, 19, 20, 6, 2, bodyHi);
  // belly lighter
  bk(c, 21, 28, 6, 4, bodyHi);
  // fur texture
  px(c, 20, 24, bodyDk); px(c, 26, 26, bodyDk);
  px(c, 22, 28, bodyDk); px(c, 24, 24, bodyDk);

  // ── Head ──
  bk(c, 19, 14, 10, 8, bodyDk);
  bk(c, 20, 15, 8, 6, bodyMd);
  bk(c, 21, 15, 6, 5, bodyLt);
  bk(c, 20, 14, 6, 2, bodyHi); // forehead highlight

  // ── Ears (tall, pointed) ──
  bk(c, 19, 8, 3, 7, ear);
  bk(c, 20, 7, 2, 5, earLt);
  px(c, 20, 6, bodyHi);
  // inner ear
  px(c, 21, 9, '#604858');
  bk(c, 26, 8, 3, 7, ear);
  bk(c, 27, 7, 2, 5, earLt);
  px(c, 27, 6, bodyHi);
  px(c, 27, 9, '#604858');

  // ── Eyes (red, glowing) ──
  bk(c, 20, 16, 3, 2, '#181010'); // socket
  bk(c, 21, 16, 2, 2, eye);
  px(c, 21, 16, eyeBr);
  bk(c, 25, 16, 3, 2, '#181010');
  bk(c, 25, 16, 2, 2, eye);
  px(c, 25, 16, eyeBr);
  // glow
  px(c, 19, 16, 'rgba(192,32,32,0.3)');
  px(c, 28, 16, 'rgba(192,32,32,0.3)');

  // ── Nose ──
  px(c, 23, 19, bodyDk); px(c, 24, 19, bodyDk);

  // ── Open mouth with fangs ──
  bk(c, 22, 20, 4, 2, '#181010');
  // fangs
  px(c, 22, 21, fang); px(c, 25, 21, fang);
  px(c, 23, 22, fang); px(c, 24, 22, fang);

  // ── Small tucked feet ──
  bk(c, 21, 33, 2, 3, bodyDk);
  px(c, 21, 35, '#1a1020'); // claw
  bk(c, 25, 33, 2, 3, bodyDk);
  px(c, 25, 35, '#1a1020');
}

// ─── MINE GOLEM ──────────────────────────────────────────────
// Blocky humanoid made of rock/iron with glowing ore cracks.

function drawMineGolem(c: Ctx) {
  const rkDk  = '#484848';
  const rkMd  = '#606060';
  const rkLt  = '#787878';
  const rkHi  = '#909090';
  const crack = '#303030';
  const oreDk = '#a06820';
  const oreMd = '#c08030';
  const oreLt = '#e0a040';
  const oreHi = '#f0c060';
  const eyeDk = '#c06010';
  const eye   = '#e08020';
  const eyeBr = '#ffa030';
  const joint = '#404848';
  const crystal= '#40a0c0';
  const crystHi= '#60c0e0';

  // Shadow
  bk(c, 8, 44, 32, 4, 'rgba(0,0,0,0.3)');

  // ── Legs (thick, blocky) ──
  bk(c, 14, 34, 8, 12, rkDk);
  bk(c, 15, 35, 6, 10, rkMd);
  bk(c, 16, 36, 4, 8, rkLt);
  bk(c, 15, 35, 3, 4, rkHi);
  bk(c, 26, 34, 8, 12, rkDk);
  bk(c, 27, 35, 6, 10, rkMd);
  bk(c, 28, 36, 4, 8, rkLt);
  bk(c, 27, 35, 3, 4, rkHi);
  // Massive feet
  bk(c, 12, 43, 12, 5, rkDk);
  bk(c, 13, 43, 10, 2, rkMd);
  bk(c, 13, 43, 6, 1, rkHi);
  bk(c, 24, 43, 12, 5, rkDk);
  bk(c, 25, 43, 10, 2, rkMd);
  bk(c, 25, 43, 6, 1, rkHi);
  // Knee joints
  bk(c, 13, 36, 10, 3, joint);
  bk(c, 14, 37, 8, 1, rkDk);
  bk(c, 25, 36, 10, 3, joint);
  bk(c, 26, 37, 8, 1, rkDk);

  // ── Torso (massive angular block) ──
  bk(c, 8, 12, 32, 22, rkDk);
  bk(c, 9, 13, 30, 20, rkMd);
  bk(c, 10, 14, 28, 18, rkLt);
  // angular highlights (top-left)
  bk(c, 8, 12, 20, 2, rkHi);
  bk(c, 8, 12, 4, 10, rkHi);
  // bottom shadow
  bk(c, 8, 32, 32, 2, rkDk);
  // right shadow
  bk(c, 38, 14, 2, 18, rkDk);
  // center line
  bk(c, 23, 14, 2, 18, crack);

  // Ore cracks with inner glow
  bk(c, 14, 18, 7, 2, crack);
  bk(c, 15, 19, 5, 1, oreDk);
  bk(c, 16, 19, 3, 1, oreMd);
  px(c, 17, 19, oreLt);

  bk(c, 28, 22, 6, 2, crack);
  bk(c, 29, 23, 4, 1, oreDk);
  bk(c, 30, 23, 2, 1, oreMd);
  px(c, 31, 23, oreLt);

  bk(c, 18, 28, 5, 2, crack);
  bk(c, 19, 29, 3, 1, oreDk);
  px(c, 20, 29, oreHi);

  // scattered ore veins
  px(c, 12, 16, oreMd); px(c, 34, 20, oreDk);
  px(c, 20, 26, oreLt); px(c, 30, 14, oreDk);
  px(c, 16, 30, oreMd);

  // ── Arms (thick, heavy) ──
  bk(c, 2, 14, 8, 18, rkDk);
  bk(c, 3, 15, 6, 16, rkMd);
  bk(c, 4, 16, 4, 14, rkLt);
  bk(c, 3, 14, 4, 4, rkHi); // highlight
  bk(c, 38, 14, 8, 18, rkDk);
  bk(c, 39, 15, 6, 16, rkMd);
  bk(c, 40, 16, 4, 14, rkLt);

  // ── Massive fists (disproportionately large) ──
  bk(c, 0, 30, 12, 8, rkDk);
  bk(c, 1, 31, 10, 6, rkMd);
  bk(c, 2, 31, 8, 4, rkLt);
  bk(c, 1, 30, 6, 2, rkHi); // highlight
  // finger grooves
  px(c, 2, 36, crack); px(c, 5, 36, crack); px(c, 8, 36, crack);

  bk(c, 36, 30, 12, 8, rkDk);
  bk(c, 37, 31, 10, 6, rkMd);
  bk(c, 38, 31, 8, 4, rkLt);
  px(c, 38, 36, crack); px(c, 41, 36, crack); px(c, 44, 36, crack);

  // ── Pauldrons (angular boulders) ──
  bk(c, 4, 10, 12, 6, rkDk);
  bk(c, 5, 10, 10, 4, rkMd);
  bk(c, 6, 10, 8, 2, rkHi);
  bk(c, 32, 10, 12, 6, rkDk);
  bk(c, 33, 10, 10, 4, rkMd);
  bk(c, 34, 10, 8, 2, rkHi);

  // ── Ore crystals on shoulders ──
  // left shoulder
  bk(c, 6, 8, 3, 4, crystal);
  px(c, 7, 7, crystHi);
  px(c, 7, 8, crystHi);
  bk(c, 11, 9, 2, 3, crystal);
  px(c, 11, 8, crystHi);
  // right shoulder
  bk(c, 39, 8, 3, 4, crystal);
  px(c, 40, 7, crystHi);
  bk(c, 34, 9, 2, 3, crystal);
  px(c, 34, 8, crystHi);

  // ── Head (small, blocky) ──
  bk(c, 16, 2, 16, 12, rkDk);
  bk(c, 17, 3, 14, 10, rkMd);
  bk(c, 18, 4, 12, 8, rkLt);
  bk(c, 17, 2, 10, 2, rkHi); // top highlight
  bk(c, 16, 3, 2, 4, rkHi); // left highlight

  // ── Eyes (deep-set, glowing orange) ──
  bk(c, 19, 6, 4, 3, '#181010'); // socket left
  bk(c, 20, 7, 2, 2, eyeDk);
  px(c, 20, 7, eye);
  px(c, 21, 7, eyeBr);
  bk(c, 27, 6, 4, 3, '#181010'); // socket right
  bk(c, 28, 7, 2, 2, eyeDk);
  px(c, 28, 7, eye);
  px(c, 29, 7, eyeBr);
  // eye glow
  px(c, 18, 7, 'rgba(224,128,32,0.3)');
  px(c, 23, 7, 'rgba(224,128,32,0.3)');
  px(c, 26, 7, 'rgba(224,128,32,0.3)');
  px(c, 31, 7, 'rgba(224,128,32,0.3)');

  // ── Mouth (dark slit) ──
  bk(c, 20, 11, 8, 2, crack);
  bk(c, 21, 11, 6, 1, '#202020');
  // inner glow in mouth
  px(c, 23, 11, oreDk); px(c, 25, 11, oreDk);
}

// ─── BOG LURKER ──────────────────────────────────────────────
// Hunched amphibian creature, partially submerged, wide mouth, webbed hands.

function drawBogLurker(c: Ctx) {
  const dk   = '#1a3018';
  const mid  = '#2a4828';
  const lite = '#3a6038';
  const hi   = '#4a7848';
  const belly = '#486848';
  const bellyLt= '#588858';
  const slime = '#508040';
  const slimeLt= '#60a050';
  const eyeDk = '#808010';
  const eye   = '#c0c020';
  const eyeBr = '#e0e040';
  const mouth = '#101008';
  const teeth = '#d0d0b0';
  const teethDk= '#b0b090';
  const water = 'rgba(32,48,64,0.5)';
  const waterLt= 'rgba(48,64,80,0.4)';
  const wart  = '#3a5030';

  // ── Water/mud at base ──
  bk(c, 4, 38, 40, 10, water);
  bk(c, 6, 40, 36, 8, 'rgba(24,40,56,0.6)');
  // ripples
  bk(c, 8, 38, 10, 1, waterLt);
  bk(c, 28, 39, 8, 1, waterLt);
  bk(c, 14, 40, 6, 1, waterLt);

  // ── Legs (partially hidden by water) ──
  bk(c, 16, 36, 6, 8, dk);
  bk(c, 17, 37, 4, 6, mid);
  bk(c, 17, 37, 2, 3, lite);
  bk(c, 26, 36, 6, 8, dk);
  bk(c, 27, 37, 4, 6, mid);
  bk(c, 27, 37, 2, 3, lite);
  // webbed feet (visible at waterline)
  bk(c, 14, 42, 4, 2, dk);
  px(c, 13, 42, mid); // web
  bk(c, 24, 42, 4, 2, dk);

  // ── Body (hunched, rounded, bulky) ──
  bk(c, 12, 20, 24, 18, dk);
  bk(c, 13, 21, 22, 16, mid);
  bk(c, 14, 22, 20, 14, lite);
  // belly (bloated, lighter)
  bk(c, 16, 28, 16, 8, belly);
  bk(c, 18, 30, 12, 4, bellyLt);
  // back hunch (darker)
  bk(c, 14, 18, 20, 5, dk);
  bk(c, 16, 19, 16, 3, mid);
  // top-left highlight
  bk(c, 12, 20, 10, 2, hi);
  bk(c, 12, 20, 3, 6, hi);
  // right shadow
  bk(c, 34, 24, 2, 10, dk);
  // warts/bumps
  px(c, 14, 24, wart); px(c, 32, 26, wart);
  px(c, 20, 32, wart); px(c, 28, 28, wart);
  px(c, 16, 30, wart); px(c, 30, 22, wart);

  // ── Long arms reaching forward ──
  // Left arm
  bk(c, 4, 22, 10, 4, mid);
  bk(c, 5, 23, 8, 2, lite);
  bk(c, 2, 24, 5, 4, mid);
  bk(c, 3, 25, 3, 2, lite);
  bk(c, 0, 26, 4, 4, dk);
  bk(c, 0, 27, 3, 2, mid);
  // webbed hand/claws
  px(c, 0, 29, dk); px(c, 1, 30, dk); px(c, 3, 29, dk);
  // webbing
  px(c, 1, 29, mid); px(c, 2, 30, mid);

  // Right arm
  bk(c, 34, 22, 10, 4, mid);
  bk(c, 35, 23, 8, 2, lite);
  bk(c, 40, 24, 5, 4, mid);
  bk(c, 41, 25, 3, 2, lite);
  bk(c, 44, 26, 4, 4, dk);
  bk(c, 44, 27, 3, 2, mid);
  px(c, 47, 29, dk); px(c, 46, 30, dk); px(c, 44, 29, dk);
  px(c, 46, 29, mid); px(c, 45, 30, mid);

  // ── Head (wide, flat, frog-like) ──
  bk(c, 14, 10, 20, 12, dk);
  bk(c, 15, 11, 18, 10, mid);
  bk(c, 16, 12, 16, 8, lite);
  // forehead highlight
  bk(c, 15, 10, 12, 2, hi);
  bk(c, 14, 11, 3, 4, hi);

  // ── Bulging eyes on top of head ──
  // Left eye (protruding up)
  bk(c, 15, 9, 5, 4, dk);
  bk(c, 16, 9, 3, 3, eyeDk);
  bk(c, 16, 10, 3, 2, eye);
  px(c, 17, 10, eyeBr);
  // pupil
  px(c, 18, 10, '#404008');

  // Right eye
  bk(c, 28, 9, 5, 4, dk);
  bk(c, 29, 9, 3, 3, eyeDk);
  bk(c, 29, 10, 3, 2, eye);
  px(c, 30, 10, eyeBr);
  px(c, 31, 10, '#404008');

  // ── Wide mouth (gaping) ──
  bk(c, 16, 18, 16, 4, mouth);
  bk(c, 17, 18, 14, 3, '#181810');
  // upper teeth
  px(c, 17, 18, teeth); px(c, 20, 18, teeth);
  px(c, 23, 18, teeth); px(c, 26, 18, teeth);
  px(c, 29, 18, teeth);
  // lower teeth
  px(c, 18, 21, teethDk); px(c, 22, 21, teethDk);
  px(c, 26, 21, teethDk);
  // tongue
  bk(c, 22, 19, 4, 2, '#604040');

  // ── Dripping slime ──
  px(c, 18, 22, slime); bk(c, 18, 23, 1, 3, slimeLt);
  px(c, 24, 22, slime); bk(c, 24, 23, 1, 2, slimeLt);
  px(c, 30, 20, slime); bk(c, 30, 21, 1, 2, slimeLt);
  // drip from arms
  px(c, 2, 30, slimeLt); px(c, 46, 30, slimeLt);
}

// ─── DROWNED WARDEN ──────────────────────────────────────────
// Waterlogged armored warrior, corroded, barnacles, seaweed, dripping.

function drawDrownedWarden(c: Ctx) {
  const armDk  = '#182030';
  const armMd  = '#283848';
  const armLt  = '#384858';
  const armHi  = '#486068';
  const rust   = '#5a4828';
  const rustLt = '#7a6038';
  const rustHi = '#8a7040';
  const barn   = '#808878';
  const barnLt = '#98a088';
  const capeDk = '#101820';
  const capeMd = '#182028';
  const capeLt = '#283038';
  const visor  = '#060810';
  const glow   = '#4080c0';
  const glowBr = '#60a0e0';
  const glowDm = '#306090';
  const swd    = '#586888';
  const swdHi  = '#7888a8';
  const swdDk  = '#405060';
  const seaweed= '#284828';
  const seaLt  = '#386838';
  const drip   = 'rgba(64,128,192,0.4)';
  const dripBr = 'rgba(80,160,220,0.5)';

  // Shadow
  bk(c, 6, 44, 36, 4, 'rgba(0,0,0,0.3)');

  // ── Cape (waterlogged, heavy) ──
  bk(c, 16, 12, 24, 34, capeDk);
  bk(c, 18, 14, 20, 30, capeMd);
  bk(c, 20, 16, 16, 26, capeLt);
  for (let fx = 20; fx < 38; fx += 3) bk(c, fx, 16, 1, 28, capeDk);
  bk(c, 16, 42, 24, 4, capeDk);
  bk(c, 38, 36, 3, 8, capeDk);
  // drip lines from cape
  bk(c, 17, 42, 1, 4, capeMd);
  bk(c, 38, 44, 1, 3, capeMd);

  // ── Legs (heavy corroded plate) ──
  bk(c, 14, 34, 8, 10, armMd);
  bk(c, 15, 35, 6, 8, armLt);
  bk(c, 16, 36, 4, 6, armHi);
  bk(c, 15, 35, 3, 3, armHi);
  bk(c, 26, 34, 8, 10, armMd);
  bk(c, 27, 35, 6, 8, armLt);
  bk(c, 28, 36, 4, 6, armHi);
  bk(c, 27, 35, 3, 3, armHi);
  // Knee guards
  bk(c, 13, 36, 10, 3, armDk);
  bk(c, 14, 36, 8, 1, armMd);
  bk(c, 25, 36, 10, 3, armDk);
  bk(c, 26, 36, 8, 1, armMd);
  // Boots (barnacle-encrusted)
  bk(c, 12, 42, 12, 6, armDk);
  bk(c, 13, 42, 10, 2, armMd);
  bk(c, 13, 42, 5, 1, armHi);
  bk(c, 24, 42, 12, 6, armDk);
  bk(c, 25, 42, 10, 2, armMd);
  bk(c, 25, 42, 5, 1, armHi);
  // Barnacles on boots
  px(c, 14, 44, barn); px(c, 22, 45, barn);
  px(c, 15, 45, barnLt);
  px(c, 26, 44, barn); px(c, 34, 45, barn);
  px(c, 27, 45, barnLt);

  // ── Body (corroded plate armor) ──
  bk(c, 10, 14, 28, 20, armMd);
  bk(c, 11, 15, 26, 18, armLt);
  bk(c, 12, 16, 24, 16, armHi);
  // plate bands
  for (let by = 18; by < 32; by += 4) bk(c, 12, by, 24, 1, armDk);
  // center line
  bk(c, 23, 16, 2, 16, armDk);
  // top-left highlight
  bk(c, 10, 14, 14, 2, armHi);
  // right shadow
  bk(c, 36, 16, 2, 16, armDk);
  // Rust patches (many, corroded)
  px(c, 14, 20, rust); px(c, 30, 24, rust); px(c, 18, 28, rustLt);
  px(c, 26, 18, rust); px(c, 20, 22, rustHi); px(c, 34, 20, rustLt);
  px(c, 16, 26, rust); px(c, 28, 30, rustLt);
  // Barnacles on torso
  px(c, 16, 26, barn); px(c, 32, 22, barn);
  px(c, 12, 18, barnLt); px(c, 28, 30, barn);
  px(c, 22, 20, barn);

  // ── Pauldrons (large, corroded) ──
  bk(c, 4, 10, 14, 8, armMd);
  bk(c, 5, 11, 12, 6, armLt);
  bk(c, 6, 12, 10, 4, armHi);
  bk(c, 4, 10, 10, 1, armHi);
  bk(c, 30, 10, 14, 8, armMd);
  bk(c, 31, 11, 12, 6, armLt);
  bk(c, 32, 12, 10, 4, armHi);
  bk(c, 30, 10, 10, 1, armHi);
  // Barnacles on pauldrons
  px(c, 7, 14, barn); px(c, 15, 12, barn);
  px(c, 9, 12, barnLt);
  px(c, 33, 14, barn); px(c, 41, 12, barn);
  px(c, 37, 12, barnLt);
  // Seaweed draped from shoulders
  bk(c, 5, 16, 2, 8, seaweed);
  px(c, 5, 24, seaLt);
  px(c, 6, 18, seaLt);
  bk(c, 41, 16, 2, 7, seaweed);
  px(c, 41, 23, seaLt);
  px(c, 42, 18, seaLt);

  // ── Arms ──
  bk(c, 6, 16, 6, 16, armMd);
  bk(c, 7, 17, 4, 14, armLt);
  bk(c, 7, 17, 2, 6, armHi);
  bk(c, 36, 16, 6, 16, armMd);
  bk(c, 37, 17, 4, 14, armLt);
  // Gauntlets
  bk(c, 5, 30, 8, 4, armDk);
  bk(c, 6, 30, 6, 2, armMd);
  bk(c, 35, 30, 8, 4, armDk);
  bk(c, 36, 30, 6, 2, armMd);

  // ── Helmet (corroded, larger) ──
  bk(c, 12, 0, 24, 14, armMd);
  bk(c, 13, 1, 22, 12, armLt);
  bk(c, 14, 2, 20, 10, armHi);
  bk(c, 12, 0, 16, 2, armHi); // top-left highlight
  // Visor slit
  bk(c, 16, 6, 16, 4, visor);
  // Blue glow behind visor
  px(c, 18, 7, glow); px(c, 29, 7, glow);
  px(c, 19, 7, glowBr); px(c, 28, 7, glowBr);
  px(c, 20, 8, glow); px(c, 27, 8, glow);
  px(c, 17, 7, glowDm); px(c, 30, 7, glowDm);
  // glow leak below visor
  px(c, 20, 10, 'rgba(64,128,192,0.2)');
  px(c, 27, 10, 'rgba(64,128,192,0.2)');
  // Rust on helmet
  px(c, 14, 4, rust); px(c, 32, 6, rust); px(c, 20, 12, rustLt);
  px(c, 28, 2, rustLt); px(c, 16, 8, rust);
  // Barnacles on helmet
  px(c, 16, 2, barn); px(c, 30, 4, barn); px(c, 24, 0, barn);
  px(c, 20, 0, barnLt);
  // Helmet crest (corroded stub)
  bk(c, 22, -2, 4, 4, armDk);
  bk(c, 23, -2, 2, 2, armMd);
  px(c, 23, -2, armHi);

  // ── Corroded Greatsword ──
  // Blade (irregular edge from corrosion)
  bk(c, 0, -2, 3, 36, swd);
  bk(c, 0, -2, 3, 2, swdHi); // tip
  px(c, -1, 0, swdHi); // edge gleam
  bk(c, 3, 4, 1, 20, swdDk); // shadow edge
  // Rust and pitting on blade
  px(c, 1, 6, rust); px(c, 2, 14, rust); px(c, 0, 20, rustLt);
  px(c, 1, 10, rustHi); px(c, 2, 24, armDk);
  px(c, 0, 8, rust); px(c, 2, 18, rustLt);
  // irregular blade edge (corrosion notches)
  px(c, -1, 12, swdDk); px(c, 3, 8, swdDk);
  px(c, -1, 22, swdDk); px(c, 3, 16, swdDk);
  // Barnacles on blade
  px(c, 0, 16, barn); px(c, 2, 28, barn);
  px(c, 1, 22, barnLt);
  // Crossguard (corroded)
  bk(c, -2, 30, 8, 3, armDk);
  bk(c, -1, 31, 6, 1, armMd);
  // Grip (waterlogged leather)
  bk(c, 0, 33, 3, 6, '#2a3830');
  px(c, 1, 34, '#3a4840');
  px(c, 1, 36, '#3a4840');
  // Pommel
  bk(c, 0, 39, 3, 3, armDk);
  px(c, 1, 40, armMd);

  // ── Water drips from armor ──
  px(c, 10, 32, drip); px(c, 10, 34, dripBr);
  px(c, 34, 28, drip); px(c, 34, 30, dripBr);
  px(c, 22, 34, drip);
  px(c, 6, 24, drip);
  px(c, 40, 22, drip);
  // drips from helmet
  px(c, 14, 12, drip); px(c, 14, 14, dripBr);
  px(c, 32, 12, drip);
}

// ─── FIRE ELEMENTAL ──────────────────────────────────────────
// Amorphous flame shape — bright orange/yellow center, red edges,
// flickering form. No distinct body, just fire shaped vaguely humanoid.

function drawFireElemental(c: Ctx) {
  const core  = '#f0a020';
  const mid   = '#e07818';
  const outer = '#c04010';
  const edge  = '#801808';
  const hot   = '#ffe060';
  const white = '#fff8d0';
  const eyeY  = '#ffff80';

  // Ground glow
  bk(c, 10, 42, 28, 6, 'rgba(224,96,32,0.2)');

  // Outer flame body (irregular shape)
  bk(c, 14, 10, 20, 34, edge);
  bk(c, 12, 14, 24, 26, outer);
  bk(c, 16, 8, 16, 36, outer);
  bk(c, 14, 12, 20, 30, mid);
  bk(c, 18, 6, 12, 38, mid);

  // Inner core
  bk(c, 18, 14, 12, 24, core);
  bk(c, 20, 10, 8, 30, core);
  bk(c, 22, 8, 4, 34, core);

  // Hottest center
  bk(c, 20, 18, 8, 14, hot);
  bk(c, 22, 16, 4, 18, hot);
  px(c, 23, 20, white); px(c, 24, 22, white); px(c, 23, 24, white);

  // Flame tips (top)
  bk(c, 20, 2, 6, 8, outer);
  bk(c, 22, 0, 4, 6, mid);
  px(c, 23, 0, core);
  // Side flame tips
  bk(c, 10, 18, 4, 8, edge);
  bk(c, 11, 20, 3, 4, outer);
  bk(c, 34, 16, 4, 10, edge);
  bk(c, 34, 18, 3, 6, outer);
  // Top-left wisp
  bk(c, 16, 4, 4, 6, outer);
  px(c, 17, 4, mid);
  // Top-right wisp
  bk(c, 28, 6, 4, 6, outer);
  px(c, 30, 6, mid);

  // Flickering edges — dithered embers
  for (let fy = 12; fy < 42; fy += 3) {
    px(c, 12 + (fy % 5), fy, outer);
    px(c, 33 - (fy % 4), fy, outer);
  }
  for (let fy = 8; fy < 38; fy += 4) {
    px(c, 14 + (fy % 3), fy, mid);
    px(c, 31 - (fy % 3), fy, mid);
  }

  // Bright yellow eyes
  bk(c, 19, 18, 3, 3, eyeY);
  bk(c, 26, 18, 3, 3, eyeY);
  px(c, 20, 19, white);
  px(c, 27, 19, white);

  // Ember particles above
  px(c, 18, 2, core); px(c, 30, 4, hot); px(c, 14, 6, core);
  px(c, 32, 10, hot); px(c, 10, 12, mid);
}

// ─── LAVA DRAKE ──────────────────────────────────────────────
// Small dragon/lizard. Dark red/brown scales, orange underbelly,
// short wings, long tail. Quadruped stance, embers from mouth.

function drawLavaDrake(c: Ctx) {
  const scaleDk = '#601808';
  const scaleMd = '#803010';
  const scaleLt = '#a04818';
  const scaleHi = '#b86028';
  const belly   = '#d08030';
  const bellyHi = '#e0a048';
  const wingDk  = '#501008';
  const wingMd  = '#702010';
  const wingLt  = '#903020';
  const eyeDk   = '#c06000';
  const eyeBr   = '#f0a020';
  const ember   = '#f0c040';
  const emberDk = '#e08020';

  // Ground shadow
  bk(c, 6, 42, 36, 4, 'rgba(0,0,0,0.18)');

  // ── Tail (extends right, curves up) ──
  bk(c, 34, 28, 6, 4, scaleDk);
  bk(c, 38, 26, 5, 3, scaleMd);
  bk(c, 41, 24, 4, 3, scaleLt);
  bk(c, 43, 22, 3, 3, scaleMd);
  px(c, 45, 22, scaleDk);
  // tail ridges
  px(c, 36, 28, scaleHi); px(c, 40, 26, scaleHi); px(c, 43, 23, scaleHi);

  // ── Hind legs ──
  bk(c, 28, 36, 4, 8, scaleDk);
  bk(c, 29, 37, 2, 6, scaleMd);
  bk(c, 27, 43, 6, 3, scaleDk);
  bk(c, 28, 43, 4, 2, scaleMd);
  bk(c, 24, 34, 4, 10, scaleMd);
  bk(c, 25, 35, 2, 8, scaleLt);
  bk(c, 23, 43, 6, 3, scaleDk);
  bk(c, 24, 43, 4, 2, scaleMd);

  // ── Body (broad lizard torso) ──
  bk(c, 10, 24, 26, 12, scaleDk);
  bk(c, 12, 25, 22, 10, scaleMd);
  bk(c, 14, 26, 18, 8, scaleLt);
  // belly
  bk(c, 14, 32, 18, 4, belly);
  bk(c, 16, 33, 14, 2, bellyHi);
  // dorsal ridge
  bk(c, 14, 24, 16, 2, scaleHi);
  px(c, 16, 24, scaleDk); px(c, 20, 24, scaleDk); px(c, 24, 24, scaleDk);
  // scale texture
  for (let sx = 14; sx < 32; sx += 3) px(c, sx, 27, scaleDk);
  for (let sx = 16; sx < 30; sx += 4) px(c, sx, 30, scaleMd);

  // ── Front legs ──
  bk(c, 14, 34, 3, 9, scaleMd);
  bk(c, 15, 35, 2, 7, scaleLt);
  bk(c, 13, 42, 5, 3, scaleDk);
  bk(c, 10, 33, 4, 10, scaleDk);
  bk(c, 11, 34, 2, 8, scaleMd);
  bk(c, 9, 42, 6, 3, scaleDk);
  bk(c, 10, 42, 4, 2, scaleMd);

  // ── Neck ──
  bk(c, 6, 22, 8, 8, scaleMd);
  bk(c, 7, 23, 6, 6, scaleLt);
  bk(c, 6, 22, 8, 2, scaleHi);

  // ── Head (angular lizard head) ──
  bk(c, 2, 18, 10, 8, scaleMd);
  bk(c, 3, 19, 8, 6, scaleLt);
  bk(c, 2, 18, 10, 2, scaleHi);
  // snout
  bk(c, 0, 20, 4, 4, scaleMd);
  bk(c, 0, 21, 3, 2, scaleLt);
  // nostrils
  px(c, 0, 20, scaleDk); px(c, 1, 20, scaleDk);
  // jaw
  bk(c, 0, 24, 8, 2, scaleDk);
  bk(c, 1, 24, 6, 1, scaleMd);

  // ── Eyes (ember-orange) ──
  bk(c, 4, 19, 3, 2, eyeDk);
  px(c, 5, 19, eyeBr);
  bk(c, 8, 19, 3, 2, eyeDk);
  px(c, 9, 19, eyeBr);

  // ── Wings (short, stubby) ──
  bk(c, 16, 16, 8, 8, wingDk);
  bk(c, 17, 17, 6, 6, wingMd);
  bk(c, 18, 18, 4, 4, wingLt);
  // wing membrane lines
  px(c, 17, 17, wingDk); px(c, 19, 19, wingDk);
  // second wing (behind, partial)
  bk(c, 22, 18, 6, 6, wingDk);
  bk(c, 23, 19, 4, 4, wingMd);

  // ── Embers from mouth ──
  px(c, 0, 22, ember); px(c, -1, 21, emberDk);
  px(c, -1, 23, ember); px(c, -2, 22, emberDk);
  px(c, 1, 25, emberDk);
}

// ─── ASH WRAITH ──────────────────────────────────────────────
// Like wraith but grey/dark with ember particles. Tattered form,
// glowing orange eyes. Ash trails at the bottom.

function drawAshWraith(c: Ctx) {
  const dk     = '#282020';
  const mid    = '#3a3030';
  const lite   = '#4a4040';
  const hi     = '#585050';
  const tatter = '#201818';
  const glow   = '#e07020';
  const glowBr = '#f0a040';
  const glowDm = '#c05010';
  const void_  = '#0a0808';
  const ember  = '#f0a030';
  const emberDk= '#c06010';

  // ── Ground shadow ──
  bk(c, 10, 42, 28, 4, 'rgba(0,0,0,0.12)');

  // ── Ash trail at bottom (tattered, dissolving) ──
  bk(c, 14, 38, 20, 8, tatter);
  bk(c, 12, 40, 24, 6, dk);
  // ragged bottom edge
  for (let tx = 12; tx < 36; tx += 2) {
    const h = 2 + (tx % 5);
    bk(c, tx, 46 - h, 2, h, tatter);
  }
  // wisps trailing down
  bk(c, 16, 44, 2, 4, 'rgba(40,32,32,0.5)');
  bk(c, 24, 44, 2, 4, 'rgba(40,32,32,0.4)');
  bk(c, 30, 42, 2, 4, 'rgba(40,32,32,0.3)');

  // ── Body / robe (tattered, amorphous) ──
  bk(c, 14, 14, 20, 26, dk);
  bk(c, 16, 16, 16, 22, mid);
  bk(c, 18, 18, 12, 18, lite);
  // left ragged edge
  bk(c, 12, 20, 4, 16, tatter);
  px(c, 11, 24, dk); px(c, 11, 28, dk); px(c, 10, 32, tatter);
  // right ragged edge
  bk(c, 32, 18, 4, 18, tatter);
  px(c, 35, 22, dk); px(c, 36, 26, dk); px(c, 35, 30, tatter);
  // highlight on upper body
  bk(c, 16, 14, 10, 2, hi);
  bk(c, 14, 16, 2, 6, hi);

  // ── Hood ──
  bk(c, 14, 6, 20, 12, dk);
  bk(c, 16, 6, 16, 10, mid);
  bk(c, 14, 4, 14, 2, hi);
  bk(c, 14, 4, 2, 6, hi);
  // hood peak
  bk(c, 20, 2, 8, 4, mid);
  bk(c, 22, 0, 4, 4, dk);
  px(c, 22, 0, mid);

  // ── Face void ──
  bk(c, 18, 8, 12, 6, void_);

  // ── Glowing orange eyes ──
  bk(c, 20, 9, 3, 3, glow);
  bk(c, 25, 9, 3, 3, glow);
  px(c, 21, 10, glowBr);
  px(c, 26, 10, glowBr);
  px(c, 21, 9, '#ffe080');
  px(c, 26, 9, '#ffe080');
  // eye trails
  px(c, 19, 10, glowDm);
  px(c, 18, 10, 'rgba(224,112,32,0.4)');
  px(c, 28, 10, glowDm);
  px(c, 29, 10, 'rgba(224,112,32,0.4)');

  // ── Ember particles floating around ──
  px(c, 12, 8, ember); px(c, 34, 6, emberDk);
  px(c, 10, 14, ember); px(c, 36, 12, ember);
  px(c, 8, 22, emberDk); px(c, 38, 20, ember);
  px(c, 14, 2, emberDk); px(c, 32, 4, ember);
  px(c, 20, 0, ember); px(c, 28, 2, emberDk);
  px(c, 11, 30, ember); px(c, 37, 28, emberDk);
}

// ─── EMBER KNIGHT ────────────────────────────────────────────
// Armored humanoid glowing red-hot. Like hollow_knight but armor
// is red/orange, with heat distortion (lighter pixels around edges).
// Flaming sword.

function drawEmberKnight(c: Ctx) {
  const armDk  = '#602010';
  const armMd  = '#804020';
  const armLt  = '#a05830';
  const armHi  = '#c07040';
  const heatHi = '#e0a060';
  const capeDk = '#281008';
  const capeMd = '#3a1810';
  const capeLt = '#4a2818';
  const visor  = '#100808';
  const swd    = '#d06020';
  const swdHi  = '#f0a040';
  const swdDk  = '#a04010';
  const glow   = '#f08030';
  const glowBr = '#ffa050';
  const flame  = '#ffe040';

  // Ground glow
  bk(c, 8, 42, 32, 6, 'rgba(224,96,32,0.15)');

  // ── Cape (behind body, tattered) ──
  bk(c, 16, 20, 18, 26, capeDk);
  bk(c, 18, 22, 14, 22, capeMd);
  bk(c, 20, 24, 10, 18, capeLt);
  // ragged cape bottom
  for (let cx = 16; cx < 34; cx += 3) {
    const h = 2 + (cx % 4);
    bk(c, cx, 46 - h, 2, h, capeDk);
  }

  // ── Legs (armored) ──
  bk(c, 16, 34, 5, 10, armDk);
  bk(c, 17, 35, 3, 8, armMd);
  px(c, 17, 35, armLt);
  bk(c, 15, 43, 7, 3, armDk);
  bk(c, 16, 43, 5, 2, armMd);

  bk(c, 25, 34, 5, 10, armDk);
  bk(c, 26, 35, 3, 8, armMd);
  px(c, 26, 35, armLt);
  bk(c, 24, 43, 7, 3, armDk);
  bk(c, 25, 43, 5, 2, armMd);

  // ── Torso (glowing armor) ──
  bk(c, 14, 18, 18, 18, armDk);
  bk(c, 16, 19, 14, 14, armMd);
  bk(c, 18, 20, 10, 10, armLt);
  // chest plate highlight
  bk(c, 16, 18, 8, 2, armHi);
  bk(c, 14, 20, 2, 6, armHi);
  // heat glow on edges
  px(c, 13, 20, heatHi); px(c, 13, 24, heatHi);
  px(c, 32, 22, heatHi); px(c, 32, 26, heatHi);
  px(c, 14, 18, heatHi); px(c, 30, 18, heatHi);

  // ── Arms ──
  // Left arm (raised with sword)
  bk(c, 8, 16, 6, 14, armDk);
  bk(c, 9, 17, 4, 12, armMd);
  bk(c, 10, 18, 2, 10, armLt);
  // gauntlet
  bk(c, 8, 14, 6, 4, armMd);
  bk(c, 9, 14, 4, 3, armLt);

  // Right arm
  bk(c, 32, 20, 6, 12, armDk);
  bk(c, 33, 21, 4, 10, armMd);
  bk(c, 34, 22, 2, 8, armLt);
  bk(c, 32, 30, 6, 4, armDk);
  bk(c, 33, 30, 4, 3, armMd);

  // ── Helmet ──
  bk(c, 16, 4, 14, 16, armDk);
  bk(c, 18, 5, 10, 14, armMd);
  bk(c, 20, 6, 6, 12, armLt);
  // helmet crest
  bk(c, 22, 0, 4, 6, armMd);
  bk(c, 23, 0, 2, 4, armLt);
  px(c, 23, 0, armHi);
  // visor slit
  bk(c, 18, 10, 10, 3, visor);
  // glowing eyes behind visor
  bk(c, 19, 10, 3, 2, glow);
  bk(c, 25, 10, 3, 2, glow);
  px(c, 20, 10, glowBr);
  px(c, 26, 10, glowBr);
  // helmet highlight
  bk(c, 16, 4, 10, 2, armHi);
  bk(c, 16, 4, 2, 8, armHi);

  // ── Flaming Sword (left hand, raised) ──
  // blade
  bk(c, 9, -4, 3, 20, swd);
  bk(c, 9, -4, 3, 4, swdHi);
  px(c, 8, -2, swdHi);
  bk(c, 12, 2, 1, 12, swdDk);
  // flames on blade
  px(c, 8, 0, flame); px(c, 12, -2, flame);
  px(c, 7, 4, flame); px(c, 13, 2, flame);
  px(c, 8, 8, flame); px(c, 12, 6, flame);
  px(c, 7, -4, swdHi); px(c, 13, -2, swdHi);
  // crossguard
  bk(c, 6, 14, 10, 3, armMd);
  bk(c, 7, 14, 8, 2, armLt);

  // ── Heat distortion (lighter pixels around body edges) ──
  px(c, 12, 16, heatHi); px(c, 34, 18, heatHi);
  px(c, 14, 34, heatHi); px(c, 30, 36, heatHi);
  px(c, 6, 18, heatHi); px(c, 38, 24, heatHi);
  px(c, 16, 2, heatHi); px(c, 28, 2, heatHi);
  px(c, 10, 12, heatHi); px(c, 36, 14, heatHi);
}

// ─── CROWNLESS ONE ───────────────────────────────────────────
// The final boss — tall spectral king, no crown (crown-shaped void above head),
// flowing dark robes, purple/black energy, skeletal hands, glowing purple eyes.
// Fills the full 48x48 canvas. Dark purples, blacks, bright purple energy.

function drawCrownlessOne(c: Ctx) {
  const voidDk = '#0a0810';
  const robeDk = '#120818';
  const robeMd = '#1a1028';
  const robeLt = '#281840';
  const robeHi = '#382058';
  const skinBone = '#483858';
  const skinDk = '#302040';
  const energy = '#8040e0';
  const energyHi = '#b060ff';
  const energyBright = '#d0a0ff';
  const eyeGlow = '#c060ff';
  const eyeCore = '#ffffff';
  const voidPurple = '#200830';

  // Ground shadow
  bk(c, 6, 44, 36, 4, 'rgba(20,0,40,0.3)');

  // ── Flowing robes (wide, sweeping, fills bottom half) ──
  // Robe base — wide sweep
  bk(c, 4, 32, 40, 14, robeDk);
  bk(c, 6, 34, 36, 10, robeMd);
  bk(c, 8, 36, 32, 8, robeLt);
  // Robe folds
  bk(c, 10, 38, 4, 6, robeDk);
  bk(c, 20, 36, 3, 8, robeDk);
  bk(c, 30, 37, 4, 7, robeDk);
  // Robe highlights
  bk(c, 14, 34, 3, 6, robeHi);
  bk(c, 26, 35, 3, 5, robeHi);
  // Trailing edges
  bk(c, 2, 40, 4, 6, robeDk);
  bk(c, 42, 40, 4, 6, robeDk);
  px(c, 1, 42, robeMd); px(c, 46, 42, robeMd);
  // Energy wisps on robe
  px(c, 8, 38, energy); px(c, 36, 40, energy);
  px(c, 16, 42, energyHi); px(c, 28, 44, energyHi);
  px(c, 12, 44, energy); px(c, 34, 42, energy);

  // ── Upper body / torso ──
  bk(c, 14, 18, 20, 16, robeDk);
  bk(c, 16, 20, 16, 12, robeMd);
  bk(c, 18, 22, 12, 8, robeLt);
  // Chest details
  bk(c, 20, 24, 8, 4, voidPurple);
  px(c, 22, 25, energy); px(c, 25, 25, energy);
  // Collar
  bk(c, 16, 18, 16, 3, robeHi);
  bk(c, 18, 18, 12, 2, robeLt);

  // ── Skeletal hands (reaching forward) ──
  // Left hand
  bk(c, 6, 24, 8, 3, skinDk);
  bk(c, 7, 25, 6, 2, skinBone);
  // Fingers
  px(c, 4, 24, skinBone); px(c, 4, 25, skinDk);
  px(c, 5, 23, skinBone); px(c, 5, 26, skinDk);
  px(c, 3, 24, skinDk);
  // Energy on fingers
  px(c, 3, 25, energy); px(c, 5, 22, energyHi);

  // Right hand
  bk(c, 34, 24, 8, 3, skinDk);
  bk(c, 35, 25, 6, 2, skinBone);
  px(c, 42, 24, skinBone); px(c, 43, 25, skinDk);
  px(c, 42, 23, skinBone); px(c, 43, 26, skinDk);
  px(c, 44, 24, skinDk);
  px(c, 44, 25, energy); px(c, 42, 22, energyHi);

  // ── Head (gaunt, spectral) ──
  bk(c, 18, 6, 12, 14, skinDk);
  bk(c, 19, 7, 10, 12, skinBone);
  bk(c, 20, 8, 8, 10, voidPurple);
  // Cheekbones
  bk(c, 18, 12, 2, 3, skinDk);
  bk(c, 28, 12, 2, 3, skinDk);
  // Jaw
  bk(c, 20, 16, 8, 2, skinDk);
  bk(c, 21, 17, 6, 1, voidDk);

  // ── Eyes (glowing purple) ──
  bk(c, 21, 10, 3, 2, eyeGlow);
  px(c, 22, 10, eyeCore);
  bk(c, 26, 10, 3, 2, eyeGlow);
  px(c, 27, 10, eyeCore);
  // Eye glow aura
  px(c, 20, 10, energy); px(c, 29, 10, energy);
  px(c, 21, 9, energyHi); px(c, 27, 9, energyHi);

  // ── Crown-shaped void (above head — absence of crown) ──
  // Dark void where a crown should be — jagged empty space
  bk(c, 17, 2, 14, 5, voidDk);
  // Crown void spikes (negative space, slightly lighter outline)
  px(c, 18, 1, voidPurple); px(c, 22, 0, voidPurple);
  px(c, 26, 1, voidPurple); px(c, 30, 2, voidPurple);
  px(c, 20, 0, energy); px(c, 24, 0, energy);
  px(c, 28, 0, energy);
  // Void energy crackling
  px(c, 19, 3, energyHi); px(c, 25, 2, energyHi);
  px(c, 29, 3, energyBright); px(c, 17, 4, energyBright);

  // ── Orbiting dark energy shards ──
  px(c, 2, 14, energyHi); px(c, 3, 13, energy);
  px(c, 45, 16, energyHi); px(c, 44, 15, energy);
  px(c, 10, 4, energy); px(c, 38, 6, energy);
  px(c, 6, 30, energyBright); px(c, 42, 28, energyBright);
  px(c, 14, 2, energyHi); px(c, 34, 4, energyHi);

  // ── Shoulder pauldrons (spectral armor remnants) ──
  bk(c, 12, 18, 4, 6, skinDk);
  bk(c, 13, 19, 2, 4, skinBone);
  bk(c, 32, 18, 4, 6, skinDk);
  bk(c, 33, 19, 2, 4, skinBone);
  px(c, 12, 18, energy); px(c, 35, 18, energy);
}

// ─── FROST WOLF ───────────────────────────────────────────────
// White/blue wolf profile facing left: ice-blue palette, frost particles.

function drawFrostWolf(c: Ctx) {
  const dk   = '#607888'; const mid  = '#90a8c0';
  const lite = '#b0c8e0'; const hi   = '#d0e0f0';
  const belly = '#e0e8f0'; const eye  = '#40a0f0';
  const eyeHi = '#80c8ff'; const pupil = '#102030';
  const nose = '#304050'; const teeth = '#f0f0f8';
  const pawDk = '#506878'; const frost = '#c0e0ff';

  bk(c, 8, 44, 32, 4, 'rgba(100,140,180,0.15)');
  // Tail
  bk(c, 37, 18, 4, 3, dk); bk(c, 38, 16, 4, 4, mid);
  bk(c, 39, 14, 4, 5, lite); bk(c, 40, 12, 3, 4, mid);
  px(c, 42, 11, hi); px(c, 43, 13, frost); px(c, 42, 15, frost);
  bk(c, 38, 20, 4, 2, dk);
  // Hind legs
  bk(c, 34, 34, 3, 9, dk); bk(c, 35, 35, 2, 7, mid);
  bk(c, 33, 42, 5, 3, dk); bk(c, 34, 42, 3, 2, mid);
  bk(c, 29, 33, 4, 10, mid); bk(c, 30, 34, 2, 8, lite);
  bk(c, 28, 30, 6, 5, mid);
  bk(c, 28, 42, 6, 3, dk); bk(c, 29, 42, 4, 2, mid);
  // Body
  bk(c, 9, 22, 30, 14, dk); bk(c, 10, 23, 28, 12, mid);
  bk(c, 12, 24, 24, 9, lite); bk(c, 10, 22, 16, 2, hi);
  bk(c, 9, 22, 30, 2, dk); bk(c, 14, 33, 18, 3, belly);
  for (let fx = 13; fx < 36; fx += 3) { px(c, fx, 24, frost); px(c, fx + 1, 25, hi); }
  // Front legs
  bk(c, 17, 33, 3, 10, dk); bk(c, 18, 34, 2, 8, mid);
  bk(c, 16, 42, 5, 3, dk); bk(c, 17, 42, 3, 2, mid);
  bk(c, 10, 32, 4, 11, mid); bk(c, 11, 33, 2, 9, lite);
  bk(c, 9, 42, 6, 3, dk); bk(c, 10, 42, 4, 2, mid);
  px(c, 9, 44, pawDk); px(c, 11, 44, pawDk);
  // Neck
  bk(c, 5, 20, 9, 10, mid); bk(c, 6, 21, 7, 8, lite);
  bk(c, 5, 20, 9, 2, dk); bk(c, 5, 20, 2, 4, hi);
  bk(c, 6, 18, 8, 4, dk); bk(c, 7, 19, 6, 2, mid);
  // Head
  bk(c, 2, 16, 10, 10, mid); bk(c, 3, 17, 8, 8, lite);
  bk(c, 2, 16, 10, 2, hi); bk(c, 2, 16, 2, 6, hi);
  bk(c, 4, 15, 6, 2, mid);
  // Snout + nose
  bk(c, 0, 20, 5, 5, mid); bk(c, 0, 21, 4, 3, lite);
  bk(c, 0, 20, 3, 1, hi); bk(c, 2, 19, 4, 2, mid);
  bk(c, 0, 20, 2, 2, nose);
  // Mouth
  bk(c, 0, 24, 7, 2, dk);
  px(c, 1, 24, teeth); px(c, 3, 24, teeth); px(c, 5, 24, teeth);
  bk(c, 2, 25, 5, 1, dk);
  // Eyes
  bk(c, 3, 17, 5, 3, dk); bk(c, 4, 17, 3, 2, eye);
  px(c, 5, 17, eyeHi); px(c, 5, 18, pupil); px(c, 4, 17, '#80d0ff');
  // Ears
  bk(c, 3, 10, 4, 6, dk); bk(c, 4, 10, 2, 5, mid); px(c, 4, 10, hi);
  bk(c, 8, 11, 3, 5, dk); bk(c, 9, 11, 2, 4, mid);
  // Frost particles
  px(c, 6, 14, frost); px(c, 14, 20, frost); px(c, 22, 18, frost);
  px(c, 30, 22, frost); px(c, 36, 26, frost); px(c, 2, 26, frost);
  px(c, 40, 16, frost); px(c, 18, 30, frost);
}

// ─── ICE GOLEM ─────────────────────────────────────────────────
// Massive blue-grey blocky humanoid with ice crystal shoulders.

function drawIceGolem(c: Ctx) {
  const dk = '#405060'; const mid = '#607888';
  const lite = '#80a0b8'; const hi = '#a0c0d0';
  const cryst = '#b0d8f0'; const crystHi = '#d0f0ff';
  const crystDk = '#406878';
  const eye = '#40c0f0'; const eyeHi = '#80e0ff';

  bk(c, 6, 44, 36, 4, 'rgba(60,100,140,0.2)');
  // Legs
  bk(c, 12, 32, 7, 14, dk); bk(c, 13, 33, 5, 12, mid);
  bk(c, 14, 34, 3, 10, lite); bk(c, 11, 44, 9, 3, dk); bk(c, 12, 44, 7, 2, mid);
  bk(c, 29, 32, 7, 14, dk); bk(c, 30, 33, 5, 12, mid);
  bk(c, 31, 34, 3, 10, lite); bk(c, 28, 44, 9, 3, dk); bk(c, 29, 44, 7, 2, mid);
  // Torso
  bk(c, 8, 14, 32, 20, dk); bk(c, 10, 15, 28, 18, mid);
  bk(c, 12, 16, 24, 14, lite);
  bk(c, 10, 14, 14, 2, hi); bk(c, 8, 16, 3, 8, hi); bk(c, 36, 18, 3, 14, dk);
  // Arms
  bk(c, 2, 16, 7, 18, dk); bk(c, 3, 17, 5, 16, mid); bk(c, 4, 18, 3, 14, lite);
  bk(c, 2, 32, 7, 5, dk); bk(c, 3, 32, 5, 4, mid);
  bk(c, 39, 16, 7, 18, dk); bk(c, 40, 17, 5, 16, mid); bk(c, 41, 18, 3, 14, lite);
  bk(c, 39, 32, 7, 5, dk); bk(c, 40, 32, 5, 4, mid);
  // Crystal shoulders
  bk(c, 4, 8, 6, 10, crystDk); bk(c, 5, 6, 4, 10, cryst);
  bk(c, 6, 4, 2, 8, crystHi); px(c, 6, 4, '#e0f8ff');
  bk(c, 2, 10, 3, 6, cryst); px(c, 2, 10, crystHi);
  bk(c, 38, 8, 6, 10, crystDk); bk(c, 39, 6, 4, 10, cryst);
  bk(c, 40, 4, 2, 8, crystHi); px(c, 40, 4, '#e0f8ff');
  bk(c, 43, 10, 3, 6, cryst); px(c, 44, 10, crystHi);
  // Head
  bk(c, 16, 2, 16, 14, dk); bk(c, 18, 3, 12, 12, mid);
  bk(c, 20, 4, 8, 10, lite);
  bk(c, 16, 2, 12, 2, hi); bk(c, 16, 2, 2, 6, hi); bk(c, 18, 14, 12, 2, dk);
  // Eyes
  bk(c, 19, 7, 4, 3, '#102030'); bk(c, 20, 7, 2, 2, eye); px(c, 20, 7, eyeHi);
  bk(c, 27, 7, 4, 3, '#102030'); bk(c, 28, 7, 2, 2, eye); px(c, 28, 7, eyeHi);
  // Ice texture + frost
  px(c, 14, 20, cryst); px(c, 18, 24, cryst); px(c, 26, 18, cryst);
  px(c, 30, 22, cryst); px(c, 22, 28, cryst); px(c, 34, 20, cryst);
  px(c, 8, 12, crystHi); px(c, 44, 8, crystHi); px(c, 16, 0, crystHi); px(c, 32, 0, crystHi);
}

// ─── BLIZZARD WRAITH ──────────────────────────────────────────
// White swirling spectral form, wisps of snow, glowing eyes.

function drawBlizzardWraith(c: Ctx) {
  const dk = '#708898'; const mid = '#a0b8c8';
  const lite = '#c0d8e8'; const hi = '#e0f0f8';
  const eye = '#40a0ff'; const eyeHi = '#90d0ff'; const swirl = '#d0e8f8';

  // Central body
  bk(c, 16, 8, 16, 30, dk); bk(c, 18, 10, 12, 26, mid); bk(c, 20, 12, 8, 22, lite);
  c.fillStyle = 'rgba(192,216,240,0.6)'; c.fillRect(14, 36, 20, 6);
  c.fillStyle = 'rgba(224,240,248,0.4)'; c.fillRect(12, 40, 24, 6);
  bk(c, 10, 42, 4, 5, dk); bk(c, 18, 44, 3, 4, mid);
  bk(c, 28, 42, 4, 5, dk); bk(c, 34, 44, 3, 4, mid);
  // Arms (left)
  bk(c, 6, 14, 12, 6, dk); bk(c, 4, 16, 10, 4, mid);
  bk(c, 2, 18, 8, 3, lite); px(c, 2, 18, hi);
  px(c, 0, 20, swirl); px(c, 1, 17, swirl); px(c, 4, 14, swirl);
  // Arms (right)
  bk(c, 30, 14, 12, 6, dk); bk(c, 34, 16, 10, 4, mid);
  bk(c, 38, 18, 8, 3, lite); px(c, 44, 18, hi);
  px(c, 46, 20, swirl); px(c, 45, 17, swirl); px(c, 42, 14, swirl);
  // Hood/head
  bk(c, 18, 2, 12, 12, dk); bk(c, 20, 3, 8, 10, mid); bk(c, 22, 4, 4, 8, lite);
  bk(c, 22, 0, 4, 4, dk); bk(c, 23, 0, 2, 3, mid); px(c, 23, 0, hi);
  // Eyes
  bk(c, 20, 7, 3, 3, '#081828'); bk(c, 21, 7, 2, 2, eye); px(c, 21, 7, eyeHi);
  bk(c, 27, 7, 3, 3, '#081828'); bk(c, 28, 7, 2, 2, eye); px(c, 28, 7, eyeHi);
  // Snow particles
  px(c, 8, 10, hi); px(c, 36, 6, hi); px(c, 12, 28, hi);
  px(c, 38, 24, hi); px(c, 6, 36, hi); px(c, 40, 32, hi);
  px(c, 14, 4, swirl); px(c, 34, 8, swirl); px(c, 10, 22, swirl);
  px(c, 42, 28, swirl); px(c, 24, 0, hi); px(c, 16, 38, swirl);
}

// ─── FROST WARDEN ─────────────────────────────────────────────
// Ice-encrusted knight with frozen sword, blue-ice armor.

function drawFrostWarden(c: Ctx) {
  const armDk = '#304858'; const armMd = '#486878';
  const armLt = '#688898'; const armHi = '#88a8b8';
  const ice = '#80b8d0'; const iceHi = '#b0d8f0'; const iceDk = '#406878';
  const capeDk = '#182838'; const capeMd = '#283848';
  const visor = '#081018';
  const swd = '#90c0d8'; const swdHi = '#b0e0f0'; const swdDk = '#406878';
  const eye = '#40a0f0'; const eyeHi = '#80d0ff'; const frost = '#c0e0ff';

  bk(c, 8, 42, 32, 6, 'rgba(100,160,200,0.12)');
  // Cape
  bk(c, 16, 20, 18, 26, capeDk); bk(c, 18, 22, 14, 22, capeMd);
  for (let cx = 16; cx < 34; cx += 3) { bk(c, cx, 46 - (2 + (cx % 4)), 2, 2 + (cx % 4), capeDk); }
  // Legs
  bk(c, 16, 34, 5, 10, armDk); bk(c, 17, 35, 3, 8, armMd);
  bk(c, 15, 43, 7, 3, armDk); bk(c, 16, 43, 5, 2, armMd);
  bk(c, 25, 34, 5, 10, armDk); bk(c, 26, 35, 3, 8, armMd);
  bk(c, 24, 43, 7, 3, armDk); bk(c, 25, 43, 5, 2, armMd);
  // Torso
  bk(c, 14, 18, 18, 18, armDk); bk(c, 16, 19, 14, 14, armMd); bk(c, 18, 20, 10, 10, armLt);
  bk(c, 16, 18, 8, 2, armHi); bk(c, 14, 20, 2, 6, armHi);
  px(c, 13, 20, ice); px(c, 13, 24, ice); px(c, 32, 22, ice); px(c, 32, 26, ice);
  px(c, 20, 18, iceHi); px(c, 26, 18, iceHi);
  // Arms
  bk(c, 8, 16, 6, 14, armDk); bk(c, 9, 17, 4, 12, armMd); bk(c, 10, 18, 2, 10, armLt);
  bk(c, 8, 14, 6, 4, armMd); bk(c, 9, 14, 4, 3, armLt);
  bk(c, 32, 20, 6, 12, armDk); bk(c, 33, 21, 4, 10, armMd); bk(c, 34, 22, 2, 8, armLt);
  bk(c, 32, 30, 6, 4, armDk); bk(c, 33, 30, 4, 3, armMd);
  // Helmet
  bk(c, 16, 4, 14, 16, armDk); bk(c, 18, 5, 10, 14, armMd); bk(c, 20, 6, 6, 12, armLt);
  bk(c, 14, 2, 3, 6, iceDk); bk(c, 15, 0, 2, 4, ice); px(c, 15, 0, iceHi);
  bk(c, 31, 2, 3, 6, iceDk); bk(c, 31, 0, 2, 4, ice); px(c, 31, 0, iceHi);
  bk(c, 18, 10, 10, 3, visor);
  bk(c, 19, 10, 3, 2, eye); bk(c, 25, 10, 3, 2, eye);
  px(c, 20, 10, eyeHi); px(c, 26, 10, eyeHi);
  bk(c, 16, 4, 10, 2, armHi); bk(c, 16, 4, 2, 8, armHi);
  // Frozen Sword
  bk(c, 9, -4, 3, 20, swd); bk(c, 9, -4, 3, 4, swdHi);
  px(c, 8, -2, swdHi); bk(c, 12, 2, 1, 12, swdDk);
  px(c, 8, 0, frost); px(c, 12, -2, frost);
  px(c, 7, 4, iceHi); px(c, 13, 2, iceHi);
  px(c, 8, 8, frost); px(c, 12, 6, frost);
  bk(c, 6, 14, 10, 3, armMd); bk(c, 7, 14, 8, 2, armLt);
  // Frost particles
  px(c, 12, 16, frost); px(c, 34, 18, frost); px(c, 14, 34, frost);
  px(c, 30, 36, frost); px(c, 6, 18, frost); px(c, 38, 24, frost);
}

// ─── THE FORGOTTEN ───────────────────────────────────────────
// Pure void — almost entirely black/dark purple. Faint outline of a
// humanoid form. Two void eyes (tiny bright purple dots). Minimal
// detail — the emptiness IS the design. Scattered purple energy.

function drawTheForgotten(c: Ctx) {
  const voidDk = '#040008';
  const voidMd = '#0a0018';
  const voidLt = '#100028';
  const edge   = '#180040';
  const energy = '#6020c0';
  const eyeHi  = '#c060ff';
  const eye    = '#8030e0';

  // Ground shadow — barely visible
  bk(c, 10, 44, 28, 4, 'rgba(20,0,40,0.15)');

  // Body mass — near-invisible dark form
  bk(c, 16, 8, 16, 36, voidDk);
  bk(c, 14, 12, 20, 28, voidDk);
  bk(c, 18, 10, 12, 32, voidMd);
  bk(c, 20, 14, 8, 24, voidLt);

  // Head
  bk(c, 18, 4, 12, 12, voidDk);
  bk(c, 20, 5, 8, 10, voidMd);
  bk(c, 22, 6, 4, 8, voidLt);

  // Shoulders — faint outline
  bk(c, 10, 14, 6, 8, voidDk);
  bk(c, 32, 14, 6, 8, voidDk);
  px(c, 10, 14, edge); px(c, 10, 20, edge);
  px(c, 37, 14, edge); px(c, 37, 20, edge);

  // Arms — wisps of darkness
  bk(c, 8, 16, 4, 16, voidDk);
  bk(c, 36, 16, 4, 16, voidDk);
  px(c, 8, 16, edge); px(c, 8, 30, edge);
  px(c, 39, 16, edge); px(c, 39, 30, edge);

  // Eyes — tiny bright purple dots in void
  bk(c, 21, 8, 2, 2, eye); px(c, 21, 8, eyeHi);
  bk(c, 27, 8, 2, 2, eye); px(c, 27, 8, eyeHi);

  // Edge highlights — faint humanoid outline
  px(c, 16, 8, edge); px(c, 31, 8, edge);
  px(c, 14, 16, edge); px(c, 33, 16, edge);
  px(c, 14, 24, edge); px(c, 33, 24, edge);
  px(c, 16, 36, edge); px(c, 31, 36, edge);
  px(c, 18, 40, edge); px(c, 29, 40, edge);
  px(c, 18, 4, edge); px(c, 29, 4, edge);

  // Purple energy pixels — scattered at edges
  px(c, 12, 12, energy); px(c, 36, 10, energy);
  px(c, 6, 22, energy); px(c, 40, 26, energy);
  px(c, 14, 34, energy); px(c, 34, 38, energy);
  px(c, 10, 28, energy); px(c, 38, 18, energy);
  px(c, 20, 2, energy); px(c, 28, 2, energy);
  px(c, 16, 42, energy); px(c, 32, 42, energy);
}

// ─── TRAINING DUMMY ───────────────────────────────────────────
// Straw-stuffed burlap figure on a wooden post. A red target on the
// chest. Stitched cross-shaped eyes and mouth.

function drawTrainingDummy(c: Ctx) {
  const post   = '#6a4820';
  const postDk = '#4a2e14';
  const postHi = '#8a6a3a';
  const burlap   = '#b89868';
  const burlapDk = '#7a5a30';
  const burlapHi = '#d4b888';
  const straw  = '#e8c868';
  const strawDk = '#a48838';
  const stitch = '#3a2010';
  const target = '#c81e1e';
  const targetHi = '#ff4040';
  const targetWhite = '#f0e8d0';

  // Shadow
  bk(c, 14, 44, 22, 3, 'rgba(0,0,0,0.25)');

  // ── Wooden post (behind body) ──
  bk(c, 22, 38, 6, 8, postDk);
  bk(c, 23, 38, 4, 8, post);
  px(c, 23, 38, postHi);
  px(c, 24, 39, postHi);

  // ── Cross arm of the stand (sticks out for stability) ──
  bk(c, 18, 40, 14, 2, postDk);
  bk(c, 19, 40, 12, 1, post);

  // ── Body (burlap sack torso, barrel shape) ──
  // Lower torso
  bk(c, 14, 28, 22, 12, burlapDk);
  bk(c, 15, 28, 20, 11, burlap);
  bk(c, 16, 29, 18, 9, burlapHi);
  // Mid shading seam
  bk(c, 14, 34, 22, 1, burlapDk);

  // ── Upper torso / shoulders ──
  bk(c, 16, 18, 18, 11, burlapDk);
  bk(c, 17, 18, 16, 10, burlap);
  bk(c, 18, 19, 14, 8, burlapHi);

  // ── Head (round burlap sack) ──
  bk(c, 19, 8, 12, 11, burlapDk);
  bk(c, 20, 8, 10, 10, burlap);
  bk(c, 21, 9, 8, 8, burlapHi);
  // Top knot (tied sack)
  bk(c, 23, 5, 4, 4, burlap);
  bk(c, 24, 4, 2, 2, burlapDk);
  // Straw poking from top
  px(c, 22, 5, straw);
  px(c, 27, 5, strawDk);
  px(c, 24, 3, straw);
  px(c, 25, 3, strawDk);

  // ── Stitched cross eyes (X shapes) ──
  // Left eye
  px(c, 22, 12, stitch); px(c, 23, 13, stitch);
  px(c, 23, 12, stitch); px(c, 22, 13, stitch);
  // Right eye
  px(c, 26, 12, stitch); px(c, 27, 13, stitch);
  px(c, 27, 12, stitch); px(c, 26, 13, stitch);
  // Stitched mouth (small seam)
  px(c, 23, 15, stitch); px(c, 24, 15, stitch);
  px(c, 25, 15, stitch); px(c, 26, 15, stitch);
  px(c, 24, 16, stitch); px(c, 25, 16, stitch);

  // ── Target painted on chest ──
  // Outer ring (red)
  bk(c, 21, 22, 8, 8, target);
  // Inner ring (white/cream)
  bk(c, 22, 23, 6, 6, targetWhite);
  // Middle ring (red)
  bk(c, 23, 24, 4, 4, target);
  // Bullseye
  bk(c, 24, 25, 2, 2, targetHi);

  // ── Straw tufts at seams ──
  // Neck
  px(c, 19, 18, straw); px(c, 20, 18, strawDk);
  px(c, 29, 18, strawDk); px(c, 30, 18, straw);
  // Waist
  px(c, 14, 36, straw); px(c, 35, 36, strawDk);
  px(c, 15, 37, strawDk);
  // Bottom
  px(c, 15, 39, straw); px(c, 34, 39, straw);
  px(c, 18, 40, strawDk);

  // ── Arms (small stub arms off shoulders) ──
  bk(c, 13, 20, 3, 6, burlapDk);
  bk(c, 14, 21, 2, 4, burlap);
  bk(c, 34, 20, 3, 6, burlapDk);
  bk(c, 34, 21, 2, 4, burlap);
  // Straw at arm ends
  px(c, 13, 25, straw);
  px(c, 37, 25, straw);

  // ── Stitched vertical seam down center of body ──
  px(c, 25, 20, stitch); px(c, 25, 22, stitch);
  px(c, 25, 30, stitch); px(c, 25, 32, stitch);
  px(c, 25, 34, stitch); px(c, 25, 36, stitch);
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
