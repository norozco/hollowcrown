import { useDialogueStore } from '../state/dialogueStore';
import { getDialogue } from '../engine/dialogues';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Generic interior scene. Loads a building-specific layout based on the
 * `spawnPoint` passed as scene data (e.g. "guild", "inn", "shop").
 *
 * The room is drawn centered in the viewport with dark void around it,
 * matching the ALTTP / Pokemon interior style. Each layout defines its
 * own tile grid, NPC placements, and interactables.
 */

interface NpcDef {
  key: string;
  dialogueId: string;
  tileX: number;
  tileY: number;
}

interface InteractableDef {
  tileX: number;
  tileY: number;
  label: string;
  dialogueId: string;
}

interface InteriorLayout {
  name: string;
  /** Room dimensions in tiles. */
  roomW: number;
  roomH: number;
  /** Tile data for the room (roomH rows × roomW cols). */
  tiles: number[][];
  npcs: NpcDef[];
  interactables: InteractableDef[];
  /** Where the exit door returns you to. */
  exitScene: string;
  exitSpawn: string;
}

// Tile aliases
const G  = T.GRASS_DARK;
const FS = T.FLOOR_STONE;
const FW = T.FLOOR_WOOD;
const S  = T.WALL_STONE;
const W  = T.WALL_WOOD;
const D  = T.DOOR;
const WA = T.WATER;
void G; void WA; // reserved

export class InteriorScene extends BaseWorldScene {
  constructor() {
    super({ key: 'InteriorScene' });
  }

  protected layout(): void {
    generateTileset(this);

    // Determine which building we're inside from the scene data.
    const data = this.scene.settings.data as { spawnPoint?: string } | undefined;
    const layoutId = data?.spawnPoint ?? 'guild';
    const layout = getLayout(layoutId);

    // Position the room centered in the viewport.
    const roomPxW = layout.roomW * TILE;
    const roomPxH = layout.roomH * TILE;
    const offsetX = Math.floor((WORLD_W - roomPxW) / 2);
    const offsetY = Math.floor((WORLD_H - roomPxH) / 2);

    // Dark void background.
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x0a0808);

    // Room tilemap.
    const map = this.make.tilemap({
      data: layout.tiles,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tileset')!;
    const layer = map.createLayer(0, tileset)!;
    layer.setPosition(offsetX, offsetY);

    // Room name label.
    this.add
      .text(WORLD_W / 2, offsetY - 12, layout.name, {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#d4a968',
        backgroundColor: 'rgba(10,6,6,0.7)',
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setDepth(20);

    // Wall collision — invisible segments around room border + internal walls.
    // Top wall
    this.addWallSegment(offsetX, offsetY, roomPxW, 6);
    // Left wall
    this.addWallSegment(offsetX, offsetY, 6, roomPxH);
    // Right wall
    this.addWallSegment(offsetX + roomPxW - 6, offsetY, 6, roomPxH);
    // Bottom wall — split around door (center 2 tiles)
    const doorLeft = offsetX + Math.floor((roomPxW - 2 * TILE) / 2);
    const doorRight = doorLeft + 2 * TILE;
    this.addWallSegment(offsetX, offsetY + roomPxH - 6, doorLeft - offsetX, 6);
    this.addWallSegment(doorRight, offsetY + roomPxH - 6, offsetX + roomPxW - doorRight, 6);

    // Internal walls from tile data (any WALL_STONE or WALL_WOOD tile that's
    // not on the border gets a collision body — acts as counters/shelves).
    for (let ty = 1; ty < layout.roomH - 1; ty++) {
      for (let tx = 1; tx < layout.roomW - 1; tx++) {
        const tile = layout.tiles[ty][tx];
        if (tile === S || tile === W) {
          this.addWallSegment(
            offsetX + tx * TILE,
            offsetY + ty * TILE,
            TILE,
            TILE,
          );
        }
      }
    }

    // Void collision — keep player inside the room.
    // Top void
    this.addWallSegment(0, 0, WORLD_W, offsetY);
    // Bottom void
    this.addWallSegment(0, offsetY + roomPxH, WORLD_W, WORLD_H - offsetY - roomPxH);
    // Left void
    this.addWallSegment(0, 0, offsetX, WORLD_H);
    // Right void
    this.addWallSegment(offsetX + roomPxW, 0, WORLD_W - offsetX - roomPxW, WORLD_H);

    // NPCs inside the building.
    for (const npc of layout.npcs) {
      this.spawnNpc({
        key: npc.key,
        dialogueId: npc.dialogueId,
        x: offsetX + npc.tileX * TILE + TILE / 2,
        y: offsetY + npc.tileY * TILE + TILE / 2,
      });
    }

    // Interactables (e.g. quest board).
    for (const ix of layout.interactables) {
      const sprite = this.add.rectangle(
        offsetX + ix.tileX * TILE + TILE / 2,
        offsetY + ix.tileY * TILE + TILE / 2,
        TILE - 4,
        TILE - 4,
        0x6a5a3a,
      );
      sprite.setStrokeStyle(1, 0x4a3a2a);
      sprite.setDepth(5);
      this.physics.add.existing(sprite, true);
      this.walls.add(sprite);

      const dlgId = ix.dialogueId;
      this.spawnInteractable({
        sprite,
        label: ix.label,
        radius: 24,
        action: () => {
          useDialogueStore.getState().start(getDialogue(dlgId));
        },
      });
    }

    // Exit door → back outside.
    this.addExit({
      x: doorLeft,
      y: offsetY + roomPxH - TILE,
      w: 2 * TILE,
      h: TILE + 16,
      targetScene: layout.exitScene,
      targetSpawn: layout.exitSpawn,
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    // All interiors spawn near the bottom door.
    const data = this.scene.settings.data as { spawnPoint?: string } | undefined;
    const layoutId = data?.spawnPoint ?? 'guild';
    const layout = getLayout(layoutId);
    const roomPxW = layout.roomW * TILE;
    const roomPxH = layout.roomH * TILE;
    const offsetX = Math.floor((WORLD_W - roomPxW) / 2);
    const offsetY = Math.floor((WORLD_H - roomPxH) / 2);

    void name; void offsetX;
    return {
      x: WORLD_W / 2,
      y: offsetY + roomPxH - TILE * 2,
    };
  }

  /** Expose addWallSegment publicly for layout use. */
  protected addWallSegment(x: number, y: number, w: number, h: number): void {
    if (w <= 0 || h <= 0) return;
    const wall = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0);
    this.physics.add.existing(wall, true);
    this.walls.add(wall);
  }
}

// ─── Layout definitions ────────────────────────────────────────

function getLayout(id: string): InteriorLayout {
  switch (id) {
    case 'guild':
      return guildLayout();
    case 'inn':
      return innLayout();
    case 'shop':
      return shopLayout();
    default:
      return guildLayout();
  }
}

function guildLayout(): InteriorLayout {
  // 16 wide × 12 tall room
  const w = 16, h = 12;
  const tiles: number[][] = [];

  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      // Walls on border
      if (y === 0 || x === 0 || x === w - 1) { row.push(S); continue; }
      if (y === h - 1) {
        // Bottom wall with door gap
        if (x === 7 || x === 8) { row.push(D); continue; }
        row.push(S);
        continue;
      }
      // Counter (wood wall tiles) across row 2
      if (y === 2 && x >= 2 && x <= 13) { row.push(W); continue; }
      // Quest board on the back wall (row 1)
      if (y === 1 && (x === 4 || x === 5)) { row.push(W); continue; }
      // Stone floor
      row.push(FS);
    }
    tiles.push(row);
  }

  return {
    name: "Adventurers' Guild",
    roomW: w,
    roomH: h,
    tiles,
    npcs: [
      { key: 'brenna', dialogueId: 'guild-greeting', tileX: 8, tileY: 1 },
    ],
    interactables: [
      { tileX: 12, tileY: 1, label: 'Read the quest board', dialogueId: 'guild-greeting' },
    ],
    exitScene: 'TownScene',
    exitSpawn: 'fromGuildInterior',
  };
}

function innLayout(): InteriorLayout {
  const w = 14, h = 10;
  const tiles: number[][] = [];

  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      if (y === 0 || x === 0 || x === w - 1) { row.push(W); continue; }
      if (y === h - 1) {
        if (x === 6 || x === 7) { row.push(D); continue; }
        row.push(W);
        continue;
      }
      // Counter at top
      if (y === 1 && x >= 2 && x <= 5) { row.push(W); continue; }
      // Beds on right side
      if (y >= 3 && y <= 4 && x >= 10 && x <= 12) { row.push(W); continue; }
      // Table center
      if (y >= 5 && y <= 6 && x >= 5 && x <= 7) { row.push(W); continue; }
      row.push(FW);
    }
    tiles.push(row);
  }

  return {
    name: 'Whispering Hollow Inn',
    roomW: w,
    roomH: h,
    tiles,
    npcs: [
      { key: 'tomas', dialogueId: 'tomas-greeting', tileX: 6, tileY: 1 },
    ],
    interactables: [],
    exitScene: 'TownScene',
    exitSpawn: 'fromInnInterior',
  };
}

function shopLayout(): InteriorLayout {
  const w = 12, h = 10;
  const tiles: number[][] = [];

  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      if (y === 0 || x === 0 || x === w - 1) { row.push(W); continue; }
      if (y === h - 1) {
        if (x === 5 || x === 6) { row.push(D); continue; }
        row.push(W);
        continue;
      }
      // Shelves along top wall
      if (y === 1 && x >= 2 && x <= 9) { row.push(W); continue; }
      // Counter
      if (y === 3 && x >= 3 && x <= 8) { row.push(W); continue; }
      // Barrel/crate in corner
      if (y >= 6 && y <= 7 && x >= 1 && x <= 2) { row.push(W); continue; }
      row.push(FW);
    }
    tiles.push(row);
  }

  return {
    name: 'General Store',
    roomW: w,
    roomH: h,
    tiles,
    npcs: [
      { key: 'vira', dialogueId: 'vira-greeting', tileX: 6, tileY: 2 },
    ],
    interactables: [],
    exitScene: 'TownScene',
    exitSpawn: 'fromShopInterior',
  };
}
