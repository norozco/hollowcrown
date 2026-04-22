import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { gameConfig } from './config';
import { usePlayerStore } from '../state/playerStore';
import { useUIStore } from '../state/uiStore';
import { useCombatStore } from '../state/combatStore';
import { useQuestStore } from '../state/questStore';
import { useInventoryStore } from '../state/inventoryStore';
import { useAchievementStore } from '../state/achievementStore';

// Dev-only store exposure so automated playtests / debugging can mutate
// state without running the full UI. Safe because these are the same
// references imported everywhere else — the window handles are a pure
// read/write passthrough to zustand.
if (import.meta.env.DEV) {
  (window as Record<string, unknown>).__playerStore = usePlayerStore;
  (window as Record<string, unknown>).__combatStore = useCombatStore;
  (window as Record<string, unknown>).__questStore = useQuestStore;
  (window as Record<string, unknown>).__inventoryStore = useInventoryStore;
  (window as Record<string, unknown>).__achievementStore = useAchievementStore;
}

/**
 * Mounts a Phaser.Game instance inside a React-managed <div>. The React
 * tree renders menu/HUD overlays on top; Phaser owns the canvas inside.
 *
 * A secondary effect keeps Phaser's active scene in sync with the UI
 * screen + player state:
 *   - main menu / character creation / no character  → PlaceholderScene
 *   - active character + screen === 'game'           → TownScene
 *
 * StrictMode in dev double-invokes effects, so we guard against creating
 * two Phaser instances and always destroy on unmount.
 */
export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const character = usePlayerStore((s) => s.character);
  const screen = useUIStore((s) => s.screen);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    gameRef.current = new Phaser.Game({
      ...gameConfig,
      parent: containerRef.current,
    });

    // Expose game instance for cross-layer communication (e.g. fast travel).
    (window as any).__phaserGame = gameRef.current;

    // Bug fix: when the window is minimized/hidden, requestAnimationFrame
    // pauses but the wall-clock keeps moving. On focus, Phaser would try
    // to catch up with a huge dt, producing a visible stutter/jump.
    // We pause the loop on hide and reset dt on show so motion resumes
    // smoothly from the current frame.
    const onVisibility = () => {
      const g = gameRef.current;
      if (!g) return;
      const loop = (g as any).loop;
      if (document.hidden) {
        // Pause the main loop so it stops scheduling rAFs while hidden.
        if (loop && !loop.running) return;
        try { g.loop.sleep(); } catch { /* older Phaser */ }
      } else {
        // Reset accumulated delta so the next frame starts fresh.
        try { g.loop.wake(); } catch { /* older Phaser */ }
        if (loop) {
          loop.time = performance.now();
          loop.lastTime = performance.now();
          loop.startTime = performance.now();
          loop.delta = 0;
          loop.rawDelta = 0;
        }
      }
    };
    const onFocus = () => {
      const g = gameRef.current;
      if (!g) return;
      const loop = (g as any).loop;
      if (loop) {
        loop.time = performance.now();
        loop.lastTime = performance.now();
        loop.delta = 0;
        loop.rawDelta = 0;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      gameRef.current?.destroy(true);
      gameRef.current = null;
      (window as any).__phaserGame = null;
    };
  }, []);

  // Scene router: swap between placeholder and town based on game state.
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    const mgr = game.scene;

    const shouldShowTown = character !== null && screen === 'game';
    const worldScenes = ['TownScene', 'GreenhollowScene', 'MossbarrowScene', 'MossbarrowDepthsScene', 'DepthsFloor2Scene', 'DepthsFloor3Scene', 'AshenmereScene', 'IronveilScene', 'DrownedSanctumF1Scene', 'DrownedSanctumF2Scene', 'BogDungeonF1Scene', 'BogDungeonF2Scene', 'BogDungeonF3Scene', 'DuskmereScene', 'AshfieldsScene', 'AshenTowerF1Scene', 'AshenTowerF2Scene', 'AshenTowerF3Scene', 'FrosthollowScene', 'FrozenHollowF1Scene', 'FrozenHollowF2Scene', 'FrozenHollowF3Scene', 'ShatteredCoastScene', 'ThroneBeneathF1Scene', 'ThroneBeneathF2Scene', 'ThroneBeneathF3Scene', 'ForgottenCaveScene', 'InteriorScene', 'CombatScene'];

    if (shouldShowTown) {
      if (mgr.isActive('PlaceholderScene')) mgr.stop('PlaceholderScene');
      // Only start TownScene fresh if no world scene is already running
      // (an internal zone transition may have us in Greenhollow already).
      const anyWorldActive = worldScenes.some((k) => mgr.isActive(k));
      if (!anyWorldActive) mgr.start('TownScene');
    } else {
      for (const k of worldScenes) {
        if (mgr.isActive(k)) mgr.stop(k);
      }
      if (!mgr.isActive('PlaceholderScene')) mgr.start('PlaceholderScene');
    }
  }, [character, screen]);

  return <div ref={containerRef} id="phaser-container" />;
}
