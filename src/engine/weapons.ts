import weaponsData from '../data/weapons.json';
import type { StatBlock, StatKey } from './stats';
import type { RaceKey } from './race';
import type { ClassKey } from './classes';

export type WeaponHandedness = '1h' | '2h' | 'hands';
export type WeaponRange = 'melee' | 'ranged';
export type WeaponDamageKind = 'slashing' | 'piercing' | 'bludgeoning';

/**
 * Optional per-weapon perk. Hooks into the basic-attack branch of combat
 * (see `playerAct` in `engine/combat.ts`) AFTER hit/damage resolution but
 * BEFORE phase transition. Skill dispatch is unaffected.
 *
 * The discriminated union exists for things `Item.statBonus` can't
 * capture (statuses, crit math, damage typing, drawback-bearing flat
 * bonuses). Plain "+N attack / +N damage" weapons should keep using
 * `Item.statBonus` instead.
 */
export type WeaponPerk =
  | { kind: 'on_hit_status'; status: 'burn' | 'poison' | 'bleed'; chance: number; duration: number }
  | { kind: 'on_hit_heal'; amount: number }
  | { kind: 'crit_range_bonus'; bonus: number }
  | { kind: 'crit_multiplier'; mult: number }
  | { kind: 'damage_type'; element: string }
  | { kind: 'damage_bonus_vs_weakness'; element: string; mult: number }
  | { kind: 'flat_damage'; bonus: number; attackPenalty: number };

export interface Weapon {
  key: string;
  name: string;
  handedness: WeaponHandedness;
  /** Which stat governs attack rolls and (for martial weapons) damage. */
  attackStat: StatKey;
  damageKind: WeaponDamageKind;
  range: WeaponRange;
  description: string;
  /** Optional weapon perk — see `WeaponPerk` for the union. */
  perk?: WeaponPerk;
}

const WEAPONS: readonly Weapon[] = weaponsData as unknown as readonly Weapon[];
const WEAPONS_BY_KEY: Record<string, Weapon> = Object.fromEntries(
  WEAPONS.map((w) => [w.key, w]),
);

export const ALL_WEAPONS = WEAPONS;

export function getWeapon(key: string): Weapon {
  const w = WEAPONS_BY_KEY[key];
  if (!w) throw new Error(`Unknown weapon: ${key}`);
  return w;
}

/**
 * A class's starting-weapon option — a concrete weapon key plus the stat
 * that biases selection toward it. pickStartingWeapon() picks whichever
 * option has the highest value in the character's chosen stat.
 */
export interface WeaponOption {
  key: string;
  /** If provided, the character's score in this stat is the tiebreak score.
   *  If omitted, the option is treated as a default (lowest priority). */
  preferStat?: StatKey;
}

/**
 * Race-specific overrides for starting weapons. Keyed by race → class.
 * If a cell matches, that weapon is used regardless of stat scores.
 */
const RACE_WEAPON_OVERRIDES: Partial<Record<RaceKey, Partial<Record<ClassKey, string>>>> = {
  dwarf: {
    fighter: 'battleaxe',
    cleric: 'warhammer',
  },
  halfling: {
    fighter: 'shortsword',
  },
  orc: {
    fighter: 'greataxe',
  },
};

/**
 * Pick the starting weapon for a character. Logic:
 *   1. If the race has an explicit override for this class, use it.
 *   2. Otherwise pick the class option whose preferStat the character
 *      scores highest in. Ties break toward the first listed option.
 *   3. If options is empty, throw (every class must define starters).
 */
export function pickStartingWeapon(
  stats: StatBlock,
  raceKey: RaceKey,
  classKey: ClassKey,
  options: readonly WeaponOption[],
): Weapon {
  // Race override takes precedence.
  const override = RACE_WEAPON_OVERRIDES[raceKey]?.[classKey];
  if (override) return getWeapon(override);

  if (options.length === 0) {
    throw new Error(`Class ${classKey} has no starting weapon options`);
  }

  let best = options[0];
  let bestScore = best.preferStat ? stats[best.preferStat] : -Infinity;
  for (let i = 1; i < options.length; i++) {
    const opt = options[i];
    const score = opt.preferStat ? stats[opt.preferStat] : -Infinity;
    if (score > bestScore) {
      best = opt;
      bestScore = score;
    }
  }
  return getWeapon(best.key);
}
