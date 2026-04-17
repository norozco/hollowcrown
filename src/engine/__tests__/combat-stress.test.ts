/**
 * Combat stress test — 10 races x 6 classes x 2 monsters = 120 fights.
 * Every fight loops playerAct('attack') + enemyAct until terminal.
 * Asserts: terminates within 200 turns, no NaN, no negative HP,
 * phase always reaches victory or defeat.
 */
import { describe, it, expect } from 'vitest';
import { ALL_RACES, type RaceKey } from '../race';
import { ALL_CLASSES, type ClassKey } from '../classes';
import { Character, type CharacterInit } from '../character';
import { getMonster } from '../monster';
import { initCombat, playerAct, enemyAct, type CombatState } from '../combat';

const MAX_TURNS = 200;

/** Build a level-1 character with balanced stats for the given race/class. */
function makeCharacter(raceKey: RaceKey, classKey: ClassKey): Character {
  const init: CharacterInit = {
    name: 'Tester',
    raceKey,
    classKey,
    rolledStats: { str: 14, dex: 14, con: 14, int: 14, wis: 14, cha: 14 },
    difficulty: 'normal',
    gender: 'male',
  };
  return new Character(init);
}

/** Run a full fight: alternate attack/enemy until terminal. Returns final state. */
function runFight(char: Character, monsterKey: string): CombatState {
  const monster = getMonster(monsterKey);
  let state = initCombat(char, monster);

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    // Validate invariants every iteration.
    expect(state.playerHp).not.toBeNaN();
    expect(state.monsterHp).not.toBeNaN();
    expect(state.playerHp).toBeGreaterThanOrEqual(0);
    expect(state.monsterHp).toBeGreaterThanOrEqual(0);

    if (state.phase === 'victory' || state.phase === 'defeat' || state.phase === 'fled') {
      return state;
    }

    if (state.phase === 'player_turn') {
      state = playerAct(state, 'attack', char, monster);
    } else if (state.phase === 'enemy_turn') {
      state = enemyAct(state, char, monster);
    } else {
      // Should never get stuck in 'start' phase.
      throw new Error(`Unexpected phase: ${state.phase} at turn ${turn}`);
    }
  }

  // If we got here, the fight did not terminate.
  throw new Error(
    `Fight did not terminate within ${MAX_TURNS} turns. ` +
    `Phase: ${state.phase}, playerHp: ${state.playerHp}, monsterHp: ${state.monsterHp}`,
  );
}

describe('Combat stress test — 120 fights (10 races x 6 classes x 2 monsters)', () => {
  const monsterKeys = ['wolf', 'skeleton'] as const;

  for (const race of ALL_RACES) {
    for (const cls of ALL_CLASSES) {
      for (const monsterKey of monsterKeys) {
        it(`${race.key} ${cls.key} vs ${monsterKey}`, () => {
          const char = makeCharacter(race.key as RaceKey, cls.key as ClassKey);
          const result = runFight(char, monsterKey);

          // Must reach a terminal phase.
          expect(['victory', 'defeat', 'fled']).toContain(result.phase);

          // Final HP values are valid.
          expect(result.playerHp).not.toBeNaN();
          expect(result.monsterHp).not.toBeNaN();
          expect(result.playerHp).toBeGreaterThanOrEqual(0);
          expect(result.monsterHp).toBeGreaterThanOrEqual(0);

          // Turn count is reasonable.
          expect(result.turn).toBeGreaterThanOrEqual(1);
          expect(result.turn).toBeLessThanOrEqual(MAX_TURNS);

          // Log should have entries.
          expect(result.log.length).toBeGreaterThan(0);
        });
      }
    }
  }
});
