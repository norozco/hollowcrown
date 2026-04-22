import { create } from 'zustand';
import { Character, type CharacterInit } from '../engine/character';
import { type Perk, rollPerkChoices } from '../engine/perks';
import { useInventoryStore } from './inventoryStore';

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

  /** Ancient coin tracking. Collecting all 12 unlocks the Crownless Blade. */
  ancientCoins: Set<string>;
  collectCoin: (coinId: string) => void;

  /** Whether this playthrough is a New Game+ run. */
  newGamePlus: boolean;

  /** Currently selected dungeon key-item (Zelda B-button slot). Null if none. */
  activeDungeonItem: string | null;
  setActiveDungeonItem: (key: string | null) => void;

  /** Whether the Cairn Lantern is currently lit (toggled via R). */
  lanternLit: boolean;
  setLanternLit: (lit: boolean) => void;

  /** Gold milestones already announced (prevents re-firing). */
  goldMilestonesReached: Set<number>;
}

export const GOLD_MILESTONES: Array<{ amount: number; title: string }> = [
  { amount: 100, title: 'First Coins' },
  { amount: 500, title: 'Pocket Change' },
  { amount: 1000, title: 'Thousandaire' },
  { amount: 5000, title: 'Merchant' },
  { amount: 10000, title: 'Baron' },
  { amount: 50000, title: 'Tycoon' },
];

export const usePlayerStore = create<PlayerState>((set, get) => ({
  character: null,
  version: 0,
  companion: null,
  perks: [],
  pendingPerkChoices: null,
  heartPieces: 0,
  heartPiecesCollected: new Set<string>(),
  ancientCoins: new Set<string>(),
  newGamePlus: false,
  goldMilestonesReached: new Set<number>(),
  activeDungeonItem: null,
  lanternLit: false,

  setActiveDungeonItem: (key) => set({ activeDungeonItem: key, version: get().version + 1 }),
  setLanternLit: (lit) => set({ lanternLit: lit, version: get().version + 1 }),

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

  create: (init) => set({ character: new Character(init), version: 1, perks: [], pendingPerkChoices: null, heartPieces: 0, heartPiecesCollected: new Set<string>(), ancientCoins: new Set<string>(), newGamePlus: false, goldMilestonesReached: new Set<number>(), activeDungeonItem: null, lanternLit: false }),
  notify: () => set((s) => ({ version: s.version + 1 })),
  clear: () => set({ character: null, version: 0, companion: null, perks: [], pendingPerkChoices: null, heartPieces: 0, heartPiecesCollected: new Set<string>(), ancientCoins: new Set<string>(), newGamePlus: false, goldMilestonesReached: new Set<number>(), activeDungeonItem: null, lanternLit: false }),

  giveGold: (amount) => {
    const c = get().character;
    if (!c) return;
    const before = c.gold;
    c.addGold(amount);
    const after = c.gold;
    const reached = get().goldMilestonesReached;
    let nextReached: Set<number> | null = null;
    for (const m of GOLD_MILESTONES) {
      if (after >= m.amount && before < m.amount && !reached.has(m.amount)) {
        if (!nextReached) nextReached = new Set(reached);
        nextReached.add(m.amount);
        window.dispatchEvent(new CustomEvent('goldMilestone', {
          detail: { milestone: m.amount, title: m.title },
        }));
      }
    }
    if (nextReached) {
      set((s) => ({ version: s.version + 1, goldMilestonesReached: nextReached! }));
    } else {
      set((s) => ({ version: s.version + 1 }));
    }
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

  collectCoin: (coinId) => {
    const { ancientCoins } = get();
    if (ancientCoins.has(coinId)) return;
    const next = new Set(ancientCoins);
    next.add(coinId);
    const count = next.size;
    window.dispatchEvent(new CustomEvent('gameMessage', { detail: `Ancient Coin: ${count}/12` }));
    if (count >= 12) {
      // All coins collected — forge the Crownless Blade
      useInventoryStore.getState().addItem('crownless_blade');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: 'Twelve coins. The circle is complete. The Crownless Blade forms in your hands.',
        }));
      }, 1500);
    }
    set({ ancientCoins: next, version: get().version + 1 });
  },
}));

export function getHeartPieceHpBonus(pieces: number): number {
  return Math.floor(pieces / 4) * 5;
}
