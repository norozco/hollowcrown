import * as Phaser from 'phaser';
import {
  USE_SPRITE_TILES,
  TOWN_KEY,
  TOWN_URL,
  DUNGEON_KEY,
  DUNGEON_URL,
} from './tiles/tileMap';

/**
 * First scene the game boots into. Responsible for loading foundational
 * assets (fonts, UI atlas, loading bar art, Kenney CC0 tilesets).
 *
 * The Kenney sheets are optional — if a load fails (offline, missing
 * file) the game still runs on the procedural tileset fallback.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    if (USE_SPRITE_TILES) {
      // Kenney Roguelike/RPG Pack: 57×31 tiles of 16×16 with 1px gap.
      // Kenney Tiny Dungeon: 12×11 tiles of 16×16, no gap.
      // Note: the tileset overlay pipeline in tiles/generateTiles.ts reads
      // raw pixels from the source image using SHEET_GEOM, so the
      // frame-based spritesheet slicing here is only used if anything
      // later wants to access tiles by frame index.
      this.load.spritesheet(TOWN_KEY, TOWN_URL, { frameWidth: 16, frameHeight: 16, margin: 0, spacing: 1 });
      this.load.spritesheet(DUNGEON_KEY, DUNGEON_URL, { frameWidth: 16, frameHeight: 16 });
      // Tolerate missing files (offline dev, fresh checkout without npm run fetch-tilesets).
      this.load.on('loaderror', (file: Phaser.Loader.File) => {
        if (file.key === TOWN_KEY || file.key === DUNGEON_KEY) {
          // eslint-disable-next-line no-console
          console.warn(`[BootScene] sprite tileset '${file.key}' failed to load — falling back to procedural tiles`);
        }
      });
    }
  }

  create(): void {
    this.scene.start('PlaceholderScene');
  }
}
