import { create } from 'zustand';
import {
  advance,
  choose,
  currentNode,
  startDialogue,
  type Dialogue,
  type DialogueEffect,
  type DialogueState,
} from '../engine/dialogue';
import { useQuestStore } from './questStore';
import { usePlayerStore } from './playerStore';
import { useInventoryStore } from './inventoryStore';

/**
 * Holds the currently-active dialogue, if any. Null means no dialogue
 * is showing. All transitions funnel through this store so the UI layer
 * is pure presentation.
 *
 * On every node entry (start, advance, choose) the runtime applies the
 * node's `effects` — currently quest accept and objective completion.
 * Effects rely on idempotent receivers so revisiting a node is safe.
 */
interface DialogueStoreState {
  dialogue: Dialogue | null;
  state: DialogueState | null;

  start: (dialogue: Dialogue) => void;
  advance: () => void;
  choose: (index: number) => void;
  end: () => void;
}

function applyEffects(effects: readonly DialogueEffect[] | undefined): void {
  if (!effects || effects.length === 0) return;
  const quests = useQuestStore.getState();
  const player = usePlayerStore.getState();
  const inventory = useInventoryStore.getState();
  for (const e of effects) {
    switch (e.type) {
      case 'accept-quest':
        quests.accept(e.questId);
        break;
      case 'complete-objective':
        quests.completeObjective(e.questId, e.objectiveId);
        break;
      case 'turn-in-quest':
        quests.turnIn(e.questId);
        break;
      case 'give-gold':
        player.giveGold(e.amount);
        break;
      case 'give-xp':
        player.giveXp(e.amount);
        break;
      case 'remove-items':
        inventory.removeItem(e.itemKey, e.quantity);
        break;
    }
  }
}

export const useDialogueStore = create<DialogueStoreState>((set, get) => ({
  dialogue: null,
  state: null,

  start: (dialogue) => {
    const state = startDialogue(dialogue);
    applyEffects(currentNode(dialogue, state).effects);
    set({ dialogue, state });
  },

  advance: () => {
    const { dialogue, state } = get();
    if (!dialogue || !state) return;
    const next = advance(dialogue, state);
    if (next === null) {
      set({ dialogue: null, state: null });
    } else {
      applyEffects(currentNode(dialogue, next).effects);
      set({ state: next });
    }
  },

  choose: (index) => {
    const { dialogue, state } = get();
    if (!dialogue || !state) return;
    const next = choose(dialogue, state, index);
    if (next === null) {
      set({ dialogue: null, state: null });
    } else {
      applyEffects(currentNode(dialogue, next).effects);
      set({ state: next });
    }
  },

  end: () => {
    set({ dialogue: null, state: null });
  },
}));
