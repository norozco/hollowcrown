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

    // Herb interactable (for herb-gathering quest).
    const herbSprite = this.add.circle(14 * TILE, 6 * TILE, 8, 0x40c040);
    herbSprite.setStrokeStyle(1, 0x208020);
    herbSprite.setDepth(10);
    this.spawnInteractable({
      sprite: herbSprite, label: 'Gather whiteleaf herbs', radius: 20,
      action: () => {
        const qs = import('../state/questStore').then(m => {
          m.useQuestStore.getState().completeObjective('herb-gathering', 'find-herbs');
        });
        void qs;
      },
    });

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
      label: '→ Mossbarrow',
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
