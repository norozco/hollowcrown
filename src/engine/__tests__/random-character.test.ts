import { describe, it, expect } from 'vitest';
import { rollRandomCharacter } from '../random-character';
import { Character } from '../character';
import { ALL_RACES } from '../race';
import { ALL_CLASSES } from '../classes';

describe('rollRandomCharacter', () => {
  it('produces an init that satisfies Character constructor', () => {
    for (let i = 0; i < 50; i++) {
      const init = rollRandomCharacter();
      expect(() => new Character(init)).not.toThrow();
    }
  });

  it('always uses Normal difficulty (Hardcore must be a conscious pick)', () => {
    for (let i = 0; i < 20; i++) {
      expect(rollRandomCharacter().difficulty).toBe('normal');
    }
  });

  it('picks a valid race and class', () => {
    const raceKeys = new Set(ALL_RACES.map((r) => r.key));
    const classKeys = new Set(ALL_CLASSES.map((c) => c.key));
    for (let i = 0; i < 20; i++) {
      const init = rollRandomCharacter();
      expect(raceKeys.has(init.raceKey)).toBe(true);
      expect(classKeys.has(init.classKey)).toBe(true);
    }
  });

  it('assigns the highest rolled stat to a class primary stat', () => {
    for (let i = 0; i < 30; i++) {
      const init = rollRandomCharacter();
      const stats = init.rolledStats;
      const maxStatValue = Math.max(...Object.values(stats));
      // The top-scoring roll should land on at least one of the class's
      // primary stats. (Ties with non-primaries are fine.)
      const klassPrimary = new Set(
        ALL_CLASSES.find((c) => c.key === init.classKey)!.primaryStats,
      );
      const statsAtMax = Object.entries(stats).filter(
        ([, v]) => v === maxStatValue,
      );
      const someAtMaxIsPrimary = statsAtMax.some(([k]) =>
        klassPrimary.has(k as 'str'),
      );
      expect(someAtMaxIsPrimary).toBe(true);
    }
  });

  it('includes extraBonuses for Half-Elf', () => {
    // Force Half-Elf by running many and finding one; Half-Elf should
    // receive extraBonuses with exactly 2 stats at +1 each.
    let found = 0;
    for (let i = 0; i < 300 && found < 3; i++) {
      const init = rollRandomCharacter();
      if (init.raceKey !== 'half-elf') continue;
      found++;
      expect(init.extraBonuses).toBeDefined();
      const entries = Object.entries(init.extraBonuses!);
      expect(entries).toHaveLength(2);
      entries.forEach(([k, v]) => {
        expect(k).not.toBe('cha');
        expect(v).toBe(1);
      });
    }
    expect(found).toBeGreaterThan(0);
  });

  it('includes a playerChoice for Dragonborn', () => {
    let found = 0;
    const validElements = new Set(['fire', 'cold', 'lightning', 'acid', 'poison']);
    for (let i = 0; i < 300 && found < 3; i++) {
      const init = rollRandomCharacter();
      if (init.raceKey !== 'dragonborn') continue;
      found++;
      expect(init.playerChoice).toBeDefined();
      expect(validElements.has(init.playerChoice!)).toBe(true);
    }
    expect(found).toBeGreaterThan(0);
  });

  it('name fits the character-name validation rules', () => {
    for (let i = 0; i < 30; i++) {
      const init = rollRandomCharacter();
      expect(init.name.length).toBeGreaterThan(0);
      expect(init.name.length).toBeLessThanOrEqual(15);
      expect(init.name).toMatch(/^[A-Za-z]/);
    }
  });
});
