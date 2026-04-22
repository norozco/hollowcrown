import * as Phaser from 'phaser';
import { useInventoryStore } from '../state/inventoryStore';
import { useLoreStore } from '../state/loreStore';
import { useDungeonItemStore } from '../state/dungeonItemStore';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Mossbarrow Depths — Floor 2. Wraith-haunted catacombs with
 * sarcophagi, chains, bones, and spectral energy. Two chambers
 * connected by a blood-stained narrow passage.
 */

const MAP_W = 30;
const MAP_H = 22;

/** Tiles the player cannot walk through */
const SOLID_TILES = new Set([T.WALL_STONE, T.CHAINS]);

export class DepthsFloor2Scene extends BaseWorldScene {
  constructor() {
    super({ key: 'DepthsFloor2Scene' });
  }

  protected getZoneName(): string | null { return 'The Catacombs'; }

  protected layout(): void {
    // Mark this floor as a dark room — requires the Cairn Lantern to see fully.
    this.setDarkRoom(true);

    generateTileset(this);

    const map = this.make.tilemap({
      data: buildMapData(),
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tileset')!;
    map.createLayer(0, tileset)!;

    // Wall + solid collision
    for (const [tx, ty] of getSolidPositions()) {
      const w = this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
      this.physics.add.existing(w, true);
      this.walls.add(w);
    }

    // Zone label
    this.add.text(WORLD_W / 2, 2 * TILE, 'THE CATACOMBS', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#404068',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);

    // ── Blue torches (more numerous for spectral atmosphere) ──
    for (const [tx, ty] of [
      [4, 1], [15, 1], [4, 4], [15, 4], [4, 7], [15, 7],
      [8, 8], [12, 8], [8, 11], [12, 11],
      [4, 13], [15, 13], [4, 16], [15, 16], [4, 19], [15, 19],
    ] as [number, number][]) {
      this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 22, 22, 0x4060ff, 0.16).setDepth(4);
    }

    // ── Sarcophagus shapes in north chamber ──
    for (const [sx, sy] of [[5, 3], [13, 3]] as [number, number][]) {
      // Sarcophagus body (grey stone)
      const sarcBody = this.add.rectangle(sx * TILE + TILE, sy * TILE + TILE / 2, TILE * 1.8, TILE * 0.8, 0x606068);
      sarcBody.setStrokeStyle(2, 0x808090).setDepth(5);
      // Gold trim on lid
      this.add.rectangle(sx * TILE + TILE, sy * TILE + TILE / 2 - 2, TILE * 1.6, 4, 0xc09838, 0.7).setDepth(5);
      // Cross symbol on lid
      this.add.rectangle(sx * TILE + TILE, sy * TILE + TILE / 2, 2, 12, 0xa08030, 0.6).setDepth(5);
      this.add.rectangle(sx * TILE + TILE, sy * TILE + TILE / 2 - 2, 8, 2, 0xa08030, 0.6).setDepth(5);
    }

    // ── Sarcophagus in south chamber ──
    for (const [sx, sy] of [[5, 15], [13, 15]] as [number, number][]) {
      const sarcBody = this.add.rectangle(sx * TILE + TILE, sy * TILE + TILE / 2, TILE * 1.8, TILE * 0.8, 0x585060);
      sarcBody.setStrokeStyle(2, 0x707080).setDepth(5);
      this.add.rectangle(sx * TILE + TILE, sy * TILE + TILE / 2 - 2, TILE * 1.6, 4, 0xb08830, 0.6).setDepth(5);
    }

    // ── Floating spectral wisps (blue-white circles with tweened movement) ──
    for (const [wx, wy] of [[7, 2], [12, 5], [10, 10], [6, 17], [13, 14], [9, 19]] as [number, number][]) {
      const wisp = this.add.circle(wx * TILE + TILE / 2, wy * TILE + TILE / 2, 4, 0x80a0ff, 0.3).setDepth(7);
      this.tweens.add({
        targets: wisp,
        x: wisp.x + Phaser.Math.Between(-20, 20),
        y: wisp.y + Phaser.Math.Between(-16, 16),
        alpha: { from: 0.15, to: 0.45 },
        duration: 2000 + Math.random() * 1500,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // ── Coffin alcoves (dark recessed rectangles along walls) ──
    // North chamber side alcoves
    for (const cy of [2, 5]) {
      this.add.rectangle(4 * TILE + 4, cy * TILE + TILE / 2, 10, 24, 0x181820, 0.8).setDepth(2);
      this.add.rectangle(15 * TILE + TILE - 4, cy * TILE + TILE / 2, 10, 24, 0x181820, 0.8).setDepth(2);
    }
    // South chamber side alcoves
    for (const cy of [14, 17]) {
      this.add.rectangle(4 * TILE + 4, cy * TILE + TILE / 2, 10, 24, 0x181820, 0.8).setDepth(2);
      this.add.rectangle(15 * TILE + TILE - 4, cy * TILE + TILE / 2, 10, 24, 0x181820, 0.8).setDepth(2);
    }

    // ── Candelabras with blue flame ──
    for (const [cx, cy] of [[6, 1], [13, 1], [6, 12], [13, 12]] as [number, number][]) {
      // Base
      this.add.rectangle(cx * TILE + TILE / 2, cy * TILE + TILE - 4, 12, 6, 0x606068).setDepth(5);
      // Stem
      this.add.rectangle(cx * TILE + TILE / 2, cy * TILE + TILE / 2, 3, 16, 0x707078).setDepth(5);
      // Blue flames (3 candles)
      for (const off of [-6, 0, 6]) {
        this.add.circle(cx * TILE + TILE / 2 + off, cy * TILE + 4, 3, 0x4080ff, 0.8).setDepth(6);
        this.add.circle(cx * TILE + TILE / 2 + off, cy * TILE + 2, 2, 0x80c0ff, 0.6).setDepth(6);
      }
    }

    // ── Skull piles near the corridor entrance ──
    for (const [sx, sy] of [[8, 7], [12, 7], [8, 12], [12, 12]] as [number, number][]) {
      this.add.circle(sx * TILE + TILE / 2, sy * TILE + TILE / 2, 5, 0xd0c8b0, 0.6).setDepth(5);
      this.add.circle(sx * TILE + TILE / 2 + 6, sy * TILE + TILE / 2 + 2, 4, 0xc8c0a8, 0.5).setDepth(5);
      this.add.circle(sx * TILE + TILE / 2 - 4, sy * TILE + TILE / 2 + 3, 3, 0xc0b8a0, 0.4).setDepth(5);
    }

    // ── Material pickups ──
    // Moonpetal patch 1 — damp corner in north chamber (walkable at 5,6)
    const moonpetal1 = this.add.circle(5 * TILE + TILE / 2, 6 * TILE + TILE / 2, 7, 0x40a848);
    moonpetal1.setStrokeStyle(2, 0x8040c0);
    moonpetal1.setDepth(6);
    this.spawnInteractable({
      sprite: moonpetal1 as any, label: 'Gather moonpetal', radius: 20,
      action: () => {
        this.spawnPickupParticles(moonpetal1.x, moonpetal1.y, 0x60c060);
        useInventoryStore.getState().addItem('moonpetal');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found moonpetal!' }));
        moonpetal1.destroy();
      },
    });

    // Moonpetal patch 2 — damp corner in south chamber (walkable at 14,19)
    const moonpetal2 = this.add.circle(14 * TILE + TILE / 2, 19 * TILE + TILE / 2, 7, 0x40a848);
    moonpetal2.setStrokeStyle(2, 0x8040c0);
    moonpetal2.setDepth(6);
    this.spawnInteractable({
      sprite: moonpetal2 as any, label: 'Gather moonpetal', radius: 20,
      action: () => {
        this.spawnPickupParticles(moonpetal2.x, moonpetal2.y, 0x60c060);
        useInventoryStore.getState().addItem('moonpetal');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found moonpetal!' }));
        moonpetal2.destroy();
      },
    });

    // Shadow essence — glowing purple orb near north sarcophagus (walkable at 7,3)
    const shadowEssence = this.add.circle(7 * TILE + TILE / 2, 3 * TILE + TILE / 2, 7, 0x8040c0);
    shadowEssence.setStrokeStyle(2, 0x6030a0);
    shadowEssence.setDepth(6);
    this.spawnInteractable({
      sprite: shadowEssence as any, label: 'Collect shadow essence', radius: 20,
      action: () => {
        this.spawnPickupParticles(shadowEssence.x, shadowEssence.y, 0x60c060);
        useInventoryStore.getState().addItem('shadow_essence');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found shadow essence!' }));
        shadowEssence.destroy();
      },
    });

    // Bone shard pile — south chamber (walkable at 8,16)
    const boneShard = this.add.circle(8 * TILE + TILE / 2, 16 * TILE + TILE / 2, 7, 0xd0c8a0);
    boneShard.setStrokeStyle(2, 0xa09878);
    boneShard.setDepth(6);
    this.spawnInteractable({
      sprite: boneShard as any, label: 'Pick up bone shard', radius: 20,
      action: () => {
        this.spawnPickupParticles(boneShard.x, boneShard.y, 0x60c060);
        useInventoryStore.getState().addItem('bone_shard');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found bone shard!' }));
        boneShard.destroy();
      },
    });

    // ── Lore interactable ──
    // Open sarcophagus lid — south chamber sarcophagus, lid pushed aside
    const sarcLid = this.add.circle(6 * TILE + TILE / 2, 14 * TILE + TILE / 2, 5, 0xa09878, 0.6);
    sarcLid.setDepth(6);
    this.spawnInteractable({
      sprite: sarcLid as any,
      label: 'Examine sarcophagus',
      radius: 20,
      action: () => {
        useLoreStore.getState().discover({
          key: 'sarcophagus-depths-f2',
          title: 'Empty Sarcophagus',
          text: 'The lid is pushed aside. Whatever was inside left on its own.',
          location: 'Mossbarrow Depths — Floor 2',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'The lid is pushed aside. Whatever was inside left on its own.',
        }));
      },
    });

    // Enemies — wraiths and spiders (positions on walkable floor tiles)
    this.spawnEnemy({ monsterKey: 'spider', x: 8 * TILE, y: 4 * TILE });
    this.spawnEnemy({ monsterKey: 'wraith', x: 11 * TILE, y: 5 * TILE });
    this.spawnEnemy({ monsterKey: 'spider', x: 10 * TILE, y: 10 * TILE });
    this.spawnEnemy({ monsterKey: 'wraith', x: 7 * TILE, y: 16 * TILE });
    this.spawnEnemy({ monsterKey: 'wraith', x: 12 * TILE, y: 17 * TILE });

    // ── The Watcher ──
    this.spawnWatcher(12 * TILE, 3 * TILE);

    // ── EXIT UP → Floor 1 (top-center) ──
    this.addExit({
      x: 7 * TILE, y: 0, w: 5 * TILE, h: TILE,
      targetScene: 'MossbarrowDepthsScene', targetSpawn: 'fromFloor2',
      label: '↑ Floor 1',
    });
    this.add.rectangle(9.5 * TILE, 1.2 * TILE, 120, 36, 0x202028).setStrokeStyle(2, 0x404050).setDepth(3);
    this.add.text(9.5 * TILE, 1.2 * TILE, '▲ Floor 1', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#8888aa',
    }).setOrigin(0.5).setDepth(4);

    // ── Spike traps in the corridor ──
    this.spawnTrap({ x: 9 * TILE + TILE / 2, y: 9 * TILE, damage: 4 });
    this.spawnTrap({ x: 11 * TILE, y: 10 * TILE, damage: 4 });
    this.spawnTrap({ x: 10 * TILE, y: 11 * TILE + TILE / 2, damage: 4 });

    // ── Guaranteed boss key — hidden near the sealed gate.
    //    Ensures the player is never softlocked if wraiths drop nothing.
    const keyPickup2 = this.add.rectangle(6 * TILE + TILE / 2, 17 * TILE + TILE / 2, 10, 10, 0x8040c0);
    keyPickup2.setStrokeStyle(1, 0x602090);
    keyPickup2.setDepth(6);
    this.spawnInteractable({
      sprite: keyPickup2 as any, label: 'Warden key', radius: 20,
      action: () => {
        useInventoryStore.getState().addItem('boss_key');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found the warden key!' }));
        keyPickup2.destroy();
      },
    });

    // ── Locked door before stairs to Floor 3 (requires Warden Key from wraiths) ──
    // Door spans the full south chamber width (cols 4-15 = 12 tiles)
    this.spawnLockedDoor({
      x: 4 * TILE, y: 18 * TILE, w: 12 * TILE, h: TILE,
      keyItem: 'boss_key', label: 'Sealed gate',
    });

    // ── Treasure chest in north chamber ──
    this.spawnChest({
      x: 14 * TILE + TILE / 2, y: 4 * TILE + TILE / 2,
      loot: [{ itemKey: 'mana_potion', qty: 2 }, { itemKey: 'moonpetal' }],
      gold: 20,
    });

    // ── Treasure chest in south chamber ──
    this.spawnChest({
      x: 6 * TILE + TILE / 2, y: 16 * TILE + TILE / 2,
      loot: [{ itemKey: 'shadow_essence' }, { itemKey: 'bone_shard', qty: 2 }],
    });

    // ── EXIT DOWN → Floor 3 (bottom-center, wide) ──
    this.addExit({
      x: 7 * TILE, y: 19 * TILE, w: 5 * TILE, h: 2 * TILE,
      targetScene: 'DepthsFloor3Scene', targetSpawn: 'fromFloor2',
      label: '▼ Floor 3',
    });
    const stairX = 9.5 * TILE;
    const stairY = 19.5 * TILE;
    this.add.rectangle(stairX, stairY, 140, 52, 0x10101a).setStrokeStyle(2, 0x402040).setDepth(3);
    this.add.text(stairX, stairY - 8, '▼ Stairs Down', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#a04080',
    }).setOrigin(0.5).setDepth(4);
    this.add.text(stairX, stairY + 10, 'Boss Floor', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#803060',
    }).setOrigin(0.5).setDepth(4);

    // ── Random loot bag ──
    this.spawnLootBag({
      x: 13 * TILE, y: 5 * TILE,
      loot: [{ itemKey: 'mana_potion', weight: 3 }, { itemKey: 'shadow_essence', weight: 2 }, { itemKey: 'wraith_dust', weight: 1 }],
      gold: 15, spawnChance: 0.2,
    });

    // ── Torch puzzle — light all 3 to spawn a reward chest ──
    this.spawnTorch({ id: 'f2-torch-a', x: 6 * TILE, y: 10 * TILE });
    this.spawnTorch({ id: 'f2-torch-b', x: 14 * TILE, y: 10 * TILE });
    this.spawnTorch({ id: 'f2-torch-c', x: 10 * TILE, y: 6 * TILE });
    this.registerTorchPuzzle(
      ['f2-torch-a', 'f2-torch-b', 'f2-torch-c'],
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'The three flames join. Stone grinds, and a hidden cache opens.',
        }));
        this.spawnChest({
          x: 10 * TILE, y: 10 * TILE,
          loot: [{ itemKey: 'mana_potion', qty: 2 }, { itemKey: 'shadow_essence', qty: 2 }],
          gold: 40,
        });
      },
    );

    // ── Shade encounters (lightVulnerable — the Lantern hurts them) ──
    this.spawnEnemy({ monsterKey: 'shade', x: 7 * TILE, y: 8 * TILE });
    this.spawnEnemy({ monsterKey: 'shade', x: 13 * TILE, y: 14 * TILE });

    // ── Breakable wall (south chamber west side) → hidden shadow_essence x3 ──
    this.spawnBreakableWall({
      x: 4 * TILE, y: 15 * TILE, w: TILE, h: TILE * 2,
      onBreak: () => {
        useInventoryStore.getState().addItem('shadow_essence', 3);
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found shadow essence x3!' }));
      },
    });

    // ── Silver ore veins (F2 is deeper — uncommon drops) ──
    this.spawnOreVein({ x: 14 * TILE + TILE / 2, y: 2 * TILE + TILE / 2, oreType: 'silver' });
    this.spawnOreVein({ x: 5 * TILE + TILE / 2, y: 17 * TILE + TILE / 2, oreType: 'silver' });

    // ── Cracked wall (alt to hollow walls — always visible, needs pickaxe) ──
    // Hides a small loot cache in the south chamber.
    this.spawnCrackedWall({
      x: 15 * TILE, y: 16 * TILE, w: TILE, h: TILE,
      onBreak: () => {
        this.spawnChest({
          x: 16 * TILE + TILE / 2, y: 16 * TILE + TILE / 2,
          loot: [{ itemKey: 'wraith_dust', qty: 2 }, { itemKey: 'mana_potion', qty: 1 }],
          gold: 25,
        });
      },
    });

    // ── Pickaxe chest — drops after the Wraith Captain (a wraith enemy
    //    killed on this floor). The 2nd dungeon floor's reward: the
    //    Miner's Pickaxe, with grey-silver trim to distinguish it from
    //    the Echo Stone's cyan chest.
    if (!useDungeonItemStore.getState().has('pickaxe')) {
      const pickChest = this.add.rectangle(14 * TILE, 17 * TILE + TILE / 2, 28, 22, 0x585c68);
      pickChest.setStrokeStyle(2, 0xc0c8d0);
      pickChest.setDepth(8);
      // Silver shimmer aura
      this.add.circle(14 * TILE, 17 * TILE + TILE / 2, 20, 0xd0d8e0, 0.1).setDepth(7);
      this.tweens.add({ targets: pickChest, scale: 1.06, duration: 900, yoyo: true, repeat: -1 });

      this.spawnInteractable({
        sprite: pickChest as any, label: 'Open grey-silver chest', radius: 28,
        action: () => {
          useDungeonItemStore.getState().acquire('pickaxe');
          window.dispatchEvent(new CustomEvent('gameMessage', {
            detail: 'You found the PICKAXE! Press R near cracked rock or ore to mine. Hidden paths await in the stone.',
          }));
          pickChest.destroy();
        },
      });
    }
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
const BN = T.BONES;
const CH = T.CHAINS;
const BS = T.BLOOD_STONE;
const WT = T.WATER;

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
 * Floor 2: Wraith Catacombs — two chambers connected by a narrow,
 * blood-stained corridor. Bones on floors, chains on walls,
 * stagnant water pools.
 */
function tileAt(x: number, y: number): number {
  // Stair openings
  if (inRect(x, y, 7, 0, 5, 1)) return FC;
  if (inRect(x, y, 7, 21, 5, 1)) return FC;

  // ── North chamber (cols 4-15, rows 1-7) ──
  if (inRect(x, y, 4, 1, 12, 7)) {
    // Chains on the north wall edge
    if (y === 1 && (x === 4 || x === 15)) return CH;
    // Bones scattered on the floor
    if ((x === 6 && y === 4) || (x === 10 && y === 6) || (x === 14 && y === 3)) return BN;
    // Stagnant water pool in corner
    if (inRect(x, y, 13, 5, 2, 2)) return WT;
    return FC;
  }

  // ── Connecting corridor (cols 8-12, rows 8-11) — blood-stained ──
  if (inRect(x, y, 8, 8, 5, 4)) {
    // Blood stone through the passage (something terrible happened)
    if (inRect(x, y, 9, 9, 3, 2)) return BS;
    return FC;
  }

  // ── South chamber (cols 4-15, rows 12-20) ──
  if (inRect(x, y, 4, 12, 12, 9)) {
    // Chains on the south wall edge
    if (y === 20 && (x === 4 || x === 15)) return CH;
    if (y === 12 && (x === 4 || x === 15)) return CH;
    // Bones scattered
    if ((x === 5 && y === 14) || (x === 9 && y === 18) || (x === 14 && y === 16) || (x === 7 && y === 19)) return BN;
    // Blood stains near passage entrance
    if (x === 10 && y === 12) return BS;
    if (x === 11 && y === 13) return BS;
    // Stagnant water pool
    if (inRect(x, y, 5, 18, 2, 2)) return WT;
    return FC;
  }

  return WS;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
