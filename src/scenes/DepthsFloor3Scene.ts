import { useInventoryStore } from '../state/inventoryStore';
import { useQuestStore } from '../state/questStore';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Mossbarrow Depths — Floor 3 (Boss Floor). Corrupted throne room
 * with lava channels, dark energy, bones, and the Hollow King.
 * Stairs up at the top-center. No stairs down.
 */

const MAP_W = 30;
const MAP_H = 22;

/** Tiles the player cannot walk through */
const SOLID_TILES = new Set([T.WALL_STONE, T.CHAINS, T.LAVA]);

export class DepthsFloor3Scene extends BaseWorldScene {
  constructor() {
    super({ key: 'DepthsFloor3Scene' });
  }

  protected getZoneName(): string | null { return 'The Hollow Throne'; }

  protected layout(): void {
    generateTileset(this);

    const map = this.make.tilemap({
      data: buildMapData(),
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tileset')!;
    map.createLayer(0, tileset)!;

    // Wall + hazard collision (walls, lava, chains)
    for (const [tx, ty] of getSolidPositions()) {
      const w = this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
      this.physics.add.existing(w, true);
      this.walls.add(w);
    }

    // Zone label
    this.add.text(WORLD_W / 2, 2 * TILE, 'THE HOLLOW THRONE', {
      fontFamily: 'Courier New', fontSize: '14px', color: '#604080',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);

    // ── Mixed red/purple torches — boss atmosphere ──
    for (const [tx, ty, color] of [
      [5, 3, 0x8040c0], [5, 10, 0xc04020], [5, 17, 0x8040c0],
      [24, 3, 0x8040c0], [24, 10, 0xc04020], [24, 17, 0x8040c0],
      [10, 6, 0xc04020], [10, 14, 0x8040c0],
      [19, 6, 0xc04020], [19, 14, 0x8040c0],
      [12, 3, 0xc04020], [18, 3, 0xc04020],
    ] as [number, number, number][]) {
      this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 26, 26, color, 0.16).setDepth(4);
    }

    // ── Lava glow (orange rectangles near lava tiles) ──
    for (let y = 1; y <= 20; y++) {
      for (const xCol of [4, 5, 24, 25]) {
        if (tileAt(xCol, y) === T.LAVA) {
          this.add.rectangle(xCol * TILE + TILE / 2, y * TILE + TILE / 2, TILE + 8, TILE + 8, 0xff6020, 0.08).setDepth(1);
        }
      }
    }

    // ── Cairn pillar decorations (solid) with cracks and moss ──
    for (const [tx, ty] of [
      [7, 5], [7, 15], [22, 5], [22, 15],
      [10, 8], [10, 12], [19, 8], [19, 12],
    ] as [number, number][]) {
      const stone = this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 28, 28, 0x484050);
      stone.setStrokeStyle(2, 0x303040);
      stone.setDepth(5);
      // Inner detail
      this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 16, 16, 0x585068).setDepth(5);
      // Crack lines on pillars
      this.add.rectangle(tx * TILE + TILE / 2 - 4, ty * TILE + TILE / 2 + 2, 8, 1, 0x303038).setDepth(6);
      this.add.rectangle(tx * TILE + TILE / 2 + 2, ty * TILE + TILE / 2 - 6, 1, 10, 0x303038).setDepth(6);
      // Moss patch on some pillars
      if (ty === 5 || ty === 15) {
        this.add.rectangle(tx * TILE + TILE / 2 - 6, ty * TILE + TILE / 2 + 8, 6, 4, 0x487838, 0.6).setDepth(6);
      }
      this.physics.add.existing(stone, true);
      this.walls.add(stone);
    }

    // ── Throne visual (enhanced with armrests, crown, dark energy) ──
    const throneX = 15 * TILE;
    const throneY = 18 * TILE;
    // Throne base
    const throne = this.add.rectangle(throneX, throneY, 52, 52, 0x282038);
    throne.setStrokeStyle(3, 0x604080);
    throne.setDepth(5);
    // Throne back (tall)
    this.add.rectangle(throneX, throneY - 28, 52, 20, 0x382850).setStrokeStyle(2, 0x604080).setDepth(5);
    // Armrests
    this.add.rectangle(throneX - 28, throneY, 10, 36, 0x403060).setStrokeStyle(1, 0x504070).setDepth(5);
    this.add.rectangle(throneX + 28, throneY, 10, 36, 0x403060).setStrokeStyle(1, 0x504070).setDepth(5);
    // Crown silhouette on throne back
    this.add.triangle(throneX - 8, throneY - 36, 0, 8, 4, 0, 8, 8, 0xc09030, 0.7).setDepth(6);
    this.add.triangle(throneX, throneY - 38, 0, 8, 4, 0, 8, 8, 0xc09030, 0.7).setDepth(6);
    this.add.triangle(throneX + 8, throneY - 36, 0, 8, 4, 0, 8, 8, 0xc09030, 0.7).setDepth(6);
    // Dark energy aura around throne (pulsing)
    const aura = this.add.circle(throneX, throneY, 40, 0x6030a0, 0.1).setDepth(3);
    this.tweens.add({
      targets: aura, alpha: { from: 0.06, to: 0.18 }, scaleX: { from: 0.9, to: 1.1 }, scaleY: { from: 0.9, to: 1.1 },
      duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.physics.add.existing(throne, true);
    this.walls.add(throne);

    // ── Dark energy tendrils near the throne (purple lines) ──
    for (const [dx, dy, dw, dh] of [
      [13, 17, 1, 3], [17, 17, 1, 3], [14, 19, 1, 2], [16, 19, 1, 2],
      [12, 16, 2, 1], [18, 16, 2, 1],
    ] as [number, number, number, number][]) {
      const tendril = this.add.rectangle(dx * TILE + TILE / 2, dy * TILE + TILE / 2, dw * TILE, dh * TILE, 0x6030a0, 0.15).setDepth(3);
      this.tweens.add({
        targets: tendril, alpha: { from: 0.08, to: 0.22 },
        duration: 1800 + Math.random() * 1000, yoyo: true, repeat: -1,
      });
    }

    // ── Bone border around boss arena (semicircle in front of throne) ──
    for (const [bx, by] of [
      [11, 16], [12, 15], [13, 14], [14, 13], [15, 13], [16, 13], [17, 14], [18, 15], [19, 16],
    ] as [number, number][]) {
      this.add.circle(bx * TILE + TILE / 2, by * TILE + TILE / 2, 4, 0xd0c8b0, 0.5).setDepth(5);
      this.add.circle(bx * TILE + TILE / 2 + 8, by * TILE + TILE / 2 - 4, 3, 0xc8c0a8, 0.4).setDepth(5);
    }

    // ── Fallen banners on walls (tattered cloth) ──
    for (const [fx, fy, fh] of [[6, 2, 4], [6, 12, 3], [23, 2, 4], [23, 12, 3]] as [number, number, number][]) {
      // Banner cloth (dark purple with gold trim)
      this.add.rectangle(fx * TILE + TILE / 2, fy * TILE + fh * TILE / 2, 12, fh * TILE, 0x402060, 0.7).setDepth(6);
      // Gold trim stripe
      this.add.rectangle(fx * TILE + TILE / 2, fy * TILE + fh * TILE / 2, 3, fh * TILE - 4, 0xc09030, 0.5).setDepth(6);
      // Tattered bottom edge (jagged)
      this.add.rectangle(fx * TILE + TILE / 2 - 3, (fy + fh) * TILE - 4, 4, 6, 0x402060, 0.5).setDepth(6);
      this.add.rectangle(fx * TILE + TILE / 2 + 3, (fy + fh) * TILE - 2, 4, 8, 0x402060, 0.6).setDepth(6);
    }

    // ── Material pickups ──
    // Shadow essence — near the throne (walkable at 13,17 area, but that's blood_stone which is walkable)
    const shadowEssence = this.add.circle(12 * TILE + TILE / 2, 15 * TILE + TILE / 2, 7, 0x8040c0);
    shadowEssence.setStrokeStyle(2, 0x6030a0);
    shadowEssence.setDepth(6);
    this.spawnInteractable({
      sprite: shadowEssence as any, label: 'Collect shadow essence', radius: 20,
      action: () => {
        useInventoryStore.getState().addItem('shadow_essence');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found shadow essence!' }));
        shadowEssence.destroy();
      },
    });

    // Iron ore vein — near a pillar (walkable at 8,6)
    const ironOre = this.add.circle(8 * TILE + TILE / 2, 6 * TILE + TILE / 2, 8, 0x808080);
    ironOre.setStrokeStyle(2, 0x606060);
    ironOre.setDepth(6);
    this.spawnInteractable({
      sprite: ironOre as any, label: 'Pick up iron ore', radius: 20,
      action: () => {
        useInventoryStore.getState().addItem('iron_ore');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found iron ore!' }));
        ironOre.destroy();
      },
    });

    // Boss enemy — The Hollow King (on walkable tile)
    this.spawnEnemy({ monsterKey: 'hollow_king', x: 15 * TILE, y: 14 * TILE });

    // Skeleton guards (on walkable tiles)
    this.spawnEnemy({ monsterKey: 'skeleton', x: 9 * TILE, y: 10 * TILE });
    this.spawnEnemy({ monsterKey: 'skeleton', x: 21 * TILE, y: 10 * TILE });

    // ── Spike traps near the boss area ──
    this.spawnTrap({ x: 13 * TILE, y: 12 * TILE, damage: 5 });
    this.spawnTrap({ x: 17 * TILE, y: 12 * TILE, damage: 5 });

    // ── Treasure chest near the throne (big reward) ──
    this.spawnChest({
      x: 18 * TILE + TILE / 2, y: 17 * TILE + TILE / 2,
      loot: [
        { itemKey: Math.random() > 0.5 ? 'steel_sword' : 'chainmail' },
        { itemKey: 'health_potion', qty: 3 },
      ],
      gold: 50,
    });

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

    // ── Depths-explorer quest: reaching Floor 3 completes the objective ──
    useQuestStore.getState().completeObjective('depths-explorer', 'reach-floor-3');

    // ── Random loot bag (rare, high value — boss floor) ──
    this.spawnLootBag({
      x: 20 * TILE, y: 6 * TILE,
      loot: [{ itemKey: 'shadow_essence', weight: 2 }, { itemKey: 'troll_heart', weight: 2 }, { itemKey: 'steel_sword', weight: 1 }, { itemKey: 'chainmail', weight: 1 }],
      gold: 30, spawnChance: 0.3,
    });
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
const LV = T.LAVA;
const BN = T.BONES;
const BS = T.BLOOD_STONE;
const CH = T.CHAINS;

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
 * Floor 3: Corrupted Throne Room with lava channels.
 *   Main hall: cols 4-25, rows 1-20
 *   Lava channels: cols 4-5 and cols 24-25 (2-tile wide rivers)
 *   Central walkway: cols 6-23 (cracked stone)
 *   Throne area: rows 16-20, blood-stained
 *   Bones in front of throne (remains of challengers)
 *   Chains flanking the throne walls
 */
function tileAt(x: number, y: number): number {
  // Stair opening (wide)
  if (inRect(x, y, 12, 0, 6, 1)) return FC;

  // Throne room bounds
  if (!inRect(x, y, 4, 1, 22, 20)) return WS;

  // ── Lava channels on east and west edges ──
  if (inRect(x, y, 4, 1, 2, 20)) return LV;   // west lava river
  if (inRect(x, y, 24, 1, 2, 20)) return LV;   // east lava river

  // ── Chains on walls flanking the throne (row 17-19, near lava edges) ──
  if (y >= 16 && y <= 19 && (x === 6 || x === 23)) return CH;

  // ── Bones scattered in front of throne (rows 13-16, center) ──
  if ((x === 13 && y === 14) || (x === 15 && y === 13) || (x === 17 && y === 14) ||
      (x === 12 && y === 16) || (x === 18 && y === 16) || (x === 15 && y === 15)) return BN;

  // ── Blood-stained area near the throne (rows 17-19) ──
  if (inRect(x, y, 12, 17, 7, 3)) return BS;

  // ── Everything else in the hall is cracked stone ──
  return FC;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
