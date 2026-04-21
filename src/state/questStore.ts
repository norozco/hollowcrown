import { create } from 'zustand';
import {
  type Quest,
  type QuestState,
  startQuest,
  completeObjective,
  turnInQuest,
} from '../engine/quest';
import { getQuest } from '../engine/quests';

/**
 * Tracks the player's accepted quests. All mutations here are idempotent
 * — calling accept(id) twice on the same id leaves state unchanged, and
 * completing an already-completed objective is a no-op. This means the
 * dialogue effect system can safely re-fire on the same node without
 * corrupting progress.
 *
 * ─── QUEST AUDIT (last updated with kill-count fix) ───
 * Kill-objective quests read `combatStore.questKillCounts[monsterKey]`
 * (a persistent counter that is NOT cleared on zone exit — unlike
 * `killedEnemies`, which is cleared so enemies respawn). The mapping
 * lives in combatStore.finish(). Keep this table in sync when adding
 * new kill quests:
 *   wolf-cull         → 3x monster.key 'wolf'      (Greenhollow)
 *   bone-collector    → 2x monster.key 'skeleton'  (Mossbarrow)
 *   spider-nest       → 3x monster.key 'spider'    (Mossbarrow Depths)
 *   wraith-hunt       → 2x monster.key 'wraith'    (Depths Floor 2)
 *   hollow-king-slayer→ 1x 'hollow_king'           (boss)
 *   warden-slayer     → 1x 'drowned_warden'        (boss)
 *   the-crownless-one → 1x 'crownless_one'         (final boss)
 * Non-kill quests (herb-gathering, iron-delivery, silk-trader, deep-hook,
 * bone-ritual, iron-token, scholars-trail, the-final-gate, explorer
 * quests, what-remains) complete via dialogue effects or scene-event
 * calls to completeObjective — not through combatStore.
 */
interface QuestStoreState {
  /** questId → state (active or complete). Complete quests stay here so
   *  the player can see "✔ Completed" in the tracker briefly; a future
   *  archive-tab UI will move them out. */
  active: Record<string, QuestState>;

  /** Accept a quest by id. No-op if already in `active`. */
  accept: (questId: string) => void;
  /** Complete the named objective on the named quest. No-op if the
   *  quest isn't active or the objective is already done. */
  completeObjective: (questId: string, objectiveId: string) => void;
  /** Mark a completed quest as turned in. No-op if quest isn't active,
   *  or is already turned in. Logs a warning if quest isn't complete. */
  turnIn: (questId: string) => void;
  /** Drop everything — used on character teardown / return-to-menu. */
  reset: () => void;
}

export const useQuestStore = create<QuestStoreState>((set, get) => ({
  active: {},

  accept: (questId) => {
    const { active } = get();
    if (active[questId]) return; // idempotent
    let quest: Quest;
    try {
      quest = getQuest(questId);
    } catch (e) {
      console.warn(`questStore.accept: ${(e as Error).message}`);
      return;
    }
    set({
      active: { ...active, [questId]: startQuest(quest) },
    });
  },

  completeObjective: (questId, objectiveId) => {
    const state = get().active[questId];
    if (!state) return;
    let quest: Quest;
    try {
      quest = getQuest(questId);
    } catch (e) {
      console.warn(`questStore.completeObjective: ${(e as Error).message}`);
      return;
    }
    const updated = completeObjective(quest, state, objectiveId);
    if (updated === state) return; // no change
    set({
      active: { ...get().active, [questId]: updated },
    });
  },

  turnIn: (questId) => {
    const state = get().active[questId];
    if (!state) return;
    if (!state.isComplete) {
      console.warn(`questStore.turnIn: "${questId}" is not yet complete`);
      return;
    }
    if (state.turnedIn) return;
    try {
      const updated = turnInQuest(state);
      set({ active: { ...get().active, [questId]: updated } });
    } catch (e) {
      console.warn(`questStore.turnIn: ${(e as Error).message}`);
    }
  },

  reset: () => set({ active: {} }),
}));
