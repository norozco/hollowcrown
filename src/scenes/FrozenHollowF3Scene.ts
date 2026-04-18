import { useQuestStore } from '../state/questStore';
import { useDungeonItemStore } from '../state/dungeonItemStore';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Frozen Hollow — Floor 3: The Heart of Winter.
 * Massive frozen chamber. The Flame Amulet dungeon item is here.
 * 30x22 map — large open chamber.
 */

const MAP_W = 30;
const MAP_H = 22;

const SOLID_TILES = new Set([T.WALL_STONE, T.WATER]);

export class FrozenHollowF3Scene extends BaseWorldScene {
  constructor() {
    super({ key: 'FrozenHollowF3Scene' });
  }

  protected getZoneName(): string | null { return 'The Heart of Winter'; }

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

    // Collision
    for (const [tx, ty] of getSolidPositions(mapData)) {
      const w = this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
      this.physics.add.existing(w, true);
      this.walls.add(w);
    }

    // Zone label
    this.add.text(WORLD_W / 2, 3 * TILE, 'THE HEART OF WINTER', {
      fontFamily: 'Courier New', fontSize: '14px', color: '#80a0c0',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);

    // ── Atmospheric: pale blue-white torches ──
    for (const [tx, ty] of [
      [6, 4], [23, 4], [4, 10], [25, 10], [6, 16], [23, 16],
    ] as [number, number][]) {
      const torch = this.add.circle(tx * TILE, ty * TILE, 14, 0x80a0d0, 0.1).setDepth(4);
      this.tweens.add({
        targets: torch, alpha: 0.03, scale: 1.3, duration: 2400, yoyo: true, repeat: -1,
      });
    }

    // ── Central ice formation (massive frozen pillar) ──
    const pillarX = 15 * TILE;
    const pillarY = 8 * TILE;
    this.add.rectangle(pillarX, pillarY, TILE * 4, TILE * 5, 0x506878, 0.6).setStrokeStyle(2, 0x80a8c0).setDepth(5);
    // Ice crystal shards around pillar
    for (const [cx, cy] of [[-2, -3], [2, -3], [-3, 0], [3, 0], [-2, 2], [2, 2]] as [number, number][]) {
      this.add.triangle(
        pillarX + cx * TILE / 2, pillarY + cy * TILE / 2,
        0, 8, 4, -8, 8, 8, 0x90c0e0, 0.4,
      ).setDepth(6);
    }
    // Cold glow
    const coldGlow = this.add.circle(pillarX, pillarY, TILE * 3, 0x80a0d0, 0.06).setDepth(3);
    this.tweens.add({ targets: coldGlow, alpha: 0.02, scale: 1.2, duration: 3000, yoyo: true, repeat: -1 });

    // ── Enemies (2 frost wardens + 1 ice golem) ──
    this.spawnEnemy({ monsterKey: 'frost_warden', x: 10 * TILE, y: 10 * TILE });
    this.spawnEnemy({ monsterKey: 'frost_warden', x: 20 * TILE, y: 10 * TILE });
    this.spawnEnemy({ monsterKey: 'ice_golem', x: 15 * TILE, y: 14 * TILE });

    // ── Frozen border glow ──
    for (const [gx, gy] of [[4, 7], [26, 7], [4, 14], [26, 14]] as [number, number][]) {
      const g = this.add.circle(gx * TILE, gy * TILE, 16, 0x6090c0, 0.06).setDepth(2);
      this.tweens.add({ targets: g, alpha: 0.02, scale: 1.3, duration: 2000, yoyo: true, repeat: -1 });
    }

    // ── Flame Amulet golden chest (center of chamber, past enemies) ──
    if (!useDungeonItemStore.getState().has('flame_amulet')) {
      const diChest = this.add.rectangle(15 * TILE, 6 * TILE, 28, 24, 0x8a6830);
      diChest.setStrokeStyle(2, 0xe0c040);
      diChest.setDepth(8);
      this.add.rectangle(15 * TILE, 6 * TILE - 10, 28, 8, 0xa08040).setStrokeStyle(1, 0xe0c040).setDepth(8);
      this.add.circle(15 * TILE, 6 * TILE, 18, 0xe0c040, 0.1).setDepth(7);
      // Warm glow around the chest (fire inside ice)
      const warmGlow = this.add.circle(15 * TILE, 6 * TILE, 24, 0xe08030, 0.08).setDepth(6);
      this.tweens.add({ targets: warmGlow, alpha: 0.03, scale: 1.4, duration: 1800, yoyo: true, repeat: -1 });
      this.spawnInteractable({
        sprite: diChest as any, label: 'Open golden chest', radius: 24,
        action: () => {
          useDungeonItemStore.getState().acquire('flame_amulet');
          window.dispatchEvent(new CustomEvent('gameMessage', {
            detail: 'Flame Amulet acquired! A ruby that burns without consuming itself. Ice retreats from its warmth.',
          }));
          diChest.destroy();
          warmGlow.destroy();
        },
      });
    }

    // ── The Watcher ──
    this.spawnWatcher(20 * TILE, 16 * TILE);

    // ── Complete quest objective on entering this scene ──
    useQuestStore.getState().completeObjective('frosthollow-explorer', 'reach-heart');

    // ── EXIT UP → Floor 2 ──
    this.addExit({
      x: 7 * TILE, y: 0, w: 5 * TILE, h: TILE,
      targetScene: 'FrozenHollowF2Scene', targetSpawn: 'fromFloor3',
      label: '\u2191 The Frost Vault',
    });
    this.add.rectangle(9.5 * TILE, 1.2 * TILE, 140, 36, 0x101820).setStrokeStyle(2, 0x405060).setDepth(3);
    this.add.text(9.5 * TILE, 1.2 * TILE, '\u25B2 Floor 2', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#6080a0',
    }).setOrigin(0.5).setDepth(4);
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromFloor2':
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
  if (y === 0 || y === MAP_H - 1) return WS;
  if (x === 0 || x === MAP_W - 1) return WS;
  if (x === 1 || x === MAP_W - 2) return WS;

  // Wide chamber (cols 3-26, rows 2-19)
  if (x >= 3 && x <= 26) {
    // Wall borders at top and bottom of chamber
    if (y <= 2 || y >= 19) return WS;

    // Frozen pools in corners
    if (x >= 4 && x <= 6 && y >= 6 && y <= 8) return WA;
    if (x >= 23 && x <= 25 && y >= 6 && y <= 8) return WA;
    if (x >= 4 && x <= 6 && y >= 14 && y <= 16) return WA;
    if (x >= 23 && x <= 25 && y >= 14 && y <= 16) return WA;

    // Icy ground patches
    if ((x + y) % 5 === 0) return FC;

    return FS;
  }

  return WS;
}
