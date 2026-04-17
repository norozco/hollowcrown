import { useInventoryStore } from '../state/inventoryStore';
import { useQuestStore } from '../state/questStore';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Ashenmere Marshes — fog-covered bog east of Ashenvale. Unlocked after
 * defeating the Hollow King. Winding raised paths over murky water,
 * dry islands with enemies, and a hermit who knows too much.
 *
 * Map is 40 tiles wide x 22 tiles tall = 1280x704 px.
 */

const MAP_W = 40;
const MAP_H = 22;

export class AshenmereScene extends BaseWorldScene {
  constructor() {
    super({ key: 'AshenmereScene' });
  }

  protected getZoneName(): string | null { return 'Ashenmere Marshes'; }

  protected getRandomEvents(): Array<() => void> {
    return [
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'Something surfaces in the water nearby. When you look, only ripples remain.',
        }));
      },
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'The fog thickens. For a moment, you see shapes — then nothing.',
        }));
      },
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'A firefly lands on your shoulder, glows once, and vanishes.',
        }));
      },
    ];
  }

  protected layout(): void {
    generateTileset(this);

    const mapData = buildMapData();
    const map = this.make.tilemap({
      data: mapData,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tileset')!;
    map.createLayer(0, tileset)!;

    // Water tiles block movement — scan and add physics bodies.
    const solidTiles = new Set<number>([T.WATER, T.BUSH]);
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        if (solidTiles.has(mapData[ty][tx])) {
          const w = this.add.rectangle(
            tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
          this.physics.add.existing(w, true);
          this.walls.add(w);
        }
      }
    }

    // ── Visual decorations ──

    // Fog effect — semi-transparent drifting rectangles
    for (const fog of FOGS) {
      const rect = this.add.rectangle(fog.x, fog.y, fog.w, fog.h, 0xcccccc, 0.08);
      rect.setDepth(50);
      this.tweens.add({
        targets: rect,
        x: rect.x + fog.dx,
        y: rect.y + fog.dy,
        alpha: { from: 0.06, to: 0.12 },
        duration: fog.dur,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Dead tree stumps — dark brown shapes
    for (const stump of STUMPS) {
      this.add.rectangle(stump.x, stump.y, 12, 18, 0x3a2210).setDepth(5);
      this.add.rectangle(stump.x, stump.y - 8, 16, 6, 0x2a1808).setDepth(5);
    }

    // Bubbling marsh — small circles that pulse in water areas
    for (const bub of BUBBLES) {
      const bubble = this.add.circle(bub.x, bub.y, 3, 0x506848, 0.4);
      bubble.setDepth(4);
      this.tweens.add({
        targets: bubble,
        scaleX: 1.8,
        scaleY: 1.8,
        alpha: 0,
        duration: 1200 + Math.random() * 800,
        delay: bub.delay,
        repeat: -1,
        ease: 'Quad.easeOut',
      });
    }

    // Fireflies — tiny yellow dots drifting slowly
    for (const ff of FIREFLIES) {
      const dot = this.add.circle(ff.x, ff.y, 2, 0xffe860, 0.7);
      dot.setDepth(55);
      this.tweens.add({
        targets: dot,
        x: dot.x + ff.dx,
        y: dot.y + ff.dy,
        alpha: { from: 0.3, to: 0.9 },
        duration: ff.dur,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // ── NPC: The Hermit (on the large central island) ──
    this.spawnNpc({
      key: 'hermit',
      dialogueId: 'hermit-greeting',
      x: 20 * TILE,
      y: 8 * TILE,
    });

    // ── Enemies ──
    // Bandits along the raised paths
    this.spawnEnemy({ monsterKey: 'bandit', x: 10 * TILE, y: 11 * TILE });
    this.spawnEnemy({ monsterKey: 'bandit', x: 25 * TILE, y: 14 * TILE });
    this.spawnEnemy({ monsterKey: 'bandit', x: 15 * TILE, y: 17 * TILE });
    // Wraiths over the water
    this.spawnEnemy({ monsterKey: 'wraith', x: 8 * TILE, y: 6 * TILE });
    this.spawnEnemy({ monsterKey: 'wraith', x: 30 * TILE, y: 5 * TILE });
    // Hollow knight guarding eastern approach
    this.spawnEnemy({ monsterKey: 'hollow_knight', x: 33 * TILE, y: 11 * TILE });

    // ── Loot bags ──
    this.spawnLootBag({
      x: 22 * TILE, y: 16 * TILE,
      loot: [
        { itemKey: 'shadow_essence', weight: 3 },
        { itemKey: 'wraith_dust', weight: 2 },
        { itemKey: 'troll_heart', weight: 1 },
      ],
      gold: 30, spawnChance: 0.15,
    });
    this.spawnLootBag({
      x: 12 * TILE, y: 7 * TILE,
      loot: [
        { itemKey: 'shadow_essence', weight: 2 },
        { itemKey: 'troll_heart', weight: 2 },
        { itemKey: 'wraith_dust', weight: 2 },
      ],
      gold: 25, spawnChance: 0.15,
    });

    // ── Material pickups ──
    // Moonpetal in a damp area
    const moonpetal = this.add.circle(18 * TILE, 5 * TILE, 7, 0x40a848);
    moonpetal.setStrokeStyle(2, 0x8040c0);
    moonpetal.setDepth(6);
    this.spawnInteractable({
      sprite: moonpetal as any, label: 'Gather moonpetal', radius: 20,
      action: () => {
        this.spawnPickupParticles(moonpetal.x, moonpetal.y, 0x60c060);
        useInventoryStore.getState().addItem('moonpetal');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found moonpetal!' }));
        moonpetal.destroy();
      },
    });

    // Iron ore on a rocky island
    const ironOre = this.add.circle(28 * TILE, 17 * TILE, 8, 0x808080);
    ironOre.setStrokeStyle(2, 0x606060);
    ironOre.setDepth(6);
    this.spawnInteractable({
      sprite: ironOre as any, label: 'Pick up iron ore', radius: 20,
      action: () => {
        this.spawnPickupParticles(ironOre.x, ironOre.y, 0x60c060);
        useInventoryStore.getState().addItem('iron_ore');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found iron ore!' }));
        ironOre.destroy();
      },
    });

    // ── Lore interactables ──

    // Submerged rooftop (in the water, east side of the central island)
    const subRoof = this.add.circle(24 * TILE, 4 * TILE, 5, 0xa09878, 0.6);
    subRoof.setDepth(6);
    this.spawnInteractable({
      sprite: subRoof as any,
      label: 'Examine submerged structure',
      radius: 20,
      action: () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'Stone tiles just beneath the water. A chimney, half-collapsed. Someone lived here once.',
        }));
      },
    });

    // Warning post at the marsh edge (west side near entrance)
    const warnPost = this.add.rectangle(4 * TILE, 8 * TILE, 4, 28, 0x5a3a1a);
    warnPost.setDepth(6);
    const warnCloth = this.add.rectangle(4 * TILE + 8, 8 * TILE - 4, 16, 10, 0x6a3030);
    warnCloth.setAlpha(0.7);
    warnCloth.setDepth(6);
    this.spawnInteractable({
      sprite: warnPost as any,
      label: 'Examine warning post',
      radius: 20,
      action: () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'A post driven into the mud. Cloth wrapped around it, faded. It might have been red once.',
        }));
      },
    });

    // ── Torn Journal Page (on the south-east island, walkable at 28,16) ──
    // Only visible if the scholars-trail quest is active and journal not yet found.
    const questState = useQuestStore.getState().active['scholars-trail'];
    const journalFound = questState?.completedObjectiveIds.includes('find-journal');
    if (questState && !journalFound) {
      const journalSprite = this.add.rectangle(28 * TILE, 16 * TILE, 14, 10, 0xd8d0b0);
      journalSprite.setStrokeStyle(1, 0xa09868);
      journalSprite.setDepth(8);
      // Ink marks on the page
      this.add.rectangle(28 * TILE - 3, 16 * TILE - 2, 6, 1, 0x404040, 0.5).setDepth(8);
      this.add.rectangle(28 * TILE - 1, 16 * TILE, 8, 1, 0x404040, 0.4).setDepth(8);
      this.add.rectangle(28 * TILE - 2, 16 * TILE + 2, 5, 1, 0x404040, 0.3).setDepth(8);
      this.spawnInteractable({
        sprite: journalSprite as any, label: 'Pick up torn journal page', radius: 24,
        action: () => {
          useInventoryStore.getState().addItem('torn_journal');
          useQuestStore.getState().completeObjective('scholars-trail', 'find-journal');
          window.dispatchEvent(new CustomEvent('gameMessage', {
            detail: 'Found a torn journal page. The handwriting is Elven.',
          }));
          journalSprite.destroy();
        },
      });
    }

    // ── Drowned Sanctum entrance (submerged stairway on the south-west island, at 15,17) ──
    const sanctumEntranceX = 15 * TILE;
    const sanctumEntranceY = 17 * TILE;
    // Visual: submerged steps (dark rectangle with water sheen)
    const stepsVisual = this.add.rectangle(sanctumEntranceX, sanctumEntranceY, TILE * 1.5, TILE * 1.2, 0x304040);
    stepsVisual.setStrokeStyle(2, 0x205050);
    stepsVisual.setDepth(3);
    // Step lines
    this.add.rectangle(sanctumEntranceX, sanctumEntranceY - 6, TILE, 2, 0x406060, 0.5).setDepth(4);
    this.add.rectangle(sanctumEntranceX, sanctumEntranceY, TILE, 2, 0x385858, 0.5).setDepth(4);
    this.add.rectangle(sanctumEntranceX, sanctumEntranceY + 6, TILE, 2, 0x304848, 0.4).setDepth(4);
    // Label
    this.add.text(sanctumEntranceX, sanctumEntranceY - 22, 'Submerged Stairway', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#508888',
    }).setOrigin(0.5).setAlpha(0.6).setDepth(15);

    // Exit zone that transitions to the sanctum
    this.addExit({
      x: sanctumEntranceX - TILE * 0.75,
      y: sanctumEntranceY - TILE * 0.6,
      w: TILE * 1.5,
      h: TILE * 1.2,
      targetScene: 'DrownedSanctumF1Scene',
      targetSpawn: 'fromAshenmere',
      label: '',
    });

    // ── Exits ──
    // West edge → back to Town
    this.addExit({
      x: 0,
      y: 9 * TILE,
      w: TILE,
      h: 4 * TILE,
      targetScene: 'TownScene',
      targetSpawn: 'fromAshenmere',
      label: '← Ashenvale',
    });

    // Eastern teaser exit — shows "coming soon" message, does NOT transition
    const teaserSign = this.add.text(
      WORLD_W - 2 * TILE, 11 * TILE, '??? — The path continues',
      {
        fontFamily: 'Courier New', fontSize: '11px', color: '#7a6a4a',
      },
    ).setOrigin(0.5).setAlpha(0.7).setDepth(15);

    const teaserSprite = this.add.rectangle(WORLD_W - TILE, 11 * TILE, TILE, 3 * TILE, 0x000000, 0);
    teaserSprite.setDepth(1);
    this.spawnInteractable({
      sprite: teaserSprite as any,
      label: 'Peer into the mist',
      radius: 36,
      action: () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'The marsh stretches on. Whatever waits beyond is not yet ready to be found.',
        }));
      },
    });
    void teaserSign;

    // Zone marker
    this.add
      .text(WORLD_W / 2, WORLD_H - TILE * 2, 'ASHENMERE MARSHES', {
        fontFamily: 'Courier New', fontSize: '12px', color: '#5a6848',
      })
      .setOrigin(0.5).setAlpha(0.4).setDepth(15);
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromSanctum':
        return { x: 15 * TILE, y: 16 * TILE };
      case 'fromTown':
      case 'default':
        return { x: 3 * TILE, y: 11 * TILE };
      default:
        return { x: 3 * TILE, y: 11 * TILE };
    }
  }
}

// ─── Decoration data ──────────────────────────────────────────

const FOGS = [
  { x: 200, y: 120, w: 300, h: 100, dx: 60, dy: 10, dur: 8000 },
  { x: 700, y: 80, w: 250, h: 120, dx: -40, dy: 15, dur: 10000 },
  { x: 400, y: 400, w: 350, h: 90, dx: 50, dy: -10, dur: 9000 },
  { x: 1000, y: 300, w: 280, h: 110, dx: -30, dy: 20, dur: 11000 },
  { x: 150, y: 550, w: 320, h: 80, dx: 40, dy: -15, dur: 7500 },
];

const STUMPS = [
  { x: 6 * TILE, y: 4 * TILE },
  { x: 14 * TILE, y: 13 * TILE },
  { x: 32 * TILE, y: 8 * TILE },
  { x: 24 * TILE, y: 3 * TILE },
  { x: 36 * TILE, y: 18 * TILE },
  { x: 9 * TILE, y: 19 * TILE },
];

const BUBBLES = [
  { x: 5 * TILE, y: 7 * TILE, delay: 0 },
  { x: 12 * TILE, y: 3 * TILE, delay: 400 },
  { x: 26 * TILE, y: 6 * TILE, delay: 800 },
  { x: 34 * TILE, y: 4 * TILE, delay: 200 },
  { x: 8 * TILE, y: 16 * TILE, delay: 600 },
  { x: 30 * TILE, y: 19 * TILE, delay: 1000 },
  { x: 16 * TILE, y: 20 * TILE, delay: 300 },
  { x: 22 * TILE, y: 2 * TILE, delay: 700 },
];

const FIREFLIES = [
  { x: 10 * TILE, y: 5 * TILE, dx: 15, dy: -10, dur: 3000 },
  { x: 22 * TILE, y: 9 * TILE, dx: -12, dy: 8, dur: 3500 },
  { x: 35 * TILE, y: 14 * TILE, dx: 10, dy: -6, dur: 2800 },
  { x: 5 * TILE, y: 18 * TILE, dx: -8, dy: 12, dur: 4000 },
  { x: 28 * TILE, y: 3 * TILE, dx: 14, dy: 5, dur: 3200 },
  { x: 17 * TILE, y: 15 * TILE, dx: -10, dy: -8, dur: 3800 },
  { x: 38 * TILE, y: 7 * TILE, dx: 6, dy: 10, dur: 2600 },
];

// ─── Map data builder ─────────────────────────────────────────

function buildMapData(): number[][] {
  const rows: number[][] = [];
  for (let y = 0; y < MAP_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_W; x++) {
      row.push(tileAt(x, y));
    }
    rows.push(row);
  }
  return rows;
}

/** Tile aliases. */
const Wa = T.WATER;
const MS = T.MOSS_STONE;
const FC = T.FLOOR_CRACKED;
const P  = T.PATH;
const PE = T.PATH_EDGE;
const BU = T.BUSH;

function tileAt(x: number, y: number): number {
  // ── West entrance path (from Town) — rows 9-12, cols 0-5 ──
  if (x <= 5 && y >= 9 && y <= 12) return P;
  if (x <= 5 && (y === 8 || y === 13)) return PE;

  // ── Main raised path winding west to east ──

  // Segment 1: west entrance connects south-east (cols 5-10, rows 11-13)
  if (x >= 5 && x <= 10 && y >= 11 && y <= 12) return MS;

  // Segment 2: path curves north (cols 10-12, rows 7-11)
  if (x >= 10 && x <= 12 && y >= 7 && y <= 11) return MS;

  // ── Central island (dry land with NPC) — cols 17-23, rows 6-10 ──
  if (x >= 17 && x <= 23 && y >= 6 && y <= 10) return FC;
  // Path bridge to island from west (cols 12-17, rows 8-9)
  if (x >= 12 && x <= 17 && y >= 8 && y <= 9) return MS;

  // Segment 3: path east from island (cols 23-28, rows 8-9)
  if (x >= 23 && x <= 28 && y >= 8 && y <= 9) return MS;

  // Segment 4: path curves south-east (cols 28-30, rows 9-14)
  if (x >= 28 && x <= 30 && y >= 9 && y <= 14) return MS;

  // ── South-east island (rocky) — cols 26-30, rows 15-18 ──
  if (x >= 26 && x <= 30 && y >= 15 && y <= 18) return FC;

  // Path connecting south from segment 4 to SE island
  if (x >= 28 && x <= 30 && y >= 14 && y <= 15) return MS;

  // ── South-west island — cols 13-17, rows 15-18 ──
  if (x >= 13 && x <= 17 && y >= 15 && y <= 18) return FC;
  // Path from west path down to SW island (cols 10-13, rows 12-16)
  if (x >= 10 && x <= 11 && y >= 12 && y <= 17) return MS;
  if (x >= 11 && x <= 13 && y >= 16 && y <= 17) return MS;

  // ── Eastern approach to teaser exit (cols 30-39, rows 10-12) ──
  if (x >= 30 && x <= 39 && y >= 10 && y <= 12) return MS;

  // ── Dead/twisted bushes (sparse) ──
  if (x === 7 && y === 5) return BU;
  if (x === 15 && y === 2) return BU;
  if (x === 33 && y === 3) return BU;
  if (x === 25 && y === 20) return BU;
  if (x === 3 && y === 17) return BU;

  // ── Everything else is marsh water ──
  return Wa;
}
