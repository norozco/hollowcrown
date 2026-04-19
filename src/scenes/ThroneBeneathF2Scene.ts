import { useInventoryStore } from '../state/inventoryStore';
import { useLoreStore } from '../state/loreStore';
import { BaseWorldScene, TILE } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * The Throne Beneath — Floor 2: The Hall of Names.
 * A vast hall with names carved into every surface — every adventurer
 * who ever entered. Brenna's lost partner Aldric's name is here.
 * 30x22 map.
 */

const MAP_W = 30;
const MAP_H = 22;

const SOLID_TILES = new Set<number>([T.WALL_STONE, T.LAVA]);

export class ThroneBeneathF2Scene extends BaseWorldScene {
  constructor() {
    super({ key: 'ThroneBeneathF2Scene' });
  }

  protected getZoneName(): string | null { return 'The Hall of Names'; }

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

    // ── Enemies ──
    this.spawnEnemy({ monsterKey: 'frost_warden', x: 8 * TILE, y: 8 * TILE });
    this.spawnEnemy({ monsterKey: 'frost_warden', x: 22 * TILE, y: 14 * TILE });
    this.spawnEnemy({ monsterKey: 'ember_knight', x: 16 * TILE, y: 6 * TILE });
    this.spawnEnemy({ monsterKey: 'ember_knight', x: 12 * TILE, y: 16 * TILE });
    this.spawnEnemy({ monsterKey: 'ice_golem', x: 20 * TILE, y: 10 * TILE });

    // ── Throne key pickup ──
    const keyX = 24 * TILE;
    const keyY = 4 * TILE;
    const throneKeySprite = this.add.circle(keyX, keyY, 6, 0xc0a040);
    throneKeySprite.setStrokeStyle(2, 0xe0c060);
    throneKeySprite.setDepth(8);
    this.tweens.add({ targets: throneKeySprite, scale: 1.2, alpha: 0.7, duration: 800, yoyo: true, repeat: -1 });
    this.spawnInteractable({
      sprite: throneKeySprite as any,
      label: 'Pick up Throne Key',
      radius: 20,
      action: () => {
        useInventoryStore.getState().addItem('dungeon_key');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found Throne Key!' }));
        this.spawnPickupParticles(keyX, keyY, 0xc0a040);
        throneKeySprite.destroy();
      },
    });

    // ── Locked door to F3 ──
    this.spawnLockedDoor({
      x: 14 * TILE, y: 19 * TILE, w: TILE * 2, h: TILE * 0.5,
      keyItem: 'dungeon_key',
      label: 'Locked door (needs Throne Key)',
    });

    // ── Aldric's name — lore interactable ──
    const aldricWall = this.add.rectangle(10 * TILE, 12 * TILE, 24, 20, 0x383040, 0.6);
    aldricWall.setStrokeStyle(1, 0x282030);
    aldricWall.setDepth(6);
    this.spawnInteractable({
      sprite: aldricWall as any,
      label: 'Read carved name',
      radius: 22,
      action: () => {
        useLoreStore.getState().discover({
          key: 'aldric-name-hall',
          title: 'Aldric',
          text: 'You find a name you recognize: ALDRIC. The letters are deep, carved with a steady hand. Beside it, a single word: SORRY.',
          location: 'The Hall of Names',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'You find a name you recognize: ALDRIC. The letters are deep, carved with a steady hand. Beside it, a single word: SORRY.',
        }));
      },
    });

    // ── Name walls (decorative carved text) ──
    const namePositions = [
      { x: 6 * TILE, y: 5 * TILE }, { x: 18 * TILE, y: 5 * TILE },
      { x: 6 * TILE, y: 16 * TILE }, { x: 22 * TILE, y: 16 * TILE },
    ];
    for (const np of namePositions) {
      const nameWall = this.add.rectangle(np.x, np.y, 20, 16, 0x383038, 0.4);
      nameWall.setStrokeStyle(1, 0x282028);
      nameWall.setDepth(5);
      // Tiny etched lines representing carved names
      for (let i = 0; i < 4; i++) {
        this.add.rectangle(np.x, np.y - 4 + i * 3, 14, 1, 0x484840, 0.3).setDepth(5);
      }
    }

    // ── Ancient Coin #12 — Hall of Names, the final coin ──
    this.spawnAncientCoin({
      x: 20 * TILE, y: 8 * TILE,
      coinId: 'coin_throne', inscription: 'Twelve. The last. The one that completes the circle.',
    });

    // ── Chest ──
    this.spawnChest({
      x: 4 * TILE, y: 18 * TILE,
      loot: [
        { itemKey: 'health_potion', qty: 2 },
        { itemKey: 'mana_potion', qty: 2 },
        { itemKey: 'troll_heart', qty: 1 },
      ],
      gold: 60,
    });

    // ── Traps ──
    this.spawnTrap({ x: 14 * TILE, y: 10 * TILE, damage: 8 });
    this.spawnTrap({ x: 8 * TILE, y: 14 * TILE, damage: 10 });

    // ── Watcher ──
    this.spawnWatcher(26 * TILE, 12 * TILE);

    // ── Exits ──
    this.addExit({
      x: 14 * TILE, y: 0,
      w: TILE * 2, h: TILE,
      targetScene: 'ThroneBeneathF1Scene',
      targetSpawn: 'fromF2',
      label: '\u25B2 The Descent',
    });

    this.addExit({
      x: 14 * TILE, y: 20 * TILE,
      w: TILE * 2, h: TILE * 2,
      targetScene: 'ThroneBeneathF3Scene',
      targetSpawn: 'fromF2',
      label: '\u25BC The Forgotten Throne',
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromF1':
      case 'default':
        return { x: 15 * TILE, y: 2 * TILE };
      case 'fromF3':
        return { x: 15 * TILE, y: 19 * TILE };
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
    if (y >= MAP_H - 1 && x >= 14 && x <= 15) return T.FLOOR_STONE;
    return T.WALL_STONE;
  }

  // Large central hall
  if (x >= 4 && x <= 26 && y >= 3 && y <= 18) return T.FLOOR_STONE;

  // Entry/exit corridors
  if (x >= 14 && x <= 15 && y >= 1 && y <= 3) return T.FLOOR_STONE;
  if (x >= 14 && x <= 15 && y >= 18 && y <= 21) return T.FLOOR_STONE;

  // Pillar walls (internal structure)
  if ((x === 8 || x === 22) && (y === 6 || y === 10 || y === 15)) return T.WALL_STONE;
  if ((x === 9 || x === 21) && (y === 6 || y === 10 || y === 15)) return T.WALL_STONE;

  // Blood stone patches
  if (x >= 12 && x <= 14 && y >= 11 && y <= 13) return T.BLOOD_STONE;

  // Chains
  if (x >= 16 && x <= 17 && y >= 8 && y <= 9) return T.CHAINS;

  return T.WALL_STONE;
}
