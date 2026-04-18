import { create } from 'zustand';
import { Character, type CharacterInit } from '../engine/character';
import { type Perk, rollPerkChoices } from '../engine/perks';

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

  /** Currently active companion key, or null if travelling alone. */
  companion: string | null;

  /** Perk keys the player has chosen across all level-ups. */
  perks: string[];
  /** Three perk choices waiting for the player to pick one (null = no pending). */
  pendingPerkChoices: Perk[] | null;
  /** Apply a chosen perk and clear the pending choices. */
  choosePerk: (perkKey: string) => void;

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
  /** Deduct gold (clamped at 0). No-op if no active character. */
  spendGold: (amount: number) => void;
  /** Grant XP (may trigger auto-levels via Character.gainXp). */
  giveXp: (amount: number) => number;

  /** Hire a companion by key. Replaces any existing companion. */
  hireCompanion: (key: string) => void;
  /** Dismiss the current companion. */
  dismissCompanion: () => void;

  /** Heart piece tracking. Every 4 pieces = +5 max HP. */
  heartPieces: number;
  heartPiecesCollected: Set<string>;
  collectHeartPiece: (id: string) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  character: null,
  version: 0,
  companion: null,
  perks: [],
  pendingPerkChoices: null,
  heartPieces: 0,
  heartPiecesCollected: new Set<string>(),

  choosePerk: (perkKey) => {
    const { pendingPerkChoices, character, perks } = get();
    if (!pendingPerkChoices || !character) return;
    const perk = pendingPerkChoices.find((p) => p.key === perkKey);
    if (!perk) return;
    // Apply immediate stat mutations (stat-boost perks).
    perk.apply(character);
    set({
      perks: [...perks, perkKey],
      pendingPerkChoices: null,
      version: get().version + 1,
    });
  },

  create: (init) => set({ character: new Character(init), version: 1, perks: [], pendingPerkChoices: null, heartPieces: 0, heartPiecesCollected: new Set<string>() }),
  notify: () => set((s) => ({ version: s.version + 1 })),
  clear: () => set({ character: null, version: 0, companion: null, perks: [], pendingPerkChoices: null, heartPieces: 0, heartPiecesCollected: new Set<string>() }),

  giveGold: (amount) => {
    const c = get().character;
    if (!c) return;
    c.addGold(amount);
    set((s) => ({ version: s.version + 1 }));
  },

  spendGold: (amount) => {
    const c = get().character;
    if (!c) return;
    c.loseGold(amount);
    set((s) => ({ version: s.version + 1 }));
  },

  giveXp: (amount) => {
    const c = get().character;
    if (!c) return 0;
    const gained = c.gainXp(amount);
    if (gained > 0) {
      set((s) => ({ version: s.version + 1, pendingPerkChoices: rollPerkChoices() }));
    } else {
      set((s) => ({ version: s.version + 1 }));
    }
    return gained;
  },

  hireCompanion: (key) => set({ companion: key }),
  dismissCompanion: () => set({ companion: null }),

  collectHeartPiece: (id) => {
    const { heartPiecesCollected, heartPieces } = get();
    if (heartPiecesCollected.has(id)) return;
    const nextCollected = new Set(heartPiecesCollected);
    nextCollected.add(id);
    const nextCount = heartPieces + 1;
    // Every 4 pieces = +5 max HP
    if (nextCount % 4 === 0) {
      window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Max HP increased by 5!' }));
    }
    set({ heartPieces: nextCount, heartPiecesCollected: nextCollected, version: get().version + 1 });
  },
}));

export function getHeartPieceHpBonus(pieces: number): number {
  return Math.floor(pieces / 4) * 5;
}
