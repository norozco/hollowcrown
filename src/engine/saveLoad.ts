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
import type { CharacterInit, Gender } from './character';
import type { QuestState } from './quest';
import type { LoreEntry } from '../state/loreStore';
import type { Commission } from '../state/commissionStore';
import { ALL_PERKS } from './perks';
// Item types used in SaveData shape (inlined below).


interface SaveData {
  version: 1;
  timestamp: number;
  characterInit: CharacterInit & { level: number; xp: number; gold: number; hp: number; mp: number; gender: Gender };
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

    // Restore quests
    const questStore = useQuestStore.getState();
    questStore.reset();
    for (const [id, state] of Object.entries(data.quests)) {
      (questStore as unknown as { active: Record<string, QuestState> }).active[id] = state;
    }

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

    // Restore killed enemies
    const combat = useCombatStore.getState();
    combat.killedEnemies.clear();
    for (const id of data.killedEnemies) {
      combat.killedEnemies.add(id);
    }
    // Restore per-monster quest kill counts (missing on legacy saves).
    useCombatStore.setState({ questKillCounts: { ...(data.questKillCounts ?? {}) } });

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
