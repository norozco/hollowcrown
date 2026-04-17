import { create } from 'zustand';
import { ACHIEVEMENTS, type AchievementContext } from '../engine/achievements';
import { usePlayerStore } from './playerStore';
import { useQuestStore } from './questStore';

interface AchievementState {
  unlocked: Set<string>;
  // Tracking counters (persisted across the session)
  totalKills: number;
  itemsCrafted: number;
  chestsOpened: number;
  bossesKilled: string[];
  zonesVisited: Set<string>;

  // Actions
  recordKill: () => void;
  recordCraft: () => void;
  recordChest: () => void;
  recordBossKill: (key: string) => void;
  recordZoneVisit: (sceneKey: string) => void;
  /** Build context from store + playerStore + questStore, check each
   *  achievement. Returns the first newly-unlocked key, or null. */
  checkAchievements: () => string | null;
  reset: () => void;
}

export const useAchievementStore = create<AchievementState>((set, get) => ({
  unlocked: new Set<string>(),
  totalKills: 0,
  itemsCrafted: 0,
  chestsOpened: 0,
  bossesKilled: [],
  zonesVisited: new Set<string>(),

  recordKill: () => set((s) => ({ totalKills: s.totalKills + 1 })),
  recordCraft: () => set((s) => ({ itemsCrafted: s.itemsCrafted + 1 })),
  recordChest: () => set((s) => ({ chestsOpened: s.chestsOpened + 1 })),

  recordBossKill: (key) =>
    set((s) => ({
      bossesKilled: s.bossesKilled.includes(key)
        ? s.bossesKilled
        : [...s.bossesKilled, key],
    })),

  recordZoneVisit: (sceneKey) =>
    set((s) => {
      if (s.zonesVisited.has(sceneKey)) return s;
      const next = new Set(s.zonesVisited);
      next.add(sceneKey);
      return { zonesVisited: next };
    }),

  checkAchievements: () => {
    const s = get();
    const character = usePlayerStore.getState().character;
    const companion = usePlayerStore.getState().companion;
    const questsActive = useQuestStore.getState().active;
    const questsCompleted = Object.values(questsActive).filter((q) => q.turnedIn).length;

    const ctx: AchievementContext = {
      totalKills: s.totalKills,
      totalGold: character?.gold ?? 0,
      questsCompleted,
      level: character?.level ?? 1,
      zonesVisited: s.zonesVisited,
      itemsCrafted: s.itemsCrafted,
      chestsOpened: s.chestsOpened,
      bossesKilled: s.bossesKilled,
      companionHired: companion !== null,
    };

    for (const achievement of ACHIEVEMENTS) {
      if (s.unlocked.has(achievement.key)) continue;
      if (achievement.check(ctx)) {
        // Unlock it — return the key so the UI can show a toast.
        const next = new Set(s.unlocked);
        next.add(achievement.key);
        set({ unlocked: next });
        return achievement.key;
      }
    }
    return null;
  },

  reset: () =>
    set({
      unlocked: new Set<string>(),
      totalKills: 0,
      itemsCrafted: 0,
      chestsOpened: 0,
      bossesKilled: [],
      zonesVisited: new Set<string>(),
    }),
}));
