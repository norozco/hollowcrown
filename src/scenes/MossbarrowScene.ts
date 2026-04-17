import { useDialogueStore } from '../state/dialogueStore';
import { getDialogue } from '../engine/dialogues';
import { BaseWorldScene, TILE, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Mossbarrow Cairn — tilemap version. Dark stone clearing with a ring
 * of cairn stones, a hollow oak, and the center stone interactable.
 */

const MAP_W = 40;
const MAP_H = 22;

export class MossbarrowScene extends BaseWorldScene {
  constructor() {
    super({ key: 'MossbarrowScene' });
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

    // Cairn stone collision bodies — invisible since the tilemap draws them.
    const stoneTiles = getCairnPositions();
    for (const [tx, ty] of stoneTiles) {
      const cx = tx * TILE + TILE / 2;
      const cy = ty * TILE + TILE / 2;
      const stone = this.add.rectangle(cx, cy, 28, 28, 0x000000, 0);
      this.physics.add.existing(stone, true);
      this.walls.add(stone);
    }

    // Hollow oak — collision body (tilemap handles the visual).
    const oakRect = this.add.rectangle(10 * TILE + 16, 8 * TILE + 24, 48, 64, 0x000000, 0);
    this.physics.add.existing(oakRect, true);
    this.walls.add(oakRect);

    // Enemies — risen bones guarding the cairn.
    this.spawnEnemy({ monsterKey: 'skeleton', x: 16 * TILE, y: 10 * TILE });
    this.spawnEnemy({ monsterKey: 'skeleton', x: 28 * TILE, y: 12 * TILE });
    this.spawnEnemy({ monsterKey: 'skeleton', x: 12 * TILE, y: 14 * TILE });
    this.spawnEnemy({ monsterKey: 'skeleton', x: 32 * TILE, y: 8 * TILE });

    // Zone marker.
    this.add
      .text(2 * TILE, WORLD_H / 2, 'MOSSBARROW CAIRN', {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#6a5838',
      })
      .setOrigin(0, 0.5)
      .setAlpha(0.5)
      .setDepth(15);

    // West edge → Greenhollow.
    this.addExit({
      x: 0,
      y: 0,
      w: TILE,
      h: WORLD_H,
      targetScene: 'GreenhollowScene',
      targetSpawn: 'fromMossbarrow',
      label: '← Greenhollow',
    });

    // Center stone — visible altar/pedestal with glow-ish highlight.
    const cairnCx = 22 * TILE;
    const cairnCy = 11 * TILE;
    const centerStone = this.add.rectangle(cairnCx, cairnCy, 40, 40, 0x8a8a80);
    centerStone.setStrokeStyle(2, 0x585850);
    centerStone.setDepth(5);
    // Inner glow (smaller lighter rect)
    const glow = this.add.rectangle(cairnCx, cairnCy, 28, 28, 0xa0a098);
    glow.setDepth(5);
    this.physics.add.existing(centerStone, true);
    this.walls.add(centerStone);

    this.spawnInteractable({
      sprite: centerStone,
      label: 'Examine the center stone',
      radius: 28,
      action: () => {
        useDialogueStore.getState().start(getDialogue('mossbarrow-cairn'));
      },
    });

    // Stairway entrance — south of the center stone, leads to Mossbarrow Depths.
    const stairCx = cairnCx;
    const stairCy = cairnCy + 3 * TILE;
    // Visual: dark rectangle to suggest a pit/descent
    const stairRect = this.add.rectangle(stairCx, stairCy, 64, 40, 0x101018);
    stairRect.setStrokeStyle(2, 0x303040);
    stairRect.setDepth(4);
    this.add
      .text(stairCx, stairCy - 2, 'Stairs Down', {
        fontFamily: 'Courier New',
        fontSize: '10px',
        color: '#6060a0',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(5);
    this.add
      .text(stairCx, stairCy + 12, '▼', {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#4040a8',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(5);

    // Exit trigger — slightly wider than the visual so it's easy to enter
    this.addExit({
      x: stairCx - 32,
      y: stairCy - 20,
      w: 64,
      h: 40,
      targetScene: 'MossbarrowDepthsScene',
      targetSpawn: 'fromMossbarrow',
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromGreenhollow':
        return { x: 2 * TILE + 16, y: WORLD_H / 2 };
      case 'fromDepths':
        // Surface exit — just south of the stair entrance (center stone area)
        return { x: 22 * TILE, y: 15 * TILE };
      case 'default':
      default:
        return { x: 2 * TILE + 16, y: WORLD_H / 2 };
    }
  }
}

// ─── Map data ──────────────────────────────────────────────────

const FS = T.FLOOR_STONE;
const S  = T.WALL_STONE;
const _G = T.GRASS_DARK; void _G;
const P  = T.PATH;
const PE = T.PATH_EDGE;
const BU = T.BUSH;
const WA = T.WATER;

/** Cairn stone positions (WALL_STONE tiles that need physics bodies). */
function getCairnPositions(): [number, number][] {
  const positions: [number, number][] = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (tileAt(x, y) === S) positions.push([x, y]);
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
  // ── Cairn ring — 6 stones in a rough circle around (22, 11) ──
  const cairnStones: [number, number][] = [
    [19, 8], [25, 8], [18, 11], [26, 11], [19, 14], [25, 14],
  ];
  for (const [sx, sy] of cairnStones) {
    if (x === sx && y === sy) return S;
  }

  // ── Center stone area — stone floor ──
  if (inRect(x, y, 20, 9, 5, 5)) return FS;

  // ── Hollow oak at (9-11, 6-10) ──
  if (inRect(x, y, 9, 6, 3, 5)) return T.WALL_WOOD; // dark trunk

  // ── Ivy stones scattered around edges ──
  const ivyStones: [number, number][] = [
    [14, 5], [28, 5], [14, 17], [28, 17], [8, 12], [34, 12],
    [6, 4], [36, 8], [12, 18], [30, 18],
  ];
  for (const [ix, iy] of ivyStones) {
    if (x === ix && y === iy) return BU;
  }

  // ── Path from west entrance to cairn center ──
  if (y >= 10 && y <= 12 && x >= 1 && x <= 19) return P;
  if (y === 9 && x >= 1 && x <= 19) return PE;
  if (y === 13 && x >= 1 && x <= 19) return PE;

  // ── Small pools of stagnant water ──
  if (inRect(x, y, 4, 3, 2, 2)) return WA;
  if (inRect(x, y, 33, 16, 3, 2)) return WA;

  // ── Moss patches (light grass on stone) ──
  const hash = ((x * 11 + y * 7) % 13);
  if (hash < 2) return T.GRASS_LIGHT; // mossy stone floor

  // ── Default: dark stone ground ──
  return FS;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
