import { create } from 'zustand';

export interface LoreEntry {
  key: string;
  title: string;
  text: string;
  location: string;
  discoveredAt: number; // timestamp
}

interface LoreState {
  entries: LoreEntry[];
  discover: (entry: Omit<LoreEntry, 'discoveredAt'>) => void;
  hasDiscovered: (key: string) => boolean;
  reset: () => void;
}

export const useLoreStore = create<LoreState>((set, get) => ({
  entries: [],
  discover: (entry) => {
    if (get().entries.some(e => e.key === entry.key)) return; // already known
    set({ entries: [...get().entries, { ...entry, discoveredAt: Date.now() }] });
    window.dispatchEvent(new CustomEvent('gameMessage', { detail: `Lore discovered: ${entry.title}` }));
  },
  hasDiscovered: (key) => get().entries.some(e => e.key === key),
  reset: () => set({ entries: [] }),
}));
