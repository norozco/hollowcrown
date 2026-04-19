import { useInventoryStore } from '../state/inventoryStore';
import { useLoreStore } from '../state/loreStore';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Frosthollow Peaks — snow-covered mountain peaks above Ironveil Mines.
 * White ground, ice formations, frozen lake, howling wind. Lv 12-15.
 *
 * Map is 40 tiles wide x 22 tiles tall = 1280x704 px.
 */

const MAP_W = 40;
const MAP_H = 22;

export class FrosthollowScene extends BaseWorldScene {
  constructor() {
    super({ key: 'FrosthollowScene' });
  }

  protected getZoneName(): string | null { return 'Frosthollow Peaks'; }

  protected getRandomEvents(): Array<() => void> {
    return [
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'A blizzard sweeps across the peaks. The world disappears behind white.',
        }));
      },
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'Snow shifts above. An avalanche warning — the mountain remembers gravity.',
        }));
      },
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'A frozen bird sits on a branch. It does not move. It will not move again.',
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

    // Wall + water collision
    const solidTiles = new Set<number>([T.WALL_STONE, T.WATER, T.BUSH]);
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        if (solidTiles.has(mapData[ty][tx])) {
          const w = this.add.rectangle(
            tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
          this.physics.add.existing(w, true);
          this.walls.add(w);
        }
      }
    }

    // ── Snow particle effects ──
    for (const [sx, sy] of [[6, 4], [14, 8], [28, 6], [34, 12], [10, 16], [22, 18]] as [number, number][]) {
      const snow = this.add.circle(sx * TILE, sy * TILE, 2, 0xf0f0ff, 0.5).setDepth(50);
      this.tweens.add({
        targets: snow, y: sy * TILE + TILE * 3, x: sx * TILE + TILE, alpha: 0,
        duration: 3000, repeat: -1, delay: Math.random() * 2000,
      });
    }

    // ── Frozen lake shimmer (center area) ──
    for (const [lx, ly] of [[18, 10], [20, 11], [22, 10], [19, 12], [21, 12]] as [number, number][]) {
      const shimmer = this.add.rectangle(lx * TILE + TILE / 2, ly * TILE + TILE / 2, 12, 4, 0xc0e0ff, 0.15).setDepth(4);
      this.tweens.add({
        targets: shimmer, alpha: 0.04, duration: 2000 + Math.random() * 1000,
        yoyo: true, repeat: -1,
      });
    }

    // ── Pine trees (BUSH tiles already placed in map — add visual tops) ──
    const treePositions: [number, number][] = [
      [4, 4], [6, 6], [8, 3], [12, 5], [32, 4], [34, 6], [36, 3],
    ];
    for (const [tx, ty] of treePositions) {
      const cx = tx * TILE + TILE / 2;
      const cy = ty * TILE + TILE / 2;
      // Snow-capped triangle
      this.add.triangle(cx, cy - 12, 0, 16, 8, -12, 16, 16, 0x2a4a2a).setDepth(5);
      this.add.triangle(cx, cy - 18, 2, 10, 6, -6, 10, 10, 0x3a5a3a).setDepth(6);
      // Snow cap
      this.add.triangle(cx, cy - 22, 3, 6, 5, -2, 7, 6, 0xe0e8f0).setDepth(7);
      // Trunk
      this.add.rectangle(cx, cy + 2, 4, 12, 0x4a3020).setDepth(4);
    }

    // ── Waypoint stone ──
    const wpX = 5 * TILE;
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
    this.spawnEnemy({ monsterKey: 'frost_wolf', x: 10 * TILE, y: 10 * TILE });
    this.spawnEnemy({ monsterKey: 'frost_wolf', x: 16 * TILE, y: 7 * TILE });
    this.spawnEnemy({ monsterKey: 'frost_wolf', x: 30 * TILE, y: 14 * TILE });
    this.spawnEnemy({ monsterKey: 'blizzard_wraith', x: 24 * TILE, y: 8 * TILE });
    this.spawnEnemy({ monsterKey: 'blizzard_wraith', x: 14 * TILE, y: 16 * TILE });
    this.spawnEnemy({ monsterKey: 'ice_golem', x: 28 * TILE, y: 10 * TILE });

    // ── Material pickups ──
    const materialPositions: [number, number, string, string][] = [
      [8, 14, 'moonpetal', 'A pale flower growing in the frost.'],
      [26, 6, 'iron_ore', 'Ore exposed by the mountain wind.'],
      [34, 16, 'shadow_essence', 'Dark residue, frozen in ice.'],
    ];
    for (const [mx, my, itemKey, msg] of materialPositions) {
      const matX = mx * TILE;
      const matY = my * TILE;
      const mat = this.add.circle(matX, matY, 6, 0xa0c0e0, 0.6);
      mat.setDepth(6);
      this.spawnInteractable({
        sprite: mat as any, label: `Pick up ${itemKey.replace('_', ' ')}`, radius: 20,
        action: () => {
          this.spawnPickupParticles(mat.x, mat.y, 0x80c0e0);
          useInventoryStore.getState().addItem(itemKey);
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: msg }));
          mat.destroy();
        },
      });
    }

    // ── Heart piece (hidden near frozen lake edge) ──
    this.spawnHeartPiece(24 * TILE, 13 * TILE);

    // ── Fairy fountain (sheltered alcove, north-west) ──
    this.spawnFairyFountain({ x: 3 * TILE, y: 4 * TILE });

    // ── Lore: frozen shrine ──
    const shrineX = 30 * TILE;
    const shrineY = 6 * TILE;
    const shrine = this.add.rectangle(shrineX, shrineY, 20, 24, 0x607888);
    shrine.setStrokeStyle(2, 0x80a0b8);
    shrine.setDepth(6);
    this.spawnInteractable({
      sprite: shrine as any,
      label: 'Examine frozen shrine',
      radius: 24,
      action: () => {
        useLoreStore.getState().discover({
          key: 'frozen-shrine-frosthollow',
          title: 'Frozen Shrine',
          text: 'An altar to something older than the mountain. The offering bowl is full of ice that was once tears.',
          location: 'Frosthollow Peaks',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'An altar to something older than the mountain. The offering bowl holds frozen tears.',
        }));
      },
    });

    // ── Lore: frozen traveller ──
    const travX = 18 * TILE;
    const travY = 16 * TILE;
    const trav = this.add.rectangle(travX, travY, 14, 14, 0x90a8c0, 0.5);
    trav.setDepth(6);
    this.spawnInteractable({
      sprite: trav as any,
      label: 'Examine frozen figure',
      radius: 20,
      action: () => {
        useLoreStore.getState().discover({
          key: 'frozen-traveller-frosthollow',
          title: 'The Frozen Traveller',
          text: 'A figure kneeling in the snow. Their hands are clasped around a compass that points nowhere. They never arrived.',
          location: 'Frosthollow Peaks',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'A kneeling figure, frozen mid-prayer. Their compass points nowhere.',
        }));
      },
    });

    // ── The Watcher ──
    this.spawnWatcher(6 * TILE, 12 * TILE);

    // ── Zone marker ──
    this.add.text(2 * TILE, 2 * TILE, 'FROSTHOLLOW PEAKS [Lv 12-15]', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#80a0c0',
    }).setOrigin(0, 0.5).setAlpha(0.5).setDepth(15);

    // ── West exit → Ironveil Mines ──
    this.addExit({
      x: 0, y: 0, w: TILE, h: WORLD_H,
      targetScene: 'IronveilScene', targetSpawn: 'fromFrosthollow',
      label: '\u2190 Ironveil Mines',
    });

    // ── East exit → Frozen Hollow dungeon ──
    const caveX = 38 * TILE;
    const caveY = 11 * TILE;
    // Cave mouth visual
    this.add.rectangle(caveX, caveY, TILE * 2, TILE * 3, 0x10181e).setStrokeStyle(2, 0x405868).setDepth(3);
    this.add.text(caveX, caveY - TILE * 1.5 - 6, 'Frozen Hollow', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#80a0c0',
    }).setOrigin(0.5).setDepth(4);
    this.addExit({
      x: 37 * TILE, y: 9 * TILE, w: TILE * 3, h: TILE * 4,
      targetScene: 'FrozenHollowF1Scene', targetSpawn: 'fromFrosthollow',
      label: '\u25B6 Frozen Hollow [Dungeon]',
    });

    // ── Random loot bag ──
    this.spawnLootBag({
      x: 12 * TILE, y: 12 * TILE,
      loot: [
        { itemKey: 'health_potion', weight: 3 },
        { itemKey: 'moonpetal', weight: 2 },
        { itemKey: 'wraith_dust', weight: 1 },
        { itemKey: 'iron_ore', weight: 2 },
      ],
      gold: 25, spawnChance: 0.2,
    });

    // ── Ancient Coin #8 — frozen lake edge, partly buried in frost ──
    this.spawnAncientCoin({
      x: 30 * TILE, y: 16 * TILE,
      coinId: 'coin_frosthollow', inscription: 'Eight frozen. The cold only made it sharper.',
    });

    // ── Ice wall blocking hidden area with heart piece + chest ──
    this.spawnIceWall({
      x: 34 * TILE, y: 14 * TILE, w: TILE * 2, h: TILE,
      onMelt: () => {
        this.spawnHeartPiece(36 * TILE, 16 * TILE);
        this.spawnChest({
          x: 37 * TILE, y: 16 * TILE,
          loot: [{ itemKey: 'wraith_dust', qty: 2 }, { itemKey: 'mana_potion', qty: 2 }],
          gold: 40,
        });
      },
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromIronveil':
      case 'default':
      default:
        return { x: 2 * TILE + 16, y: WORLD_H / 2 };
      case 'fromFrozenHollow':
        return { x: 36 * TILE, y: 11 * TILE };
    }
  }
}

// ─── Map data ──────────────────────────────────────────────────

const GL = T.GRASS_LIGHT;   // snowy ground
const FS = T.FLOOR_STONE;
const FC = T.FLOOR_CRACKED; // icy ground
const S  = T.WALL_STONE;    // mountain rock
const W  = T.WATER;         // frozen lake (impassable)
const B  = T.BUSH;          // pine trees
const P  = T.PATH;          // mountain path

/**
 * Frosthollow Peaks layout — 40x22 tile grid.
 *
 * West entrance from Ironveil (rows 9-13, col 0).
 * Winding mountain path through rocky terrain.
 * Frozen lake in center (cols 17-23, rows 9-13).
 * Dungeon entrance on east side (cols 37-39, rows 9-13).
 * Pine trees scattered on north side.
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
  // ── Border walls (mountain edges) ──
  if (y === 0 || y === MAP_H - 1) return S;
  if (x === 0 && (y < 9 || y > 13)) return S;
  if (x === MAP_W - 1 && (y < 9 || y > 13)) return S;

  // ── Mountain rock formations (north) ──
  if (y <= 2 && (x < 3 || x > 37)) return S;
  if (y === 1 && x >= 3 && x <= 37) return S;

  // ── Mountain rock formations (south) ──
  if (y >= MAP_H - 2 && (x < 3 || x > 37)) return S;
  if (y === MAP_H - 2 && x >= 3 && x <= 37 && !(x >= 8 && x <= 36)) return S;

  // ── Rock clusters ──
  if (y >= 2 && y <= 4 && x >= 14 && x <= 16) return S;
  if (y >= 2 && y <= 3 && x >= 26 && x <= 28) return S;
  if (y >= 16 && y <= 18 && x >= 6 && x <= 8) return S;
  if (y >= 17 && y <= 19 && x >= 28 && x <= 30) return S;

  // ── Pine trees ──
  if ((x === 4 && y === 4) || (x === 6 && y === 6) || (x === 8 && y === 3)) return B;
  if ((x === 12 && y === 5) || (x === 32 && y === 4) || (x === 34 && y === 6) || (x === 36 && y === 3)) return B;

  // ── Frozen lake (center) ──
  if (x >= 17 && x <= 23 && y >= 9 && y <= 13) return W;

  // ── Mountain path (winding from west to east) ──
  // Main path from west entrance
  if (y >= 9 && y <= 13 && x >= 0 && x <= 16) return P;
  // Path around north side of lake
  if (y >= 7 && y <= 9 && x >= 14 && x <= 25) return P;
  // Path continues east of lake
  if (y >= 9 && y <= 13 && x >= 24 && x <= 39) return P;
  // Path around south side of lake
  if (y >= 13 && y <= 15 && x >= 14 && x <= 25) return P;

  // ── Icy ground patches ──
  if ((x + y) % 7 === 0 && y >= 5 && y <= 17) return FC;

  // ── Default: snowy ground ──
  return GL;
}
