import * as Phaser from 'phaser';
import { useInventoryStore } from '../state/inventoryStore';
import { useLoreStore } from '../state/loreStore';
import { usePlayerStore } from '../state/playerStore';
import { useQuestStore } from '../state/questStore';
import { getItem } from '../engine/items';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * Duskmere Village — a lakeside fishing settlement south of Greenhollow.
 * Wooden docks reach into dark water. The catch has stopped coming. The
 * lake is deeper than it should be, and something beneath it is patient.
 *
 * Map: 40 tiles wide x 22 tiles tall.
 */

const MAP_W = 40;
const MAP_H = 22;

export class DuskmereScene extends BaseWorldScene {
  constructor() {
    super({ key: 'DuskmereScene' });
  }

  protected getZoneName(): string | null { return 'Duskmere Village'; }

  protected getRandomEvents(): Array<() => void> {
    return [
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'A gull cries overhead, then goes silent. The water does not ripple.',
        }));
      },
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'Something dark moves beneath the surface of the lake. Slow. Heavy.',
        }));
      },
      () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'The wind carries the smell of fish and something older.',
        }));
      },
    ];
  }

  protected layout(): void {
    generateTileset(this);

    const mapData = buildMapData();
    const map = this.make.tilemap({
      data: mapData,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage('tileset')!;
    map.createLayer(0, tileset)!;

    // Water tiles block movement.
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        if (mapData[ty][tx] === T.WATER) {
          const w = this.add.rectangle(
            tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
          this.physics.add.existing(w, true);
          this.walls.add(w);
        }
      }
    }

    // ── Buildings ──

    // Dockmaster's Office (small, north-west)
    this.addBuilding({
      xTile: 3, yTile: 4, wTile: 5, hTile: 4,
      color: 0x4a3a20, label: "Dockmaster's Office",
      doorSide: 'bottom', visual: false,
    });
    this.drawBuildingSilhouette(3, 4, 5, 4, 0x5a4228, 0x3a2810);
    this.addExit({
      x: 5 * TILE, y: 7 * TILE, w: 2 * TILE, h: TILE,
      targetScene: 'InteriorScene', targetSpawn: 'dockmaster',
    });

    // Lakeshore Inn (medium, south-west)
    this.addBuilding({
      xTile: 2, yTile: 12, wTile: 6, hTile: 5,
      color: 0x3a2a18, label: 'Lakeshore Inn',
      doorSide: 'right', visual: false,
    });
    this.drawBuildingSilhouette(2, 12, 6, 5, 0x4a3220, 0x2a1810);
    // Inn door was on the right at tile (7, 14) — exit placed there.
    this.addExit({
      x: 8 * TILE, y: 14 * TILE, w: TILE, h: TILE,
      targetScene: 'InteriorScene', targetSpawn: 'duskmere_inn',
    });

    // Fisher's Cabin (new — small hut near the south path)
    this.addBuilding({
      xTile: 10, yTile: 17, wTile: 4, hTile: 3,
      color: 0x4a3420, label: "Fisher's Cabin",
      doorSide: 'top', visual: false,
    });
    this.drawBuildingSilhouette(10, 17, 4, 3, 0x5a3a20, 0x2a1810);
    this.addExit({
      x: 11 * TILE, y: 16 * TILE, w: 2 * TILE, h: TILE,
      targetScene: 'InteriorScene', targetSpawn: 'fisher_cabin',
    });

    // Fishmonger's Stall (open-air counter near docks)
    const stallX = 14 * TILE;
    const stallY = 8 * TILE;
    const counter = this.add.rectangle(stallX, stallY, 64, 24, 0x5a4020);
    counter.setStrokeStyle(2, 0x3a2810);
    counter.setDepth(5);
    this.physics.add.existing(counter, true);
    this.walls.add(counter);
    this.add.text(stallX, stallY - 20, "Fishmonger's Stall", {
      fontFamily: 'Courier New', fontSize: '11px', color: '#8a7a48',
    }).setOrigin(0.5).setDepth(8);

    // Shop interactable at the stall counter
    const shopSprite = this.add.rectangle(stallX, stallY + 20, 64, 16, 0x000000, 0);
    shopSprite.setDepth(1);
    this.spawnInteractable({
      sprite: shopSprite as any, label: 'Browse fish', radius: 28,
      action: () => { useInventoryStore.getState().openShop(); },
    });
    this.add.text(stallX, stallY + 14, 'Shop', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#d4a968',
      backgroundColor: 'rgba(10,6,6,0.7)', padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 0).setDepth(11);

    // ── NPCs (outdoors) ──

    // Nessa — near the dockmaster's office entrance
    this.spawnNpc({
      key: 'nessa', dialogueId: 'nessa-greeting',
      x: 5 * TILE + TILE / 2, y: 9 * TILE,
    });

    // ── Stew Pot (behind Nessa) ──
    // Exchanges one fish for either a hot meal buff item or gold.
    const potX = 6 * TILE + TILE / 2;
    const potY = 9 * TILE + 8;
    const pot = this.add.ellipse(potX, potY, 22, 14, 0x2a1a12);
    pot.setStrokeStyle(2, 0x1a0e08);
    pot.setDepth(6);
    this.add.ellipse(potX, potY - 4, 18, 6, 0x8a5a30, 0.8).setDepth(7); // broth
    // Steam wisps
    this.time.addEvent({
      delay: 900, loop: true, callback: () => {
        const s = this.add.circle(potX + Phaser.Math.Between(-4, 4), potY - 8, 2, 0xd0d0d0, 0.4);
        s.setDepth(8);
        this.tweens.add({
          targets: s, y: s.y - 28, alpha: 0, scale: 2, duration: 1800,
          onComplete: () => s.destroy(),
        });
      },
    });
    this.add.text(potX, potY - 22, 'Stew Pot', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#d4a968',
      backgroundColor: 'rgba(10,6,6,0.7)', padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(11);
    this.spawnInteractable({
      sprite: pot as any, label: 'Drop fish in the stew pot', radius: 24,
      action: () => {
        const inv = useInventoryStore.getState();
        // Accept any of the caught fish types. First match wins.
        const fishKeys = ['grilled_pike', 'smoked_eel', 'golden_carp'];
        const held = fishKeys.find(k => inv.hasItem(k, 1));
        if (!held) {
          window.dispatchEvent(new CustomEvent('gameMessage', {
            detail: 'The pot bubbles. You have no fish to offer.',
          }));
          return;
        }
        inv.removeItem(held, 1);
        // Golden carp rewards more gold; others give a meal + small gold.
        const ps = usePlayerStore.getState();
        const ch = ps.character;
        if (held === 'golden_carp') {
          if (ch) { ch.addGold(40); ps.notify(); }
          window.dispatchEvent(new CustomEvent('gameMessage', {
            detail: 'Nessa eyes the golden carp, then nods. She slides 40g across the planks.',
          }));
        } else {
          inv.addItem('health_potion');
          if (ch) { ch.addGold(8); ps.notify(); }
          window.dispatchEvent(new CustomEvent('gameMessage', {
            detail: 'The pot hisses. You receive a Health Potion and 8g.',
          }));
        }
      },
    });

    // Torben — behind the fishmonger's counter
    this.spawnNpc({
      key: 'torben', dialogueId: 'torben-greeting',
      x: 14 * TILE, y: 7 * TILE,
    });

    // Mira — on the far dock (only after the theft event).
    // She appears if the player has been robbed but hasn't resolved her dialogue.
    const miraFlag = localStorage.getItem('hollowcrown_mira_theft');
    const miraResolved = localStorage.getItem('hollowcrown_mira_resolved');
    if (miraFlag === 'true' && miraResolved !== 'true') {
      // On the long dock (cols 18-30, rows 12-13) — walkable floor, not water.
      this.spawnNpc({
        key: 'mira', dialogueId: 'mira-greeting',
        x: 28 * TILE, y: 12 * TILE + TILE / 2,
      });
    }

    // ── Mira theft event — first visit trigger ──
    const visited = localStorage.getItem('hollowcrown_duskmere_visited');
    if (!visited && miraFlag !== 'true') {
      localStorage.setItem('hollowcrown_duskmere_visited', 'true');
      // Delay the theft event slightly so the player sees the zone name first.
      this.time.delayedCall(2500, () => {
        const ps = usePlayerStore.getState();
        const char = ps.character;
        if (!char) return;
        const stolen = Math.min(20, Math.floor(char.gold * 0.1));
        if (stolen > 0) {
          char.loseGold(stolen);
          ps.notify();
        }
        localStorage.setItem('hollowcrown_mira_theft', 'true');
        localStorage.setItem('hollowcrown_mira_stolen_amount', String(stolen));
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'Something brushes past you. Your gold pouch feels lighter.',
        }));

        // Brief visual — a dark circle darts away.
        const thief = this.add.circle(this.player.x + 20, this.player.y, 6, 0x5a3040, 0.7);
        thief.setDepth(15);
        this.tweens.add({
          targets: thief,
          x: 30 * TILE, y: 10 * TILE, alpha: 0,
          duration: 600, ease: 'Quad.easeIn',
          onComplete: () => thief.destroy(),
        });

        // Spawn Mira on the dock now.
        this.time.delayedCall(1200, () => {
          this.spawnNpc({
            key: 'mira', dialogueId: 'mira-greeting',
            x: 28 * TILE, y: 12 * TILE + TILE / 2,
          });
        });
      });
    }

    // ── Docks (wooden planks extending into the water) ──

    // Visual dock planks — drawn as darker rectangles on top of the tilemap.
    // Dock 1: short dock (cols 18-22, row 10)
    for (let dx = 18; dx <= 22; dx++) {
      this.add.rectangle(dx * TILE + TILE / 2, 10 * TILE + TILE / 2, TILE - 2, TILE - 2, 0x5a4828, 0.5).setDepth(2);
    }
    // Dock 2: long dock (cols 18-30, row 12-13)
    for (let dx = 18; dx <= 30; dx++) {
      this.add.rectangle(dx * TILE + TILE / 2, 12 * TILE + TILE / 2, TILE - 2, TILE - 2, 0x5a4828, 0.5).setDepth(2);
      this.add.rectangle(dx * TILE + TILE / 2, 13 * TILE + TILE / 2, TILE - 2, TILE - 2, 0x5a4828, 0.5).setDepth(2);
    }
    // Dock 3: medium dock (cols 18-26, row 16)
    for (let dx = 18; dx <= 26; dx++) {
      this.add.rectangle(dx * TILE + TILE / 2, 16 * TILE + TILE / 2, TILE - 2, TILE - 2, 0x5a4828, 0.5).setDepth(2);
    }

    // ── Fishing spot interactables (dock ends) ──
    const fishingSpots = [
      { x: 22 * TILE, y: 10 * TILE },
      { x: 30 * TILE, y: 12 * TILE },
      { x: 26 * TILE, y: 16 * TILE },
    ];
    for (const fs of fishingSpots) {
      const pole = this.add.rectangle(fs.x + 8, fs.y - 6, 2, 18, 0x4a3a18);
      pole.setDepth(7);
      const line = this.add.rectangle(fs.x + 12, fs.y + 4, 1, 14, 0x808080, 0.5);
      line.setDepth(7);
      void line;
      const fishSpotX = fs.x;
      const fishSpotY = fs.y;
      // Floating prompt above each spot so the player knows what to do.
      this.add.text(fs.x, fs.y - 20, 'Press E to fish', {
        fontFamily: 'Courier New', fontSize: '9px', color: '#a0c0d8',
        backgroundColor: 'rgba(10,6,6,0.6)', padding: { x: 3, y: 1 },
      }).setOrigin(0.5).setDepth(12);
      this.spawnInteractable({
        sprite: pole as any, label: 'Cast line', radius: 28,
        action: () => { this.castLine(fishSpotX, fishSpotY); },
      });
    }

    // ── Water ripple effects ──
    for (const [rx, ry, del] of [
      [24, 6, 0], [28, 14, 500], [32, 8, 1000], [36, 18, 300],
      [22, 18, 700], [26, 4, 1200], [34, 12, 400],
    ] as [number, number, number][]) {
      const ripple = this.add.circle(rx * TILE, ry * TILE, 4, 0x4080b0, 0.2);
      ripple.setDepth(3);
      this.tweens.add({
        targets: ripple, scaleX: 2.5, scaleY: 2.5, alpha: 0,
        duration: 1800, delay: del, repeat: -1, ease: 'Quad.easeOut',
      });
    }

    // ── Shadow under the water (foreshadowing) ──
    const shadow = this.add.ellipse(28 * TILE, 9 * TILE, 80, 30, 0x202040, 0.12);
    shadow.setDepth(2);
    this.tweens.add({
      targets: shadow,
      x: shadow.x + 40, y: shadow.y + 20,
      duration: 12000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // ── Old boat with carved name ──
    const boatX = 16 * TILE;
    const boatY = 14 * TILE;
    const boat = this.add.ellipse(boatX, boatY, 40, 18, 0x5a4020);
    boat.setStrokeStyle(1, 0x3a2810);
    boat.setDepth(5);
    this.spawnInteractable({
      sprite: boat as any, label: 'Examine old boat', radius: 22,
      action: () => {
        useLoreStore.getState().discover({
          key: 'old-boat-duskmere',
          title: 'The Unnamed Boat',
          text: 'A name carved into the hull, half-sanded away. Only the letters "VEY" remain.',
          location: 'Duskmere Village',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'A name carved into the hull, half-sanded away. Only the letters "VEY" remain.',
        }));
      },
    });

    // ── Notice board about missing fishermen ──
    const noticeX = 10 * TILE;
    const noticeY = 6 * TILE;
    const noticeBoard = this.add.rectangle(noticeX, noticeY, 28, 32, 0x5a4020);
    noticeBoard.setStrokeStyle(1, 0x3a2810);
    noticeBoard.setDepth(6);
    // Papers on the board
    this.add.rectangle(noticeX - 4, noticeY - 4, 12, 10, 0xd8d0b0, 0.7).setDepth(7);
    this.add.rectangle(noticeX + 4, noticeY + 2, 10, 8, 0xc8c0a0, 0.6).setDepth(7);
    this.spawnInteractable({
      sprite: noticeBoard as any, label: 'Read notice board', radius: 22,
      action: () => {
        useLoreStore.getState().discover({
          key: 'notice-missing-duskmere',
          title: 'Missing Fishermen',
          text: 'Three names. Three boats. None returned. The notices are dated weeks apart.',
          location: 'Duskmere Village',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'Three names. Three boats. None returned. The notices are dated weeks apart.',
        }));
      },
    });

    // ── Waypoint stone (village entrance) ──
    const wpX = 12 * TILE;
    const wpY = 3 * TILE;
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
      sprite: wpStone as any, label: 'Use waypoint', radius: 24,
      action: () => {
        window.dispatchEvent(new CustomEvent('openFastTravel', { detail: { currentScene: this.scene.key } }));
      },
    });

    // ── Ancient Coin #5 — under the longest dock, at the very end ──
    this.spawnAncientCoin({
      x: 32 * TILE, y: 14 * TILE,
      coinId: 'coin_5', inscription: 'Five cast into water. It returned.',
    });

    // ── Heart piece on the end of the long dock ──
    this.spawnHeartPiece(30 * TILE, 13 * TILE);

    // ── Fairy fountain behind the inn ──
    this.spawnFairyFountain({ x: 4 * TILE, y: 18 * TILE });

    // ── Enemies (low level — bandits and wolves near edges) ──
    this.spawnEnemy({ monsterKey: 'bandit', x: 8 * TILE, y: 19 * TILE });
    this.spawnEnemy({ monsterKey: 'wolf', x: 15 * TILE, y: 20 * TILE });
    this.spawnEnemy({ monsterKey: 'bandit', x: 3 * TILE, y: 20 * TILE });

    // ── Inn rest interactable (outside — bench near inn door) ──
    // Moved OFF the village path (was at 9,14 which is the path the player
    // walks to reach the inn — the prompt auto-appeared while passing by).
    // Now placed right next to the inn wall (tile 8,15, adjacent to door at 7,14).
    const benchX = 8 * TILE + TILE / 2;
    const benchY = 15 * TILE + TILE / 2;
    const bench = this.add.rectangle(benchX, benchY, 24, 10, 0x5a4020);
    bench.setStrokeStyle(1, 0x3a2810);
    bench.setDepth(5);
    this.spawnInteractable({
      sprite: bench as any, label: 'Rest at the inn (10g)', radius: 14,
      action: () => {
        const ps = usePlayerStore.getState();
        const ch = ps.character;
        if (!ch) return;
        if (ch.gold < 10) {
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Not enough gold. A bed costs 10g.' }));
          return;
        }
        ch.loseGold(10);
        ch.hp = ch.derived.maxHp;
        ch.mp = ch.derived.maxMp;
        ps.notify();
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'You rest at the inn. HP and MP fully restored. (-10g)' }));
      },
    });
    this.add.text(benchX, benchY - 14, 'Rest (10g)', {
      fontFamily: 'Courier New', fontSize: '10px', color: '#80a0c0',
      backgroundColor: 'rgba(10,6,6,0.7)', padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 1).setDepth(11);

    // ── Loot bag on the dock ──
    this.spawnLootBag({
      x: 24 * TILE, y: 12 * TILE,
      loot: [
        { itemKey: 'grilled_pike', weight: 3 },
        { itemKey: 'smoked_eel', weight: 2 },
        { itemKey: 'health_potion', weight: 2 },
      ],
      gold: 15, spawnChance: 0.3,
    });

    // ── Chest behind the stall ──
    this.spawnChest({
      x: 14 * TILE, y: 10 * TILE,
      loot: [{ itemKey: 'lake_tonic', qty: 2 }, { itemKey: 'smoked_eel' }],
      gold: 25,
    });

    // ── Seagull decorations (small white dots drifting) ──
    for (const [gx, gy, gdx, gdy, gdur] of [
      [20, 3, 30, -10, 6000],
      [28, 5, -20, 15, 7000],
      [34, 2, 25, 8, 5500],
    ] as [number, number, number, number, number][]) {
      const gull = this.add.circle(gx * TILE, gy * TILE, 3, 0xf0f0f0, 0.7);
      gull.setDepth(55);
      this.tweens.add({
        targets: gull,
        x: gull.x + gdx, y: gull.y + gdy,
        duration: gdur, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // Zone label
    this.add.text(WORLD_W / 2, WORLD_H - TILE * 2, 'DUSKMERE VILLAGE', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#5a6a7a',
    }).setOrigin(0.5).setAlpha(0.4).setDepth(15);

    // ── Exits ──

    // North edge → Greenhollow
    this.addExit({
      x: 0, y: 0, w: WORLD_W, h: TILE,
      targetScene: 'GreenhollowScene', targetSpawn: 'fromDuskmere',
      label: '\u2191 Greenhollow Woods',
    });

    // South edge → teaser (future zone)
    const teaserX = WORLD_W / 2;
    const teaserY = WORLD_H - TILE / 2;
    this.add.text(teaserX, teaserY, '??? \u2014 The shore continues', {
      fontFamily: 'Courier New', fontSize: '11px', color: '#5a6a7a',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(15);
    const teaserSprite = this.add.rectangle(teaserX, teaserY, WORLD_W / 3, TILE, 0x000000, 0);
    this.spawnInteractable({
      sprite: teaserSprite as any, label: 'Look south', radius: 36,
      action: () => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'The lakeshore curves south into mist. The path is not yet clear.',
        }));
      },
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromDuskmereInn':
        return { x: 8 * TILE + TILE / 2, y: 15 * TILE + TILE / 2 };
      case 'fromDockmaster':
        return { x: 5 * TILE + TILE / 2, y: 9 * TILE };
      case 'fromFisherCabin':
        return { x: 11 * TILE + TILE, y: 16 * TILE + TILE / 2 };
      case 'fromGreenhollow':
      case 'default':
      default:
        return { x: 12 * TILE, y: 2 * TILE };
    }
  }

  /**
   * Draws a painted building silhouette on top of the tilemap — a peaked
   * roof, a wall face, and a visible door. Purely cosmetic; collision
   * comes from addBuilding's invisible wall segments.
   */
  private drawBuildingSilhouette(
    xTile: number, yTile: number, wTile: number, hTile: number,
    wallColor: number, roofColor: number,
  ): void {
    const px = xTile * TILE;
    const py = yTile * TILE;
    const pw = wTile * TILE;
    const ph = hTile * TILE;

    // Wall face
    const wall = this.add.rectangle(px + pw / 2, py + ph / 2, pw, ph, wallColor);
    wall.setStrokeStyle(2, 0x1a0e08);
    wall.setDepth(3);

    // Peaked roof — a triangle over the top edge, plus a thicker roof-eave bar.
    const roofH = Math.floor(TILE * 0.9);
    const roof = this.add.triangle(
      px + pw / 2, py - roofH + 2,
      0, roofH, pw / 2, 0, pw, roofH, roofColor,
    );
    roof.setStrokeStyle(2, 0x1a0e08);
    roof.setDepth(4);
    // Eave shadow beam
    this.add.rectangle(px + pw / 2, py + 2, pw + 6, 4, 0x1a0e08, 0.9).setDepth(4);

    // Windows (two small yellow squares on the wall face)
    const winY = py + Math.floor(ph * 0.35);
    this.add.rectangle(px + pw * 0.25, winY, 10, 10, 0xd4a968, 0.6).setStrokeStyle(1, 0x1a0e08).setDepth(5);
    this.add.rectangle(px + pw * 0.75, winY, 10, 10, 0xd4a968, 0.6).setStrokeStyle(1, 0x1a0e08).setDepth(5);
  }

  /**
   * Cast a line from the given dock-end fishing spot. Shows clear on-screen
   * prompts, then a BITE banner after 2-5s. Player has 1.5s to press E to
   * reel in. Success gives an item + quest progress; miss does nothing
   * punitive. Only one cast can be in flight at a time.
   */
  private isFishing = false;
  private castLine(fishSpotX: number, fishSpotY: number): void {
    if (this.isFishing) return;
    this.isFishing = true;

    // Rod bob animation on the pole nearest the spot (cosmetic text cue).
    const castText = this.add.text(fishSpotX, fishSpotY - 40, 'Casting... wait for the bite', {
      fontFamily: 'Courier New', fontSize: '12px', color: '#a0c0d8',
      backgroundColor: 'rgba(10,6,6,0.85)', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(60).setScrollFactor(0);
    // center on screen
    castText.setPosition(WORLD_W / 2, WORLD_H - 90);

    const cleanup = () => {
      this.isFishing = false;
      castText.destroy();
    };

    const delay = 2000 + Math.random() * 3000;
    this.time.delayedCall(delay, () => {
      if (!this.isFishing) return; // cancelled
      castText.setText('!  BITE!  Press E!');
      castText.setColor('#ffd060');
      // flash
      this.tweens.add({
        targets: castText, scale: 1.2, duration: 120, yoyo: true, repeat: 2,
      });

      let caught = false;
      const catchHandler = (e: KeyboardEvent) => {
        if (e.key !== 'e' && e.key !== 'E') return;
        if (caught) return;
        caught = true;
        window.removeEventListener('keydown', catchHandler);

        const catches = ['grilled_pike', 'smoked_eel', 'lake_tonic', 'health_potion', 'iron_ore', 'golden_carp'];
        const weights = [4, 3, 2, 2, 1, 1];
        const total = weights.reduce((a, b) => a + b, 0);
        let roll = Math.random() * total;
        let item = catches[0];
        for (let i = 0; i < catches.length; i++) {
          roll -= weights[i];
          if (roll <= 0) { item = catches[i]; break; }
        }
        useInventoryStore.getState().addItem(item);
        const name = getItem(item).name;
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: `Caught a ${name}!` }));
        this.spawnPickupParticles(fishSpotX, fishSpotY, 0x4080b0);

        const fishCount = parseInt(localStorage.getItem('hollowcrown_fish_caught') ?? '0', 10) + 1;
        localStorage.setItem('hollowcrown_fish_caught', String(fishCount));
        if (fishCount >= 3) {
          useQuestStore.getState().completeObjective('deep-hook', 'fish-objects');
        }
        cleanup();
      };
      window.addEventListener('keydown', catchHandler);

      // 1.5s reaction window
      this.time.delayedCall(1500, () => {
        if (caught) return;
        window.removeEventListener('keydown', catchHandler);
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'The fish slipped the hook.' }));
        cleanup();
      });
    });
  }
}

// ─── Map data ─────────────────────────────────────────────────

const G  = T.GRASS_DARK;
const g  = T.GRASS_LIGHT;
const P  = T.PATH;
const PE = T.PATH_EDGE;
const FW = T.FLOOR_WOOD;
const W  = T.WALL_WOOD;
const D  = T.DOOR;
const R  = T.ROOF;
const RE = T.ROOF_EDGE;
const SH = T.SHADOW;
const Wa = T.WATER;

function buildMapData(): number[][] {
  const rows: number[][] = [];
  for (let y = 0; y < MAP_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_W; x++) row.push(tileAt(x, y));
    rows.push(row);
  }
  return rows;
}

function tileAt(x: number, y: number): number {
  // ── Lake: eastern half (cols 22-39) ──
  if (x >= 22) return Wa;

  // ── Dockmaster's Office: (3,4) to (7,7) ──
  if (y === 3 && x >= 3 && x < 8) return R;
  if (y === 4 && x >= 3 && x < 8) return RE;
  if (inRect(x, y, 3, 5, 5, 3)) {
    if (x === 3 || x === 7) return W;
    if (y === 7) {
      if (x === 5 || x === 6) return D;
      return W;
    }
    return FW;
  }
  if (y === 8 && x >= 3 && x < 8) {
    if (x === 5 || x === 6) return P;
    return SH;
  }

  // ── Lakeshore Inn: (2,12) to (7,16) ──
  if (y === 11 && x >= 2 && x < 8) return R;
  if (y === 12 && x >= 2 && x < 8) return RE;
  if (inRect(x, y, 2, 13, 6, 4)) {
    if (x === 2 || x === 7) return W;
    if (y === 16) return W;
    if (y === 14 && x === 7) return D; // right side door
    return FW;
  }
  if (y === 17 && x >= 2 && x < 8) return SH;

  // ── Dock planks over water (cols 18-30, various rows) ──
  // Dock 1: row 10, cols 18-22
  if (y === 10 && x >= 18 && x <= 22) return FW;
  // Dock 2: rows 12-13, cols 18-30
  if ((y === 12 || y === 13) && x >= 18 && x <= 30) return FW;
  // Dock 3: row 16, cols 18-26
  if (y === 16 && x >= 18 && x <= 26) return FW;
  // Connecting dock strip (col 18, rows 9-17)
  if (x === 18 && y >= 9 && y <= 17) return FW;
  if (x === 19 && y >= 9 && y <= 17) return FW;

  // ── Main village path (north-south, cols 10-13) ──
  if (x >= 11 && x <= 12 && y >= 0 && y <= 20) return P;
  if ((x === 10 || x === 13) && y >= 0 && y <= 20) return PE;

  // ── East-west path to docks (rows 9-10, cols 12-19) ──
  if (y === 9 && x >= 12 && x <= 19) return P;
  if (y === 10 && x >= 12 && x <= 17) return P;
  if (y === 8 && x >= 14 && x <= 19) return PE;
  if (y === 11 && x >= 14 && x <= 17) return PE;

  // ── Path to inn (row 14, cols 8-10) ──
  if (y === 14 && x >= 8 && x <= 10) return P;
  if (y === 13 && x >= 8 && x <= 10) return PE;
  if (y === 15 && x >= 8 && x <= 10) return PE;

  // ── Village green areas ──
  // Light grass near buildings and paths
  if (x >= 1 && x <= 9 && y >= 1 && y <= 10) return g;
  if (x >= 1 && x <= 9 && y >= 18 && y <= 20) return g;
  if (x >= 14 && x <= 17 && y >= 4 && y <= 7) return g;

  // ── Dark grass everywhere else on the land side ──
  return G;
}

function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}
