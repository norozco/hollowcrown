import { create } from 'zustand';
import {
  initCombat,
  playerAct,
  enemyAct,
  type CombatAction,
  type CombatState,
} from '../engine/combat';
import { type Monster, getMonster } from '../engine/monster';
import { usePlayerStore } from './playerStore';

/**
 * Combat store — manages the active battle. Null when not in combat.
 * The world scene sets this up when the player touches an enemy;
 * the CombatOverlay reads it for UI; actions flow through here.
 */
interface CombatStoreState {
  state: CombatState | null;
  monster: Monster | null;

  /** Start combat against a monster key. */
  start: (monsterKey: string) => void;
  /** Player takes an action. If it's then the enemy's turn, auto-acts. */
  act: (action: CombatAction) => void;
  /** End combat — apply rewards or penalties and clean up. */
  finish: () => void;
}

export const useCombatStore = create<CombatStoreState>((set, get) => ({
  state: null,
  monster: null,

  start: (monsterKey) => {
    const character = usePlayerStore.getState().character;
    if (!character) return;
    const monster = getMonster(monsterKey);
    const state = initCombat(character, monster);
    set({ state, monster });

    // If enemy goes first, auto-act after a brief pause.
    if (state.phase === 'enemy_turn') {
      setTimeout(() => {
        const s = get();
        if (s.state && s.monster && s.state.phase === 'enemy_turn') {
          const character2 = usePlayerStore.getState().character;
          if (character2) {
            set({ state: enemyAct(s.state, character2, s.monster) });
          }
        }
      }, 800);
    }
  },

  act: (action) => {
    const { state, monster } = get();
    const character = usePlayerStore.getState().character;
    if (!state || !monster || !character) return;

    // Player acts.
    let next = playerAct(state, action, character, monster);
    set({ state: next });

    // If combat continues and it's the enemy's turn, auto-act after delay.
    if (next.phase === 'enemy_turn') {
      setTimeout(() => {
        const s = get();
        if (s.state && s.monster && s.state.phase === 'enemy_turn') {
          const char = usePlayerStore.getState().character;
          if (char) {
            set({ state: enemyAct(s.state, char, s.monster) });
          }
        }
      }, 600);
    }
  },

  finish: () => {
    const { state, monster } = get();
    const player = usePlayerStore.getState();
    const character = player.character;

    if (state && monster && character) {
      if (state.phase === 'victory') {
        // Apply rewards.
        character.addGold(monster.goldReward);
        character.gainXp(monster.xpReward);
        // Restore HP to combat result (could be damaged).
        character.hp = state.playerHp;
        player.notify();
      } else if (state.phase === 'defeat') {
        if (character.difficulty === 'hardcore') {
          // Hardcore: permanent death.
          character.hp = 0;
          player.notify();
        } else {
          // Normal: lose 10% gold, respawn with 1 HP.
          const lost = Math.floor(character.gold * 0.1);
          character.loseGold(lost);
          character.hp = 1;
          player.notify();
        }
      } else if (state.phase === 'fled') {
        // Fled: keep current HP (from before combat).
        character.hp = state.playerHp;
        player.notify();
      }
    }

    set({ state: null, monster: null });
  },
}));
