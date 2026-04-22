import { useInventoryStore } from '../state/inventoryStore';
import { useLoreStore } from '../state/loreStore';
import { BaseWorldScene, TILE, WORLD_W } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Frozen Hollow — Floor 2: The Frost Vault.
 * Ancient vault frozen in time. Ice-covered display cases, frozen statues.
 * 30x22 map.
 */

const MAP_W = 30;
const MAP_H = 22;

const SOLID_TILES = new Set<number>([T.WALL_STONE, T.WATER]);

export class FrozenHollowF2Scene extends BaseWorldScene {
  constructor() {
    super({ key: 'FrozenHollowF2Scene' });
  }

  protected getZoneName(): string | null { return 'The Frost Vault'; }

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
    this.add.text(WORLD_W / 2, 2 * TILE, 'THE FROST VAULT', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#6080a0',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);

    // ── Blue torches ──
    for (const [tx, ty] of [
      [5, 3], [14, 3], [5, 8], [14, 8], [5, 14], [14, 14], [5, 19], [14, 19],
    ] as [number, number][]) {
      const glow = this.add.circle(tx * TILE, ty * TILE, 18, 0x6080c0, 0.08).setDepth(4);
      this.tweens.add({ targets: glow, alpha: 0.03, scale: 1.2, duration: 2200, yoyo: true, repeat: -1 });
      this.add.circle(tx * TILE, ty * TILE, 3, 0x8098c0, 0.5).setDepth(5);
    }

    // ── Frozen display cases (visual) ──
    for (const [dx, dy] of [[6, 5], [13, 5], [6, 12], [13, 12]] as [number, number][]) {
      this.add.rectangle(dx * TILE, dy * TILE, 24, 28, 0x405868, 0.5).setStrokeStyle(1, 0x80a0c0).setDepth(5);
      // Ice coating
      this.add.rectangle(dx * TILE, dy * TILE, 20, 24, 0x90b8d0, 0.15).setDepth(6);
    }

    // ── Frozen statue (visual centerpiece) ──
    const statX = 10 * TILE;
    const statY = 10 * TILE;
    this.add.rectangle(statX, statY, 16, 32, 0x506878).setStrokeStyle(1, 0x80a0b8).setDepth(5);
    this.add.rectangle(statX, statY - 14, 12, 8, 0x607888).setDepth(5); // head
    const statGlow = this.add.circle(statX, statY, 24, 0x80a0c0, 0.06).setDepth(4);
    this.tweens.add({ targets: statGlow, alpha: 0.02, scale: 1.3, duration: 2500, yoyo: true, repeat: -1 });

    // ── Enemies ──
    this.spawnEnemy({ monsterKey: 'ice_golem', x: 7 * TILE, y: 8 * TILE });
    this.spawnEnemy({ monsterKey: 'ice_golem', x: 12 * TILE, y: 15 * TILE });
    this.spawnEnemy({ monsterKey: 'frost_warden', x: 10 * TILE, y: 17 * TILE });
    this.spawnEnemy({ monsterKey: 'blizzard_wraith', x: 8 * TILE, y: 12 * TILE });

    // ── Spike traps (8 damage) ──
    this.spawnTrap({ x: 8 * TILE, y: 6 * TILE, damage: 8 });
    this.spawnTrap({ x: 11 * TILE, y: 14 * TILE, damage: 8 });

    // ── Locked door (needs frost_key) ──
    const doorX = 10 * TILE;
    const doorY = 16 * TILE;
    const inventory = useInventoryStore.getState();
    const hasFrostKey = inventory.slots.some((s) => s.item.key === 'frost_key');
    if (!hasFrostKey) {
      const lockedDoor = this.add.rectangle(doorX, doorY, TILE * 3, TILE, 0x304050);
      lockedDoor.setStrokeStyle(2, 0x6080a0);
      lockedDoor.setDepth(8);
      this.physics.add.existing(lockedDoor, true);
      this.walls.add(lockedDoor);
      this.add.text(doorX, doorY, 'LOCKED', {
        fontFamily: 'Courier New', fontSize: '9px', color: '#80a0c0',
      }).setOrigin(0.5).setDepth(9);
      this.spawnInteractable({
        sprite: lockedDoor as any,
        label: 'Use Frost Key',
        radius: 28,
        action: () => {
          const inv = useInventoryStore.getState();
          const hasKey = inv.slots.some((s) => s.item.key === 'frost_key');
          if (hasKey) {
            inv.removeItem('frost_key');
            lockedDoor.destroy();
            window.dispatchEvent(new CustomEvent('gameMessage', {
              detail: 'The Frost Key shatters in the lock. The door groans open.',
            }));
          } else {
            window.dispatchEvent(new CustomEvent('gameMessage', {
              detail: 'Sealed by ice. A key of frost might open it.',
            }));
          }
        },
      });
    }

    // ── Treasure chest (past locked door) ──
    this.spawnChest({
      x: 10 * TILE, y: 18 * TILE,
      loot: [{ itemKey: 'health_potion', qty: 2 }, { itemKey: 'shadow_essence' }, { itemKey: 'troll_heart' }],
      gold: 40,
    });

    // ── Lore: vault inscription ──
    const inscrX = 10 * TILE;
    const inscrY = 4 * TILE;
    const inscr = this.add.rectangle(inscrX, inscrY, 28, 16, 0x506070, 0.6);
    inscr.setDepth(6);
    this.spawnInteractable({
      sprite: inscr as any,
      label: 'Read inscription',
      radius: 20,
      action: () => {
        useLoreStore.getState().discover({
          key: 'vault-inscription-frosthollow',
          title: 'Vault Inscription',
          text: 'We sealed the fire below the ice. May winter hold it forever. — Last entry, undated.',
          location: 'Frost Vault',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: '"We sealed the fire below the ice. May winter hold it forever."',
        }));
      },
    });

    // ── The Watcher ──
    this.spawnWatcher(12 * TILE, 3 * TILE);

    // ── Ice wall blocking shortcut / hidden room ──
    this.spawnIceWall({
      x: 14 * TILE, y: 10 * TILE, w: TILE, h: TILE * 2,
      onMelt: () => {
        this.spawnChest({
          x: 15 * TILE, y: 11 * TILE,
          loot: [{ itemKey: 'health_potion', qty: 3 }, { itemKey: 'shadow_essence' }],
          gold: 30,
        });
        this.spawnHeartPiece(16 * TILE, 11 * TILE);
      },
    });

    // ── EXIT UP → Floor 1 ──
    this.addExit({
      x: 7 * TILE, y: 0, w: 5 * TILE, h: TILE,
      targetScene: 'FrozenHollowF1Scene', targetSpawn: 'fromFloor2',
      label: '\u2191 The Ice Caverns',
    });
    this.add.rectangle(9.5 * TILE, 1.2 * TILE, 140, 36, 0x101820).setStrokeStyle(2, 0x405060).setDepth(3);
    this.add.text(9.5 * TILE, 1.2 * TILE, '\u25B2 Floor 1', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#6080a0',
    }).setOrigin(0.5).setDepth(4);

    // ── EXIT DOWN → Floor 3 ──
    this.addExit({
      x: 7 * TILE, y: 19 * TILE, w: 5 * TILE, h: 2 * TILE,
      targetScene: 'FrozenHollowF3Scene', targetSpawn: 'fromFloor2',
      label: '\u25BC Floor 3',
    });
    const stairX = 9.5 * TILE;
    const stairY = 19.5 * TILE;
    this.add.rectangle(stairX, stairY, 140, 52, 0x081018).setStrokeStyle(2, 0x304858).setDepth(3);
    this.add.text(stairX, stairY - 8, '\u25BC Stairs Down', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#6080a0',
    }).setOrigin(0.5).setDepth(4);
    this.add.text(stairX, stairY + 10, 'The Heart of Winter', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#405868',
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
  if (x <= 3 || x >= 16) return WS;

  // Frozen pools
  if (x >= 6 && x <= 7 && y >= 8 && y <= 9) return WA;
  if (x >= 12 && x <= 13 && y >= 6 && y <= 7) return WA;

  // Icy patches
  if ((x + y) % 6 === 0) return FC;

  return FS;
}
