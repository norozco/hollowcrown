import * as Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { PlaceholderScene } from '../scenes/PlaceholderScene';
import { TownScene } from '../scenes/TownScene';
import { GreenhollowScene } from '../scenes/GreenhollowScene';
import { MossbarrowScene } from '../scenes/MossbarrowScene';
import { MossbarrowDepthsScene } from '../scenes/MossbarrowDepthsScene';
import { DepthsFloor2Scene } from '../scenes/DepthsFloor2Scene';
import { DepthsFloor3Scene } from '../scenes/DepthsFloor3Scene';
import { InteriorScene } from '../scenes/InteriorScene';
import { AshenmereScene } from '../scenes/AshenmereScene';
import { IronveilScene } from '../scenes/IronveilScene';
import { DrownedSanctumF1Scene } from '../scenes/DrownedSanctumF1Scene';
import { DrownedSanctumF2Scene } from '../scenes/DrownedSanctumF2Scene';
import { BogDungeonF1Scene } from '../scenes/BogDungeonF1Scene';
import { BogDungeonF2Scene } from '../scenes/BogDungeonF2Scene';
import { BogDungeonF3Scene } from '../scenes/BogDungeonF3Scene';
import { DuskmereScene } from '../scenes/DuskmereScene';
import { AshfieldsScene } from '../scenes/AshfieldsScene';
import { AshenTowerF1Scene } from '../scenes/AshenTowerF1Scene';
import { AshenTowerF2Scene } from '../scenes/AshenTowerF2Scene';
import { AshenTowerF3Scene } from '../scenes/AshenTowerF3Scene';
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
  scene: [BootScene, PlaceholderScene, TownScene, GreenhollowScene, MossbarrowScene, MossbarrowDepthsScene, DepthsFloor2Scene, DepthsFloor3Scene, AshenmereScene, IronveilScene, DrownedSanctumF1Scene, DrownedSanctumF2Scene, BogDungeonF1Scene, BogDungeonF2Scene, BogDungeonF3Scene, DuskmereScene, AshfieldsScene, AshenTowerF1Scene, AshenTowerF2Scene, AshenTowerF3Scene, InteriorScene, CombatScene],
};
