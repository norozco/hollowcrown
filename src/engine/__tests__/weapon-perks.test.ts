/**
 * Weapon-perk hook tests. Each test:
 *   - builds a Character with sensible level-1 stats
 *   - overrides `character.weapon` to one of the perked weapons (or a
 *     synthetic Weapon for the perk-kinds the canonical eight don't
 *     directly cover)
 *   - constructs a CombatState by hand (skipping initCombat so the dice
 *     stream isn't burnt on initiative rolls)
 *   - stubs Math.random so the next d(20) hits the threshold we care
 *     about, then calls playerAct(..., 'attack', ...) and asserts the
 *     resulting state.
 *
 * Notes on Math.random discipline:
 *   - dice.d(N) = floor(rand * N) + 1, so for N=20 the roll equals
 *     ceil(rand * 20) when rand > 0, with rand=0.7 → 15, rand=0.9 → 19.
 *   - We pick a constant rand value per test so every dice call inside
 *     the attack branch (to-hit, the d(3) line picker, and any d(100)
 *     status roll) is deterministic — and importantly, all roll into
 *     "good" outcomes (the on_hit_status chance threshold is generous
 *     enough at rand=0.7 that it would proc, but our heal/crit/weakness
 *     tests don't use status perks).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { playerAct, type CombatState } from '../combat';
import { Character, type CharacterInit } from '../character';
import { getMonster } from '../monster';
import { getWeapon, type Weapon } from '../weapons';
import type { StatBlock } from '../stats';
import type { RaceKey } from '../race';
import type { ClassKey } from '../classes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeChar(
  raceKey: RaceKey = 'human',
  classKey: ClassKey = 'fighter',
  name = 'PerkTester',
): Character {
  const stats: StatBlock = { str: 14, dex: 14, con: 14, int: 14, wis: 14, cha: 14 };
  const init: CharacterInit = {
    name,
    raceKey,
    classKey,
    rolledStats: stats,
    difficulty: 'normal',
    gender: 'male',
  };
  return new Character(init);
}

/** Empty status block — matches `EMPTY_STATUS` inside combat.ts. */
function emptyStatus() {
  return { poison: 0, burn: 0, stun: 0, bleed: 0, marked: 0, stunImmune: 0 };
}

/** Build a fresh CombatState in player_turn so playerAct can run. */
function freshState(monsterHp: number, playerHp: number, monsterBaseDamage: number): CombatState {
  return {
    phase: 'player_turn',
    monsterHp,
    playerHp,
    playerDefending: false,
    monsterDefending: false,
    playerStatus: emptyStatus(),
    monsterStatus: emptyStatus(),
    playerFirst: true,
    turn: 1,
    log: [],
    bossPhase2: false,
    monsterBaseDamage,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Weapon perks', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Default rand = 0.7 → d(20)=15, d(3)=3, d(100)=71. A clean hit
    // (15 + str-mod ≥ wolf AC 11), no crit at the default threshold,
    // and clear of most status-proc thresholds we don't want firing.
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.7);
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  it('on_hit_heal — Vampiric Dagger heals the player on a successful hit', () => {
    const player = makeChar('human', 'fighter');
    player.weapon = getWeapon('vampiric_dagger'); // perk: on_hit_heal +1
    const monster = getMonster('wolf');

    // Damage the player so the heal is observable (Character starts at full HP).
    const startHp = 5;
    const state = freshState(monster.maxHp, startHp, monster.baseDamage);

    const next = playerAct(state, 'attack', player, monster);

    // The attack landed (rand=0.7 → d20=15, +str-mod 2 = 17 vs AC 11).
    // The heal perk should bump HP by 1.
    expect(next.playerHp).toBe(startHp + 1);
    expect(next.log.some((e) => /gives back/.test(e.text))).toBe(true);
  });

  it('crit_range_bonus: 1 — Stormpiercer crits on a roll of 19', () => {
    const player = makeChar('elf', 'rogue');
    player.weapon = getWeapon('stormpiercer'); // perk: crit_range_bonus +1
    const monster = getMonster('wolf');

    // Force d20 = 19 (rand ∈ [0.9, 0.95) → floor(0.9*20)+1 = 19).
    randomSpy.mockReturnValue(0.9);

    const state = freshState(monster.maxHp, player.hp, monster.baseDamage);
    const next = playerAct(state, 'attack', player, monster);

    // A crit logs the "devastating strike" line (only emitted on isCrit).
    expect(next.log.some((e) => /devastating strike/i.test(e.text))).toBe(true);
    // And the monster took damage at least equal to the non-crit base
    // (the crit branch does not reduce damage).
    expect(next.monsterHp).toBeLessThan(monster.maxHp);
  });

  it("damage_type: 'fire' — triggers the weakness path against a fire-weak monster", () => {
    const player = makeChar('human', 'fighter');
    // Synthetic weapon: a fire-typed sword. The eight shipped weapons
    // cover damage_type only for shadow/radiant — for the spec's
    // canonical fire-on-fire-weak case we wrap an existing weapon.
    const fireBlade: Weapon = {
      ...getWeapon('longsword'),
      perk: { kind: 'damage_type', element: 'fire' },
    };
    player.weapon = fireBlade;
    const monster = getMonster('wolf'); // weakness: 'fire'

    const state = freshState(monster.maxHp, player.hp, monster.baseDamage);
    const next = playerAct(state, 'attack', player, monster);

    // The applyElement helper logs "Weakness exploited." when the
    // attack element matches monster.weakness.
    expect(next.log.some((e) => /Weakness exploited/i.test(e.text))).toBe(true);
  });
});
