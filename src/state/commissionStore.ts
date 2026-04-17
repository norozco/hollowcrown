import { create } from 'zustand';

export interface Commission {
  id: string;
  recipeKey: string;
  resultItemKey: string;
  resultName: string;
  placedAtTransition: number;
  readyAtTransition: number;
}

interface CommissionState {
  commissions: Commission[];
  /** Global counter — incremented on every zone transition. */
  transitionCount: number;

  /** Place a new commission. */
  place: (commission: Omit<Commission, 'id' | 'placedAtTransition'>) => void;
  /** Increment the transition counter (called from BaseWorldScene). */
  tick: () => void;
  /** Get all commissions that are ready for pickup. */
  getReady: () => Commission[];
  /** Collect a ready commission (remove from list, return the item data). */
  collect: (id: string) => Commission | null;
  /** Reset on new game. */
  reset: () => void;
}

export const useCommissionStore = create<CommissionState>((set, get) => ({
  commissions: [],
  transitionCount: 0,

  place: (commission) => {
    const id = `comm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({
      commissions: [...s.commissions, {
        ...commission,
        id,
        placedAtTransition: s.transitionCount,
      }],
    }));
  },

  tick: () => set((s) => ({ transitionCount: s.transitionCount + 1 })),

  getReady: () => {
    const { commissions, transitionCount } = get();
    return commissions.filter(c => transitionCount >= c.readyAtTransition);
  },

  collect: (id) => {
    const { commissions, transitionCount } = get();
    const found = commissions.find(c => c.id === id);
    if (!found) return null;
    if (transitionCount < found.readyAtTransition) return null;
    set({ commissions: commissions.filter(c => c.id !== id) });
    return found;
  },

  reset: () => set({ commissions: [], transitionCount: 0 }),
}));
