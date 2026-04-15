import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';

/**
 * Greenhollow Woods — the first zone outside Ashenvale. Forest floor,
 * scattered trees, a dirt path winding up from the southern road, and
 * Orric the forester's cabin to the north. Orric is an NPC who knows
 * something about Veyrin, threading the hook Brenna planted.
 *
 * Exits:
 *   - North edge (top) returns to Ashenvale
 */
export class GreenhollowScene extends BaseWorldScene {
  constructor() {
    super({ key: 'GreenhollowScene' });
  }

  protected layout(): void {
    // Dark forest floor.
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x0e1a10);

    // Winding dirt path — a few overlapping strips suggest a meandering trail.
    const pathColor = 0x3a2f1e;
    const pathAlpha = 0.55;
    this.add.rectangle(WORLD_W / 2, WORLD_H - 80, WORLD_W, 64, pathColor).setAlpha(pathAlpha);
    this.add
      .rectangle(WORLD_W / 2 - 120, WORLD_H / 2 + 40, 8 * TILE, 3 * TILE, pathColor)
      .setAlpha(pathAlpha);
    this.add
      .rectangle(WORLD_W / 2 + 100, WORLD_H / 2 - 40, 9 * TILE, 3 * TILE, pathColor)
      .setAlpha(pathAlpha);
    this.add
      .rectangle(WORLD_W / 2 + 240, 5 * TILE + 8, 6 * TILE, 3 * TILE, pathColor)
      .setAlpha(pathAlpha);

    // Scatter a cluster of tree circles — dark green with a darker core.
    this.scatterTrees();

    // Orric's cabin — smaller than town buildings, tucked in the upper right.
    const cabinX = 30 * TILE;
    const cabinY = 3 * TILE;
    const cabinW = 5 * TILE;
    const cabinH = 3 * TILE;
    this.addWall(cabinX, cabinY, cabinW, cabinH, 0x4a3220);
    this.add
      .text(cabinX + cabinW / 2, cabinY - 10, "Orric's Cabin", {
        fontFamily: 'Courier New',
        fontSize: '13px',
        color: '#8a7a48',
      })
      .setOrigin(0.5, 1);
    this.add
      .rectangle(cabinX + cabinW / 2, cabinY + cabinH - 4, TILE, 8, 0x1a0e08)
      .setOrigin(0.5, 0.5);

    // Orric at the cabin door.
    this.spawnNpc({
      key: 'orric',
      dialogueId: 'orric-greeting',
      x: 32 * TILE + 16,
      y: 7 * TILE,
    });

    // Zone marker — a text sign near the entrance from Ashenvale.
    this.add
      .text(WORLD_W / 2, WORLD_H - TILE * 4, 'GREENHOLLOW WOODS', {
        fontFamily: 'Courier New',
        fontSize: '14px',
        color: '#6a5838',
        backgroundColor: 'rgba(10,6,6,0.4)',
        padding: { x: 8, y: 3 },
      })
      .setOrigin(0.5);

    // North edge exit back to Ashenvale.
    this.addExit({
      x: 0,
      y: 0,
      w: WORLD_W,
      h: TILE,
      targetScene: 'TownScene',
      targetSpawn: 'fromGreenhollow',
      label: '↑ Ashenvale',
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromAshenvale':
        // Entered from north edge of Ashenvale (= top in world coords... wait:
        // Ashenvale's SOUTH edge connects to Greenhollow's SOUTH edge, so the
        // player arrives at the south of the woods and walks north toward
        // Orric's cabin). Spawn near the southern entrance.
        return { x: WORLD_W / 2, y: WORLD_H - TILE * 3 };
      case 'default':
      default:
        return { x: WORLD_W / 2, y: WORLD_H - TILE * 3 };
    }
  }

  /** Sprinkle tree circles across the map, avoiding the path area. */
  private scatterTrees(): void {
    // Deterministic positions so the forest looks hand-placed rather than
    // random-noisy. Each entry is [tileX, tileY].
    const trees: [number, number][] = [
      [2, 2], [4, 3], [6, 2], [9, 1], [12, 3], [14, 2], [16, 4], [22, 2],
      [25, 4], [27, 2], [36, 4], [38, 2], [1, 7], [3, 9], [5, 11], [7, 13],
      [4, 15], [2, 17], [6, 18], [10, 19], [15, 18], [19, 19], [24, 18],
      [28, 19], [33, 17], [37, 18], [39, 16], [37, 13], [38, 11], [39, 9],
      [2, 12], [7, 17], [11, 16], [14, 14], [18, 11], [21, 13], [26, 14],
      [4, 4], [11, 7], [15, 9], [20, 5], [24, 8], [29, 9], [35, 10], [38, 7],
    ];
    for (const [tx, ty] of trees) {
      const cx = tx * TILE;
      const cy = ty * TILE;
      // Outer foliage
      const outer = this.add.circle(cx, cy, 18, 0x1a3018);
      outer.setStrokeStyle(1, 0x0a1a08);
      // Darker core
      this.add.circle(cx, cy, 10, 0x0e2010);
      // Small physics body so player bumps off them.
      this.physics.add.existing(outer, true);
      (outer.body as Phaser.Physics.Arcade.StaticBody).setCircle(14);
      this.walls.add(outer);
    }
  }
}
