import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Mossbarrow Depths — Floor 1. Entry level beneath the cairn.
 * Spiders patrol. Straightforward layout: enter at top, stairs
 * down at the bottom-center so the path is obvious.
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

    // Wall collision
    for (const [tx, ty] of getWallPositions()) {
      const wall = this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
      this.physics.add.existing(wall, true);
      this.walls.add(wall);
    }

    // Zone label
    this.add.text(WORLD_W / 2, 2 * TILE, 'DEPTHS — FLOOR 1', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#505060',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);

    // Torches along the main path
    for (const [tx, ty] of [[6, 2], [10, 2], [6, 7], [10, 7], [6, 12], [10, 12], [6, 17], [10, 17]] as [number, number][]) {
      this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 20, 20, 0xff8800, 0.12).setDepth(4);
    }

    // Enemies — spiders along the corridor
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

    // ── EXIT DOWN → Floor 2 (bottom-center, wide and obvious) ──
    this.addExit({
      x: 6 * TILE, y: 19 * TILE, w: 5 * TILE, h: 2 * TILE,
      targetScene: 'DepthsFloor2Scene', targetSpawn: 'fromFloor1',
      label: '▼ Floor 2',
    });
    // Big stairwell visual
    const stairX = 8.5 * TILE;
    const stairY = 19 * TILE;
    this.add.rectangle(stairX, stairY, 140, 52, 0x10101a).setStrokeStyle(2, 0x302848).setDepth(3);
    this.add.text(stairX, stairY - 8, '▼ Stairs Down', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#8060c0',
    }).setOrigin(0.5).setDepth(4);
    this.add.text(stairX, stairY + 10, 'Floor 2', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#6050a0',
    }).setOrigin(0.5).setDepth(4);
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
 * Floor 1: Vertical corridor from top to bottom.
 *   Main hall: cols 5-12, rows 1-21 (wide vertical passage)
 *   Stair up opening: cols 6-10, row 0
 *   Stair down opening: cols 6-10, row 21
 *   Side alcoves for variety at rows 5-7 and 12-14
 */
function tileAt(x: number, y: number): number {
  // Main vertical hall
  if (inRect(x, y, 5, 1, 8, 20)) return FS;

  // Stair openings
  if (inRect(x, y, 6, 0, 5, 1)) return FS;  // up
  if (inRect(x, y, 6, 21, 5, 1)) return FS;  // down

  // East alcove (cols 13-17, rows 5-8)
  if (inRect(x, y, 13, 5, 5, 4)) return FS;

  // West alcove (cols 1-4, rows 12-15)
  if (inRect(x, y, 1, 12, 4, 4)) return FS;

  return WS;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
