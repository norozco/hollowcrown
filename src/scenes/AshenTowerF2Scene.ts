import { useInventoryStore } from '../state/inventoryStore';
import { BaseWorldScene, TILE, WORLD_W } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Ashen Tower — Floor 2: The Ember Forge.
 * Ancient forge/foundry. Machinery, anvils, lava vats.
 * 30x22 map. Locked door requires tower_key.
 */

const MAP_W = 30;
const MAP_H = 22;

const SOLID_TILES = new Set<number>([T.WALL_STONE, T.LAVA]);

export class AshenTowerF2Scene extends BaseWorldScene {
  constructor() {
    super({ key: 'AshenTowerF2Scene' });
  }

  protected getZoneName(): string | null { return 'The Ember Forge'; }

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
    this.add.text(WORLD_W / 2, 2 * TILE, 'THE EMBER FORGE', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#c06030',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);

    // ── Red-orange torches ──
    for (const [tx, ty] of [
      [5, 3], [14, 3], [5, 8], [14, 8], [5, 13], [14, 13], [5, 18], [14, 18],
    ] as [number, number][]) {
      this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 22, 22, 0xd05020, 0.14).setDepth(4);
    }

    // ── Forge decorations (anvils, machinery) ──
    // Anvil shapes — dark iron rectangles
    for (const [ax, ay] of [[8, 5], [11, 10], [8, 15]] as [number, number][]) {
      this.add.rectangle(ax * TILE, ay * TILE, 20, 14, 0x404850).setDepth(5);
      this.add.rectangle(ax * TILE, ay * TILE - 6, 14, 4, 0x506070).setDepth(5);
    }

    // Lava vats — glowing pools in metal frames
    for (const [vx, vy] of [[6, 7], [13, 12]] as [number, number][]) {
      this.add.rectangle(vx * TILE, vy * TILE, 28, 20, 0x303030).setStrokeStyle(2, 0x505050).setDepth(3);
      const vatGlow = this.add.circle(vx * TILE, vy * TILE, 10, 0xe06020, 0.3).setDepth(4);
      this.tweens.add({
        targets: vatGlow, alpha: 0.1, scale: 1.2, duration: 1500, yoyo: true, repeat: -1,
      });
    }

    // ── Enemies ──
    this.spawnEnemy({ monsterKey: 'lava_drake', x: 9 * TILE, y: 6 * TILE });
    this.spawnEnemy({ monsterKey: 'ember_knight', x: 10 * TILE, y: 11 * TILE });
    this.spawnEnemy({ monsterKey: 'ember_knight', x: 8 * TILE, y: 16 * TILE });
    this.spawnEnemy({ monsterKey: 'fire_elemental', x: 11 * TILE, y: 4 * TILE });

    // ── Spike traps (7 damage) ──
    this.spawnTrap({ x: 9 * TILE, y: 8 * TILE, damage: 7 });
    this.spawnTrap({ x: 10 * TILE, y: 14 * TILE, damage: 7 });

    // ── Treasure chest ──
    this.spawnChest({
      x: 14 * TILE, y: 8 * TILE,
      loot: [{ itemKey: 'health_potion', qty: 2 }, { itemKey: 'troll_heart' }],
      gold: 25,
    });

    // ── Tower Key pickup (on the forge floor, if not already held) ──
    const inv = useInventoryStore.getState();
    if (!inv.hasItem('tower_key')) {
      const keySprite = this.add.rectangle(12 * TILE, 6 * TILE, 12, 8, 0x303030);
      keySprite.setStrokeStyle(1, 0x606060);
      keySprite.setDepth(8);
      // Key teeth shape
      this.add.rectangle(12 * TILE + 8, 6 * TILE, 4, 4, 0x404040).setDepth(8);
      this.spawnInteractable({
        sprite: keySprite as any, label: 'Pick up Tower Key', radius: 22,
        action: () => {
          useInventoryStore.getState().addItem('tower_key');
          window.dispatchEvent(new CustomEvent('gameMessage', {
            detail: 'Tower Key acquired. Black iron, still warm.',
          }));
          keySprite.destroy();
        },
      });
    }

    // ── Locked door (blocks path to stairs down, requires tower_key) ──
    // Door spans the full hall (cols 6-13 = 8 tiles)
    this.spawnLockedDoor({
      x: 6 * TILE, y: 17 * TILE, w: 8 * TILE, h: TILE,
      keyItem: 'tower_key', label: 'Sealed door (Tower Key)',
    });

    // ── The Watcher ──
    this.spawnWatcher(12 * TILE, 3 * TILE);

    // ── EXIT UP → Floor 1 (top-center) ──
    this.addExit({
      x: 7 * TILE, y: 0, w: 5 * TILE, h: TILE,
      targetScene: 'AshenTowerF1Scene', targetSpawn: 'fromFloor2',
      label: '\u2191 Floor 1',
    });
    this.add.rectangle(9.5 * TILE, 1.2 * TILE, 140, 36, 0x202028).setStrokeStyle(2, 0x504030).setDepth(3);
    this.add.text(9.5 * TILE, 1.2 * TILE, '\u25B2 Stairs Up', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#c08040',
    }).setOrigin(0.5).setDepth(4);

    // ── EXIT DOWN → Floor 3 (bottom-center, behind locked door) ──
    this.addExit({
      x: 7 * TILE, y: 19 * TILE, w: 5 * TILE, h: 2 * TILE,
      targetScene: 'AshenTowerF3Scene', targetSpawn: 'fromFloor2',
      label: '\u25BC Floor 3',
    });
    const stairX = 9.5 * TILE;
    const stairY = 19.5 * TILE;
    this.add.rectangle(stairX, stairY, 140, 52, 0x10101a).setStrokeStyle(2, 0x604020).setDepth(3);
    this.add.text(stairX, stairY - 8, '\u25BC Stairs Down', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#c08040',
    }).setOrigin(0.5).setDepth(4);
    this.add.text(stairX, stairY + 10, 'The Mirror Chamber', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#a06830',
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
 * Floor 2: The Ember Forge — wider layout with forge areas.
 *   Main hall: cols 6-13, rows 1-20
 *   Forge alcove west: cols 3-5, rows 5-8
 *   Forge alcove east: cols 14-17, rows 10-14
 *   Locked section: cols 6-13, rows 18-21 (behind locked door at row 17)
 *   Lava channels along edges
 */
function tileAt(x: number, y: number): number {
  // Stair openings
  if (inRect(x, y, 7, 0, 5, 1)) return FC;
  if (inRect(x, y, 7, 21, 5, 1)) return FC;

  // ── Main hall (cols 6-13, rows 1-20) ──
  if (inRect(x, y, 6, 1, 8, 20)) return FC;

  // ── West forge alcove (cols 3-5, rows 5-8) ──
  if (inRect(x, y, 3, 5, 3, 4)) return FC;

  // ── East forge alcove (cols 14-17, rows 10-14) ──
  if (inRect(x, y, 14, 7, 4, 4)) return FC;
  if (inRect(x, y, 14, 11, 4, 4)) return FC;

  // ── Lava channels ──
  if (inRect(x, y, 4, 1, 2, 4)) return LV;
  if (inRect(x, y, 14, 1, 2, 6)) return LV;
  if (inRect(x, y, 4, 9, 2, 12)) return LV;
  if (inRect(x, y, 14, 15, 2, 6)) return LV;

  // ── Scorched patches ──
  if (inRect(x, y, 8, 6, 2, 1)) return BS;
  if (inRect(x, y, 10, 13, 2, 1)) return BS;
  if (inRect(x, y, 7, 19, 3, 1)) return BS;

  // ── Everything else is wall ──
  return WS;
}
