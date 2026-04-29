import { useDialogueStore } from '../state/dialogueStore';
import { getDialogue } from '../engine/dialogues';
import { useInventoryStore } from '../state/inventoryStore';
import { useLoreStore } from '../state/loreStore';
import { BaseWorldScene, TILE, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Mossbarrow Cairn — tilemap version. Dark stone clearing with a ring
 * of cairn stones, a hollow oak, and the center stone interactable.
 */

const MAP_W = 40;
const MAP_H = 22;

export class MossbarrowScene extends BaseWorldScene {
  constructor() {
    super({ key: 'MossbarrowScene' });
  }

  protected getZoneName(): string | null { return 'Mossbarrow Cairn'; }

  protected getRandomEvents(): Array<() => void> {
    return [
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'The ground trembles briefly. Dust falls from the cairn stones.',
        }));
      },
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'A cold wind passes through. The token in your pocket stirs.',
        }));
      },
    ];
  }

  protected layout(): void {
    generateTileset(this);

    const map = this.make.tilemap({
      data: buildMapData(),
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tileset')!;
    map.createLayer(0, tileset)!;

    // Cairn stone collision bodies — invisible since the tilemap draws them.
    const stoneTiles = getCairnPositions();
    for (const [tx, ty] of stoneTiles) {
      const cx = tx * TILE + TILE / 2;
      const cy = ty * TILE + TILE / 2;
      const stone = this.add.rectangle(cx, cy, 28, 28, 0x000000, 0);
      this.physics.add.existing(stone, true);
      this.walls.add(stone);
    }

    // Hollow oak — visual tree with trunk + canopy (bush tiles handle the green).
    const oakCx = 10 * TILE + 16;
    const oakCy = 8 * TILE + 16;
    // Dark trunk (brown, gnarled)
    this.add.rectangle(oakCx, oakCy + 16, 24, 48, 0x4a3018).setDepth(4);
    this.add.rectangle(oakCx, oakCy + 16, 18, 48, 0x5a3820).setDepth(4);
    // Trunk texture lines
    this.add.rectangle(oakCx - 4, oakCy + 8, 2, 32, 0x3a2010).setDepth(5);
    this.add.rectangle(oakCx + 5, oakCy + 14, 2, 24, 0x3a2010).setDepth(5);
    // Hollow hole in the trunk (dark opening)
    this.add.ellipse(oakCx, oakCy + 20, 12, 16, 0x0a0808).setDepth(5);
    // Roots spreading at base
    this.add.rectangle(oakCx - 14, oakCy + 38, 12, 6, 0x3a2010).setDepth(4);
    this.add.rectangle(oakCx + 14, oakCy + 36, 10, 6, 0x3a2010).setDepth(4);
    // Canopy top highlights (lighter green over the bush tiles)
    this.add.ellipse(oakCx, oakCy - 20, 72, 40, 0x58c838, 0.4).setDepth(6);
    this.add.ellipse(oakCx - 8, oakCy - 28, 32, 20, 0x68d848, 0.3).setDepth(6);
    // Label
    this.add.text(oakCx, oakCy - 48, 'Hollow Oak', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#6a5838',
    }).setOrigin(0.5).setAlpha(0.6).setDepth(7);

    // Collision body
    const oakRect = this.add.rectangle(oakCx, oakCy, 48, 64, 0x000000, 0);
    this.physics.add.existing(oakRect, true);
    this.walls.add(oakRect);

    // ── Waypoint stone (near the entrance path) ──
    const wpX = 6 * TILE;
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

    // Enemies — risen bones guarding the cairn. One patrol comes paired;
    // the rest stay solo so the difficulty curve is gentle.
    this.spawnEnemy({ monsterKey: 'skeleton', x: 16 * TILE, y: 10 * TILE, extras: ['skeleton'] });
    this.spawnEnemy({ monsterKey: 'skeleton', x: 28 * TILE, y: 12 * TILE });
    this.spawnEnemy({ monsterKey: 'skeleton', x: 12 * TILE, y: 14 * TILE });
    this.spawnEnemy({ monsterKey: 'skeleton', x: 32 * TILE, y: 8 * TILE });

    // ── Material pickups ──
    // Iron ore vein near the hollow oak (oak is at 10,8)
    const ironOre = this.add.circle(12 * TILE, 7 * TILE, 8, 0x808080);
    ironOre.setStrokeStyle(2, 0x606060);
    ironOre.setDepth(6);
    this.spawnInteractable({
      sprite: ironOre as any, label: 'Pick up iron ore', radius: 20,
      action: () => {
        this.spawnPickupParticles(ironOre.x, ironOre.y, 0x60c060);
        useInventoryStore.getState().addItem('iron_ore');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found iron ore!' }));
        ironOre.destroy();
      },
    });

    // Bone shard near a cairn stone (cairn stone at 19,14)
    const boneShard = this.add.circle(20 * TILE, 15 * TILE, 7, 0xd0c8a0);
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

    // ── Lore interactables ──

    // Crumbling stone tablet near the entrance path
    const tablet = this.add.rectangle(6 * TILE, 11 * TILE, 22, 30, 0x706858);
    tablet.setStrokeStyle(1, 0x4a3a28);
    tablet.setDepth(6);
    this.spawnInteractable({
      sprite: tablet as any,
      label: 'Examine stone tablet',
      radius: 20,
      action: () => {
        useLoreStore.getState().discover({
          key: 'stone-tablet-mossbarrow',
          title: 'Crumbling Tablet',
          text: "The old script is worn. One word is still legible: 'BENEATH.'",
          location: 'Mossbarrow Cairn',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: "The old script is worn. One word is still legible: 'BENEATH.'",
        }));
      },
    });

    // Discarded shield near a cairn stone
    const shield = this.add.circle(25 * TILE, 9 * TILE, 5, 0xa09878, 0.6);
    shield.setDepth(6);
    this.spawnInteractable({
      sprite: shield as any,
      label: 'Examine discarded shield',
      radius: 20,
      action: () => {
        useLoreStore.getState().discover({
          key: 'discarded-shield-mossbarrow',
          title: 'Discarded Shield',
          text: 'A shield, face-down. The arm strap is broken. The owner did not drop it gently.',
          location: 'Mossbarrow Cairn',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'A shield, face-down. The arm strap is broken. The owner did not drop it gently.',
        }));
      },
    });

    // ── Fairy Fountain (near the hollow oak, partially hidden) ──
    this.spawnFairyFountain({ x: 8 * TILE, y: 9 * TILE });

    // Zone marker.
    this.add
      .text(2 * TILE, WORLD_H / 2, 'MOSSBARROW CAIRN', {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#6a5838',
      })
      .setOrigin(0, 0.5)
      .setAlpha(0.5)
      .setDepth(15);

    // West edge → Greenhollow.
    this.addExit({
      x: 0,
      y: 0,
      w: TILE,
      h: WORLD_H,
      targetScene: 'GreenhollowScene',
      targetSpawn: 'fromMossbarrow',
      label: '← Greenhollow',
    });

    // East edge → Ironveil Mines.
    this.addExit({
      x: (MAP_W - 1) * TILE,
      y: 0,
      w: TILE,
      h: WORLD_H,
      targetScene: 'IronveilScene',
      targetSpawn: 'fromMossbarrow',
      label: '→ Ironveil Mines [Lv 5-7]',
    });

    // Center stone — visible altar/pedestal with glow-ish highlight.
    const cairnCx = 22 * TILE;
    const cairnCy = 11 * TILE;
    const centerStone = this.add.rectangle(cairnCx, cairnCy, 40, 40, 0x8a8a80);
    centerStone.setStrokeStyle(2, 0x585850);
    centerStone.setDepth(5);
    // Inner glow (smaller lighter rect)
    const glow = this.add.rectangle(cairnCx, cairnCy, 28, 28, 0xa0a098);
    glow.setDepth(5);
    this.physics.add.existing(centerStone, true);
    this.walls.add(centerStone);

    this.spawnInteractable({
      sprite: centerStone,
      label: 'Examine the center stone',
      radius: 28,
      action: () => {
        useDialogueStore.getState().start(getDialogue('mossbarrow-cairn'));
      },
    });

    // ── Stairway entrance — dramatic pit with stone steps ──
    const stairCx = cairnCx;
    const stairCy = cairnCy + 3 * TILE;

    // Dark pit background (very dark, high depth so it shows)
    this.add.rectangle(stairCx, stairCy, 144, 80, 0x000000).setDepth(6);

    // Stone border (raised edge around the pit)
    this.add.rectangle(stairCx, stairCy - 40, 144, 8, 0x808078).setDepth(7); // top edge (light)
    this.add.rectangle(stairCx, stairCy + 40, 144, 8, 0x404038).setDepth(7); // bottom edge (dark)
    this.add.rectangle(stairCx - 72, stairCy, 8, 80, 0x606058).setDepth(7); // left edge
    this.add.rectangle(stairCx + 72, stairCy, 8, 80, 0x505048).setDepth(7); // right edge

    // Corner stones
    this.add.rectangle(stairCx - 68, stairCy - 36, 12, 12, 0x707068).setDepth(7);
    this.add.rectangle(stairCx + 68, stairCy - 36, 12, 12, 0x707068).setDepth(7);
    this.add.rectangle(stairCx - 68, stairCy + 36, 12, 12, 0x505048).setDepth(7);
    this.add.rectangle(stairCx + 68, stairCy + 36, 12, 12, 0x505048).setDepth(7);

    // Stair steps descending (gradient from light to dark, each narrower)
    for (let s = 0; s < 5; s++) {
      const stepY = stairCy - 24 + s * 12;
      const stepW = 120 - s * 16;
      const brightness = Math.max(0x10, 0x50 - s * 0x10);
      const stepColor = (brightness << 16) | (brightness << 8) | brightness;
      this.add.rectangle(stairCx, stepY, stepW, 8, stepColor).setDepth(7);
      // Step edge highlight
      this.add.rectangle(stairCx, stepY - 3, stepW, 2, stepColor + 0x202020).setDepth(7);
    }

    // Arrow indicator
    this.add.text(stairCx, stairCy + 24, '▼▼▼', {
      fontFamily: 'Courier New', fontSize: '14px', color: '#6060a0',
    }).setOrigin(0.5).setDepth(8);

    // Labels
    this.add.text(stairCx, stairCy - 48, '▼ Stairs Down', {
      fontFamily: 'Courier New', fontSize: '13px', color: '#8888cc',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(8);

    this.add.text(stairCx, stairCy + 48, 'Mossbarrow Depths', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#6060a8',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(8);

    // Exit trigger — generous size so the player walks right in
    this.addExit({
      x: stairCx - 2 * TILE,
      y: stairCy - TILE,
      w: 4 * TILE,
      h: 2.5 * TILE,
      targetScene: 'MossbarrowDepthsScene',
      targetSpawn: 'fromMossbarrow',
    });

    // ── Treasure chest near cairn stone ──
    this.spawnChest({
      x: 26 * TILE, y: 14 * TILE,
      loot: [{ itemKey: 'bone_shard', qty: 2 }, { itemKey: 'mana_potion' }],
      gold: 15,
    });

    // ── Random loot bag ──
    this.spawnLootBag({
      x: 30 * TILE, y: 16 * TILE,
      loot: [{ itemKey: 'bone_shard', weight: 3 }, { itemKey: 'iron_ore', weight: 2 }, { itemKey: 'health_potion', weight: 2 }, { itemKey: 'shadow_essence', weight: 1 }],
      gold: 12, spawnChance: 0.15,
    });

    // ── Ancient Coin #3 — behind the hollow oak ──
    this.spawnAncientCoin({
      x: 9 * TILE, y: 6 * TILE,
      coinId: 'coin_3', inscription: 'Three for the gate that would not open.',
    });

    // ── Hollow walls (Echo Stone) — hidden overworld rooms ──
    // West ridge — a small loot cache behind a hollow stone.
    this.spawnHollowWall({
      x: 2 * TILE, y: 4 * TILE, w: TILE, h: TILE,
      onBreak: () => {
        this.spawnChest({
          x: 1 * TILE + TILE / 2, y: 4 * TILE + TILE / 2,
          loot: [{ itemKey: 'health_potion', qty: 2 }, { itemKey: 'iron_ore', qty: 1 }],
          gold: 20,
        });
      },
    });
    // South-east boulder field — behind a hollow rock.
    this.spawnHollowWall({
      x: 32 * TILE, y: 5 * TILE, w: TILE, h: TILE,
      onBreak: () => {
        this.spawnAncientCoin({
          x: 33 * TILE + TILE / 2, y: 5 * TILE + TILE / 2,
          coinId: 'coin_hollow_mossbarrow',
          inscription: 'The stone remembered its own echo.',
        });
      },
    });

    // ── Overworld iron ore veins (cliff zones, pickaxe content) ──
    this.spawnOreVein({ x: 3 * TILE + TILE / 2, y: 10 * TILE + TILE / 2, oreType: 'iron' });
    this.spawnOreVein({ x: 34 * TILE + TILE / 2, y: 3 * TILE + TILE / 2, oreType: 'iron' });

    // ── Boulder blocking the cliff shortcut to Ashenvale approach.
    //    Mine with pickaxe to open a faster path north.
    this.spawnBoulder({
      x: 6 * TILE + TILE / 2, y: 2 * TILE + TILE / 2,
      hitsRequired: 5,
    });

    // ── Cracked wall (alt to Echo hollow wall) — hides a loot cache
    //    that Echo Stone would never pulse-reveal. Always-visible crack
    //    pattern so players without the stone can still spot it.
    this.spawnCrackedWall({
      x: 28 * TILE, y: 19 * TILE, w: TILE, h: TILE,
      onBreak: () => {
        this.spawnChest({
          x: 29 * TILE + TILE / 2, y: 19 * TILE + TILE / 2,
          loot: [{ itemKey: 'silver_ore', qty: 1 }, { itemKey: 'moonpetal', qty: 2 }],
          gold: 35,
        });
      },
    });

    // ── Shallow water crossing (Water Charm gate) — south-east pool ──
    // Blocks a hidden lore object behind a water barrier.
    this.spawnShallowWater({ x: 34 * TILE, y: 16 * TILE, w: 3 * TILE, h: 2 * TILE });
    // Lore object beyond the shallow water
    const ruinedScroll = this.add.rectangle(36 * TILE, 18 * TILE, 14, 10, 0xd8d0b0);
    ruinedScroll.setStrokeStyle(1, 0xa09868);
    ruinedScroll.setDepth(8);
    this.spawnInteractable({
      sprite: ruinedScroll as any, label: 'Read ruined scroll', radius: 20,
      action: () => {
        useLoreStore.getState().discover({
          key: 'ruined-scroll-mossbarrow',
          title: 'Ruined Scroll',
          text: 'Water-damaged parchment. The visible lines read: "...the crown was not taken. It was given. And the one who gave it..."',
          location: 'Mossbarrow Cairn',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: '"...the crown was not taken. It was given. And the one who gave it..."',
        }));
      },
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromGreenhollow':
        return { x: 2 * TILE + 16, y: WORLD_H / 2 };
      case 'fromDepths':
        // Surface exit — just south of the stair entrance (center stone area)
        return { x: 22 * TILE, y: 15 * TILE };
      case 'fromIronveil':
        return { x: (MAP_W - 2) * TILE, y: WORLD_H / 2 };
      case 'default':
      default:
        return { x: 2 * TILE + 16, y: WORLD_H / 2 };
    }
  }
}

// ─── Map data ──────────────────────────────────────────────────

const FS = T.FLOOR_STONE;
const S  = T.WALL_STONE;
const _G = T.GRASS_DARK; void _G;
const P  = T.PATH;
const PE = T.PATH_EDGE;
const BU = T.BUSH;
const WA = T.WATER;

/** Cairn stone positions (WALL_STONE tiles that need physics bodies). */
function getCairnPositions(): [number, number][] {
  const positions: [number, number][] = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (tileAt(x, y) === S) positions.push([x, y]);
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
  // ── Cairn ring — 6 stones in a rough circle around (22, 11) ──
  const cairnStones: [number, number][] = [
    [19, 8], [25, 8], [18, 11], [26, 11], [19, 14], [25, 14],
  ];
  for (const [sx, sy] of cairnStones) {
    if (x === sx && y === sy) return S;
  }

  // ── Center stone area — stone floor ──
  if (inRect(x, y, 20, 9, 5, 5)) return FS;

  // ── Hollow oak at (9-11, 6-10) — use dark bush for tree canopy ──
  if (inRect(x, y, 9, 6, 3, 5)) return BU;

  // ── Ivy stones scattered around edges ──
  const ivyStones: [number, number][] = [
    [14, 5], [28, 5], [14, 17], [28, 17], [8, 12], [34, 12],
    [6, 4], [36, 8], [12, 18], [30, 18],
  ];
  for (const [ix, iy] of ivyStones) {
    if (x === ix && y === iy) return BU;
  }

  // ── Path from west entrance to cairn center ──
  if (y >= 10 && y <= 12 && x >= 1 && x <= 19) return P;
  if (y === 9 && x >= 1 && x <= 19) return PE;
  if (y === 13 && x >= 1 && x <= 19) return PE;

  // ── Small pools of stagnant water ──
  if (inRect(x, y, 4, 3, 2, 2)) return WA;
  if (inRect(x, y, 33, 16, 3, 2)) return WA;

  // ── Moss patches (light grass on stone) ──
  const hash = ((x * 11 + y * 7) % 13);
  if (hash < 2) return T.GRASS_LIGHT; // mossy stone floor

  // ── Default: dark stone ground ──
  return FS;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
