import { describe, it, expect } from 'vitest';
import { initCombat, playerAct, enemyAct, type CombatState } from '../combat';
import { Character, type CharacterInit } from '../character';
import { getMonster, type Monster } from '../monster';
import type { StatBlock } from '../stats';
import type { RaceKey } from '../race';
import type { ClassKey } from '../classes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a Character with sensible defaults for a given race/class combo. */
function makeChar(raceKey: RaceKey, classKey: ClassKey, name = 'TestHero'): Character {
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

const MAX_TURNS = 100;

/**
 * Simulate a full fight: alternate playerAct (always 'attack') and enemyAct
 * until a terminal state or MAX_TURNS is reached.
 * Returns the final state and the number of turns taken.
 */
function simulateFight(
  player: Character,
  monster: Monster,
  playerAction: 'attack' | 'skill' = 'attack',
): { state: CombatState; turns: number } {
  let state = initCombat(player, monster);
  let turns = 0;

  while (turns < MAX_TURNS) {
    if (state.phase === 'victory' || state.phase === 'defeat' || state.phase === 'fled') {
      break;
    }

    if (state.phase === 'player_turn') {
      const next = playerAct(state, playerAction, player, monster);
      // Guard: playerAct must not return the same reference during player_turn
      // (it should always produce a new state object).
      expect(next).not.toBe(state);
      state = next;
    } else if (state.phase === 'enemy_turn') {
      const next = enemyAct(state, player, monster);
      expect(next).not.toBe(state);
      state = next;
    } else {
      // 'start' phase should never appear after initCombat
      throw new Error(`Unexpected phase: ${state.phase}`);
    }

    turns++;
  }

  return { state, turns };
}

// ---------------------------------------------------------------------------
// Test: 10 simulated fights across race/class combos
// ---------------------------------------------------------------------------

const FIGHT_CONFIGS: Array<{ race: RaceKey; class: ClassKey; monster: string }> = [
  { race: 'human',      class: 'fighter', monster: 'wolf' },
  { race: 'elf',        class: 'wizard',  monster: 'wolf' },
  { race: 'dwarf',      class: 'cleric',  monster: 'skeleton' },
  { race: 'halfling',   class: 'rogue',   monster: 'wolf' },
  { race: 'orc',        class: 'fighter', monster: 'skeleton' },
  { race: 'tiefling',   class: 'wizard',  monster: 'hollow_knight' },
  { race: 'dragonborn', class: 'ranger',  monster: 'wolf' },
  { race: 'gnome',      class: 'bard',    monster: 'skeleton' },
  { race: 'half-elf',   class: 'cleric',  monster: 'hollow_knight' },
  { race: 'tabaxi',     class: 'rogue',   monster: 'skeleton' },
];

describe('Combat state machine', () => {
  describe('initCombat', () => {
    it('produces a valid initial state', () => {
      const player = makeChar('human', 'fighter');
      const monster = getMonster('wolf');
      const state = initCombat(player, monster);

      expect(state.phase === 'player_turn' || state.phase === 'enemy_turn').toBe(true);
      expect(state.monsterHp).toBe(monster.maxHp);
      expect(state.playerHp).toBe(player.hp);
      expect(state.turn).toBe(1);
      expect(state.log.length).toBeGreaterThan(0);
      expect(Number.isFinite(state.monsterHp)).toBe(true);
      expect(Number.isFinite(state.playerHp)).toBe(true);
    });
  });

  describe('playerAct guards', () => {
    it('returns same state reference when called during enemy_turn', () => {
      const player = makeChar('human', 'fighter');
      const monster = getMonster('wolf');
      let state = initCombat(player, monster);

      // Force enemy turn
      state = { ...state, phase: 'enemy_turn' };
      const result = playerAct(state, 'attack', player, monster);
      expect(result).toBe(state); // same reference = no-op
    });

    it('returns same state reference when called during victory', () => {
      const player = makeChar('human', 'fighter');
      const monster = getMonster('wolf');
      let state = initCombat(player, monster);
      state = { ...state, phase: 'victory' };
      const result = playerAct(state, 'attack', player, monster);
      expect(result).toBe(state);
    });
  });

  describe('enemyAct guards', () => {
    it('returns same state reference when called during player_turn', () => {
      const player = makeChar('human', 'fighter');
      const monster = getMonster('wolf');
      let state = initCombat(player, monster);
      state = { ...state, phase: 'player_turn' };
      const result = enemyAct(state, player, monster);
      expect(result).toBe(state);
    });
  });

  describe('skill with insufficient MP returns player_turn (not enemy_turn)', () => {
    it('does not waste turn on insufficient MP', () => {
      const player = makeChar('elf', 'wizard');
      const monster = getMonster('wolf');
      // Drain all MP
      player.mp = 0;
      let state = initCombat(player, monster);
      // Force player turn
      state = { ...state, phase: 'player_turn' };
      const result = playerAct(state, 'skill', player, monster);
      // Should stay on player_turn, not advance to enemy_turn
      expect(result.phase).toBe('player_turn');
    });
  });

  describe('10 simulated fights complete without infinite loops', () => {
    FIGHT_CONFIGS.forEach(({ race, class: cls, monster: monsterKey }, i) => {
      it(`Fight ${i + 1}: ${race} ${cls} vs ${monsterKey} reaches terminal state within ${MAX_TURNS} turns`, () => {
        const player = makeChar(race, cls);
        const monster = getMonster(monsterKey);
        const { state, turns } = simulateFight(player, monster);

        // Must reach a terminal state
        const terminal = ['victory', 'defeat', 'fled'];
        expect(terminal).toContain(state.phase);

        // Must complete within turn limit
        expect(turns).toBeLessThan(MAX_TURNS);

        // HP values must be valid numbers, never NaN
        expect(Number.isNaN(state.playerHp)).toBe(false);
        expect(Number.isNaN(state.monsterHp)).toBe(false);

        // HP must never be negative
        expect(state.playerHp).toBeGreaterThanOrEqual(0);
        expect(state.monsterHp).toBeGreaterThanOrEqual(0);

        // HP must be integers (damage system uses Math.max/Math.floor)
        expect(Number.isInteger(state.playerHp)).toBe(true);
        expect(Number.isInteger(state.monsterHp)).toBe(true);

        // Verify terminal conditions are consistent
        if (state.phase === 'victory') {
          expect(state.monsterHp).toBe(0);
        }
        if (state.phase === 'defeat') {
          expect(state.playerHp).toBe(0);
        }
      });
    });
  });

  describe('flee action', () => {
    it('eventually succeeds or fails without getting stuck', () => {
      const player = makeChar('halfling', 'rogue');
      const monster = getMonster('wolf');
      let state = initCombat(player, monster);
      let attempts = 0;

      while (attempts < 50) {
        if (state.phase === 'player_turn') {
          state = playerAct(state, 'flee', player, monster);
          if (state.phase === 'fled') break;
        }
        if (state.phase === 'enemy_turn') {
          state = enemyAct(state, player, monster);
        }
        if (state.phase === 'defeat') break;
        attempts++;
      }

      const terminal = ['fled', 'defeat'];
      expect(terminal).toContain(state.phase);
    });
  });

  describe('defend action', () => {
    it('sets playerDefending flag and advances to enemy_turn', () => {
      const player = makeChar('dwarf', 'fighter');
      const monster = getMonster('wolf');
      let state = initCombat(player, monster);
      state = { ...state, phase: 'player_turn' };
      const result = playerAct(state, 'defend', player, monster);
      expect(result.playerDefending).toBe(true);
      expect(result.phase === 'enemy_turn' || result.phase === 'victory').toBe(true);
    });
  });

  describe('HP invariants hold across many fights', () => {
    it('playerHp never exceeds maxHp and monsterHp never exceeds maxHp', () => {
      for (const cfg of FIGHT_CONFIGS) {
        const player = makeChar(cfg.race, cfg.class);
        const monster = getMonster(cfg.monster);
        let state = initCombat(player, monster);

        for (let turn = 0; turn < MAX_TURNS; turn++) {
          expect(state.playerHp).toBeLessThanOrEqual(player.derived.maxHp);
          expect(state.monsterHp).toBeLessThanOrEqual(monster.maxHp);
          expect(state.playerHp).toBeGreaterThanOrEqual(0);
          expect(state.monsterHp).toBeGreaterThanOrEqual(0);

          if (state.phase === 'victory' || state.phase === 'defeat' || state.phase === 'fled') break;
          if (state.phase === 'player_turn') {
            state = playerAct(state, 'attack', player, monster);
          } else if (state.phase === 'enemy_turn') {
            state = enemyAct(state, player, monster);
          }
        }
      }
    });
  });

  describe('turn counter increments correctly', () => {
    it('turn increments by 1 each full round', () => {
      const player = makeChar('human', 'fighter');
      const monster = getMonster('wolf');
      let state = initCombat(player, monster);
      const initialTurn = state.turn;

      // Play one full round (player + enemy)
      if (state.phase === 'player_turn') {
        state = playerAct(state, 'attack', player, monster);
        if (state.phase === 'enemy_turn') {
          state = enemyAct(state, player, monster);
          // After a full round, turn should have incremented
          expect(state.turn).toBe(initialTurn + 1);
        }
      } else if (state.phase === 'enemy_turn') {
        state = enemyAct(state, player, monster);
        if (state.phase === 'player_turn') {
          // Turn already incremented by enemyAct
          expect(state.turn).toBe(initialTurn + 1);
        }
      }
    });
  });
});
