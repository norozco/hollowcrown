import { useInventoryStore } from '../state/inventoryStore';
import { useLoreStore } from '../state/loreStore';
import { useDungeonItemStore } from '../state/dungeonItemStore';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Ironveil Mines — an abandoned mine carved into a mountainside. Rocky
 * terrain, minecart tracks, timber supports, ore veins glinting in
 * torchlight. Darker and more claustrophobic than open areas.
 *
 * Map is 40 tiles wide x 22 tiles tall = 1280x704 px.
 */

const MAP_W = 40;
const MAP_H = 22;

export class IronveilScene extends BaseWorldScene {
  constructor() {
    super({ key: 'IronveilScene' });
  }

  protected getZoneName(): string | null { return 'Ironveil Mines'; }

  protected getRandomEvents(): Array<() => void> {
    return [
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'A timber support creaks. Dust sifts from the ceiling.',
        }));
      },
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'Something skitters in the dark ahead. Then silence.',
        }));
      },
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'A cold draft moves through the tunnel. The torchlight wavers.',
        }));
      },
    ];
  }

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

    // Rock walls block movement — scan and add physics bodies.
    const solidTiles = new Set<number>([T.WALL_STONE, T.BUSH]);
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const tile = mapData[ty][tx];
        if (solidTiles.has(tile)) {
          const cx = tx * TILE + TILE / 2;
          const cy = ty * TILE + TILE / 2;
          const wall = this.add.rectangle(cx, cy, 28, 28, 0x000000, 0);
          this.physics.add.existing(wall, true);
          this.walls.add(wall);
        }
      }
    }

    // ── Timber supports (visual pillars along tunnels) ──
    const timberPositions: [number, number][] = [
      [6, 9], [6, 13], [12, 9], [12, 13], [18, 9], [18, 13],
      [24, 6], [24, 16], [30, 6], [30, 16],
    ];
    for (const [tx, ty] of timberPositions) {
      const cx = tx * TILE + TILE / 2;
      const cy = ty * TILE + TILE / 2;
      // Vertical beam
      this.add.rectangle(cx, cy, 6, 28, 0x6a4820).setDepth(4);
      // Horizontal crossbeam
      this.add.rectangle(cx, cy - 12, 24, 4, 0x5a3818).setDepth(4);
      // Wood grain
      this.add.rectangle(cx - 1, cy, 1, 24, 0x4a3010).setDepth(5);
    }

    // ── Minecart tracks (horizontal lines along main tunnel) ──
    for (let x = 3; x < 28; x++) {
      const trackY = 11 * TILE + TILE / 2;
      const trackX = x * TILE + TILE / 2;
      // Rails
      this.add.rectangle(trackX, trackY - 4, TILE - 2, 2, 0x808890).setDepth(3);
      this.add.rectangle(trackX, trackY + 4, TILE - 2, 2, 0x808890).setDepth(3);
      // Cross ties (every other tile)
      if (x % 2 === 0) {
        this.add.rectangle(trackX, trackY, 4, 12, 0x5a3818).setDepth(2);
      }
    }

    // ── Abandoned minecart (at a junction) ──
    const cartX = 15 * TILE;
    const cartY = 11 * TILE;
    this.add.rectangle(cartX, cartY, 20, 14, 0x6a5838).setDepth(6);
    this.add.rectangle(cartX, cartY - 6, 22, 4, 0x7a6848).setDepth(6);
    // Wheels
    this.add.circle(cartX - 6, cartY + 8, 3, 0x505860).setDepth(6);
    this.add.circle(cartX + 6, cartY + 8, 3, 0x505860).setDepth(6);
    // Ore chunks visible inside
    this.add.circle(cartX - 3, cartY - 2, 3, 0xa08040).setDepth(7);
    this.add.circle(cartX + 4, cartY - 1, 2, 0xb09050).setDepth(7);

    // ── Waypoint stone (near entrance) ──
    const wpX = 3 * TILE;
    const wpY = 11 * TILE;
    const wpStone = this.add.rectangle(wpX, wpY, 28, 28, 0x6080b0);
    wpStone.setStrokeStyle(2, 0x4060a0);
    wpStone.setDepth(7);
    const wpGlow = this.add.circle(wpX, wpY, 20, 0x80a0e0, 0.15);
    wpGlow.setDepth(6);
    this.tweens.add({ targets: wpGlow, scale: 1.3, alpha: 0.05, duration: 2000, yoyo: true, repeat: -1 });
    this.add.text(wpX, wpY - 22, 'Waypoint', {
      fontFamily: 'Courier New', fontSize: '9px', color: '#80a0e0',
    }).setOrigin(0.5).setDepth(8);
    this.spawnInteractable({
      sprite: wpStone as any,
      label: 'Use waypoint',
      radius: 24,
      action: () => {
        window.dispatchEvent(new CustomEvent('openFastTravel', { detail: { currentScene: this.scene.key } }));
      },
    });

    // ── Enemies ──
    // Cave bats in the tunnels
    this.spawnEnemy({ monsterKey: 'cave_bat', x: 10 * TILE, y: 11 * TILE });
    this.spawnEnemy({ monsterKey: 'cave_bat', x: 20 * TILE, y: 8 * TILE });
    this.spawnEnemy({ monsterKey: 'cave_bat', x: 28 * TILE, y: 14 * TILE });
    // Mine golems in the caverns
    this.spawnEnemy({ monsterKey: 'mine_golem', x: 26 * TILE, y: 11 * TILE });
    this.spawnEnemy({ monsterKey: 'mine_golem', x: 34 * TILE, y: 11 * TILE });
    // Dead miners risen
    this.spawnEnemy({ monsterKey: 'skeleton', x: 16 * TILE, y: 6 * TILE });
    this.spawnEnemy({ monsterKey: 'skeleton', x: 32 * TILE, y: 16 * TILE });

    // ── Iron ore pickup nodes (it's a mine!) ──
    const orePositions: [number, number][] = [
      [8, 7], [22, 15], [35, 8],
    ];
    for (const [ox, oy] of orePositions) {
      const oreX = ox * TILE;
      const oreY = oy * TILE;
      // Ore vein visual — grey rock with glint
      const oreNode = this.add.circle(oreX, oreY, 8, 0x808080);
      oreNode.setStrokeStyle(2, 0x606060);
      oreNode.setDepth(6);
      // Ore glint
      this.add.circle(oreX + 3, oreY - 3, 2, 0xc0a040, 0.6).setDepth(7);

      this.spawnInteractable({
        sprite: oreNode as any, label: 'Mine iron ore', radius: 20,
        action: () => {
          this.spawnPickupParticles(oreNode.x, oreNode.y, 0x60c060);
          useInventoryStore.getState().addItem('iron_ore');
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Mined iron ore.' }));
          oreNode.destroy();
        },
      });
    }

    // ── Treasure chest in a side tunnel ──
    this.spawnChest({
      x: 36 * TILE, y: 5 * TILE,
      loot: [{ itemKey: 'iron_ore', qty: 3 }, { itemKey: 'health_potion' }, { itemKey: 'troll_heart' }],
      gold: 30,
    });

    // ── Spike traps (unstable ground, 4 damage) ──
    this.spawnTrap({ x: 14 * TILE, y: 8 * TILE, damage: 4 });
    this.spawnTrap({ x: 22 * TILE, y: 13 * TILE, damage: 4 });
    this.spawnTrap({ x: 30 * TILE, y: 10 * TILE, damage: 4 });

    // ── Torchlight visuals (warm glow spots along walls) ──
    const torchPositions: [number, number][] = [
      [4, 8], [10, 8], [16, 8], [22, 5], [28, 5],
      [4, 14], [10, 14], [16, 14], [22, 17], [28, 17],
    ];
    for (const [tx, ty] of torchPositions) {
      const cx = tx * TILE;
      const cy = ty * TILE;
      // Torch bracket on wall
      this.add.rectangle(cx, cy, 4, 8, 0x6a4820).setDepth(5);
      // Flame
      this.add.circle(cx, cy - 6, 4, 0xe08020, 0.7).setDepth(6);
      // Warm light glow
      const glow = this.add.circle(cx, cy, 40, 0xe0a030, 0.06);
      glow.setDepth(1);
      this.tweens.add({ targets: glow, alpha: 0.03, scale: 1.1, duration: 1500 + Math.random() * 500, yoyo: true, repeat: -1 });
    }

    // ── Environmental lore ──

    // Rusted mining tools
    const toolsX = 9 * TILE;
    const toolsY = 14 * TILE;
    const tools = this.add.rectangle(toolsX, toolsY, 16, 8, 0x7a6040, 0.6);
    tools.setDepth(6);
    this.spawnInteractable({
      sprite: tools as any,
      label: 'Examine mining tools',
      radius: 20,
      action: () => {
        useLoreStore.getState().discover({
          key: 'mining-tools-ironveil',
          title: 'Rusted Tools',
          text: 'A pickaxe and shovel, left mid-swing. The rust says months. The angle says something interrupted the work.',
          location: 'Ironveil Mines',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'A pickaxe and shovel, left mid-swing. The rust says months.',
        }));
      },
    });

    // Collapsed tunnel (eastern dead-end)
    const collapseX = 38 * TILE;
    const collapseY = 11 * TILE;
    // Rubble pile
    for (let i = 0; i < 6; i++) {
      const rx = collapseX + (i % 3 - 1) * 10;
      const ry = collapseY + (Math.floor(i / 3) - 1) * 8;
      this.add.circle(rx, ry, 6 + Math.random() * 4, 0x505860).setDepth(6);
    }
    const collapse = this.add.rectangle(collapseX, collapseY, 24, 24, 0x000000, 0);
    this.spawnInteractable({
      sprite: collapse as any,
      label: 'Examine collapsed passage',
      radius: 24,
      action: () => {
        useLoreStore.getState().discover({
          key: 'collapsed-tunnel-ironveil',
          title: 'Collapsed Passage',
          text: 'Tons of rock, recently fallen. Air moves from behind the rubble — there is more beyond. But not today.',
          location: 'Ironveil Mines',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'Tons of rock, recently fallen. Air moves behind the rubble. Not today.',
        }));
      },
    });

    // Old lantern
    const lanternX = 20 * TILE;
    const lanternY = 16 * TILE;
    const lantern = this.add.circle(lanternX, lanternY, 5, 0xc0a040, 0.5);
    lantern.setDepth(6);
    this.spawnInteractable({
      sprite: lantern as any,
      label: 'Examine old lantern',
      radius: 20,
      action: () => {
        useLoreStore.getState().discover({
          key: 'old-lantern-ironveil',
          title: 'Miner\'s Lantern',
          text: 'Still warm. Someone was here recently — or something that remembers how to carry a light.',
          location: 'Ironveil Mines',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'Still warm. Someone was here recently.',
        }));
      },
    });

    // ── Fairy Fountain (side tunnel dead-end, north-east alcove) ──
    this.spawnFairyFountain({ x: 35 * TILE, y: 4 * TILE });

    // ── The Watcher ──
    this.spawnWatcher(3 * TILE, 12 * TILE);

    // ── Zone marker ──
    this.add
      .text(2 * TILE, WORLD_H / 2, 'IRONVEIL MINES', {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#6a7888',
      })
      .setOrigin(0, 0.5)
      .setAlpha(0.5)
      .setDepth(15);

    // ── West exit → Mossbarrow ──
    this.addExit({
      x: 0,
      y: 0,
      w: TILE,
      h: WORLD_H,
      targetScene: 'MossbarrowScene',
      targetSpawn: 'fromIronveil',
      label: '\u2190 Mossbarrow Cairn',
    });

    // ── North exit → Frosthollow Peaks ──
    this.addExit({
      x: 14 * TILE, y: 0, w: 6 * TILE, h: TILE,
      targetScene: 'FrosthollowScene', targetSpawn: 'fromIronveil',
      label: '\u2191 Frosthollow Peaks [Lv 12-15]',
    });
    this.add.rectangle(17 * TILE, 1.2 * TILE, 180, 36, 0x10181e).setStrokeStyle(2, 0x405868).setDepth(3);
    this.add.text(17 * TILE, 1.2 * TILE, '\u25B2 Frosthollow Peaks', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#80a0c0',
    }).setOrigin(0.5).setDepth(4);

    // ── Random loot bag ──
    this.spawnLootBag({
      x: 32 * TILE, y: 8 * TILE,
      loot: [
        { itemKey: 'iron_ore', weight: 4 },
        { itemKey: 'health_potion', weight: 2 },
        { itemKey: 'bone_shard', weight: 2 },
        { itemKey: 'troll_heart', weight: 1 },
      ],
      gold: 20, spawnChance: 0.2,
    });

    // ── Pickaxe dungeon item chest (north cavern, golden trim) ──
    if (!useDungeonItemStore.getState().has('pickaxe')) {
      const diChest = this.add.rectangle(26 * TILE, 5 * TILE, 28, 24, 0x8a6830);
      diChest.setStrokeStyle(2, 0xe0c040);
      diChest.setDepth(8);
      this.add.rectangle(26 * TILE, 5 * TILE - 10, 28, 8, 0xa08040).setStrokeStyle(1, 0xe0c040).setDepth(8);
      this.add.circle(26 * TILE, 5 * TILE, 18, 0xe0c040, 0.1).setDepth(7);
      this.spawnInteractable({
        sprite: diChest as any, label: 'Open golden chest', radius: 24,
        action: () => {
          useDungeonItemStore.getState().acquire('pickaxe');
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: "Miner's Pickaxe acquired! Cracked walls can now be broken." }));
          diChest.destroy();
        },
      });
    }

    // ── Breakable wall (south cavern east wall) → hidden ore vein room ──
    this.spawnBreakableWall({
      x: 29 * TILE, y: 16 * TILE, w: TILE, h: TILE * 2,
      onBreak: () => {
        useInventoryStore.getState().addItem('iron_ore', 3);
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Hidden ore vein! Found iron ore x3!' }));
        this.spawnHeartPiece(30 * TILE, 17 * TILE);
      },
    });

    // ── Ancient Coin #4 — in the collapsed passage dead-end ──
    this.spawnAncientCoin({
      x: 4 * TILE, y: 18 * TILE,
      coinId: 'coin_4', inscription: 'Four buried in iron, waiting.',
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromFrosthollow':
        return { x: 17 * TILE, y: 3 * TILE };
      case 'fromMossbarrow':
      case 'default':
      default:
        return { x: 2 * TILE + 16, y: WORLD_H / 2 };
    }
  }
}

// ─── Map data ──────────────────────────────────────────────────

const FS = T.FLOOR_STONE;
const FC = T.FLOOR_CRACKED;
const S  = T.WALL_STONE;
const _P = T.PATH; void _P;

/**
 * Ironveil Mines layout — 40x22 tile grid.
 *
 * Main tunnel runs east from the west entrance (rows 9-13).
 * Two large cavern chambers:
 *   - North cavern (cols 21-29, rows 3-8)
 *   - South cavern (cols 21-29, rows 14-19)
 * Connected by narrow tunnels branching from the main shaft.
 * Eastern dead-end with collapsed passage at col 37+.
 */
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
  // ── Main tunnel: rows 9-13, cols 1-37 ──
  if (y >= 9 && y <= 13 && x >= 1 && x <= 37) {
    // Unstable patches (cracked floor)
    if ((x === 13 || x === 14) && (y === 10 || y === 12)) return FC;
    if ((x === 21 || x === 22) && y === 12) return FC;
    if (x === 29 && (y === 10 || y === 11)) return FC;
    return FS;
  }

  // ── North branch tunnel: cols 20-21, rows 5-9 ──
  if (x >= 20 && x <= 22 && y >= 5 && y < 9) return FS;

  // ── South branch tunnel: cols 20-21, rows 13-17 ──
  if (x >= 20 && x <= 22 && y > 13 && y <= 17) return FS;

  // ── North cavern: cols 23-29, rows 3-8 ──
  if (x >= 23 && x <= 29 && y >= 3 && y <= 8) {
    // Cracked areas at edges
    if ((x === 23 || x === 29) && (y === 3 || y === 8)) return FC;
    return FS;
  }

  // ── South cavern: cols 23-29, rows 14-19 ──
  if (x >= 23 && x <= 29 && y >= 14 && y <= 19) {
    if ((x === 23 || x === 29) && (y === 14 || y === 19)) return FC;
    return FS;
  }

  // ── Small side tunnel north (cols 7-9, rows 5-9) ──
  if (x >= 7 && x <= 9 && y >= 5 && y < 9) return FS;

  // ── Small side tunnel south (cols 7-9, rows 13-17) ──
  if (x >= 7 && x <= 9 && y > 13 && y <= 17) return FS;

  // ── Dead-end alcove NE (cols 33-37, rows 3-7) for treasure ──
  if (x >= 33 && x <= 37 && y >= 3 && y <= 7) return FS;
  // Connecting tunnel from main to alcove
  if (x >= 33 && x <= 35 && y >= 7 && y < 9) return FS;

  // ── Dead-end alcove SE (cols 33-37, rows 15-18) ──
  if (x >= 33 && x <= 37 && y >= 15 && y <= 18) return FS;
  if (x >= 33 && x <= 35 && y > 13 && y < 15) return FS;

  // ── Entrance alcove (cols 0-1, rows 9-13) — always open ──
  if (x === 0 && y >= 9 && y <= 13) return FS;

  // ── Everything else: rock wall ──
  return S;
}
