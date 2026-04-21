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
import { FrosthollowScene } from '../scenes/FrosthollowScene';
import { FrozenHollowF1Scene } from '../scenes/FrozenHollowF1Scene';
import { FrozenHollowF2Scene } from '../scenes/FrozenHollowF2Scene';
import { FrozenHollowF3Scene } from '../scenes/FrozenHollowF3Scene';
import { ShatteredCoastScene } from '../scenes/ShatteredCoastScene';
import { ThroneBeneathF1Scene } from '../scenes/ThroneBeneathF1Scene';
import { ThroneBeneathF2Scene } from '../scenes/ThroneBeneathF2Scene';
import { ThroneBeneathF3Scene } from '../scenes/ThroneBeneathF3Scene';
import { ForgottenCaveScene } from '../scenes/ForgottenCaveScene';
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
  // FPS / loop config — smoothStep clamps large dt spikes after the tab was
  // backgrounded or the window minimized, preventing catch-up stutter.
  fps: {
    target: 60,
    min: 30,
    smoothStep: true,
    forceSetTimeOut: false,
  },
  // Let Phaser pause its own loop on visibility change so it doesn't
  // accumulate dt while hidden.
  disableContextMenu: false,
  // Top-down arcade physics — no gravity, simple collision bodies.
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [BootScene, PlaceholderScene, TownScene, GreenhollowScene, MossbarrowScene, MossbarrowDepthsScene, DepthsFloor2Scene, DepthsFloor3Scene, AshenmereScene, IronveilScene, DrownedSanctumF1Scene, DrownedSanctumF2Scene, BogDungeonF1Scene, BogDungeonF2Scene, BogDungeonF3Scene, DuskmereScene, AshfieldsScene, AshenTowerF1Scene, AshenTowerF2Scene, AshenTowerF3Scene, FrosthollowScene, FrozenHollowF1Scene, FrozenHollowF2Scene, FrozenHollowF3Scene, ShatteredCoastScene, ThroneBeneathF1Scene, ThroneBeneathF2Scene, ThroneBeneathF3Scene, ForgottenCaveScene, InteriorScene, CombatScene],
};
