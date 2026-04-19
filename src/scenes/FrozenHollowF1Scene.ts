import { useInventoryStore } from '../state/inventoryStore';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Frozen Hollow — Floor 1: The Ice Caverns.
 * Frozen cave interior, blue-white torch glow, frozen pools.
 * 30x22 map.
 */

const MAP_W = 30;
const MAP_H = 22;

const SOLID_TILES = new Set([T.WALL_STONE, T.WATER]);

export class FrozenHollowF1Scene extends BaseWorldScene {
  constructor() {
    super({ key: 'FrozenHollowF1Scene' });
  }

  protected getZoneName(): string | null { return 'The Ice Caverns'; }

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

    // Wall + frozen pool collision
    for (const [tx, ty] of getSolidPositions(mapData)) {
      const w = this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
      this.physics.add.existing(w, true);
      this.walls.add(w);
    }

    // Zone label
    this.add.text(WORLD_W / 2, 2 * TILE, 'THE ICE CAVERNS', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#80a0c0',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);

    // ── Blue-white torches ──
    for (const [tx, ty] of [
      [5, 3], [14, 3], [5, 7], [14, 7], [5, 11], [14, 11],
      [5, 15], [14, 15], [5, 19], [14, 19],
    ] as [number, number][]) {
      const glow = this.add.circle(tx * TILE, ty * TILE, 20, 0x80a0e0, 0.08).setDepth(4);
      this.tweens.add({
        targets: glow, alpha: 0.03, scale: 1.2, duration: 2000, yoyo: true, repeat: -1,
      });
      this.add.circle(tx * TILE, ty * TILE, 4, 0xa0c0f0, 0.6).setDepth(5);
    }

    // ── Icicle decorations ──
    for (const [ix, iy] of [[7, 2], [12, 2], [8, 10], [11, 10], [9, 18]] as [number, number][]) {
      for (let d = 0; d < 3; d++) {
        this.add.triangle(
          ix * TILE + d * 6, iy * TILE, 0, 0, 3, 10 + d * 2, 6, 0, 0xa0c8e0, 0.5,
        ).setDepth(5);
      }
    }

    // ── Enemies ──
    this.spawnEnemy({ monsterKey: 'frost_wolf', x: 8 * TILE, y: 6 * TILE });
    this.spawnEnemy({ monsterKey: 'frost_wolf', x: 11 * TILE, y: 14 * TILE });
    this.spawnEnemy({ monsterKey: 'blizzard_wraith', x: 7 * TILE, y: 10 * TILE });
    this.spawnEnemy({ monsterKey: 'blizzard_wraith', x: 12 * TILE, y: 18 * TILE });

    // ── Spike traps (7 damage) ──
    this.spawnTrap({ x: 9 * TILE, y: 8 * TILE, damage: 7 });
    this.spawnTrap({ x: 10 * TILE, y: 16 * TILE, damage: 7 });

    // ── Treasure chest ──
    this.spawnChest({
      x: 14 * TILE, y: 6 * TILE,
      loot: [{ itemKey: 'health_potion', qty: 2 }, { itemKey: 'wraith_dust' }, { itemKey: 'moonpetal' }],
      gold: 25,
    });

    // ── Push-block puzzle (ice block onto plate → fairy fountain) ──
    this.spawnPushBlock({ tileX: 12, tileY: 10, color: 0x80b0d0 });
    this.spawnPressurePlate({ tileX: 14, tileY: 10, onActivate: () => {
      this.spawnFairyFountain({ x: 14 * TILE, y: 8 * TILE });
    }});

    // ── Breakable wall → hidden room with frost_key ──
    this.spawnBreakableWall({
      x: 15 * TILE, y: 10 * TILE, w: TILE, h: TILE * 2,
      onBreak: () => {
        useInventoryStore.getState().addItem('frost_key');
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'A hidden alcove. Frost Key found — cold enough to burn.',
        }));
      },
    });

    // ── The Watcher ──
    this.spawnWatcher(8 * TILE, 3 * TILE);

    // ── EXIT UP → Frosthollow Peaks ──
    this.addExit({
      x: 7 * TILE, y: 0, w: 5 * TILE, h: TILE,
      targetScene: 'FrosthollowScene', targetSpawn: 'fromFrozenHollow',
      label: '\u2191 Frosthollow Peaks',
    });
    this.add.rectangle(9.5 * TILE, 1.2 * TILE, 140, 36, 0x101820).setStrokeStyle(2, 0x405868).setDepth(3);
    this.add.text(9.5 * TILE, 1.2 * TILE, '\u25B2 Surface', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#80a0c0',
    }).setOrigin(0.5).setDepth(4);

    // ── EXIT DOWN → Floor 2 ──
    this.addExit({
      x: 7 * TILE, y: 19 * TILE, w: 5 * TILE, h: 2 * TILE,
      targetScene: 'FrozenHollowF2Scene', targetSpawn: 'fromFloor1',
      label: '\u25BC Floor 2',
    });
    const stairX = 9.5 * TILE;
    const stairY = 19.5 * TILE;
    this.add.rectangle(stairX, stairY, 140, 52, 0x081018).setStrokeStyle(2, 0x405868).setDepth(3);
    this.add.text(stairX, stairY - 8, '\u25BC Stairs Down', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#80a0c0',
    }).setOrigin(0.5).setDepth(4);
    this.add.text(stairX, stairY + 10, 'The Frost Vault', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#607888',
    }).setOrigin(0.5).setDepth(4);
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromFloor2':
        return { x: 9.5 * TILE, y: 17 * TILE };
      case 'fromFrosthollow':
      case 'default':
      default:
        return { x: 9.5 * TILE, y: 3 * TILE };
    }
  }
}

// ─── Map data ──────────────────────────────────────────────────────

const WS = T.WALL_STONE;
const FS = T.FLOOR_STONE;
const FC = T.FLOOR_CRACKED;
const WA = T.WATER;

function getSolidPositions(mapData: number[][]): [number, number][] {
  const positions: [number, number][] = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (SOLID_TILES.has(mapData[y][x])) positions.push([x, y]);
    }
  }
  return positions;
}

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
  // Border walls
  if (y === 0 || y === MAP_H - 1) return WS;
  if (x === 0 || x === MAP_W - 1) return WS;
  if (x === 1 || x === MAP_W - 2) return WS;

  // Wall columns
  if (x <= 3 || x >= 16) return WS;

  // Main corridor (cols 4-15)
  if (x >= 4 && x <= 15) {
    // Frozen pools
    if (x >= 6 && x <= 7 && y >= 4 && y <= 5) return WA;
    if (x >= 12 && x <= 13 && y >= 12 && y <= 13) return WA;
    if (x >= 8 && x <= 9 && y >= 16 && y <= 17) return WA;

    // Icy patches
    if ((x + y) % 5 === 0) return FC;

    return FS;
  }

  return WS;
}
