import { useInventoryStore } from '../state/inventoryStore';
import { useLoreStore } from '../state/loreStore';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Greenhollow Woods — forest zone east of Ashenvale. Tilemap-rendered
 * with dense tree cover, winding paths, and Orric's cabin.
 */

const MAP_W = 40;
const MAP_H = 22;

export class GreenhollowScene extends BaseWorldScene {
  constructor() {
    super({ key: 'GreenhollowScene' });
  }

  protected getZoneName(): string | null { return 'Greenhollow Woods'; }

  protected getRandomEvents(): Array<() => void> {
    return [
      // Traveling merchant — temporary interactable that opens the shop
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'A traveling merchant waves from the path.',
        }));
        const merchant = this.add.circle(this.player.x + 60, this.player.y, 10, 0xd4a968);
        merchant.setDepth(10);
        this.spawnInteractable({
          sprite: merchant as any,
          label: 'Trade with merchant',
          radius: 28,
          action: () => {
            useInventoryStore.getState().openShop();
            merchant.destroy();
          },
        });
        this.time.delayedCall(20000, () => { if (merchant.active) merchant.destroy(); });
      },
      // Ambush — wolf spawns nearby
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'Something moves in the bushes.',
        }));
        this.spawnEnemy({ monsterKey: 'wolf', x: this.player.x + 80, y: this.player.y });
      },
      // Found item — random consumable
      () => {
        const found = Math.random() > 0.5 ? 'health_potion' : 'antidote';
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'You spot something glinting in the grass.',
        }));
        useInventoryStore.getState().addItem(found);
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

    // Orric's cabin — collision only; tilemap draws the visuals.
    this.addBuilding({
      xTile: 30,
      yTile: 3,
      wTile: 5,
      hTile: 4,
      color: 0x4a3220,
      label: "Orric's Cabin",
      doorSide: 'bottom',
      visual: false,
    });

    // Tree collision bodies — matching the bush tiles in the map.
    const treeTiles = getTreePositions();
    for (const [tx, ty] of treeTiles) {
      const cx = tx * TILE + TILE / 2;
      const cy = ty * TILE + TILE / 2;
      const tree = this.add.circle(cx, cy, 14, 0x000000, 0); // invisible
      this.physics.add.existing(tree, true);
      this.walls.add(tree);
    }

    // Cabin signpost
    const cabinSignX = 33 * TILE;
    const cabinSignY = (3 + 4 + 1) * TILE + TILE / 2;
    this.add.rectangle(cabinSignX, cabinSignY, 4, 20, 0x5a3a1a).setDepth(11);
    this.add.rectangle(cabinSignX, cabinSignY - 12, 60, 18, 0x4a3420).setStrokeStyle(1, 0x2a1810).setDepth(11);
    this.add.text(cabinSignX, cabinSignY - 12, "Orric's Cabin", {
      fontFamily: 'Courier New', fontSize: '8px', color: '#d4c488',
    }).setOrigin(0.5).setDepth(12);

    // Orric is INSIDE his cabin now — add a door exit.
    this.addExit({
      x: 32 * TILE,
      y: 6 * TILE,
      w: 2 * TILE,
      h: TILE,
      targetScene: 'InteriorScene',
      targetSpawn: 'orric',
    });

    // Enemies — wolves roaming the forest.
    this.spawnEnemy({ monsterKey: 'wolf', x: 22 * TILE, y: 10 * TILE });
    this.spawnEnemy({ monsterKey: 'wolf', x: 16 * TILE, y: 8 * TILE });
    this.spawnEnemy({ monsterKey: 'wolf', x: 26 * TILE, y: 14 * TILE });
    this.spawnEnemy({ monsterKey: 'wolf', x: 12 * TILE, y: 16 * TILE });
    this.spawnEnemy({ monsterKey: 'wolf', x: 30 * TILE, y: 18 * TILE });

    // Boars — southern grassy areas
    this.spawnEnemy({ monsterKey: 'boar', x: 10 * TILE, y: 18 * TILE });
    this.spawnEnemy({ monsterKey: 'boar', x: 24 * TILE, y: 20 * TILE });

    // Bandits — along the paths (more dangerous)
    this.spawnEnemy({ monsterKey: 'bandit', x: 20 * TILE, y: 6 * TILE });
    this.spawnEnemy({ monsterKey: 'bandit', x: 28 * TILE, y: 12 * TILE });

    // ── Waypoint stone (crossroads area) ──
    const wpX = 20 * TILE;
    const wpY = 12 * TILE;
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

    // Moonpetal herb patch (near the north path).
    const herbSprite = this.add.circle(14 * TILE, 6 * TILE, 7, 0x40a848);
    herbSprite.setStrokeStyle(2, 0x8040c0);
    herbSprite.setDepth(10);
    this.spawnInteractable({
      sprite: herbSprite as any, label: 'Gather moonpetal', radius: 20,
      action: () => {
        this.spawnPickupParticles(herbSprite.x, herbSprite.y, 0x60c060);
        useInventoryStore.getState().addItem('moonpetal');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found moonpetal!' }));
        herbSprite.destroy();
      },
    });

    // ── Material pickups ──
    // Moonpetal herb patch 1 (near the south path)
    const moonpetal1 = this.add.circle(18 * TILE, 16 * TILE, 7, 0x40a848);
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

    // Moonpetal herb patch 2 (east side near cabin approach)
    const moonpetal2 = this.add.circle(28 * TILE, 9 * TILE, 7, 0x40a848);
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

    // Iron ore vein (rocky area near south path)
    const ironOre1 = this.add.circle(22 * TILE, 14 * TILE, 8, 0x808080);
    ironOre1.setStrokeStyle(2, 0x606060);
    ironOre1.setDepth(6);
    this.spawnInteractable({
      sprite: ironOre1 as any, label: 'Pick up iron ore', radius: 20,
      action: () => {
        this.spawnPickupParticles(ironOre1.x, ironOre1.y, 0x60c060);
        useInventoryStore.getState().addItem('iron_ore');
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Found iron ore!' }));
        ironOre1.destroy();
      },
    });

    // ── Lore interactables ──

    // Old grave marker off the main path (west side of the forest)
    const grave = this.add.rectangle(4 * TILE, 17 * TILE, 20, 28, 0x706858);
    grave.setStrokeStyle(1, 0x4a3a28);
    grave.setDepth(6);
    this.spawnInteractable({
      sprite: grave as any,
      label: 'Examine grave marker',
      radius: 20,
      action: () => {
        useLoreStore.getState().discover({
          key: 'grave-marker-greenhollow',
          title: "Maren's Grave",
          text: "Here lies Maren. She went looking for something. She found it.",
          location: 'Greenhollow Woods',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: "Here lies Maren. She went looking for something. She found it.",
        }));
      },
    });

    // Broken cart near Orric's cabin
    const cartBody = this.add.rectangle(27 * TILE, 13 * TILE, 36, 20, 0x5a3a18);
    cartBody.setStrokeStyle(1, 0x3a2210);
    cartBody.setDepth(6);
    this.spawnInteractable({
      sprite: cartBody as any,
      label: 'Examine overturned cart',
      radius: 22,
      action: () => {
        useLoreStore.getState().discover({
          key: 'overturned-cart-greenhollow',
          title: 'Overturned Cart',
          text: 'An overturned cart. Whatever it carried is long gone. Claw marks on the wood.',
          location: 'Greenhollow Woods',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'An overturned cart. Whatever it carried is long gone. Claw marks on the wood.',
        }));
      },
    });

    // Carved tree (small circle marker on a tree position)
    const carvedTree = this.add.circle(7 * TILE, 10 * TILE, 5, 0xa09878, 0.6);
    carvedTree.setDepth(6);
    this.spawnInteractable({
      sprite: carvedTree as any,
      label: 'Examine carved tree',
      radius: 20,
      action: () => {
        useLoreStore.getState().discover({
          key: 'carved-tree-greenhollow',
          title: 'Carved Tree',
          text: 'Someone carved initials into the bark. The tree has grown around them, half-swallowed.',
          location: 'Greenhollow Woods',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'Someone carved initials into the bark. The tree has grown around them, half-swallowed.',
        }));
      },
    });

    // ── Fairy Fountain (hidden in the far south-west, behind bushes) ──
    this.spawnFairyFountain({ x: 3 * TILE, y: 20 * TILE });

    // Zone marker.
    this.add
      .text(WORLD_W / 2, WORLD_H - TILE * 4, 'GREENHOLLOW WOODS', {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#6a5838',
      })
      .setOrigin(0.5)
      .setAlpha(0.5)
      .setDepth(15);

    // North edge → Ashenvale.
    this.addExit({
      x: 0,
      y: 0,
      w: WORLD_W,
      h: TILE,
      targetScene: 'TownScene',
      targetSpawn: 'fromGreenhollow',
      label: '↑ Ashenvale',
    });

    // East edge → Mossbarrow.
    this.addExit({
      x: WORLD_W - TILE,
      y: 0,
      w: TILE,
      h: WORLD_H,
      targetScene: 'MossbarrowScene',
      targetSpawn: 'fromGreenhollow',
      label: '→ Mossbarrow [Lv 3-5]',
    });

    // ── Hidden treasure chest off the main path ──
    this.spawnChest({
      x: 6 * TILE, y: 12 * TILE,
      loot: [{ itemKey: 'wolf_pelt', qty: 2 }, { itemKey: 'health_potion' }],
    });

    // ── Random loot bag ──
    this.spawnLootBag({
      x: 14 * TILE, y: 16 * TILE,
      loot: [{ itemKey: 'health_potion', weight: 3 }, { itemKey: 'wolf_pelt', weight: 2 }, { itemKey: 'moonpetal', weight: 1 }],
      gold: 10, spawnChance: 0.2,
    });

    // ── Heart piece #1 — hidden off-path behind bushes (south-west clearing) ──
    this.spawnHeartPiece(4 * TILE, 14 * TILE);

    // ── Heart piece #8 — secret cave in far south-east corner ──
    this.spawnHeartPiece(36 * TILE, 20 * TILE);

    // ── Shallow water crossing (Water Charm gate) — south-east brook ──
    // Blocks access to a hidden heart piece cave without the Water Charm.
    this.spawnShallowWater({ x: 34 * TILE, y: 18 * TILE, w: 3 * TILE, h: 2 * TILE });
    // Heart piece #9 beyond the shallow water
    this.spawnHeartPiece(37 * TILE, 16 * TILE);

    // South edge → Duskmere Village
    this.addExit({
      x: 8 * TILE,
      y: WORLD_H - TILE,
      w: 8 * TILE,
      h: TILE,
      targetScene: 'DuskmereScene',
      targetSpawn: 'fromGreenhollow',
      label: '\u2193 Duskmere Village [Lv 4-6]',
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromAshenvale':
        // Came from the north (Ashenvale is north of Greenhollow).
        // Spawn near the north edge, close to the return exit.
        return { x: WORLD_W / 2, y: TILE * 3 };
      case 'fromMossbarrow':
        return { x: WORLD_W - TILE * 3, y: WORLD_H / 2 };
      case 'fromOrricInterior':
        return { x: 33 * TILE, y: 8 * TILE };
      case 'fromDuskmere':
        return { x: 12 * TILE, y: WORLD_H - TILE * 3 };
      case 'default':
      default:
        return { x: WORLD_W / 2, y: TILE * 3 };
    }
  }
}

// ─── Map + tree layout ─────────────────────────────────────────

const G  = T.GRASS_DARK;
const g  = T.GRASS_LIGHT;
const P  = T.PATH;
const PE = T.PATH_EDGE;
const _S = T.WALL_STONE; void _S; // reserved for future cabin variants
const W  = T.WALL_WOOD;
const D  = T.DOOR;
const FW = T.FLOOR_WOOD;
const R  = T.ROOF;
const RE = T.ROOF_EDGE;
const SH = T.SHADOW;
const BU = T.BUSH;

/** Deterministic tree positions — dense forest with clearings for paths. */
function getTreePositions(): [number, number][] {
  const trees: [number, number][] = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (tileAt(x, y) === BU) trees.push([x, y]);
    }
  }
  return trees;
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
  // ── Cabin: tiles (30,3) to (34,6) ──
  if (y === 2 && x >= 30 && x < 35) return R;  // roof
  if (y === 3 && x >= 30 && x < 35) return RE; // roof edge
  if (inRect(x, y, 30, 4, 5, 3)) {
    if (x === 30 || x === 34) return W;
    if (y === 6) {
      if (x === 32 || x === 33) return D;
      return W;
    }
    return FW;
  }
  // Cabin shadow + door path
  if (y === 7 && x >= 30 && x < 35) {
    if (x === 32 || x === 33) return P;
    return SH;
  }
  // Bushes flanking cabin
  if ((x === 29 || x === 35) && y >= 3 && y <= 6) return BU;

  // ── NORTH ROAD from Ashenvale entrance down through the forest ──
  // Main north-south road (center of map, from top to mid)
  if (x >= 19 && x <= 20 && y >= 1 && y <= 14) return P;
  if ((x === 18 || x === 21) && y >= 1 && y <= 14) return PE;

  // ── Path curves east toward cabin from midpoint ──
  if (x >= 20 && x <= 24 && y >= 12 && y <= 14) return P;
  if (x >= 24 && x <= 28 && y >= 10 && y <= 12) return P;
  if (x >= 28 && x <= 32 && y >= 7 && y <= 10) return P;
  // Path edges along the east curve
  if (y === 11 && x >= 20 && x <= 24) return PE;
  if (y === 15 && x >= 20 && x <= 24) return PE;
  if (y === 9 && x >= 24 && x <= 28) return PE;
  if (y === 13 && x >= 24 && x <= 28) return PE;

  // ── South branch continues to the old south exit area ──
  if (x >= 19 && x <= 20 && y >= 14 && y <= 21) return P;
  if ((x === 18 || x === 21) && y >= 14 && y <= 21) return PE;

  // ── Dense tree cover (bushes with physics bodies) ──
  // Scatter trees everywhere EXCEPT on paths, buildings, exits
  const isPath = false; // already handled above (would've returned)
  const isExit = y === 0 || x >= MAP_W - 1;
  const nearCabin = x >= 28 && x <= 36 && y >= 1 && y <= 9;
  const nearPath = isNearPath(x, y);

  if (!isPath && !isExit && !nearCabin && !nearPath) {
    // Pseudo-random tree placement — ~35% coverage
    const hash = ((x * 7 + y * 13 + x * y * 3) % 17);
    if (hash < 6) return BU;
  }

  // ── Light grass near paths, dark elsewhere ──
  if (nearPath) return g;

  return (x + y) % 5 === 0 ? g : G;
}

function isNearPath(x: number, y: number): boolean {
  // Check if within 2 tiles of any path segment
  const pathZones = [
    { x1: 16, y1: 0, x2: 23, y2: 15 },  // north road (full length)
    { x1: 17, y1: 14, x2: 22, y2: 21 }, // south corridor
    { x1: 19, y1: 12, x2: 25, y2: 15 }, // mid curve
    { x1: 23, y1: 10, x2: 29, y2: 13 }, // northeast curve
    { x1: 27, y1: 7, x2: 33, y2: 11 },  // cabin approach
    // bridge removed — was confusing
  ];
  for (const z of pathZones) {
    if (x >= z.x1 && x <= z.x2 && y >= z.y1 && y <= z.y2) return true;
  }
  return false;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
