import { describe, it, expect } from 'vitest';
import { DiceRoller, modifier } from '../dice';

describe('DiceRoller.d', () => {
  it('returns a value in [1, sides]', () => {
    const roller = new DiceRoller(42);
    for (let i = 0; i < 500; i++) {
      const v = roller.d(20);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(20);
    }
  });

  it('covers all faces of a d6 given enough rolls', () => {
    const roller = new DiceRoller(42);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(roller.d(6));
    expect(seen).toEqual(new Set([1, 2, 3, 4, 5, 6]));
  });

  it('throws on invalid sides', () => {
    const roller = new DiceRoller();
    expect(() => roller.d(0)).toThrow();
    expect(() => roller.d(-5)).toThrow();
    expect(() => roller.d(3.5)).toThrow();
  });
});

describe('DiceRoller.roll', () => {
  it('returns an array of the correct length', () => {
    const roller = new DiceRoller(42);
    expect(roller.roll(4, 6)).toHaveLength(4);
    expect(roller.roll(0, 6)).toHaveLength(0);
    expect(roller.roll(10, 20)).toHaveLength(10);
  });

  it('throws on invalid count', () => {
    const roller = new DiceRoller(42);
    expect(() => roller.roll(-1, 6)).toThrow();
    expect(() => roller.roll(2.5, 6)).toThrow();
  });
});

describe('DiceRoller.sum', () => {
  it('is within the mathematically valid range', () => {
    const roller = new DiceRoller(42);
    const s = roller.sum(10, 6);
    expect(s).toBeGreaterThanOrEqual(10);
    expect(s).toBeLessThanOrEqual(60);
  });
});

describe('DiceRoller determinism', () => {
  it('produces identical sequences for identical seeds', () => {
    const a = new DiceRoller(12345);
    const b = new DiceRoller(12345);
    for (let i = 0; i < 50; i++) {
      expect(a.d(20)).toBe(b.d(20));
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = new DiceRoller(1);
    const b = new DiceRoller(2);
    const seqA = Array.from({ length: 20 }, () => a.d(20));
    const seqB = Array.from({ length: 20 }, () => b.d(20));
    expect(seqA).not.toEqual(seqB);
  });
});

describe('DiceRoller.rollStat', () => {
  it('returns a value in [3, 18]', () => {
    const roller = new DiceRoller(42);
    for (let i = 0; i < 500; i++) {
      const v = roller.rollStat();
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(18);
    }
  });
});

describe('DiceRoller.rollStatBlock', () => {
  it('returns 6 stats each in valid range', () => {
    const roller = new DiceRoller(42);
    const stats = roller.rollStatBlock();
    expect(stats).toHaveLength(6);
    stats.forEach((s) => {
      expect(s).toBeGreaterThanOrEqual(3);
      expect(s).toBeLessThanOrEqual(18);
    });
  });
});

describe('DiceRoller.parse', () => {
  const roller = new DiceRoller(42);

  it('parses standard notations', () => {
    expect(() => roller.parse('d20')).not.toThrow();
    expect(() => roller.parse('2d6')).not.toThrow();
    expect(() => roller.parse('2d6+3')).not.toThrow();
    expect(() => roller.parse('1d8-1')).not.toThrow();
    expect(() => roller.parse('  2D6  ')).not.toThrow(); // whitespace + case
  });

  it('rejects invalid notation', () => {
    expect(() => roller.parse('xyz')).toThrow();
    expect(() => roller.parse('d')).toThrow();
    expect(() => roller.parse('2x6')).toThrow();
    expect(() => roller.parse('')).toThrow();
  });

  it('applies the modifier correctly', () => {
    // 2d1 always sums to 2; +3 → 5.
    expect(roller.parse('2d1+3')).toBe(5);
    expect(roller.parse('1d1-5')).toBe(-4);
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
  ])('modifier(%i) = %i', (stat, expected) => {
    expect(modifier(stat)).toBe(expected);
  });
});
