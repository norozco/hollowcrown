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
import { type Character, DIFFICULTY_SCALES } from './character';
import type { Monster } from './monster';
import { useInventoryStore } from '../state/inventoryStore';
import { usePlayerStore, getHeartPieceHpBonus } from '../state/playerStore';
import { COMPANIONS } from './companion';
import { getPerkCombatBonuses, getPerkHpBonus } from './perks';

/** Compute total stat bonuses from all currently equipped items AND the active companion. */
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
  // Companion passive bonuses
  const companionKey = usePlayerStore.getState().companion;
  if (companionKey) {
    const companion = COMPANIONS[companionKey];
    if (companion) {
      damage += companion.effect.bonusDamage ?? 0;
      ac     += companion.effect.bonusAc     ?? 0;
    }
  }
  // Perk passive bonuses (accumulated across level-ups)
  const perkBonus = getPerkCombatBonuses(usePlayerStore.getState().perks);
  attack += perkBonus.attack;
  damage += perkBonus.damage;
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
  ranger:   { name: "Hunter's Mark", mpCost: 0, description: 'Mark the enemy — your next attacks deal bonus damage.' },
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
  /** Diminishing-returns flag: set when stun expires, blocks a fresh
   *  stun application for one subsequent turn. Prevents chain-stuns. */
  stunImmune: number;
}

const EMPTY_STATUS: StatusEffects = { poison: 0, burn: 0, stun: 0, bleed: 0, marked: 0, stunImmune: 0 };

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
  /** Whether the Hollow King has entered phase 2 (HP <= 50%). */
  bossPhase2: boolean;
  /** Scaled monster base damage for this fight. */
  monsterBaseDamage: number;
}

const dice = new DiceRoller();

const POISON_DMG = 2;
const BURN_DMG = 3;
const BLEED_DMG = 2;

/** Maximum stack value for each status effect. */
const STATUS_CAPS: Record<keyof StatusEffects, number> = {
  poison: 5,
  burn: 5,
  bleed: 5,
  stun: 2,
  marked: 5,
  stunImmune: 2,
};

/** Apply a status effect to a StatusEffects object, respecting caps.
 *  Stun is special: if the target is stun-immune (was stunned recently),
 *  the stun is ignored and stunImmune ticks down instead. */
function applyStatus(status: StatusEffects, effect: keyof StatusEffects, value: number): void {
  if (effect === 'stun' && status.stunImmune > 0) {
    // Diminishing returns: consume one tick of immunity, no stun applied.
    return;
  }
  status[effect] = Math.min(STATUS_CAPS[effect], status[effect] + value) as never;
}

/** Map class + action to an element for weakness/resistance checks. */
function getAttackElement(classKey: string, action: CombatAction): string {
  if (action === 'skill') {
    if (classKey === 'wizard') return 'fire';
    if (classKey === 'rogue') return 'shadow';
    if (classKey === 'bard') return 'shadow';
  }
  return 'physical';
}

/**
 * Apply elemental weakness or resistance to a damage value.
 * Returns { finalDmg, log } — log is empty unless the element matters.
 */
function applyElement(
  dmg: number,
  element: string,
  monster: Monster,
  s: CombatState,
): number {
  if (monster.weakness === element) {
    s.log.push({ text: 'Weakness exploited.', type: 'info' });
    return Math.ceil(dmg * 1.5);
  }
  if (monster.resistance === element) {
    s.log.push({ text: 'Resisted.', type: 'info' });
    return Math.floor(dmg * 0.5);
  }
  return dmg;
}

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
    // When the last stun tick wears off, grant one turn of immunity so
    // enemies can't chain-stun across consecutive turns.
    if (status.stun === 0) {
      status.stunImmune = 2;
    }
    return true;
  }
  // Tick down stun immunity each turn the combatant actually gets to act.
  if (status.stunImmune > 0) {
    status.stunImmune--;
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

  // Scale monster HP and damage based on player level so fights stay
  // relevant as the player grows. Scaling starts above level 3 for HP
  // and level 5 for damage to keep early game accessible.
  const levelScale = 1 + Math.max(0, player.level - 3) * 0.08; // +8% per level above 3
  const ngPlus = usePlayerStore.getState().newGamePlus;
  const ngPlusHpScale = ngPlus ? 1.5 : 1;
  const ngPlusDmgScale = ngPlus ? 1.25 : 1;
  // Difficulty scaling from character creation
  const diffScale = DIFFICULTY_SCALES[player.difficulty] ?? DIFFICULTY_SCALES.normal;
  const scaledHp = Math.round(monster.maxHp * levelScale * ngPlusHpScale * diffScale.monsterHp);
  const scaledDamage = Math.round(monster.baseDamage * (1 + Math.max(0, player.level - 5) * 0.05) * ngPlusDmgScale * diffScale.monsterDamage);

  return {
    phase: playerFirst ? 'player_turn' : 'enemy_turn',
    monsterHp: scaledHp,
    playerHp: player.hp,
    playerDefending: false,
    monsterDefending: false,
    playerStatus: { ...EMPTY_STATUS },
    monsterStatus: { ...EMPTY_STATUS },
    playerFirst,
    turn: 1,
    log,
    bossPhase2: false,
    monsterBaseDamage: scaledDamage,
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
      let dmgBase = modifier(player.stats[player.weapon.attackStat]) + 2 + equipBonus.damage; // weapon base + equipment
      // Ranged weapons get a +30% damage bonus so bow-wielding players can
      // reliably finish starter monsters at level 1.
      if (player.weapon.range === 'ranged') {
        dmgBase = Math.ceil(dmgBase * 1.3);
      }
      const rawDmg = Math.max(1, roll === 20 ? dmgBase * 2 : dmgBase);
      const dmg = applyElement(rawDmg, getAttackElement(player.characterClass.key, 'attack'), monster, s);
      s.monsterHp = Math.max(0, s.monsterHp - dmg);
      if (roll === 20) {
        s.log.push({ text: `A devastating strike. ${dmg} damage.`, type: 'player_hit' });
      } else {
        const hitLines = [
          `Your blade finds its mark. ${dmg} damage.`,
          `A clean strike. ${dmg} damage.`,
          `The blow lands true. ${dmg} damage.`,
        ];
        s.log.push({ text: hitLines[dice.d(3) - 1], type: 'player_hit' });
      }
    } else {
      const missLines = [
        'Your strike glances off armor.',
        'The blow goes wide.',
        'You swing \u2014 nothing.',
      ];
      s.log.push({ text: missLines[dice.d(3) - 1], type: 'player_miss' });
    }
  } else if (action === 'defend') {
    s.playerDefending = true;
    s.log.push({ text: 'You brace yourself.', type: 'info' });
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
        // Cure Wounds: heal self — no damage element to check
        const healAmt = 8 + modifier(player.stats.wis) * 2;
        const maxHpWithPerks = player.derived.maxHp + getPerkHpBonus(usePlayerStore.getState().perks) + getHeartPieceHpBonus(usePlayerStore.getState().heartPieces);
        s.playerHp = Math.min(maxHpWithPerks, s.playerHp + healAmt);
        s.log.push({ text: `Divine light mends your wounds. +${healAmt} HP.`, type: 'player_hit' });
      } else if (classKey === 'wizard') {
        // Fireball: guaranteed fire damage
        const rawDmg = 10 + modifier(player.stats.int) * 2;
        const dmg = applyElement(rawDmg, 'fire', monster, s);
        s.monsterHp = Math.max(0, s.monsterHp - dmg);
        s.log.push({ text: `Fireball erupts. ${dmg} fire damage.`, type: 'player_hit' });
      } else if (classKey === 'fighter') {
        // Action Surge: two physical attacks in one turn
        const elem = getAttackElement(classKey, 'skill');
        for (let strike = 0; strike < 2; strike++) {
          const r = dice.d(20);
          const b = modifier(player.stats.str);
          const t = r + b;
          const ac = monster.ac + (s.monsterDefending ? 2 : 0);
          if (r === 20 || (r !== 1 && t >= ac)) {
            const rawD2 = Math.max(1, modifier(player.stats.str) + 3);
            const d2 = applyElement(rawD2, elem, monster, s);
            s.monsterHp = Math.max(0, s.monsterHp - d2);
            s.log.push({ text: `Action Surge \u2014 strike connects. ${d2} damage.`, type: 'player_hit' });
          } else {
            s.log.push({ text: `Action Surge \u2014 the blow misses.`, type: 'player_miss' });
          }
        }
      } else if (classKey === 'rogue') {
        // Sneak Attack: shadow damage
        const rawDmg = 6 + modifier(player.stats.dex) * 2;
        const dmg = applyElement(rawDmg, 'shadow', monster, s);
        s.monsterHp = Math.max(0, s.monsterHp - dmg);
        s.log.push({ text: `You strike from the shadows. ${dmg} damage.`, type: 'player_hit' });
      } else if (classKey === 'ranger') {
        // Hunter's Mark: physical + apply marked status
        applyStatus(s.monsterStatus, 'marked', 3);
        const r = dice.d(20);
        const b = modifier(player.stats.dex);
        const t = r + b;
        const ac = monster.ac;
        const bonusDmg = 4;
        if (r === 20 || (r !== 1 && t >= ac)) {
          const rawD2 = Math.max(1, modifier(player.stats.dex) + 2 + bonusDmg);
          const d2 = applyElement(rawD2, 'physical', monster, s);
          s.monsterHp = Math.max(0, s.monsterHp - d2);
          s.log.push({ text: `Marked shot lands. ${d2} damage. Target marked.`, type: 'player_hit' });
        } else {
          s.log.push({ text: `Marked shot \u2014 missed. The mark holds.`, type: 'player_miss' });
        }
      } else if (classKey === 'bard') {
        // Vicious Mockery: shadow psychic damage + debuff + 25% stun
        const rawDmg = 3 + modifier(player.stats.cha);
        const dmg = applyElement(rawDmg, 'shadow', monster, s);
        s.monsterHp = Math.max(0, s.monsterHp - dmg);
        s.monsterDefending = false; // cancel any defend
        const stunRoll = dice.d(20);
        if (stunRoll >= 16) {
          applyStatus(s.monsterStatus, 'stun', 1);
          s.log.push({ text: `Vicious Mockery! "${monster.name} couldn't pour water from a boot with instructions on the heel." ${dmg} psychic damage. ${monster.name} is stunned!`, type: 'player_hit' });
        } else {
          s.log.push({ text: `Vicious Mockery! "${monster.name} couldn't pour water from a boot with instructions on the heel." ${dmg} psychic damage.`, type: 'player_hit' });
        }
      }
    }
  } else if (action === 'flee') {
    const roll = dice.d(20);
    const bonus = modifier(player.stats.dex);
    if (roll + bonus >= 10) {
      s.log.push({ text: 'You break away and escape.', type: 'system' });
      s.phase = 'fled';
      return s;
    } else {
      s.log.push({ text: 'You try to run \u2014 no opening.', type: 'player_miss' });
    }
  }

  // Check victory
  if (s.monsterHp <= 0) {
    s.log.push({ text: `${monster.name} falls.`, type: 'system' });
    s.phase = 'victory';
    return s;
  }

  // Companion heal-per-turn (applied after the player's action, before enemy turn)
  const companionKey = usePlayerStore.getState().companion;
  if (companionKey) {
    const companion = COMPANIONS[companionKey];
    if (companion?.effect.healPerTurn) {
      const heal = companion.effect.healPerTurn;
      const maxHpWithPerks2 = player.derived.maxHp + getPerkHpBonus(usePlayerStore.getState().perks) + getHeartPieceHpBonus(usePlayerStore.getState().heartPieces);
      s.playerHp = Math.min(maxHpWithPerks2, s.playerHp + heal);
      s.log.push({ text: `${companion.name} patches your wounds. +${heal} HP.`, type: 'player_hit' });
    }
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

  // ── The Forgotten phase 2 transition ──
  if (monster.key === 'the_forgotten' && !s.bossPhase2 && s.monsterHp <= monster.maxHp * 0.3) {
    s.bossPhase2 = true;
    s.log.push({ text: 'The void deepens. Reality bends.', type: 'system' });
    s.monsterHp = Math.min(monster.maxHp, s.monsterHp + 50);
    s.monsterStatus = { ...EMPTY_STATUS };
  }

  // ── Crownless One phase 2 transition ──
  if (monster.key === 'crownless_one' && !s.bossPhase2 && s.monsterHp <= monster.maxHp * 0.5) {
    s.bossPhase2 = true;
    s.log.push({ text: 'The Crownless One\'s form fractures. Shards of darkness orbit him. "I WILL NOT BE FORGOTTEN."', type: 'system' });
    s.monsterHp = Math.min(monster.maxHp, s.monsterHp + 30);
    s.monsterStatus = { ...EMPTY_STATUS };
  }

  // ── Drowned Warden phase 2 transition ──
  if (monster.key === 'drowned_warden' && !s.bossPhase2 && s.monsterHp <= monster.maxHp * 0.4) {
    s.bossPhase2 = true;
    s.log.push({ text: 'The Warden\'s armor cracks. Salt water pours from the seams. It moves faster now.', type: 'system' });
    s.monsterHp = Math.min(monster.maxHp, s.monsterHp + 15);
    s.monsterStatus = { ...EMPTY_STATUS };
  }

  // ── Hollow King phase 2 transition ──
  if (monster.key === 'hollow_king' && !s.bossPhase2 && s.monsterHp <= monster.maxHp / 2) {
    s.bossPhase2 = true;
    s.log.push({ text: "The Hollow King's crown flares with dark light. He will not kneel.", type: 'system' });
    s.monsterHp = Math.min(monster.maxHp, s.monsterHp + 20);
    s.monsterStatus = { ...EMPTY_STATUS }; // clear debuffs
  }

  const equipBonus = getEquipmentBonuses();
  const playerAc = player.derived.ac + (s.playerDefending ? 2 : 0) + equipBonus.ac;

  // ── Check for special ability ──
  if (monster.special && Math.random() < monster.special.chance) {
    const sp = monster.special;
    const dmg = Math.max(1, Math.round(s.monsterBaseDamage * (sp.damageMult ?? 1)));
    s.playerHp = Math.max(0, s.playerHp - dmg);
    const logText = sp.text.replace('{name}', monster.name);
    s.log.push({ text: `${logText} ${dmg} damage.`, type: 'enemy_hit' });

    if (sp.applyStatus) {
      applyStatus(s.playerStatus, sp.applyStatus.effect, sp.applyStatus.value);
      s.log.push({ text: `${sp.applyStatus.effect.charAt(0).toUpperCase() + sp.applyStatus.effect.slice(1)} applied.`, type: 'system' });
    }
    if (sp.selfHeal && sp.selfHeal > 0) {
      s.monsterHp = Math.min(monster.maxHp, s.monsterHp + sp.selfHeal);
      s.log.push({ text: `${monster.name} mends itself. +${sp.selfHeal} HP.`, type: 'info' });
    }
  } else {
  // ── Normal attack ──

  // Determine number of attacks — boss phase 2 has 50% double attack; Forgotten phase 2 has 50% triple
  const isKingPhase2 = monster.key === 'hollow_king' && s.bossPhase2;
  const isWardenPhase2 = monster.key === 'drowned_warden' && s.bossPhase2;
  const isCrownlessPhase2 = monster.key === 'crownless_one' && s.bossPhase2;
  const isForgottenPhase2 = monster.key === 'the_forgotten' && s.bossPhase2;
  let attackCount = 1;
  if (isForgottenPhase2 && dice.d(100) <= 50) {
    attackCount = 3;
  } else if ((isKingPhase2 || isWardenPhase2 || isCrownlessPhase2) && dice.d(100) <= 50) {
    attackCount = 2;
  }
  if (attackCount >= 2) {
    if (isForgottenPhase2) {
      s.log.push({ text: 'The void fractures into three. Each one strikes.', type: 'system' });
    } else if (isCrownlessPhase2) {
      s.log.push({ text: 'The Crownless One strikes twice — fractured and furious.', type: 'system' });
    } else if (isWardenPhase2) {
      s.log.push({ text: 'The Warden swings twice — faster now.', type: 'system' });
    } else {
      s.log.push({ text: 'The Hollow King strikes twice!', type: 'system' });
    }
  }

  let didHit = false;
  for (let atk = 0; atk < attackCount; atk++) {
    const roll = dice.d(20);
    const total = roll + monster.attackBonus;
    if (roll === 20 || (roll !== 1 && total >= playerAc)) {
      didHit = true;
      const dmg = Math.max(1, roll === 20 ? s.monsterBaseDamage * 2 : s.monsterBaseDamage);
      s.playerHp = Math.max(0, s.playerHp - dmg);
      const enemyHitLines = [
        `${monster.name} strikes \u2014 ${dmg} damage.`,
        `${monster.name} lands a blow. ${dmg} damage.`,
      ];
      s.log.push({ text: enemyHitLines[dice.d(2) - 1], type: 'enemy_hit' });
    } else {
      const enemyMissLines = [
        `${monster.name} lunges \u2014 you dodge.`,
        `${monster.name}'s attack misses.`,
      ];
      s.log.push({ text: enemyMissLines[dice.d(2) - 1], type: 'enemy_miss' });
    }
  }

  // Apply monster-specific status effects on hit
  if (didHit) {
    const statusRoll = dice.d(100);
    if (monster.key === 'wolf' && statusRoll <= 30) {
      applyStatus(s.playerStatus, 'bleed', 2);
      s.log.push({ text: "The wolf's fangs tear flesh — you bleed.", type: 'system' });
    } else if (monster.key === 'skeleton' && statusRoll <= 25) {
      applyStatus(s.playerStatus, 'poison', 2);
      s.log.push({ text: 'Cursed bone scrapes you — poison seeps in.', type: 'system' });
    } else if (monster.key === 'hollow_knight' && statusRoll <= 20) {
      applyStatus(s.playerStatus, 'stun', 1);
      s.log.push({ text: 'A crushing blow staggers you.', type: 'system' });
    } else if (monster.key === 'spider' && statusRoll <= 40) {
      applyStatus(s.playerStatus, 'poison', 3);
      s.log.push({ text: 'Venom courses through your veins.', type: 'system' });
    } else if (monster.key === 'wraith' && statusRoll <= 35) {
      applyStatus(s.playerStatus, 'burn', 2);
      s.log.push({ text: 'Spectral fire clings to your skin.', type: 'system' });
    } else if (monster.key === 'boar' && statusRoll <= 25) {
      applyStatus(s.playerStatus, 'stun', 1);
      s.log.push({ text: "The boar's charge staggers you.", type: 'system' });
    } else if (monster.key === 'bandit' && statusRoll <= 20) {
      applyStatus(s.playerStatus, 'bleed', 2);
      s.log.push({ text: "The bandit's blade cuts deep.", type: 'system' });
    } else if (monster.key === 'cave_bat' && statusRoll <= 25) {
      applyStatus(s.playerStatus, 'bleed', 2);
      s.log.push({ text: "The bat's claws tear skin.", type: 'system' });
    } else if (monster.key === 'mine_golem' && statusRoll <= 10) {
      applyStatus(s.playerStatus, 'stun', 1);
      s.log.push({ text: 'The impact rattles your bones.', type: 'system' });
    } else if (monster.key === 'bog_lurker' && statusRoll <= 30) {
      applyStatus(s.playerStatus, 'poison', 2);
      s.log.push({ text: 'Something in the water seeps into the wound.', type: 'system' });
    } else if (monster.key === 'drowned_warden') {
      // Boss — multiple possible effects, enhanced in phase 2
      const stunThresh = s.bossPhase2 ? 30 : 15;
      const bleedThresh = s.bossPhase2 ? 55 : 30;
      const poisonThresh = s.bossPhase2 ? 75 : 40;
      if (statusRoll <= stunThresh) {
        applyStatus(s.playerStatus, 'stun', 1);
        s.log.push({ text: 'The Warden\'s corroded blade stuns you.', type: 'system' });
      } else if (statusRoll <= bleedThresh) {
        applyStatus(s.playerStatus, 'bleed', 3);
        s.log.push({ text: 'Salt-crusted iron tears a wound that weeps.', type: 'system' });
      } else if (statusRoll <= poisonThresh) {
        applyStatus(s.playerStatus, 'poison', 2);
        s.log.push({ text: 'Brackish water burns in the cut.', type: 'system' });
      }
    } else if (monster.key === 'fire_elemental' && statusRoll <= 35) {
      applyStatus(s.playerStatus, 'burn', 3);
      s.log.push({ text: 'The flames lick your skin.', type: 'system' });
    } else if (monster.key === 'lava_drake' && statusRoll <= 25) {
      applyStatus(s.playerStatus, 'burn', 3);
      s.log.push({ text: 'Molten spittle sears you.', type: 'system' });
    } else if (monster.key === 'ash_wraith' && statusRoll <= 20) {
      applyStatus(s.playerStatus, 'stun', 1);
      s.log.push({ text: 'Ash fills your lungs.', type: 'system' });
    } else if (monster.key === 'ember_knight' && statusRoll <= 25) {
      applyStatus(s.playerStatus, 'burn', 2);
      s.log.push({ text: 'The heated blade scorches where it strikes.', type: 'system' });
    } else if (monster.key === 'frost_wolf' && statusRoll <= 30) {
      applyStatus(s.playerStatus, 'stun', 1);
      s.log.push({ text: 'The cold seeps into your bones. You stagger.', type: 'system' });
    } else if (monster.key === 'ice_golem' && statusRoll <= 20) {
      applyStatus(s.playerStatus, 'stun', 1);
      s.log.push({ text: 'The impact shakes frost loose from the ceiling.', type: 'system' });
    } else if (monster.key === 'blizzard_wraith' && statusRoll <= 25) {
      applyStatus(s.playerStatus, 'stun', 1);
      s.log.push({ text: 'The blizzard closes in. You cannot see.', type: 'system' });
    } else if (monster.key === 'frost_warden' && statusRoll <= 25) {
      applyStatus(s.playerStatus, 'bleed', 3);
      s.log.push({ text: 'The frozen blade leaves a wound that weeps ice.', type: 'system' });
    } else if (monster.key === 'the_forgotten') {
      // Secret superboss — stun/burn/bleed, enhanced in phase 2 (30% each)
      const stunThresh = s.bossPhase2 ? 30 : 25;
      const burnThresh = s.bossPhase2 ? 60 : 45;
      const bleedThresh = s.bossPhase2 ? 90 : 65;
      if (statusRoll <= stunThresh) {
        applyStatus(s.playerStatus, 'stun', 1);
        s.log.push({ text: 'You forget how to move. Your body does not obey.', type: 'system' });
      } else if (statusRoll <= burnThresh) {
        applyStatus(s.playerStatus, 'burn', 3);
        s.log.push({ text: 'Void fire. It burns without heat. It burns without flame.', type: 'system' });
      } else if (statusRoll <= bleedThresh) {
        applyStatus(s.playerStatus, 'bleed', 3);
        s.log.push({ text: 'Something inside you tears. The wound is not physical.', type: 'system' });
      }
    } else if (monster.key === 'crownless_one') {
      // Final boss — multi-effect status procs, enhanced in phase 2
      const stunThresh = s.bossPhase2 ? 30 : 15;
      const burnThresh = s.bossPhase2 ? 55 : 30;
      const bleedThresh = s.bossPhase2 ? 80 : 45;
      if (statusRoll <= stunThresh) {
        applyStatus(s.playerStatus, 'stun', 1);
        s.log.push({ text: 'The Crownless One\'s word lands like a blow. You cannot move.', type: 'system' });
      } else if (statusRoll <= burnThresh) {
        applyStatus(s.playerStatus, 'burn', 3);
        s.log.push({ text: 'Shadow fire erupts from the void above his head.', type: 'system' });
      } else if (statusRoll <= bleedThresh) {
        applyStatus(s.playerStatus, 'bleed', 3);
        s.log.push({ text: 'Dark energy tears through you. The wound seeps shadow.', type: 'system' });
      }
    } else if (monster.key === 'hollow_king') {
      // Boss has multiple possible effects — enhanced in phase 2
      const stunThresh = s.bossPhase2 ? 30 : 15;
      const burnThresh = s.bossPhase2 ? 55 : 30;
      const bleedThresh = s.bossPhase2 ? 80 : 45;
      if (statusRoll <= stunThresh) {
        applyStatus(s.playerStatus, 'stun', 1);
        s.log.push({ text: 'The Hollow King strikes with royal fury \u2014 you stagger.', type: 'system' });
      } else if (statusRoll <= burnThresh) {
        applyStatus(s.playerStatus, 'burn', 3);
        s.log.push({ text: 'Dark flames erupt from the crown \u2014 you burn.', type: 'system' });
      } else if (statusRoll <= bleedThresh) {
        applyStatus(s.playerStatus, 'bleed', 3);
        s.log.push({ text: "The king's blade leaves a wound that won't close.", type: 'system' });
      }
    }
  }

  } // end normal attack else

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
