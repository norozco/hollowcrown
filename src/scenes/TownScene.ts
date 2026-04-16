import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Ashenvale — starter town, now rendered with a procedural pixel-art
 * tilemap (SNES Zelda style). Buildings have invisible collision
 * segments from addBuilding({ visual: false }) and the tilemap
 * provides the visual layer.
 *
 * Map is 40 tiles wide × 22 tiles tall = 1280×704 px (fits viewport).
 */

const MAP_W = 40;
const MAP_H = 22;

export class TownScene extends BaseWorldScene {
  constructor() {
    super({ key: 'TownScene' });
  }

  protected layout(): void {
    // Generate the pixel-art tileset (idempotent).
    generateTileset(this);

    // Build and render the tilemap.
    const map = this.make.tilemap({
      data: buildMapData(),
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tileset')!;
    map.createLayer(0, tileset)!;

    // Buildings — invisible collision only; tilemap handles visuals.
    this.addBuilding({
      xTile: 5,
      yTile: 3,
      wTile: 6,
      hTile: 4,
      color: 0x4a2e1a,
      label: "Adventurers' Guild",
      doorSide: 'bottom',
      visual: false,
    });

    this.addBuilding({
      xTile: 15,
      yTile: 3,
      wTile: 6,
      hTile: 4,
      color: 0x3a2a30,
      label: 'Whispering Hollow Inn',
      doorSide: 'bottom',
      visual: false,
    });

    this.addBuilding({
      xTile: 27,
      yTile: 3,
      wTile: 5,
      hTile: 4,
      color: 0x3a3420,
      label: 'General Store',
      doorSide: 'bottom',
      visual: false,
    });

    // Empty plot — collision box, label only.
    const plot = { x: 10 * TILE, y: 14 * TILE, w: 5 * TILE, h: 3 * TILE };
    this.add
      .text(plot.x + plot.w / 2, plot.y + plot.h / 2, '[ Empty Plot ]', {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#5a4828',
      })
      .setOrigin(0.5)
      .setDepth(10);

    // Door exits → building interiors (NPCs are INSIDE now).
    this.addExit({
      x: GUILD.doorX1 * TILE,
      y: GUILD.y * TILE + (GUILD.h - 1) * TILE,
      w: 2 * TILE,
      h: TILE,
      targetScene: 'InteriorScene',
      targetSpawn: 'guild',
    });
    this.addExit({
      x: INN.doorX1 * TILE,
      y: INN.y * TILE + (INN.h - 1) * TILE,
      w: 2 * TILE,
      h: TILE,
      targetScene: 'InteriorScene',
      targetSpawn: 'inn',
    });
    this.addExit({
      x: SHOP.doorX1 * TILE,
      y: SHOP.y * TILE + (SHOP.h - 1) * TILE,
      w: 2 * TILE,
      h: TILE,
      targetScene: 'InteriorScene',
      targetSpawn: 'shop',
    });

    // South-edge exit to Greenhollow Woods.
    this.addExit({
      x: 0,
      y: WORLD_H - TILE,
      w: WORLD_W,
      h: TILE,
      targetScene: 'GreenhollowScene',
      targetSpawn: 'fromAshenvale',
      label: '→ Greenhollow Woods',
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromGreenhollow':
        return { x: WORLD_W / 2, y: WORLD_H - TILE * 3 };
      case 'fromGuildInterior':
        return { x: (GUILD.doorX1 + 1) * TILE, y: (GUILD.y + GUILD.h + 1) * TILE };
      case 'fromInnInterior':
        return { x: (INN.doorX1 + 1) * TILE, y: (INN.y + INN.h + 1) * TILE };
      case 'fromShopInterior':
        return { x: (SHOP.doorX1 + 1) * TILE, y: (SHOP.y + SHOP.h + 1) * TILE };
      case 'default':
      default:
        return { x: WORLD_W / 2, y: 16 * TILE };
    }
  }
}

// ─── Map data builder ──────────────────────────────────────────

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

/** Tile aliases for readability. */
const G  = T.GRASS_DARK;
const g  = T.GRASS_LIGHT;
const P  = T.PATH;
const PE = T.PATH_EDGE;
const S  = T.WALL_STONE;
const W  = T.WALL_WOOD;
const D  = T.DOOR;
const FW = T.FLOOR_WOOD;
const FS = T.FLOOR_STONE;
const R  = T.ROOF;
const RE = T.ROOF_EDGE;
const SH = T.SHADOW;
const BU = T.BUSH;
const FN = T.FENCE;
const WL = T.WELL;

/** Building definition. */
interface Building {
  x: number; y: number; w: number; h: number;
  wallTile: number;
  floorTile: number;
  doorX1: number;
  doorX2: number;
}

const GUILD: Building   = { x: 5,  y: 3, w: 6, h: 4, wallTile: S, floorTile: FS, doorX1: 7, doorX2: 8 };
const INN: Building     = { x: 15, y: 3, w: 6, h: 4, wallTile: W, floorTile: FW, doorX1: 17, doorX2: 18 };
const SHOP: Building    = { x: 27, y: 3, w: 5, h: 4, wallTile: W, floorTile: FW, doorX1: 29, doorX2: 30 };
const BUILDINGS = [GUILD, INN, SHOP];

function tileAt(x: number, y: number): number {
  // ── Roof rows (row 2 — one tile above building tops) ──
  for (const b of BUILDINGS) {
    if (y === b.y - 1 && x >= b.x && x < b.x + b.w) return R;
  }

  // ── Roof edge / overhang (top row of building = where roof meets wall) ──
  for (const b of BUILDINGS) {
    if (y === b.y && x >= b.x && x < b.x + b.w) return RE;
  }

  // ── Building interiors + walls ──
  for (const b of BUILDINGS) {
    if (inRect(x, y, b.x, b.y + 1, b.w, b.h - 1)) {
      const bottomRow = b.y + b.h - 1;
      // Side walls
      if (x === b.x || x === b.x + b.w - 1) return b.wallTile;
      // Bottom wall with door gap
      if (y === bottomRow) {
        if (x === b.doorX1 || x === b.doorX2) return D;
        return b.wallTile;
      }
      // Interior
      return b.floorTile;
    }
  }

  // ── Shadow strip below buildings ──
  for (const b of BUILDINGS) {
    const bottomRow = b.y + b.h;
    if (y === bottomRow && x >= b.x && x < b.x + b.w) {
      // Door opening — path, not shadow
      if (x === b.doorX1 || x === b.doorX2) return P;
      return SH;
    }
  }

  // ── Bushes flanking building sides ──
  for (const b of BUILDINGS) {
    if (y >= b.y && y <= b.y + b.h) {
      if (x === b.x - 1 || x === b.x + b.w) return BU;
    }
  }

  // ── Main east-west path (rows 8-10) ──
  if (y >= 8 && y <= 10) return P;

  // ── Path edges (row 7 and row 11 — grass/path blend) ──
  if (y === 7 || y === 11) return PE;

  // ── North-south connector paths to doors ──
  for (const b of BUILDINGS) {
    if ((x === b.doorX1 || x === b.doorX2) && y >= b.y + b.h && y <= 10) return P;
  }

  // ── Southern path to exit (center of map going south) ──
  if (x >= 19 && x <= 20 && y >= 10 && y <= 21) return P;
  // Path edges beside the southern path
  if ((x === 18 || x === 21) && y >= 11 && y <= 21) return PE;

  // ── Empty plot (fenced off area) ──
  if (inRect(x, y, 10, 14, 5, 3)) {
    // Fence border
    if (y === 14 || y === 16 || x === 10 || x === 14) return FN;
    return g;
  }

  // ── Town well (decorative landmark in the center) ──
  if (x === 13 && y === 9) return WL;

  // ── Scattered bushes for flavor ──
  if ((x === 2 && y === 5) || (x === 37 && y === 6) ||
      (x === 3 && y === 13) || (x === 36 && y === 14) ||
      (x === 1 && y === 19) || (x === 38 && y === 18) ||
      (x === 24 && y === 13) || (x === 34 && y === 9)) return BU;

  // ── Default grass — occasional light variant for texture ──
  return (x + y) % 7 === 0 || (x * 3 + y * 5) % 11 === 0 ? g : G;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
