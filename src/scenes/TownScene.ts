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

// prettier-ignore
const MAP_DATA: number[][] = buildMapData();

export class TownScene extends BaseWorldScene {
  constructor() {
    super({ key: 'TownScene' });
  }

  protected layout(): void {
    // Generate the pixel-art tileset (idempotent).
    generateTileset(this);

    // Build and render the tilemap.
    const map = this.make.tilemap({
      data: MAP_DATA,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tileset')!;
    map.createLayer(0, tileset)!;

    // Buildings — invisible collision only; tilemap handles visuals.
    const guildDoor = this.addBuilding({
      xTile: 5,
      yTile: 3,
      wTile: 6,
      hTile: 4,
      color: 0x4a2e1a,
      label: "Adventurers' Guild",
      doorSide: 'bottom',
      visual: false,
    }).doorOutside;

    const innDoor = this.addBuilding({
      xTile: 15,
      yTile: 3,
      wTile: 6,
      hTile: 4,
      color: 0x3a2a30,
      label: 'Whispering Hollow Inn',
      doorSide: 'bottom',
      visual: false,
    }).doorOutside;

    const shopDoor = this.addBuilding({
      xTile: 27,
      yTile: 3,
      wTile: 5,
      hTile: 4,
      color: 0x3a3420,
      label: 'General Store',
      doorSide: 'bottom',
      visual: false,
    }).doorOutside;

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

    // NPCs — beside their doors.
    this.spawnNpc({
      key: 'brenna',
      dialogueId: 'guild-greeting',
      x: guildDoor.x + TILE,
      y: guildDoor.y,
    });
    this.spawnNpc({
      key: 'tomas',
      dialogueId: 'tomas-greeting',
      x: innDoor.x + TILE,
      y: innDoor.y,
    });
    this.spawnNpc({
      key: 'vira',
      dialogueId: 'vira-greeting',
      x: shopDoor.x + TILE,
      y: shopDoor.y,
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
      case 'default':
      default:
        return { x: WORLD_W / 2, y: 16 * TILE };
    }
  }
}

// ─── Map data builder ──────────────────────────────────────────

function buildMapData(): number[][] {
  const G = T.GRASS_DARK;
  const g = T.GRASS_LIGHT;
  const P = T.PATH;
  const S = T.WALL_STONE;
  const W = T.WALL_WOOD;
  const D = T.DOOR;
  const F = T.FLOOR_WOOD;
  const f = T.FLOOR_STONE;

  const rows: number[][] = [];
  for (let y = 0; y < MAP_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_W; x++) {
      row.push(tileAt(x, y, G, g, P, S, W, D, F, f));
    }
    rows.push(row);
  }
  return rows;
}

function tileAt(
  x: number,
  y: number,
  G: number,
  g: number,
  P: number,
  S: number,
  W: number,
  D: number,
  F: number,
  f: number,
): number {
  // ── Guild: tiles (5,3) to (10,6), door at (7-8, 7) ──
  if (inRect(x, y, 5, 3, 6, 4)) {
    if (y === 3 || y === 6) return S;          // top/bottom wall
    if (x === 5 || x === 10) return S;         // side walls
    if (y === 6 && (x === 7 || x === 8)) return D; // door
    return f;                                   // interior
  }
  // Door opening below guild
  if (y === 7 && (x === 7 || x === 8)) return P;

  // ── Inn: tiles (15,3) to (20,6) ──
  if (inRect(x, y, 15, 3, 6, 4)) {
    if (y === 3 || y === 6) return W;
    if (x === 15 || x === 20) return W;
    if (y === 6 && (x === 17 || x === 18)) return D;
    return F;
  }
  if (y === 7 && (x === 17 || x === 18)) return P;

  // ── General Store: tiles (27,3) to (31,6) ──
  if (inRect(x, y, 27, 3, 5, 4)) {
    if (y === 3 || y === 6) return W;
    if (x === 27 || x === 31) return W;
    if (y === 6 && (x === 29 || x === 30)) return D;
    return F;
  }
  if (y === 7 && (x === 29 || x === 30)) return P;

  // ── Empty plot outline (grass-light border) ──
  if (inRect(x, y, 10, 14, 5, 3)) {
    if (y === 14 || y === 16 || x === 10 || x === 14) return g;
    return g;
  }

  // ── Main east-west path through town ──
  if (y >= 8 && y <= 10) return P;

  // ── North-south connector paths to doors ──
  if (x >= 7 && x <= 8 && y >= 7 && y <= 10) return P;
  if (x >= 17 && x <= 18 && y >= 7 && y <= 10) return P;
  if (x >= 29 && x <= 30 && y >= 7 && y <= 10) return P;

  // ── Southern path to exit ──
  if (x >= 19 && x <= 20 && y >= 10 && y <= 21) return P;

  // ── Path-edge grass light ──
  if (y === 7 || y === 11) return g;
  if ((x === 6 || x === 9) && y >= 7 && y <= 10) return g;
  if ((x === 16 || x === 19) && y >= 7 && y <= 10) return g;
  if ((x === 28 || x === 31) && y >= 7 && y <= 10) return g;
  if ((x === 18 || x === 21) && y >= 10 && y <= 21) return g;

  // ── Default: alternating grass ──
  return (x + y) % 7 === 0 ? g : G;
}

function inRect(
  x: number,
  y: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
