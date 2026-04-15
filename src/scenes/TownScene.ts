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

    // Buildings — hollow rooms with a south-facing door. addBuilding
    // returns the coords just outside the door so NPCs can be placed
    // near (not blocking) it.
    const guildDoor = this.addBuilding({
      xTile: 7,
      yTile: 5,
      wTile: 6,
      hTile: 4,
      color: 0x4a2e1a,
      label: "Adventurers' Guild",
      doorSide: 'bottom',
    }).doorOutside;
    const innDoor = this.addBuilding({
      xTile: 17,
      yTile: 5,
      wTile: 6,
      hTile: 4,
      color: 0x3a2a30,
      label: 'Whispering Hollow Inn',
      doorSide: 'bottom',
    }).doorOutside;
    const shopDoor = this.addBuilding({
      xTile: 28,
      yTile: 5,
      wTile: 5,
      hTile: 3,
      color: 0x3a3420,
      label: 'General Store',
      doorSide: 'bottom',
    }).doorOutside;

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

    // NPCs — stand BESIDE their doors (offset one tile to the right)
    // so the doorway itself stays clear.
    this.spawnNpc({
      key: 'brenna',
      dialogueId: 'guild-greeting',
      x: guildDoor.x + TILE,
      y: guildDoor.y,
    });
    this.spawnNpc({
      key: 'tomas',
      dialogueId: 'tomas-greeting',
      x: innDoor.x + TILE,
      y: innDoor.y,
    });
    this.spawnNpc({
      key: 'vira',
      dialogueId: 'vira-greeting',
      x: shopDoor.x + TILE,
      y: shopDoor.y,
    });

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
