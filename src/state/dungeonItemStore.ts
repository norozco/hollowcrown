import { create } from 'zustand';

interface DungeonItemState {
  /** Set of dungeon item keys the player has found. */
  found: Set<string>;
  /** Acquire a new dungeon item. */
  acquire: (key: string) => void;
  /** Check if the player has a specific dungeon item. */
  has: (key: string) => boolean;
  reset: () => void;
}

export const useDungeonItemStore = create<DungeonItemState>((set, get) => ({
  found: new Set<string>(),
  acquire: (key) => {
    if (get().found.has(key)) return;
    set((s) => {
      const next = new Set(s.found);
      next.add(key);
      return { found: next };
    });
    // Show discovery event
    window.dispatchEvent(new CustomEvent('rareItemFound', {
      detail: { name: key, rarity: 'legendary', description: 'A dungeon item has been found.' },
    }));
  },
  has: (key) => get().found.has(key),
  reset: () => set({ found: new Set<string>() }),
}));
