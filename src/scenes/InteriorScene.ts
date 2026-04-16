import { useDialogueStore } from '../state/dialogueStore';
import { getDialogue } from '../engine/dialogues';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Generic interior scene — Pokemon/Zelda style. Room centered in viewport
 * with dark void around it. Each building has a unique tile-based layout
 * where furniture IS the tilemap (not rectangles on top).
 */

interface NpcDef { key: string; dialogueId: string; tileX: number; tileY: number; }
interface InteractableDef { tileX: number; tileY: number; label: string; dialogueId: string; }

interface InteriorLayout {
  name: string;
  roomW: number; roomH: number;
  tiles: number[][];
  /** Tile IDs that block the player (walls + furniture). */
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

    // Dark void.
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x080606);

    // Tilemap — furniture is IN the tilemap, not overlaid.
    const map = this.make.tilemap({ data: layout.tiles, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage('tileset')!;
    map.createLayer(0, tileset)!.setPosition(oX, oY);

    // Room label.
    this.add.text(WORLD_W / 2, oY - 12, layout.name, {
      fontFamily: 'Courier New', fontSize: '14px', color: '#d4a968',
      backgroundColor: 'rgba(10,6,6,0.7)', padding: { x: 8, y: 3 },
    }).setOrigin(0.5, 1).setDepth(20);

    // Collision from tile data — any tile in solidTiles gets an invisible wall.
    for (let ty = 0; ty < layout.roomH; ty++) {
      for (let tx = 0; tx < layout.roomW; tx++) {
        const t = layout.tiles[ty][tx];
        if (layout.solidTiles.has(t)) {
          this.ws(oX + tx * TILE, oY + ty * TILE, TILE, TILE);
        }
      }
    }

    // Void collision.
    this.ws(0, 0, WORLD_W, oY);
    this.ws(0, oY + roomPxH, WORLD_W, WORLD_H - oY - roomPxH);
    this.ws(0, 0, oX, WORLD_H);
    this.ws(oX + roomPxW, 0, WORLD_W - oX - roomPxW, WORLD_H);

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
        TILE - 4, TILE - 4, 0x000000, 0,
      );
      sprite.setDepth(5);
      const dlgId = ix.dialogueId;
      this.spawnInteractable({ sprite, label: ix.label, radius: 24,
        action: () => { useDialogueStore.getState().start(getDialogue(dlgId)); },
      });
    }

    // Exit door.
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
const WS = T.WALL_STONE;  const WW = T.WALL_WOOD;
const D  = T.DOOR;
const BK = T.BOOKSHELF;   const CT = T.COUNTER;
const BH = T.BED_HEAD;    const BF = T.BED_FOOT;
const TB = T.TABLE;        const CH = T.CHAIR;
const BA = T.BARREL;       const CR = T.CRATE;
const FP = T.FIREPLACE;    const PL = T.PLANT;
const RC = T.RUG_CENTER;   const RE = T.RUG_EDGE;
const WR = T.WEAPON_RACK;  const WN = T.WINDOW;
const TO = T.TORCH;        const DI = T.DISPLAY;

/** All tile IDs that block the player. */
const SOLID = new Set([WS, WW, BK, CT, BH, BF, TB, BA, CR, FP, PL, WR, DI]);

function getLayout(id: string): InteriorLayout {
  switch (id) {
    case 'guild': return guildLayout();
    case 'inn':   return innLayout();
    case 'shop':  return shopLayout();
    case 'orric': return orricLayout();
    default:      return guildLayout();
  }
}

// ─── Guild: 18×14 ──────────────────────────────────────────────

function guildLayout(): InteriorLayout {
  // Legend: WS=wall, FS/FW=floor, BK=bookshelf, CT=counter, TB=table,
  //         CH=chair, WR=weapon rack, PL=plant, RC/RE=rug, TO=torch
  const _ = FS; // default floor
  const f = FW; // alternate floor (checkerboard feel)
  const tiles: number[][] = [
    [WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS],
    [WS,TO,BK,BK,BK,BK,TO,_,f,_,f,TO,BK,BK,BK,BK,TO,WS],
    [WS,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,WS],
    [WS,_,CT,CT,CT,CT,CT,CT,CT,CT,CT,CT,CT,CT,CT,CT,_,WS],
    [WS,f,_,f,_,f,_,f,_,f,_,f,_,f,_,f,_,WS],
    [WS,_,f,_,f,_,f,_,f,_,f,_,f,_,f,_,f,WS],
    [WS,PL,_,TB,TB,TB,_,f,_,f,_,TB,TB,TB,_,PL,_,WS],
    [WS,_,_,CH,_,CH,_,_,f,_,f,CH,_,CH,_,_,f,WS],
    [WS,f,_,f,_,f,_,f,_,f,_,f,_,f,_,f,_,WS],
    [WS,_,f,_,f,RC,RC,RC,RC,RC,RC,RC,f,_,f,_,f,WS],
    [WS,WR,_,f,_,RC,RC,RC,RC,RC,RC,RC,_,f,_,BA,_,WS],
    [WS,_,f,_,f,RE,RE,RE,RE,RE,RE,RE,f,_,f,_,f,WS],
    [WS,PL,_,f,_,f,_,f,_,f,_,f,_,f,_,f,PL,WS],
    [WS,WS,WS,WS,WS,WS,WS,WS,D,D,WS,WS,WS,WS,WS,WS,WS,WS],
  ];

  return {
    name: "Adventurers' Guild", roomW: 18, roomH: 14, tiles,
    solidTiles: SOLID,
    npcs: [{ key: 'brenna', dialogueId: 'guild-greeting', tileX: 9, tileY: 2 }],
    interactables: [{ tileX: 14, tileY: 1, label: 'Read the quest board', dialogueId: 'guild-greeting' }],
    exitScene: 'TownScene', exitSpawn: 'fromGuildInterior',
  };
}

// ─── Inn: 16×12 ────────────────────────────────────────────────

function innLayout(): InteriorLayout {
  const _ = FW;
  const tiles: number[][] = [
    [WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW],
    [WW,TO,CT,CT,CT,CT,TO,_,FP,FP,_,TO,WN,BH,BH,WW],
    [WW,_,_,_,_,_,_,_,_,_,_,_,_,BF,BF,WW],
    [WW,_,_,_,_,_,_,_,_,_,_,_,_,_,_,WW],
    [WW,_,_,TB,TB,_,_,RC,RC,_,_,WN,_,BH,BH,WW],
    [WW,_,CH,TB,TB,CH,_,RC,RC,_,_,_,_,BF,BF,WW],
    [WW,_,CH,_,_,CH,_,RE,RE,_,_,_,_,_,_,WW],
    [WW,_,_,_,_,_,_,_,_,_,TB,TB,_,_,_,WW],
    [WW,PL,_,_,_,_,_,_,_,_,TB,TB,CH,_,PL,WW],
    [WW,BA,BA,_,_,_,_,_,_,_,_,_,_,_,BA,WW],
    [WW,CR,_,_,_,_,_,_,_,_,_,_,_,_,CR,WW],
    [WW,WW,WW,WW,WW,WW,WW,D,D,WW,WW,WW,WW,WW,WW,WW],
  ];

  return {
    name: 'Whispering Hollow Inn', roomW: 16, roomH: 12, tiles,
    solidTiles: SOLID,
    npcs: [{ key: 'tomas', dialogueId: 'tomas-greeting', tileX: 7, tileY: 2 }],
    interactables: [],
    exitScene: 'TownScene', exitSpawn: 'fromInnInterior',
  };
}

// ─── Shop: 14×12 ───────────────────────────────────────────────

function shopLayout(): InteriorLayout {
  const _ = FW;
  const tiles: number[][] = [
    [WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW],
    [WW,TO,BK,BK,BK,BK,TO,TO,BK,BK,BK,BK,TO,WW],
    [WW,_,_,_,_,_,_,_,_,_,_,_,_,WW],
    [WW,_,_,CT,CT,CT,CT,CT,CT,CT,CT,_,_,WW],
    [WW,WN,_,_,_,_,_,_,_,_,_,_,WN,WW],
    [WW,DI,_,_,_,_,_,_,_,_,_,_,DI,WW],
    [WW,DI,_,_,TB,TB,_,_,TB,TB,_,_,DI,WW],
    [WW,_,_,_,CH,_,_,_,_,CH,_,_,_,WW],
    [WW,PL,_,_,_,_,_,_,_,_,_,_,PL,WW],
    [WW,BA,CR,_,_,_,_,_,_,_,_,CR,BA,WW],
    [WW,BA,_,_,_,_,_,_,_,_,_,_,BA,WW],
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

// ─── Orric's Cabin: 12×10 ──────────────────────────────────────

function orricLayout(): InteriorLayout {
  const _ = FW;
  const tiles: number[][] = [
    [WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW],
    [WW,FP,FP,_,TO,_,_,TO,_,BH,BH,WW],
    [WW,_,_,_,_,_,_,_,_,BF,BF,WW],
    [WW,WR,_,_,TB,TB,_,_,_,_,_,WW],
    [WW,_,_,CH,TB,TB,CH,_,_,WN,_,WW],
    [WW,_,_,_,_,_,_,RC,RC,_,_,WW],
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
