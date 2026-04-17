import * as Phaser from 'phaser';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Mossbarrow Depths — Floor 2. Wraith-haunted catacombs with
 * sarcophagi, chains, bones, and spectral energy. Two chambers
 * connected by a blood-stained narrow passage.
 */

const MAP_W = 30;
const MAP_H = 22;

/** Tiles the player cannot walk through */
const SOLID_TILES = new Set([T.WALL_STONE, T.CHAINS]);

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

    // Wall + solid collision
    for (const [tx, ty] of getSolidPositions()) {
      const w = this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
      this.physics.add.existing(w, true);
      this.walls.add(w);
    }

    // Zone label
    this.add.text(WORLD_W / 2, 2 * TILE, 'THE CATACOMBS', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#404068',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);

    // ── Blue torches (more numerous for spectral atmosphere) ──
    for (const [tx, ty] of [
      [4, 1], [15, 1], [4, 4], [15, 4], [4, 7], [15, 7],
      [8, 8], [12, 8], [8, 11], [12, 11],
      [4, 13], [15, 13], [4, 16], [15, 16], [4, 19], [15, 19],
    ] as [number, number][]) {
      this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 22, 22, 0x4060ff, 0.16).setDepth(4);
    }

    // ── Sarcophagus shapes in north chamber ──
    for (const [sx, sy] of [[5, 3], [13, 3]] as [number, number][]) {
      // Sarcophagus body (grey stone)
      const sarcBody = this.add.rectangle(sx * TILE + TILE, sy * TILE + TILE / 2, TILE * 1.8, TILE * 0.8, 0x606068);
      sarcBody.setStrokeStyle(2, 0x808090).setDepth(5);
      // Gold trim on lid
      this.add.rectangle(sx * TILE + TILE, sy * TILE + TILE / 2 - 2, TILE * 1.6, 4, 0xc09838, 0.7).setDepth(5);
      // Cross symbol on lid
      this.add.rectangle(sx * TILE + TILE, sy * TILE + TILE / 2, 2, 12, 0xa08030, 0.6).setDepth(5);
      this.add.rectangle(sx * TILE + TILE, sy * TILE + TILE / 2 - 2, 8, 2, 0xa08030, 0.6).setDepth(5);
    }

    // ── Sarcophagus in south chamber ──
    for (const [sx, sy] of [[5, 15], [13, 15]] as [number, number][]) {
      const sarcBody = this.add.rectangle(sx * TILE + TILE, sy * TILE + TILE / 2, TILE * 1.8, TILE * 0.8, 0x585060);
      sarcBody.setStrokeStyle(2, 0x707080).setDepth(5);
      this.add.rectangle(sx * TILE + TILE, sy * TILE + TILE / 2 - 2, TILE * 1.6, 4, 0xb08830, 0.6).setDepth(5);
    }

    // ── Floating spectral wisps (blue-white circles with tweened movement) ──
    for (const [wx, wy] of [[7, 2], [12, 5], [10, 10], [6, 17], [13, 14], [9, 19]] as [number, number][]) {
      const wisp = this.add.circle(wx * TILE + TILE / 2, wy * TILE + TILE / 2, 4, 0x80a0ff, 0.3).setDepth(7);
      this.tweens.add({
        targets: wisp,
        x: wisp.x + Phaser.Math.Between(-20, 20),
        y: wisp.y + Phaser.Math.Between(-16, 16),
        alpha: { from: 0.15, to: 0.45 },
        duration: 2000 + Math.random() * 1500,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // ── Coffin alcoves (dark recessed rectangles along walls) ──
    // North chamber side alcoves
    for (const cy of [2, 5]) {
      this.add.rectangle(4 * TILE + 4, cy * TILE + TILE / 2, 10, 24, 0x181820, 0.8).setDepth(2);
      this.add.rectangle(15 * TILE + TILE - 4, cy * TILE + TILE / 2, 10, 24, 0x181820, 0.8).setDepth(2);
    }
    // South chamber side alcoves
    for (const cy of [14, 17]) {
      this.add.rectangle(4 * TILE + 4, cy * TILE + TILE / 2, 10, 24, 0x181820, 0.8).setDepth(2);
      this.add.rectangle(15 * TILE + TILE - 4, cy * TILE + TILE / 2, 10, 24, 0x181820, 0.8).setDepth(2);
    }

    // ── Candelabras with blue flame ──
    for (const [cx, cy] of [[6, 1], [13, 1], [6, 12], [13, 12]] as [number, number][]) {
      // Base
      this.add.rectangle(cx * TILE + TILE / 2, cy * TILE + TILE - 4, 12, 6, 0x606068).setDepth(5);
      // Stem
      this.add.rectangle(cx * TILE + TILE / 2, cy * TILE + TILE / 2, 3, 16, 0x707078).setDepth(5);
      // Blue flames (3 candles)
      for (const off of [-6, 0, 6]) {
        this.add.circle(cx * TILE + TILE / 2 + off, cy * TILE + 4, 3, 0x4080ff, 0.8).setDepth(6);
        this.add.circle(cx * TILE + TILE / 2 + off, cy * TILE + 2, 2, 0x80c0ff, 0.6).setDepth(6);
      }
    }

    // ── Skull piles near the corridor entrance ──
    for (const [sx, sy] of [[8, 7], [12, 7], [8, 12], [12, 12]] as [number, number][]) {
      this.add.circle(sx * TILE + TILE / 2, sy * TILE + TILE / 2, 5, 0xd0c8b0, 0.6).setDepth(5);
      this.add.circle(sx * TILE + TILE / 2 + 6, sy * TILE + TILE / 2 + 2, 4, 0xc8c0a8, 0.5).setDepth(5);
      this.add.circle(sx * TILE + TILE / 2 - 4, sy * TILE + TILE / 2 + 3, 3, 0xc0b8a0, 0.4).setDepth(5);
    }

    // Enemies — wraiths and spiders (positions on walkable floor tiles)
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

const WS = T.WALL_STONE;
const FC = T.FLOOR_CRACKED;
const BN = T.BONES;
const CH = T.CHAINS;
const BS = T.BLOOD_STONE;
const WT = T.WATER;

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
 * Floor 2: Wraith Catacombs — two chambers connected by a narrow,
 * blood-stained corridor. Bones on floors, chains on walls,
 * stagnant water pools.
 */
function tileAt(x: number, y: number): number {
  // Stair openings
  if (inRect(x, y, 7, 0, 5, 1)) return FC;
  if (inRect(x, y, 7, 21, 5, 1)) return FC;

  // ── North chamber (cols 4-15, rows 1-7) ──
  if (inRect(x, y, 4, 1, 12, 7)) {
    // Chains on the north wall edge
    if (y === 1 && (x === 4 || x === 15)) return CH;
    // Bones scattered on the floor
    if ((x === 6 && y === 4) || (x === 10 && y === 6) || (x === 14 && y === 3)) return BN;
    // Stagnant water pool in corner
    if (inRect(x, y, 13, 5, 2, 2)) return WT;
    return FC;
  }

  // ── Connecting corridor (cols 8-12, rows 8-11) — blood-stained ──
  if (inRect(x, y, 8, 8, 5, 4)) {
    // Blood stone through the passage (something terrible happened)
    if (inRect(x, y, 9, 9, 3, 2)) return BS;
    return FC;
  }

  // ── South chamber (cols 4-15, rows 12-20) ──
  if (inRect(x, y, 4, 12, 12, 9)) {
    // Chains on the south wall edge
    if (y === 20 && (x === 4 || x === 15)) return CH;
    if (y === 12 && (x === 4 || x === 15)) return CH;
    // Bones scattered
    if ((x === 5 && y === 14) || (x === 9 && y === 18) || (x === 14 && y === 16) || (x === 7 && y === 19)) return BN;
    // Blood stains near passage entrance
    if (x === 10 && y === 12) return BS;
    if (x === 11 && y === 13) return BS;
    // Stagnant water pool
    if (inRect(x, y, 5, 18, 2, 2)) return WT;
    return FC;
  }

  return WS;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
