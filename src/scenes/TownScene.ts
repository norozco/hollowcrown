import { BaseWorldScene, TILE, WORLD_W, WORLD_H } from './BaseWorldScene';

/**
 * Ashenvale — starter town. Paints the ground, 3 building footprints,
 * an empty-plot marker, 3 NPCs in front of their respective buildings,
 * and a south-edge exit to Greenhollow Woods.
 */
export class TownScene extends BaseWorldScene {
  constructor() {
    super({ key: 'TownScene' });
  }

  protected layout(): void {
    // Ground — dark mossy green with a worn horizontal path.
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x1a2418);
    this.add
      .rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, TILE * 3, 0x3a2f1e)
      .setAlpha(0.5);

    // Buildings (x, y in tiles from top-left).
    const buildings: {
      x: number;
      y: number;
      w: number;
      h: number;
      color: number;
      label: string;
    }[] = [
      { x: 7, y: 5, w: 6, h: 4, color: 0x4a2e1a, label: "Adventurers' Guild" },
      { x: 17, y: 5, w: 6, h: 4, color: 0x3a2a30, label: 'Whispering Hollow Inn' },
      { x: 28, y: 5, w: 5, h: 3, color: 0x3a3420, label: 'General Store' },
    ];
    for (const b of buildings) {
      const px = b.x * TILE;
      const py = b.y * TILE;
      const pw = b.w * TILE;
      const ph = b.h * TILE;
      this.addWall(px, py, pw, ph, b.color);
      this.add
        .text(px + pw / 2, py - 10, b.label, {
          fontFamily: 'Courier New',
          fontSize: '13px',
          color: '#8a7a48',
        })
        .setOrigin(0.5, 1);
      // Darker slot at the doorway.
      this.add
        .rectangle(px + pw / 2, py + ph - 4, TILE, 8, 0x1a0e08)
        .setOrigin(0.5, 0.5);
    }

    // Empty plot (spec §6.1).
    const plot = { x: 10 * TILE, y: 13 * TILE, w: 5 * TILE, h: 3 * TILE };
    this.add
      .rectangle(plot.x + plot.w / 2, plot.y + plot.h / 2, plot.w, plot.h, 0x2a2418)
      .setStrokeStyle(1, 0x3a2818);
    this.add
      .text(plot.x + plot.w / 2, plot.y + plot.h / 2, '[ Empty Plot ]', {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#5a4828',
      })
      .setOrigin(0.5);

    // NPCs
    this.spawnNpc({ key: 'brenna', dialogueId: 'guild-greeting', x: 10 * TILE, y: 10 * TILE });
    this.spawnNpc({ key: 'tomas', dialogueId: 'tomas-greeting', x: 20 * TILE, y: 10 * TILE });
    this.spawnNpc({ key: 'vira', dialogueId: 'vira-greeting', x: 30 * TILE, y: 9 * TILE });

    // South-edge exit to Greenhollow Woods.
    this.addExit({
      x: 0,
      y: WORLD_H - TILE,
      w: WORLD_W,
      h: TILE,
      targetScene: 'GreenhollowScene',
      targetSpawn: 'fromAshenvale',
      label: '→ Greenhollow Woods',
    });
  }

  protected spawnAt(name: string): { x: number; y: number } {
    switch (name) {
      case 'fromGreenhollow':
        // Coming back from the woods — arrive near the south edge.
        return { x: WORLD_W / 2, y: WORLD_H - TILE * 3 };
      case 'default':
      default:
        // Fresh arrival — spawn center-south of town.
        return { x: WORLD_W / 2, y: 16 * TILE };
    }
  }
}
