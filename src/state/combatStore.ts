import { create } from 'zustand';
import {
  initCombat,
  playerAct,
  enemyAct,
  type CombatAction,
  type CombatState,
} from '../engine/combat';
import { type Monster, getMonster } from '../engine/monster';
import { getItem } from '../engine/items';
import { usePlayerStore } from './playerStore';
import { useInventoryStore } from './inventoryStore';
import { useQuestStore } from './questStore';
import { useAchievementStore } from './achievementStore';
import { useBountyStore } from './bountyStore';
import { rollPerkChoices, getPerkHpBonus, getPerkMpBonus } from '../engine/perks';
import { getHeartPieceHpBonus } from './playerStore';
import { DIFFICULTY_SCALES } from '../engine/character';

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
  /** Items dropped in the last victory — read by CombatOverlay for the results screen. */
  lastLoot: string[];
  /** Dungeon checkpoint — respawn here on death instead of town. */
  dungeonCheckpoint: { sceneKey: string; spawn: string } | null;

  /** Start combat against a monster key. */
  start: (monsterKey: string, returnScene?: string, playerX?: number, playerY?: number) => void;
  /** Player takes an action. If it's then the enemy's turn, auto-acts. */
  act: (action: CombatAction) => void;
  /** Use a consumable item during combat (costs the player's turn). */
  useItem: (itemKey: string) => void;
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
  lastLoot: [],
  dungeonCheckpoint: null,

  start: (monsterKey, returnScene, playerX, playerY) => {
    const character = usePlayerStore.getState().character;
    if (!character) return;
    const monster = getMonster(monsterKey);
    const state = initCombat(character, monster);
    set({ state, monster, _enemyActing: false, returnScene: returnScene ?? null, returnX: playerX ?? 0, returnY: playerY ?? 0 });

    // Track encounter in the bestiary.
    useAchievementStore.getState().recordEncounter(monsterKey);

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

    // Pre-roll loot when victory is decided so the results screen can show it.
    if (next.phase === 'victory') {
      const rolled: string[] = [];
      for (const drop of monster.loot) {
        if (Math.random() < drop.chance) rolled.push(drop.itemKey);
      }
      set({ state: next, lastLoot: rolled });
      return;
    }

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
            const after = enemyAct(s.state, char, s.monster);
            if (after.phase === 'victory') {
              const rolled: string[] = [];
              for (const drop of s.monster.loot) {
                if (Math.random() < drop.chance) rolled.push(drop.itemKey);
              }
              set({ state: after, lastLoot: rolled, _enemyActing: false });
            } else {
              set({ state: after, _enemyActing: false });
            }
          } else { set({ _enemyActing: false }); }
        } else { set({ _enemyActing: false }); }
      }, 600);
    }
  },

  useItem: (itemKey) => {
    const { state, monster, _enemyActing } = get();
    const character = usePlayerStore.getState().character;
    if (!state || !monster || !character) return;
    if (state.phase !== 'player_turn' || _enemyActing) return;

    const inv = useInventoryStore.getState();
    const item = getItem(itemKey);
    if (item.type !== 'consumable' || !item.effect) return;

    // Try to use the item (removes from inventory + applies to character)
    if (!inv.useItem(itemKey)) return;

    // Build updated combat state with log entry
    const s = {
      ...state,
      log: [...state.log],
      playerStatus: { ...state.playerStatus },
      monsterStatus: { ...state.monsterStatus },
    };

    // Sync playerHp from character after item use (useItem calls char.heal)
    const perkHp = getPerkHpBonus(usePlayerStore.getState().perks);
    const heartHp = getHeartPieceHpBonus(usePlayerStore.getState().heartPieces);
    s.playerHp = Math.min(character.derived.maxHp + perkHp + heartHp, character.hp);

    // Atmospheric log messages per item type
    if (item.effect.healHp && item.effect.healMp) {
      s.log.push({ text: `You drink a ${item.name}. +${item.effect.healHp} HP, +${item.effect.healMp} MP.`, type: 'player_hit' });
    } else if (item.effect.healHp) {
      s.log.push({ text: `You drink a ${item.name}. +${item.effect.healHp} HP.`, type: 'player_hit' });
    } else if (item.effect.healMp) {
      s.log.push({ text: `You drink a ${item.name}. +${item.effect.healMp} MP.`, type: 'player_hit' });
    } else {
      s.log.push({ text: `You use ${item.name}.`, type: 'info' });
    }

    // If antidote, also clear poison status
    if (itemKey === 'antidote') {
      s.playerStatus.poison = 0;
      s.log.push({ text: 'The poison fades.', type: 'system' });
    }

    // Using an item costs the turn — transition to enemy turn
    s.phase = 'enemy_turn';
    s.monsterDefending = false;
    set({ state: s });

    // Schedule enemy action
    set({ _enemyActing: true });
    setTimeout(() => {
      const cur = get();
      if (cur._enemyActing && cur.state && cur.monster && cur.state.phase === 'enemy_turn') {
        const char = usePlayerStore.getState().character;
        if (char) {
          const after = enemyAct(cur.state, char, cur.monster);
          if (after.phase === 'victory') {
            const rolled: string[] = [];
            for (const drop of cur.monster.loot) {
              if (Math.random() < drop.chance) rolled.push(drop.itemKey);
            }
            set({ state: after, lastLoot: rolled, _enemyActing: false });
          } else {
            set({ state: after, _enemyActing: false });
          }
        } else { set({ _enemyActing: false }); }
      } else { set({ _enemyActing: false }); }
    }, 600);
  },

  finish: () => {
    const { state, monster } = get();
    const player = usePlayerStore.getState();
    const character = player.character;

    if (state && monster && character) {
      if (state.phase === 'victory') {
        // Difficulty scales gold + XP rewards
        const diff = DIFFICULTY_SCALES[character.difficulty] ?? DIFFICULTY_SCALES.normal;
        character.addGold(Math.round(monster.goldReward * diff.goldGain));
        const levelsGained = character.gainXp(Math.round(monster.xpReward * diff.xpGain));
        if (levelsGained === 0) {
          // No level-up — preserve the combat HP (player may have taken damage).
          character.hp = state.playerHp;
        }
        // If levelsGained > 0, gainXp already set HP/MP to full — don't overwrite.
        if (levelsGained > 0) {
          usePlayerStore.setState({ pendingPerkChoices: rollPerkChoices() });
        }
        player.notify();
        // Add pre-rolled loot (rolled when victory phase was first set).
        const inv = useInventoryStore.getState();
        for (const itemKey of get().lastLoot) {
          inv.addItem(itemKey);
        }
        // Mark the enemy as killed so it doesn't respawn.
        const enemyId = get()._pendingEnemyId;
        if (enemyId) get().killedEnemies.add(enemyId);

        // Check kill-based quest objectives with progress messages.
        const killed = get().killedEnemies;
        const qs = useQuestStore.getState();
        const msg = (text: string) =>
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: text }));

        // Helper: track kills and show progress / completion.
        const checkKillQuest = (
          monsterMatch: string, questId: string, objectiveId: string,
          needed: number, questLabel: string,
        ) => {
          const q = qs.active[questId];
          if (!q || q.isComplete) return;
          const count = Array.from(killed).filter((id) => id.includes(monsterMatch)).length;
          if (count >= needed) {
            qs.completeObjective(questId, objectiveId);
            msg(`${questLabel} — complete.`);
          } else {
            msg(`${questLabel}: ${count}/${needed}`);
          }
        };

        if (monster.key === 'wolf') checkKillQuest('wolf', 'wolf-cull', 'kill-wolves', 3, 'Wolf Cull');
        if (monster.key === 'skeleton') checkKillQuest('skeleton', 'bone-collector', 'collect-bones', 2, 'Bone Collector');
        if (monster.key === 'spider') checkKillQuest('spider', 'spider-nest', 'kill-spiders', 3, 'Spider Nest');
        if (monster.key === 'wraith') checkKillQuest('wraith', 'wraith-hunt', 'kill-wraiths', 2, 'Wraith Hunt');

        // Hollow King slayer: kill the boss.
        if (monster.key === 'hollow_king') {
          qs.completeObjective('hollow-king-slayer', 'kill-hollow-king');
          msg('The Hollow Crown shatters. The curse lifts.');
        }

        // Drowned Warden slayer: kill the bog boss.
        if (monster.key === 'drowned_warden') {
          qs.completeObjective('warden-slayer', 'kill-drowned-warden');
          msg('The Warden sinks. The water stills.');
        }

        // The Crownless One: final boss.
        if (monster.key === 'crownless_one') {
          qs.completeObjective('the-crownless-one', 'defeat-crownless-one');
          msg('The Crownless One falls. The throne is empty. It always was.');
          localStorage.setItem('hc_game_complete', '1');
          window.dispatchEvent(new CustomEvent('gameEnding'));
        }

        // Bounty kill tracking.
        useBountyStore.getState().recordKill(monster.key);

        // Achievement tracking.
        const achStore = useAchievementStore.getState();
        achStore.recordKill(monster.key);
        const bossKeys = ['hollow_king', 'hollow_knight', 'drowned_warden', 'crownless_one'];
        if (bossKeys.includes(monster.key)) {
          achStore.recordBossKill(monster.key);
        }
      } else if (state.phase === 'defeat') {
        useAchievementStore.getState().recordDeath();
        if (character.difficulty === 'hardcore') {
          character.hp = 0;
          player.notify();
        } else {
          // Normal: lose 10% gold, respawn at town with FULL HP.
          const lost = Math.floor(character.gold * 0.1);
          character.loseGold(lost);
          const perkHpR = getPerkHpBonus(usePlayerStore.getState().perks);
          const perkMpR = getPerkMpBonus(usePlayerStore.getState().perks);
          const heartHpR = getHeartPieceHpBonus(usePlayerStore.getState().heartPieces);
          character.hp = character.derived.maxHp + perkHpR + heartHpR;
          character.mp = character.derived.maxMp + perkMpR;
          player.notify();
        }
        // Enemy NOT marked as killed — it survives if player dies.
        // Always respawn at town on death (classic Zelda style).
        set({ returnScene: 'TownScene', returnX: 0, returnY: 0, dungeonCheckpoint: null });
      } else if (state.phase === 'fled') {
        character.hp = state.playerHp;
        player.notify();
        // Enemy NOT killed — it survives if player flees.
      }
    }

    set((s) => ({ state: null, monster: null, _enemyActing: false, killedEnemies: s.killedEnemies, _pendingEnemyId: '', lastLoot: [] }));
  },
}));
