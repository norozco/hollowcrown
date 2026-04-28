import classesData from '../data/classes.json';
import type { StatKey } from './stats';
import type { WeaponOption } from './weapons';

export type ClassKey = 'fighter' | 'rogue' | 'wizard' | 'cleric' | 'ranger' | 'bard';

export interface CharacterClass {
  key: ClassKey;
  name: string;
  /** Two stats this class is built around — informs UI suggestions
   *  during stat assignment. Not enforced. */
  primaryStats: [StatKey, StatKey];
  /** HP gained per level, on top of the universal CON-modifier × level. */
  hpPerLevel: number;
  /** Which stat (if any) governs spell power & MP pool. null = no MP. */
  mpStat: StatKey | null;
  /** Which stat (if any) governs stamina pool for martial skills.
   *  null = caster, uses MP instead. Mutually exclusive with mpStat
   *  by convention; a class declares ONE resource. */
  staminaStat: StatKey | null;
  role: string;
  signatureAbility: { name: string; description: string };
  /** Weapon options this class starts with. pickStartingWeapon() chooses
   *  based on the character's highest-scoring preferStat. */
  startingWeapons: readonly WeaponOption[];
}

// Cast through `unknown` because TS infers JSON arrays as wider types
// (e.g. `string[]`) than our tuples (`[StatKey, StatKey]`). The data is
// hand-authored to match the type — if you change the JSON, double-check
// against CharacterClass.
const CLASSES: readonly CharacterClass[] = classesData as unknown as readonly CharacterClass[];

const CLASSES_BY_KEY: Record<ClassKey, CharacterClass> = Object.fromEntries(
  CLASSES.map((c) => [c.key, c]),
) as Record<ClassKey, CharacterClass>;

export const ALL_CLASSES = CLASSES;

export function getClass(key: ClassKey): CharacterClass {
  const c = CLASSES_BY_KEY[key];
  if (!c) throw new Error(`Unknown class: ${key}`);
  return c;
}
