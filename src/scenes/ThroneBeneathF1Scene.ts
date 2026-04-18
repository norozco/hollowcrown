import { useQuestStore } from '../state/questStore';
import { useLoreStore } from '../state/loreStore';
import { BaseWorldScene, TILE } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * The Throne Beneath — Floor 1: The Descent.
 * Spiraling staircase into the earth. Walls covered in ancient murals.
 * Mix of ALL dungeon tile types — the culmination.
 * 30x22 map.
 */

const MAP_W = 30;
const MAP_H = 22;

const SOLID_TILES = new Set<number>([T.WALL_STONE, T.LAVA]);

export class ThroneBeneathF1Scene extends BaseWorldScene {
  constructor() {
    super({ key: 'ThroneBeneathF1Scene' });
  }

  protected getZoneName(): string | null { return 'The Descent'; }

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

    // Dark room
    this.setDarkRoom(true);

    // ── Enemies ──
    this.spawnEnemy({ monsterKey: 'ember_knight', x: 8 * TILE, y: 8 * TILE });
    this.spawnEnemy({ monsterKey: 'ember_knight', x: 20 * TILE, y: 14 * TILE });
    this.spawnEnemy({ monsterKey: 'hollow_knight', x: 14 * TILE, y: 10 * TILE });
    this.spawnEnemy({ monsterKey: 'hollow_knight', x: 24 * TILE, y: 6 * TILE });
    this.spawnEnemy({ monsterKey: 'wraith', x: 10 * TILE, y: 16 * TILE });

    // ── Traps ──
    this.spawnTrap({ x: 12 * TILE, y: 7 * TILE, damage: 8 });
    this.spawnTrap({ x: 18 * TILE, y: 12 * TILE, damage: 8 });
    this.spawnTrap({ x: 22 * TILE, y: 17 * TILE, damage: 10 });

    // ── Chest ──
    this.spawnChest({
      x: 26 * TILE, y: 4 * TILE,
      loot: [
        { itemKey: 'health_potion', qty: 3 },
        { itemKey: 'mana_potion', qty: 2 },
        { itemKey: 'shadow_essence', qty: 2 },
      ],
      gold: 80,
    });

    // ── Breakable wall (hidden room with extra loot) ──
    this.spawnBreakableWall({
      x: 4 * TILE, y: 14 * TILE, w: TILE, h: TILE * 2,
      onBreak: () => {
        this.spawnChest({
          x: 3 * TILE, y: 15 * TILE,
          loot: [{ itemKey: 'troll_heart', qty: 2 }, { itemKey: 'shadow_essence', qty: 1 }],
          gold: 60,
        });
      },
    });

    // ── Watcher ──
    this.spawnWatcher(6 * TILE, 4 * TILE);

    // ── Mural lore ──
    const mural = this.add.rectangle(16 * TILE, 3 * TILE, 24, 20, 0x383040, 0.6);
    mural.setStrokeStyle(1, 0x282030);
    mural.setDepth(6);
    this.spawnInteractable({
      sprite: mural as any,
      label: 'Examine mural',
      radius: 22,
      action: () => {
        useLoreStore.getState().discover({
          key: 'descent-mural',
          title: 'The Descent Mural',
          text: 'Painted figures descend a spiral staircase. At the bottom, a throne. On the throne, nothing. The nothing has a shape.',
          location: 'The Descent',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'Painted figures descend a spiral staircase. At the bottom, a throne. On the throne, nothing. The nothing has a shape.',
        }));
      },
    });

    // Complete quest objective
    const qs = useQuestStore.getState();
    if (qs.active['the-crownless-one'] && !qs.active['the-crownless-one'].completedObjectiveIds.includes('enter-throne-beneath')) {
      qs.completeObjective('the-crownless-one', 'enter-throne-beneath');
      window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'You descend into the Throne Beneath.' }));
    }

    // ── Exits ──
    // Up -> Shattered Coast
    this.addExit({
      x: 14 * TILE, y: 0,
      w: TILE * 2, h: TILE,
      targetScene: 'ShatteredCoastScene',
      targetSpawn: 'fromThrone',
      label: '\u25B2 The Shattered Coast',
    });

    // Down -> Floor 2
    this.addExit({
      x: 14 * TILE, y: 20 * TILE,
      w: TILE * 2, h: TILE * 2,
      targetScene: 'ThroneBeneathF2Scene',
      targetSpawn: 'fromF1',
      label: '\u25BC Hall of Names',
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromCoast':
      case 'default':
        return { x: 15 * TILE, y: 2 * TILE };
      case 'fromF2':
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
    // Entrance gap top
    if (y <= 0 && x >= 14 && x <= 15) return T.FLOOR_STONE;
    // Exit gap bottom
    if (y >= MAP_H - 1 && x >= 14 && x <= 15) return T.FLOOR_STONE;
    return T.WALL_STONE;
  }

  // Main spiraling corridor
  // Top corridor (east)
  if (y >= 2 && y <= 4 && x >= 4 && x <= 26) return T.FLOOR_CRACKED;
  // Right corridor (down)
  if (x >= 24 && x <= 26 && y >= 4 && y <= 10) return T.FLOOR_STONE;
  // Middle corridor (west)
  if (y >= 8 && y <= 10 && x >= 6 && x <= 26) return T.FLOOR_CRACKED;
  // Left corridor (down)
  if (x >= 4 && x <= 6 && y >= 10 && y <= 18) return T.FLOOR_STONE;
  // Bottom corridor (east to exit)
  if (y >= 16 && y <= 18 && x >= 6 && x <= 26) return T.FLOOR_CRACKED;
  // Right corridor to exit
  if (x >= 12 && x <= 16 && y >= 18 && y <= 21) return T.FLOOR_STONE;

  // Lava accents
  if (x >= 10 && x <= 12 && y >= 12 && y <= 14) return T.LAVA;
  if (x >= 20 && x <= 22 && y >= 5 && y <= 6) return T.LAVA;

  // Blood stone patches
  if (x >= 14 && x <= 16 && y >= 5 && y <= 7) return T.BLOOD_STONE;
  if (x >= 8 && x <= 10 && y >= 16 && y <= 17) return T.BLOOD_STONE;

  // Chains decorative
  if (x >= 18 && x <= 19 && y >= 12 && y <= 13) return T.CHAINS;

  return T.WALL_STONE;
}
