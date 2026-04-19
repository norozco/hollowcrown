import * as Phaser from 'phaser';
import { useLoreStore } from '../state/loreStore';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';
import { generateTileset, TILE as T, TILE_SIZE } from './tiles/generateTiles';

/**
 * The Forgotten Cave — tiny hidden scene (20x16). Contains the secret
 * superboss "The Forgotten". Accessed from Greenhollow after the
 * crownless_one quest is turned in (post-game).
 *
 * Dark room — even with the Lantern, this room is dim. The Forgotten
 * enemy stands in the center. One lore object.
 */

const MAP_W = 20;
const MAP_H = 16;

export class ForgottenCaveScene extends BaseWorldScene {
  constructor() {
    super({ key: 'ForgottenCaveScene' });
  }

  protected getZoneName(): string | null { return 'The Forgotten Cave'; }

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

    // Force dark room — even WITH the Lantern, dim
    this.setDarkRoom(true);

    // Wall collision
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        if (mapData[ty][tx] === T.WALL_STONE) {
          const w = this.add.rectangle(
            tx * TILE + TILE / 2, ty * TILE + TILE / 2, TILE, TILE, 0x000000, 0);
          this.physics.add.existing(w, true);
          this.walls.add(w);
        }
      }
    }

    // ── Ambient void glow (purple) ──
    for (const [tx, ty] of [
      [5, 4], [14, 4], [5, 11], [14, 11], [10, 3], [10, 12],
    ] as [number, number][]) {
      const glow = this.add.circle(tx * TILE, ty * TILE, 14, 0x300060, 0.06).setDepth(4);
      this.tweens.add({ targets: glow, alpha: 0.02, scale: 1.4, duration: 2800, yoyo: true, repeat: -1 });
    }

    // ── The Forgotten (superboss) — center of the room ──
    this.spawnEnemy({ monsterKey: 'the_forgotten', x: 10 * TILE, y: 8 * TILE });

    // ── Lore object — stone tablet ──
    const loreX = 10 * TILE;
    const loreY = 12 * TILE;
    const loreTablet = this.add.rectangle(loreX, loreY, 24, 16, 0x282030, 0.6);
    loreTablet.setStrokeStyle(1, 0x180020);
    loreTablet.setDepth(6);
    this.spawnInteractable({
      sprite: loreTablet as any,
      label: 'Read tablet',
      radius: 22,
      action: () => {
        useLoreStore.getState().discover({
          key: 'forgotten-cave-tablet',
          title: 'The Forgotten Tablet',
          text: 'You found what was never meant to be found.',
          location: 'The Forgotten Cave',
        });
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'You found what was never meant to be found.',
        }));
      },
    });

    // ── The Watcher (custom line for this scene) ──
    const WATCHER_LINE = 'I found this place. I should not have. Neither should you.';
    const watcher = this.add.circle(14 * TILE, 12 * TILE, 8, 0x8080c0, 0.3);
    watcher.setDepth(12);
    const watcherGlow = this.add.circle(14 * TILE, 12 * TILE, 16, 0x8080c0, 0.08);
    watcherGlow.setDepth(11);
    this.spawnInteractable({
      sprite: watcher as any,
      label: 'Approach the figure',
      radius: 28,
      action: () => {
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: WATCHER_LINE }));
        useLoreStore.getState().discover({
          key: 'watcher-ForgottenCaveScene',
          title: 'The Watcher',
          text: WATCHER_LINE,
          location: 'The Forgotten Cave',
        });
        this.tweens.add({
          targets: [watcher, watcherGlow],
          alpha: 0, duration: 800,
          onComplete: () => { watcher.destroy(); watcherGlow.destroy(); },
        });
      },
    });

    // ── Exit — top edge → Greenhollow ──
    this.addExit({
      x: 8 * TILE, y: 0,
      w: 4 * TILE, h: TILE,
      targetScene: 'GreenhollowScene',
      targetSpawn: 'fromForgottenCave',
      label: '\u25B2 Greenhollow Woods',
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromGreenhollow':
      case 'default':
      default:
        return { x: 10 * TILE, y: 2 * TILE };
    }
  }
}

// ─── Map data ──────────────────────────────────────────────────

function buildMapData(): number[][] {
  const WS = T.WALL_STONE;
  const FC = T.FLOOR_CRACKED;

  const rows: number[][] = [];
  for (let y = 0; y < MAP_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_W; x++) {
      // Border walls
      if (x === 0 || x === MAP_W - 1 || y === 0 || y === MAP_H - 1) {
        // Exit gap at top center
        if (y === 0 && x >= 8 && x <= 11) {
          row.push(FC);
        } else {
          row.push(WS);
        }
      }
      // Inner wall ring (3 tiles from edge)
      else if (x === 3 || x === MAP_W - 4 || y === 3 || y === MAP_H - 4) {
        // Openings for passage
        if ((x === 3 || x === MAP_W - 4) && y >= 6 && y <= 9) {
          row.push(FC);
        } else if ((y === 3 || y === MAP_H - 4) && x >= 8 && x <= 11) {
          row.push(FC);
        } else {
          row.push(WS);
        }
      } else {
        row.push(FC);
      }
    }
    rows.push(row);
  }
  return rows;
}
