import { modifier as diceModifier } from './dice';

/**
 * Stat block & helpers. The six primary stats follow D&D convention.
 * All other "stats" the game refers to (HP, MP, AC, initiative) are
 * derived — see computeDerived().
 */

export const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export type StatBlock = Record<StatKey, number>;

export const ZERO_STATS: StatBlock = {
  str: 0,
  dex: 0,
  con: 0,
  int: 0,
  wis: 0,
  cha: 0,
};

/** D&D-style ability score modifier: floor((stat - 10) / 2). */
export const modifier = diceModifier;

/** Return a new StatBlock that is the elementwise sum of two. */
export function addStats(a: StatBlock, b: StatBlock): StatBlock {
  return {
    str: a.str + b.str,
    dex: a.dex + b.dex,
    con: a.con + b.con,
    int: a.int + b.int,
    wis: a.wis + b.wis,
    cha: a.cha + b.cha,
  };
}

/**
 * Convert an ordered array of 6 rolled values into a named StatBlock by
 * the player's assignment. Throws if input is malformed.
 *
 *   assignStats([14, 10, 13, 8, 12, 15], ['str','dex','con','int','wis','cha'])
 *   → { str: 14, dex: 10, con: 13, int: 8, wis: 12, cha: 15 }
 */
export function assignStats(rolled: number[], assignment: StatKey[]): StatBlock {
  if (rolled.length !== 6 || assignment.length !== 6) {
    throw new Error('assignStats: expected 6 rolls and 6 assignment keys');
  }
  if (new Set(assignment).size !== 6) {
    throw new Error('assignStats: assignment must include every stat exactly once');
  }
  const block = { ...ZERO_STATS };
  assignment.forEach((key, i) => {
    block[key] = rolled[i];
  });
  return block;
}

/**
 * Derived stats computed from the final StatBlock + class info + level.
 * No equipment factored in yet — that arrives in the inventory milestone.
 */
export interface DerivedStats {
  maxHp: number;
  maxMp: number;
  /** Melee resource pool. 0 for caster classes that use MP instead. */
  maxStamina: number;
  ac: number;
  initiativeBonus: number;
}

/**
 * computeDerived
 *
 *   maxHp      = max(1, 10 + (CON mod × level) + (hpPerLevel × level))
 *   maxMp      = mpStat       ? max(0, 5 + (mpStat mod × level))      : 0
 *   maxStamina = staminaStat  ? max(0, 8 + (staminaStat mod × level)) : 0
 *   ac         = 10 + DEX mod
 *   init       = DEX mod
 *
 * Stamina pool is slightly larger at base (8 vs MP's 5) because melee
 * skills are designed around small, frequent costs (3-6) and stamina
 * regen of +2/turn — we want the player to use a skill every turn or
 * two without ever fully bottoming out, while MP is rarer and more
 * decisive per cast.
 */
export function computeDerived(
  stats: StatBlock,
  level: number,
  hpPerLevel: number,
  mpStat: StatKey | null = null,
  staminaStat: StatKey | null = null,
): DerivedStats {
  if (level < 1 || !Number.isInteger(level)) {
    throw new Error(`computeDerived: invalid level ${level}`);
  }
  const conMod = modifier(stats.con);
  const dexMod = modifier(stats.dex);
  const maxHp = Math.max(1, 10 + conMod * level + hpPerLevel * level);
  const maxMp = mpStat ? Math.max(0, 5 + modifier(stats[mpStat]) * level) : 0;
  const maxStamina = staminaStat
    ? Math.max(0, 8 + modifier(stats[staminaStat]) * level)
    : 0;
  return {
    maxHp,
    maxMp,
    maxStamina,
    ac: 10 + dexMod,
    initiativeBonus: dexMod,
  };
}
