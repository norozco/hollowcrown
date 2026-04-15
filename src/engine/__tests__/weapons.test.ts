import { describe, it, expect } from 'vitest';
import { ALL_WEAPONS, getWeapon, pickStartingWeapon, type WeaponOption } from '../weapons';
import { getClass } from '../classes';
import type { StatBlock } from '../stats';

const baseStats: StatBlock = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

describe('Weapon data integrity', () => {
  it('loads weapons from JSON', () => {
    expect(ALL_WEAPONS.length).toBeGreaterThanOrEqual(10);
  });

  it('getWeapon returns the right weapon by key', () => {
    expect(getWeapon('greatsword').name).toBe('Greatsword');
    expect(getWeapon('dagger').attackStat).toBe('dex');
  });

  it('throws on unknown key', () => {
    expect(() => getWeapon('fake_weapon')).toThrow();
  });
});

describe('pickStartingWeapon', () => {
  const fighterOptions: WeaponOption[] = [
    { key: 'greatsword', preferStat: 'str' },
    { key: 'rapier', preferStat: 'dex' },
  ];

  it('picks the STR option when STR > DEX', () => {
    const stats = { ...baseStats, str: 16, dex: 10 };
    const w = pickStartingWeapon(stats, 'human', 'fighter', fighterOptions);
    expect(w.key).toBe('greatsword');
  });

  it('picks the DEX option when DEX > STR', () => {
    const stats = { ...baseStats, str: 10, dex: 16 };
    const w = pickStartingWeapon(stats, 'human', 'fighter', fighterOptions);
    expect(w.key).toBe('rapier');
  });

  it('ties break to the first listed option', () => {
    const stats = { ...baseStats, str: 12, dex: 12 };
    const w = pickStartingWeapon(stats, 'human', 'fighter', fighterOptions);
    expect(w.key).toBe('greatsword');
  });

  it('applies race override (Dwarf + Fighter → Battleaxe)', () => {
    const stats = { ...baseStats, str: 16, dex: 8 };
    const w = pickStartingWeapon(stats, 'dwarf', 'fighter', fighterOptions);
    expect(w.key).toBe('battleaxe');
  });

  it('applies race override (Orc + Fighter → Greataxe)', () => {
    const stats = { ...baseStats, str: 18, dex: 8 };
    const w = pickStartingWeapon(stats, 'orc', 'fighter', fighterOptions);
    expect(w.key).toBe('greataxe');
  });

  it('applies race override (Halfling + Fighter → Shortsword)', () => {
    const stats = { ...baseStats, str: 8, dex: 16 };
    const w = pickStartingWeapon(stats, 'halfling', 'fighter', fighterOptions);
    expect(w.key).toBe('shortsword');
  });

  it('applies race override (Dwarf + Cleric → Warhammer)', () => {
    const clericOpts = getClass('cleric').startingWeapons;
    const w = pickStartingWeapon(baseStats, 'dwarf', 'cleric', clericOpts);
    expect(w.key).toBe('warhammer');
  });

  it('uses class default when race has no override for that class', () => {
    const rogueOpts = getClass('rogue').startingWeapons;
    const w = pickStartingWeapon(baseStats, 'dwarf', 'rogue', rogueOpts);
    expect(w.key).toBe('dagger');
  });

  it('throws on empty options', () => {
    expect(() => pickStartingWeapon(baseStats, 'human', 'fighter', [])).toThrow();
  });
});

describe('Class starting weapons', () => {
  it('every class defines at least one starting weapon', () => {
    const keys = ['fighter', 'rogue', 'wizard', 'cleric', 'ranger', 'bard'] as const;
    for (const k of keys) {
      const c = getClass(k);
      expect(c.startingWeapons.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('all starting-weapon keys resolve to real weapons', () => {
    const keys = ['fighter', 'rogue', 'wizard', 'cleric', 'ranger', 'bard'] as const;
    for (const k of keys) {
      for (const opt of getClass(k).startingWeapons) {
        expect(() => getWeapon(opt.key)).not.toThrow();
      }
    }
  });
});
