import { create } from 'zustand';
import type { RaceKey } from '../engine/race';
import { getRace } from '../engine/race';
import type { ClassKey } from '../engine/classes';
import type { Difficulty } from '../engine/character';
import { type StatBlock, STAT_KEYS, ZERO_STATS } from '../engine/stats';
import { DiceRoller } from '../engine/dice';

/**
 * Work-in-progress character creation state. Lives until the player
 * either confirms (we hand off to playerStore + start the game) or
 * cancels (we reset).
 *
 * Step indices map to the spec §5.1 flow:
 *   0 = Difficulty
 *   1 = Name
 *   2 = Race
 *   3 = Class
 *   4 = Stats roll & assign (+ race-specific player choices)
 *   5 = Portrait
 *   6 = Confirm
 */
export const STEP_LABELS = [
  'Difficulty',
  'Name',
  'Race',
  'Class',
  'Stats',
  'Portrait',
  'Confirm',
] as const;

export const STEP_COUNT = STEP_LABELS.length;

export interface CharacterCreationState {
  step: number;

  difficulty: Difficulty | null;
  name: string;
  raceKey: RaceKey | null;
  classKey: ClassKey | null;

  /**
   * Step 4 stats: the six raw rolled values (in roll order, 3-18 each)
   * and an assignment array — assignment[i] is the roll-index that the
   * i-th canonical stat (STR/DEX/CON/INT/WIS/CHA) is mapped to.
   *
   * After roll(), assignment defaults to [0,1,2,3,4,5] (STR gets rolls[0], etc.).
   * swap(statIdx, rollIdx) repositions a roll into a stat slot, swapping
   * with whatever roll the new slot used to hold.
   */
  rolls: number[] | null;
  assignment: number[] | null;

  /** Optional player-choice bonuses, e.g. half-elf's two extra +1s. */
  extraBonuses: Partial<StatBlock> | null;
  /** Optional player-choice option, e.g. dragonborn element. */
  playerChoice: string | null;
  /** Portrait index within the chosen race's portrait set. */
  portraitIndex: number;

  /** Setters — granular so each step only touches its own field. */
  setDifficulty: (d: Difficulty) => void;
  setName: (n: string) => void;
  setRace: (k: RaceKey) => void;
  setClass: (k: ClassKey) => void;
  setExtraBonuses: (b: Partial<StatBlock> | null) => void;
  setPlayerChoice: (s: string | null) => void;
  setPortraitIndex: (i: number) => void;

  /** Stats actions. roll() generates fresh values; swap() rearranges them. */
  roll: () => void;
  swap: (statIdx: number, rollIdx: number) => void;

  /** Navigation. */
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (i: number) => void;

  /** Wipe everything — used on Cancel and after successful character spawn. */
  reset: () => void;
}

const INITIAL = {
  step: 0,
  difficulty: null,
  name: '',
  raceKey: null,
  classKey: null,
  rolls: null,
  assignment: null,
  extraBonuses: null,
  playerChoice: null,
  portraitIndex: 0,
};

const dice = new DiceRoller();

export const useCharacterCreationStore = create<CharacterCreationState>((set) => ({
  ...INITIAL,

  setDifficulty: (difficulty) => set({ difficulty }),
  setName: (name) => set({ name }),
  setRace: (raceKey) => {
    // Race change wipes any race-tied player choices (and portrait, since
    // portraits are per-race in the spec).
    set({ raceKey, extraBonuses: null, playerChoice: null, portraitIndex: 0 });
  },
  setClass: (classKey) => set({ classKey }),
  setExtraBonuses: (extraBonuses) => set({ extraBonuses }),
  setPlayerChoice: (playerChoice) => set({ playerChoice }),
  setPortraitIndex: (portraitIndex) => set({ portraitIndex }),

  roll: () =>
    set({
      rolls: dice.rollStatBlock(),
      assignment: [0, 1, 2, 3, 4, 5],
    }),

  swap: (statIdx, rollIdx) =>
    set((s) => {
      if (!s.assignment) return s;
      const assignment = [...s.assignment];
      const oldRollIdxAtStat = assignment[statIdx];
      const oldStatIdxOfRoll = assignment.indexOf(rollIdx);
      assignment[statIdx] = rollIdx;
      if (oldStatIdxOfRoll !== -1 && oldStatIdxOfRoll !== statIdx) {
        assignment[oldStatIdxOfRoll] = oldRollIdxAtStat;
      }
      return { assignment };
    }),

  nextStep: () => set((s) => ({ step: Math.min(STEP_COUNT - 1, s.step + 1) })),
  prevStep: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
  goToStep: (i) => set({ step: Math.max(0, Math.min(STEP_COUNT - 1, i)) }),

  reset: () => set({ ...INITIAL }),
}));

/**
 * Derived: produce a final rolled-stats StatBlock from rolls + assignment.
 * Returns null if rolls/assignment haven't been set yet.
 */
export function computeRolledStats(state: CharacterCreationState): StatBlock | null {
  if (!state.rolls || !state.assignment) return null;
  const block: StatBlock = { ...ZERO_STATS };
  STAT_KEYS.forEach((stat, statIdx) => {
    block[stat] = state.rolls![state.assignment![statIdx]];
  });
  return block;
}

/**
 * Has the player satisfied the race-specific choices required at creation?
 * Half-Elf: extraBonuses must select exactly N stats (excluding CHA) with +1.
 * Dragonborn: playerChoice must be one of the listed options.
 */
export function isPlayerChoiceComplete(state: CharacterCreationState): boolean {
  if (!state.raceKey) return true;
  const race = getRace(state.raceKey);

  if (race.playerChoiceBonuses) {
    if (!state.extraBonuses) return false;
    const excluded = race.playerChoiceBonuses.excludeStats ?? [];
    const entries = Object.entries(state.extraBonuses).filter(
      ([k, v]) => v === race.playerChoiceBonuses!.amount && !excluded.includes(k),
    );
    if (entries.length !== race.playerChoiceBonuses.count) return false;
  }

  if (race.playerChoiceOption) {
    if (!state.playerChoice) return false;
    if (!race.playerChoiceOption.options.includes(state.playerChoice)) return false;
  }

  return true;
}

/** Per-step gate for the Next button. */
export function canProceedFromStep(state: CharacterCreationState, step: number): boolean {
  switch (step) {
    case 0:
      return state.difficulty !== null;
    case 1:
      return state.name.length > 0 && state.name.length <= 15;
    case 2:
      return state.raceKey !== null;
    case 3:
      return state.classKey !== null;
    case 4:
      return (
        state.rolls !== null &&
        state.assignment !== null &&
        isPlayerChoiceComplete(state)
      );
    case 5:
      return true; // portrait always has a default
    case 6:
      return (
        state.difficulty !== null &&
        state.name.length > 0 &&
        state.raceKey !== null &&
        state.classKey !== null &&
        state.rolls !== null &&
        state.assignment !== null &&
        isPlayerChoiceComplete(state)
      );
    default:
      return false;
  }
}
