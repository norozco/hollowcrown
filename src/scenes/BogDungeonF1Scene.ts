import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Ashenmere Bog Dungeon — Floor 1: The Sunken Halls.
 * Flooded stone corridors, knee-deep water everywhere.
 * WATER tiles with MOSS_STONE walkways. Top-to-bottom flow.
 */

const MAP_W = 30;
const MAP_H = 22;

const SOLID_TILES = new Set([T.WALL_STONE, T.WATER]);

export class BogDungeonF1Scene extends BaseWorldScene {
  constructor() {
    super({ key: 'BogDungeonF1Scene' });
  }

  protected getZoneName(): string | null { return 'The Sunken Halls'; }

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
    this.add.text(WORLD_W / 2, 2 * TILE, 'THE SUNKEN HALLS', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#406860',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);

    // ── Green-blue torches ──
    for (const [tx, ty] of [
      [6, 2], [13, 2], [6, 6], [13, 6], [6, 10], [13, 10],
      [6, 14], [13, 14], [6, 18], [13, 18],
    ] as [number, number][]) {
      this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 22, 22, 0x30a080, 0.14).setDepth(4);
    }

    // ── Water drip effects near corridor edges ──
    for (const [dx, dy] of [[7, 3], [12, 5], [8, 9], [11, 13], [9, 17]] as [number, number][]) {
      const drip = this.add.circle(dx * TILE + TILE / 2, dy * TILE, 2, 0x4080a0, 0.7).setDepth(6);
      this.tweens.add({
        targets: drip, y: dy * TILE + TILE, alpha: 0, duration: 1200,
        repeat: -1, delay: Math.random() * 800,
      });
    }

    // ── Submerged rubble decorations ──
    for (const [rx, ry] of [[5, 4], [14, 8], [5, 16], [14, 12]] as [number, number][]) {
      this.add.rectangle(rx * TILE + TILE / 2, ry * TILE + TILE / 2, 18, 10, 0x405848, 0.5).setDepth(3);
      this.add.rectangle(rx * TILE + TILE / 2 + 6, ry * TILE + TILE / 2 - 2, 8, 6, 0x486050, 0.4).setDepth(3);
    }

    // ── Enemies ──
    this.spawnEnemy({ monsterKey: 'bog_lurker', x: 9 * TILE, y: 5 * TILE });
    this.spawnEnemy({ monsterKey: 'bog_lurker', x: 10 * TILE, y: 14 * TILE });
    this.spawnEnemy({ monsterKey: 'spider', x: 8 * TILE, y: 8 * TILE });
    this.spawnEnemy({ monsterKey: 'spider', x: 11 * TILE, y: 11 * TILE });
    this.spawnEnemy({ monsterKey: 'wraith', x: 10 * TILE, y: 17 * TILE });

    // ── Spike traps (5 damage) ──
    this.spawnTrap({ x: 9 * TILE, y: 7 * TILE, damage: 5 });
    this.spawnTrap({ x: 10 * TILE, y: 15 * TILE, damage: 5 });

    // ── Treasure chest ──
    this.spawnChest({
      x: 13 * TILE + TILE / 2, y: 6 * TILE + TILE / 2,
      loot: [{ itemKey: 'health_potion', qty: 2 }, { itemKey: 'moonpetal' }],
      gold: 15,
    });

    // ── Random loot bag (20%) ──
    this.spawnLootBag({
      x: 7 * TILE, y: 12 * TILE,
      loot: [
        { itemKey: 'health_potion', weight: 3 },
        { itemKey: 'shadow_essence', weight: 2 },
        { itemKey: 'moonpetal', weight: 1 },
      ],
      gold: 12, spawnChance: 0.2,
    });

    // ── EXIT UP → Ashenmere (top-center) ──
    this.addExit({
      x: 7 * TILE, y: 0, w: 5 * TILE, h: TILE,
      targetScene: 'AshenmereScene', targetSpawn: 'fromBogDungeon',
      label: '↑ Ashenmere Marshes',
    });
    this.add.rectangle(9.5 * TILE, 1.2 * TILE, 140, 36, 0x202028).setStrokeStyle(2, 0x304050).setDepth(3);
    this.add.text(9.5 * TILE, 1.2 * TILE, '▲ Surface', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#6088aa',
    }).setOrigin(0.5).setDepth(4);

    // ── EXIT DOWN → Floor 2 (bottom-center) ──
    this.addExit({
      x: 7 * TILE, y: 19 * TILE, w: 5 * TILE, h: 2 * TILE,
      targetScene: 'BogDungeonF2Scene', targetSpawn: 'fromFloor1',
      label: '▼ Floor 2',
    });
    const stairX = 9.5 * TILE;
    const stairY = 19.5 * TILE;
    this.add.rectangle(stairX, stairY, 140, 52, 0x10101a).setStrokeStyle(2, 0x204040).setDepth(3);
    this.add.text(stairX, stairY - 8, '▼ Stairs Down', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#4080a0',
    }).setOrigin(0.5).setDepth(4);
    this.add.text(stairX, stairY + 10, 'The Drowned Gallery', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#306878',
    }).setOrigin(0.5).setDepth(4);
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromFloor2':
        return { x: 9.5 * TILE, y: 17 * TILE };
      case 'fromAshenmere':
      case 'default':
      default:
        return { x: 9.5 * TILE, y: 3 * TILE };
    }
  }
}

// ─── Map data ──────────────────────────────────────────────────────

const WS = T.WALL_STONE;
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
 * Floor 1: Sunken Halls — vertical corridor flooded with water.
 *   Main walkway: cols 7-12, rows 1-20 (moss stone raised path)
 *   East alcove: cols 13-16, rows 5-8 (dry pocket)
 *   West alcove: cols 3-6, rows 13-16 (dry pocket)
 *   Stair up: cols 7-11, row 0
 *   Stair down: cols 7-11, row 21
 *   Everything else: water
 */
function tileAt(x: number, y: number): number {
  // Stair openings
  if (inRect(x, y, 7, 0, 5, 1)) return FC;
  if (inRect(x, y, 7, 21, 5, 1)) return FC;

  // ── East alcove (cols 13-16, rows 5-8) — dry stone ──
  if (inRect(x, y, 13, 5, 4, 4)) return FC;

  // ── West alcove (cols 3-6, rows 13-16) — dry stone ──
  if (inRect(x, y, 3, 13, 4, 4)) return FC;

  // ── Main walkway (cols 7-12, rows 1-20) — raised moss stone ──
  if (inRect(x, y, 7, 1, 6, 20)) {
    // Moss accents on edges
    if ((x === 7 || x === 12) && (y <= 3 || y >= 18)) return MS;
    if (x === 7 && y === 10) return MS;
    if (x === 12 && y === 14) return MS;
    return MS;
  }

  // ── Bridge to east alcove (cols 12-13, rows 6-7) ──
  if (x === 12 && (y === 6 || y === 7)) return MS;

  // ── Bridge to west alcove (cols 6-7, rows 14-15) ──
  if (x === 6 && (y === 14 || y === 15)) return MS;

  // Everything else is water
  return WT;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
