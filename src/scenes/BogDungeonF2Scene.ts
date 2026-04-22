import { useInventoryStore } from '../state/inventoryStore';
import { useDungeonItemStore } from '../state/dungeonItemStore';
import { BaseWorldScene, TILE, WORLD_W } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Ashenmere Bog Dungeon — Floor 2: The Drowned Gallery.
 * Ancient gallery half-submerged. Statues and display cases underwater.
 * Locked door to Floor 3 requires gallery_key.
 */

const MAP_W = 30;
const MAP_H = 22;

const SOLID_TILES = new Set<number>([T.WALL_STONE, T.WATER]);

export class BogDungeonF2Scene extends BaseWorldScene {
  constructor() {
    super({ key: 'BogDungeonF2Scene' });
  }

  protected getZoneName(): string | null { return 'The Drowned Gallery'; }

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
    this.add.text(WORLD_W / 2, 2 * TILE, 'THE DROWNED GALLERY', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#405880',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);

    // ── Blue torches ──
    for (const [tx, ty] of [
      [5, 2], [14, 2], [5, 5], [14, 5],
      [5, 9], [14, 9], [5, 13], [14, 13],
      [5, 17], [14, 17], [9, 7], [10, 12],
    ] as [number, number][]) {
      this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 22, 22, 0x3060c0, 0.16).setDepth(4);
    }

    // ── Submerged statue shapes (rectangles with gold trim) ──
    for (const [sx, sy] of [[4, 3], [15, 3], [4, 10], [15, 10], [4, 16], [15, 16]] as [number, number][]) {
      // Statue base (dark grey, partially submerged look)
      this.add.rectangle(sx * TILE + TILE / 2, sy * TILE + TILE / 2, 20, 32, 0x506068, 0.7).setDepth(5);
      // Gold trim
      this.add.rectangle(sx * TILE + TILE / 2, sy * TILE + TILE / 2 - 12, 16, 3, 0xc09838, 0.6).setDepth(5);
      this.add.rectangle(sx * TILE + TILE / 2, sy * TILE + TILE / 2 + 12, 16, 3, 0xc09838, 0.5).setDepth(5);
    }

    // ── Broken display cases (glass shards + wooden frames) ──
    for (const [dx, dy] of [[7, 4], [12, 4], [7, 15], [12, 15]] as [number, number][]) {
      // Frame
      this.add.rectangle(dx * TILE + TILE / 2, dy * TILE + TILE / 2, 24, 16, 0x5a4a2a, 0.6).setDepth(5);
      this.add.rectangle(dx * TILE + TILE / 2, dy * TILE + TILE / 2, 22, 14, 0x000000, 0).setStrokeStyle(1, 0x8a7a48).setDepth(5);
      // Glass shards
      this.add.triangle(dx * TILE + TILE / 2 - 4, dy * TILE + TILE / 2 + 2, 0, 4, 3, 0, -3, 0, 0x80a0c0, 0.3).setDepth(6);
      this.add.triangle(dx * TILE + TILE / 2 + 6, dy * TILE + TILE / 2 - 1, 0, 3, 2, 0, -2, 0, 0x80a0c0, 0.2).setDepth(6);
    }

    // ── Gallery key pickup — near a statue (guaranteed) ──
    const keyX = 15 * TILE + TILE / 2;
    const keyY = 11 * TILE + TILE / 2;
    const galleryKey = this.add.rectangle(keyX, keyY, 10, 10, 0xc0a040);
    galleryKey.setStrokeStyle(1, 0x906020);
    galleryKey.setDepth(6);
    this.spawnInteractable({
      sprite: galleryKey as any, label: 'Gallery key', radius: 20,
      action: () => {
        useInventoryStore.getState().addItem('gallery_key');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found the Gallery Key. Tarnished bronze — the handle is shaped like a wave.' }));
        galleryKey.destroy();
      },
    });

    // ── Enemies ──
    this.spawnEnemy({ monsterKey: 'bog_lurker', x: 8 * TILE, y: 5 * TILE });
    this.spawnEnemy({ monsterKey: 'bog_lurker', x: 11 * TILE, y: 14 * TILE });
    this.spawnEnemy({ monsterKey: 'mine_golem', x: 10 * TILE, y: 9 * TILE });
    this.spawnEnemy({ monsterKey: 'wraith', x: 7 * TILE, y: 11 * TILE });
    this.spawnEnemy({ monsterKey: 'wraith', x: 12 * TILE, y: 17 * TILE });

    // ── Spike traps (6 damage) ──
    this.spawnTrap({ x: 9 * TILE, y: 7 * TILE, damage: 6 });
    this.spawnTrap({ x: 10 * TILE, y: 13 * TILE, damage: 6 });

    // ── Treasure chest ──
    this.spawnChest({
      x: 5 * TILE + TILE / 2, y: 5 * TILE + TILE / 2,
      loot: [{ itemKey: 'mana_potion', qty: 2 }, { itemKey: 'shadow_essence' }],
      gold: 25,
    });

    // ── Golden chest — Grapple Hook dungeon item ──
    if (!useDungeonItemStore.getState().has('grapple_hook')) {
      const ghX = 14 * TILE + TILE / 2;
      const ghY = 8 * TILE + TILE / 2;
      const ghChest = this.add.rectangle(ghX, ghY, 26, 22, 0x8a6820);
      ghChest.setStrokeStyle(2, 0xe0c040);
      ghChest.setDepth(8);
      const ghLid = this.add.rectangle(ghX, ghY - 9, 26, 6, 0xa08030);
      ghLid.setStrokeStyle(1, 0xe0c040);
      ghLid.setDepth(8);
      this.tweens.add({ targets: ghChest, alpha: 0.7, duration: 1200, yoyo: true, repeat: -1 });
      this.spawnInteractable({
        sprite: ghChest as any,
        label: 'Open golden chest',
        radius: 24,
        action: () => {
          useDungeonItemStore.getState().acquire('grapple_hook');
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found the Grapple Hook! Iron claw on a chain. It reaches where you cannot.' }));
          this.spawnPickupParticles(ghX, ghY, 0xe0c060);
          ghChest.destroy();
          ghLid.destroy();
        },
      });
    }

    // ── The Watcher ──
    this.spawnWatcher(12 * TILE, 3 * TILE);

    // ── EXIT UP → Floor 1 (top-center) ──
    this.addExit({
      x: 7 * TILE, y: 0, w: 5 * TILE, h: TILE,
      targetScene: 'BogDungeonF1Scene', targetSpawn: 'fromFloor2',
      label: '↑ Floor 1',
    });
    this.add.rectangle(9.5 * TILE, 1.2 * TILE, 120, 36, 0x202028).setStrokeStyle(2, 0x304050).setDepth(3);
    this.add.text(9.5 * TILE, 1.2 * TILE, '▲ The Sunken Halls', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#6088aa',
    }).setOrigin(0.5).setDepth(4);

    // ── Locked door before stairs to Floor 3 (requires gallery_key) ──
    // Door spans the full south gallery (cols 5-14 = 10 tiles)
    this.spawnLockedDoor({
      x: 5 * TILE, y: 18 * TILE, w: 10 * TILE, h: TILE,
      keyItem: 'gallery_key', label: 'Gallery gate',
    });

    // ── EXIT DOWN → Floor 3 (bottom-center) ──
    this.addExit({
      x: 7 * TILE, y: 19 * TILE, w: 5 * TILE, h: 2 * TILE,
      targetScene: 'BogDungeonF3Scene', targetSpawn: 'fromFloor2',
      label: '▼ Floor 3',
    });
    const stairX = 9.5 * TILE;
    const stairY = 19.5 * TILE;
    this.add.rectangle(stairX, stairY, 140, 52, 0x10101a).setStrokeStyle(2, 0x202848).setDepth(3);
    this.add.text(stairX, stairY - 8, '▼ Stairs Down', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#6050a0',
    }).setOrigin(0.5).setDepth(4);
    this.add.text(stairX, stairY + 10, "The Warden's Pool", {
      fontFamily: 'Courier New', fontSize: '10px', color: '#504080',
    }).setOrigin(0.5).setDepth(4);

    // ── Breakable wall (south gallery east side) → hidden heart piece ──
    this.spawnBreakableWall({
      x: 14 * TILE, y: 16 * TILE, w: TILE, h: TILE * 2,
      onBreak: () => {
        this.spawnHeartPiece(15 * TILE, 17 * TILE);
      },
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromFloor3':
        return { x: 9.5 * TILE, y: 17 * TILE };
      case 'fromFloor1':
      case 'default':
      default:
        return { x: 9.5 * TILE, y: 3 * TILE };
    }
  }
}

// ─── Map data ──────────────────────────────────────────────────────

const MS = T.MOSS_STONE;
const WT = T.WATER;
const FC = T.FLOOR_CRACKED;

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
 * Floor 2: Drowned Gallery — two gallery halls connected by a corridor.
 *   Main walkway: cols 5-14, rows 1-20
 *   North gallery: cols 5-14, rows 1-7 (wider, display cases)
 *   Corridor: cols 8-11, rows 8-12
 *   South gallery: cols 5-14, rows 13-20
 *   Stair up: cols 7-11, row 0
 *   Stair down: cols 7-11, row 21
 *   Water surrounds the walkable areas
 */
function tileAt(x: number, y: number): number {
  // Stair openings
  if (inRect(x, y, 7, 0, 5, 1)) return FC;
  if (inRect(x, y, 7, 21, 5, 1)) return FC;

  // ── North gallery (cols 5-14, rows 1-7) ──
  if (inRect(x, y, 5, 1, 10, 7)) {
    // Statue alcove walls (not walkable — they are decorative only, keep as floor)
    return FC;
  }

  // ── Connecting corridor (cols 8-11, rows 8-12) ──
  if (inRect(x, y, 8, 8, 4, 5)) return MS;

  // ── South gallery (cols 5-14, rows 13-20) ──
  if (inRect(x, y, 5, 13, 10, 8)) return FC;

  // Everything else is water
  return WT;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
