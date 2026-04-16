import { useDialogueStore } from '../state/dialogueStore';
import { getDialogue } from '../engine/dialogues';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

interface NpcDef { key: string; dialogueId: string; tileX: number; tileY: number; }
interface InteractableDef { tileX: number; tileY: number; label: string; dialogueId: string; }

interface InteriorLayout {
  name: string;
  roomW: number; roomH: number;
  tiles: number[][];
  solidTiles: Set<number>;
  npcs: NpcDef[];
  interactables: InteractableDef[];
  exitScene: string;
  exitSpawn: string;
}

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

    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x080606);

    const map = this.make.tilemap({ data: layout.tiles, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage('tileset')!;
    map.createLayer(0, tileset)!.setPosition(oX, oY);

    this.add.text(WORLD_W / 2, oY - 12, layout.name, {
      fontFamily: 'Courier New', fontSize: '14px', color: '#d4a968',
      backgroundColor: 'rgba(10,6,6,0.7)', padding: { x: 8, y: 3 },
    }).setOrigin(0.5, 1).setDepth(20);

    // Collision from tile data.
    for (let ty = 0; ty < layout.roomH; ty++) {
      for (let tx = 0; tx < layout.roomW; tx++) {
        if (layout.solidTiles.has(layout.tiles[ty][tx])) {
          this.ws(oX + tx * TILE, oY + ty * TILE, TILE, TILE);
        }
      }
    }

    // Void collision.
    this.ws(0, 0, WORLD_W, oY);
    this.ws(0, oY + roomPxH, WORLD_W, WORLD_H - oY - roomPxH);
    this.ws(0, 0, oX, WORLD_H);
    this.ws(oX + roomPxW, 0, WORLD_W - oX - roomPxW, WORLD_H);

    for (const npc of layout.npcs) {
      this.spawnNpc({ key: npc.key, dialogueId: npc.dialogueId,
        x: oX + npc.tileX * TILE + TILE / 2, y: oY + npc.tileY * TILE + TILE / 2 });
    }

    for (const ix of layout.interactables) {
      const sprite = this.add.rectangle(
        oX + ix.tileX * TILE + TILE / 2, oY + ix.tileY * TILE + TILE / 2,
        TILE - 4, TILE - 4, 0x000000, 0);
      sprite.setDepth(5);
      const dlgId = ix.dialogueId;
      this.spawnInteractable({ sprite, label: ix.label, radius: 24,
        action: () => { useDialogueStore.getState().start(getDialogue(dlgId)); } });
    }

    const dL = oX + Math.floor((roomPxW - 2 * TILE) / 2);
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

// ─── Tile aliases ──────────────────────────────────────────────

const FS = T.FLOOR_STONE; const FW = T.FLOOR_WOOD;
const WS = T.WALL_STONE;  const WW = T.WALL_WOOD;  const D  = T.DOOR;
const BK = T.BOOKSHELF;   const CT = T.COUNTER;
const BH = T.BED_HEAD;    const BF = T.BED_FOOT;
const TB = T.TABLE;        const CH = T.CHAIR;
const BA = T.BARREL;       const CR = T.CRATE;
const FP = T.FIREPLACE;    const PL = T.PLANT;
const RC = T.RUG_CENTER;   const RE = T.RUG_EDGE;
const WR = T.WEAPON_RACK;  const WN = T.WINDOW;
const TO = T.TORCH;        const DI = T.DISPLAY;

/** ALL tiles that block the player — includes wall-mounted items. */
const SOLID = new Set([
  WS, WW, BK, CT, BH, BF, TB, BA, CR, FP, PL, WR, DI,
  CH, TO, WN, // chairs block, torches/windows are wall-mounted (solid)
]);

function getLayout(id: string): InteriorLayout {
  switch (id) {
    case 'guild': return guildLayout();
    case 'inn':   return innLayout();
    case 'shop':  return shopLayout();
    case 'orric': return orricLayout();
    default:      return guildLayout();
  }
}

// ═══════════════════════════════════════════════════════════════
// Each building has UNIQUE furniture matching its function.
// No copy-paste. A guild is not a library. An inn is not a shop.
// ═══════════════════════════════════════════════════════════════

// ─── GUILD: Adventurers' headquarters ──────────────────────────
// Weapon racks, quest board, rough dining tables, battle trophies.
// NO bookshelves — adventurers fight, they don't read.

function guildLayout(): InteriorLayout {
  const _ = FS; const f = FW;
  const tiles: number[][] = [
    [WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS],
    [WS,TO,WR,WR,WR,TO,_,f,_,f,_,TO,WR,WR,DI,DI,TO,WS],  // weapons + trophy display
    [WS,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,WS],
    [WS,_,CT,CT,CT,CT,CT,CT,CT,CT,CT,CT,CT,CT,_,_,_,WS],  // long counter
    [WS,f,_,f,_,f,_,f,_,f,_,f,_,f,_,f,_,WS],
    [WS,_,f,_,f,_,f,_,f,_,f,_,f,_,f,_,f,WS],
    [WS,BA,_,TB,TB,TB,_,f,_,f,_,TB,TB,TB,_,CR,_,WS],  // dining tables + supplies
    [WS,BA,_,CH,_,CH,_,_,f,_,f,CH,_,CH,_,CR,f,WS],
    [WS,f,_,f,_,f,_,f,_,f,_,f,_,f,_,f,_,WS],
    [WS,WN,f,_,f,RC,RC,RC,RC,RC,RC,RC,f,_,f,WN,f,WS],  // windows ON walls
    [WS,_,_,f,_,RC,RC,RC,RC,RC,RC,RC,_,f,_,_,_,WS],
    [WS,WN,f,_,f,RE,RE,RE,RE,RE,RE,RE,f,_,f,WN,f,WS],  // windows ON walls
    [WS,PL,_,f,_,f,_,f,_,f,_,f,_,f,_,f,PL,WS],
    [WS,WS,WS,WS,WS,WS,WS,WS,D,D,WS,WS,WS,WS,WS,WS,WS,WS],
  ];

  return {
    name: "Adventurers' Guild", roomW: 18, roomH: 14, tiles,
    solidTiles: SOLID,
    npcs: [{ key: 'brenna', dialogueId: 'guild-greeting', tileX: 9, tileY: 2 }],
    interactables: [{ tileX: 14, tileY: 1, label: 'Examine the trophy case', dialogueId: 'guild-greeting' }],
    exitScene: 'TownScene', exitSpawn: 'fromGuildInterior',
  };
}

// ─── INN: Rest and warmth ──────────────────────────────────────
// Fireplace, beds, dining area, ale barrels. A place to sleep.
// NO weapons, no bookshelves — just comfort and food.

function innLayout(): InteriorLayout {
  const _ = FW;
  const tiles: number[][] = [
    [WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW],
    [WW,TO,_,_,_,_,_,FP,FP,_,_,_,_,_,TO,WW],  // fireplace center
    [WW,_,_,_,_,_,_,_,_,_,_,_,_,_,_,WW],
    [WW,WN,CT,CT,CT,_,_,_,_,_,_,BH,BH,_,WN,WW],  // counter left, beds right, windows ON walls
    [WW,_,_,_,_,_,_,RC,RC,_,_,BF,BF,_,_,WW],
    [WW,_,_,_,_,_,_,RC,RC,_,_,_,_,_,_,WW],
    [WW,WN,TB,TB,_,_,_,RE,RE,_,_,BH,BH,_,WN,WW],  // dining table, more beds, windows
    [WW,_,CH,CH,_,_,_,_,_,_,_,BF,BF,_,_,WW],
    [WW,_,_,_,_,_,_,_,_,_,_,_,_,_,_,WW],
    [WW,BA,BA,_,_,_,_,_,_,_,_,_,_,PL,BA,WW],  // ale barrels
    [WW,CR,_,_,_,_,_,_,_,_,_,_,_,_,CR,WW],
    [WW,WW,WW,WW,WW,WW,WW,D,D,WW,WW,WW,WW,WW,WW,WW],
  ];

  return {
    name: 'Whispering Hollow Inn', roomW: 16, roomH: 12, tiles,
    solidTiles: SOLID,
    npcs: [{ key: 'tomas', dialogueId: 'tomas-greeting', tileX: 5, tileY: 2 }],
    interactables: [],
    exitScene: 'TownScene', exitSpawn: 'fromInnInterior',
  };
}

// ─── SHOP: Trade goods and supplies ────────────────────────────
// Merchandise shelves, display cases, scales, crates of stock.
// NO beds, no fireplace, no weapons — this is commerce.

function shopLayout(): InteriorLayout {
  const _ = FW;
  const tiles: number[][] = [
    [WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW],
    [WW,TO,DI,DI,DI,DI,TO,TO,DI,DI,DI,DI,TO,WW],  // display shelves (merchandise, NOT books)
    [WW,_,_,_,_,_,_,_,_,_,_,_,_,WW],
    [WW,_,_,CT,CT,CT,CT,CT,CT,CT,CT,_,_,WW],  // counter with scale
    [WW,WN,_,_,_,_,_,_,_,_,_,_,WN,WW],  // windows ON walls
    [WW,CR,_,_,_,_,_,_,_,_,_,_,CR,WW],  // crates of goods along walls
    [WW,CR,_,_,TB,_,_,_,_,TB,_,_,CR,WW],  // small tables for examining goods
    [WW,WN,_,_,_,_,_,_,_,_,_,_,WN,WW],  // windows
    [WW,BA,_,_,_,_,_,_,_,_,_,_,BA,WW],  // barrels of supplies
    [WW,BA,CR,_,_,_,_,_,_,_,_,CR,BA,WW],
    [WW,PL,_,_,_,_,_,_,_,_,_,_,PL,WW],
    [WW,WW,WW,WW,WW,WW,D,D,WW,WW,WW,WW,WW,WW],
  ];

  return {
    name: 'General Store', roomW: 14, roomH: 12, tiles,
    solidTiles: SOLID,
    npcs: [{ key: 'vira', dialogueId: 'vira-greeting', tileX: 7, tileY: 2 }],
    interactables: [],
    exitScene: 'TownScene', exitSpawn: 'fromShopInterior',
  };
}

// ─── ORRIC'S CABIN: A forester's home ──────────────────────────
// Fireplace, a single bed, work table with herbs, axe on the wall.
// Rustic and small — one man's home in the woods.

function orricLayout(): InteriorLayout {
  const _ = FW;
  const tiles: number[][] = [
    [WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW],
    [WW,FP,FP,_,TO,_,_,TO,_,BH,BH,WW],   // fireplace + bed
    [WW,_,_,_,_,_,_,_,_,BF,BF,WW],
    [WW,WR,_,_,TB,TB,_,_,_,_,WN,WW],      // axe rack + table + window ON wall
    [WW,_,_,CH,_,_,CH,_,_,_,_,WW],
    [WW,WN,_,_,_,_,_,RC,RC,_,_,WW],        // window ON wall + rug
    [WW,_,_,_,_,_,_,RC,RC,_,_,WW],
    [WW,PL,_,_,_,_,_,RE,RE,_,BA,WW],
    [WW,CR,_,_,_,_,_,_,_,_,CR,WW],
    [WW,WW,WW,WW,WW,D,D,WW,WW,WW,WW,WW],
  ];

  return {
    name: "Orric's Cabin", roomW: 12, roomH: 10, tiles,
    solidTiles: SOLID,
    npcs: [{ key: 'orric', dialogueId: 'orric-greeting', tileX: 5, tileY: 3 }],
    interactables: [],
    exitScene: 'GreenhollowScene', exitSpawn: 'fromOrricInterior',
  };
}
