import { useDialogueStore } from '../state/dialogueStore';
import { getDialogue } from '../engine/dialogues';
import { useInventoryStore } from '../state/inventoryStore';
import { usePlayerStore } from '../state/playerStore';
import { useTimeStore } from '../state/timeStore';
import { useCombatStore } from '../state/combatStore';
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
      if (ix.dialogueId === '__shop__') {
        this.spawnInteractable({ sprite, label: ix.label, radius: 24,
          action: () => {
            const phase = useTimeStore.getState().phase;
            if (phase === 'night') {
              window.dispatchEvent(new CustomEvent('gameMessage', {
                detail: 'The shop is closed for the night. Return at dawn.',
              }));
              return;
            }
            useInventoryStore.getState().openShop();
          } });
        // Permanent "Shop" label above the counter
        this.add.text(oX + ix.tileX * TILE + TILE / 2, oY + ix.tileY * TILE - 6, 'Shop', {
          fontFamily: 'Courier New', fontSize: '11px', color: '#d4a968',
          backgroundColor: 'rgba(10,6,6,0.7)', padding: { x: 4, y: 2 },
        }).setOrigin(0.5, 1).setDepth(11);
      } else if (ix.dialogueId === '__craft__') {
        this.spawnInteractable({ sprite, label: ix.label, radius: 24,
          action: () => {
            const phase = useTimeStore.getState().phase;
            if (phase === 'night') {
              window.dispatchEvent(new CustomEvent('gameMessage', {
                detail: 'The forge is cold. Kael sleeps. Return at dawn.',
              }));
              return;
            }
            useInventoryStore.getState().openCrafting();
          } });
        // Permanent "Forge" label above the anvil
        this.add.text(oX + ix.tileX * TILE + TILE / 2, oY + ix.tileY * TILE - 6, 'Forge', {
          fontFamily: 'Courier New', fontSize: '11px', color: '#d4a968',
          backgroundColor: 'rgba(10,6,6,0.7)', padding: { x: 4, y: 2 },
        }).setOrigin(0.5, 1).setDepth(11);
      } else if (ix.dialogueId === '__questboard__') {
        this.spawnInteractable({ sprite, label: ix.label, radius: 24,
          action: () => { window.dispatchEvent(new Event('openQuestBoard')); } });
        this.add.text(oX + ix.tileX * TILE + TILE / 2, oY + ix.tileY * TILE - 6, 'Quest Board', {
          fontFamily: 'Courier New', fontSize: '10px', color: '#d4a968',
          backgroundColor: 'rgba(10,6,6,0.7)', padding: { x: 4, y: 2 },
        }).setOrigin(0.5, 1).setDepth(11);
      } else if (ix.dialogueId === '__training_dummy__') {
        const sceneRef = this;
        this.spawnInteractable({ sprite, label: ix.label, radius: 24,
          action: () => {
            // Mirror BaseWorldScene.checkEnemyContact: start the combat
            // store, mark a synthetic _pendingEnemyId so the finish() path
            // doesn't try to add a real enemy id to killedEnemies, then
            // hand off to CombatScene the same way real enemies do.
            // Without the scene swap the React overlay rendered combat UI
            // but no Phaser combatant sprites, and on finish the world
            // scene was never restored cleanly.
            const px = sceneRef.player?.x ?? 0;
            const py = sceneRef.player?.y ?? 0;
            const store = useCombatStore.getState();
            store._pendingEnemyId = '__training_dummy_synthetic__';
            store.start('training_dummy', 'InteriorScene', px, py);
            sceneRef.scene.stop(sceneRef.scene.key);
            sceneRef.scene.start('CombatScene');
          } });
        this.add.text(oX + ix.tileX * TILE + TILE / 2, oY + ix.tileY * TILE - 6, 'Training Dummy', {
          fontFamily: 'Courier New', fontSize: '10px', color: '#d4a968',
          backgroundColor: 'rgba(10,6,6,0.7)', padding: { x: 4, y: 2 },
        }).setOrigin(0.5, 1).setDepth(11);
      } else if (ix.dialogueId === '__cook__') {
        this.spawnInteractable({ sprite, label: ix.label, radius: 24,
          action: () => {
            const phase = useTimeStore.getState().phase;
            if (phase === 'night') {
              window.dispatchEvent(new CustomEvent('gameMessage', {
                detail: 'The hearth is cold. Tomas has turned in for the night. Return at dawn.',
              }));
              return;
            }
            useInventoryStore.getState().openCooking();
          } });
        this.add.text(oX + ix.tileX * TILE + TILE / 2, oY + ix.tileY * TILE - 6, 'Hearth', {
          fontFamily: 'Courier New', fontSize: '11px', color: '#d4a968',
          backgroundColor: 'rgba(10,6,6,0.7)', padding: { x: 4, y: 2 },
        }).setOrigin(0.5, 1).setDepth(11);
      } else if (ix.dialogueId === '__fisher_stash__') {
        const stashKey = 'hollowcrown_fisher_stash_taken';
        this.spawnInteractable({ sprite, label: ix.label, radius: 24,
          action: () => {
            if (localStorage.getItem(stashKey) === 'true') {
              window.dispatchEvent(new CustomEvent('gameMessage', {
                detail: 'The stash is empty. Only a scent of brine remains.',
              }));
              return;
            }
            localStorage.setItem(stashKey, 'true');
            const inv = useInventoryStore.getState();
            inv.addItem('smoked_eel');
            inv.addItem('lake_tonic');
            const ps = usePlayerStore.getState();
            const ch = ps.character;
            if (ch) { ch.addGold(20); ps.notify(); }
            window.dispatchEvent(new CustomEvent('gameMessage', {
              detail: 'You find a hidden stash: Smoked Eel, Lake Tonic, and 20g.',
            }));
          } });
        this.add.text(oX + ix.tileX * TILE + TILE / 2, oY + ix.tileY * TILE - 6, 'Stash', {
          fontFamily: 'Courier New', fontSize: '10px', color: '#d4a968',
          backgroundColor: 'rgba(10,6,6,0.7)', padding: { x: 4, y: 2 },
        }).setOrigin(0.5, 1).setDepth(11);
      } else if (ix.dialogueId === '__rest__') {
        this.spawnInteractable({ sprite, label: ix.label, radius: 24,
          action: () => {
            const ps = usePlayerStore.getState();
            const ch = ps.character;
            if (!ch) return;
            if (ch.gold < 10) { window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Not enough gold. A bed costs 10g.' })); return; }
            // Cinematic rest: fade to black, show "Resting..." with a
            // moon+Z animation, fade back in with HP/MP restored.
            this.playRestAnimation(() => {
              ch.loseGold(10);
              ch.hp = ch.derived.maxHp;
              ch.mp = ch.derived.maxMp;
              ps.notify();
              window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'You rest at the inn. HP and MP fully restored. (-10g)' }));
            });
          } });
        this.add.text(oX + ix.tileX * TILE + TILE / 2, oY + ix.tileY * TILE - 6, 'Rest (10g)', {
          fontFamily: 'Courier New', fontSize: '10px', color: '#80a0c0',
          backgroundColor: 'rgba(10,6,6,0.7)', padding: { x: 4, y: 2 },
        }).setOrigin(0.5, 1).setDepth(11);
      } else {
        const dlgId = ix.dialogueId;
        this.spawnInteractable({ sprite, label: ix.label, radius: 24,
          action: () => { useDialogueStore.getState().start(getDialogue(dlgId)); } });
      }
    }

    // Door tiles are at row (roomH - 2) because the last row is
    // decorative corners. Exit zone sits ON the door tile row.
    const doorRow = layout.roomH - 2;
    const dL = oX + Math.floor((roomPxW - 2 * TILE) / 2);
    this.addExit({ x: dL, y: oY + doorRow * TILE, w: 2 * TILE, h: TILE,
      targetScene: layout.exitScene, targetSpawn: layout.exitSpawn });
  }

  protected spawnAt(_name: string): { x: number; y: number } {
    const data = this.scene.settings.data as { spawnPoint?: string } | undefined;
    const layout = getLayout(data?.spawnPoint ?? 'guild');
    const oY = Math.floor((WORLD_H - layout.roomH * TILE) / 2);
    // Spawn just above the door row.
    return { x: WORLD_W / 2, y: oY + (layout.roomH - 3) * TILE };
  }

  private ws(x: number, y: number, w: number, h: number): void {
    if (w <= 0 || h <= 0) return;
    const wall = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0);
    this.physics.add.existing(wall, true);
    this.walls.add(wall);
  }

  /**
   * Cinematic inn rest: fade to black (1s), show "Resting..." overlay with
   * a moon+Z animation for 1.5s, fade back in and fire the given callback
   * once the fade-in completes so the HP/MP restore feels earned.
   */
  private playRestAnimation(onRestored: () => void): void {
    const depth = 2000;
    const black = this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x000000, 0).setDepth(depth);
    // Fade to black
    this.tweens.add({
      targets: black, alpha: 1, duration: 1000,
      onComplete: () => {
        // Overlay: moon crescent + stacked Z Z Z
        const cx = WORLD_W / 2;
        const cy = WORLD_H / 2;
        const moon = this.add.text(cx - 40, cy - 10, '\u263D', {
          fontFamily: 'Courier New', fontSize: '48px', color: '#d9d08a',
        }).setOrigin(0.5).setDepth(depth + 1);
        const label = this.add.text(cx, cy + 40, 'Resting...', {
          fontFamily: 'Courier New', fontSize: '18px', color: '#d4a968',
        }).setOrigin(0.5).setDepth(depth + 1);
        const z1 = this.add.text(cx + 10, cy - 20, 'Z', {
          fontFamily: 'Courier New', fontSize: '18px', color: '#f0e2a0',
        }).setOrigin(0.5).setAlpha(0).setDepth(depth + 1);
        const z2 = this.add.text(cx + 22, cy - 34, 'Z', {
          fontFamily: 'Courier New', fontSize: '22px', color: '#f0e2a0',
        }).setOrigin(0.5).setAlpha(0).setDepth(depth + 1);
        const z3 = this.add.text(cx + 36, cy - 50, 'Z', {
          fontFamily: 'Courier New', fontSize: '26px', color: '#f0e2a0',
        }).setOrigin(0.5).setAlpha(0).setDepth(depth + 1);
        // Pulse Z's in sequence
        this.tweens.add({ targets: z1, alpha: 1, y: z1.y - 6, duration: 400, delay: 100 });
        this.tweens.add({ targets: z2, alpha: 1, y: z2.y - 6, duration: 400, delay: 400 });
        this.tweens.add({ targets: z3, alpha: 1, y: z3.y - 6, duration: 400, delay: 700 });
        // Gentle moon bob
        this.tweens.add({ targets: moon, y: moon.y - 4, duration: 750, yoyo: true, repeat: 0 });

        this.time.delayedCall(1500, () => {
          // Fade back in; restore HP/MP once the world reappears
          this.tweens.add({
            targets: [black, moon, label, z1, z2, z3], alpha: 0, duration: 800,
            onComplete: () => {
              black.destroy(); moon.destroy(); label.destroy();
              z1.destroy(); z2.destroy(); z3.destroy();
              onRestored();
            },
          });
        });
      },
    });
  }
}

// ─── Tile aliases ──────────────────────────────────────────────

const _FS = T.FLOOR_STONE; void _FS; const FW = T.FLOOR_WOOD;
const WS = T.WALL_STONE;  const WW = T.WALL_WOOD;  const D  = T.DOOR;
const BK = T.BOOKSHELF;   const CT = T.COUNTER;
const BH = T.BED_HEAD;    const BF = T.BED_FOOT;
const TB = T.TABLE;        const CH = T.CHAIR;
const BA = T.BARREL;       const CR = T.CRATE;
const FP = T.FIREPLACE;    const PL = T.PLANT;
const RC = T.RUG_CENTER;   const RE = T.RUG_EDGE;
const WR = T.WEAPON_RACK;  const WN = T.WINDOW;
const TO = T.TORCH;        const DI = T.DISPLAY;
// Interior architecture
const WI = T.WALL_INNER;   const WC = T.WALL_CORNER;
const WH = T.WALL_SHELF;   const BB = T.BASEBOARD;

/** ALL tiles that block the player. */
const SOLID: Set<number> = new Set([
  WS, WW, BK, CT, BH, BF, TB, BA, CR, FP, PL, WR, DI,
  CH, TO, WN, WI, WC, WH, BB,
]);

function getLayout(id: string): InteriorLayout {
  switch (id) {
    case 'guild':         return guildLayout();
    case 'inn':           return innLayout();
    case 'shop':          return shopLayout();
    case 'smithy':        return smithyLayout();
    case 'orric':         return orricLayout();
    case 'duskmere_inn':  return duskmereInnLayout();
    case 'dockmaster':    return dockmasterLayout();
    case 'fisher_cabin':  return fisherCabinLayout();
    default:              return guildLayout();
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
  const _ = FW; // warm brick floor
  // 20×16 with 2-tile thick ALTTP borders
  const tiles: number[][] = [
    // Row 0-1: outer wall + back wall shelf
    [WC,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WC],
    [WI,WH,WH,WH,WR,WR,WH,WH,WH,WH,WH,WH,WR,WR,DI,WH,WH,WH,WH,WI],
    // Row 2: baseboard
    [WI,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,WI],
    // Row 3+: floor with furniture
    [WI,_,_,CT,CT,CT,CT,CT,CT,CT,CT,CT,CT,CT,CT,CT,_,_,_,WI],
    [WI,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,WI],
    [WI,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,WI],
    [WN,_,BA,_,TB,TB,TB,_,_,_,_,_,TB,TB,TB,_,CR,_,_,WN],
    [WI,_,BA,_,CH,_,CH,_,_,_,_,_,CH,_,CH,_,CR,_,_,WI],
    [WI,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,WI],
    [WN,_,_,_,_,RC,RC,RC,RC,RC,RC,RC,RC,RC,_,_,_,_,_,WN],
    [WI,_,_,_,_,RC,RC,RC,RC,RC,RC,RC,RC,RC,_,_,_,_,_,WI],
    [WI,_,_,_,_,RE,RE,RE,RE,RE,RE,RE,RE,RE,_,_,_,_,_,WI],
    [WI,_,PL,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,PL,WI],
    [WI,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,WI],
    [WC,WS,WS,WS,WS,WS,WS,WS,WS,D,D,WS,WS,WS,WS,WS,WS,WS,WS,WC],
    [WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC],
  ];

  return {
    name: "Adventurers' Guild", roomW: 20, roomH: 16, tiles,
    solidTiles: SOLID,
    npcs: [{ key: 'brenna', dialogueId: 'guild-greeting', tileX: 10, tileY: 3 }],
    interactables: [
      { tileX: 14, tileY: 1, label: 'Check the quest board', dialogueId: '__questboard__' },
      { tileX: 2, tileY: 4, label: 'Spar with the training dummy', dialogueId: '__training_dummy__' },
    ],
    exitScene: 'TownScene', exitSpawn: 'fromGuildInterior',
  };
}

// ─── INN: Rest and warmth ──────────────────────────────────────
// Fireplace, beds, dining area, ale barrels. A place to sleep.
// NO weapons, no bookshelves — just comfort and food.

function innLayout(): InteriorLayout {
  const _ = FW;
  // 18×14 with thick borders
  const tiles: number[][] = [
    [WC,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WC],
    [WI,WH,WH,WH,WH,WH,FP,FP,FP,WH,WH,WH,WH,WH,WH,WH,WH,WI],
    [WI,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,WI],
    [WI,_,CT,CT,CT,CT,_,_,_,_,_,_,BH,BH,_,_,_,WI],
    [WN,_,_,_,_,_,_,RC,RC,_,_,_,BF,BF,_,_,_,WN],
    [WI,_,_,_,_,_,_,RC,RC,_,_,_,_,_,_,_,_,WI],
    [WN,_,TB,TB,_,_,_,RE,RE,_,_,_,BH,BH,_,_,_,WN],
    [WI,_,CH,CH,_,_,_,_,_,_,_,_,BF,BF,_,_,_,WI],
    [WI,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,WI],
    [WN,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,WN],
    [WI,BA,BA,_,_,_,_,_,_,_,_,_,_,_,PL,BA,BA,WI],
    [WI,CR,_,_,_,_,_,_,_,_,_,_,_,_,_,_,CR,WI],
    [WC,WW,WW,WW,WW,WW,WW,WW,D,D,WW,WW,WW,WW,WW,WW,WW,WC],
    [WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC],
  ];

  return {
    name: 'Whispering Hollow Inn', roomW: 18, roomH: 14, tiles,
    solidTiles: SOLID,
    npcs: [{ key: 'tomas', dialogueId: 'tomas-greeting', tileX: 6, tileY: 3 }],
    interactables: [
      { tileX: 14, tileY: 5, label: 'Rest at the inn (10g)', dialogueId: '__rest__' },
      { tileX: 7, tileY: 3, label: 'Cook at the hearth', dialogueId: '__cook__' },
    ],
    exitScene: 'TownScene', exitSpawn: 'fromInnInterior',
  };
}

// ─── SHOP: Trade goods and supplies ────────────────────────────
// Merchandise shelves, display cases, scales, crates of stock.
// NO beds, no fireplace, no weapons — this is commerce.

function shopLayout(): InteriorLayout {
  const _ = FW;
  // 16×14 with thick borders
  const tiles: number[][] = [
    [WC,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WC],
    [WI,WH,DI,DI,DI,DI,WH,WH,DI,DI,DI,DI,WH,WH,WH,WI],
    [WI,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,WI],
    [WI,_,_,CT,CT,CT,CT,CT,CT,CT,CT,CT,_,_,_,WI],
    [WN,_,_,_,_,_,_,_,_,_,_,_,_,_,_,WN],
    [WI,CR,_,_,_,_,_,_,_,_,_,_,_,CR,_,WI],
    [WN,CR,_,_,TB,_,_,_,_,_,TB,_,_,CR,_,WN],
    [WI,_,_,_,_,_,_,_,_,_,_,_,_,_,_,WI],
    [WN,BA,_,_,_,_,_,_,_,_,_,_,_,BA,_,WN],
    [WI,BA,_,_,_,_,_,_,_,_,_,_,_,BA,_,WI],
    [WI,PL,_,_,_,_,_,_,_,_,_,_,_,_,PL,WI],
    [WI,_,_,_,_,_,_,_,_,_,_,_,_,_,_,WI],
    [WC,WW,WW,WW,WW,WW,WW,D,D,WW,WW,WW,WW,WW,WW,WC],
    [WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC],
  ];

  return {
    name: 'General Store', roomW: 16, roomH: 14, tiles,
    solidTiles: SOLID,
    npcs: [{ key: 'vira', dialogueId: 'vira-greeting', tileX: 8, tileY: 3 }],
    interactables: [{ tileX: 5, tileY: 3, label: 'Browse wares', dialogueId: '__shop__' }],
    exitScene: 'TownScene', exitSpawn: 'fromShopInterior',
  };
}

// ─── SMITHY: Anvil and forge ──────────────────────────────────
// Weapon racks, anvil (counter tile), fireplace for the forge,
// crates of ore. A place to hammer metal into shape.

function smithyLayout(): InteriorLayout {
  const _ = FW;
  // 16×14 with thick borders
  const tiles: number[][] = [
    [WC,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WS,WC],
    [WI,WH,WR,WR,WH,FP,FP,FP,FP,WH,WR,WR,DI,DI,WH,WI],
    [WI,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,WI],
    [WI,_,_,CT,CT,CT,CT,CT,_,_,_,_,_,_,_,WI],
    [WN,_,_,_,_,_,_,_,_,_,_,_,_,_,_,WN],
    [WI,BA,_,_,_,_,_,_,_,_,TB,TB,_,CR,_,WI],
    [WN,BA,_,_,_,_,_,_,_,_,CH,_,_,CR,_,WN],
    [WI,CR,_,_,_,_,_,_,_,_,_,_,_,_,_,WI],
    [WN,CR,_,_,_,RC,RC,RC,RC,_,_,_,_,_,_,WN],
    [WI,_,_,_,_,RC,RC,RC,RC,_,_,_,_,_,_,WI],
    [WI,_,_,_,_,RE,RE,RE,RE,_,_,_,_,_,_,WI],
    [WI,PL,_,_,_,_,_,_,_,_,_,_,_,_,PL,WI],
    [WC,WS,WS,WS,WS,WS,WS,D,D,WS,WS,WS,WS,WS,WS,WC],
    [WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC],
  ];

  return {
    name: "Kael's Smithy", roomW: 16, roomH: 14, tiles,
    solidTiles: SOLID,
    npcs: [{ key: 'kael', dialogueId: 'kael-greeting', tileX: 5, tileY: 3 }],
    interactables: [{ tileX: 3, tileY: 3, label: 'Use the anvil (Craft)', dialogueId: '__craft__' }],
    exitScene: 'TownScene', exitSpawn: 'fromSmithyInterior',
  };
}

// ─── ORRIC'S CABIN: A forester's home ──────────────────────────
// Fireplace, a single bed, work table with herbs, axe on the wall.
// Rustic and small — one man's home in the woods.

function orricLayout(): InteriorLayout {
  const _ = FW;
  // 14×12 with thick borders
  const tiles: number[][] = [
    [WC,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WC],
    [WI,WH,FP,FP,FP,WH,WH,WH,WH,WH,BH,BH,WH,WI],
    [WI,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,WI],
    [WI,WR,_,_,_,_,_,_,_,_,BF,BF,_,WI],
    [WN,_,_,_,TB,TB,_,_,_,_,_,_,_,WN],
    [WI,_,_,CH,_,_,CH,_,_,_,_,_,_,WI],
    [WN,_,_,_,_,_,_,RC,RC,_,_,_,_,WN],
    [WI,_,_,_,_,_,_,RC,RC,_,_,_,_,WI],
    [WI,PL,_,_,_,_,_,RE,RE,_,_,BA,CR,WI],
    [WI,CR,_,_,_,_,_,_,_,_,_,_,_,WI],
    [WC,WW,WW,WW,WW,WW,D,D,WW,WW,WW,WW,WW,WC],
    [WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC],
  ];

  return {
    name: "Orric's Cabin", roomW: 14, roomH: 12, tiles,
    solidTiles: SOLID,
    npcs: [{ key: 'orric', dialogueId: 'orric-greeting', tileX: 5, tileY: 4 }],
    interactables: [],
    exitScene: 'GreenhollowScene', exitSpawn: 'fromOrricInterior',
  };
}

// ─── DUSKMERE INN: Lakeshore Inn ───────────────────────────────
// Run by Tomas (shared innkeeper template). Rest bed + hearth.
function duskmereInnLayout(): InteriorLayout {
  const _ = FW;
  const tiles: number[][] = [
    [WC,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WC],
    [WI,WH,WH,WH,WH,WH,FP,FP,FP,WH,WH,WH,WH,WH,WH,WH,WH,WI],
    [WI,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,WI],
    [WI,_,CT,CT,CT,CT,_,_,_,_,_,_,BH,BH,_,_,_,WI],
    [WN,_,_,_,_,_,_,RC,RC,_,_,_,BF,BF,_,_,_,WN],
    [WI,_,_,_,_,_,_,RC,RC,_,_,_,_,_,_,_,_,WI],
    [WN,_,TB,TB,_,_,_,RE,RE,_,_,_,BH,BH,_,_,_,WN],
    [WI,_,CH,CH,_,_,_,_,_,_,_,_,BF,BF,_,_,_,WI],
    [WI,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,WI],
    [WN,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,WN],
    [WI,BA,BA,_,_,_,_,_,_,_,_,_,_,_,PL,BA,BA,WI],
    [WI,CR,_,_,_,_,_,_,_,_,_,_,_,_,_,_,CR,WI],
    [WC,WW,WW,WW,WW,WW,WW,WW,D,D,WW,WW,WW,WW,WW,WW,WW,WC],
    [WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC],
  ];
  return {
    name: 'Lakeshore Inn', roomW: 18, roomH: 14, tiles,
    solidTiles: SOLID,
    npcs: [{ key: 'tomas', dialogueId: 'tomas-greeting', tileX: 6, tileY: 3 }],
    interactables: [
      { tileX: 14, tileY: 5, label: 'Rest at the inn (10g)', dialogueId: '__rest__' },
      { tileX: 7, tileY: 3, label: 'Cook at the hearth', dialogueId: '__cook__' },
    ],
    exitScene: 'DuskmereScene', exitSpawn: 'fromDuskmereInn',
  };
}

// ─── DOCKMASTER'S OFFICE ───────────────────────────────────────
// Small office with a desk, a bookcase of ledgers, and Torben
// moonlighting as the village clerk.
function dockmasterLayout(): InteriorLayout {
  const _ = FW;
  const tiles: number[][] = [
    [WC,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WC],
    [WI,WH,BK,BK,BK,WH,WH,WH,WH,WH,DI,DI,WH,WI],
    [WI,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,WI],
    [WI,_,_,CT,CT,CT,_,_,_,_,_,_,_,WI],
    [WN,_,_,_,_,_,_,_,TB,TB,_,_,_,WN],
    [WI,_,_,_,_,_,_,_,CH,_,_,_,_,WI],
    [WN,_,_,_,_,_,_,_,_,_,_,_,_,WN],
    [WI,_,BA,_,_,_,RC,RC,_,_,_,CR,_,WI],
    [WI,PL,_,_,_,_,RC,RC,_,_,_,_,PL,WI],
    [WI,_,_,_,_,_,RE,RE,_,_,_,_,_,WI],
    [WC,WW,WW,WW,WW,WW,D,D,WW,WW,WW,WW,WW,WC],
    [WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC],
  ];
  return {
    name: "Dockmaster's Office", roomW: 14, roomH: 12, tiles,
    solidTiles: SOLID,
    npcs: [{ key: 'torben', dialogueId: 'torben-greeting', tileX: 8, tileY: 4 }],
    interactables: [
      { tileX: 4, tileY: 3, label: 'Browse the ledger (Shop)', dialogueId: '__shop__' },
    ],
    exitScene: 'DuskmereScene', exitSpawn: 'fromDockmaster',
  };
}

// ─── FISHER'S CABIN: Mira's humble hut ─────────────────────────
// Nets on the wall, a small bed, barrels of bait. A quiet place.
function fisherCabinLayout(): InteriorLayout {
  const _ = FW;
  const tiles: number[][] = [
    [WC,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WW,WC],
    [WI,WH,WR,WR,WH,FP,FP,WH,WH,BH,BH,WH,WI],
    [WI,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,BB,WI],
    [WI,_,_,_,_,_,_,_,_,BF,BF,_,WI],
    [WN,_,BA,BA,_,_,_,_,_,_,_,_,WN],
    [WI,_,BA,_,TB,_,_,_,_,_,_,_,WI],
    [WN,_,_,_,CH,_,_,RC,RC,_,_,_,WN],
    [WI,PL,_,_,_,_,_,RC,RC,_,_,PL,WI],
    [WI,CR,_,_,_,_,_,RE,RE,_,_,CR,WI],
    [WC,WW,WW,WW,WW,WW,D,D,WW,WW,WW,WW,WC],
    [WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC,WC],
  ];
  return {
    name: "Fisher's Cabin", roomW: 13, roomH: 11, tiles,
    solidTiles: SOLID,
    npcs: [],
    interactables: [
      { tileX: 2, tileY: 4, label: 'Search the bait barrels', dialogueId: '__fisher_stash__' },
    ],
    exitScene: 'DuskmereScene', exitSpawn: 'fromFisherCabin',
  };
}
