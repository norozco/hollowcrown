import { useDialogueStore } from '../state/dialogueStore';
import { getDialogue } from '../engine/dialogues';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Generic interior scene — Pokemon/Zelda style. Room centered in viewport
 * with dark void around it. Each building has a unique layout packed with
 * furniture, decorations, and NPCs.
 */

interface NpcDef { key: string; dialogueId: string; tileX: number; tileY: number; }
interface InteractableDef { tileX: number; tileY: number; label: string; dialogueId: string; }

/** Furniture = colored rectangle with collision, drawn on top of floor tiles. */
interface FurnitureDef {
  tileX: number; tileY: number;
  wTiles: number; hTiles: number;
  color: number;
  stroke?: number;
  depth?: number;
}

/** Decoration = small visual element, no collision (candles, rugs, patterns). */
interface DecorDef {
  tileX: number; tileY: number;
  wTiles: number; hTiles: number;
  color: number;
  alpha?: number;
  depth?: number;
}

interface InteriorLayout {
  name: string;
  roomW: number; roomH: number;
  tiles: number[][];
  npcs: NpcDef[];
  interactables: InteractableDef[];
  furniture: FurnitureDef[];
  decor: DecorDef[];
  exitScene: string;
  exitSpawn: string;
}

const FS = T.FLOOR_STONE;
const FW = T.FLOOR_WOOD;
const S  = T.WALL_STONE;
const W  = T.WALL_WOOD;
const D  = T.DOOR;

export class InteriorScene extends BaseWorldScene {
  constructor() { super({ key: 'InteriorScene' }); }

  protected layout(): void {
    generateTileset(this);
    const data = this.scene.settings.data as { spawnPoint?: string } | undefined;
    const layoutId = data?.spawnPoint ?? 'guild';
    const layout = getLayout(layoutId);

    const roomPxW = layout.roomW * TILE;
    const roomPxH = layout.roomH * TILE;
    const oX = Math.floor((WORLD_W - roomPxW) / 2);
    const oY = Math.floor((WORLD_H - roomPxH) / 2);

    // Dark void.
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x080606);

    // Tilemap.
    const map = this.make.tilemap({ data: layout.tiles, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage('tileset')!;
    map.createLayer(0, tileset)!.setPosition(oX, oY);

    // Room label.
    this.add.text(WORLD_W / 2, oY - 12, layout.name, {
      fontFamily: 'Courier New', fontSize: '14px', color: '#d4a968',
      backgroundColor: 'rgba(10,6,6,0.7)', padding: { x: 8, y: 3 },
    }).setOrigin(0.5, 1).setDepth(20);

    // Wall collision.
    this.ws(oX, oY, roomPxW, 6);
    this.ws(oX, oY, 6, roomPxH);
    this.ws(oX + roomPxW - 6, oY, 6, roomPxH);
    const dL = oX + Math.floor((roomPxW - 2 * TILE) / 2);
    const dR = dL + 2 * TILE;
    this.ws(oX, oY + roomPxH - 6, dL - oX, 6);
    this.ws(dR, oY + roomPxH - 6, oX + roomPxW - dR, 6);

    // Internal wall tiles → collision.
    for (let ty = 1; ty < layout.roomH - 1; ty++) {
      for (let tx = 1; tx < layout.roomW - 1; tx++) {
        const t = layout.tiles[ty][tx];
        if (t === S || t === W) this.ws(oX + tx * TILE, oY + ty * TILE, TILE, TILE);
      }
    }

    // Void collision.
    this.ws(0, 0, WORLD_W, oY);
    this.ws(0, oY + roomPxH, WORLD_W, WORLD_H - oY - roomPxH);
    this.ws(0, 0, oX, WORLD_H);
    this.ws(oX + roomPxW, 0, WORLD_W - oX - roomPxW, WORLD_H);

    // Furniture (collidable).
    for (const f of layout.furniture) {
      const fx = oX + f.tileX * TILE;
      const fy = oY + f.tileY * TILE;
      const fw = f.wTiles * TILE;
      const fh = f.hTiles * TILE;
      const furn = this.add.rectangle(fx + fw / 2, fy + fh / 2, fw - 2, fh - 2, f.color);
      furn.setStrokeStyle(1, f.stroke ?? 0x3a2a1a);
      furn.setDepth(f.depth ?? 3);
      this.physics.add.existing(furn, true);
      this.walls.add(furn);
    }

    // Decorations (no collision, just visual).
    for (const d of layout.decor) {
      const dx = oX + d.tileX * TILE;
      const dy = oY + d.tileY * TILE;
      const dw = d.wTiles * TILE;
      const dh = d.hTiles * TILE;
      const dec = this.add.rectangle(dx + dw / 2, dy + dh / 2, dw, dh, d.color);
      dec.setAlpha(d.alpha ?? 1);
      dec.setDepth(d.depth ?? 2);
    }

    // NPCs.
    for (const npc of layout.npcs) {
      this.spawnNpc({
        key: npc.key, dialogueId: npc.dialogueId,
        x: oX + npc.tileX * TILE + TILE / 2,
        y: oY + npc.tileY * TILE + TILE / 2,
      });
    }

    // Interactables.
    for (const ix of layout.interactables) {
      const sprite = this.add.rectangle(
        oX + ix.tileX * TILE + TILE / 2, oY + ix.tileY * TILE + TILE / 2,
        TILE - 4, TILE - 4, 0x6a5a3a,
      );
      sprite.setStrokeStyle(1, 0x4a3a2a); sprite.setDepth(5);
      this.physics.add.existing(sprite, true);
      this.walls.add(sprite);
      const dlgId = ix.dialogueId;
      this.spawnInteractable({ sprite, label: ix.label, radius: 24,
        action: () => { useDialogueStore.getState().start(getDialogue(dlgId)); },
      });
    }

    // Exit door.
    this.addExit({ x: dL, y: oY + roomPxH - TILE, w: 2 * TILE, h: TILE + 16,
      targetScene: layout.exitScene, targetSpawn: layout.exitSpawn });
  }

  protected spawnAt(_name: string): { x: number; y: number } {
    const data = this.scene.settings.data as { spawnPoint?: string } | undefined;
    const layout = getLayout(data?.spawnPoint ?? 'guild');
    const oY = Math.floor((WORLD_H - layout.roomH * TILE) / 2);
    return { x: WORLD_W / 2, y: oY + layout.roomH * TILE - TILE * 2 };
  }

  private ws(x: number, y: number, w: number, h: number): void {
    if (w <= 0 || h <= 0) return;
    const wall = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0);
    this.physics.add.existing(wall, true);
    this.walls.add(wall);
  }
}

// ─── Colors ────────────────────────────────────────────────────

const C = {
  TABLE:     0xc0a060,
  SHELF:     0x604828,
  SHELF_BK:  0x4060a0,
  BED_SHEET: 0xe0d0b0,
  BED_FRAME: 0x805040,
  FIRE_STONE:0x484848,
  FIRE_GLOW: 0xe06020,
  RUG:       0xa03030,
  RUG_GOLD:  0xc08830,
  BARREL:    0x705030,
  PLANT_POT: 0x604020,
  PLANT_GRN: 0x30a030,
  BENCH:     0x907040,
  CANDLE:    0xe0c020,
  WEAPON:    0x606868,
  DISPLAY:   0xa0c0d0,
  COUNTER:   0x886838,
};

// ─── Layouts ───────────────────────────────────────────────────

function getLayout(id: string): InteriorLayout {
  switch (id) {
    case 'guild': return guildLayout();
    case 'inn':   return innLayout();
    case 'shop':  return shopLayout();
    case 'orric': return orricLayout();
    default:      return guildLayout();
  }
}

function makeFloor(w: number, h: number, wallTile: number, floorTile: number, doorX1: number, doorX2: number, altFloor?: number): number[][] {
  const tiles: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      if (y === 0 || x === 0 || x === w - 1) { row.push(wallTile); continue; }
      if (y === h - 1) {
        if (x === doorX1 || x === doorX2) { row.push(D); continue; }
        row.push(wallTile); continue;
      }
      // Checkerboard pattern if altFloor provided.
      if (altFloor !== undefined && (x + y) % 2 === 0) { row.push(altFloor); continue; }
      row.push(floorTile);
    }
    tiles.push(row);
  }
  return tiles;
}

function guildLayout(): InteriorLayout {
  const w = 18, h = 14;
  const tiles = makeFloor(w, h, S, FS, 8, 9, T.FLOOR_WOOD);
  // Back wall shelf row
  for (let x = 2; x < w - 2; x++) tiles[1][x] = S;

  return {
    name: "Adventurers' Guild", roomW: w, roomH: h, tiles,
    npcs: [
      { key: 'brenna', dialogueId: 'guild-greeting', tileX: 9, tileY: 2 },
    ],
    interactables: [
      { tileX: 15, tileY: 2, label: 'Read the quest board', dialogueId: 'guild-greeting' },
    ],
    furniture: [
      // Long counter
      { tileX: 3, tileY: 3, wTiles: 12, hTiles: 1, color: C.COUNTER },
      // Bookshelves on left wall
      { tileX: 1, tileY: 2, wTiles: 1, hTiles: 3, color: C.SHELF },
      { tileX: 1, tileY: 6, wTiles: 1, hTiles: 3, color: C.SHELF },
      // Weapon rack on right wall
      { tileX: w - 2, tileY: 3, wTiles: 1, hTiles: 3, color: C.WEAPON },
      // Tables with benches (seating area)
      { tileX: 4, tileY: 7, wTiles: 3, hTiles: 2, color: C.TABLE },
      { tileX: 4, tileY: 9, wTiles: 3, hTiles: 1, color: C.BENCH, stroke: 0x705030 },
      { tileX: 11, tileY: 7, wTiles: 3, hTiles: 2, color: C.TABLE },
      { tileX: 11, tileY: 9, wTiles: 3, hTiles: 1, color: C.BENCH, stroke: 0x705030 },
      // Barrel in corner
      { tileX: w - 2, tileY: h - 3, wTiles: 1, hTiles: 1, color: C.BARREL },
      // Plant near entrance
      { tileX: 1, tileY: h - 3, wTiles: 1, hTiles: 1, color: C.PLANT_POT },
    ],
    decor: [
      // Entrance rug
      { tileX: 7, tileY: h - 3, wTiles: 4, hTiles: 2, color: C.RUG, alpha: 0.5 },
      // Rug gold border
      { tileX: 7, tileY: h - 3, wTiles: 4, hTiles: 1, color: C.RUG_GOLD, alpha: 0.3 },
      // Candles on counter
      { tileX: 5, tileY: 3, wTiles: 0.3, hTiles: 0.3, color: C.CANDLE },
      { tileX: 10, tileY: 3, wTiles: 0.3, hTiles: 0.3, color: C.CANDLE },
      { tileX: 14, tileY: 3, wTiles: 0.3, hTiles: 0.3, color: C.CANDLE },
      // Plant green (on top of pot)
      { tileX: 1, tileY: h - 3.4, wTiles: 1, hTiles: 0.6, color: C.PLANT_GRN },
      // Book spines on shelves
      { tileX: 1.1, tileY: 2.2, wTiles: 0.8, hTiles: 0.6, color: C.SHELF_BK, alpha: 0.8 },
      { tileX: 1.1, tileY: 6.2, wTiles: 0.8, hTiles: 0.6, color: C.SHELF_BK, alpha: 0.8 },
    ],
    exitScene: 'TownScene', exitSpawn: 'fromGuildInterior',
  };
}

function innLayout(): InteriorLayout {
  const w = 16, h = 12;
  const tiles = makeFloor(w, h, W, FW, 7, 8);

  return {
    name: 'Whispering Hollow Inn', roomW: w, roomH: h, tiles,
    npcs: [
      { key: 'tomas', dialogueId: 'tomas-greeting', tileX: 4, tileY: 2 },
    ],
    interactables: [],
    furniture: [
      // Counter (top left)
      { tileX: 2, tileY: 2, wTiles: 4, hTiles: 1, color: C.COUNTER },
      // Fireplace (back wall center)
      { tileX: 7, tileY: 1, wTiles: 2, hTiles: 1, color: C.FIRE_STONE, stroke: 0x303030 },
      // Beds (right side, two beds stacked)
      { tileX: w - 4, tileY: 2, wTiles: 3, hTiles: 2, color: C.BED_FRAME },
      { tileX: w - 4, tileY: 5, wTiles: 3, hTiles: 2, color: C.BED_FRAME },
      // Dining table center
      { tileX: 5, tileY: 5, wTiles: 3, hTiles: 2, color: C.TABLE },
      // Stools around table
      { tileX: 4, tileY: 5, wTiles: 1, hTiles: 1, color: C.BENCH, stroke: 0x705030 },
      { tileX: 4, tileY: 6, wTiles: 1, hTiles: 1, color: C.BENCH, stroke: 0x705030 },
      { tileX: 8, tileY: 5, wTiles: 1, hTiles: 1, color: C.BENCH, stroke: 0x705030 },
      // Barrels in corner
      { tileX: 1, tileY: h - 3, wTiles: 1, hTiles: 1, color: C.BARREL },
      { tileX: 2, tileY: h - 3, wTiles: 1, hTiles: 1, color: C.BARREL },
      // Plant
      { tileX: w - 2, tileY: h - 3, wTiles: 1, hTiles: 1, color: C.PLANT_POT },
    ],
    decor: [
      // Fire glow
      { tileX: 7.2, tileY: 1.2, wTiles: 1.6, hTiles: 0.6, color: C.FIRE_GLOW, alpha: 0.7 },
      // Fireplace warmth on floor
      { tileX: 6, tileY: 2, wTiles: 4, hTiles: 2, color: C.FIRE_GLOW, alpha: 0.08 },
      // Bed sheets (lighter layer on bed frames)
      { tileX: w - 3.8, tileY: 2.2, wTiles: 2.6, hTiles: 1.6, color: C.BED_SHEET, alpha: 0.7 },
      { tileX: w - 3.8, tileY: 5.2, wTiles: 2.6, hTiles: 1.6, color: C.BED_SHEET, alpha: 0.7 },
      // Rug by fireplace
      { tileX: 6, tileY: 4, wTiles: 4, hTiles: 2, color: C.RUG, alpha: 0.35 },
      // Entrance mat
      { tileX: 6, tileY: h - 3, wTiles: 4, hTiles: 2, color: C.RUG_GOLD, alpha: 0.25 },
      // Plant green
      { tileX: w - 2, tileY: h - 3.4, wTiles: 1, hTiles: 0.6, color: C.PLANT_GRN },
      // Candle on counter
      { tileX: 3, tileY: 2, wTiles: 0.3, hTiles: 0.3, color: C.CANDLE },
    ],
    exitScene: 'TownScene', exitSpawn: 'fromInnInterior',
  };
}

function shopLayout(): InteriorLayout {
  const w = 14, h = 12;
  const tiles = makeFloor(w, h, W, FW, 6, 7);

  return {
    name: 'General Store', roomW: w, roomH: h, tiles,
    npcs: [
      { key: 'vira', dialogueId: 'vira-greeting', tileX: 7, tileY: 2 },
    ],
    interactables: [],
    furniture: [
      // Shelves along back wall
      { tileX: 1, tileY: 1, wTiles: 5, hTiles: 1, color: C.SHELF },
      { tileX: 8, tileY: 1, wTiles: 5, hTiles: 1, color: C.SHELF },
      // Counter
      { tileX: 3, tileY: 3, wTiles: 8, hTiles: 1, color: C.COUNTER },
      // Display case (left)
      { tileX: 1, tileY: 5, wTiles: 2, hTiles: 3, color: C.DISPLAY, stroke: 0x708090 },
      // Display case (right)
      { tileX: w - 3, tileY: 5, wTiles: 2, hTiles: 3, color: C.DISPLAY, stroke: 0x708090 },
      // Crates in corners
      { tileX: 1, tileY: h - 3, wTiles: 1, hTiles: 1, color: C.BARREL },
      { tileX: 2, tileY: h - 3, wTiles: 1, hTiles: 1, color: C.BARREL },
      { tileX: 1, tileY: h - 4, wTiles: 1, hTiles: 1, color: C.BARREL },
      { tileX: w - 2, tileY: h - 3, wTiles: 1, hTiles: 1, color: C.BARREL },
      // Table center
      { tileX: 5, tileY: 6, wTiles: 3, hTiles: 2, color: C.TABLE },
      // Plants
      { tileX: w - 2, tileY: h - 4, wTiles: 1, hTiles: 1, color: C.PLANT_POT },
    ],
    decor: [
      // Book spines on shelves
      { tileX: 1.2, tileY: 1.2, wTiles: 4.6, hTiles: 0.6, color: C.SHELF_BK, alpha: 0.8 },
      { tileX: 8.2, tileY: 1.2, wTiles: 4.6, hTiles: 0.6, color: C.SHELF_BK, alpha: 0.8 },
      // Scale on counter
      { tileX: 6, tileY: 3, wTiles: 0.6, hTiles: 0.6, color: C.WEAPON, alpha: 0.9 },
      // Candles
      { tileX: 4, tileY: 3, wTiles: 0.3, hTiles: 0.3, color: C.CANDLE },
      { tileX: 9, tileY: 3, wTiles: 0.3, hTiles: 0.3, color: C.CANDLE },
      // Entrance mat
      { tileX: 5, tileY: h - 3, wTiles: 4, hTiles: 2, color: C.RUG_GOLD, alpha: 0.25 },
      // Plant green
      { tileX: w - 2, tileY: h - 4.4, wTiles: 1, hTiles: 0.6, color: C.PLANT_GRN },
    ],
    exitScene: 'TownScene', exitSpawn: 'fromShopInterior',
  };
}

function orricLayout(): InteriorLayout {
  const w = 12, h = 10;
  const tiles = makeFloor(w, h, W, FW, 5, 6);

  return {
    name: "Orric's Cabin", roomW: w, roomH: h, tiles,
    npcs: [
      { key: 'orric', dialogueId: 'orric-greeting', tileX: 3, tileY: 3 },
    ],
    interactables: [],
    furniture: [
      // Fireplace (back wall left)
      { tileX: 1, tileY: 1, wTiles: 3, hTiles: 1, color: C.FIRE_STONE, stroke: 0x303030 },
      // Bed (right wall)
      { tileX: w - 4, tileY: 1, wTiles: 3, hTiles: 2, color: C.BED_FRAME },
      // Work table
      { tileX: 5, tileY: 4, wTiles: 3, hTiles: 2, color: C.TABLE },
      // Weapon rack (axe on wall — left side)
      { tileX: 1, tileY: 4, wTiles: 1, hTiles: 2, color: C.WEAPON },
      // Barrel corner
      { tileX: w - 2, tileY: h - 3, wTiles: 1, hTiles: 1, color: C.BARREL },
      // Stool near table
      { tileX: 4, tileY: 5, wTiles: 1, hTiles: 1, color: C.BENCH, stroke: 0x705030 },
    ],
    decor: [
      // Fire glow
      { tileX: 1.3, tileY: 1.2, wTiles: 2.4, hTiles: 0.6, color: C.FIRE_GLOW, alpha: 0.7 },
      // Fire warmth
      { tileX: 1, tileY: 2, wTiles: 4, hTiles: 2, color: C.FIRE_GLOW, alpha: 0.06 },
      // Bed sheets
      { tileX: w - 3.8, tileY: 1.2, wTiles: 2.6, hTiles: 1.6, color: C.BED_SHEET, alpha: 0.7 },
      // Fur rug
      { tileX: 3, tileY: 6, wTiles: 4, hTiles: 2, color: 0x705840, alpha: 0.4 },
      // Herbs hanging above table (dark green splotches)
      { tileX: 5.5, tileY: 3.5, wTiles: 0.5, hTiles: 0.5, color: C.PLANT_GRN, alpha: 0.8 },
      { tileX: 6.5, tileY: 3.3, wTiles: 0.4, hTiles: 0.6, color: 0x208018, alpha: 0.8 },
      { tileX: 7.2, tileY: 3.5, wTiles: 0.5, hTiles: 0.5, color: C.PLANT_GRN, alpha: 0.8 },
      // Candle on table
      { tileX: 6, tileY: 4, wTiles: 0.3, hTiles: 0.3, color: C.CANDLE },
      // Window (lighter rectangle on right wall — suggestion of light)
      { tileX: w - 2, tileY: 4, wTiles: 1, hTiles: 2, color: 0xc0d0e0, alpha: 0.2 },
    ],
    exitScene: 'GreenhollowScene', exitSpawn: 'fromOrricInterior',
  };
}
