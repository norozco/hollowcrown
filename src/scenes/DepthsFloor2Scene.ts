import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Mossbarrow Depths — Floor 2. Wraith-haunted catacombs.
 * Stairs up at top, stairs down at bottom. Wide rooms with
 * a connecting corridor so navigation is clear.
 */

const MAP_W = 30;
const MAP_H = 22;

export class DepthsFloor2Scene extends BaseWorldScene {
  constructor() {
    super({ key: 'DepthsFloor2Scene' });
  }

  protected layout(): void {
    generateTileset(this);

    const map = this.make.tilemap({
      data: buildMapData(),
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tileset')!;
    map.createLayer(0, tileset)!;

    // Wall collision
    for (const [tx, ty] of getWallPositions()) {
      const w = this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
      this.physics.add.existing(w, true);
      this.walls.add(w);
    }

    // Zone label
    this.add.text(WORLD_W / 2, 2 * TILE, 'DEPTHS — FLOOR 2', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#404060',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);

    // Blue torches (wraith floor)
    for (const [tx, ty] of [
      [5, 2], [14, 2], [5, 6], [14, 6],
      [9, 10], [11, 10],
      [5, 14], [14, 14], [5, 18], [14, 18],
    ] as [number, number][]) {
      this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 20, 20, 0x4060ff, 0.15).setDepth(4);
    }

    // Enemies — wraiths and spiders
    this.spawnEnemy({ monsterKey: 'spider', x: 8 * TILE, y: 4 * TILE });
    this.spawnEnemy({ monsterKey: 'wraith', x: 11 * TILE, y: 5 * TILE });
    this.spawnEnemy({ monsterKey: 'spider', x: 10 * TILE, y: 10 * TILE });
    this.spawnEnemy({ monsterKey: 'wraith', x: 7 * TILE, y: 16 * TILE });
    this.spawnEnemy({ monsterKey: 'wraith', x: 12 * TILE, y: 17 * TILE });

    // ── EXIT UP → Floor 1 (top-center) ──
    this.addExit({
      x: 7 * TILE, y: 0, w: 5 * TILE, h: TILE,
      targetScene: 'MossbarrowDepthsScene', targetSpawn: 'fromFloor2',
      label: '↑ Floor 1',
    });
    this.add.rectangle(9.5 * TILE, 1.2 * TILE, 120, 36, 0x202028).setStrokeStyle(2, 0x404050).setDepth(3);
    this.add.text(9.5 * TILE, 1.2 * TILE, '▲ Floor 1', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#8888aa',
    }).setOrigin(0.5).setDepth(4);

    // ── EXIT DOWN → Floor 3 (bottom-center, wide) ──
    this.addExit({
      x: 7 * TILE, y: 19 * TILE, w: 5 * TILE, h: 2 * TILE,
      targetScene: 'DepthsFloor3Scene', targetSpawn: 'fromFloor2',
      label: '▼ Floor 3',
    });
    const stairX = 9.5 * TILE;
    const stairY = 19.5 * TILE;
    this.add.rectangle(stairX, stairY, 140, 52, 0x10101a).setStrokeStyle(2, 0x402040).setDepth(3);
    this.add.text(stairX, stairY - 8, '▼ Stairs Down', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#a04080',
    }).setOrigin(0.5).setDepth(4);
    this.add.text(stairX, stairY + 10, 'Boss Floor', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#803060',
    }).setOrigin(0.5).setDepth(4);
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

const FS = T.FLOOR_STONE;
const WS = T.WALL_STONE;

function getWallPositions(): [number, number][] {
  const positions: [number, number][] = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (tileAt(x, y) === WS) positions.push([x, y]);
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
 * Floor 2 layout — top-to-bottom flow:
 *   North chamber: cols 4-15, rows 1-7 (stair up at cols 7-11, row 0)
 *   Corridor: cols 8-12, rows 7-12
 *   South chamber: cols 4-15, rows 12-20 (stair down at cols 7-11, rows 20-21)
 */
function tileAt(x: number, y: number): number {
  // North chamber
  if (inRect(x, y, 4, 1, 12, 7)) return FS;
  if (inRect(x, y, 7, 0, 5, 1)) return FS;  // stair up opening

  // Connecting corridor (narrower, adds tension)
  if (inRect(x, y, 8, 8, 5, 4)) return FS;

  // South chamber
  if (inRect(x, y, 4, 12, 12, 9)) return FS;
  if (inRect(x, y, 7, 21, 5, 1)) return FS;  // stair down opening

  return WS;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
