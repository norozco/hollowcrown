import { getRace, type Race, type RaceKey } from './race';
import { getClass, type CharacterClass, type ClassKey } from './classes';
import {
  type StatBlock,
  type DerivedStats,
  type StatKey,
  STAT_KEYS,
  ZERO_STATS,
  addStats,
  computeDerived,
  modifier,
} from './stats';
import { pickStartingWeapon, type Weapon } from './weapons';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'hardcore';
export type Gender = 'male' | 'female';

/** Combat scaling multipliers per difficulty. Applied in combat.ts. */
export const DIFFICULTY_SCALES: Record<Difficulty, {
  monsterHp: number;
  monsterDamage: number;
  goldGain: number;
  xpGain: number;
  description: string;
}> = {
  easy: {
    monsterHp: 0.7, monsterDamage: 0.7, goldGain: 1.2, xpGain: 1.0,
    description: 'Forgiving. Enemies hit softer and drop more gold.',
  },
  normal: {
    monsterHp: 1.0, monsterDamage: 1.0, goldGain: 1.0, xpGain: 1.0,
    description: 'The intended experience. No hand-holding, no cruelty.',
  },
  hard: {
    monsterHp: 1.35, monsterDamage: 1.25, goldGain: 0.8, xpGain: 1.15,
    description: 'Enemies hit harder and last longer. More XP, less gold.',
  },
  hardcore: {
    monsterHp: 1.5, monsterDamage: 1.35, goldGain: 0.75, xpGain: 1.2,
    description: 'Permadeath. The cairn keeps your name when you fall.',
  },
};

export const MAX_NAME_LENGTH = 15;

/** Character name rules per spec §5.1: 1-15 chars, alphanumerics +
 *  apostrophe + hyphen; no spaces; must start with a letter. */
const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9'-]{0,14}$/;

export function validateName(name: string): { valid: boolean; reason?: string } {
  if (typeof name !== 'string' || name.length === 0) {
    return { valid: false, reason: 'Name is required' };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { valid: false, reason: `Max ${MAX_NAME_LENGTH} characters` };
  }
  if (!NAME_PATTERN.test(name)) {
    return {
      valid: false,
      reason: "Letters, digits, apostrophe, hyphen only; must start with a letter",
    };
  }
  return { valid: true };
}

export interface CharacterInit {
  name: string;
  raceKey: RaceKey;
  classKey: ClassKey;
  /** Stats as rolled, before any racial bonuses. */
  rolledStats: StatBlock;
  difficulty: Difficulty;
  gender: Gender;
  /** Optional: player-choice bonuses (e.g. half-elf's two extra +1s).
   *  Get added on top of the race's locked bonuses. */
  extraBonuses?: Partial<StatBlock>;
  /** Optional: race-specific creation choice (e.g. dragonborn element).
   *  Stored as-is on the character. */
  playerChoice?: string;
  /** Optional: start at a specific level (for tests / debug). Defaults 1. */
  level?: number;
  /** Optional: start with specific XP (for tests / debug). Defaults 0. */
  xp?: number;
  /** Optional: starting gold purse. Defaults 0. */
  gold?: number;
}

/**
 * Full XP-to-level table per spec §5.5 / standard D&D 5e (cumulative).
 * Level 1 begins at 0 XP. xp >= XP_TABLE[level-1] means the character is
 * AT LEAST that level.
 */
const XP_TABLE: readonly number[] = [
  0,      // Level 1:  start
  50,     // Level 2:  2 wolves
  150,    // Level 3:  a few more fights
  350,    // Level 4:  explore Greenhollow
  600,    // Level 5:  cleared some skeletons
  1000,   // Level 6:  dungeon floor 1
  1600,   // Level 7:  dungeon floor 2
  2500,   // Level 8:  serious adventurer
  4000,   // Level 9:  veteran
  6000,   // Level 10: ready for the boss
  9000,   // Level 11+: steep climb
  13000,
  18000,
  24000,
  32000,
  42000,
  55000,
  70000,
  90000,
  120000,
];

export const MAX_LEVEL = XP_TABLE.length; // 20

/** XP required to reach `level`. Throws on invalid level; returns +Infinity past max. */
export function xpForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) {
    throw new Error(`xpForLevel: invalid level ${level}`);
  }
  if (level > MAX_LEVEL) return Infinity;
  return XP_TABLE[level - 1];
}

/**
 * The Character class. Combines name + race + class + stats + level/HP/MP
 * tracking. Everything mechanical about a player-or-NPC adventurer flows
 * through here. Combat, inventory, quests are layered on top in later
 * milestones.
 */
export class Character {
  readonly name: string;
  readonly race: Race;
  readonly characterClass: CharacterClass;
  readonly difficulty: Difficulty;
  readonly gender: Gender;
  readonly playerChoice?: string;

  /** Final stats AFTER applying race + extra bonuses. */
  readonly stats: StatBlock;

  /** Stats as rolled, before any racial bonuses (kept for display). */
  readonly rolledStats: StatBlock;

  /** Weapon equipped at character creation. Mutable later when the
   *  inventory milestone ships. */
  weapon: Weapon;

  level: number;
  xp: number;
  hp: number;
  mp: number;
  gold: number;

  constructor(init: CharacterInit) {
    const v = validateName(init.name);
    if (!v.valid) throw new Error(`Invalid character name: ${v.reason}`);

    this.name = init.name;
    this.race = getRace(init.raceKey);
    this.characterClass = getClass(init.classKey);
    this.difficulty = init.difficulty;
    this.gender = init.gender ?? 'male';
    this.playerChoice = init.playerChoice;
    this.rolledStats = { ...init.rolledStats };

    // Final stats = rolled + race bonuses + (optional) player-choice bonuses
    const extra: StatBlock = { ...ZERO_STATS, ...(init.extraBonuses ?? {}) };
    this.stats = addStats(addStats(init.rolledStats, this.race.bonuses), extra);

    this.level = init.level ?? 1;
    if (this.level < 1 || this.level > MAX_LEVEL) {
      throw new Error(`Character level out of range: ${this.level}`);
    }
    this.xp = init.xp ?? xpForLevel(this.level);
    this.gold = init.gold ?? 0;
    if (this.gold < 0) throw new Error('Character gold cannot be negative');

    this.weapon = pickStartingWeapon(
      this.stats,
      init.raceKey,
      init.classKey,
      this.characterClass.startingWeapons,
    );

    const d = this.derived;
    this.hp = d.maxHp;
    this.mp = d.maxMp;
  }

  /** Recompute derived stats from current stats + class + level. */
  get derived(): DerivedStats {
    return computeDerived(
      this.stats,
      this.level,
      this.characterClass.hpPerLevel,
      this.characterClass.mpStat,
    );
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }

  get statModifiers(): StatBlock {
    const out = { ...ZERO_STATS };
    for (const k of STAT_KEYS) out[k] = modifier(this.stats[k]);
    return out;
  }

  /** Helper: get a single stat's D&D modifier. */
  modifierOf(stat: StatKey): number {
    return modifier(this.stats[stat]);
  }

  takeDamage(amount: number): void {
    if (amount < 0) throw new Error('Damage must be non-negative');
    this.hp = Math.max(0, this.hp - amount);
  }

  /** Credit gold to the purse. Throws on negative; rewards flow through
   *  here so audit trails stay consistent with the direction of money. */
  addGold(amount: number): void {
    if (amount < 0) throw new Error('Gold gain must be non-negative');
    this.gold += amount;
  }

  /** Debit gold. Returns the amount actually spent (clamped at current
   *  purse). Callers should check the return if a partial spend matters. */
  loseGold(amount: number): number {
    if (amount < 0) throw new Error('Gold loss must be non-negative');
    const lost = Math.min(amount, this.gold);
    this.gold -= lost;
    return lost;
  }

  heal(amount: number): void {
    if (amount < 0) throw new Error('Heal must be non-negative');
    this.hp = Math.min(this.derived.maxHp, this.hp + amount);
  }

  /** Try to spend MP. Returns false (and doesn't deduct) if insufficient. */
  spendMp(amount: number): boolean {
    if (amount < 0) throw new Error('MP cost must be non-negative');
    if (this.mp < amount) return false;
    this.mp -= amount;
    return true;
  }

  /** Restore MP up to current max. */
  restoreMp(amount: number): void {
    if (amount < 0) throw new Error('MP restore must be non-negative');
    this.mp = Math.min(this.derived.maxMp, this.mp + amount);
  }

  /**
   * Add XP and auto-level if thresholds crossed. Returns the number of
   * levels gained this call (0 if none). Each level-up refills HP/MP —
   * classic RPG pattern. Caller is responsible for prompting the player
   * for stat / skill-tree choices on each level gained.
   */
  gainXp(amount: number): number {
    if (amount < 0) throw new Error('XP gain must be non-negative');
    this.xp += amount;
    let gained = 0;
    while (this.level < MAX_LEVEL && this.xp >= xpForLevel(this.level + 1)) {
      this.level += 1;
      gained += 1;
      const d = this.derived;
      this.hp = d.maxHp;
      this.mp = d.maxMp;
    }
    return gained;
  }
}
