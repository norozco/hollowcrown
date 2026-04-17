import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Mossbarrow Depths — Floor 2. Wraith-haunted catacombs. Wider
 * chambers, more enemies. Stairs down lead to Floor 3 (the boss).
 *
 * Layout: Two large chambers connected by a winding passage.
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
    const walls = getWallPositions();
    for (const [tx, ty] of walls) {
      const w = this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
      this.physics.add.existing(w, true);
      this.walls.add(w);
    }

    // Zone label
    this.add.text(3 * TILE, 2 * TILE, 'DEPTHS — FLOOR 2', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#404060',
    }).setAlpha(0.45).setDepth(15);

    // Torches — blue-tinted (wraith floor)
    for (const [tx, ty] of [[3, 2], [8, 2], [3, 8], [8, 8], [15, 6], [15, 12], [22, 4], [26, 4], [22, 10], [26, 10]] as [number, number][]) {
      this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 20, 20, 0x4060ff, 0.15).setDepth(4);
    }

    // Enemies
    this.spawnEnemy({ monsterKey: 'spider', x: 6 * TILE, y: 5 * TILE });
    this.spawnEnemy({ monsterKey: 'wraith', x: 5 * TILE, y: 7 * TILE });
    this.spawnEnemy({ monsterKey: 'spider', x: 14 * TILE, y: 9 * TILE });
    this.spawnEnemy({ monsterKey: 'wraith', x: 23 * TILE, y: 6 * TILE });
    this.spawnEnemy({ monsterKey: 'wraith', x: 25 * TILE, y: 9 * TILE });

    // Exit UP → Floor 1
    this.addExit({
      x: 3 * TILE, y: 0, w: 4 * TILE, h: TILE,
      targetScene: 'MossbarrowDepthsScene', targetSpawn: 'fromFloor2',
      label: '↑ Floor 1',
    });
    this.add.rectangle(5 * TILE, TILE, 96, 40, 0x202028).setStrokeStyle(2, 0x404050).setDepth(3);
    this.add.text(5 * TILE, TILE, '▲ Floor 1', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#8888aa',
    }).setOrigin(0.5).setDepth(4);

    // Exit DOWN → Floor 3 (boss)
    this.addExit({
      x: 22 * TILE, y: 12 * TILE, w: 3 * TILE, h: TILE,
      targetScene: 'DepthsFloor3Scene', targetSpawn: 'fromFloor2',
      label: '▼ Stairs Down',
    });
    this.add.rectangle(23.5 * TILE, 11.5 * TILE, 80, 40, 0x181020).setStrokeStyle(2, 0x402040).setDepth(3);
    this.add.text(23.5 * TILE, 11.5 * TILE, '▼ Floor 3', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#a04080',
    }).setOrigin(0.5).setDepth(4);
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromFloor3':
        return { x: 23 * TILE, y: 10 * TILE };
      case 'fromFloor1':
      case 'default':
      default:
        return { x: 5 * TILE, y: 3 * TILE };
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
 * Floor 2 layout:
 *   West chamber: cols 2-10, rows 1-10 (stair up at cols 3-6, row 0)
 *   Winding passage: cols 10-16, rows 5-13
 *   East chamber: cols 16-27, rows 3-13 (stair down at cols 22-24, row 12)
 */
function tileAt(x: number, y: number): number {
  // West chamber
  if (inRect(x, y, 2, 1, 9, 10)) return FS;
  if (inRect(x, y, 3, 0, 4, 1)) return FS; // stair opening

  // Winding passage — widens and narrows
  if (inRect(x, y, 10, 5, 7, 4)) return FS;   // upper section
  if (inRect(x, y, 12, 9, 5, 5)) return FS;    // jog south

  // East chamber
  if (inRect(x, y, 16, 3, 12, 11)) return FS;

  // Stairs-down alcove
  if (inRect(x, y, 21, 12, 4, 2)) return FS;

  return WS;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
