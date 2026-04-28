/**
 * Save/Load system — serializes game state to localStorage.
 * 3 save slots + 1 autosave slot.
 */

import { usePlayerStore } from '../state/playerStore';
import { useQuestStore } from '../state/questStore';
import { useInventoryStore } from '../state/inventoryStore';
import { useCombatStore } from '../state/combatStore';
import { useAchievementStore } from '../state/achievementStore';
import { useGameStatsStore } from '../state/gameStatsStore';
import { useBountyStore } from '../state/bountyStore';
import { useCommissionStore } from '../state/commissionStore';
import { useTimeStore, type TimePhase } from '../state/timeStore';
import { useLoreStore } from '../state/loreStore';
import { useDungeonItemStore } from '../state/dungeonItemStore';
import { useWorldStateStore } from '../state/worldStateStore';
import type { CharacterInit, Gender } from './character';
import type { QuestState } from './quest';
import type { LoreEntry } from '../state/loreStore';
import type { Commission } from '../state/commissionStore';
import { ALL_PERKS } from './perks';
// Item types used in SaveData shape (inlined below).


interface SaveData {
  version: 1;
  timestamp: number;
  characterInit: CharacterInit & { level: number; xp: number; gold: number; hp: number; mp: number; gender: Gender; stamina?: number };
  quests: Record<string, QuestState>;
  inventory: { slots: Array<{ itemKey: string; qty: number }>; equipment: Record<string, string | null> };
  killedEnemies: string[];
  /** Persistent per-monster kill counter used by kill-objective quests
   *  (added post-v1, optional for backward compat with older saves). */
  questKillCounts?: Record<string, number>;
  currentScene: string;
  /** Perk keys chosen across level-ups (added post-v1, optional for compat). */
  perks?: string[];
  /** Heart piece data (added post-v1, optional for compat). */
  heartPieces?: number;
  heartPiecesCollected?: string[];
  /** Ancient coins collected (added post-v1, optional for compat). */
  ancientCoins?: string[];
  /** Active companion key (added post-v1, optional for compat). */
  companion?: string | null;
  /** Total play time in milliseconds (added post-v1). */
  playTimeMs?: number;
  /** Achievement tracking (added post-v1, optional for compat). */
  achievements?: {
    unlocked: string[];
    totalKills: number;
    totalDeaths: number;
    itemsCrafted: number;
    chestsOpened: number;
    bossesKilled: string[];
    zonesVisited: string[];
    monstersEncountered: Record<string, { kills: number; encountered: boolean }>;
  };
  /** Dungeon items found (added post-v1, optional for compat). */
  dungeonItems?: string[];
  /** Active (equipped) key-item slot (added post-v1, optional for compat). */
  activeDungeonItem?: string | null;
  /** Whether the Lantern is currently lit (added post-v1, optional for compat). */
  lanternLit?: boolean;
  /** Lit torches + mined objects + picked objects + unlocked doors, keyed by scene (added post-v1, optional for compat). */
  worldState?: { litTorches?: string[]; minedObjects?: string[]; pickedObjects?: string[]; unlockedDoors?: string[] };
  /** Lore entries discovered (added post-v1, optional for compat). */
  lore?: LoreEntry[];
  /** Commission state (added post-v1, optional for compat). */
  commissions?: {
    commissions: Commission[];
    transitionCount: number;
  };
  /** Bounty state (added post-v1, optional for compat). */
  bounty?: {
    active: any;
    killProgress: number;
    totalCompleted: number;
  } | null;
  /** New Game+ flag (added post-v1, optional for compat). */
  newGamePlus?: boolean;
  time?: {
    phase: TimePhase;
    transitionsSincePhase: number;
  };
}

const SAVE_PREFIX = 'hollowcrown_save_';

export function saveGame(slot: string, currentScene = 'TownScene'): boolean {
  const char = usePlayerStore.getState().character;
  if (!char) return false;

  const playerState = usePlayerStore.getState();
  const achievementState = useAchievementStore.getState();
  const bountyState = useBountyStore.getState();
  const commissionState = useCommissionStore.getState();
  const loreState = useLoreStore.getState();
  const dungeonItemState = useDungeonItemStore.getState();

  const data: SaveData = {
    version: 1,
    timestamp: Date.now(),
    characterInit: {
      name: char.name,
      raceKey: char.race.key as CharacterInit['raceKey'],
      classKey: char.characterClass.key as CharacterInit['classKey'],
      rolledStats: char.rolledStats,
      difficulty: char.difficulty,
      gender: char.gender,
      extraBonuses: undefined,
      playerChoice: char.playerChoice,
      level: char.level,
      xp: char.xp,
      gold: char.gold,
      hp: char.hp,
      mp: char.mp,
      stamina: char.stamina,
    },
    quests: { ...useQuestStore.getState().active },
    inventory: {
      slots: useInventoryStore.getState().slots.map((s) => ({ itemKey: s.item.key, qty: s.quantity })),
      equipment: Object.fromEntries(
        Object.entries(useInventoryStore.getState().equipment).map(([k, v]) => [k, v?.key ?? null]),
      ),
    },
    killedEnemies: Array.from(useCombatStore.getState().killedEnemies),
    questKillCounts: { ...useCombatStore.getState().questKillCounts },
    currentScene,
    perks: playerState.perks,
    heartPieces: playerState.heartPieces,
    heartPiecesCollected: Array.from(playerState.heartPiecesCollected),
    ancientCoins: Array.from(playerState.ancientCoins),
    companion: playerState.companion,
    playTimeMs: useGameStatsStore.getState().playTimeMs,
    achievements: {
      unlocked: Array.from(achievementState.unlocked),
      totalKills: achievementState.totalKills,
      totalDeaths: achievementState.totalDeaths,
      itemsCrafted: achievementState.itemsCrafted,
      chestsOpened: achievementState.chestsOpened,
      bossesKilled: achievementState.bossesKilled,
      zonesVisited: Array.from(achievementState.zonesVisited),
      monstersEncountered: achievementState.monstersEncountered,
    },
    dungeonItems: Array.from(dungeonItemState.found),
    activeDungeonItem: playerState.activeDungeonItem ?? null,
    lanternLit: playerState.lanternLit ?? false,
    worldState: {
      litTorches: useWorldStateStore.getState().serialize(),
      minedObjects: useWorldStateStore.getState().serializeMined(),
      pickedObjects: useWorldStateStore.getState().serializePicked(),
      unlockedDoors: useWorldStateStore.getState().serializeUnlockedDoors(),
    },
    lore: loreState.entries,
    commissions: {
      commissions: commissionState.commissions,
      transitionCount: commissionState.transitionCount,
    },
    bounty: bountyState.active ? {
      active: bountyState.active,
      killProgress: bountyState.killProgress,
      totalCompleted: bountyState.totalCompleted,
    } : null,
    newGamePlus: playerState.newGamePlus ?? false,
    time: {
      phase: useTimeStore.getState().phase,
      transitionsSincePhase: useTimeStore.getState().transitionsSincePhase,
    },
  };

  try {
    localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify(data));
    if (slot === 'autosave') {
      window.dispatchEvent(new CustomEvent('autosaveStart'));
      setTimeout(() => window.dispatchEvent(new CustomEvent('autosaveEnd')), 700);
    }
    return true;
  } catch {
    return false;
  }
}

export function loadGame(slot: string): boolean {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + slot);
    if (!raw) return false;
    const data: SaveData = JSON.parse(raw);
    if (data.version !== 1) return false;

    // Restore character
    const init = data.characterInit;
    usePlayerStore.getState().create({
      name: init.name,
      raceKey: init.raceKey,
      classKey: init.classKey,
      rolledStats: init.rolledStats,
      difficulty: init.difficulty,
      gender: init.gender ?? 'male',
      playerChoice: init.playerChoice,
      level: init.level,
      xp: init.xp,
      gold: init.gold,
    });

    const char = usePlayerStore.getState().character;
    if (char) {
      char.hp = init.hp;
      char.mp = init.mp;
      // Backward compat: saves predating the stamina pool default to a
      // full pool. Also clamp mp to the new maxMp in case the class's
      // resource model changed since the save was written (e.g. ranger
      // moved from mpStat to staminaStat — old saves carry stale MP).
      char.stamina = init.stamina ?? char.derived.maxStamina;
      char.mp = Math.min(char.mp, char.derived.maxMp);
      char.stamina = Math.min(char.stamina, char.derived.maxStamina);
      // Restore perks — re-apply stat mutations (stat-boost perks modify
      // the character's stats directly, so we replay them on load).
      const savedPerks = data.perks ?? [];
      if (savedPerks.length > 0) {
        for (const pk of savedPerks) {
          const perk = ALL_PERKS.find((p) => p.key === pk);
          if (perk) perk.apply(char);
        }
        usePlayerStore.setState({ perks: savedPerks });
      }
      usePlayerStore.getState().notify();
    }

    // Restore quests — use setState so Zustand subscribers (QuestTracker,
    // QuestBoard, Journal) actually re-render. Previously mutated the
    // `.active` object in place, which left the state reference unchanged
    // and no UI updated → user saw "quests got reset" on reload.
    useQuestStore.setState({ active: { ...data.quests } });

    // Restore inventory
    const inv = useInventoryStore.getState();
    inv.reset();
    for (const s of data.inventory.slots) {
      inv.addItem(s.itemKey, s.qty);
    }
    for (const [slot, itemKey] of Object.entries(data.inventory.equipment)) {
      if (itemKey) inv.equip(itemKey);
      void slot;
    }

    // Restore killed enemies + quest kill counts via setState so any
    // subscribers (dungeon progress UI, combat state derived selectors)
    // actually re-render. In-place mutation of the Set does NOT trigger
    // Zustand updates.
    useCombatStore.setState({
      killedEnemies: new Set(data.killedEnemies),
      questKillCounts: { ...(data.questKillCounts ?? {}) },
    });

    // Restore heart pieces
    if (data.heartPieces != null) {
      usePlayerStore.setState({
        heartPieces: data.heartPieces,
        heartPiecesCollected: new Set(data.heartPiecesCollected ?? []),
      });
    }

    // Restore ancient coins
    if (data.ancientCoins) {
      usePlayerStore.setState({ ancientCoins: new Set(data.ancientCoins) });
    }

    // Restore companion
    if (data.companion !== undefined) {
      usePlayerStore.setState({ companion: data.companion });
    }

    // Restore achievements
    if (data.achievements) {
      useAchievementStore.setState({
        unlocked: new Set(data.achievements.unlocked),
        totalKills: data.achievements.totalKills,
        totalDeaths: data.achievements.totalDeaths,
        itemsCrafted: data.achievements.itemsCrafted,
        chestsOpened: data.achievements.chestsOpened,
        bossesKilled: data.achievements.bossesKilled,
        zonesVisited: new Set(data.achievements.zonesVisited),
        monstersEncountered: data.achievements.monstersEncountered,
      });
    }

    // Restore dungeon items
    if (data.dungeonItems) {
      useDungeonItemStore.setState({ found: new Set(data.dungeonItems) });
    }
    if (data.activeDungeonItem !== undefined) {
      usePlayerStore.setState({ activeDungeonItem: data.activeDungeonItem });
    }
    if (typeof data.lanternLit === 'boolean') {
      usePlayerStore.setState({ lanternLit: data.lanternLit });
    }
    useWorldStateStore.getState().loadFrom(
      data.worldState?.litTorches ?? [],
      data.worldState?.minedObjects ?? [],
      data.worldState?.pickedObjects ?? [],
      data.worldState?.unlockedDoors ?? [],
    );

    // Restore play time
    if (typeof data.playTimeMs === 'number') {
      useGameStatsStore.getState().loadTime(data.playTimeMs);
    }

    // Restore lore
    if (data.lore) {
      useLoreStore.setState({ entries: data.lore });
    }

    // Restore commissions
    if (data.commissions) {
      useCommissionStore.setState({
        commissions: data.commissions.commissions,
        transitionCount: data.commissions.transitionCount,
      });
    }

    // Restore bounty
    if (data.bounty) {
      useBountyStore.setState({
        active: data.bounty.active,
        killProgress: data.bounty.killProgress,
        totalCompleted: data.bounty.totalCompleted,
      });
    }

    // Restore New Game+ flag
    if (data.newGamePlus) {
      usePlayerStore.setState({ newGamePlus: true });
    }

    if (data.time) {
      useTimeStore.setState({
        phase: data.time.phase,
        transitionsSincePhase: data.time.transitionsSincePhase,
      });
    }

    return true;
  } catch {
    return false;
  }
}

export interface SaveSlotInfo {
  slot: string;
  label: string;
  timestamp: number | null;
  characterName: string | null;
  level: number | null;
  className: string | null;
  raceName: string | null;
  questCount: number | null;
  dungeonItemCount: number | null;
  heartPieces: number | null;
  newGamePlus: boolean;
}

export function getSaveSlots(): SaveSlotInfo[] {
  const slots = ['slot1', 'slot2', 'slot3', 'autosave'];
  return slots.map((slot) => {
    const label = slot === 'autosave' ? 'Autosave' : `Slot ${slot.slice(-1)}`;
    try {
      const raw = localStorage.getItem(SAVE_PREFIX + slot);
      if (!raw) return { slot, label, timestamp: null, characterName: null, level: null, className: null, raceName: null, questCount: null, dungeonItemCount: null, heartPieces: null, newGamePlus: false };
      const data: SaveData = JSON.parse(raw);
      // Derive human-readable class/race names from keys (capitalize first letter of each word)
      const toTitle = (key: string) =>
        key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const questCount = Object.values(data.quests).filter((q) => q.turnedIn).length;
      return {
        slot,
        label,
        timestamp: data.timestamp,
        characterName: data.characterInit.name,
        level: data.characterInit.level,
        className: toTitle(data.characterInit.classKey),
        raceName: toTitle(data.characterInit.raceKey),
        questCount,
        dungeonItemCount: data.dungeonItems?.length ?? null,
        heartPieces: data.heartPieces ?? null,
        newGamePlus: data.newGamePlus ?? false,
      };
    } catch {
      return { slot, label, timestamp: null, characterName: null, level: null, className: null, raceName: null, questCount: null, dungeonItemCount: null, heartPieces: null, newGamePlus: false };
    }
  });
}

export function deleteSave(slot: string): void {
  localStorage.removeItem(SAVE_PREFIX + slot);
}
