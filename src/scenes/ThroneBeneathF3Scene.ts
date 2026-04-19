import { useLoreStore } from '../state/loreStore';
import { BaseWorldScene, TILE } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * The Throne Beneath — Floor 3: The Forgotten Throne.
 * MASSIVE throne room. The Crownless One's arena.
 * Central: an empty throne. No one sits in it — that is the point.
 * The Crownless One enemy stands before the throne.
 * After victory: victory chest + game ending triggers.
 * 30x22 map.
 */

const MAP_W = 30;
const MAP_H = 22;

const SOLID_TILES = new Set<number>([T.WALL_STONE, T.LAVA]);

export class ThroneBeneathF3Scene extends BaseWorldScene {
  constructor() {
    super({ key: 'ThroneBeneathF3Scene' });
  }

  protected getZoneName(): string | null { return 'The Forgotten Throne'; }

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

    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        if (SOLID_TILES.has(mapData[ty][tx])) {
          const w = this.add.rectangle(
            tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
          this.physics.add.existing(w, true);
          this.walls.add(w);
        }
      }
    }

    // ── The Empty Throne (decorative, center of room) ──
    const throneX = 15 * TILE;
    const throneY = 8 * TILE;
    // Throne back
    this.add.rectangle(throneX, throneY - TILE, TILE * 1.5, TILE * 0.5, 0x282038).setStrokeStyle(2, 0x4a3860).setDepth(5);
    // Throne seat
    this.add.rectangle(throneX, throneY, TILE * 1.5, TILE, 0x1a1028).setStrokeStyle(2, 0x382858).setDepth(5);
    // Armrests
    this.add.rectangle(throneX - TILE * 0.75, throneY, TILE * 0.3, TILE, 0x282038).setDepth(5);
    this.add.rectangle(throneX + TILE * 0.75, throneY, TILE * 0.3, TILE, 0x282038).setDepth(5);
    // Purple void glow on throne
    const throneGlow = this.add.circle(throneX, throneY, 30, 0x4020a0, 0.08);
    throneGlow.setDepth(4);
    this.tweens.add({ targets: throneGlow, scale: 1.3, alpha: 0.03, duration: 3000, yoyo: true, repeat: -1 });

    // Throne lore
    const throneLore = this.add.rectangle(throneX, throneY + TILE, 32, 12, 0x000000, 0);
    this.spawnInteractable({
      sprite: throneLore as any,
      label: 'Examine the throne',
      radius: 28,
      action: () => {
        useLoreStore.getState().discover({
          key: 'forgotten-throne',
          title: 'The Forgotten Throne',
          text: 'The throne is empty. It has always been empty. The crown was never meant to be worn. It was meant to be forgotten.',
          location: 'The Forgotten Throne',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'The throne is empty. It has always been empty.',
        }));
      },
    });

    // ── The Crownless One ──
    this.spawnEnemy({ monsterKey: 'crownless_one', x: 15 * TILE, y: 12 * TILE });

    // ── Purple energy pillars (decorative) ──
    const pillarPositions = [
      { x: 6 * TILE, y: 6 * TILE }, { x: 24 * TILE, y: 6 * TILE },
      { x: 6 * TILE, y: 14 * TILE }, { x: 24 * TILE, y: 14 * TILE },
    ];
    for (const pp of pillarPositions) {
      this.add.rectangle(pp.x, pp.y, 12, 28, 0x282038).setStrokeStyle(1, 0x4a3860).setDepth(5);
      const glow = this.add.circle(pp.x, pp.y, 16, 0x6040c0, 0.08);
      glow.setDepth(4);
      this.tweens.add({ targets: glow, alpha: 0.02, scale: 1.3, duration: 2500, yoyo: true, repeat: -1, delay: Math.random() * 1000 });
    }

    // ── Ambient darkness particles ──
    for (let i = 0; i < 8; i++) {
      const px = 4 * TILE + Math.random() * 22 * TILE;
      const py = 4 * TILE + Math.random() * 14 * TILE;
      const particle = this.add.circle(px, py, 1, 0x8040e0, 0.4);
      particle.setDepth(55);
      this.tweens.add({
        targets: particle,
        y: py - 20, alpha: 0, duration: 3000 + Math.random() * 2000,
        yoyo: false, repeat: -1, delay: i * 400,
      });
    }

    // ── Watcher's final line ──
    this.spawnWatcher(4 * TILE, 18 * TILE);

    // ── Victory chest (spawns after combat — player returns to this scene after defeating boss) ──
    this.spawnChest({
      x: 15 * TILE, y: 10 * TILE,
      loot: [
        { itemKey: 'kings_crown', qty: 1 },
        { itemKey: 'shadow_essence', qty: 3 },
        { itemKey: 'troll_heart', qty: 2 },
        { itemKey: 'health_potion', qty: 5 },
        { itemKey: 'void_edge' },
        { itemKey: 'ring_of_the_deep' },
      ],
      gold: 300,
    });

    // ── Exits ──
    this.addExit({
      x: 14 * TILE, y: 0,
      w: TILE * 2, h: TILE,
      targetScene: 'ThroneBeneathF2Scene',
      targetSpawn: 'fromF3',
      label: '\u25B2 Hall of Names',
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromF2':
      case 'default':
        return { x: 15 * TILE, y: 2 * TILE };
      default:
        return { x: 15 * TILE, y: 2 * TILE };
    }
  }
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
  // Border walls
  if (x <= 1 || x >= MAP_W - 2 || y <= 0 || y >= MAP_H - 1) {
    if (y <= 0 && x >= 14 && x <= 15) return T.FLOOR_STONE;
    return T.WALL_STONE;
  }

  // Massive open throne room
  if (x >= 3 && x <= 26 && y >= 2 && y <= 19) return T.FLOOR_STONE;

  // Entry corridor
  if (x >= 14 && x <= 15 && y >= 1 && y <= 2) return T.FLOOR_STONE;

  // Blood stone around throne
  if (x >= 13 && x <= 17 && y >= 6 && y <= 10) return T.BLOOD_STONE;

  // Lava accents in corners
  if (x >= 3 && x <= 4 && y >= 2 && y <= 4) return T.LAVA;
  if (x >= 25 && x <= 26 && y >= 2 && y <= 4) return T.LAVA;
  if (x >= 3 && x <= 4 && y >= 17 && y <= 19) return T.LAVA;
  if (x >= 25 && x <= 26 && y >= 17 && y <= 19) return T.LAVA;

  return T.WALL_STONE;
}
