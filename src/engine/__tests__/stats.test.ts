import { describe, it, expect } from 'vitest';
import {
  STAT_KEYS,
  ZERO_STATS,
  addStats,
  assignStats,
  computeDerived,
  modifier,
  type StatBlock,
} from '../stats';

const sample = (): StatBlock => ({
  str: 10,
  dex: 14,
  con: 12,
  int: 8,
  wis: 13,
  cha: 16,
});

describe('STAT_KEYS', () => {
  it('contains exactly the six standard stats in canonical order', () => {
    expect(STAT_KEYS).toEqual(['str', 'dex', 'con', 'int', 'wis', 'cha']);
  });
});

describe('ZERO_STATS', () => {
  it('is all zeros', () => {
    expect(ZERO_STATS).toEqual({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });
  });
});

describe('modifier()', () => {
  it.each([
    [1, -5],
    [3, -4],
    [8, -1],
    [10, 0],
    [11, 0],
    [12, 1],
    [18, 4],
    [20, 5],
    [30, 10],
  ])('modifier(%i) = %i', (stat, expected) => {
    expect(modifier(stat)).toBe(expected);
  });
});

describe('addStats()', () => {
  it('returns elementwise sum', () => {
    const a = sample();
    const b: StatBlock = { str: 1, dex: 2, con: 3, int: 4, wis: 5, cha: 6 };
    expect(addStats(a, b)).toEqual({
      str: 11,
      dex: 16,
      con: 15,
      int: 12,
      wis: 18,
      cha: 22,
    });
  });

  it('handles negatives (e.g. orc INT penalty)', () => {
    const a: StatBlock = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    const orcLike: StatBlock = { str: 3, dex: 0, con: 2, int: -1, wis: 0, cha: 0 };
    expect(addStats(a, orcLike)).toEqual({
      str: 13,
      dex: 10,
      con: 12,
      int: 9,
      wis: 10,
      cha: 10,
    });
  });

  it('does not mutate inputs', () => {
    const a = sample();
    const b = sample();
    const aCopy = { ...a };
    const bCopy = { ...b };
    addStats(a, b);
    expect(a).toEqual(aCopy);
    expect(b).toEqual(bCopy);
  });
});

describe('assignStats()', () => {
  it('maps rolled values to named stats by assignment order', () => {
    const block = assignStats([14, 10, 13, 8, 12, 15], ['str', 'dex', 'con', 'int', 'wis', 'cha']);
    expect(block).toEqual({ str: 14, dex: 10, con: 13, int: 8, wis: 12, cha: 15 });
  });

  it('respects assignment order (e.g. dump CHA, max STR)', () => {
    const block = assignStats([15, 14, 13, 12, 10, 8], ['str', 'con', 'dex', 'wis', 'int', 'cha']);
    expect(block).toEqual({ str: 15, con: 14, dex: 13, wis: 12, int: 10, cha: 8 });
  });

  it('throws on wrong array lengths', () => {
    expect(() => assignStats([1, 2, 3], ['str', 'dex', 'con', 'int', 'wis', 'cha'])).toThrow();
    expect(() => assignStats([1, 2, 3, 4, 5, 6], ['str', 'dex', 'con'] as never)).toThrow();
  });

  it('throws if assignment has duplicates', () => {
    expect(() =>
      assignStats(
        [10, 10, 10, 10, 10, 10],
        ['str', 'str', 'con', 'int', 'wis', 'cha'] as never,
      ),
    ).toThrow();
  });
});

describe('computeDerived()', () => {
  it('computes a level-1 fighter (str 10, dex 14, con 14, hp/lvl 10)', () => {
    const stats: StatBlock = { str: 10, dex: 14, con: 14, int: 10, wis: 10, cha: 10 };
    const d = computeDerived(stats, 1, 10, null);
    // CON 14 → +2 mod. HP = 10 + 2*1 + 10*1 = 22.
    // DEX 14 → +2 mod. AC = 12. Init bonus = 2.
    // No MP stat → 0.
    expect(d).toEqual({ maxHp: 22, maxMp: 0, maxStamina: 0, ac: 12, initiativeBonus: 2 });
  });

  it('computes MP for an INT caster (wizard, hp/lvl 4)', () => {
    const stats: StatBlock = { str: 8, dex: 12, con: 12, int: 16, wis: 12, cha: 10 };
    const d = computeDerived(stats, 3, 4, 'int');
    // CON 12 → +1. HP = 10 + 1*3 + 4*3 = 25.
    // INT 16 → +3. MP = 5 + 3*3 = 14.
    // DEX 12 → +1. AC = 11.
    expect(d.maxHp).toBe(25);
    expect(d.maxMp).toBe(14);
    expect(d.ac).toBe(11);
    expect(d.initiativeBonus).toBe(1);
  });

  it('computes MP for a CHA caster (bard)', () => {
    const stats: StatBlock = { str: 8, dex: 14, con: 12, int: 10, wis: 10, cha: 16 };
    const d = computeDerived(stats, 1, 6, 'cha');
    // CHA 16 → +3. MP = 5 + 3 = 8.
    expect(d.maxMp).toBe(8);
  });

  it('clamps maxHp at 1 even with terrible CON and a frail class', () => {
    const stats: StatBlock = { str: 8, dex: 8, con: 1, int: 8, wis: 8, cha: 8 };
    // CON 1 → -5 mod. With hp/lvl 4 and level 1: 10 + (-5) + 4 = 9. Still positive — try level 5.
    // 10 + (-5)*5 + 4*5 = 10 - 25 + 20 = 5. Still positive.
    // Try level 100: 10 + -500 + 400 = -90 → clamped to 1.
    const d = computeDerived(stats, 100, 4, null);
    expect(d.maxHp).toBe(1);
  });

  it('clamps maxMp at 0 (no negative MP)', () => {
    const stats: StatBlock = { str: 10, dex: 10, con: 10, int: 1, wis: 10, cha: 10 };
    const d = computeDerived(stats, 5, 4, 'int');
    // INT 1 → -5 mod. MP = 5 + -25 = -20 → clamped to 0.
    expect(d.maxMp).toBe(0);
  });

  it('computes maxStamina from staminaStat (martial classes)', () => {
    const stats: StatBlock = { str: 16, dex: 12, con: 12, int: 8, wis: 10, cha: 10 };
    // Fighter: hp/lvl 10, no mp, stamina from STR.
    // STR 16 → +3 mod. Stamina = 8 + 3*1 = 11.
    const d = computeDerived(stats, 1, 10, null, 'str');
    expect(d.maxStamina).toBe(11);
    expect(d.maxMp).toBe(0);
  });

  it('clamps maxStamina at 0 (no negative stamina)', () => {
    const stats: StatBlock = { str: 1, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
    const d = computeDerived(stats, 5, 6, null, 'str');
    // STR 1 → -5 mod. Stamina = 8 + -25 = -17 → clamped to 0.
    expect(d.maxStamina).toBe(0);
  });

  it('caster classes get 0 maxStamina (no staminaStat)', () => {
    const stats: StatBlock = { str: 10, dex: 10, con: 10, int: 16, wis: 10, cha: 10 };
    const d = computeDerived(stats, 3, 4, 'int', null);
    expect(d.maxStamina).toBe(0);
    expect(d.maxMp).toBe(14);
  });

  it('throws on invalid level', () => {
    const stats = sample();
    expect(() => computeDerived(stats, 0, 10, null)).toThrow();
    expect(() => computeDerived(stats, -1, 10, null)).toThrow();
    expect(() => computeDerived(stats, 1.5, 10, null)).toThrow();
  });
});
