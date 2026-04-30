import { useWorldStateStore } from '../state/worldStateStore';
import { useCombatStore } from '../state/combatStore';
import { BaseWorldScene, TILE, WORLD_W } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Ashen Tower — Floor 1: The Burning Halls.
 * Crumbling stone tower interior, fire everywhere. FLOOR_CRACKED + LAVA channels.
 * 30x22 map, top-to-bottom flow.
 */

const MAP_W = 30;
const MAP_H = 22;

const SOLID_TILES = new Set<number>([T.WALL_STONE, T.LAVA]);

export class AshenTowerF1Scene extends BaseWorldScene {
  constructor() {
    super({ key: 'AshenTowerF1Scene' });
  }

  protected getZoneName(): string | null { return 'The Burning Halls'; }

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
    this.add.text(WORLD_W / 2, 2 * TILE, 'THE BURNING HALLS', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#c08040',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);

    // ── Orange-red torches ──
    for (const [tx, ty] of [
      [6, 2], [13, 2], [6, 6], [13, 6], [6, 10], [13, 10],
      [6, 14], [13, 14], [6, 18], [13, 18],
    ] as [number, number][]) {
      this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 22, 22, 0xc06020, 0.14).setDepth(4);
    }

    // ── Ember particle effects near lava ──
    for (const [dx, dy] of [[7, 4], [12, 8], [8, 12], [11, 16], [9, 20]] as [number, number][]) {
      const ember = this.add.circle(dx * TILE + TILE / 2, dy * TILE, 2, 0xf0a030, 0.7).setDepth(6);
      this.tweens.add({
        targets: ember, y: dy * TILE - TILE, alpha: 0, duration: 1500,
        repeat: -1, delay: Math.random() * 800,
      });
    }

    // ── Enemies ──
    this.spawnEnemy({ monsterKey: 'fire_elemental', x: 9 * TILE, y: 5 * TILE });
    this.spawnEnemy({ monsterKey: 'fire_elemental', x: 10 * TILE, y: 14 * TILE });
    this.spawnEnemy({ monsterKey: 'ash_wraith', x: 8 * TILE, y: 9 * TILE });
    this.spawnEnemy({ monsterKey: 'ash_wraith', x: 11 * TILE, y: 17 * TILE });

    // ── Spike traps (6 damage) ──
    this.spawnTrap({ x: 9 * TILE, y: 7 * TILE, damage: 6 });
    this.spawnTrap({ x: 10 * TILE, y: 15 * TILE, damage: 6 });

    // ── Treasure chest ──
    this.spawnChest({
      x: 13 * TILE + TILE / 2, y: 6 * TILE + TILE / 2,
      loot: [{ itemKey: 'health_potion', qty: 2 }, { itemKey: 'iron_ore' }],
      gold: 20,
    });

    // ── Push-block puzzle (heated stone onto plate → reveal chest) ──
    this.spawnPushBlock({ tileX: 8, tileY: 12, color: 0xa06030 });
    this.spawnPressurePlate({ tileX: 8, tileY: 16, onActivate: () => {
      this.spawnChest({ x: 10 * TILE, y: 16 * TILE, loot: [{ itemKey: 'shadow_essence' }], gold: 15 });
    }});

    // ── Breakable wall → hidden room with loot ──
    this.spawnBreakableWall({
      x: 14 * TILE, y: 10 * TILE, w: TILE, h: TILE * 2,
      onBreak: () => {
        this.spawnChest({
          x: 16 * TILE, y: 11 * TILE,
          loot: [{ itemKey: 'shadow_essence' }, { itemKey: 'health_potion' }],
          gold: 30,
        });
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'A hidden chamber! Something glints inside.' }));
      },
    });

    // ── The Watcher ──
    this.spawnWatcher(8 * TILE, 2 * TILE);

    // ── EXIT UP → Ashfields (top-center) ──
    this.addExit({
      x: 7 * TILE, y: 0, w: 5 * TILE, h: TILE,
      targetScene: 'AshfieldsScene', targetSpawn: 'fromTower',
      label: '\u2191 The Ashfields',
    });
    this.add.rectangle(9.5 * TILE, 1.2 * TILE, 140, 36, 0x202028).setStrokeStyle(2, 0x504030).setDepth(3);
    this.add.text(9.5 * TILE, 1.2 * TILE, '\u25B2 Surface', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#c08040',
    }).setOrigin(0.5).setDepth(4);

    // ── EXIT DOWN → Floor 2 (bottom-center) ──
    this.addExit({
      x: 7 * TILE, y: 19 * TILE, w: 5 * TILE, h: 2 * TILE,
      targetScene: 'AshenTowerF2Scene', targetSpawn: 'fromFloor1',
      label: '\u25BC Floor 2',
    });
    const stairX = 9.5 * TILE;
    const stairY = 19.5 * TILE;
    this.add.rectangle(stairX, stairY, 140, 52, 0x10101a).setStrokeStyle(2, 0x604020).setDepth(3);
    this.add.text(stairX, stairY - 8, '\u25BC Stairs Down', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#c08040',
    }).setOrigin(0.5).setDepth(4);
    this.add.text(stairX, stairY + 10, 'The Ember Forge', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#a06830',
    }).setOrigin(0.5).setDepth(4);

    // ── SECRET BOSS: The Last Witness ────────────────────────
    // Light all four tower braziers (corners of Floor 1). The vigil ends
    // and the apprentice steps down from the wall.
    this.spawnLastWitnessTrigger();
  }

  /**
   * The Last Witness — secret boss.
   * Trigger: spawn four braziers in the four corners; when all are lit
   * (any visit, persistence by `worldStateStore.litTorches`), the boss
   * descends. Defeat-flag stops re-spawn after victory.
   */
  private spawnLastWitnessTrigger(): void {
    const sceneKey = this.scene.key;
    const defeatFlag = 'secret_last_witness_defeated';
    const bossX = 9 * TILE + TILE / 2;
    const bossY = 11 * TILE + TILE / 2;
    const bossEnemyId = `${sceneKey}-last_witness-${bossX}-${bossY}`;

    if (useCombatStore.getState().killedEnemies.has(bossEnemyId)) {
      useWorldStateStore.getState().markPicked(sceneKey, defeatFlag);
    }

    // Four braziers — corners of the floor. NW, NE, SW, SE relative to
    // walkable tiles. Existing scene uses cols 7-12 for the corridor;
    // place braziers at the alcove corners and the corridor ends.
    const braziers: Array<{ id: string; x: number; y: number }> = [
      { id: 'ashen_tower_brazier_nw', x: 4 * TILE + TILE / 2, y: 13 * TILE + TILE / 2 },
      { id: 'ashen_tower_brazier_ne', x: 17 * TILE + TILE / 2, y: 5 * TILE + TILE / 2 },
      { id: 'ashen_tower_brazier_sw', x: 4 * TILE + TILE / 2, y: 16 * TILE + TILE / 2 },
      { id: 'ashen_tower_brazier_se', x: 17 * TILE + TILE / 2, y: 8 * TILE + TILE / 2 },
    ];
    for (const b of braziers) {
      // Brazier dish — wide, dark iron, rust-flecked.
      this.add.rectangle(b.x, b.y + 6, 18, 4, 0x3a2a18).setDepth(5);
      this.add.rectangle(b.x, b.y + 4, 22, 3, 0x6a4a28).setDepth(5);
      // Tripod legs
      this.add.rectangle(b.x - 8, b.y + 10, 2, 6, 0x2a1a10).setDepth(5);
      this.add.rectangle(b.x + 8, b.y + 10, 2, 6, 0x2a1a10).setDepth(5);
      // The torch handler treats the rectangle at (x, y+4) as the base —
      // use the existing spawnTorch wrapper so lighting flows through the
      // shared lantern / Sfx / persistence path.
      this.spawnTorch({ id: b.id, x: b.x, y: b.y });
    }

    if (useWorldStateStore.getState().isPicked(sceneKey, defeatFlag)) {
      // Boss already dead — keep the braziers but skip the puzzle hook.
      return;
    }

    this.registerTorchPuzzle(braziers.map((b) => b.id), () => {
      // Don't double-spawn if already on the floor.
      if (this.enemies.find((e) => e.id === bossEnemyId)) return;
      window.dispatchEvent(new CustomEvent('gameMessage', {
        detail: 'Four flames stand. A figure steps out of the shadow she has worn for two centuries.',
      }));
      this.spawnEnemy({ monsterKey: 'last_witness', x: bossX, y: bossY });
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromFloor2':
        return { x: 9.5 * TILE, y: 17 * TILE };
      case 'fromAshfields':
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
 * Floor 1: The Burning Halls — vertical corridor with lava channels.
 *   Main walkway: cols 7-12, rows 1-20
 *   East alcove: cols 13-17, rows 5-8 (chest room)
 *   West alcove: cols 3-6, rows 13-16
 *   Hidden room: cols 15-17, rows 10-12 (behind breakable wall)
 *   Lava channels on either side of the walkway
 */
function tileAt(x: number, y: number): number {
  // Stair openings
  if (inRect(x, y, 7, 0, 5, 1)) return FC;
  if (inRect(x, y, 7, 21, 5, 1)) return FC;

  // ── Main corridor (cols 7-12, rows 1-20) ──
  if (inRect(x, y, 7, 1, 6, 20)) return FC;

  // ── East alcove (cols 13-17, rows 5-8) — chest room ──
  if (inRect(x, y, 13, 5, 5, 4)) return FC;

  // ── West alcove (cols 3-6, rows 13-16) ──
  if (inRect(x, y, 3, 13, 4, 4)) return FC;

  // ── Hidden room behind breakable wall (cols 15-17, rows 10-12) ──
  if (inRect(x, y, 15, 10, 3, 3)) return FC;

  // ── Lava channels ──
  // Left channel (cols 5-6, rows 2-20)
  if (inRect(x, y, 5, 2, 2, 18)) return LV;
  // Right channel (cols 13-14, rows 2-4) and (cols 13-14, rows 9-20)
  if (inRect(x, y, 13, 2, 2, 3)) return LV;
  if (inRect(x, y, 13, 9, 2, 1)) return LV;
  if (inRect(x, y, 13, 13, 2, 8)) return LV;

  // ── Scorched patches ──
  if (inRect(x, y, 8, 4, 2, 1)) return BS;
  if (inRect(x, y, 10, 12, 2, 1)) return BS;
  if (inRect(x, y, 8, 18, 2, 1)) return BS;

  // ── Everything else is wall ──
  return WS;
}
