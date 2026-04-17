import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Mossbarrow Depths — dark underground dungeon beneath the Mossbarrow Cairn.
 * Three rooms connected by narrow corridors:
 *   Room 1 (top-left)  — entry from surface stairs
 *   Room 2 (middle)    — spider + wraith guarded chamber
 *   Room 3 (bottom-right) — boss room, the Hollow King waits
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

    // Wall collision bodies for stone wall tiles
    const wallPositions = getWallPositions();
    for (const [tx, ty] of wallPositions) {
      const cx = tx * TILE + TILE / 2;
      const cy = ty * TILE + TILE / 2;
      const wall = this.add.rectangle(cx, cy, TILE, TILE, 0x000000, 0);
      this.physics.add.existing(wall, true);
      this.walls.add(wall);
    }

    // ── Zone label ──
    this.add
      .text(2 * TILE, WORLD_H / 2, 'MOSSBARROW DEPTHS', {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#505060',
      })
      .setOrigin(0, 0.5)
      .setAlpha(0.45)
      .setDepth(15);

    // ── Atmospheric torches ──
    const torchPositions: [number, number][] = [
      [4, 4], [10, 4], [4, 9], [10, 10],
      [13, 10], [19, 14], [22, 17], [26, 17],
    ];
    for (const [tx, ty] of torchPositions) {
      const glow = this.add.rectangle(
        tx * TILE + TILE / 2,
        ty * TILE + TILE / 2,
        20, 20,
        0xff8800,
        0.12,
      );
      glow.setDepth(4);
    }

    // ── Cairn stone decorations in boss room ──
    const cairnDecos: [number, number][] = [
      [23, 16], [27, 16], [23, 20], [27, 20],
    ];
    for (const [tx, ty] of cairnDecos) {
      const stone = this.add.rectangle(
        tx * TILE + TILE / 2,
        ty * TILE + TILE / 2,
        24, 24,
        0x585855,
      );
      stone.setStrokeStyle(2, 0x3a3a35);
      stone.setDepth(5);
      const inner = this.add.rectangle(
        tx * TILE + TILE / 2,
        ty * TILE + TILE / 2,
        14, 14,
        0x686863,
      );
      inner.setDepth(5);
      // Cairn stones are solid
      this.physics.add.existing(stone, true);
      this.walls.add(stone);
    }

    // ── Enemies ──
    // 2 spiders in corridor between room 1 and 2
    this.spawnEnemy({ monsterKey: 'spider', x: 11 * TILE, y: 6 * TILE });
    this.spawnEnemy({ monsterKey: 'spider', x: 13 * TILE, y: 8 * TILE });

    // Room 2: 1 wraith + 1 spider
    this.spawnEnemy({ monsterKey: 'wraith', x: 16 * TILE, y: 11 * TILE });
    this.spawnEnemy({ monsterKey: 'spider', x: 19 * TILE, y: 13 * TILE });

    // Room 3 (boss room): the Hollow King
    this.spawnEnemy({ monsterKey: 'hollow_king', x: 25 * TILE, y: 18 * TILE });

    // ── Exit: top edge → back to MossbarrowScene ──
    this.addExit({
      x: 4 * TILE,
      y: 0,
      w: 4 * TILE,
      h: TILE,
      targetScene: 'MossbarrowScene',
      targetSpawn: 'fromDepths',
      label: '↑ Surface',
    });

    // Stairway visual indicator near top exit
    const stairX = 6 * TILE;
    const stairY = TILE;
    const stairRect = this.add.rectangle(stairX, stairY + 8, 96, 48, 0x202028);
    stairRect.setStrokeStyle(2, 0x404050);
    stairRect.setDepth(3);
    this.add
      .text(stairX, stairY + 8, 'Stairs Up', {
        fontFamily: 'Courier New',
        fontSize: '10px',
        color: '#8888aa',
      })
      .setOrigin(0.5)
      .setDepth(4);
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromMossbarrow':
      case 'default':
      default:
        // Top-center of the map, inside room 1
        return { x: WORLD_W / 2 - 7 * TILE, y: 3 * TILE + 16 };
    }
  }
}

// ─── Map data ────────────────────────────────────────────────────

const FS = T.FLOOR_STONE;
const WS = T.WALL_STONE;
const SH = T.SHADOW;

/** Return all tile coordinates that should have physics wall bodies. */
function getWallPositions(): [number, number][] {
  const positions: [number, number][] = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const t = tileAt(x, y);
      if (t === WS || t === SH) positions.push([x, y]);
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

/**
 * Map layout (30 wide × 22 tall, tile coords):
 *
 *  Room 1 (entry):  cols 2-10,  rows 1-9
 *  Corridor A:      cols 9-14,  rows 5-8   (connects room 1 → room 2)
 *  Room 2 (middle): cols 12-21, rows 8-15
 *  Corridor B:      cols 20-24, rows 14-17 (connects room 2 → boss room)
 *  Room 3 (boss):   cols 22-28, rows 15-21
 *
 *  Stairs opening at top: cols 4-7, row 0
 */
function tileAt(x: number, y: number): number {
  // ── Room 1: entry room (top-left) ──
  if (inRoom1(x, y)) return FS;

  // ── Corridor A: room 1 → room 2 ──
  if (inCorridorA(x, y)) return FS;

  // ── Room 2: middle chamber ──
  if (inRoom2(x, y)) return FS;

  // ── Corridor B: room 2 → boss room ──
  if (inCorridorB(x, y)) return FS;

  // ── Room 3: boss room ──
  if (inRoom3(x, y)) return FS;

  // Everything else is solid stone wall
  return WS;
}

function inRoom1(x: number, y: number): boolean {
  // cols 2-10, rows 1-9; plus stair opening at row 0, cols 4-7
  if (inRect(x, y, 2, 1, 9, 9)) return true;
  if (inRect(x, y, 4, 0, 4, 1)) return true; // stair gap
  return false;
}

function inCorridorA(x: number, y: number): boolean {
  // narrow 3-tile corridor, cols 9-14, rows 5-8
  return inRect(x, y, 9, 5, 6, 4);
}

function inRoom2(x: number, y: number): boolean {
  // cols 12-21, rows 8-15
  return inRect(x, y, 12, 8, 10, 8);
}

function inCorridorB(x: number, y: number): boolean {
  // narrow corridor, cols 20-24, rows 14-17
  return inRect(x, y, 20, 14, 5, 4);
}

function inRoom3(x: number, y: number): boolean {
  // boss room, cols 22-28, rows 15-21
  return inRect(x, y, 22, 15, 7, 7);
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
