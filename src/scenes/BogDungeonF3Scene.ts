import { useQuestStore } from '../state/questStore';
import { useCombatStore } from '../state/combatStore';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Ashenmere Bog Dungeon — Floor 3: The Warden's Pool.
 * Massive circular pool chamber. The Drowned Warden boss stands
 * on a raised platform in the center. No stairs down.
 */

const MAP_W = 30;
const MAP_H = 22;

const SOLID_TILES = new Set([T.WALL_STONE, T.WATER, T.LAVA]);

export class BogDungeonF3Scene extends BaseWorldScene {
  constructor() {
    super({ key: 'BogDungeonF3Scene' });
  }

  protected getZoneName(): string | null { return "The Warden's Pool"; }

  protected layout(): void {
    generateTileset(this);

    const map = this.make.tilemap({
      data: buildMapData(),
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tileset')!;
    map.createLayer(0, tileset)!;

    // Wall + hazard collision
    for (const [tx, ty] of getSolidPositions()) {
      const w = this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
      this.physics.add.existing(w, true);
      this.walls.add(w);
    }

    // Zone label
    this.add.text(WORLD_W / 2, 2 * TILE, "THE WARDEN'S POOL", {
      fontFamily: 'Courier New', fontSize: '14px', color: '#504080',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);

    // ── Dark purple/blue torches — boss atmosphere ──
    for (const [tx, ty, color] of [
      [8, 3, 0x4050a0], [21, 3, 0x4050a0],
      [6, 8, 0x6040a0], [23, 8, 0x6040a0],
      [6, 14, 0x6040a0], [23, 14, 0x6040a0],
      [8, 19, 0x4050a0], [21, 19, 0x4050a0],
      [12, 5, 0x5040c0], [17, 5, 0x5040c0],
      [12, 17, 0x5040c0], [17, 17, 0x5040c0],
    ] as [number, number, number][]) {
      this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 26, 26, color, 0.16).setDepth(4);
    }

    // ── Lava accent glow (heated vents around edges) ──
    for (let y = 2; y <= 19; y++) {
      for (const xCol of [5, 6, 23, 24]) {
        if (tileAt(xCol, y) === T.LAVA) {
          this.add.rectangle(xCol * TILE + TILE / 2, y * TILE + TILE / 2, TILE + 8, TILE + 8, 0xff6020, 0.06).setDepth(1);
        }
      }
    }

    // ── Boss platform visual — raised stone dais in center ──
    const platX = 15 * TILE;
    const platY = 11 * TILE;
    // Outer ring (dark stone)
    const outerRing = this.add.circle(platX, platY, 80, 0x383040, 0.3);
    outerRing.setDepth(2);
    // Inner platform highlight
    const innerPlat = this.add.circle(platX, platY, 50, 0x484058, 0.2);
    innerPlat.setDepth(2);
    // Pulsing dark energy aura
    const bossAura = this.add.circle(platX, platY, 60, 0x4030a0, 0.08);
    bossAura.setDepth(3);
    this.tweens.add({
      targets: bossAura,
      alpha: { from: 0.05, to: 0.15 },
      scaleX: { from: 0.9, to: 1.15 },
      scaleY: { from: 0.9, to: 1.15 },
      duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // ── Pillar decorations around the arena ──
    for (const [px, py] of [
      [9, 5], [20, 5], [9, 17], [20, 17],
      [7, 11], [22, 11],
    ] as [number, number][]) {
      const stone = this.add.rectangle(px * TILE + TILE / 2, py * TILE + TILE / 2, 28, 28, 0x404858);
      stone.setStrokeStyle(2, 0x303848);
      stone.setDepth(5);
      this.add.rectangle(px * TILE + TILE / 2, py * TILE + TILE / 2, 16, 16, 0x505868).setDepth(5);
      this.physics.add.existing(stone, true);
      this.walls.add(stone);
    }

    // ── Water ripple effects in the pool areas ──
    for (const [wx, wy] of [
      [7, 3], [22, 4], [6, 16], [23, 18], [8, 8], [21, 14],
    ] as [number, number][]) {
      const ripple = this.add.circle(wx * TILE + TILE / 2, wy * TILE + TILE / 2, 6, 0x4080a0, 0.2);
      ripple.setDepth(4);
      this.tweens.add({
        targets: ripple,
        scaleX: 2.5, scaleY: 2.5, alpha: 0,
        duration: 2000 + Math.random() * 1000,
        delay: Math.random() * 1500,
        repeat: -1, ease: 'Quad.easeOut',
      });
    }

    // ── Boss enemy — The Drowned Warden ──
    this.spawnEnemy({ monsterKey: 'drowned_warden', x: 15 * TILE, y: 11 * TILE });

    // ── Guard enemies — Hollow Knights ──
    this.spawnEnemy({ monsterKey: 'hollow_knight', x: 11 * TILE, y: 9 * TILE });
    this.spawnEnemy({ monsterKey: 'hollow_knight', x: 19 * TILE, y: 13 * TILE });

    // ── The Watcher ──
    this.spawnWatcher(18 * TILE, 4 * TILE);

    // ── EXIT UP → Floor 2 (top-center) ──
    this.addExit({
      x: 12 * TILE, y: 0, w: 6 * TILE, h: TILE,
      targetScene: 'BogDungeonF2Scene', targetSpawn: 'fromFloor3',
      label: '↑ Floor 2',
    });
    this.add.rectangle(15 * TILE, 1.2 * TILE, 140, 36, 0x202028).setStrokeStyle(2, 0x304050).setDepth(3);
    this.add.text(15 * TILE, 1.2 * TILE, '▲ The Drowned Gallery', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#6088aa',
    }).setOrigin(0.5).setDepth(4);

    // ── Quest: bog-explorer — reaching this floor completes the objective ──
    useQuestStore.getState().completeObjective('bog-explorer', 'reach-warden-pool');

    // ── Ancient Coin #11 — arena corner, behind the boss platform ──
    this.spawnAncientCoin({
      x: 4 * TILE, y: 18 * TILE,
      coinId: 'coin_bog', inscription: 'Eleven given to the warden. He did not understand.',
    });

    // ── Victory chest: spawns if the Drowned Warden has been killed ──
    const killed = useCombatStore.getState().killedEnemies;
    const wardenKilled = Array.from(killed).some(id => id.includes('drowned_warden'));
    if (wardenKilled) {
      this.spawnChest({
        x: 15 * TILE, y: 12 * TILE,
        loot: [
          { itemKey: 'steel_sword', qty: 1 },
          { itemKey: 'chainmail', qty: 1 },
          { itemKey: 'health_potion', qty: 3 },
          { itemKey: 'shadow_essence', qty: 2 },
          { itemKey: 'warden_shield' },
        ],
        gold: 120,
      });
    }
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

const WS = T.WALL_STONE;
const FC = T.FLOOR_CRACKED;
const WT = T.WATER;
const LV = T.LAVA;

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
 * Floor 3: Warden's Pool — circular arena with water edges and lava vents.
 *   Outer ring: water (cols 5-6, 23-24 of the arena area)
 *   Lava vents: scattered along edges
 *   Center platform: cols 9-20, rows 5-17 (cracked floor)
 *   Entrance corridor: cols 12-17, rows 1-4
 */
function tileAt(x: number, y: number): number {
  // Stair opening
  if (inRect(x, y, 12, 0, 6, 1)) return FC;

  // ── Entrance corridor (cols 12-17, rows 1-4) ──
  if (inRect(x, y, 12, 1, 6, 4)) return FC;

  // ── Arena bounds (cols 5-24, rows 3-19) ──
  if (!inRect(x, y, 5, 3, 20, 17)) return WS;

  // ── Lava vents on edges ──
  if ((x === 5 || x === 24) && (y === 5 || y === 10 || y === 15)) return LV;
  if ((x === 6 || x === 23) && (y === 8 || y === 13)) return LV;

  // ── Water ring (outer 2 cols of the arena) ──
  // Circular-ish shape using distance from center
  const cx = 14.5;
  const cy = 11;
  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - cy);
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Water in the outer ring (beyond radius 7)
  if (dist > 7.5) return WT;

  // Center platform is cracked floor
  return FC;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
