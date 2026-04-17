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
import { useInventoryStore } from './inventoryStore';
import { useQuestStore } from './questStore';

/**
 * Combat store — manages the active battle. Null when not in combat.
 * The world scene sets this up when the player touches an enemy;
 * the CombatOverlay reads it for UI; actions flow through here.
 */
interface CombatStoreState {
  state: CombatState | null;
  monster: Monster | null;
  _enemyActing: boolean;
  /** Which Phaser scene to return to after combat. */
  returnScene: string | null;
  /** Player's position before combat — restore after. */
  returnX: number;
  returnY: number;
  /** Enemies killed this session (sceneKey-x-y). Persists across scene restarts. */
  killedEnemies: Set<string>;
  /** ID of the enemy currently being fought — marked killed only on victory. */
  _pendingEnemyId: string;

  /** Start combat against a monster key. */
  start: (monsterKey: string, returnScene?: string, playerX?: number, playerY?: number) => void;
  /** Player takes an action. If it's then the enemy's turn, auto-acts. */
  act: (action: CombatAction) => void;
  /** End combat — apply rewards or penalties and clean up. */
  finish: () => void;
}

export const useCombatStore = create<CombatStoreState>((set, get) => ({
  state: null,
  monster: null,
  _enemyActing: false,
  returnScene: null,
  returnX: 0,
  returnY: 0,
  killedEnemies: new Set<string>(),
  _pendingEnemyId: '',

  start: (monsterKey, returnScene, playerX, playerY) => {
    const character = usePlayerStore.getState().character;
    if (!character) return;
    const monster = getMonster(monsterKey);
    const state = initCombat(character, monster);
    set({ state, monster, returnScene: returnScene ?? null, returnX: playerX ?? 0, returnY: playerY ?? 0 });

    // If enemy goes first, auto-act after a brief pause.
    if (state.phase === 'enemy_turn') {
      set({ _enemyActing: true });
      setTimeout(() => {
        const s = get();
        if (s._enemyActing && s.state && s.monster && s.state.phase === 'enemy_turn') {
          const character2 = usePlayerStore.getState().character;
          if (character2) {
            set({ state: enemyAct(s.state, character2, s.monster), _enemyActing: false });
          } else { set({ _enemyActing: false }); }
        } else { set({ _enemyActing: false }); }
      }, 800);
    }
  },

  act: (action) => {
    const { state, monster, _enemyActing } = get();
    const character = usePlayerStore.getState().character;
    if (!state || !monster || !character) return;
    // Only allow actions during player's turn, and not while enemy is processing.
    if (state.phase !== 'player_turn' || _enemyActing) return;

    // Player acts.
    const next = playerAct(state, action, character, monster);

    // Guard: if playerAct returned the exact same object, the action was
    // a no-op (wrong phase). Do NOT re-set state or schedule enemy turn.
    if (next === state) return;

    set({ state: next });

    // If combat continues and it's the enemy's turn, auto-act after delay.
    // Set _enemyActing BEFORE the timeout to block further player actions.
    if (next.phase === 'enemy_turn') {
      set({ _enemyActing: true });
      setTimeout(() => {
        const s = get();
        // Double-check: only act if still in enemy_turn and flag is still set.
        if (s._enemyActing && s.state && s.monster && s.state.phase === 'enemy_turn') {
          const char = usePlayerStore.getState().character;
          if (char) {
            set({ state: enemyAct(s.state, char, s.monster), _enemyActing: false });
          } else { set({ _enemyActing: false }); }
        } else { set({ _enemyActing: false }); }
      }, 600);
    }
  },

  finish: () => {
    const { state, monster } = get();
    const player = usePlayerStore.getState();
    const character = player.character;

    if (state && monster && character) {
      if (state.phase === 'victory') {
        character.addGold(monster.goldReward);
        character.gainXp(monster.xpReward);
        character.hp = state.playerHp;
        player.notify();
        // Drop loot
        const inv = useInventoryStore.getState();
        for (const drop of monster.loot) {
          if (Math.random() < drop.chance) {
            inv.addItem(drop.itemKey);
          }
        }
        // Mark the enemy as killed so it doesn't respawn.
        const enemyId = get()._pendingEnemyId;
        if (enemyId) get().killedEnemies.add(enemyId);

        // Check kill-based quest objectives.
        const killed = get().killedEnemies;
        const questStore = useQuestStore.getState();
        // Wolf cull: need 3 wolves killed.
        const wolfKills = Array.from(killed).filter((id) => id.includes('wolf')).length;
        if (wolfKills >= 3) questStore.completeObjective('wolf-cull', 'kill-wolves');
        // Bone collector: need 2 skeletons killed.
        const skelKills = Array.from(killed).filter((id) => id.includes('skeleton')).length;
        if (skelKills >= 2) questStore.completeObjective('bone-collector', 'collect-bones');
      } else if (state.phase === 'defeat') {
        if (character.difficulty === 'hardcore') {
          character.hp = 0;
          player.notify();
        } else {
          // Normal: lose 10% gold, respawn at town with FULL HP.
          const lost = Math.floor(character.gold * 0.1);
          character.loseGold(lost);
          character.hp = character.derived.maxHp;
          character.mp = character.derived.maxMp;
          player.notify();
        }
        // Enemy NOT marked as killed — it survives if player dies.
        // Override return to send player to town instead of battle site.
        set({ returnScene: 'TownScene', returnX: 0, returnY: 0 });
      } else if (state.phase === 'fled') {
        character.hp = state.playerHp;
        player.notify();
        // Enemy NOT killed — it survives if player flees.
      }
    }

    set((s) => ({ state: null, monster: null, _enemyActing: false, killedEnemies: s.killedEnemies, _pendingEnemyId: '' }));
  },
}));
