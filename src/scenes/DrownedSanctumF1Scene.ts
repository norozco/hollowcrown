import { useInventoryStore } from '../state/inventoryStore';
import { useQuestStore } from '../state/questStore';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Drowned Sanctum — Floor 1. Half-submerged stone corridors beneath
 * Ashenmere Marshes. Water tiles dominate, with MOSS_STONE walkways
 * threading between flooded chambers. Algae-covered pillars, floating
 * debris, and a cold blue-green glow.
 *
 * Map: 30 tiles wide x 22 tiles tall.
 */

const MAP_W = 30;
const MAP_H = 22;

/** Tiles the player cannot walk through */
const SOLID_TILES = new Set([T.WALL_STONE, T.WATER, T.CHAINS]);

export class DrownedSanctumF1Scene extends BaseWorldScene {
  constructor() {
    super({ key: 'DrownedSanctumF1Scene' });
  }

  protected getZoneName(): string | null { return 'The Drowned Sanctum'; }

  protected layout(): void {
    generateTileset(this);

    const map = this.make.tilemap({
      data: buildMapData(),
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tileset')!;
    map.createLayer(0, tileset)!;

    // Wall + water collision
    for (const [tx, ty] of getSolidPositions()) {
      const w = this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
      this.physics.add.existing(w, true);
      this.walls.add(w);
    }

    // Zone label
    this.add.text(WORLD_W / 2, 2 * TILE, 'THE DROWNED SANCTUM', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#30808a',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);

    // ── Blue-green torches — submerged atmosphere ──
    for (const [tx, ty] of [
      [5, 2], [14, 2], [5, 7], [14, 7],
      [9, 9], [11, 9], [9, 12], [11, 12],
      [5, 14], [14, 14], [5, 19], [14, 19],
    ] as [number, number][]) {
      this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 22, 22, 0x30a0a0, 0.16).setDepth(4);
    }

    // ── Submerged pillar decorations ──
    for (const [px, py] of [
      [6, 4], [13, 4], [6, 17], [13, 17],
      [9, 8], [11, 13],
    ] as [number, number][]) {
      const pillar = this.add.rectangle(px * TILE + TILE / 2, py * TILE + TILE / 2, 24, 24, 0x506858);
      pillar.setStrokeStyle(2, 0x384840);
      pillar.setDepth(5);
      // Algae on pillar
      this.add.rectangle(px * TILE + TILE / 2 - 6, py * TILE + TILE / 2 + 6, 6, 4, 0x487838, 0.6).setDepth(6);
      this.physics.add.existing(pillar, true);
      this.walls.add(pillar);
    }

    // ── Floating debris (small rectangles drifting in water areas) ──
    for (const [dx, dy, ddx] of [
      [3, 3, 8], [16, 5, -6], [2, 16, 10], [17, 18, -8],
    ] as [number, number, number][]) {
      const debris = this.add.rectangle(dx * TILE, dy * TILE, 10, 4, 0x705830, 0.6);
      debris.setDepth(7);
      this.tweens.add({
        targets: debris,
        x: debris.x + ddx,
        y: debris.y + 3,
        duration: 4000 + Math.random() * 2000,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // ── Water ripple effects in flooded areas ──
    for (const [rx, ry] of [
      [3, 5], [16, 3], [2, 18], [17, 16], [8, 6], [12, 15],
    ] as [number, number][]) {
      const ripple = this.add.circle(rx * TILE, ry * TILE, 4, 0x60a0b0, 0.3);
      ripple.setDepth(4);
      this.tweens.add({
        targets: ripple,
        scaleX: 2.5, scaleY: 2.5, alpha: 0,
        duration: 2000 + Math.random() * 1000,
        delay: Math.random() * 1500,
        repeat: -1, ease: 'Quad.easeOut',
      });
    }

    // ── Enemies ──
    // Wraiths in the flooded corridors (on walkable moss_stone tiles)
    this.spawnEnemy({ monsterKey: 'wraith', x: 8 * TILE, y: 4 * TILE });
    this.spawnEnemy({ monsterKey: 'wraith', x: 12 * TILE, y: 17 * TILE });
    // Spiders in alcoves
    this.spawnEnemy({ monsterKey: 'spider', x: 7 * TILE, y: 10 * TILE });
    this.spawnEnemy({ monsterKey: 'spider', x: 13 * TILE, y: 11 * TILE });
    // Undead bandit
    this.spawnEnemy({ monsterKey: 'bandit', x: 10 * TILE, y: 6 * TILE });

    // ── Spike traps in the corridors ──
    this.spawnTrap({ x: 9 * TILE + TILE / 2, y: 10 * TILE, damage: 5 });
    this.spawnTrap({ x: 11 * TILE, y: 11 * TILE + TILE / 2, damage: 5 });

    // ── Sanctum Key pickup (on walkable tile 7,15) ──
    const keySprite = this.add.circle(7 * TILE + TILE / 2, 15 * TILE + TILE / 2, 7, 0x40686a);
    keySprite.setStrokeStyle(2, 0x208888);
    keySprite.setDepth(8);
    // Key shape detail
    this.add.rectangle(7 * TILE + TILE / 2, 15 * TILE + TILE / 2 - 2, 4, 8, 0x50807a).setDepth(8);
    this.spawnInteractable({
      sprite: keySprite as any, label: 'Pick up sanctum key', radius: 22,
      action: () => {
        useInventoryStore.getState().addItem('sanctum_key');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found Sanctum Key.' }));
        keySprite.destroy();
      },
    });

    // ── Locked door before stairs down (requires sanctum_key) ──
    // Door spans full south chamber (cols 5-14 = 10 tiles)
    this.spawnLockedDoor({
      x: 5 * TILE, y: 18 * TILE, w: 10 * TILE, h: TILE,
      keyItem: 'sanctum_key', label: 'Sealed gate',
    });

    // ── Treasure chest in north chamber ──
    this.spawnChest({
      x: 13 * TILE + TILE / 2, y: 5 * TILE + TILE / 2,
      loot: [{ itemKey: 'health_potion', qty: 2 }, { itemKey: 'shadow_essence' }],
      gold: 25,
    });

    // ── Material pickups ──
    // Shadow essence in flooded alcove (walkable at 6,6)
    const shadowEssence = this.add.circle(6 * TILE + TILE / 2, 6 * TILE + TILE / 2, 7, 0x8040c0);
    shadowEssence.setStrokeStyle(2, 0x6030a0);
    shadowEssence.setDepth(6);
    this.spawnInteractable({
      sprite: shadowEssence as any, label: 'Collect shadow essence', radius: 20,
      action: () => {
        this.spawnPickupParticles(shadowEssence.x, shadowEssence.y, 0x60c060);
        useInventoryStore.getState().addItem('shadow_essence');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found shadow essence.' }));
        shadowEssence.destroy();
      },
    });

    // Wraith dust near south chamber (walkable at 12,16)
    const wraithDust = this.add.circle(12 * TILE + TILE / 2, 16 * TILE + TILE / 2, 7, 0x6080b0);
    wraithDust.setStrokeStyle(2, 0x4060a0);
    wraithDust.setDepth(6);
    this.spawnInteractable({
      sprite: wraithDust as any, label: 'Collect wraith dust', radius: 20,
      action: () => {
        this.spawnPickupParticles(wraithDust.x, wraithDust.y, 0x60c060);
        useInventoryStore.getState().addItem('wraith_dust');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found wraith dust.' }));
        wraithDust.destroy();
      },
    });

    // ── The Watcher ──
    this.spawnWatcher(11 * TILE, 3 * TILE);

    // ── EXIT UP → Ashenmere (top-center) ──
    this.addExit({
      x: 8 * TILE, y: 0, w: 4 * TILE, h: TILE,
      targetScene: 'AshenmereScene', targetSpawn: 'fromSanctum',
      label: '↑ Ashenmere',
    });
    this.add.rectangle(10 * TILE, 1.2 * TILE, 120, 36, 0x202828).setStrokeStyle(2, 0x305050).setDepth(3);
    this.add.text(10 * TILE, 1.2 * TILE, '▲ Ashenmere', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#6a8a8a',
    }).setOrigin(0.5).setDepth(4);

    // ── EXIT DOWN → Floor 2 (bottom-center) ──
    this.addExit({
      x: 8 * TILE, y: 19 * TILE, w: 4 * TILE, h: 2 * TILE,
      targetScene: 'DrownedSanctumF2Scene', targetSpawn: 'fromFloor1',
      label: '▼ Deeper',
    });
    const stairX = 10 * TILE;
    const stairY = 19.5 * TILE;
    this.add.rectangle(stairX, stairY, 120, 48, 0x101820).setStrokeStyle(2, 0x204050).setDepth(3);
    this.add.text(stairX, stairY - 8, '▼ Stairs Down', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#4080a0',
    }).setOrigin(0.5).setDepth(4);
    this.add.text(stairX, stairY + 10, 'The Sanctum Heart', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#306070',
    }).setOrigin(0.5).setDepth(4);

    // ── Random loot bag ──
    this.spawnLootBag({
      x: 6 * TILE, y: 18 * TILE,
      loot: [{ itemKey: 'health_potion', weight: 3 }, { itemKey: 'shadow_essence', weight: 2 }, { itemKey: 'wraith_dust', weight: 2 }],
      gold: 20, spawnChance: 0.2,
    });

    // ── Heart piece #7 — in a flooded alcove (west side, needs exploration) ──
    this.spawnHeartPiece(6 * TILE + TILE / 2, 10 * TILE);

    // ── Quest trigger: entering the sanctum completes the objective ──
    const qs = useQuestStore.getState();
    qs.completeObjective('drowned-sanctum', 'enter-sanctum');
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromFloor2':
        return { x: 10 * TILE, y: 17 * TILE };
      case 'fromAshenmere':
      case 'default':
      default:
        return { x: 10 * TILE, y: 3 * TILE };
    }
  }
}

// ─── Map data ──────────────────────────────────────────────────────

const WS = T.WALL_STONE;
const MS = T.MOSS_STONE;
const FC = T.FLOOR_CRACKED;
const WT = T.WATER;
const CH = T.CHAINS;
const BN = T.BONES;

function getSolidPositions(): [number, number][] {
  const positions: [number, number][] = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (SOLID_TILES.has(tileAt(x, y))) positions.push([x, y]);
    }
  }
  return positions;
}

function buildMapData(): number[][] {
  const rows: number[][] = [];
  for (let y = 0; y < MAP_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_W; x++) row.push(tileAt(x, y));
    rows.push(row);
  }
  return rows;
}

/**
 * Floor 1: Flooded Ruins.
 *
 * Layout:
 *   Stair opening at top center (cols 8-11, row 0)
 *   North chamber (cols 5-14, rows 1-7) — flooded edges, moss_stone center
 *   Connecting corridor (cols 8-11, rows 8-13) — narrow moss_stone path
 *   South chamber (cols 5-14, rows 14-20) — flooded edges, moss_stone paths
 *   Stair opening at bottom center (cols 8-11, rows 19-21)
 *   Water everywhere else, walls outside the chambers
 */
function tileAt(x: number, y: number): number {
  // Stair openings
  if (inRect(x, y, 8, 0, 4, 1)) return MS;
  if (inRect(x, y, 8, 21, 4, 1)) return MS;

  // ── North chamber (cols 5-14, rows 1-7) ──
  if (inRect(x, y, 5, 1, 10, 7)) {
    // Chains on the north wall edges
    if (y === 1 && (x === 5 || x === 14)) return CH;
    // Flooded edges (water around walkable center)
    if (x === 5 || x === 14) return WT;
    if (y === 1 && (x < 8 || x > 11)) return WT;
    if (y === 7 && (x < 8 || x > 11)) return WT;
    // Bones in corners
    if (x === 6 && y === 2) return BN;
    if (x === 13 && y === 6) return BN;
    // Walkable moss stone center
    return MS;
  }

  // ── Connecting corridor (cols 8-11, rows 8-13) ──
  if (inRect(x, y, 8, 8, 4, 6)) {
    // Narrow walkway
    if (x === 8 || x === 11) return WT; // flooded edges of corridor
    return MS;
  }
  // Water flanking the corridor (alcoves)
  if (inRect(x, y, 5, 8, 3, 6)) {
    // West alcove — partly walkable for spider
    if (x >= 6 && x <= 7 && y >= 9 && y <= 12) return MS;
    return WT;
  }
  if (inRect(x, y, 12, 8, 3, 6)) {
    // East alcove — partly walkable
    if (x >= 12 && x <= 13 && y >= 9 && y <= 12) return MS;
    return WT;
  }

  // ── South chamber (cols 5-14, rows 14-20) ──
  if (inRect(x, y, 5, 14, 10, 7)) {
    // Chains on the south wall edges
    if (y === 20 && (x === 5 || x === 14)) return CH;
    // Flooded edges
    if (x === 5 || x === 14) return WT;
    if (y === 20 && (x < 8 || x > 11)) return WT;
    if (y === 14 && (x < 8 || x > 11)) return WT;
    // Floor cracked near the sealed gate
    if (y >= 18 && x >= 9 && x <= 10) return FC;
    // Bones
    if (x === 13 && y === 15) return BN;
    if (x === 6 && y === 19) return BN;
    return MS;
  }

  // Everything outside the chambers
  return WS;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
