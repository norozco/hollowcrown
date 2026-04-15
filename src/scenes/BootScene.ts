import * as Phaser from 'phaser';

/**
 * First scene the game boots into. Responsible for loading foundational
 * assets (fonts, UI atlas, loading bar art). For now it simply hands off
 * to the placeholder scene — we will fill in asset loading in later
 * milestones.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Intentionally empty for Milestone 1.
    // Future milestones will load tilesets, sprite atlases, UI packs here.
  }

  create(): void {
    this.scene.start('PlaceholderScene');
  }
}
