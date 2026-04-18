import { useInventoryStore } from '../state/inventoryStore';
import { useLoreStore } from '../state/loreStore';
import { useDungeonItemStore } from '../state/dungeonItemStore';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * The Ashfields — volcanic wasteland east of Ashenmere. Cracked earth,
 * lava pools, ash clouds, dead black trees. Oppressive heat. Lv 10-14.
 *
 * Map is 40 tiles wide x 22 tiles tall = 1280x704 px.
 */

const MAP_W = 40;
const MAP_H = 22;

export class AshfieldsScene extends BaseWorldScene {
  constructor() {
    super({ key: 'AshfieldsScene' });
  }

  protected getZoneName(): string | null { return 'The Ashfields'; }

  protected getRandomEvents(): Array<() => void> {
    return [
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'An ash storm rolls through. The air turns grey and thick.',
        }));
      },
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'The ground trembles. Somewhere below, something shifts.',
        }));
      },
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'A plume of sulphur rises from a crack in the earth. Your eyes sting.',
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

    // Lava + wall collision
    const solidTiles = new Set<number>([T.LAVA, T.WALL_STONE]);
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

    // Heat haze effect — semi-transparent drifting rectangles
    for (const haze of HEAT_HAZES) {
      const rect = this.add.rectangle(haze.x, haze.y, haze.w, haze.h, 0xe08040, 0.04);
      rect.setDepth(50);
      this.tweens.add({
        targets: rect,
        x: rect.x + haze.dx,
        y: rect.y + haze.dy,
        alpha: { from: 0.02, to: 0.06 },
        duration: haze.dur,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Dead tree stumps — dark charred shapes
    for (const stump of STUMPS) {
      this.add.rectangle(stump.x, stump.y, 10, 20, 0x1a1008).setDepth(5);
      this.add.rectangle(stump.x, stump.y - 10, 14, 5, 0x100a04).setDepth(5);
    }

    // Lava glow — pulsing orange circles near lava pools
    for (const glow of LAVA_GLOWS) {
      const g = this.add.circle(glow.x, glow.y, 20, 0xe06020, 0.06);
      g.setDepth(2);
      this.tweens.add({
        targets: g,
        scale: 1.4,
        alpha: 0.02,
        duration: 2000 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Ember particles — tiny orange dots drifting upward
    for (const em of EMBERS) {
      const dot = this.add.circle(em.x, em.y, 1.5, 0xf0a030, 0.8);
      dot.setDepth(55);
      this.tweens.add({
        targets: dot,
        x: dot.x + em.dx,
        y: dot.y + em.dy,
        alpha: { from: 0.5, to: 0 },
        duration: em.dur,
        yoyo: false,
        repeat: -1,
        ease: 'Quad.easeOut',
      });
    }

    // ── Waypoint stone near entrance ──
    const wpX = 4 * TILE;
    const wpY = 11 * TILE;
    const wpStone = this.add.rectangle(wpX, wpY, 28, 28, 0x6080b0);
    wpStone.setStrokeStyle(2, 0x4060a0);
    wpStone.setDepth(7);
    const wpGlow = this.add.circle(wpX, wpY, 20, 0x80a0e0, 0.15);
    wpGlow.setDepth(6);
    this.tweens.add({ targets: wpGlow, scale: 1.3, alpha: 0.05, duration: 2000, yoyo: true, repeat: -1 });
    this.add.text(wpX, wpY - 22, 'Waypoint', {
      fontFamily: 'Courier New', fontSize: '9px', color: '#80a0e0',
    }).setOrigin(0.5).setDepth(8);
    this.spawnInteractable({
      sprite: wpStone as any,
      label: 'Use waypoint',
      radius: 24,
      action: () => {
        window.dispatchEvent(new CustomEvent('openFastTravel', { detail: { currentScene: this.scene.key } }));
      },
    });

    // ── Enemies ──
    // Fire elementals patrolling paths
    this.spawnEnemy({ monsterKey: 'fire_elemental', x: 10 * TILE, y: 11 * TILE });
    this.spawnEnemy({ monsterKey: 'fire_elemental', x: 18 * TILE, y: 8 * TILE });
    this.spawnEnemy({ monsterKey: 'fire_elemental', x: 28 * TILE, y: 14 * TILE });
    // Lava drakes near lava pools
    this.spawnEnemy({ monsterKey: 'lava_drake', x: 14 * TILE, y: 5 * TILE });
    this.spawnEnemy({ monsterKey: 'lava_drake', x: 30 * TILE, y: 8 * TILE });
    // Ash wraith floating through the wasteland
    this.spawnEnemy({ monsterKey: 'ash_wraith', x: 22 * TILE, y: 16 * TILE });

    // ── Material pickups ──
    // Shadow essence
    const shadowEss = this.add.circle(12 * TILE, 14 * TILE, 7, 0x604080);
    shadowEss.setStrokeStyle(2, 0x8040c0);
    shadowEss.setDepth(6);
    this.spawnInteractable({
      sprite: shadowEss as any, label: 'Gather shadow essence', radius: 20,
      action: () => {
        this.spawnPickupParticles(shadowEss.x, shadowEss.y, 0x8060c0);
        useInventoryStore.getState().addItem('shadow_essence');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found shadow essence!' }));
        shadowEss.destroy();
      },
    });

    // Iron ore
    const ironOre = this.add.circle(32 * TILE, 17 * TILE, 8, 0x808080);
    ironOre.setStrokeStyle(2, 0x606060);
    ironOre.setDepth(6);
    this.spawnInteractable({
      sprite: ironOre as any, label: 'Pick up iron ore', radius: 20,
      action: () => {
        this.spawnPickupParticles(ironOre.x, ironOre.y, 0x808080);
        useInventoryStore.getState().addItem('iron_ore');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found iron ore!' }));
        ironOre.destroy();
      },
    });

    // ── Loot bag (20%) ──
    this.spawnLootBag({
      x: 25 * TILE, y: 12 * TILE,
      loot: [
        { itemKey: 'shadow_essence', weight: 3 },
        { itemKey: 'troll_heart', weight: 2 },
        { itemKey: 'iron_ore', weight: 2 },
      ],
      gold: 25, spawnChance: 0.2,
    });

    // ── Lore interactables ──

    // Charred signpost
    const signpost = this.add.rectangle(8 * TILE, 9 * TILE, 4, 24, 0x1a1008);
    signpost.setDepth(6);
    this.add.rectangle(8 * TILE + 8, 9 * TILE - 4, 14, 8, 0x2a1810).setAlpha(0.7).setDepth(6);
    this.spawnInteractable({
      sprite: signpost as any,
      label: 'Examine charred signpost',
      radius: 20,
      action: () => {
        useLoreStore.getState().discover({
          key: 'charred-signpost-ashfields',
          title: 'Charred Signpost',
          text: 'The wood is black. Letters burned into it: "TURN BACK." Someone did not listen.',
          location: 'The Ashfields',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'The wood is black. Letters burned into it: "TURN BACK." Someone did not listen.',
        }));
      },
    });

    // Collapsed building foundation
    const foundation = this.add.rectangle(26 * TILE, 5 * TILE, 48, 32, 0x383028, 0.6);
    foundation.setStrokeStyle(1, 0x282018);
    foundation.setDepth(3);
    this.add.rectangle(26 * TILE - 12, 5 * TILE + 4, 8, 12, 0x302818, 0.4).setDepth(3);
    this.spawnInteractable({
      sprite: foundation as any,
      label: 'Examine ruins',
      radius: 24,
      action: () => {
        useLoreStore.getState().discover({
          key: 'collapsed-foundation-ashfields',
          title: 'Collapsed Foundation',
          text: 'Stone walls, heat-cracked. A dwelling, once. The hearth is cold now — but the ground beneath it is not.',
          location: 'The Ashfields',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'Stone walls, heat-cracked. A dwelling, once. The hearth is cold now — but the ground beneath it is not.',
        }));
      },
    });

    // ── Fairy Fountain (hidden behind rocks, east side) ──
    this.spawnFairyFountain({ x: 37 * TILE, y: 18 * TILE });

    // ── Heart piece (hidden behind rocks, east dead end) ──
    this.spawnHeartPiece(38 * TILE, 19 * TILE);

    // ── Ashen Tower entrance (central plateau) ──
    const towerX = 20 * TILE;
    const towerY = 11 * TILE;
    const towerEntry = this.add.rectangle(towerX, towerY, TILE * 2, TILE * 1.5, 0x302820);
    towerEntry.setStrokeStyle(2, 0x504030);
    towerEntry.setDepth(3);
    // Tower arch
    this.add.rectangle(towerX, towerY - TILE * 0.75 - 4, TILE * 2.2, 8, 0x484030).setDepth(4);
    this.add.text(towerX, towerY - TILE, '\u25BC Ashen Tower [Lv 11-14]', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#c08040',
    }).setOrigin(0.5).setAlpha(0.7).setDepth(15);
    this.addExit({
      x: towerX - TILE,
      y: towerY - TILE * 0.75,
      w: TILE * 2,
      h: TILE * 1.5,
      targetScene: 'AshenTowerF1Scene',
      targetSpawn: 'fromAshfields',
      label: '',
    });

    // ── Exits ──
    // West edge → back to Ashenmere
    this.addExit({
      x: 0,
      y: 9 * TILE,
      w: TILE,
      h: 4 * TILE,
      targetScene: 'AshenmereScene',
      targetSpawn: 'fromAshfields',
      label: '\u2190 Ashenmere Marshes',
    });

    // East edge → The Shattered Coast (gated on mirror_shard + flame_amulet)
    const hasMirror = useDungeonItemStore.getState().has('mirror_shard');
    const hasFlame = useDungeonItemStore.getState().has('flame_amulet');
    if (hasMirror && hasFlame) {
      this.addExit({
        x: MAP_W * TILE - TILE,
        y: 3 * TILE,
        w: TILE,
        h: 4 * TILE,
        targetScene: 'ShatteredCoastScene',
        targetSpawn: 'fromAshfields',
        label: '\u2192 The Shattered Coast',
      });
    } else {
      // Blocked path marker
      const blockX = MAP_W * TILE - 2 * TILE;
      const blockY = 5 * TILE;
      const blockSign = this.add.rectangle(blockX, blockY, 24, 24, 0x484048, 0.5);
      blockSign.setStrokeStyle(1, 0x606060);
      blockSign.setDepth(6);
      this.spawnInteractable({
        sprite: blockSign as any,
        label: 'Examine blocked path',
        radius: 24,
        action: () => {
          window.dispatchEvent(new CustomEvent('gameMessage', {
            detail: 'The path ahead resists you. You are not ready.',
          }));
        },
      });
    }

    // Zone marker
    this.add
      .text(WORLD_W / 2, WORLD_H - TILE * 2, 'THE ASHFIELDS', {
        fontFamily: 'Courier New', fontSize: '12px', color: '#8a5a30',
      })
      .setOrigin(0.5).setAlpha(0.4).setDepth(15);
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromTower':
        return { x: 20 * TILE, y: 13 * TILE };
      case 'fromCoast':
        return { x: (MAP_W - 3) * TILE, y: 5 * TILE };
      case 'fromAshenmere':
      case 'default':
        return { x: 3 * TILE, y: 11 * TILE };
      default:
        return { x: 3 * TILE, y: 11 * TILE };
    }
  }
}

// ─── Decoration data ──────────────────────────────────────────

const HEAT_HAZES = [
  { x: 200, y: 100, w: 280, h: 80, dx: 40, dy: 8, dur: 7000 },
  { x: 600, y: 150, w: 320, h: 100, dx: -30, dy: 12, dur: 9000 },
  { x: 400, y: 350, w: 300, h: 70, dx: 50, dy: -6, dur: 8000 },
  { x: 900, y: 250, w: 260, h: 90, dx: -35, dy: 10, dur: 10000 },
  { x: 150, y: 500, w: 300, h: 60, dx: 30, dy: -10, dur: 6500 },
];

const STUMPS = [
  { x: 6 * TILE, y: 5 * TILE },
  { x: 15 * TILE, y: 3 * TILE },
  { x: 24 * TILE, y: 18 * TILE },
  { x: 34 * TILE, y: 6 * TILE },
  { x: 8 * TILE, y: 17 * TILE },
  { x: 30 * TILE, y: 12 * TILE },
];

const LAVA_GLOWS = [
  { x: 10 * TILE, y: 4 * TILE },
  { x: 16 * TILE, y: 6 * TILE },
  { x: 5 * TILE, y: 16 * TILE },
  { x: 28 * TILE, y: 3 * TILE },
  { x: 34 * TILE, y: 10 * TILE },
  { x: 22 * TILE, y: 19 * TILE },
];

const EMBERS = [
  { x: 8 * TILE, y: 6 * TILE, dx: 6, dy: -20, dur: 2500 },
  { x: 16 * TILE, y: 8 * TILE, dx: -4, dy: -18, dur: 3000 },
  { x: 24 * TILE, y: 4 * TILE, dx: 8, dy: -22, dur: 2800 },
  { x: 32 * TILE, y: 10 * TILE, dx: -6, dy: -16, dur: 3200 },
  { x: 12 * TILE, y: 16 * TILE, dx: 5, dy: -20, dur: 2600 },
  { x: 28 * TILE, y: 18 * TILE, dx: -8, dy: -24, dur: 2400 },
  { x: 20 * TILE, y: 12 * TILE, dx: 4, dy: -18, dur: 3400 },
  { x: 36 * TILE, y: 14 * TILE, dx: -5, dy: -20, dur: 2900 },
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
const FC = T.FLOOR_CRACKED;
const LV = T.LAVA;
const WS = T.WALL_STONE;
const BS = T.BLOOD_STONE;

function tileAt(x: number, y: number): number {
  // ── West entrance path (from Ashenmere) — rows 9-12, cols 0-5 ──
  if (x <= 5 && y >= 9 && y <= 12) return FC;

  // ── Main winding path through lava fields ──

  // Segment 1: west entrance east (cols 5-10, rows 10-12)
  if (x >= 5 && x <= 10 && y >= 10 && y <= 12) return FC;
  // Scorched earth patches near entrance
  if (x >= 6 && x <= 8 && y >= 8 && y <= 9) return BS;

  // Segment 2: path curves north (cols 10-13, rows 7-10)
  if (x >= 10 && x <= 13 && y >= 7 && y <= 10) return FC;

  // Segment 3: east toward central plateau (cols 13-18, rows 8-10)
  if (x >= 13 && x <= 18 && y >= 8 && y <= 10) return FC;

  // ── Central plateau (Ashen Tower entrance) — cols 18-23, rows 8-14 ──
  if (x >= 18 && x <= 23 && y >= 8 && y <= 14) return FC;
  // Scorched patches on plateau
  if (x >= 19 && x <= 21 && y >= 12 && y <= 13) return BS;

  // Segment 4: path continues east from plateau (cols 23-28, rows 10-12)
  if (x >= 23 && x <= 28 && y >= 10 && y <= 12) return FC;

  // Segment 5: path curves south-east (cols 28-32, rows 12-16)
  if (x >= 28 && x <= 32 && y >= 12 && y <= 16) return FC;

  // Segment 6: south path (cols 24-28, rows 14-18)
  if (x >= 24 && x <= 28 && y >= 14 && y <= 18) return FC;
  // Scorched patches
  if (x >= 25 && x <= 27 && y >= 16 && y <= 17) return BS;

  // ── Eastern dead end with fairy fountain (cols 35-39, rows 16-20) ──
  if (x >= 35 && x <= 39 && y >= 16 && y <= 20) return FC;
  // Path connecting east area (cols 32-35, rows 16-18)
  if (x >= 32 && x <= 35 && y >= 16 && y <= 18) return FC;

  // ── Lava pools ──
  // Large north-west pool
  if (x >= 6 && x <= 10 && y >= 2 && y <= 6) return LV;
  // Large north-east pool
  if (x >= 26 && x <= 32 && y >= 2 && y <= 6) return LV;
  // Mid-west pool
  if (x >= 3 && x <= 6 && y >= 14 && y <= 18) return LV;
  // Central-south pool
  if (x >= 14 && x <= 18 && y >= 16 && y <= 20) return LV;
  // East pool
  if (x >= 33 && x <= 36 && y >= 8 && y <= 12) return LV;
  // Small south pool
  if (x >= 20 && x <= 23 && y >= 18 && y <= 21) return LV;

  // ── Rocky outcroppings (walls) ──
  // North border rocks
  if (y <= 1 && (x <= 4 || (x >= 12 && x <= 16) || x >= 36)) return WS;
  // South border rocks
  if (y >= 20 && (x <= 8 || (x >= 10 && x <= 14) || (x >= 30 && x <= 34))) return WS;
  // Scattered interior rocks
  if (x >= 14 && x <= 16 && y >= 4 && y <= 6) return WS;
  if (x >= 34 && x <= 36 && y >= 14 && y <= 15) return WS;

  // ── Default: cracked volcanic ground ──
  return FC;
}
