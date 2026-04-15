import { create } from 'zustand';
import { Character, type CharacterInit } from '../engine/character';

/**
 * Holds the active player Character (or null if the player is in the
 * main menu / pre-game). Decoupled from characterCreationStore so a
 * confirmed character survives even if the wizard is reset.
 */
interface PlayerState {
  character: Character | null;
  /** A version counter that increments on any character mutation. Use
   *  this in selectors that need to re-render when a Character method
   *  mutates internal fields (HP/MP/XP/level), since Zustand can't
   *  detect class-internal changes by itself. */
  version: number;

  /** Build a Character from a CharacterInit and store it. Throws if the
   *  init is invalid (delegates to Character constructor's validation). */
  create: (init: CharacterInit) => void;
  /** Increment the version counter — call after mutating the character. */
  notify: () => void;
  /** Drop the active character (e.g. quit to menu, hardcore death). */
  clear: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  character: null,
  version: 0,
  create: (init) => set({ character: new Character(init), version: 1 }),
  notify: () => set((s) => ({ version: s.version + 1 })),
  clear: () => set({ character: null, version: 0 }),
}));
