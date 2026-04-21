import { create } from 'zustand';

/**
 * Tracks global game stats that span the whole session:
 *   - Total play time (paused-aware)
 *   - Screenshot counter
 *   - Pause state (reflects real-time clock pauses from UI overlays)
 */
interface GameStatsState {
  /** Total play time in milliseconds (only counts unpaused time). */
  playTimeMs: number;
  /** Is game-time currently paused? */
  paused: boolean;
  /** Number of screenshots taken this session. */
  screenshotCount: number;

  tick: (dtMs: number) => void;
  setPaused: (p: boolean) => void;
  addScreenshot: () => void;
  reset: () => void;
  loadTime: (ms: number) => void;
}

export const useGameStatsStore = create<GameStatsState>((set, get) => ({
  playTimeMs: 0,
  paused: false,
  screenshotCount: 0,

  tick: (dtMs) => {
    if (get().paused) return;
    set((s) => ({ playTimeMs: s.playTimeMs + dtMs }));
  },

  setPaused: (p) => set({ paused: p }),
  addScreenshot: () => set((s) => ({ screenshotCount: s.screenshotCount + 1 })),
  reset: () => set({ playTimeMs: 0, paused: false, screenshotCount: 0 }),
  loadTime: (ms) => set({ playTimeMs: ms }),
}));

/** Format milliseconds as "Hh Mm" or "Mm Ss". */
export function formatPlayTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
