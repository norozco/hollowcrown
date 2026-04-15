import { create } from 'zustand';
import {
  advance,
  choose,
  startDialogue,
  type Dialogue,
  type DialogueState,
} from '../engine/dialogue';

/**
 * Holds the currently-active dialogue, if any. Null means no dialogue
 * is showing. All transitions funnel through this store so the UI layer
 * is pure presentation.
 */
interface DialogueStoreState {
  dialogue: Dialogue | null;
  state: DialogueState | null;

  start: (dialogue: Dialogue) => void;
  advance: () => void;
  choose: (index: number) => void;
  end: () => void;
}

export const useDialogueStore = create<DialogueStoreState>((set, get) => ({
  dialogue: null,
  state: null,

  start: (dialogue) => {
    set({ dialogue, state: startDialogue(dialogue) });
  },

  advance: () => {
    const { dialogue, state } = get();
    if (!dialogue || !state) return;
    const next = advance(dialogue, state);
    if (next === null) {
      set({ dialogue: null, state: null });
    } else {
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
      set({ state: next });
    }
  },

  end: () => {
    set({ dialogue: null, state: null });
  },
}));
