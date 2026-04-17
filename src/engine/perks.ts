/**
 * Passive perk system. On each level-up the player chooses one of
 * three randomly drawn perks — small permanent bonuses that
 * accumulate over the course of a playthrough. Perks are tracked as
 * string keys on the playerStore; stat / combat bonuses are applied
 * where equipment bonuses are already aggregated so nothing about
 * the Character class itself needs to change.
 */

import type { Character } from './character';
import type { StatKey } from './stats';

export interface Perk {
  key: string;
  name: string;
  description: string;
  icon: string;
  /** Apply immediate stat mutations (for stat-boost perks). */
  apply: (character: Character) => void;
}

export const ALL_PERKS: Perk[] = [
  // ── Stat boosts ──
  { key: 'str+1', name: 'Strength',  description: '+1 STR', icon: '\uD83D\uDCAA', apply: (c) => { (c.stats as Record<StatKey, number>).str += 1; } },
  { key: 'dex+1', name: 'Agility',   description: '+1 DEX', icon: '\uD83C\uDFC3', apply: (c) => { (c.stats as Record<StatKey, number>).dex += 1; } },
  { key: 'con+1', name: 'Fortitude', description: '+1 CON', icon: '\uD83D\uDEE1', apply: (c) => { (c.stats as Record<StatKey, number>).con += 1; } },
  { key: 'int+1', name: 'Intellect', description: '+1 INT', icon: '\uD83D\uDCD6', apply: (c) => { (c.stats as Record<StatKey, number>).int += 1; } },
  { key: 'wis+1', name: 'Insight',   description: '+1 WIS', icon: '\uD83D\uDC41', apply: (c) => { (c.stats as Record<StatKey, number>).wis += 1; } },
  { key: 'cha+1', name: 'Presence',  description: '+1 CHA', icon: '\u2728',       apply: (c) => { (c.stats as Record<StatKey, number>).cha += 1; } },

  // ── Derived bonuses (tracked via perk counts, not Character mutations) ──
  { key: 'hp+5',  name: 'Vitality',  description: '+5 Max HP',  icon: '\u2764',   apply: () => { /* applied as perk bonus in HUD + combat */ } },
  { key: 'mp+3',  name: 'Arcana',    description: '+3 Max MP',  icon: '\uD83D\uDD2E', apply: () => { /* applied as perk bonus in HUD + combat */ } },
  { key: 'atk+1', name: 'Precision', description: '+1 Attack',  icon: '\uD83C\uDFAF', apply: () => { /* applied in getEquipmentBonuses */ } },
  { key: 'dmg+2', name: 'Power',     description: '+2 Damage',  icon: '\u2694',   apply: () => { /* applied in getEquipmentBonuses */ } },
];

/** Pick `count` random unique perks for a level-up choice. */
export function rollPerkChoices(count = 3): Perk[] {
  const shuffled = [...ALL_PERKS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ── Helpers for aggregating perk-based combat bonuses ──

/** Sum attack / damage bonuses from a list of chosen perk keys. */
export function getPerkCombatBonuses(perkKeys: string[]): { attack: number; damage: number } {
  let attack = 0;
  let damage = 0;
  for (const pk of perkKeys) {
    if (pk === 'atk+1') attack += 1;
    if (pk === 'dmg+2') damage += 2;
  }
  return { attack, damage };
}

/** Count bonus max-HP from chosen perk keys. */
export function getPerkHpBonus(perkKeys: string[]): number {
  return perkKeys.filter((p) => p === 'hp+5').length * 5;
}

/** Count bonus max-MP from chosen perk keys. */
export function getPerkMpBonus(perkKeys: string[]): number {
  return perkKeys.filter((p) => p === 'mp+3').length * 3;
}
