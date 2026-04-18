import { create } from 'zustand';
import { rollBounty, type Bounty } from '../engine/bounties';

interface BountyState {
  /** Currently active bounty, or null if none accepted. */
  active: Bounty | null;
  /** Kill progress for the current bounty. */
  killProgress: number;
  /** Number of bounties completed total. */
  totalCompleted: number;

  accept: () => void;
  recordKill: (monsterKey: string) => void;
  checkCompletion: () => boolean;
  reset: () => void;
}

export const useBountyStore = create<BountyState>((set, get) => ({
  active: null,
  killProgress: 0,
  totalCompleted: 0,

  accept: () => {
    const current = get().active;
    set({ active: rollBounty(current?.key), killProgress: 0 });
  },

  recordKill: (monsterKey) => {
    const { active } = get();
    if (!active || active.target.type !== 'kill') return;
    if (active.target.monsterKey !== monsterKey) return;
    set((s) => ({ killProgress: s.killProgress + 1 }));
  },

  checkCompletion: () => {
    const { active, killProgress } = get();
    if (!active) return false;
    if (active.target.type === 'kill' && killProgress >= active.target.count) return true;
    return false;
  },

  reset: () => set({ active: null, killProgress: 0, totalCompleted: 0 }),
}));
