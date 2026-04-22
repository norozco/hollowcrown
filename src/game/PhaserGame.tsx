import { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import { gameConfig } from './config';
import { usePlayerStore } from '../state/playerStore';
import { useUIStore } from '../state/uiStore';
import { useCombatStore } from '../state/combatStore';
import { useQuestStore } from '../state/questStore';
import { useInventoryStore } from '../state/inventoryStore';
import { useAchievementStore } from '../state/achievementStore';
import { useDungeonItemStore } from '../state/dungeonItemStore';

// Store exposure + cheat console for playtesting.
// Enabled in DEV and also on the deployed GitHub Pages build so
// playtesters can use the console to unblock themselves.
{
  const w = window as Record<string, unknown>;
  w.__playerStore = usePlayerStore;
  w.__combatStore = useCombatStore;
  w.__questStore = useQuestStore;
  w.__inventoryStore = useInventoryStore;
  w.__achievementStore = useAchievementStore;
  w.__dungeonItemStore = useDungeonItemStore;

  // ─── Cheat console ──────────────────────────────────────────────
  // Type `cheats.help()` in the browser console (F12) for the full list.
  const cheats = {
    help() {
      const lines = [
        '━━━ HOLLOWCROWN CHEATS ━━━',
        'cheats.level(n)       — level up to N (1-20)',
        'cheats.gold(n)        — add gold (default 1000)',
        'cheats.heal()         — full HP + MP',
        'cheats.gear()         — full armor set + steel sword + 20 health potions',
        'cheats.keyItems()     — grant all 4 dungeon items (echo/lantern/pickaxe/charm)',
        'cheats.beatBoss(k)    — mark a boss defeated (hollow_king / drowned_warden / crownless_one)',
        'cheats.tp(scene)      — fast travel (e.g. "DepthsFloor3Scene" or "DuskmereScene")',
        'cheats.god(on)        — toggle 999 HP + 999 damage weapon cheat',
        'cheats.reveal()       — open all zones on the world map',
        'cheats.wipe()         — wipe all saves + localStorage (confirm first!)',
        'cheats.stats()        — print current character stats',
        'cheats.scenes()       — list all scene keys',
        'cheats.all()          — level 20 + full gear + all key items + 10k gold + reveal map',
      ];
      // eslint-disable-next-line no-console
      console.log('%c' + lines.join('\n'), 'color: #ffd43a; font-family: monospace;');
    },
    level(n: number) {
      const ps = usePlayerStore.getState();
      const char = ps.character;
      if (!char) return 'no character';
      n = Math.max(1, Math.min(20, Math.floor(n)));
      while (char.level < n) char.gainXp(10000);
      char.hp = char.derived.maxHp;
      char.mp = char.derived.maxMp;
      ps.notify();
      return `level → ${char.level}, HP ${char.hp}/${char.derived.maxHp}`;
    },
    gold(n = 1000) {
      const ps = usePlayerStore.getState();
      const char = ps.character;
      if (!char) return 'no character';
      char.addGold(n);
      ps.notify();
      return `+${n}g, total ${char.gold}`;
    },
    heal() {
      const ps = usePlayerStore.getState();
      const char = ps.character;
      if (!char) return 'no character';
      char.hp = char.derived.maxHp;
      char.mp = char.derived.maxMp;
      ps.notify();
      return `HP ${char.hp} MP ${char.mp}`;
    },
    gear() {
      const inv = useInventoryStore.getState();
      const set = ['steel_sword', 'chainmail', 'leather_cap', 'leather_leggings', 'traveler_boots'];
      let got = 0;
      for (const key of set) {
        try { inv.addItem(key); inv.equip(key); got++; } catch { /* item may not exist */ }
      }
      try { inv.addItem('health_potion', 20); } catch { /* ignore */ }
      try { inv.addItem('mana_potion', 10); } catch { /* ignore */ }
      return `equipped ${got}/${set.length}, potions added`;
    },
    keyItems() {
      const ds = useDungeonItemStore.getState();
      const items = ['echo_stone', 'lantern', 'pickaxe', 'water_charm'] as const;
      for (const it of items) { try { ds.acquire(it); } catch { /* ignore */ } }
      return `have: ${Array.from(ds.found).join(', ')}`;
    },
    beatBoss(key: string) {
      const ach = useAchievementStore.getState();
      ach.recordBossKill(key);
      localStorage.setItem(`hc_${key}_defeated`, '1');
      return `marked ${key} defeated`;
    },
    tp(scene: string) {
      window.dispatchEvent(new CustomEvent('fastTravel', {
        detail: { sceneKey: scene, spawn: 'default' },
      }));
      return `traveling to ${scene}`;
    },
    god(on = true) {
      const ps = usePlayerStore.getState();
      const char = ps.character;
      if (!char) return 'no character';
      if (on) {
        char.hp = 999;
        (char as { _godHp?: number })._godHp = 999;
        // monkey-patch derived.maxHp to 999 for rendering
        Object.defineProperty(char.derived, 'maxHp', { value: 999, configurable: true });
        Object.defineProperty(char.derived, 'maxMp', { value: 999, configurable: true });
        char.mp = 999;
        // boost weapon damage if possible
        if (char.weapon) (char.weapon as { damage?: number }).damage = 999;
        ps.notify();
        return 'god mode ON';
      }
      return 'god mode cannot be cleanly disabled — refresh the page';
    },
    reveal() {
      const ach = useAchievementStore.getState();
      const zones = [
        'TownScene', 'GreenhollowScene', 'MossbarrowScene', 'MossbarrowDepthsScene',
        'DepthsFloor2Scene', 'DepthsFloor3Scene', 'AshenmereScene', 'IronveilScene',
        'DrownedSanctumF1Scene', 'DrownedSanctumF2Scene', 'DuskmereScene',
        'AshfieldsScene', 'AshenTowerF1Scene', 'AshenTowerF2Scene', 'AshenTowerF3Scene',
        'FrosthollowScene', 'FrozenHollowF1Scene', 'FrozenHollowF2Scene',
        'FrozenHollowF3Scene', 'ShatteredCoastScene', 'BogDungeonF1Scene',
        'BogDungeonF2Scene', 'BogDungeonF3Scene', 'ThroneBeneathF1Scene',
        'ThroneBeneathF2Scene', 'ThroneBeneathF3Scene', 'ForgottenCaveScene',
      ];
      for (const z of zones) ach.visitZone(z);
      return `revealed ${zones.length} zones`;
    },
    wipe() {
      // eslint-disable-next-line no-alert
      if (!confirm('Wipe ALL saves + localStorage? This cannot be undone.')) return 'cancelled';
      localStorage.clear();
      sessionStorage.clear();
      location.reload();
      return 'wiping...';
    },
    stats() {
      const char = usePlayerStore.getState().character;
      if (!char) return 'no character';
      const d = char.derived;
      return {
        name: char.name, race: char.race?.key, class: char.characterClass?.key,
        level: char.level, xp: char.xp,
        hp: `${char.hp}/${d.maxHp}`, mp: `${char.mp}/${d.maxMp}`,
        ac: d.ac, gold: char.gold,
        stats: char.stats, weapon: char.weapon?.name,
      };
    },
    scenes() {
      const g = (window as { __phaserGame?: { scene?: { scenes: { sys: { settings: { key: string; status: number } } }[] } } }).__phaserGame;
      return g?.scene?.scenes?.map(s => `${s.sys.settings.key}: ${s.sys.settings.status}`) ?? [];
    },
    all() {
      const msgs: unknown[] = [];
      msgs.push(cheats.level(20));
      msgs.push(cheats.gold(10000));
      msgs.push(cheats.gear());
      msgs.push(cheats.keyItems());
      msgs.push(cheats.reveal());
      msgs.push(cheats.heal());
      return msgs;
    },
  };
  w.cheats = cheats;
  // Print welcome on load so testers see the hint.
  setTimeout(() => {
    // eslint-disable-next-line no-console
    console.log(
      '%c▾ Hollowcrown cheat console loaded ▾\n%cType %ccheats.help()%c for commands.',
      'color: #ffd43a; font-family: monospace; font-weight: bold;',
      'color: #aaa; font-family: monospace;',
      'color: #ff6b6b; font-family: monospace; font-weight: bold;',
      'color: #aaa; font-family: monospace;',
    );
  }, 1500);
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
