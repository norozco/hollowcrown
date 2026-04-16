import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { gameConfig } from './config';
import { usePlayerStore } from '../state/playerStore';
import { useUIStore } from '../state/uiStore';

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

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // Scene router: swap between placeholder and town based on game state.
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    const mgr = game.scene;

    const shouldShowTown = character !== null && screen === 'game';
    const worldScenes = ['TownScene', 'GreenhollowScene', 'MossbarrowScene', 'InteriorScene'];

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
