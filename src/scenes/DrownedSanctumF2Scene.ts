import * as Phaser from 'phaser';
import { useInventoryStore } from '../state/inventoryStore';
import { useDungeonItemStore } from '../state/dungeonItemStore';
import { BaseWorldScene, TILE, WORLD_W } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Drowned Sanctum — Floor 2: The Sanctum Heart. An ancient chamber,
 * partially flooded, with a massive stone altar at the center. Veyrin
 * crouches beside it. No exit down — this is the deepest point.
 *
 * Atmospheric purple/blue lighting. Two hollow knights still serve
 * as wardens. The altar pulses with a low hum.
 *
 * Map: 30 tiles wide x 22 tiles tall.
 */

const MAP_W = 30;
const MAP_H = 22;

/** Tiles the player cannot walk through */
const SOLID_TILES = new Set<number>([T.WALL_STONE, T.WATER, T.CHAINS]);

export class DrownedSanctumF2Scene extends BaseWorldScene {
  constructor() {
    super({ key: 'DrownedSanctumF2Scene' });
  }

  protected getZoneName(): string | null { return 'The Sanctum Heart'; }

  protected layout(): void {
    generateTileset(this);
    // Deepest point of the sanctum — the whole chamber is submerged.
    // Adds rising bubble particles + a subtle blue tint overlay.
    this.setUnderwater(true);

    const map = this.make.tilemap({
      data: buildMapData(),
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tileset')!;
    map.createLayer(0, tileset)!;

    // Wall + water collision
    for (const [tx, ty] of getSolidPositions()) {
      const w = this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
      this.physics.add.existing(w, true);
      this.walls.add(w);
    }

    // Zone label
    this.add.text(WORLD_W / 2, 2 * TILE, 'THE SANCTUM HEART', {
      fontFamily: 'Courier New', fontSize: '14px', color: '#6050a0',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);

    // ── Purple/blue torches — deep atmosphere ──
    for (const [tx, ty, color] of [
      [6, 3, 0x5040a0], [13, 3, 0x5040a0],
      [6, 8, 0x3060a0], [13, 8, 0x3060a0],
      [6, 13, 0x5040a0], [13, 13, 0x5040a0],
      [6, 18, 0x3060a0], [13, 18, 0x3060a0],
      [9, 5, 0x4050a0], [10, 5, 0x4050a0],
      [9, 16, 0x4050a0], [10, 16, 0x4050a0],
    ] as [number, number, number][]) {
      this.add.rectangle(tx * TILE + TILE / 2, ty * TILE + TILE / 2, 22, 22, color, 0.16).setDepth(4);
    }

    // ── The Altar (central piece — massive stone slab) ──
    const altarX = 10 * TILE;
    const altarY = 12 * TILE;
    // Altar base
    const altar = this.add.rectangle(altarX, altarY, 64, 48, 0x383050);
    altar.setStrokeStyle(3, 0x5050a0);
    altar.setDepth(5);
    // Altar top surface
    this.add.rectangle(altarX, altarY - 16, 60, 16, 0x484068).setStrokeStyle(2, 0x606090).setDepth(5);
    // Inscriptions on the altar (faint lines)
    for (const [ix, iy, iw] of [
      [altarX - 20, altarY - 4, 12], [altarX + 8, altarY - 4, 14],
      [altarX - 16, altarY + 6, 10], [altarX + 12, altarY + 6, 8],
    ] as [number, number, number][]) {
      this.add.rectangle(ix, iy, iw, 1, 0x7070c0, 0.3).setDepth(6);
    }
    // Dark energy aura around the altar (pulsing)
    const aura = this.add.circle(altarX, altarY, 48, 0x4030a0, 0.08).setDepth(3);
    this.tweens.add({
      targets: aura,
      alpha: { from: 0.05, to: 0.15 },
      scaleX: { from: 0.9, to: 1.15 },
      scaleY: { from: 0.9, to: 1.15 },
      duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    // Altar collision
    this.physics.add.existing(altar, true);
    this.walls.add(altar);

    // ── Floating spectral wisps (purple-blue, drifting) ──
    for (const [wx, wy] of [[7, 5], [12, 7], [8, 15], [12, 17], [10, 9]] as [number, number][]) {
      const wisp = this.add.circle(wx * TILE + TILE / 2, wy * TILE + TILE / 2, 4, 0x6080c0, 0.3).setDepth(7);
      this.tweens.add({
        targets: wisp,
        x: wisp.x + Phaser.Math.Between(-20, 20),
        y: wisp.y + Phaser.Math.Between(-16, 16),
        alpha: { from: 0.15, to: 0.45 },
        duration: 2200 + Math.random() * 1500,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // ── Submerged pillar decorations (same as Floor 1 but more worn) ──
    for (const [px, py] of [
      [7, 4], [12, 4], [7, 16], [12, 16],
    ] as [number, number][]) {
      const pillar = this.add.rectangle(px * TILE + TILE / 2, py * TILE + TILE / 2, 26, 26, 0x484060);
      pillar.setStrokeStyle(2, 0x363050);
      pillar.setDepth(5);
      // Crack detail
      this.add.rectangle(px * TILE + TILE / 2 - 4, py * TILE + TILE / 2 + 2, 8, 1, 0x303040).setDepth(6);
      this.physics.add.existing(pillar, true);
      this.walls.add(pillar);
    }

    // ── Veyrin NPC (crouched beside the altar) ──
    this.spawnNpc({
      key: 'veyrin',
      dialogueId: 'veyrin-sanctum',
      x: 12 * TILE,
      y: 12 * TILE,
    });

    // ── Enemies: Hollow Knights (the old wardens) ──
    this.spawnEnemy({ monsterKey: 'hollow_knight', x: 8 * TILE, y: 7 * TILE });
    this.spawnEnemy({ monsterKey: 'hollow_knight', x: 11 * TILE, y: 17 * TILE });

    // ── Treasure chest near the altar (high-value loot) ──
    this.spawnChest({
      x: 7 * TILE + TILE / 2, y: 13 * TILE + TILE / 2,
      loot: [
        { itemKey: Math.random() > 0.5 ? 'steel_sword' : 'chainmail' },
        { itemKey: 'health_potion', qty: 3 },
        { itemKey: 'shadow_essence', qty: 2 },
      ],
      gold: 60,
    });

    // ── Water Charm — blue/teal-trimmed chest near the altar ──
    if (!useDungeonItemStore.getState().has('water_charm')) {
      const wcX = 11 * TILE + TILE / 2;
      const wcY = 14 * TILE + TILE / 2;
      const wcChest = this.add.rectangle(wcX, wcY, 28, 24, 0x2a5878);
      wcChest.setStrokeStyle(2, 0x7fd8e8);
      wcChest.setDepth(8);
      // Teal clasp
      const wcClasp = this.add.rectangle(wcX, wcY - 4, 8, 8, 0x7fd8e8);
      wcClasp.setDepth(9);
      // Pulsing cyan glow — pearl inside the chest
      const wcGlow = this.add.circle(wcX, wcY, 22, 0x7fd8e8, 0.14);
      wcGlow.setDepth(7);
      this.tweens.add({ targets: wcGlow, alpha: 0.28, scale: 1.3, duration: 1500, yoyo: true, repeat: -1 });

      this.spawnInteractable({
        sprite: wcChest as any, label: 'Open tidal chest', radius: 24,
        action: () => {
          useDungeonItemStore.getState().acquire('water_charm');
          window.dispatchEvent(new CustomEvent('gameMessage', {
            detail: 'You found the WATER CHARM! Equip the charm to wade through shallow water. Submerged paths will open.',
          }));
          wcChest.destroy();
          wcClasp.destroy();
          wcGlow.destroy();
        },
      });
    }

    // ── Material pickups ──
    // Shadow essence near the altar (walkable at 8,11)
    const shadowEssence = this.add.circle(8 * TILE + TILE / 2, 11 * TILE + TILE / 2, 7, 0x8040c0);
    shadowEssence.setStrokeStyle(2, 0x6030a0);
    shadowEssence.setDepth(6);
    this.spawnInteractable({
      sprite: shadowEssence as any, label: 'Collect shadow essence', radius: 20,
      action: () => {
        this.spawnPickupParticles(shadowEssence.x, shadowEssence.y, 0x60c060);
        useInventoryStore.getState().addItem('shadow_essence');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found shadow essence.' }));
        shadowEssence.destroy();
      },
    });

    // ── The Watcher ──
    this.spawnWatcher(11 * TILE, 4 * TILE);

    // ── EXIT UP → Floor 1 (top-center) ──
    this.addExit({
      x: 8 * TILE, y: 0, w: 4 * TILE, h: TILE,
      targetScene: 'DrownedSanctumF1Scene', targetSpawn: 'fromFloor2',
      label: '↑ Floor 1',
    });
    this.add.rectangle(10 * TILE, 1.2 * TILE, 120, 36, 0x201828).setStrokeStyle(2, 0x404060).setDepth(3);
    this.add.text(10 * TILE, 1.2 * TILE, '▲ Floor 1', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#8888aa',
    }).setOrigin(0.5).setDepth(4);

    // No exit down — this is the deepest point.

    // ── Random loot bag (rare, high value) ──
    this.spawnLootBag({
      x: 13 * TILE, y: 10 * TILE,
      loot: [{ itemKey: 'shadow_essence', weight: 2 }, { itemKey: 'troll_heart', weight: 2 }, { itemKey: 'steel_sword', weight: 1 }, { itemKey: 'chainmail', weight: 1 }],
      gold: 35, spawnChance: 0.25,
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromFloor1':
      case 'default':
      default:
        return { x: 10 * TILE, y: 3 * TILE };
    }
  }
}

// ─── Map data ──────────────────────────────────────────────────────

const WS = T.WALL_STONE;
const FC = T.FLOOR_CRACKED;
const WT = T.WATER;
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
 * Floor 2: The Sanctum Heart — large central chamber with altar.
 *
 * Layout:
 *   Stair opening at top center (cols 8-11, row 0)
 *   Main chamber (cols 6-13, rows 1-20) — large hall
 *   Water at edges (cols 6 and 13 are flooded)
 *   Altar area (center, rows 10-14) — BLOOD_STONE floor, FLOOR_CRACKED
 *   Chains on walls flanking the altar
 *   Water pools in corners
 */
function tileAt(x: number, y: number): number {
  // Stair opening
  if (inRect(x, y, 8, 0, 4, 1)) return FC;

  // Main chamber bounds
  if (!inRect(x, y, 6, 1, 8, 20)) return WS;

  // ── Water edges (east and west walls of the chamber) ──
  if (x === 6 && y >= 1 && y <= 20) return WT;
  if (x === 13 && y >= 1 && y <= 20) return WT;

  // ── Chains flanking the altar area ──
  if ((x === 7 || x === 12) && y >= 10 && y <= 14) return CH;

  // ── Water pools in corners ──
  if (inRect(x, y, 7, 1, 2, 2)) return WT;
  if (inRect(x, y, 11, 1, 2, 2)) return WT;
  if (inRect(x, y, 7, 19, 2, 2)) return WT;
  if (inRect(x, y, 11, 19, 2, 2)) return WT;

  // ── Altar area: blood stone around the center ──
  if (inRect(x, y, 8, 10, 4, 5)) return BS;

  // ── Floor cracked for the main walkway ──
  return FC;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
