/**
 * Turn-based combat state machine. Deterministic — all randomness
 * flows through the DiceRoller so combat is reproducible/testable.
 *
 * v0 combat: 1v1 (player vs one monster). Multi-enemy and party
 * combat are future milestones.
 *
 * Combat flow:
 *   1. Roll initiative (d20 + speed/dex mod)
 *   2. Alternate turns in initiative order
 *   3. Each turn: choose action (Attack / Defend / Flee)
 *   4. Attack: d20 + attackBonus vs target AC → hit → roll damage
 *   5. Defend: +2 AC until next turn
 *   6. Flee: d20 vs DC 10 — success escapes, failure wastes turn
 *   7. Combat ends when either side reaches 0 HP, or player flees
 */

import { DiceRoller } from './dice';
import { modifier } from './stats';
import type { Character } from './character';
import type { Monster } from './monster';
import { useInventoryStore } from '../state/inventoryStore';

/** Compute total stat bonuses from all currently equipped items. */
function getEquipmentBonuses(): { attack: number; damage: number; ac: number } {
  const eq = useInventoryStore.getState().equipment;
  let attack = 0, damage = 0, ac = 0;
  for (const slot of Object.values(eq)) {
    if (slot?.statBonus) {
      attack += slot.statBonus.attack ?? 0;
      damage += slot.statBonus.damage ?? 0;
      ac     += slot.statBonus.ac     ?? 0;
    }
  }
  return { attack, damage, ac };
}

/** Class-specific combat skills with MP cost and special effects. */
export interface CombatSkill {
  name: string;
  mpCost: number;
  description: string;
}

export const CLASS_SKILLS: Record<string, CombatSkill> = {
  fighter:  { name: 'Action Surge', mpCost: 0, description: 'Strike twice in one turn.' },
  rogue:    { name: 'Sneak Attack', mpCost: 0, description: 'Deal bonus damage from the shadows.' },
  wizard:   { name: 'Fireball', mpCost: 8, description: 'Hurl a ball of fire for heavy damage.' },
  cleric:   { name: 'Cure Wounds', mpCost: 6, description: 'Heal yourself with divine light.' },
  ranger:   { name: "Hunter's Mark", mpCost: 4, description: 'Mark the enemy — your next attacks deal bonus damage.' },
  bard:     { name: 'Vicious Mockery', mpCost: 3, description: 'Insult the enemy, reducing their next attack.' },
};

export type CombatAction = 'attack' | 'defend' | 'flee' | 'skill';
export type CombatPhase = 'start' | 'player_turn' | 'enemy_turn' | 'victory' | 'defeat' | 'fled';

export interface CombatLogEntry {
  text: string;
  type: 'info' | 'player_hit' | 'player_miss' | 'enemy_hit' | 'enemy_miss' | 'system';
}

/** Active status effects on a combatant. */
export interface StatusEffects {
  poison: number;      // damage per turn, 0 = none
  burn: number;        // damage per turn
  stun: number;        // turns remaining (can't act)
  bleed: number;       // damage per turn
  marked: number;      // bonus damage taken, turns remaining
}

const EMPTY_STATUS: StatusEffects = { poison: 0, burn: 0, stun: 0, bleed: 0, marked: 0 };

export interface CombatState {
  phase: CombatPhase;
  /** Monster's current HP (max is in the Monster definition). */
  monsterHp: number;
  /** Player's current HP at combat start (mutated during combat). */
  playerHp: number;
  /** Temporary AC bonus from Defend action. */
  playerDefending: boolean;
  monsterDefending: boolean;
  /** Status effects on the player. */
  playerStatus: StatusEffects;
  /** Status effects on the monster. */
  monsterStatus: StatusEffects;
  /** Who acts first (true = player). */
  playerFirst: boolean;
  /** Turn counter. */
  turn: number;
  /** Combat log messages. */
  log: CombatLogEntry[];
}

const dice = new DiceRoller();

const POISON_DMG = 2;
const BURN_DMG = 3;
const BLEED_DMG = 2;

/**
 * Tick status effects for one side. Returns true if the combatant is stunned
 * (and should skip their turn). Mutates `s` in place.
 */
function tickStatus(
  s: CombatState,
  side: 'player' | 'monster',
  name: string,
): boolean {
  const status = side === 'player' ? s.playerStatus : s.monsterStatus;
  const hpKey = side === 'player' ? 'playerHp' : 'monsterHp';

  if (status.poison > 0) {
    (s as any)[hpKey] = Math.max(0, (s as any)[hpKey] - POISON_DMG);
    s.log.push({ text: `Poison burns for ${POISON_DMG} damage`, type: 'system' });
    status.poison--;
  }
  if (status.burn > 0) {
    (s as any)[hpKey] = Math.max(0, (s as any)[hpKey] - BURN_DMG);
    s.log.push({ text: `Fire sears for ${BURN_DMG} damage`, type: 'system' });
    status.burn--;
  }
  if (status.bleed > 0) {
    (s as any)[hpKey] = Math.max(0, (s as any)[hpKey] - BLEED_DMG);
    s.log.push({ text: `Wound bleeds for ${BLEED_DMG} damage`, type: 'system' });
    status.bleed--;
  }
  if (status.marked > 0) {
    status.marked--;
  }
  if (status.stun > 0) {
    s.log.push({ text: `${name} — Stunned — cannot act`, type: 'system' });
    status.stun--;
    return true;
  }
  return false;
}

/** Initialize combat — roll initiative and set up state. */
export function initCombat(player: Character, monster: Monster): CombatState {
  const playerInit = dice.d(20) + modifier(player.stats.dex);
  const monsterInit = dice.d(20) + monster.speed;

  const log: CombatLogEntry[] = [
    { text: monster.description, type: 'info' },
    { text: `${monster.name} appears!`, type: 'system' },
  ];

  const playerFirst = playerInit >= monsterInit;
  log.push({
    text: playerFirst ? 'You move first.' : `${monster.name} is quicker.`,
    type: 'system',
  });

  return {
    phase: playerFirst ? 'player_turn' : 'enemy_turn',
    monsterHp: monster.maxHp,
    playerHp: player.hp,
    playerDefending: false,
    monsterDefending: false,
    playerStatus: { ...EMPTY_STATUS },
    monsterStatus: { ...EMPTY_STATUS },
    playerFirst,
    turn: 1,
    log,
  };
}

/** Execute the player's chosen action. Returns updated state. */
export function playerAct(
  state: CombatState,
  action: CombatAction,
  player: Character,
  monster: Monster,
): CombatState {
  if (state.phase !== 'player_turn') return state;

  const s = {
    ...state,
    log: [...state.log],
    playerDefending: false,
    playerStatus: { ...state.playerStatus },
    monsterStatus: { ...state.monsterStatus },
  };

  // Tick player status effects at the start of their turn
  const playerStunned = tickStatus(s, 'player', 'You');

  // If player died from status damage, defeat
  if (s.playerHp <= 0) {
    s.log.push({ text: 'You fall.', type: 'system' });
    s.phase = 'defeat';
    return s;
  }

  // If stunned, skip action and go to enemy turn
  if (playerStunned) {
    s.phase = 'enemy_turn';
    s.monsterDefending = false;
    return s;
  }

  if (action === 'attack') {
    const equipBonus = getEquipmentBonuses();
    const roll = dice.d(20);
    const bonus = modifier(player.stats[player.weapon.attackStat]) + equipBonus.attack;
    const total = roll + bonus;
    const targetAc = monster.ac + (s.monsterDefending ? 2 : 0);

    if (roll === 20 || (roll !== 1 && total >= targetAc)) {
      // Hit!
      const dmgBase = modifier(player.stats[player.weapon.attackStat]) + 2 + equipBonus.damage; // weapon base + equipment
      const dmg = Math.max(1, roll === 20 ? dmgBase * 2 : dmgBase);
      s.monsterHp = Math.max(0, s.monsterHp - dmg);
      s.log.push({
        text: `You attack! (${roll}+${bonus}=${total} vs AC ${targetAc}) — Hit for ${dmg} damage!`,
        type: 'player_hit',
      });
    } else {
      s.log.push({
        text: `You attack! (${roll}+${bonus}=${total} vs AC ${targetAc}) — Miss.`,
        type: 'player_miss',
      });
    }
  } else if (action === 'defend') {
    s.playerDefending = true;
    s.log.push({ text: 'You brace yourself. (+2 AC until your next turn)', type: 'info' });
  } else if (action === 'skill') {
    const classKey = player.characterClass.key;
    const skill = CLASS_SKILLS[classKey];
    if (!skill) {
      // No skill available — don't waste the turn, return original state.
      return state;
    } else if (player.mp < skill.mpCost) {
      // Not enough MP — don't waste the turn. Add log but return new state
      // with phase still on player_turn so they can pick another action.
      s.log.push({ text: `Not enough MP for ${skill.name} (need ${skill.mpCost}).`, type: 'info' });
      s.phase = 'player_turn';
      return s;
    } else {
      player.spendMp(skill.mpCost);

      if (classKey === 'cleric') {
        // Cure Wounds: heal self
        const healAmt = 8 + modifier(player.stats.wis) * 2;
        s.playerHp = Math.min(player.derived.maxHp, s.playerHp + healAmt);
        s.log.push({ text: `${skill.name}! You heal for ${healAmt} HP.`, type: 'player_hit' });
      } else if (classKey === 'wizard') {
        // Fireball: guaranteed heavy damage
        const dmg = 10 + modifier(player.stats.int) * 2;
        s.monsterHp = Math.max(0, s.monsterHp - dmg);
        s.log.push({ text: `${skill.name}! ${dmg} fire damage!`, type: 'player_hit' });
      } else if (classKey === 'fighter') {
        // Action Surge: two attacks in one turn
        for (let strike = 0; strike < 2; strike++) {
          const r = dice.d(20);
          const b = modifier(player.stats.str);
          const t = r + b;
          const ac = monster.ac + (s.monsterDefending ? 2 : 0);
          if (r === 20 || (r !== 1 && t >= ac)) {
            const d2 = Math.max(1, modifier(player.stats.str) + 3);
            s.monsterHp = Math.max(0, s.monsterHp - d2);
            s.log.push({ text: `${skill.name} strike ${strike+1}! (${r}+${b}=${t}) — ${d2} damage!`, type: 'player_hit' });
          } else {
            s.log.push({ text: `${skill.name} strike ${strike+1}! (${r}+${b}=${t}) — Miss.`, type: 'player_miss' });
          }
        }
      } else if (classKey === 'rogue') {
        // Sneak Attack: guaranteed hit + bonus damage
        const dmg = 6 + modifier(player.stats.dex) * 2;
        s.monsterHp = Math.max(0, s.monsterHp - dmg);
        s.log.push({ text: `${skill.name}! ${dmg} damage from the shadows!`, type: 'player_hit' });
      } else if (classKey === 'ranger') {
        // Hunter's Mark: attack with bonus damage + apply marked status
        s.monsterStatus.marked = 3;
        const r = dice.d(20);
        const b = modifier(player.stats.dex);
        const t = r + b;
        const ac = monster.ac;
        const bonusDmg = 4;
        if (r === 20 || (r !== 1 && t >= ac)) {
          const d2 = Math.max(1, modifier(player.stats.dex) + 2 + bonusDmg);
          s.monsterHp = Math.max(0, s.monsterHp - d2);
          s.log.push({ text: `${skill.name}! Marked shot for ${d2} damage! Target marked for 3 turns.`, type: 'player_hit' });
        } else {
          s.log.push({ text: `${skill.name}! (${r}+${b}=${t}) — Missed! But the mark holds for 3 turns.`, type: 'player_miss' });
        }
      } else if (classKey === 'bard') {
        // Vicious Mockery: small damage + enemy debuff + 25% stun chance
        const dmg = 3 + modifier(player.stats.cha);
        s.monsterHp = Math.max(0, s.monsterHp - dmg);
        s.monsterDefending = false; // cancel any defend
        const stunRoll = dice.d(20);
        if (stunRoll >= 16) {
          s.monsterStatus.stun = 1;
          s.log.push({ text: `${skill.name}! "${monster.name} couldn't pour water from a boot with instructions on the heel." ${dmg} psychic damage! ${monster.name} is stunned!`, type: 'player_hit' });
        } else {
          s.log.push({ text: `${skill.name}! "${monster.name} couldn't pour water from a boot with instructions on the heel." ${dmg} psychic damage!`, type: 'player_hit' });
        }
      }
    }
  } else if (action === 'flee') {
    const roll = dice.d(20);
    const bonus = modifier(player.stats.dex);
    if (roll + bonus >= 10) {
      s.log.push({ text: `You flee! (${roll}+${bonus}=${roll + bonus} vs DC 10) — Escaped!`, type: 'system' });
      s.phase = 'fled';
      return s;
    } else {
      s.log.push({ text: `You try to flee! (${roll}+${bonus}=${roll + bonus} vs DC 10) — Blocked!`, type: 'player_miss' });
    }
  }

  // Check victory
  if (s.monsterHp <= 0) {
    s.log.push({ text: `${monster.name} falls.`, type: 'system' });
    s.phase = 'victory';
    return s;
  }

  // Next: enemy turn
  s.phase = 'enemy_turn';
  s.monsterDefending = false;
  return s;
}

/** Execute the monster's turn (simple AI: always attacks). */
export function enemyAct(
  state: CombatState,
  player: Character,
  monster: Monster,
): CombatState {
  if (state.phase !== 'enemy_turn') return state;

  const s = {
    ...state,
    log: [...state.log],
    playerStatus: { ...state.playerStatus },
    monsterStatus: { ...state.monsterStatus },
  };

  // Tick monster status effects at the start of their turn
  const monsterStunned = tickStatus(s, 'monster', monster.name);

  // If monster died from status damage, victory
  if (s.monsterHp <= 0) {
    s.log.push({ text: `${monster.name} falls.`, type: 'system' });
    s.phase = 'victory';
    return s;
  }

  // If stunned, skip turn
  if (monsterStunned) {
    s.turn++;
    s.phase = 'player_turn';
    return s;
  }

  const equipBonus = getEquipmentBonuses();
  const roll = dice.d(20);
  const total = roll + monster.attackBonus;
  const playerAc = player.derived.ac + (s.playerDefending ? 2 : 0) + equipBonus.ac;

  let didHit = false;
  if (roll === 20 || (roll !== 1 && total >= playerAc)) {
    didHit = true;
    const dmg = Math.max(1, roll === 20 ? monster.baseDamage * 2 : monster.baseDamage);
    s.playerHp = Math.max(0, s.playerHp - dmg);
    s.log.push({
      text: `${monster.name} attacks! (${roll}+${monster.attackBonus}=${total} vs AC ${playerAc}) — ${dmg} damage!`,
      type: 'enemy_hit',
    });
  } else {
    s.log.push({
      text: `${monster.name} attacks! (${roll}+${monster.attackBonus}=${total} vs AC ${playerAc}) — Miss.`,
      type: 'enemy_miss',
    });
  }

  // Apply monster-specific status effects on hit
  if (didHit) {
    const statusRoll = dice.d(100);
    if (monster.key === 'wolf' && statusRoll <= 30) {
      s.playerStatus.bleed = 2;
      s.log.push({ text: "The wolf's fangs tear flesh — you bleed.", type: 'system' });
    } else if (monster.key === 'skeleton' && statusRoll <= 25) {
      s.playerStatus.poison = 2;
      s.log.push({ text: 'Cursed bone scrapes you — poison seeps in.', type: 'system' });
    } else if (monster.key === 'hollow_knight' && statusRoll <= 20) {
      s.playerStatus.stun = 1;
      s.log.push({ text: 'A crushing blow staggers you.', type: 'system' });
    } else if (monster.key === 'spider' && statusRoll <= 40) {
      s.playerStatus.poison = 3;
      s.log.push({ text: 'Venom courses through your veins.', type: 'system' });
    } else if (monster.key === 'wraith' && statusRoll <= 35) {
      s.playerStatus.burn = 2;
      s.log.push({ text: 'Spectral fire clings to your skin.', type: 'system' });
    } else if (monster.key === 'hollow_king') {
      // Boss has multiple possible effects
      if (statusRoll <= 15) {
        s.playerStatus.stun = 1;
        s.log.push({ text: 'The Hollow King strikes with royal fury — you stagger.', type: 'system' });
      } else if (statusRoll <= 30) {
        s.playerStatus.burn = 3;
        s.log.push({ text: 'Dark flames erupt from the crown — you burn.', type: 'system' });
      } else if (statusRoll <= 45) {
        s.playerStatus.bleed = 3;
        s.log.push({ text: "The king's blade leaves a wound that won't close.", type: 'system' });
      }
    }
  }

  // Check defeat
  if (s.playerHp <= 0) {
    s.log.push({ text: 'You fall.', type: 'system' });
    s.phase = 'defeat';
    return s;
  }

  // Next turn
  s.turn++;
  s.phase = 'player_turn';
  return s;
}
