import { create } from 'zustand';
import {
  initCombat,
  playerAct,
  enemyAct,
  getSkillByKey,
  cycleTargetIndex,
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
import { Sfx } from '../engine/audio';

/** A transient combat event used by the UI to render floating numbers, flashes, etc. */
export type CombatEventKind = 'damage' | 'heal' | 'miss' | 'crit' | 'skill';
export interface CombatEvent {
  id: number;
  kind: CombatEventKind;
  target: 'player' | 'enemy';
  amount: number;       // 0 for miss
  crit: boolean;
  /** ms timestamp so the UI can prune */
  at: number;
  /** Skill key — only set when kind === 'skill'. Drives per-skill
   *  visual signatures in CombatScene (camera flash color, particle,
   *  shake) and the React layer (colored slash overlay). */
  skillKey?: string;
}

let _eventSeq = 0;

/**
 * Diff two CombatState snapshots and emit juice events (damage/heal/miss/crit).
 * Also plays the right SFX per event so combat reads as impactful.
 */
function emitEventsFromDiff(
  prev: CombatState,
  next: CombatState,
  pushEvent: (e: Omit<CombatEvent, 'id' | 'at'>) => void,
): void {
  // New log entries added this tick
  const newEntries = next.log.slice(prev.log.length);

  // HP deltas
  const playerDelta = next.playerHp - prev.playerHp;
  const monsterDelta = next.monsterHp - prev.monsterHp;

  // Crit detection: engine logs "devastating" on roll===20
  const critOnMonster = newEntries.some(
    (e) => e.type === 'player_hit' && /devastating/i.test(e.text),
  );
  const critOnPlayer = newEntries.some(
    (e) => e.type === 'enemy_hit' && /devastating|critical/i.test(e.text),
  );

  // NOTE: SFX for hits/misses/spells are fired from CombatScene.ts alongside
  // their animations. Firing them here too caused double-triggers (audible
  // as a buzzing/interference during fights). We keep only the event push
  // here — audio is owned by CombatScene. Dedup in audio.ts is a second line
  // of defense if anything slips through.
  if (monsterDelta < 0) {
    const amt = -monsterDelta;
    pushEvent({ kind: critOnMonster ? 'crit' : 'damage', target: 'enemy', amount: amt, crit: critOnMonster });
  }
  if (playerDelta < 0) {
    const amt = -playerDelta;
    pushEvent({ kind: critOnPlayer ? 'crit' : 'damage', target: 'player', amount: amt, crit: critOnPlayer });
  } else if (playerDelta > 0) {
    pushEvent({ kind: 'heal', target: 'player', amount: playerDelta, crit: false });
  }

  // Miss events (no HP change but a miss line was added)
  for (const entry of newEntries) {
    if (entry.type === 'player_miss') {
      pushEvent({ kind: 'miss', target: 'enemy', amount: 0, crit: false });
    } else if (entry.type === 'enemy_miss') {
      pushEvent({ kind: 'miss', target: 'player', amount: 0, crit: false });
    }
  }

  // Skill cast — fired once when the engine flips lastSkillKey on a
  // tick. Drives the per-skill visual signature in CombatScene (color
  // flash, particle, shake) and the React layer (colored slash). The
  // `target` reflects who the skill focuses on per the skill's
  // visual.target — buffs/heals point at the player; attacks at the
  // enemy. We resolve the skill's authored target via getSkillByKey
  // so this stays consistent with the skill's visual block.
  if (next.lastSkillKey && next.lastSkillKey !== prev.lastSkillKey) {
    const skill = getSkillByKey(next.lastSkillKey);
    const tgt: 'player' | 'enemy' =
      skill?.visual.target === 'player' ? 'player' : 'enemy';
    pushEvent({
      kind: 'skill',
      target: tgt,
      amount: 0,
      crit: false,
      skillKey: next.lastSkillKey,
    });
  }

  // Victory / defeat / flee stingers — CombatScene also fires these on
  // their log entry; dedup window in audio.ts collapses the near-simultaneous
  // pair to one sound.
  if (prev.phase !== 'victory' && next.phase === 'victory') Sfx.enemyDefeat();
  if (prev.phase !== 'defeat' && next.phase === 'defeat') Sfx.playerDeath();
  if (prev.phase !== 'fled' && next.phase === 'fled') Sfx.flee();
}

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
  /** Persistent per-monster kill counter used for quest progress. Unlike
   *  `killedEnemies` (cleared on zone exit so enemies respawn), this
   *  counter accumulates across the whole save and is never reset, so
   *  kill-objective quests progress even if the player leaves and re-
   *  enters the zone between kills. */
  questKillCounts: Record<string, number>;
  /** ID of the enemy currently being fought — marked killed only on victory. */
  _pendingEnemyId: string;
  /** Items dropped in the last victory — read by CombatOverlay for the results screen. */
  lastLoot: string[];
  /** Dungeon checkpoint — respawn here on death instead of town. */
  dungeonCheckpoint: { sceneKey: string; spawn: string } | null;
  /** Transient UI events for juice (floating numbers, flashes, shake). */
  combatEvents: CombatEvent[];
  /** Push a new event (UI appends, self-prunes after animation). */
  pushEvent: (e: Omit<CombatEvent, 'id' | 'at'>) => void;
  /** Remove a consumed event by id. */
  clearEvent: (id: number) => void;

  /** Start combat against a monster key. Optional `extraMonsterKeys`
   *  populates "adds" — additional enemies that fight alongside the
   *  primary. Empty array (or omitted) = vanilla 1v1. */
  start: (
    monsterKey: string,
    returnScene?: string,
    playerX?: number,
    playerY?: number,
    extraMonsterKeys?: string[],
  ) => void;
  /** Player takes an action. For 'skill', pass the stable skill key
   *  (e.g. 'fireball', 'sneak_attack'). If omitted, the class signature
   *  (first skill) is used — preserves the test calls that just pass
   *  `act('skill')`. */
  act: (action: CombatAction, skillKey?: string) => void;
  /** Use a consumable item during combat (costs the player's turn). */
  useItem: (itemKey: string) => void;
  /** Cycle the player's selected target. +1 = next alive enemy
   *  clockwise (Tab), -1 = previous (Shift+Tab). No-op in 1v1
   *  fights or when only one enemy is alive. Doesn't end the
   *  turn — purely a selection shift. */
  cycleTarget: (direction: 1 | -1) => void;
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
  questKillCounts: {},
  _pendingEnemyId: '',
  lastLoot: [],
  dungeonCheckpoint: null,
  combatEvents: [],

  pushEvent: (e) => {
    const ev: CombatEvent = { ...e, id: ++_eventSeq, at: Date.now() };
    set((s) => ({ combatEvents: [...s.combatEvents, ev] }));
  },
  clearEvent: (id) => {
    set((s) => ({ combatEvents: s.combatEvents.filter((e) => e.id !== id) }));
  },

  start: (monsterKey, returnScene, playerX, playerY, extraMonsterKeys) => {
    const character = usePlayerStore.getState().character;
    if (!character) return;
    const monster = getMonster(monsterKey);
    const extras = (extraMonsterKeys ?? []).map((k) => getMonster(k));
    const state = initCombat(character, monster, extras);
    set({ state, monster, _enemyActing: false, returnScene: returnScene ?? null, returnX: playerX ?? 0, returnY: playerY ?? 0 });

    // Track encounter in the bestiary — primary + each extra type.
    useAchievementStore.getState().recordEncounter(monsterKey);
    for (const ek of extraMonsterKeys ?? []) {
      useAchievementStore.getState().recordEncounter(ek);
    }

    // If enemy goes first, auto-act after a brief pause.
    if (state.phase === 'enemy_turn') {
      set({ _enemyActing: true });
      setTimeout(() => {
        const s = get();
        if (s._enemyActing && s.state && s.monster && s.state.phase === 'enemy_turn') {
          const character2 = usePlayerStore.getState().character;
          if (character2) {
            const after = enemyAct(s.state, character2, s.monster);
            emitEventsFromDiff(s.state, after, get().pushEvent);
            set({ state: after, _enemyActing: false });
          } else { set({ _enemyActing: false }); }
        } else { set({ _enemyActing: false }); }
      }, 800);
    }
  },

  act: (action, skillKey) => {
    const { state, monster, _enemyActing } = get();
    const character = usePlayerStore.getState().character;
    if (!state || !monster || !character) return;
    // Only allow actions during player's turn, and not while enemy is processing.
    if (state.phase !== 'player_turn' || _enemyActing) return;

    // Player acts.
    const next = playerAct(state, action, character, monster, skillKey);

    // Guard: if playerAct returned the exact same object, the action was
    // a no-op (wrong phase). Do NOT re-set state or schedule enemy turn.
    if (next === state) return;

    // Emit juice events from the diff (floating nums, SFX, flash).
    emitEventsFromDiff(state, next, get().pushEvent);

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
            emitEventsFromDiff(s.state, after, get().pushEvent);
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

  cycleTarget: (direction) => {
    const cur = get().state;
    if (!cur) return;
    const next = cycleTargetIndex(cur, direction);
    if (next === cur.targetIndex) return; // no-op (single enemy alive)
    set({ state: { ...cur, targetIndex: next } });
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
    const hpBefore = state.playerHp;
    s.playerHp = Math.min(character.derived.maxHp + perkHp + heartHp, character.hp);
    const healed = s.playerHp - hpBefore;
    if (healed > 0) {
      get().pushEvent({ kind: 'heal', target: 'player', amount: healed, crit: false });
      Sfx.spellHeal();
    }

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
          emitEventsFromDiff(cur.state, after, get().pushEvent);
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
      // Training dummy: safe practice combat — no rewards, no death penalty,
      // fully restores HP/MP after, and never marked as killed.
      if (monster.key === 'training_dummy') {
        const perkHpR = getPerkHpBonus(usePlayerStore.getState().perks);
        const perkMpR = getPerkMpBonus(usePlayerStore.getState().perks);
        const heartHpR = getHeartPieceHpBonus(usePlayerStore.getState().heartPieces);
        character.hp = character.derived.maxHp + perkHpR + heartHpR;
        character.mp = character.derived.maxMp + perkMpR;
        player.notify();
        window.dispatchEvent(new CustomEvent('gameMessage', {
          detail: state.phase === 'victory'
            ? 'Training complete. You feel sharper. HP and MP restored.'
            : 'The session ends. HP and MP restored.',
        }));
        set((s) => ({ state: null, monster: null, _enemyActing: false, killedEnemies: s.killedEnemies, _pendingEnemyId: '', lastLoot: [], combatEvents: [] }));
        return;
      }

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

        // Increment the persistent per-monster quest kill counter. Counts
        // every enemy that died this fight — primary plus any extras —
        // so wolf-pack encounters credit each wolf toward a wolf-cull
        // quest. Survives zone exits (which clear `killedEnemies` so
        // enemies can respawn) since this is keyed by monster key.
        const prevCounts = get().questKillCounts;
        const newCounts: Record<string, number> = { ...prevCounts };
        newCounts[monster.key] = (newCounts[monster.key] ?? 0) + 1;
        for (const extra of state.extraEnemies ?? []) {
          if (!extra.alive) {
            newCounts[extra.monster.key] = (newCounts[extra.monster.key] ?? 0) + 1;
          }
        }
        set({ questKillCounts: newCounts });

        // Check kill-based quest objectives with progress messages.
        const qs = useQuestStore.getState();
        const msg = (text: string) =>
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: text }));

        // Helper: use the persistent counter (not the respawn-tracking set)
        // so quest kills accumulate across zone entries. Accepts an array
        // of monster keys so species variants can count toward one quest.
        const checkKillQuest = (
          monsterKeys: readonly string[], questId: string, objectiveId: string,
          needed: number, questLabel: string,
        ) => {
          const q = qs.active[questId];
          if (!q || q.isComplete) return;
          const count = monsterKeys.reduce(
            (sum, k) => sum + (newCounts[k] ?? 0), 0,
          );
          if (count >= needed) {
            qs.completeObjective(questId, objectiveId);
            msg(`${questLabel} — complete.`);
          } else {
            msg(`${questLabel}: ${count}/${needed}`);
          }
        };

        if (monster.key === 'wolf') checkKillQuest(['wolf'], 'wolf-cull', 'kill-wolves', 3, 'Wolf Cull');
        if (monster.key === 'skeleton') checkKillQuest(['skeleton'], 'bone-collector', 'collect-bones', 2, 'Bone Collector');
        if (monster.key === 'spider') checkKillQuest(['spider'], 'spider-nest', 'kill-spiders', 3, 'Spider Nest');
        if (monster.key === 'wraith') checkKillQuest(['wraith'], 'wraith-hunt', 'kill-wraiths', 2, 'Wraith Hunt');

        // Hollow King slayer: kill the boss.
        if (monster.key === 'hollow_king') {
          qs.completeObjective('hollow-king-slayer', 'kill-hollow-king');
          msg('The Hollow Crown shatters. The curse lifts.');
          // Persistent world-state flag — survives zone-exit clearing of
          // the killedEnemies Set. Without this the boss sprite would
          // respawn every time the player re-entered DepthsFloor3Scene,
          // leaving a visible dead boss stuck at low HP. Consumed by
          // DepthsFloor3Scene.layout() on spawn to skip the boss + lift
          // darkness + spawn reward chests.
          localStorage.setItem('hc_hollow_king_defeated', '1');
        }

        // Drowned Warden slayer: kill the bog boss.
        if (monster.key === 'drowned_warden') {
          qs.completeObjective('warden-slayer', 'kill-drowned-warden');
          msg('The Warden sinks. The water stills.');
          localStorage.setItem('hc_drowned_warden_defeated', '1');
        }

        // The Crownless One: final boss.
        if (monster.key === 'crownless_one') {
          qs.completeObjective('the-crownless-one', 'defeat-crownless-one');
          msg('The Crownless One falls. The throne is empty. It always was.');
          localStorage.setItem('hc_game_complete', '1');
          localStorage.setItem('hc_crownless_one_defeated', '1');
          window.dispatchEvent(new CustomEvent('gameEnding'));
        }

        // Bounty kill tracking — primary plus any extras that fell.
        useBountyStore.getState().recordKill(monster.key);
        for (const extra of state.extraEnemies ?? []) {
          if (!extra.alive) useBountyStore.getState().recordKill(extra.monster.key);
        }

        // Achievement tracking — same.
        const achStore = useAchievementStore.getState();
        achStore.recordKill(monster.key);
        for (const extra of state.extraEnemies ?? []) {
          if (!extra.alive) achStore.recordKill(extra.monster.key);
        }
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
          character.stamina = character.derived.maxStamina;
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

    set((s) => ({ state: null, monster: null, _enemyActing: false, killedEnemies: s.killedEnemies, _pendingEnemyId: '', lastLoot: [], combatEvents: [] }));
  },
}));
