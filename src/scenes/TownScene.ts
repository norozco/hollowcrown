import * as Phaser from 'phaser';
import { useQuestStore } from '../state/questStore';
import { useLoreStore } from '../state/loreStore';
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

  protected getZoneName(): string | null { return 'Ashenvale'; }

  protected getRandomEvents(): Array<() => void> {
    return [
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'A cat darts across the path.',
        }));
      },
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'An old woman nods to you from a doorway. When you look again, the door is closed.',
        }));
      },
    ];
  }

  protected layout(): void {
    // Generate the pixel-art tileset (idempotent).
    generateTileset(this);

    // Build and render the tilemap.
    const mapData = buildMapData();
    const map = this.make.tilemap({
      data: mapData,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tileset')!;
    map.createLayer(0, tileset)!;

    // Outdoor collision — scan tilemap for solid objects (bushes, plants,
    // torches, benches, barrels, crates) and add physics bodies.
    //
    // ROOF + ROOF_EDGE are also in this set: each building's tilemap
    // renders a roof tile on the row ABOVE the building's `yTile`
    // (see tileAt() — the `y === b.y - 1` branch). `addBuilding` only
    // creates collision around the building rectangle itself, so without
    // this entry the player could walk freely on the visible rooftops.
    // Reported by playtest: "you can walk on what should be the roof of
    // the buildings."
    const outdoorSolid = new Set<number>([
      T.BUSH, T.PLANT, T.TORCH, T.CHAIR, T.CRATE, T.BARREL, T.WELL, T.FENCE,
      T.ROOF, T.ROOF_EDGE,
    ]);
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        if (outdoorSolid.has(mapData[ty][tx])) {
          const w = this.add.rectangle(
            tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
          this.physics.add.existing(w, true);
          this.walls.add(w);
        }
      }
    }

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

    // Smithy building (replaced the empty plot).
    this.addBuilding({
      xTile: 10,
      yTile: 14,
      wTile: 5,
      hTile: 3,
      color: 0x3a2820,
      label: "Kael's Smithy",
      doorSide: 'bottom',
      visual: false,
    });

    // ── Building sign posts ──
    // General Store sign (south of door, near tiles 29-30, y=7 shadow row + 1)
    const shopSignX = (SHOP.doorX1 + 1) * TILE;
    const shopSignY = (SHOP.y + SHOP.h + 1) * TILE + TILE / 2;
    this.add.rectangle(shopSignX + TILE + 8, shopSignY, 4, 20, 0x5a3a1a).setDepth(11); // post
    this.add.rectangle(shopSignX + TILE + 8, shopSignY - 12, 64, 18, 0x4a3420).setStrokeStyle(1, 0x2a1810).setDepth(11); // board
    this.add.text(shopSignX + TILE + 8, shopSignY - 12, 'General Store', {
      fontFamily: 'Courier New', fontSize: '9px', color: '#d4c488',
    }).setOrigin(0.5).setDepth(12);

    // Adventurers' Guild sign
    const guildSignX = (GUILD.doorX1 + 1) * TILE;
    const guildSignY = (GUILD.y + GUILD.h + 1) * TILE + TILE / 2;
    this.add.rectangle(guildSignX + TILE + 8, guildSignY, 4, 20, 0x5a3a1a).setDepth(11);
    this.add.rectangle(guildSignX + TILE + 8, guildSignY - 12, 54, 18, 0x4a3420).setStrokeStyle(1, 0x2a1810).setDepth(11);
    this.add.text(guildSignX + TILE + 8, guildSignY - 12, 'Guild', {
      fontFamily: 'Courier New', fontSize: '9px', color: '#d4c488',
    }).setOrigin(0.5).setDepth(12);

    // Kael's Smithy sign
    const smithySignX = (SMITHY.doorX1 + 1) * TILE;
    const smithySignY = (SMITHY.y + SMITHY.h + 1) * TILE + TILE / 2;
    this.add.rectangle(smithySignX + TILE + 8, smithySignY, 4, 20, 0x5a3a1a).setDepth(11);
    this.add.rectangle(smithySignX + TILE + 8, smithySignY - 12, 54, 18, 0x4a3420).setStrokeStyle(1, 0x2a1810).setDepth(11);
    this.add.text(smithySignX + TILE + 8, smithySignY - 12, 'Smithy', {
      fontFamily: 'Courier New', fontSize: '9px', color: '#d4c488',
    }).setOrigin(0.5).setDepth(12);

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
    this.addExit({
      x: SMITHY.doorX1 * TILE,
      y: SMITHY.y * TILE + (SMITHY.h - 1) * TILE,
      w: 2 * TILE,
      h: TILE,
      targetScene: 'InteriorScene',
      targetSpawn: 'smithy',
    });

    // South-edge exit to Greenhollow Woods.
    this.addExit({
      x: 0,
      y: WORLD_H - TILE,
      w: WORLD_W,
      h: TILE,
      targetScene: 'GreenhollowScene',
      targetSpawn: 'fromAshenvale',
      label: '→ Greenhollow Woods [Lv 1-3]',
    });

    // East-edge exit to Ashenmere Marshes — unlocked after Hollow King.
    const hollowKingDone = useQuestStore.getState().active['hollow-king-slayer']?.turnedIn;
    if (hollowKingDone) {
      this.addExit({
        x: WORLD_W - TILE,
        y: 8 * TILE,
        w: TILE,
        h: 4 * TILE,
        targetScene: 'AshenmereScene',
        targetSpawn: 'fromTown',
        label: '→ Ashenmere Marshes [Lv 7+]',
      });
    } else {
      // Blocked path sign on the east edge.
      this.add.text(WORLD_W - 2 * TILE, 9.5 * TILE, 'The eastern road\nis sealed.', {
        fontFamily: 'Courier New', fontSize: '11px', color: '#8a6a4a',
        align: 'center',
      }).setOrigin(0.5).setAlpha(0.7).setDepth(15);
    }

    // ── Tutorial for first-time players ──
    // Show if: no quests accepted yet (truly fresh character).
    // The localStorage flag is a backup — cleared on New Game.
    const hasAnyQuests = Object.keys(useQuestStore.getState().active).length > 0;
    if (!hasAnyQuests) {
      const arrowX = (GUILD.doorX1 + 1) * TILE;
      const arrowY = (GUILD.y + GUILD.h) * TILE - TILE;
      const arrow = this.add.text(arrowX, arrowY, '\u25BC Visit the Guild', {
        fontFamily: 'Courier New', fontSize: '14px', color: '#f4d488',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(50);
      this.tweens.add({
        targets: arrow, y: arrowY - 8, duration: 600, yoyo: true, repeat: 8,
      });
      setTimeout(() => arrow.destroy(), 10000);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'WASD to move \u00b7 E to interact \u00b7 I inventory \u00b7 Q quests',
        }));
      }, 3000);
    }

    // ── Waypoint stone ──
    const wpX = 13 * TILE;
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

    // ── Lore interactables ──

    // Memorial wall near the Guild
    const memWall = this.add.rectangle(
      (GUILD.x + GUILD.w) * TILE - TILE / 2, (GUILD.y + 1) * TILE, 6, 48, 0x7a6a50,
    );
    memWall.setStrokeStyle(1, 0x4a3a28);
    memWall.setDepth(6);
    this.spawnInteractable({
      sprite: memWall as any,
      label: 'Examine memorial wall',
      radius: 20,
      action: () => {
        useLoreStore.getState().discover({
          key: 'memorial-wall',
          title: 'The Memorial Wall',
          text: 'Names are carved here. Some recent. The stone is never full.',
          location: 'Ashenvale',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'Names are carved here. Some recent. The stone is never full.',
        }));
      },
    });

    // Notice board near the south exit
    const boardPost = this.add.rectangle(20 * TILE, 13 * TILE, 4, 24, 0x5a3a1a);
    boardPost.setDepth(6);
    const boardFace = this.add.rectangle(20 * TILE, 13 * TILE - 14, 52, 28, 0x4a3420);
    boardFace.setStrokeStyle(1, 0x2a1810);
    boardFace.setDepth(6);
    this.add.text(20 * TILE, 13 * TILE - 14, 'NOTICE', {
      fontFamily: 'Courier New', fontSize: '8px', color: '#d4c488',
    }).setOrigin(0.5).setDepth(7);
    this.spawnInteractable({
      sprite: boardFace as any,
      label: 'Read notice board',
      radius: 24,
      action: () => {
        useLoreStore.getState().discover({
          key: 'notice-board-ashenvale',
          title: 'Notice Board',
          text: 'Warning: Greenhollow Woods — wolves reported. Guild escort recommended.',
          location: 'Ashenvale',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'Warning: Greenhollow Woods — wolves reported. Guild escort recommended.',
        }));
      },
    });

    // ── Ambient townspeople ──
    const addTownsperson = (startX: number, startY: number, color: number, path: Array<{x: number; y: number}>) => {
      const person = this.add.circle(startX, startY, 5, color);
      person.setDepth(9);
      // Shadow
      this.add.ellipse(startX, startY + 4, 8, 3, 0x000000, 0.2).setDepth(8);

      // Walk along path
      this.tweens.chain({
        targets: person,
        tweens: path.map(p => ({
          x: p.x, y: p.y, duration: 2000 + Math.random() * 1000, ease: 'Linear',
        })),
        repeat: -1,
      });
    };

    // Townsperson 1: walks along the main path (east-west)
    addTownsperson(6 * TILE, 9 * TILE, 0xa08060, [
      { x: 15 * TILE, y: 9 * TILE },
      { x: 24 * TILE, y: 9 * TILE },
      { x: 15 * TILE, y: 9 * TILE },
      { x: 6 * TILE, y: 9 * TILE },
    ]);

    // Townsperson 2: walks from inn area to shop
    addTownsperson(18 * TILE, 10 * TILE, 0x7080a0, [
      { x: 28 * TILE, y: 10 * TILE },
      { x: 28 * TILE, y: 8 * TILE },
      { x: 18 * TILE, y: 8 * TILE },
      { x: 18 * TILE, y: 10 * TILE },
    ]);

    // Townsperson 3: lingers near the well
    addTownsperson(14 * TILE, 8 * TILE, 0x906840, [
      { x: 12 * TILE, y: 10 * TILE },
      { x: 14 * TILE, y: 10 * TILE },
      { x: 14 * TILE, y: 8 * TILE },
      { x: 12 * TILE, y: 8 * TILE },
    ]);

    // ── Ambient animals ──
    // A cat near the inn
    const cat = this.add.circle(16 * TILE, 12 * TILE, 3, 0x404040);
    cat.setDepth(9);
    this.tweens.add({
      targets: cat, x: 20 * TILE, y: 14 * TILE,
      duration: 8000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Birds that occasionally fly across
    this.time.addEvent({
      delay: 15000 + Math.random() * 20000,
      loop: true,
      callback: () => {
        const birdY = 2 * TILE + Math.random() * 4 * TILE;
        const bird = this.add.triangle(0, birdY, 0, 0, 4, -3, 8, 0, 0x303030);
        bird.setDepth(20);
        this.tweens.add({
          targets: bird, x: WORLD_W + 20, duration: 6000, ease: 'Linear',
          onComplete: () => bird.destroy(),
        });
      },
    });

    // ── Environmental ambience ──
    // Smoke from the inn chimney
    this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => {
        const smokeX = (INN.x + INN.w / 2) * TILE;
        const smokeY = (INN.y - 1) * TILE;
        const smoke = this.add.circle(smokeX, smokeY, 3, 0xaaaaaa, 0.3);
        smoke.setDepth(15);
        this.tweens.add({
          targets: smoke,
          y: smokeY - 40, x: smokeX + Phaser.Math.Between(-10, 10),
          alpha: 0, scale: 2, duration: 3000,
          onComplete: () => smoke.destroy(),
        });
      },
    });

    // ── Heart piece #6 — near the well, reward for exploration ──
    this.spawnHeartPiece(14 * TILE, 10 * TILE);

    // ── Ancient Coin #1 — behind the smithy building, in a corner ──
    this.spawnAncientCoin({
      x: (SMITHY.x + SMITHY.w) * TILE + 8, y: (SMITHY.y + SMITHY.h) * TILE - 8,
      coinId: 'coin_1', inscription: 'A kingdom begins with a single coin.',
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
      case 'fromSmithyInterior':
        return { x: (SMITHY.doorX1 + 1) * TILE, y: (SMITHY.y + SMITHY.h + 1) * TILE };
      case 'fromAshenmere':
        return { x: WORLD_W - 3 * TILE, y: 9 * TILE };
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
const WL = T.WELL;
const TO = T.TORCH;
const PL = T.PLANT;
const BN = T.CHAIR; // bench = chair tile used outdoors

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
const SMITHY: Building  = { x: 10, y: 14, w: 5, h: 3, wallTile: S, floorTile: FW, doorX1: 12, doorX2: 13 };
const BUILDINGS = [GUILD, INN, SHOP, SMITHY];

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

  // ── Path to smithy (from main road down to smithy door) ──
  if ((x === SMITHY.doorX1 || x === SMITHY.doorX2) && y >= 10 && y <= SMITHY.y + SMITHY.h) return P;
  if ((x === SMITHY.doorX1 - 1 || x === SMITHY.doorX2 + 1) && y >= 11 && y <= SMITHY.y + SMITHY.h) return PE;

  // ── Southern path to exit (center of map going south) ──
  if (x >= 19 && x <= 20 && y >= 10 && y <= 21) return P;
  // Path edges beside the southern path
  if ((x === 18 || x === 21) && y >= 11 && y <= 21) return PE;

  // ── Smithy building (was empty plot) ──
  // Handled by BUILDINGS array — no special tile logic needed here.

  // ── Town well (decorative landmark in the center) ──
  if (x === 13 && y === 9) return WL;

  // ── Torch/lamp posts along the main path ──
  if (y === 8 && (x === 3 || x === 12 || x === 24 || x === 36)) return TO;
  if (y === 10 && (x === 3 || x === 12 || x === 24 || x === 36)) return TO;

  // ── Benches near the path for resting ──
  if (y === 12 && (x === 5 || x === 6)) return BN;
  if (y === 12 && (x === 33 || x === 34)) return BN;

  // ── Plants/flower beds near building entrances ──
  if (y === 7 && (x === 6 || x === 9)) return PL;  // guild entrance flowers
  if (y === 7 && (x === 16 || x === 19)) return PL; // inn entrance flowers
  if (y === 7 && (x === 28 || x === 31)) return PL; // shop entrance flowers

  // ── Bushes in natural clusters ──
  if ((x === 2 && y === 5) || (x === 3 && y === 5)) return BU;
  if ((x === 37 && y === 5) || (x === 38 && y === 6)) return BU;
  if ((x === 2 && y === 13) || (x === 3 && y === 13)) return BU;
  if ((x === 36 && y === 13) || (x === 37 && y === 14)) return BU;
  if ((x === 1 && y === 18) || (x === 2 && y === 19)) return BU;
  if ((x === 37 && y === 18) || (x === 38 && y === 19)) return BU;
  if ((x === 24 && y === 13) || (x === 25 && y === 13)) return BU;
  if (x === 13 && y === 13) return BU;
  if (x === 35 && y === 9) return BU;

  // ── Crate near the shop side (outdoor storage) ──
  if (x === 33 && y === 5) return T.CRATE;
  if (x === 33 && y === 6) return T.BARREL;

  // ── Default grass — flowers and variation ──
  return (x + y) % 7 === 0 || (x * 3 + y * 5) % 11 === 0 ? g : G;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
