import { useQuestStore } from '../state/questStore';
import { useDungeonItemStore } from '../state/dungeonItemStore';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Ashen Tower — Floor 3: The Mirror Chamber.
 * Final chamber with a massive mirror. The Mirror Shard dungeon item
 * is here in a golden chest. No boss — the reward is the item itself.
 * 30x22 map — large open chamber.
 */

const MAP_W = 30;
const MAP_H = 22;

const SOLID_TILES = new Set([T.WALL_STONE, T.LAVA]);

export class AshenTowerF3Scene extends BaseWorldScene {
  constructor() {
    super({ key: 'AshenTowerF3Scene' });
  }

  protected getZoneName(): string | null { return 'The Mirror Chamber'; }

  protected layout(): void {
    generateTileset(this);

    const map = this.make.tilemap({
      data: buildMapData(),
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tileset')!;
    map.createLayer(0, tileset)!;

    // Wall + lava collision
    for (const [tx, ty] of getSolidPositions()) {
      const w = this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
      this.physics.add.existing(w, true);
      this.walls.add(w);
    }

    // Zone label
    this.add.text(WORLD_W / 2, 3 * TILE, 'THE MIRROR CHAMBER', {
      fontFamily: 'Courier New', fontSize: '14px', color: '#a0a0c0',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);

    // ── Atmospheric torches — pale blue-white ──
    for (const [tx, ty, color] of [
      [6, 4, 0x8090b0], [23, 4, 0x8090b0],
      [4, 10, 0x7080a0], [25, 10, 0x7080a0],
      [6, 16, 0x8090b0], [23, 16, 0x8090b0],
    ] as [number, number, number][]) {
      const torch = this.add.circle(tx * TILE, ty * TILE, 12, color, 0.12).setDepth(4);
      this.tweens.add({
        targets: torch, alpha: 0.04, scale: 1.3, duration: 2000, yoyo: true, repeat: -1,
      });
    }

    // ── The Mirror (massive, back wall) ──
    const mirrorX = 15 * TILE;
    const mirrorY = 3 * TILE;
    // Mirror frame
    this.add.rectangle(mirrorX, mirrorY, TILE * 6, TILE * 3, 0x404050).setStrokeStyle(3, 0x808090).setDepth(5);
    // Mirror surface (reflective)
    const mirrorSurface = this.add.rectangle(mirrorX, mirrorY, TILE * 5.5, TILE * 2.5, 0x606880, 0.8);
    mirrorSurface.setStrokeStyle(1, 0xa0a0c0);
    mirrorSurface.setDepth(6);
    // Mirror sheen effect
    const sheen = this.add.rectangle(mirrorX - TILE, mirrorY - 8, TILE * 2, 4, 0xc0c0e0, 0.3).setDepth(7);
    this.tweens.add({
      targets: sheen, x: mirrorX + TILE * 2, alpha: 0, duration: 3000,
      repeat: -1, delay: 4000, ease: 'Quad.easeIn',
    });
    // Glowing runes on frame
    for (const rx of [-TILE * 2.5, TILE * 2.5]) {
      const rune = this.add.circle(mirrorX + rx, mirrorY, 4, 0x8080c0, 0.5).setDepth(7);
      this.tweens.add({ targets: rune, alpha: 0.1, duration: 1800, yoyo: true, repeat: -1 });
    }

    // ── Enemies (2 ember knights + 1 lava drake guarding the chamber) ──
    this.spawnEnemy({ monsterKey: 'ember_knight', x: 10 * TILE, y: 10 * TILE });
    this.spawnEnemy({ monsterKey: 'ember_knight', x: 20 * TILE, y: 10 * TILE });
    this.spawnEnemy({ monsterKey: 'lava_drake', x: 15 * TILE, y: 14 * TILE });

    // ── Lava border glow ──
    for (const [gx, gy] of [[4, 7], [26, 7], [4, 14], [26, 14]] as [number, number][]) {
      const g = this.add.circle(gx * TILE, gy * TILE, 16, 0xe06020, 0.06).setDepth(2);
      this.tweens.add({ targets: g, alpha: 0.02, scale: 1.3, duration: 2000, yoyo: true, repeat: -1 });
    }

    // ── Mirror Shard golden chest (far end of chamber) ──
    if (!useDungeonItemStore.getState().has('mirror_shard')) {
      const diChest = this.add.rectangle(15 * TILE, 6 * TILE, 28, 24, 0x8a6830);
      diChest.setStrokeStyle(2, 0xe0c040);
      diChest.setDepth(8);
      this.add.rectangle(15 * TILE, 6 * TILE - 10, 28, 8, 0xa08040).setStrokeStyle(1, 0xe0c040).setDepth(8);
      this.add.circle(15 * TILE, 6 * TILE, 18, 0xe0c040, 0.1).setDepth(7);
      this.spawnInteractable({
        sprite: diChest as any, label: 'Open golden chest', radius: 24,
        action: () => {
          useDungeonItemStore.getState().acquire('mirror_shard');
          window.dispatchEvent(new CustomEvent('gameMessage', {
            detail: 'Mirror Shard acquired! Things hidden become plain in its reflection.',
          }));
          diChest.destroy();
        },
      });
    }

    // ── The Watcher (special line for this scene) ──
    this.spawnWatcher(20 * TILE, 16 * TILE);

    // ── Complete quest objective on entering this scene ──
    useQuestStore.getState().completeObjective('ashfield-explorer', 'reach-mirror');

    // ── EXIT UP → Floor 2 (top-left) ──
    this.addExit({
      x: 7 * TILE, y: 0, w: 5 * TILE, h: TILE,
      targetScene: 'AshenTowerF2Scene', targetSpawn: 'fromFloor3',
      label: '\u2191 Floor 2',
    });
    this.add.rectangle(9.5 * TILE, 1.2 * TILE, 140, 36, 0x202028).setStrokeStyle(2, 0x504030).setDepth(3);
    this.add.text(9.5 * TILE, 1.2 * TILE, '\u25B2 Stairs Up', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#c08040',
    }).setOrigin(0.5).setDepth(4);

    // No stairs down — this is the final floor.
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromFloor2':
      case 'default':
      default:
        return { x: 9.5 * TILE, y: 18 * TILE };
    }
  }
}

// ─── Map data ──────────────────────────────────────────────────────

const WS = T.WALL_STONE;
const FC = T.FLOOR_CRACKED;
const LV = T.LAVA;
const BS = T.BLOOD_STONE;

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

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}

/**
 * Floor 3: The Mirror Chamber — large open room.
 *   Main chamber: cols 5-25, rows 2-19
 *   Lava border channels on left and right
 *   Mirror on the north wall (cols 12-18, rows 2-4)
 *   Open floor for combat
 */
function tileAt(x: number, y: number): number {
  // Stair opening (top)
  if (inRect(x, y, 7, 0, 5, 2)) return FC;

  // ── Main chamber (cols 5-25, rows 2-19) ──
  if (inRect(x, y, 5, 2, 21, 18)) return FC;

  // ── Lava border channels ──
  if (inRect(x, y, 3, 4, 2, 14)) return LV;
  if (inRect(x, y, 26, 4, 2, 14)) return LV;
  // Bottom lava
  if (inRect(x, y, 5, 20, 8, 2)) return LV;
  if (inRect(x, y, 17, 20, 8, 2)) return LV;

  // ── Scorched decorative patches ──
  if (inRect(x, y, 10, 8, 2, 1)) return BS;
  if (inRect(x, y, 18, 8, 2, 1)) return BS;
  if (inRect(x, y, 14, 12, 2, 1)) return BS;

  // ── Everything else is wall ──
  return WS;
}
