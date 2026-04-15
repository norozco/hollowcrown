import * as Phaser from 'phaser';
import { useDialogueStore } from '../state/dialogueStore';
import { getDialogue } from '../engine/dialogues';
import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';

/**
 * Mossbarrow Cairn — the second objective destination for the Iron Token
 * quest. Orric warned the player about it; the old cairn under ivy,
 * past the hollow oak, is where Veyrin went and did not come back.
 *
 * No combat yet. The player finds Veyrin's notebook at the center of
 * the cairn; reading it completes the quest's second objective (and
 * thus the whole quest).
 *
 * Exits:
 *   - West edge → back to Greenhollow
 */
export class MossbarrowScene extends BaseWorldScene {
  constructor() {
    super({ key: 'MossbarrowScene' });
  }

  protected layout(): void {
    // Dark stone floor, almost greyscale — colder than Greenhollow.
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x161414);

    // Cold moss patches sprinkled to break up the grey.
    const mossSpots: [number, number][] = [
      [4, 3], [8, 6], [12, 2], [15, 9], [20, 4], [25, 11], [30, 5], [35, 3],
      [6, 14], [14, 16], [22, 18], [28, 15], [34, 17], [18, 12], [24, 7],
    ];
    for (const [tx, ty] of mossSpots) {
      this.add
        .rectangle(tx * TILE, ty * TILE, TILE, TILE, 0x1a2418)
        .setAlpha(0.45);
    }

    // The hollow oak — a tall dead tree west of the cairn, per Orric's line.
    this.drawHollowOak(10 * TILE, 8 * TILE);

    // The cairn itself — a rough circle of grey stones in the center.
    const cairnCx = 22 * TILE;
    const cairnCy = 11 * TILE;
    this.drawCairnRing(cairnCx, cairnCy, 4 * TILE);

    // Ivy stones scattered around the cairn outer edge.
    this.drawIvyStones([
      [18, 7], [26, 7], [18, 15], [26, 15], [14, 11], [30, 11],
    ]);

    // Zone marker near the west entrance.
    this.add
      .text(2 * TILE, WORLD_H / 2, 'MOSSBARROW CAIRN', {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#6a5838',
        backgroundColor: 'rgba(10,6,6,0.55)',
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0, 0.5);

    // West-edge exit back to Greenhollow.
    this.addExit({
      x: 0,
      y: 0,
      w: TILE,
      h: WORLD_H,
      targetScene: 'GreenhollowScene',
      targetSpawn: 'fromMossbarrow',
      label: '← Greenhollow',
    });

    // Interactable center stone — the quest payoff.
    const centerStone = this.add.rectangle(cairnCx, cairnCy, 40, 40, 0x2a2824);
    centerStone.setStrokeStyle(2, 0x0a0a08);
    this.physics.add.existing(centerStone, true);
    this.walls.add(centerStone);

    this.spawnInteractable({
      sprite: centerStone,
      label: 'Examine the center stone',
      radius: 28,
      action: () => {
        useDialogueStore
          .getState()
          .start(getDialogue('mossbarrow-cairn'));
      },
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromGreenhollow':
        // Entered from west → spawn just inside the west edge.
        return { x: 2 * TILE + 16, y: WORLD_H / 2 };
      case 'default':
      default:
        return { x: 2 * TILE + 16, y: WORLD_H / 2 };
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Scenery helpers
  // ──────────────────────────────────────────────────────────────

  private drawHollowOak(cx: number, cy: number): void {
    // Trunk
    const trunk = this.add.rectangle(cx, cy, 48, 80, 0x2a1e14);
    trunk.setStrokeStyle(2, 0x0a0a08);
    this.physics.add.existing(trunk, true);
    this.walls.add(trunk);
    // Hollow
    this.add.rectangle(cx, cy + 10, 20, 30, 0x080604);
    // Dead branches — two diagonal strips on top
    this.add.line(cx, cy - 48, 0, 0, -28, -16, 0x2a1e14).setLineWidth(3);
    this.add.line(cx, cy - 48, 0, 0, 30, -14, 0x2a1e14).setLineWidth(3);
  }

  private drawCairnRing(cx: number, cy: number, radius: number): void {
    // 6 tall stones arranged in a rough circle.
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const sx = cx + Math.cos(angle) * radius;
      const sy = cy + Math.sin(angle) * radius;
      const stone = this.add.rectangle(sx, sy, 32, 56, 0x3a3834);
      stone.setStrokeStyle(2, 0x141210);
      this.physics.add.existing(stone, true);
      this.walls.add(stone);
      // A small dark marking etched on each stone
      this.add.rectangle(sx, sy - 4, 6, 14, 0x141210);
    }
  }

  private drawIvyStones(positions: [number, number][]): void {
    for (const [tx, ty] of positions) {
      const cx = tx * TILE;
      const cy = ty * TILE;
      const stone = this.add.rectangle(cx, cy, 28, 28, 0x2a2824);
      stone.setStrokeStyle(1, 0x0a0a08);
      this.physics.add.existing(stone, true);
      (stone.body as Phaser.Physics.Arcade.StaticBody).setSize(28, 28);
      this.walls.add(stone);
      // Ivy overlay — small green blobs
      this.add.circle(cx - 6, cy - 2, 4, 0x1a3018);
      this.add.circle(cx + 5, cy + 6, 3, 0x1a3018);
    }
  }
}
