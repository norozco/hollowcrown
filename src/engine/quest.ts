/**
 * Quest data model and runtime state machine.
 *
 * Quests are authored as JSON (see src/data/quests/) and identified by
 * stable string ids. Each quest has an ordered list of Objectives — the
 * runtime tracks which objectives have been completed and exposes the
 * "current" one (first incomplete) for the UI tracker.
 *
 * Quests are accepted via dialogue effects (see DialogueEffect in
 * dialogue.ts). Objectives complete the same way — picking a dialogue
 * branch that has a complete-objective effect ticks it off.
 */

export interface QuestObjective {
  id: string;
  description: string;
}

export interface QuestReward {
  gold?: number;
  xp?: number;
}

export interface Quest {
  id: string;
  title: string;
  /** One- or two-sentence summary shown when the player first opens the
   *  quest tracker. Should set the stakes / what & why. */
  summary: string;
  objectives: readonly QuestObjective[];
  reward?: QuestReward;
}

export interface QuestState {
  questId: string;
  /** Set of completed objective ids, in completion order. */
  completedObjectiveIds: readonly string[];
  /** True iff every objective has been completed. */
  isComplete: boolean;
  /** Wall-clock ms when accepted; useful for ordering the tracker. */
  acceptedAt: number;
}

/** Build a fresh QuestState for a newly-accepted quest. */
export function startQuest(quest: Quest, now = Date.now()): QuestState {
  if (quest.objectives.length === 0) {
    throw new Error(`Quest "${quest.id}" has no objectives`);
  }
  return {
    questId: quest.id,
    completedObjectiveIds: [],
    isComplete: false,
    acceptedAt: now,
  };
}

/**
 * Mark the named objective complete on a QuestState. Idempotent — if the
 * objective is already complete (or the id is unknown), the original
 * state is returned unchanged.
 */
export function completeObjective(
  quest: Quest,
  state: QuestState,
  objectiveId: string,
): QuestState {
  const exists = quest.objectives.some((o) => o.id === objectiveId);
  if (!exists) return state;
  if (state.completedObjectiveIds.includes(objectiveId)) return state;

  const completedObjectiveIds = [...state.completedObjectiveIds, objectiveId];
  const isComplete = quest.objectives.every((o) =>
    completedObjectiveIds.includes(o.id),
  );
  return { ...state, completedObjectiveIds, isComplete };
}

/**
 * Return the first objective the player has not yet completed, or null
 * if the quest is finished. Walks objectives in their authored order.
 */
export function currentObjective(
  quest: Quest,
  state: QuestState,
): QuestObjective | null {
  for (const obj of quest.objectives) {
    if (!state.completedObjectiveIds.includes(obj.id)) return obj;
  }
  return null;
}
