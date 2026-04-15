import racesData from '../data/races.json';
import type { StatBlock } from './stats';

export type RaceKey =
  | 'human'
  | 'elf'
  | 'dwarf'
  | 'halfling'
  | 'orc'
  | 'tiefling'
  | 'dragonborn'
  | 'gnome'
  | 'half-elf'
  | 'tabaxi';

export interface Race {
  key: RaceKey;
  name: string;
  /** Locked stat bonuses. Player-choice bonuses (half-elf) are passed
   *  separately at character creation, not stored here. */
  bonuses: StatBlock;
  passive: { name: string; description: string };
  active: { name: string; description: string };
  world: string;
  flavor: string;
  /** Optional: races whose final bonuses include player-chosen stats
   *  (e.g. half-elf) declare it here so the UI knows to prompt. */
  playerChoiceBonuses?: {
    amount: number;
    count: number;
    excludeStats?: readonly string[];
    description: string;
  };
  /** Optional: races with a one-time creation choice not affecting stats
   *  (e.g. dragonborn picking an element) declare it here. */
  playerChoiceOption?: {
    field: string;
    options: readonly string[];
    description: string;
  };
}

const RACES: readonly Race[] = racesData as readonly Race[];

const RACES_BY_KEY: Record<RaceKey, Race> = Object.fromEntries(
  RACES.map((r) => [r.key, r]),
) as Record<RaceKey, Race>;

export const ALL_RACES = RACES;

export function getRace(key: RaceKey): Race {
  const r = RACES_BY_KEY[key];
  if (!r) throw new Error(`Unknown race: ${key}`);
  return r;
}
