import { useInventoryStore } from '../state/inventoryStore';
import { useLoreStore } from '../state/loreStore';
import { useQuestStore } from '../state/questStore';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * The Shattered Coast — 40x22 map. Coastal cliffs overlooking a dark sea.
 * Crashed ships, jagged rocks, a ruined fortress. The end of the world.
 * The Crownless One's power radiates from below.
 *
 * Access: from Ashfields east edge, gated on mirror_shard + flame_amulet.
 */

const MAP_W = 40;
const MAP_H = 22;

export class ShatteredCoastScene extends BaseWorldScene {
  constructor() {
    super({ key: 'ShatteredCoastScene' });
  }

  protected getZoneName(): string | null { return 'The Shattered Coast'; }

  protected getRandomEvents(): Array<() => void> {
    return [
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'The sea crashes against the cliffs. Something below the water answers.',
        }));
      },
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'A cold wind blows from the fortress. It carries no salt — only silence.',
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

    // Solid tile collision
    const solidTiles = new Set<number>([T.WALL_STONE, T.WATER]);
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

    // Sea foam — white dots along water edges
    const foamPositions = [
      { x: 6 * TILE, y: 13 * TILE }, { x: 10 * TILE, y: 14 * TILE },
      { x: 18 * TILE, y: 15 * TILE }, { x: 26 * TILE, y: 14 * TILE },
      { x: 34 * TILE, y: 15 * TILE }, { x: 14 * TILE, y: 16 * TILE },
    ];
    for (const f of foamPositions) {
      const foam = this.add.circle(f.x, f.y, 3, 0xd0e0f0, 0.3);
      foam.setDepth(4);
      this.tweens.add({
        targets: foam, alpha: { from: 0.15, to: 0.4 }, x: foam.x + 4,
        duration: 2000 + Math.random() * 1000, yoyo: true, repeat: -1,
      });
    }

    // Wrecked ship hulls (decorative rectangles on the water)
    // Ship 1 — southeast
    this.add.rectangle(10 * TILE, 18 * TILE, TILE * 3, TILE * 1.5, 0x3a2810, 0.6).setDepth(3);
    this.add.rectangle(10 * TILE, 17.5 * TILE, TILE * 0.3, TILE * 2, 0x2a1808, 0.5).setDepth(3);
    // Ship 2 — south center
    this.add.rectangle(22 * TILE, 19 * TILE, TILE * 4, TILE * 1.2, 0x3a2810, 0.5).setDepth(3);
    this.add.rectangle(21 * TILE, 18.5 * TILE, TILE * 0.3, TILE * 2, 0x2a1808, 0.4).setDepth(3);

    // Cliff mist
    for (let i = 0; i < 5; i++) {
      const mist = this.add.circle(
        6 * TILE + i * 8 * TILE, 12 * TILE, 30, 0x405060, 0.06);
      mist.setDepth(50);
      this.tweens.add({
        targets: mist, x: mist.x + 20, alpha: 0.02,
        duration: 5000 + i * 1000, yoyo: true, repeat: -1,
      });
    }

    // ── Waypoint stone near entrance ──
    const wpX = 4 * TILE;
    const wpY = 5 * TILE;
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
    this.spawnEnemy({ monsterKey: 'ember_knight', x: 12 * TILE, y: 5 * TILE });
    this.spawnEnemy({ monsterKey: 'ember_knight', x: 28 * TILE, y: 6 * TILE });
    this.spawnEnemy({ monsterKey: 'wraith', x: 18 * TILE, y: 4 * TILE });
    this.spawnEnemy({ monsterKey: 'wraith', x: 32 * TILE, y: 8 * TILE });
    this.spawnEnemy({ monsterKey: 'hollow_knight', x: 24 * TILE, y: 9 * TILE });

    // ── Fairy Fountain (hidden near cliffs) ──
    this.spawnFairyFountain({ x: 36 * TILE, y: 4 * TILE });

    // ── Material pickups ──
    const shadowEss = this.add.circle(16 * TILE, 8 * TILE, 7, 0x604080);
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

    const trollHeart = this.add.circle(30 * TILE, 4 * TILE, 7, 0x804040);
    trollHeart.setStrokeStyle(2, 0xa06060);
    trollHeart.setDepth(6);
    this.spawnInteractable({
      sprite: trollHeart as any, label: 'Pick up troll heart', radius: 20,
      action: () => {
        this.spawnPickupParticles(trollHeart.x, trollHeart.y, 0xa06060);
        useInventoryStore.getState().addItem('troll_heart');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found troll heart!' }));
        trollHeart.destroy();
      },
    });

    // ── Lore interactables ──
    const shipLore = this.add.rectangle(22 * TILE, 17 * TILE, 20, 16, 0x3a2810, 0.7);
    shipLore.setDepth(6);
    this.spawnInteractable({
      sprite: shipLore as any,
      label: 'Examine wreckage',
      radius: 24,
      action: () => {
        useLoreStore.getState().discover({
          key: 'wrecked-ships-coast',
          title: 'The Wrecked Ships',
          text: 'The ships came to destroy it. The sea destroyed them instead.',
          location: 'The Shattered Coast',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'The ships came to destroy it. The sea destroyed them instead.',
        }));
      },
    });

    const throneLore = this.add.rectangle(26 * TILE, 3 * TILE, 20, 20, 0x484040, 0.6);
    throneLore.setStrokeStyle(1, 0x383030);
    throneLore.setDepth(6);
    this.spawnInteractable({
      sprite: throneLore as any,
      label: 'Read inscription',
      radius: 22,
      action: () => {
        useLoreStore.getState().discover({
          key: 'throne-inscription-coast',
          title: 'The Throne Beneath',
          text: 'A throne was built beneath the sea. The one who sat on it ruled nothing — and that was the point.',
          location: 'The Shattered Coast',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'A throne was built beneath the sea. The one who sat on it ruled nothing — and that was the point.',
        }));
      },
    });

    // ── Loot bag ──
    this.spawnLootBag({
      x: 20 * TILE, y: 7 * TILE,
      loot: [
        { itemKey: 'shadow_essence', weight: 3 },
        { itemKey: 'troll_heart', weight: 2 },
        { itemKey: 'health_potion', weight: 2 },
      ],
      gold: 40, spawnChance: 0.3,
    });

    // ── Heart piece ──
    this.spawnHeartPiece(38 * TILE, 3 * TILE);

    // ── Watcher ──
    this.spawnWatcher(8 * TILE, 3 * TILE);

    // ── Ruined fortress walls (center-east) ──
    // Crumbling outer walls
    this.addWall(26 * TILE, 5 * TILE, TILE * 8, TILE * 0.5, 0x484048, 0x303030);
    this.addWall(26 * TILE, 10 * TILE, TILE * 8, TILE * 0.5, 0x484048, 0x303030);
    this.addWall(26 * TILE, 5 * TILE, TILE * 0.5, TILE * 5, 0x484048, 0x303030);
    this.addWall(33.5 * TILE, 5 * TILE, TILE * 0.5, TILE * 2, 0x484048, 0x303030);
    this.addWall(33.5 * TILE, 8 * TILE, TILE * 0.5, TILE * 2.5, 0x484048, 0x303030);

    // ── The Throne Beneath entrance (massive pit in fortress center) ──
    const pitX = 30 * TILE;
    const pitY = 7.5 * TILE;
    const pit = this.add.circle(pitX, pitY, 20, 0x0a0810, 0.9);
    pit.setStrokeStyle(2, 0x1a1028);
    pit.setDepth(3);
    // Purple energy glow from pit
    const pitGlow = this.add.circle(pitX, pitY, 28, 0x4020a0, 0.1);
    pitGlow.setDepth(2);
    this.tweens.add({ targets: pitGlow, scale: 1.4, alpha: 0.03, duration: 2500, yoyo: true, repeat: -1 });
    this.add.text(pitX, pitY - 28, '\u25BC The Throne Beneath [Lv 15+]', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#8060c0',
    }).setOrigin(0.5).setAlpha(0.7).setDepth(15);
    this.addExit({
      x: pitX - TILE,
      y: pitY - TILE * 0.75,
      w: TILE * 2,
      h: TILE * 1.5,
      targetScene: 'ThroneBeneathF1Scene',
      targetSpawn: 'fromCoast',
      label: '',
    });

    // ── Complete quest objective on arrival ──
    const qs = useQuestStore.getState();
    if (qs.active['the-final-gate'] && !qs.active['the-final-gate'].isComplete) {
      qs.completeObjective('the-final-gate', 'travel-to-coast');
    }
    if (qs.active['the-crownless-one'] && !qs.active['the-crownless-one'].completedObjectiveIds.includes('reach-coast')) {
      qs.completeObjective('the-crownless-one', 'reach-coast');
    }

    // ── Exits ──
    // West edge -> back to Ashfields
    this.addExit({
      x: 0,
      y: 3 * TILE,
      w: TILE,
      h: 4 * TILE,
      targetScene: 'AshfieldsScene',
      targetSpawn: 'fromCoast',
      label: '\u2190 The Ashfields',
    });

    // Zone marker
    this.add
      .text(WORLD_W / 2, WORLD_H - TILE * 2, 'THE SHATTERED COAST', {
        fontFamily: 'Courier New', fontSize: '12px', color: '#506878',
      })
      .setOrigin(0.5).setAlpha(0.4).setDepth(15);
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromAshfields':
      case 'default':
        return { x: 3 * TILE, y: 5 * TILE };
      case 'fromThrone':
        return { x: 30 * TILE, y: 9 * TILE };
      default:
        return { x: 3 * TILE, y: 5 * TILE };
    }
  }
}

// ─── Map data ─────────────────────────────────────────────────

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

function tileAt(x: number, y: number): number {
  // ── Sea (south half, large impassable water) ──
  if (y >= 14) return T.WATER;
  // Water encroaching into lower areas
  if (y >= 12 && (x <= 4 || x >= 36)) return T.WATER;
  if (y >= 13 && x >= 2 && x <= 38) return T.WATER;

  // ── Cliff walls (north border) ──
  if (y <= 1 && (x <= 2 || (x >= 14 && x <= 16) || x >= 37)) return T.WALL_STONE;

  // ── West entrance path from Ashfields ──
  if (x <= 5 && y >= 3 && y <= 7) return T.FLOOR_STONE;

  // ── Main cliff path along northern edge ──
  if (y >= 2 && y <= 6 && x >= 5 && x <= 38) return T.FLOOR_STONE;

  // ── Winding path south to fortress ──
  if (x >= 8 && x <= 12 && y >= 6 && y <= 10) return T.FLOOR_CRACKED;
  if (x >= 12 && x <= 26 && y >= 8 && y <= 10) return T.FLOOR_CRACKED;

  // ── Fortress interior (center-east) ──
  if (x >= 26 && x <= 34 && y >= 5 && y <= 10) return T.FLOOR_STONE;

  // ── Blood stone near fortress entrance ──
  if (x >= 27 && x <= 29 && y >= 6 && y <= 7) return T.BLOOD_STONE;
  if (x >= 31 && x <= 33 && y >= 8 && y <= 9) return T.BLOOD_STONE;

  // ── Cliff edges (cracked/unstable) ──
  if (y >= 10 && y <= 12 && x >= 4 && x <= 36) return T.FLOOR_CRACKED;

  // ── Eastern cliffside path ──
  if (x >= 35 && x <= 38 && y >= 2 && y <= 10) return T.FLOOR_STONE;

  // ── Rocky outcroppings ──
  if (x >= 18 && x <= 20 && y >= 6 && y <= 7) return T.WALL_STONE;

  // Default: cracked cliff ground
  return T.FLOOR_CRACKED;
}
