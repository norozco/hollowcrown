import * as Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { PlaceholderScene } from '../scenes/PlaceholderScene';
import { TownScene } from '../scenes/TownScene';
import { GreenhollowScene } from '../scenes/GreenhollowScene';
import { MossbarrowScene } from '../scenes/MossbarrowScene';
import { InteriorScene } from '../scenes/InteriorScene';
import { CombatScene } from '../scenes/CombatScene';

/**
 * Authoritative Phaser game config. Kept separate from the React mount
 * component so it's easy to tweak without touching the render pipeline.
 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#0a0606',
  pixelArt: true, // nearest-neighbor scaling — required for pixel-art aesthetic
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: false,
    roundPixels: true,
  },
  // Top-down arcade physics — no gravity, simple collision bodies.
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [BootScene, PlaceholderScene, TownScene, GreenhollowScene, MossbarrowScene, InteriorScene, CombatScene],
};
