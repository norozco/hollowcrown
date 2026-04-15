import { describe, it, expect } from 'vitest';
import {
  Character,
  MAX_LEVEL,
  MAX_NAME_LENGTH,
  validateName,
  xpForLevel,
  type CharacterInit,
} from '../character';
import { ALL_RACES, getRace } from '../race';
import { ALL_CLASSES, getClass } from '../classes';
import type { StatBlock } from '../stats';

const baseStats: StatBlock = { str: 12, dex: 14, con: 13, int: 10, wis: 11, cha: 8 };

const baseInit: CharacterInit = {
  name: 'Aria',
  raceKey: 'elf',
  classKey: 'wizard',
  rolledStats: baseStats,
  difficulty: 'normal',
};

describe('validateName()', () => {
  it('accepts simple names', () => {
    expect(validateName('Aria').valid).toBe(true);
    expect(validateName('Bob').valid).toBe(true);
    expect(validateName("D'arvit").valid).toBe(true);
    expect(validateName('Mary-Jane').valid).toBe(true);
    expect(validateName('A1').valid).toBe(true);
  });

  it('rejects empty/missing', () => {
    expect(validateName('').valid).toBe(false);
    expect(validateName(undefined as unknown as string).valid).toBe(false);
  });

  it('rejects too-long names', () => {
    const tooLong = 'A'.repeat(MAX_NAME_LENGTH + 1);
    const res = validateName(tooLong);
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/15/);
  });

  it('accepts the boundary length (exactly MAX_NAME_LENGTH)', () => {
    expect(validateName('A'.repeat(MAX_NAME_LENGTH)).valid).toBe(true);
  });

  it('rejects names that start with non-letter', () => {
    expect(validateName('1ria').valid).toBe(false);
    expect(validateName("'apostrophe").valid).toBe(false);
    expect(validateName('-dash').valid).toBe(false);
  });

  it('rejects names with spaces or invalid chars', () => {
    expect(validateName('Bob Builder').valid).toBe(false);
    expect(validateName('Bob@home').valid).toBe(false);
    expect(validateName('Bob!').valid).toBe(false);
  });
});

describe('xpForLevel()', () => {
  it.each([
    [1, 0],
    [2, 300],
    [3, 900],
    [4, 2700],
    [5, 6500],
    [6, 14000],
    [10, 64000],
    [20, 355000],
  ])('xpForLevel(%i) = %i', (lvl, xp) => {
    expect(xpForLevel(lvl)).toBe(xp);
  });

  it('returns Infinity past max level', () => {
    expect(xpForLevel(MAX_LEVEL + 1)).toBe(Infinity);
    expect(xpForLevel(99)).toBe(Infinity);
  });

  it('throws on invalid level', () => {
    expect(() => xpForLevel(0)).toThrow();
    expect(() => xpForLevel(-1)).toThrow();
    expect(() => xpForLevel(1.5)).toThrow();
  });
});

describe('Character constructor', () => {
  it('applies racial bonuses to rolled stats', () => {
    // Elf bonuses: +0/+2/+0/+1/+1/+0 (str/dex/con/int/wis/cha).
    const c = new Character(baseInit);
    expect(c.stats).toEqual({
      str: 12,
      dex: 14 + 2,
      con: 13,
      int: 10 + 1,
      wis: 11 + 1,
      cha: 8,
    });
    expect(c.rolledStats).toEqual(baseStats);
  });

  it('applies extraBonuses on top of racial (e.g. half-elf player choice)', () => {
    const c = new Character({
      ...baseInit,
      raceKey: 'half-elf',
      extraBonuses: { str: 1, con: 1 },
    });
    // Half-elf bonus: +0/+0/+0/+0/+0/+2.
    expect(c.stats).toEqual({
      str: 12 + 1,
      dex: 14,
      con: 13 + 1,
      int: 10,
      wis: 11,
      cha: 8 + 2,
    });
  });

  it('initializes hp/mp at the computed max', () => {
    const c = new Character(baseInit);
    const d = c.derived;
    expect(c.hp).toBe(d.maxHp);
    expect(c.mp).toBe(d.maxMp);
  });

  it('starts at level 1 with 0 XP by default', () => {
    const c = new Character(baseInit);
    expect(c.level).toBe(1);
    expect(c.xp).toBe(0);
  });

  it('accepts a starting level for tests/debug', () => {
    const c = new Character({ ...baseInit, level: 5 });
    expect(c.level).toBe(5);
    expect(c.xp).toBe(xpForLevel(5));
  });

  it('stores the player choice (e.g. dragonborn element)', () => {
    const c = new Character({
      ...baseInit,
      raceKey: 'dragonborn',
      classKey: 'fighter',
      playerChoice: 'fire',
    });
    expect(c.playerChoice).toBe('fire');
  });

  it('throws on invalid name', () => {
    expect(() => new Character({ ...baseInit, name: '' })).toThrow();
    expect(() => new Character({ ...baseInit, name: 'X'.repeat(20) })).toThrow();
  });

  it('throws on out-of-range level', () => {
    expect(() => new Character({ ...baseInit, level: 0 })).toThrow();
    expect(() => new Character({ ...baseInit, level: MAX_LEVEL + 1 })).toThrow();
  });
});

describe('Character.statModifiers / modifierOf', () => {
  it('returns D&D modifiers for each stat after racial bonuses', () => {
    const c = new Character(baseInit);
    // After elf bonuses: str 12, dex 16, con 13, int 11, wis 12, cha 8
    expect(c.statModifiers).toEqual({
      str: 1,
      dex: 3,
      con: 1,
      int: 0,
      wis: 1,
      cha: -1,
    });
    expect(c.modifierOf('dex')).toBe(3);
  });
});

describe('Character.takeDamage / heal', () => {
  it('reduces hp without going negative', () => {
    const c = new Character(baseInit);
    const startHp = c.hp;
    c.takeDamage(5);
    expect(c.hp).toBe(startHp - 5);
    c.takeDamage(9999);
    expect(c.hp).toBe(0);
    expect(c.isAlive).toBe(false);
  });

  it('heals up to max', () => {
    const c = new Character(baseInit);
    c.takeDamage(10);
    c.heal(3);
    expect(c.hp).toBe(c.derived.maxHp - 7);
    c.heal(9999);
    expect(c.hp).toBe(c.derived.maxHp);
  });

  it('rejects negative amounts', () => {
    const c = new Character(baseInit);
    expect(() => c.takeDamage(-1)).toThrow();
    expect(() => c.heal(-1)).toThrow();
  });
});

describe('Character.spendMp / restoreMp', () => {
  it('spends mp when affordable, refuses when not', () => {
    const c = new Character({ ...baseInit, classKey: 'wizard' });
    const startMp = c.mp;
    expect(c.spendMp(2)).toBe(true);
    expect(c.mp).toBe(startMp - 2);
    expect(c.spendMp(9999)).toBe(false);
    expect(c.mp).toBe(startMp - 2); // unchanged on failure
  });

  it('restores mp up to max', () => {
    const c = new Character({ ...baseInit, classKey: 'wizard' });
    const max = c.derived.maxMp;
    c.spendMp(3);
    c.restoreMp(9999);
    expect(c.mp).toBe(max);
  });

  it('non-caster (fighter) has 0 max MP', () => {
    const c = new Character({ ...baseInit, classKey: 'fighter' });
    expect(c.derived.maxMp).toBe(0);
    expect(c.mp).toBe(0);
  });
});

describe('Character.gold', () => {
  it('starts at 0 by default', () => {
    const c = new Character(baseInit);
    expect(c.gold).toBe(0);
  });

  it('honors an initial gold value', () => {
    const c = new Character({ ...baseInit, gold: 50 });
    expect(c.gold).toBe(50);
  });

  it('rejects negative starting gold', () => {
    expect(() => new Character({ ...baseInit, gold: -1 })).toThrow();
  });

  it('addGold credits the purse', () => {
    const c = new Character(baseInit);
    c.addGold(100);
    expect(c.gold).toBe(100);
    c.addGold(50);
    expect(c.gold).toBe(150);
  });

  it('loseGold debits and returns the amount spent', () => {
    const c = new Character({ ...baseInit, gold: 80 });
    expect(c.loseGold(30)).toBe(30);
    expect(c.gold).toBe(50);
  });

  it('loseGold clamps at current purse and returns actual spend', () => {
    const c = new Character({ ...baseInit, gold: 20 });
    expect(c.loseGold(100)).toBe(20);
    expect(c.gold).toBe(0);
  });

  it('rejects negative amounts on both sides', () => {
    const c = new Character(baseInit);
    expect(() => c.addGold(-1)).toThrow();
    expect(() => c.loseGold(-1)).toThrow();
  });
});

describe('Character.gainXp', () => {
  it('returns 0 levels gained when below threshold', () => {
    const c = new Character(baseInit);
    expect(c.gainXp(100)).toBe(0);
    expect(c.level).toBe(1);
  });

  it('levels up once when crossing one threshold', () => {
    const c = new Character(baseInit);
    expect(c.gainXp(300)).toBe(1);
    expect(c.level).toBe(2);
  });

  it('levels up multiple times when XP greatly exceeds threshold', () => {
    const c = new Character(baseInit);
    // 1000 XP from level 1 → crosses 300 (lvl 2) and 900 (lvl 3); not 2700.
    expect(c.gainXp(1000)).toBe(2);
    expect(c.level).toBe(3);
  });

  it('caps at MAX_LEVEL', () => {
    const c = new Character(baseInit);
    c.gainXp(99_999_999);
    expect(c.level).toBe(MAX_LEVEL);
  });

  it('refills HP/MP on level-up', () => {
    const c = new Character({ ...baseInit, classKey: 'wizard' });
    c.takeDamage(5);
    c.spendMp(2);
    c.gainXp(300);
    expect(c.hp).toBe(c.derived.maxHp);
    expect(c.mp).toBe(c.derived.maxMp);
  });

  it('rejects negative XP gain', () => {
    const c = new Character(baseInit);
    expect(() => c.gainXp(-1)).toThrow();
  });
});

describe('Race & Class data integrity', () => {
  it('exposes all 10 races', () => {
    expect(ALL_RACES).toHaveLength(10);
  });

  it('every race is retrievable by key', () => {
    for (const r of ALL_RACES) {
      expect(getRace(r.key)).toBe(r);
    }
  });

  it('every race has valid stat bonuses (all 6 keys present, integer values)', () => {
    for (const r of ALL_RACES) {
      expect(Object.keys(r.bonuses).sort()).toEqual(
        ['cha', 'con', 'dex', 'int', 'str', 'wis'],
      );
      Object.values(r.bonuses).forEach((v) => {
        expect(Number.isInteger(v)).toBe(true);
      });
    }
  });

  it('exposes all 6 classes', () => {
    expect(ALL_CLASSES).toHaveLength(6);
  });

  it('every class is retrievable by key', () => {
    for (const c of ALL_CLASSES) {
      expect(getClass(c.key)).toBe(c);
    }
  });

  it('classes have non-negative HP/level and primaryStats of length 2', () => {
    for (const c of ALL_CLASSES) {
      expect(c.hpPerLevel).toBeGreaterThanOrEqual(0);
      expect(c.primaryStats).toHaveLength(2);
    }
  });

  it('throws on unknown race / class keys', () => {
    expect(() => getRace('foo' as never)).toThrow();
    expect(() => getClass('foo' as never)).toThrow();
  });
});
