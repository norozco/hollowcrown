import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Mossbarrow Depths — Floor 1. Entry level of the dungeon beneath the
 * Mossbarrow Cairn. Spiders patrol narrow corridors. Stairs down lead
 * to Floor 2.
 *
 * Layout: L-shaped corridor with a central hub room.
 */

const MAP_W = 30;
const MAP_H = 22;

export class MossbarrowDepthsScene extends BaseWorldScene {
  constructor() {
    super({ key: 'MossbarrowDepthsScene' });
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

    // Wall collision bodies
    const wallPositions = getWallPositions();
    for (const [tx, ty] of wallPositions) {
      const cx = tx * TILE + TILE / 2;
      const cy = ty * TILE + TILE / 2;
      const wall = this.add.rectangle(cx, cy, TILE, TILE, 0x000000, 0);
      this.physics.add.existing(wall, true);
      this.walls.add(wall);
    }

    // Zone label
    this.add.text(3 * TILE, 2 * TILE, 'DEPTHS — FLOOR 1', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#505060',
    }).setAlpha(0.45).setDepth(15);

    // Torches
    for (const [tx, ty] of [[4, 2], [9, 2], [4, 7], [14, 4], [14, 9], [20, 7], [24, 10], [24, 15]] as [number, number][]) {
      this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 20, 20, 0xff8800, 0.12).setDepth(4);
    }

    // Enemies — 3 spiders
    this.spawnEnemy({ monsterKey: 'spider', x: 8 * TILE, y: 5 * TILE });
    this.spawnEnemy({ monsterKey: 'spider', x: 14 * TILE, y: 7 * TILE });
    this.spawnEnemy({ monsterKey: 'spider', x: 22 * TILE, y: 12 * TILE });

    // Exit UP → surface
    this.addExit({
      x: 4 * TILE, y: 0, w: 4 * TILE, h: TILE,
      targetScene: 'MossbarrowScene', targetSpawn: 'fromDepths',
      label: '↑ Surface',
    });

    // Stairs Up visual
    this.add.rectangle(6 * TILE, TILE, 96, 40, 0x202028).setStrokeStyle(2, 0x404050).setDepth(3);
    this.add.text(6 * TILE, TILE, '▲ Stairs Up', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#8888aa',
    }).setOrigin(0.5).setDepth(4);

    // Exit DOWN → Floor 2 (bottom-right of the map)
    this.addExit({
      x: 22 * TILE, y: 16 * TILE, w: 3 * TILE, h: TILE,
      targetScene: 'DepthsFloor2Scene', targetSpawn: 'fromFloor1',
      label: '▼ Stairs Down',
    });

    // Stairs Down visual
    this.add.rectangle(23.5 * TILE, 15.5 * TILE, 80, 40, 0x181420).setStrokeStyle(2, 0x302848).setDepth(3);
    this.add.text(23.5 * TILE, 15.5 * TILE, '▼ Floor 2', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#7060a0',
    }).setOrigin(0.5).setDepth(4);
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromFloor2':
        return { x: 23 * TILE, y: 14 * TILE };
      case 'fromMossbarrow':
      case 'default':
      default:
        return { x: 6 * TILE, y: 3 * TILE };
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
 * Floor 1 layout:
 *   Entry room: cols 3-10, rows 1-8 (stair opening at cols 4-7, row 0)
 *   Corridor east: cols 10-16, rows 4-8
 *   Hub room: cols 14-26, rows 4-16
 *   Alcove south: cols 21-25, rows 14-17 (stairs down area)
 */
function tileAt(x: number, y: number): number {
  // Entry room
  if (inRect(x, y, 3, 1, 8, 8)) return FS;
  if (inRect(x, y, 4, 0, 4, 1)) return FS; // stair opening

  // East corridor
  if (inRect(x, y, 10, 4, 7, 5)) return FS;

  // Hub room
  if (inRect(x, y, 14, 4, 13, 13)) return FS;

  // Stairs-down alcove
  if (inRect(x, y, 21, 14, 5, 4)) return FS;

  return WS;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
