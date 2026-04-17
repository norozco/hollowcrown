import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Mossbarrow Depths — Floor 3 (Boss Floor). A single massive throne
 * room with cairn pillars. The Hollow King waits at the far end.
 * Stairs up at the top-center. No stairs down — this is the bottom.
 */

const MAP_W = 30;
const MAP_H = 22;

export class DepthsFloor3Scene extends BaseWorldScene {
  constructor() {
    super({ key: 'DepthsFloor3Scene' });
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
    this.add.text(WORLD_W / 2, 2 * TILE, 'THE HOLLOW THRONE', {
      fontFamily: 'Courier New', fontSize: '14px', color: '#604080',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);

    // Purple torches — boss atmosphere
    for (const [tx, ty] of [
      [5, 3], [5, 10], [5, 17],
      [24, 3], [24, 10], [24, 17],
      [10, 6], [10, 14],
      [19, 6], [19, 14],
    ] as [number, number][]) {
      this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 24, 24, 0x8040c0, 0.15).setDepth(4);
    }

    // Cairn pillar decorations (solid)
    for (const [tx, ty] of [
      [7, 5], [7, 15], [22, 5], [22, 15],
      [10, 8], [10, 12], [19, 8], [19, 12],
    ] as [number, number][]) {
      const stone = this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 28, 28, 0x484050);
      stone.setStrokeStyle(2, 0x303040);
      stone.setDepth(5);
      this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 16, 16, 0x585068).setDepth(5);
      this.physics.add.existing(stone, true);
      this.walls.add(stone);
    }

    // Throne visual at the far end
    const throneX = 15 * TILE;
    const throneY = 18 * TILE;
    const throne = this.add.rectangle(throneX, throneY, 48, 48, 0x302040);
    throne.setStrokeStyle(3, 0x604080);
    throne.setDepth(5);
    this.add.rectangle(throneX, throneY - 24, 48, 16, 0x403060).setStrokeStyle(2, 0x604080).setDepth(5);
    this.physics.add.existing(throne, true);
    this.walls.add(throne);

    // Boss enemy — The Hollow King
    this.spawnEnemy({ monsterKey: 'hollow_king', x: 15 * TILE, y: 14 * TILE });

    // Skeleton guards
    this.spawnEnemy({ monsterKey: 'skeleton', x: 9 * TILE, y: 10 * TILE });
    this.spawnEnemy({ monsterKey: 'skeleton', x: 21 * TILE, y: 10 * TILE });

    // ── EXIT UP → Floor 2 (top-center, wide) ──
    this.addExit({
      x: 12 * TILE, y: 0, w: 6 * TILE, h: TILE,
      targetScene: 'DepthsFloor2Scene', targetSpawn: 'fromFloor3',
      label: '↑ Floor 2',
    });
    this.add.rectangle(15 * TILE, 1.2 * TILE, 140, 36, 0x202028).setStrokeStyle(2, 0x404050).setDepth(3);
    this.add.text(15 * TILE, 1.2 * TILE, '▲ Floor 2', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#8888aa',
    }).setOrigin(0.5).setDepth(4);
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromFloor2':
      case 'default':
      default:
        return { x: 15 * TILE, y: 4 * TILE };
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
 * Floor 3: Grand throne room.
 *   Main hall: cols 4-25, rows 1-20
 *   Stair opening at top: cols 12-17, row 0 (wide — easy to find)
 */
function tileAt(x: number, y: number): number {
  // Throne room
  if (inRect(x, y, 4, 1, 22, 20)) return FS;
  // Stair opening (wide)
  if (inRect(x, y, 12, 0, 6, 1)) return FS;

  return WS;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
