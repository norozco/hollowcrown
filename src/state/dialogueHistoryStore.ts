import { create } from 'zustand';

/**
 * Ring buffer of the most recent dialogue lines shown to the player.
 * Tab opens a history overlay for reading back.
 */
export interface DialogueHistoryEntry {
  speaker: string;
  text: string;
  timestamp: number;
}

interface DialogueHistoryState {
  entries: DialogueHistoryEntry[];
  push: (entry: Omit<DialogueHistoryEntry, 'timestamp'>) => void;
  clear: () => void;
}

const MAX_ENTRIES = 200;

export const useDialogueHistoryStore = create<DialogueHistoryState>((set) => ({
  entries: [],
  push: (entry) =>
    set((s) => {
      const next = [...s.entries, { ...entry, timestamp: Date.now() }];
      if (next.length > MAX_ENTRIES) next.shift();
      return { entries: next };
    }),
  clear: () => set({ entries: [] }),
}));
