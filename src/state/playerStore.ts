import { create } from 'zustand';
import { Character, type CharacterInit } from '../engine/character';

/**
 * Holds the active player Character (or null if the player is in the
 * main menu / pre-game). Decoupled from characterCreationStore so a
 * confirmed character survives even if the wizard is reset.
 *
 * Mutations to the Character instance (gold, xp, hp) are applied via
 * this store's methods rather than directly, so the version counter
 * can bump and selectors re-render.
 */
interface PlayerState {
  character: Character | null;
  /** Increments on any character mutation. Selectors that depend on
   *  mutable character fields should read this so Zustand notices. */
  version: number;

  /** Build a Character from a CharacterInit and store it. Throws if the
   *  init is invalid (delegates to Character constructor's validation). */
  create: (init: CharacterInit) => void;
  /** Increment the version counter — call after mutating the character
   *  outside of this store's methods. */
  notify: () => void;
  /** Drop the active character (e.g. quit to menu, hardcore death). */
  clear: () => void;

  /** Award gold. No-op if no active character. */
  giveGold: (amount: number) => void;
  /** Grant XP (may trigger auto-levels via Character.gainXp). */
  giveXp: (amount: number) => number;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  character: null,
  version: 0,

  create: (init) => set({ character: new Character(init), version: 1 }),
  notify: () => set((s) => ({ version: s.version + 1 })),
  clear: () => set({ character: null, version: 0 }),

  giveGold: (amount) => {
    const c = get().character;
    if (!c) return;
    c.addGold(amount);
    set((s) => ({ version: s.version + 1 }));
  },

  giveXp: (amount) => {
    const c = get().character;
    if (!c) return 0;
    const gained = c.gainXp(amount);
    set((s) => ({ version: s.version + 1 }));
    return gained;
  },
}));
