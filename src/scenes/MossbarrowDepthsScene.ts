import { useInventoryStore } from '../state/inventoryStore';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Mossbarrow Depths — Floor 1. Spider cavern with acid pools,
 * cobwebs, and mossy damp corners. Enter at top, stairs down
 * at the bottom-center.
 */

const MAP_W = 30;
const MAP_H = 22;

/** Tiles the player cannot walk through */
const SOLID_TILES = new Set([T.WALL_STONE, T.COBWEB, T.ACID]);

export class MossbarrowDepthsScene extends BaseWorldScene {
  constructor() {
    super({ key: 'MossbarrowDepthsScene' });
  }

  protected getZoneName(): string | null { return 'Mossbarrow Depths \u2014 Floor 1'; }

  protected layout(): void {
    generateTileset(this);

    const map = this.make.tilemap({
      data: buildMapData(),
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tileset')!;
    map.createLayer(0, tileset)!;

    // Wall + hazard collision (walls, cobweb-walls, acid)
    for (const [tx, ty] of getSolidPositions()) {
      const wall = this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
      this.physics.add.existing(wall, true);
      this.walls.add(wall);
    }

    // Zone label
    this.add.text(WORLD_W / 2, 2 * TILE, 'DEPTHS — FLOOR 1', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#405040',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);

    // ── Greenish torches (spider cavern atmosphere) ──
    for (const [tx, ty] of [[5, 2], [12, 2], [5, 7], [12, 7], [5, 12], [12, 12], [5, 17], [12, 17]] as [number, number][]) {
      this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 24, 24, 0x40c060, 0.14).setDepth(4);
    }

    // ── Hanging web strands (semi-transparent white lines) ──
    for (const [wx, wy, wh] of [
      [6, 1, 3], [11, 1, 4], [8, 4, 2], [10, 9, 3],
      [7, 13, 2], [12, 16, 3], [6, 18, 2],
    ] as [number, number, number][]) {
      this.add.rectangle(wx * TILE + TILE / 2, wy * TILE + wh * TILE / 2, 2, wh * TILE, 0xffffff, 0.15).setDepth(6);
    }

    // ── Egg sac clusters in alcoves ──
    // East alcove egg sacs
    for (const [ex, ey] of [[14, 6], [15, 7], [16, 6]] as [number, number][]) {
      this.add.circle(ex * TILE + TILE / 2, ey * TILE + TILE / 2, 6, 0xe8e0c8, 0.7).setDepth(5);
      this.add.circle(ex * TILE + TILE / 2 + 4, ey * TILE + TILE / 2 - 3, 4, 0xd8d0b8, 0.5).setDepth(5);
    }
    // West alcove egg sacs
    for (const [ex, ey] of [[2, 13], [3, 14]] as [number, number][]) {
      this.add.circle(ex * TILE + TILE / 2, ey * TILE + TILE / 2, 7, 0xe8e0c8, 0.65).setDepth(5);
      this.add.circle(ex * TILE + TILE / 2 - 5, ey * TILE + TILE / 2 + 4, 4, 0xd8d0b8, 0.5).setDepth(5);
    }

    // ── Dripping acid particles near acid pools ──
    // East alcove acid drips
    for (const [dx, dy] of [[15, 5], [16, 5]] as [number, number][]) {
      const drip = this.add.circle(dx * TILE + TILE / 2, dy * TILE, 2, 0x40c040, 0.8).setDepth(6);
      this.tweens.add({
        targets: drip, y: dy * TILE + TILE, alpha: 0, duration: 1200,
        repeat: -1, delay: Math.random() * 800,
      });
    }
    // West alcove acid drips
    for (const [dx, dy] of [[2, 12], [3, 12]] as [number, number][]) {
      const drip = this.add.circle(dx * TILE + TILE / 2, dy * TILE, 2, 0x40c040, 0.8).setDepth(6);
      this.tweens.add({
        targets: drip, y: dy * TILE + TILE, alpha: 0, duration: 1400,
        repeat: -1, delay: Math.random() * 1000,
      });
    }

    // ── Bone piles near spider nests ──
    // East alcove bone pile
    this.add.rectangle(14 * TILE + TILE / 2, 8 * TILE + TILE / 2, 20, 8, 0xd0c8b0, 0.6).setDepth(5);
    this.add.rectangle(14 * TILE + TILE / 2 + 6, 8 * TILE + TILE / 2 - 2, 12, 6, 0xc8c0a8, 0.5).setDepth(5);
    // West alcove bone pile
    this.add.rectangle(2 * TILE + TILE / 2, 15 * TILE + TILE / 2, 18, 8, 0xd0c8b0, 0.6).setDepth(5);

    // ── Material pickups ──
    // Iron ore vein 1 — west alcove (walkable tile at 1,14)
    const ironOre1 = this.add.circle(1 * TILE + TILE / 2, 14 * TILE + TILE / 2, 8, 0x808080);
    ironOre1.setStrokeStyle(2, 0x606060);
    ironOre1.setDepth(6);
    this.spawnInteractable({
      sprite: ironOre1 as any, label: 'Pick up iron ore', radius: 20,
      action: () => {
        this.spawnPickupParticles(ironOre1.x, ironOre1.y, 0x60c060);
        useInventoryStore.getState().addItem('iron_ore');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found iron ore!' }));
        ironOre1.destroy();
      },
    });

    // Iron ore vein 2 — east alcove (walkable tile at 14,7)
    const ironOre2 = this.add.circle(14 * TILE + TILE / 2, 7 * TILE + TILE / 2, 8, 0x808080);
    ironOre2.setStrokeStyle(2, 0x606060);
    ironOre2.setDepth(6);
    this.spawnInteractable({
      sprite: ironOre2 as any, label: 'Pick up iron ore', radius: 20,
      action: () => {
        this.spawnPickupParticles(ironOre2.x, ironOre2.y, 0x60c060);
        useInventoryStore.getState().addItem('iron_ore');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found iron ore!' }));
        ironOre2.destroy();
      },
    });

    // Spider silk bundle — near egg sacs in east alcove (walkable tile at 15,8)
    const spiderSilk = this.add.circle(15 * TILE + TILE / 2, 8 * TILE + TILE / 2, 7, 0xe8e0d0);
    spiderSilk.setStrokeStyle(2, 0xc0b8a0);
    spiderSilk.setDepth(6);
    this.spawnInteractable({
      sprite: spiderSilk as any, label: 'Pick up spider silk', radius: 20,
      action: () => {
        this.spawnPickupParticles(spiderSilk.x, spiderSilk.y, 0x60c060);
        useInventoryStore.getState().addItem('spider_silk');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found spider silk!' }));
        spiderSilk.destroy();
      },
    });

    // ── Lore interactable ──
    // Scratched message on the wall (near the east alcove entrance)
    const wallScratch = this.add.circle(13 * TILE + TILE / 2, 5 * TILE + TILE / 2, 5, 0xa09878, 0.6);
    wallScratch.setDepth(6);
    this.spawnInteractable({
      sprite: wallScratch as any,
      label: 'Read scratched message',
      radius: 20,
      action: () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: "Scratched into the stone: 'The spiders came from below. Do not sleep.'",
        }));
      },
    });

    // Enemies — spiders along the corridor (positions unchanged, on walkable tiles)
    this.spawnEnemy({ monsterKey: 'spider', x: 8 * TILE, y: 5 * TILE });
    this.spawnEnemy({ monsterKey: 'spider', x: 9 * TILE, y: 10 * TILE });
    this.spawnEnemy({ monsterKey: 'spider', x: 7 * TILE, y: 15 * TILE });

    // ── EXIT UP → Surface (top-center) ──
    this.addExit({
      x: 6 * TILE, y: 0, w: 5 * TILE, h: TILE,
      targetScene: 'MossbarrowScene', targetSpawn: 'fromDepths',
      label: '↑ Surface',
    });
    this.add.rectangle(8.5 * TILE, 1.2 * TILE, 120, 36, 0x202028).setStrokeStyle(2, 0x404050).setDepth(3);
    this.add.text(8.5 * TILE, 1.2 * TILE, '▲ Stairs Up', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#8888aa',
    }).setOrigin(0.5).setDepth(4);

    // ── Spike traps in the main hall ──
    this.spawnTrap({ x: 8 * TILE, y: 8 * TILE, damage: 3 });
    this.spawnTrap({ x: 10 * TILE, y: 13 * TILE, damage: 3 });

    // ── Guaranteed dungeon key — hidden near the locked gate.
    //    Ensures the player is never softlocked if spiders drop nothing.
    const keyPickup1 = this.add.rectangle(5 * TILE + TILE / 2, 17 * TILE + TILE / 2, 10, 10, 0xc0a040);
    keyPickup1.setStrokeStyle(1, 0x906020);
    keyPickup1.setDepth(6);
    this.spawnInteractable({
      sprite: keyPickup1 as any, label: 'Rusted key', radius: 20,
      action: () => {
        useInventoryStore.getState().addItem('dungeon_key');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found a rusted key!' }));
        keyPickup1.destroy();
      },
    });

    // ── Locked door before stairs down (requires Rusty Key from spiders) ──
    this.spawnLockedDoor({
      x: 6 * TILE, y: 18 * TILE, w: 5 * TILE, h: 6,
      keyItem: 'dungeon_key', label: 'Locked gate',
    });

    // ── Treasure chest in east alcove ──
    this.spawnChest({
      x: 16 * TILE + TILE / 2, y: 7 * TILE + TILE / 2,
      loot: [{ itemKey: 'health_potion', qty: 2 }, { itemKey: 'iron_ore' }],
    });

    // ── EXIT DOWN → Floor 2 (bottom-center, wide and obvious) ──
    this.addExit({
      x: 6 * TILE, y: 19 * TILE, w: 5 * TILE, h: 2 * TILE,
      targetScene: 'DepthsFloor2Scene', targetSpawn: 'fromFloor1',
      label: '▼ Floor 2',
    });
    const stairX = 8.5 * TILE;
    const stairY = 19 * TILE;
    this.add.rectangle(stairX, stairY, 140, 52, 0x10101a).setStrokeStyle(2, 0x302848).setDepth(3);
    this.add.text(stairX, stairY - 8, '▼ Stairs Down', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#8060c0',
    }).setOrigin(0.5).setDepth(4);
    this.add.text(stairX, stairY + 10, 'Floor 2', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#6050a0',
    }).setOrigin(0.5).setDepth(4);

    // ── Random loot bag ──
    this.spawnLootBag({
      x: 10 * TILE, y: 8 * TILE,
      loot: [{ itemKey: 'health_potion', weight: 3 }, { itemKey: 'spider_silk', weight: 2 }, { itemKey: 'iron_ore', weight: 1 }],
      gold: 8, spawnChance: 0.2,
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromFloor2':
        return { x: 8.5 * TILE, y: 17 * TILE };
      case 'fromMossbarrow':
      case 'default':
      default:
        return { x: 8.5 * TILE, y: 3 * TILE };
    }
  }
}

// ─── Map data ──────────────────────────────────────────────────────

const WS = T.WALL_STONE;
const FC = T.FLOOR_CRACKED;
const MS = T.MOSS_STONE;
const CW = T.COBWEB;
const AC = T.ACID;

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
 * Floor 1: Spider Cavern — vertical corridor with acid alcoves.
 *   Main hall: cols 5-12, rows 1-20 (cracked stone + moss)
 *   Stair up: cols 6-10, row 0
 *   Stair down: cols 6-10, row 21
 *   East alcove (cols 13-17, rows 5-8): acid pool + cobwebs
 *   West alcove (cols 1-4, rows 12-15): acid pool + cobwebs
 *   Cobweb-walls on certain wall edges
 */
function tileAt(x: number, y: number): number {
  // Stair openings (plain cracked floor)
  if (inRect(x, y, 6, 0, 5, 1)) return FC;
  if (inRect(x, y, 6, 21, 5, 1)) return FC;

  // ── East alcove (cols 13-17, rows 5-8) ──
  // Acid pool in the back (15-16, 5-6)
  if (inRect(x, y, 15, 5, 2, 2)) return AC;
  // Cobwebs on alcove walls (top/bottom edges)
  if (x === 13 && y === 5) return CW;
  if (x === 17 && y === 5) return CW;
  // Rest of east alcove is walkable floor
  if (inRect(x, y, 13, 5, 5, 4)) return FC;

  // ── West alcove (cols 1-4, rows 12-15) ──
  // Acid pool (2-3, 12-13)
  if (inRect(x, y, 2, 12, 2, 2)) return AC;
  // Cobwebs on alcove walls
  if (x === 1 && y === 12) return CW;
  if (x === 4 && y === 12) return CW;
  // Rest of west alcove
  if (inRect(x, y, 1, 12, 4, 4)) return FC;

  // ── Main vertical hall ──
  if (inRect(x, y, 5, 1, 8, 20)) {
    // Cobweb-walls on the hall edges (decorative, still solid since they're wall-adjacent)
    // These are on the WALL side, so they don't block the hall itself.

    // Mossy damp corners
    if ((x === 5 || x === 12) && (y <= 3 || y >= 18)) return MS;
    if (x === 5 && y === 10) return MS;
    if (x === 12 && y === 14) return MS;

    // Main walkway is cracked stone
    return FC;
  }

  // Cobweb-decorated wall tiles along hall boundary
  if ((x === 4 || x === 13) && (y === 1 || y === 4 || y === 9 || y === 14 || y === 20)) return CW;

  return WS;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
