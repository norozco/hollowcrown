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
import { getWeapon, type Weapon } from './weapons';

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

/**
 * Resolve the weapon whose `perk` should drive this attack. If the
 * mainHand-equipped item carries a `weaponKey`, that wins (and is the
 * normal path once the player picks up Flamebrand and friends). Otherwise
 * fall back to `player.weapon` — the weapon set at character creation,
 * which never changes after equip and so doesn't carry perks for items
 * picked up mid-run, but is still the correct source for tests that
 * assign `player.weapon` directly.
 */
function resolveEquippedWeapon(player: Character): Weapon {
  const eq = useInventoryStore.getState().equipment;
  const main = eq.mainHand;
  if (main?.weaponKey) {
    try {
      return getWeapon(main.weaponKey);
    } catch {
      // Bad data — fall through to character weapon.
    }
  }
  return player.weapon;
}

/**
 * Class-specific combat skills.
 *
 * Each skill has a stable `key` (used by the engine dispatch and by the
 * scene to drive per-skill animations) plus a `cost` object that picks
 * exactly one resource:
 *   - `mp`      → caster classes (wizard/cleric/bard)
 *   - `stamina` → martial classes (fighter/rogue/ranger)
 *
 * Visuals are described by a `visual` block read by CombatScene to play
 * a colored flash + per-skill SFX without text-matching the log.
 */
export interface CombatSkill {
  /** Stable id used by engine dispatch + scene animations. */
  key: string;
  name: string;
  cost: { mp?: number; stamina?: number };
  description: string;
  /** Visual signature for the scene. Color is hex (e.g. '#ff5533'). */
  visual: {
    color: string;
    /** Phaser camera flash duration in ms. */
    flashMs: number;
    /** Camera shake intensity (0..1). 0 = no shake. */
    shake: number;
    /** Particle style. 'none' = just the flash. */
    particle: 'none' | 'fire' | 'ice' | 'shadow' | 'arrow' | 'shield' | 'star' | 'leaf' | 'arcane';
    /** Where the visual focuses. 'enemy' / 'player' / 'both'. */
    target: 'enemy' | 'player' | 'both';
  };
}

export const CLASS_SKILLS: Record<string, readonly CombatSkill[]> = {
  fighter: [
    {
      key: 'action_surge',
      name: 'Action Surge',
      cost: { stamina: 4 },
      description: 'Strike twice in one turn.',
      visual: { color: '#e8c060', flashMs: 110, shake: 0.012, particle: 'star', target: 'enemy' },
    },
    {
      key: 'cleave',
      name: 'Cleave',
      cost: { stamina: 6 },
      description: 'Heavy two-handed swing — bypasses guard.',
      visual: { color: '#ff7a30', flashMs: 180, shake: 0.025, particle: 'arrow', target: 'enemy' },
    },
    {
      key: 'bulwark',
      name: 'Bulwark',
      cost: { stamina: 3 },
      description: 'Brace and recover — heal a little, harden your guard.',
      visual: { color: '#80c0ff', flashMs: 140, shake: 0, particle: 'shield', target: 'player' },
    },
  ],
  rogue: [
    {
      key: 'sneak_attack',
      name: 'Sneak Attack',
      cost: { stamina: 4 },
      description: 'Strike from the shadows for shadow damage.',
      visual: { color: '#9050d0', flashMs: 120, shake: 0.012, particle: 'shadow', target: 'enemy' },
    },
    {
      key: 'poison_strike',
      name: 'Poison Strike',
      cost: { stamina: 5 },
      description: 'A coated blade. Less force, lingering poison.',
      visual: { color: '#60c060', flashMs: 130, shake: 0.008, particle: 'leaf', target: 'enemy' },
    },
    {
      key: 'vanish',
      name: 'Vanish',
      cost: { stamina: 3 },
      description: 'Slip into shadow — guard up, mark them for the next strike.',
      visual: { color: '#3a2050', flashMs: 200, shake: 0, particle: 'shadow', target: 'both' },
    },
  ],
  ranger: [
    {
      key: 'hunters_mark',
      name: "Hunter's Mark",
      cost: { stamina: 3 },
      description: 'Mark a target — your next strikes find their weak points.',
      visual: { color: '#ff4040', flashMs: 130, shake: 0, particle: 'arrow', target: 'enemy' },
    },
    {
      key: 'volley',
      name: 'Volley',
      cost: { stamina: 6 },
      description: 'Three arrows in quick succession.',
      visual: { color: '#c0a040', flashMs: 110, shake: 0.012, particle: 'arrow', target: 'enemy' },
    },
    {
      key: 'beast_strike',
      name: 'Beast Strike',
      cost: { stamina: 4 },
      description: 'A wounding shot that bleeds the target.',
      visual: { color: '#a04040', flashMs: 130, shake: 0.012, particle: 'arrow', target: 'enemy' },
    },
  ],
  wizard: [
    {
      key: 'fireball',
      name: 'Fireball',
      cost: { mp: 8 },
      description: 'A roaring ball of fire — heavy damage.',
      visual: { color: '#ff5020', flashMs: 240, shake: 0.030, particle: 'fire', target: 'enemy' },
    },
    {
      key: 'ice_lance',
      name: 'Ice Lance',
      cost: { mp: 6 },
      description: 'A spear of ice — may stun on impact.',
      visual: { color: '#80d0ff', flashMs: 200, shake: 0.018, particle: 'ice', target: 'enemy' },
    },
    {
      key: 'arcane_bolt',
      name: 'Arcane Bolt',
      cost: { mp: 3 },
      description: 'A cheap bolt of raw magic — reliable, no element.',
      visual: { color: '#c060ff', flashMs: 140, shake: 0.010, particle: 'arcane', target: 'enemy' },
    },
  ],
  cleric: [
    {
      key: 'cure_wounds',
      name: 'Cure Wounds',
      cost: { mp: 6 },
      description: 'Divine light mends your wounds.',
      visual: { color: '#ffe080', flashMs: 220, shake: 0, particle: 'star', target: 'player' },
    },
    {
      key: 'smite',
      name: 'Smite',
      cost: { mp: 5 },
      description: 'Holy radiance — extra against the unholy.',
      visual: { color: '#fff8c0', flashMs: 200, shake: 0.020, particle: 'star', target: 'enemy' },
    },
    {
      key: 'bless',
      name: 'Bless',
      cost: { mp: 3 },
      description: 'A small mending and a steady guard.',
      visual: { color: '#c0e0ff', flashMs: 160, shake: 0, particle: 'star', target: 'player' },
    },
  ],
  bard: [
    {
      key: 'vicious_mockery',
      name: 'Vicious Mockery',
      cost: { mp: 3 },
      description: 'A cutting word — psychic damage, may stun.',
      visual: { color: '#a040c0', flashMs: 140, shake: 0.012, particle: 'arcane', target: 'enemy' },
    },
    {
      key: 'healing_word',
      name: 'Healing Word',
      cost: { mp: 4 },
      description: 'A small song that mends.',
      visual: { color: '#80e080', flashMs: 160, shake: 0, particle: 'star', target: 'player' },
    },
    {
      key: 'inspiration',
      name: 'Inspiration',
      cost: { mp: 5 },
      description: 'A rallying note — heal yourself and unsteady the foe.',
      visual: { color: '#c0a0ff', flashMs: 180, shake: 0.008, particle: 'arcane', target: 'both' },
    },
  ],
};

/** Look up a skill by its stable key across all classes. */
export function getSkillByKey(skillKey: string): CombatSkill | null {
  for (const list of Object.values(CLASS_SKILLS)) {
    const found = list.find((s) => s.key === skillKey);
    if (found) return found;
  }
  return null;
}

/** Convenience: signature (first) skill for a class. Used as default
 *  when callers don't specify a skill key. */
export function getSignatureSkill(classKey: string): CombatSkill | null {
  return CLASS_SKILLS[classKey]?.[0] ?? null;
}

/** Stamina regenerated each player turn that the player is *not* stunned. */
export const STAMINA_REGEN_PER_TURN = 2;

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
  /**
   * The skill key resolved on this tick (transient). Set by the skill
   * branch of `playerAct`, reset to undefined on subsequent ticks.
   * The UI / scene reads this to drive per-skill visuals (color flash,
   * particles, sound) without text-matching the log — text-matching was
   * the bug that made spellFire / spellHeal trigger on incidental
   * substrings in atmospheric copy.
   */
  lastSkillKey?: string;
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

/** Map class + action to an element for weakness/resistance checks.
 *  For skills, prefer the skill-specific element (passed in) — falls back
 *  to old class-based mapping for the basic attack action. */
function getAttackElement(classKey: string, action: CombatAction): string {
  if (action === 'skill') {
    // Legacy fallback only — the skill branch of playerAct passes the
    // explicit element to applyElement directly.
    if (classKey === 'wizard') return 'fire';
    if (classKey === 'rogue') return 'shadow';
    if (classKey === 'bard') return 'shadow';
  }
  return 'physical';
}

// Skill elements are inlined in each skill's switch case below — each
// call to applyElement passes the element directly. A central lookup
// table existed in an earlier draft but proved redundant.

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

/**
 * Execute the player's chosen action. Returns updated state.
 *
 * `skillKey` is required for action='skill' — pass the stable key of
 * one of the player's class skills (CLASS_SKILLS[classKey][...].key).
 * If omitted on a skill action, defaults to the class signature (first
 * entry) so existing tests that just pass 'skill' keep working.
 */
export function playerAct(
  state: CombatState,
  action: CombatAction,
  player: Character,
  monster: Monster,
  skillKey?: string,
): CombatState {
  if (state.phase !== 'player_turn') return state;

  const s = {
    ...state,
    log: [...state.log],
    playerDefending: false,
    playerStatus: { ...state.playerStatus },
    monsterStatus: { ...state.monsterStatus },
    lastSkillKey: undefined as string | undefined,
  };

  // Tick player status effects at the start of their turn
  const playerStunned = tickStatus(s, 'player', 'You');

  // Stamina regenerates a little each turn (only on turns the player
  // actually gets to act — stunned turns don't tick regen). This makes
  // small-cost skills usable repeatedly without bottoming out, while
  // big-cost skills still need a turn or two of buildup.
  if (!playerStunned && player.characterClass.staminaStat) {
    player.restoreStamina(STAMINA_REGEN_PER_TURN);
  }

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
    // Resolve perk source: equipped mainHand \u2192 weapons.json link, else
    // fall back to character weapon. Perk may be undefined.
    const effWeapon = resolveEquippedWeapon(player);
    const perk = effWeapon.perk;
    // Stat key for attack/damage: prefer the equipped weapon, fall back
    // to character weapon. Keeps swapped-in weapons honoring their stat.
    const attackStat = effWeapon.attackStat;

    const roll = dice.d(20);
    const baseAttackBonus = modifier(player.stats[attackStat]) + equipBonus.attack;
    // flat_damage perk: sacrifices accuracy for raw hit power.
    const attackPenalty =
      perk?.kind === 'flat_damage' ? perk.attackPenalty : 0;
    const total = roll + baseAttackBonus - attackPenalty;
    const targetAc = monster.ac + (s.monsterDefending ? 2 : 0);

    // crit_range_bonus widens the natural-crit window. A perk of bonus=1
    // means rolls of 19 or 20 all crit (still need to be a hit).
    const critBonus =
      perk?.kind === 'crit_range_bonus' ? perk.bonus : 0;
    const critThreshold = Math.max(2, 20 - critBonus);
    const isCrit = roll >= critThreshold;

    if (isCrit || (roll !== 1 && total >= targetAc)) {
      // Hit!
      let dmgBase = modifier(player.stats[attackStat]) + 2 + equipBonus.damage;
      // flat_damage perk: a fat additive bonus (the trade-off side of
      // the +bonus / -attackPenalty pair).
      if (perk?.kind === 'flat_damage') {
        dmgBase += perk.bonus;
      }
      // Ranged weapons get a +30% damage bonus so bow-wielding players can
      // reliably finish starter monsters at level 1.
      if (effWeapon.range === 'ranged') {
        dmgBase = Math.ceil(dmgBase * 1.3);
      }
      // crit_multiplier replaces the default 2x on natural crits.
      const critMult =
        perk?.kind === 'crit_multiplier' ? perk.mult : 2;
      let rawDmg = Math.max(1, isCrit ? Math.round(dmgBase * critMult) : dmgBase);
      // damage_bonus_vs_weakness \u2014 multiply BEFORE applyElement so the
      // 1.5x weakness math compounds with the perk multiplier.
      if (
        perk?.kind === 'damage_bonus_vs_weakness'
        && monster.weakness === perk.element
      ) {
        rawDmg = Math.ceil(rawDmg * perk.mult);
        s.log.push({ text: 'The dawn-iron sears the dark.', type: 'info' });
      }
      // damage_type perk overrides the class-derived element. Lets
      // shadow / radiant blades trigger weakness/resistance correctly.
      const element =
        perk?.kind === 'damage_type'
          ? perk.element
          : getAttackElement(player.characterClass.key, 'attack');
      const dmg = applyElement(rawDmg, element, monster, s);
      s.monsterHp = Math.max(0, s.monsterHp - dmg);
      if (isCrit) {
        s.log.push({ text: `A devastating strike. ${dmg} damage.`, type: 'player_hit' });
      } else {
        const hitLines = [
          `Your blade finds its mark. ${dmg} damage.`,
          `A clean strike. ${dmg} damage.`,
          `The blow lands true. ${dmg} damage.`,
        ];
        s.log.push({ text: hitLines[dice.d(3) - 1], type: 'player_hit' });
      }

      // \u2500\u2500 Post-hit weapon perks \u2500\u2500
      if (perk?.kind === 'on_hit_status') {
        // Roll d100 against the chance threshold (chance is 0..1).
        const chanceRoll = dice.d(100);
        if (chanceRoll <= Math.round(perk.chance * 100)) {
          applyStatus(s.monsterStatus, perk.status, perk.duration);
          const flavor: Record<'burn' | 'poison' | 'bleed', string> = {
            burn:   'Flame catches and clings.',
            poison: 'The wound darkens. Poison takes hold.',
            bleed:  'The cut weeps and will not close.',
          };
          s.log.push({ text: flavor[perk.status], type: 'system' });
        }
      }
      if (perk?.kind === 'on_hit_heal') {
        const maxHp =
          player.derived.maxHp
          + getPerkHpBonus(usePlayerStore.getState().perks)
          + getHeartPieceHpBonus(usePlayerStore.getState().heartPieces);
        const before = s.playerHp;
        s.playerHp = Math.min(maxHp, s.playerHp + perk.amount);
        if (s.playerHp > before) {
          s.log.push({ text: `The blade gives back what it takes. +${s.playerHp - before} HP.`, type: 'info' });
        }
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
    const list = CLASS_SKILLS[classKey];
    if (!list || list.length === 0) return state;

    // Default to signature skill if caller didn't specify (existing tests
    // call playerAct(state, 'skill', ...) without a key).
    const skill = skillKey
      ? (list.find((sk) => sk.key === skillKey) ?? list[0])
      : list[0];

    // Resource check — MP for casters, Stamina for melee.
    const mpCost = skill.cost.mp ?? 0;
    const staCost = skill.cost.stamina ?? 0;
    const haveMp = player.mp >= mpCost;
    const haveSta = player.stamina >= staCost;
    if (!haveMp || !haveSta) {
      const need: string[] = [];
      if (!haveMp) need.push(`${mpCost} MP`);
      if (!haveSta) need.push(`${staCost} Stamina`);
      s.log.push({
        text: `Not enough resources for ${skill.name} (need ${need.join(', ')}).`,
        type: 'info',
      });
      s.phase = 'player_turn';
      return s;
    }

    if (mpCost > 0) player.spendMp(mpCost);
    if (staCost > 0) player.spendStamina(staCost);

    s.lastSkillKey = skill.key;

    // Helper for skill attacks that roll-to-hit (so weakness/resist apply).
    const skillAttack = (
      stat: 'str' | 'dex' | 'int' | 'wis' | 'cha',
      baseDmg: number,
      element: string,
      hitText: (dmg: number) => string,
      missText: () => string,
    ) => {
      const r = dice.d(20);
      const b = modifier(player.stats[stat]);
      const t = r + b;
      const ac = monster.ac + (s.monsterDefending ? 2 : 0);
      if (r === 20 || (r !== 1 && t >= ac)) {
        const raw = Math.max(1, baseDmg);
        const dmg = applyElement(raw, element, monster, s);
        s.monsterHp = Math.max(0, s.monsterHp - dmg);
        s.log.push({ text: hitText(dmg), type: 'player_hit' });
      } else {
        s.log.push({ text: missText(), type: 'player_miss' });
      }
    };

    const maxHpWithBonuses = () =>
      player.derived.maxHp
      + getPerkHpBonus(usePlayerStore.getState().perks)
      + getHeartPieceHpBonus(usePlayerStore.getState().heartPieces);

    switch (skill.key) {
      case 'action_surge': {
        for (let strike = 0; strike < 2; strike++) {
          skillAttack(
            'str',
            modifier(player.stats.str) + 3,
            'physical',
            (d) => `Action Surge — strike connects. ${d} damage.`,
            () => `Action Surge — the blow misses.`,
          );
        }
        break;
      }
      case 'cleave': {
        // Heavy single hit; bypasses defending bonus (the swing comes
        // around the guard). Big damage, single roll.
        const r = dice.d(20);
        const b = modifier(player.stats.str);
        const t = r + b;
        const ac = monster.ac;
        if (r === 20 || (r !== 1 && t >= ac)) {
          const raw = Math.max(2, Math.round((modifier(player.stats.str) + 4) * 1.5));
          const dmg = applyElement(raw, 'physical', monster, s);
          s.monsterHp = Math.max(0, s.monsterHp - dmg);
          s.log.push({ text: `Cleave — a sweeping blow. ${dmg} damage.`, type: 'player_hit' });
        } else {
          s.log.push({ text: `Cleave — the swing whistles past.`, type: 'player_miss' });
        }
        break;
      }
      case 'bulwark': {
        const heal = Math.max(1, 4 + modifier(player.stats.con));
        s.playerHp = Math.min(maxHpWithBonuses(), s.playerHp + heal);
        s.playerDefending = true;
        s.log.push({ text: `You set your stance. The shield holds. +${heal} HP.`, type: 'player_hit' });
        break;
      }
      case 'sneak_attack': {
        const raw = 6 + modifier(player.stats.dex) * 2;
        const dmg = applyElement(raw, 'shadow', monster, s);
        s.monsterHp = Math.max(0, s.monsterHp - dmg);
        s.log.push({ text: `You strike from the shadows. ${dmg} damage.`, type: 'player_hit' });
        break;
      }
      case 'poison_strike': {
        applyStatus(s.monsterStatus, 'poison', 3);
        skillAttack(
          'dex',
          2 + modifier(player.stats.dex),
          'poison',
          (d) => `A coated blade slips in. ${d} damage. The wound seeps green.`,
          () => `A coated blade slips past. The poison drips on stone.`,
        );
        break;
      }
      case 'vanish': {
        s.playerDefending = true;
        applyStatus(s.monsterStatus, 'marked', 2);
        s.log.push({ text: `You step into shadow. They lose sight of you.`, type: 'info' });
        break;
      }
      case 'hunters_mark': {
        applyStatus(s.monsterStatus, 'marked', 3);
        skillAttack(
          'dex',
          modifier(player.stats.dex) + 2 + 4,
          'physical',
          (d) => `Marked shot lands. ${d} damage. The mark holds.`,
          () => `Marked shot — missed. The mark holds.`,
        );
        break;
      }
      case 'volley': {
        for (let arrow = 0; arrow < 3; arrow++) {
          skillAttack(
            'dex',
            modifier(player.stats.dex) + 2,
            'physical',
            (d) => `Arrow finds flesh. ${d} damage.`,
            () => `Arrow hisses past.`,
          );
        }
        break;
      }
      case 'beast_strike': {
        applyStatus(s.monsterStatus, 'bleed', 3);
        skillAttack(
          'dex',
          modifier(player.stats.dex) + 3,
          'physical',
          (d) => `A wounding shot. ${d} damage. The wound bleeds.`,
          () => `The shot goes wide. The wound waits.`,
        );
        break;
      }
      case 'fireball': {
        const raw = 10 + modifier(player.stats.int) * 2;
        const dmg = applyElement(raw, 'fire', monster, s);
        s.monsterHp = Math.max(0, s.monsterHp - dmg);
        s.log.push({ text: `Fireball erupts. ${dmg} fire damage.`, type: 'player_hit' });
        break;
      }
      case 'ice_lance': {
        const raw = 7 + modifier(player.stats.int) * 2;
        const dmg = applyElement(raw, 'ice', monster, s);
        s.monsterHp = Math.max(0, s.monsterHp - dmg);
        const stunRoll = dice.d(20);
        if (stunRoll >= 15) {
          applyStatus(s.monsterStatus, 'stun', 1);
          s.log.push({ text: `Ice Lance — ${dmg} damage. ${monster.name} is locked in frost.`, type: 'player_hit' });
        } else {
          s.log.push({ text: `Ice Lance — ${dmg} damage. The cold lingers.`, type: 'player_hit' });
        }
        break;
      }
      case 'arcane_bolt': {
        // Cheap & reliable: lower base than fireball, no roll-to-hit,
        // bypasses fire/ice resists (raw arcane).
        const raw = Math.max(1, 5 + modifier(player.stats.int));
        s.monsterHp = Math.max(0, s.monsterHp - raw);
        s.log.push({ text: `Arcane Bolt strikes true. ${raw} damage.`, type: 'player_hit' });
        break;
      }
      case 'cure_wounds': {
        const healAmt = 8 + modifier(player.stats.wis) * 2;
        s.playerHp = Math.min(maxHpWithBonuses(), s.playerHp + healAmt);
        s.log.push({ text: `Divine light mends your wounds. +${healAmt} HP.`, type: 'player_hit' });
        break;
      }
      case 'smite': {
        // Treat 'shadow' weakness as the unholy bonus.
        let raw = 7 + modifier(player.stats.wis) * 2;
        if (monster.weakness === 'shadow') {
          raw = Math.ceil(raw * 1.4);
          s.log.push({ text: `Holy radiance pierces the dark.`, type: 'info' });
        }
        const dmg = applyElement(raw, 'radiant', monster, s);
        s.monsterHp = Math.max(0, s.monsterHp - dmg);
        s.log.push({ text: `Smite — ${dmg} damage.`, type: 'player_hit' });
        break;
      }
      case 'bless': {
        const heal = Math.max(1, 4 + modifier(player.stats.wis));
        s.playerHp = Math.min(maxHpWithBonuses(), s.playerHp + heal);
        s.playerDefending = true;
        s.log.push({ text: `A small mending. The light steadies your guard. +${heal} HP.`, type: 'player_hit' });
        break;
      }
      case 'vicious_mockery': {
        const raw = 3 + modifier(player.stats.cha);
        const dmg = applyElement(raw, 'shadow', monster, s);
        s.monsterHp = Math.max(0, s.monsterHp - dmg);
        s.monsterDefending = false;
        const stunRoll = dice.d(20);
        if (stunRoll >= 16) {
          applyStatus(s.monsterStatus, 'stun', 1);
          s.log.push({ text: `Vicious Mockery — ${dmg} psychic damage. ${monster.name} reels.`, type: 'player_hit' });
        } else {
          s.log.push({ text: `Vicious Mockery — ${dmg} psychic damage.`, type: 'player_hit' });
        }
        break;
      }
      case 'healing_word': {
        const heal = Math.max(1, 5 + modifier(player.stats.cha));
        s.playerHp = Math.min(maxHpWithBonuses(), s.playerHp + heal);
        s.log.push({ text: `A healing note. +${heal} HP.`, type: 'player_hit' });
        break;
      }
      case 'inspiration': {
        const heal = Math.max(1, 3 + modifier(player.stats.cha));
        s.playerHp = Math.min(maxHpWithBonuses(), s.playerHp + heal);
        applyStatus(s.monsterStatus, 'marked', 3);
        s.log.push({ text: `A rallying note. +${heal} HP. ${monster.name} hesitates.`, type: 'player_hit' });
        break;
      }
      default: {
        // Unknown key — refund + graceful no-op.
        if (mpCost > 0) player.restoreMp(mpCost);
        if (staCost > 0) player.restoreStamina(staCost);
        s.log.push({ text: `${skill.name} fizzles.`, type: 'info' });
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
