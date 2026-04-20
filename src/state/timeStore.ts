import { create } from 'zustand';

/**
 * Day/night cycle. Time advances based on zone transitions, not real time.
 * Each phase applies a color tint overlay to outdoor scenes.
 */
export type TimePhase = 'dawn' | 'day' | 'dusk' | 'night';

interface TimeState {
  phase: TimePhase;
  transitionsSincePhase: number;
  /** Advance time — called on every zone transition. */
  tick: () => void;
  /** Jump directly to a specific phase (used when loading saves or resetting). */
  setPhase: (phase: TimePhase) => void;
  reset: () => void;
}

const PHASE_ORDER: TimePhase[] = ['day', 'dusk', 'night', 'dawn'];
const TRANSITIONS_PER_PHASE = 5;

const PHASE_MESSAGES: Record<TimePhase, string> = {
  dawn: 'The sky turns grey. Dawn is coming.',
  day: 'The sun is up. The road is safer.',
  dusk: 'Light fades. Something shifts.',
  night: 'Night has fallen. The dark is not empty.',
};

export const useTimeStore = create<TimeState>((set, get) => ({
  phase: 'day',
  transitionsSincePhase: 0,

  tick: () => {
    const next = get().transitionsSincePhase + 1;
    if (next >= TRANSITIONS_PER_PHASE) {
      const currentIdx = PHASE_ORDER.indexOf(get().phase);
      const nextPhase = PHASE_ORDER[(currentIdx + 1) % PHASE_ORDER.length];
      set({ phase: nextPhase, transitionsSincePhase: 0 });
      window.dispatchEvent(new CustomEvent('gameMessage', {
        detail: PHASE_MESSAGES[nextPhase],
      }));
    } else {
      set({ transitionsSincePhase: next });
    }
  },

  setPhase: (phase) => set({ phase, transitionsSincePhase: 0 }),
  reset: () => set({ phase: 'day', transitionsSincePhase: 0 }),
}));

/** Get tint color + alpha for a phase. Returns null for 'day' (no tint). */
export function getPhaseTint(phase: TimePhase): { color: number; alpha: number } | null {
  switch (phase) {
    case 'dawn': return { color: 0xffa060, alpha: 0.15 };
    case 'day': return null;
    case 'dusk': return { color: 0xff6040, alpha: 0.2 };
    case 'night': return { color: 0x1a2850, alpha: 0.5 };
  }
}

/** Icon for HUD display. */
export function getPhaseIcon(phase: TimePhase): string {
  switch (phase) {
    case 'dawn': return '🌅';
    case 'day': return '☀';
    case 'dusk': return '🌇';
    case 'night': return '🌙';
  }
}
