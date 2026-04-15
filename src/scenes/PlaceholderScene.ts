import * as Phaser from 'phaser';

/**
 * Temporary scene that proves the Phaser canvas is alive and rendering.
 * Shows a 32×32 grid and a label. Will be replaced by TownScene /
 * CombatScene / DungeonScene in future milestones.
 */
export class PlaceholderScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlaceholderScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor('#0a0606');

    // Draw a subtle 32-pixel grid so we can visually confirm tile alignment.
    const gfx = this.add.graphics({ lineStyle: { width: 1, color: 0x2a1818 } });
    for (let x = 0; x <= width; x += 32) {
      gfx.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += 32) {
      gfx.lineBetween(0, y, width, y);
    }

    // Center label — reassures us the scene is running.
    this.add
      .text(width / 2, height / 2, 'PHASER CANVAS ALIVE', {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#6b3030',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 40, '(placeholder — milestone 1)', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#4a2020',
      })
      .setOrigin(0.5);
  }
}
