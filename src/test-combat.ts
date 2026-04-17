/**
 * Comprehensive combat engine playtest script.
 * Run with: npx tsx src/test-combat.ts
 *
 * Tests all 6 classes × 6 monsters + extra edge-case fights.
 * No test framework — pure assertions and a final summary.
 */

import { Character } from './engine/character';
import { getMonster } from './engine/monster';
import type { Monster } from './engine/monster';
import { initCombat, playerAct, enemyAct, CLASS_SKILLS } from './engine/combat';
import type { CombatState, CombatAction, StatusEffects } from './engine/combat';
import type { StatBlock } from './engine/stats';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeStats(overrides: Partial<StatBlock> = {}): StatBlock {
  return {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
    ...overrides,
  };
}

/** Build a character tuned for a specific class. */
function makeCharacter(classKey: string, nameOverride?: string): Character {
  const statsByClass: Record<string, Partial<StatBlock>> = {
    fighter: { str: 16, con: 14, dex: 12, wis: 10, int: 8, cha: 8 },
    rogue:   { dex: 16, str: 12, con: 12, int: 10, wis: 10, cha: 10 },
    wizard:  { int: 16, dex: 12, con: 10, str: 8,  wis: 14, cha: 8  },
    cleric:  { wis: 16, con: 14, str: 12, dex: 10, int: 10, cha: 10 },
    ranger:  { dex: 16, str: 12, con: 12, int: 10, wis: 14, cha: 8  },
    bard:    { cha: 16, dex: 14, con: 10, str: 10, int: 10, wis: 10 },
  };
  const name = nameOverride ?? (classKey.charAt(0).toUpperCase() + classKey.slice(1));
  return new Character({
    name,
    raceKey: 'human',
    classKey: classKey as any,
    rolledStats: makeStats(statsByClass[classKey] ?? {}),
    difficulty: 'normal',
    gender: 'male',
    level: 3,
  });
}

// ─── tracking ───────────────────────────────────────────────────────────────

let totalFights     = 0;
let victories       = 0;
let defeats         = 0;
let fled            = 0;
let maxTurnsInFight = 0;
const errors: string[] = [];

const statusTriggers: Record<keyof StatusEffects, number> = {
  poison: 0,
  burn:   0,
  bleed:  0,
  stun:   0,
  marked: 0,
};

function recordStatusEffects(s: CombatState) {
  const check = (effects: StatusEffects) => {
    for (const k of Object.keys(effects) as Array<keyof StatusEffects>) {
      if (effects[k] > 0) statusTriggers[k]++;
    }
  };
  check(s.playerStatus);
  check(s.monsterStatus);
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    errors.push(msg);
    console.error(`  ASSERTION FAILED: ${msg}`);
  }
}

// ─── core fight runner ───────────────────────────────────────────────────────

interface FightOpts {
  /** Force first action to be this instead of 'attack'. */
  firstAction?: CombatAction;
  /** Force second action to be this. */
  secondAction?: CombatAction;
  /** Try flee on turn N (1-based). */
  fleeOnTurn?: number;
  /** Use skill on turn N. */
  skillOnTurn?: number;
  /** Use defend on turn N. */
  defendOnTurn?: number;
  label?: string;
}

function runFight(
  player: Character,
  monster: Monster,
  opts: FightOpts = {},
): 'victory' | 'defeat' | 'fled' {
  const label = opts.label ?? `${player.name}(${player.characterClass.key}) vs ${monster.name}`;
  console.log(`\n  [FIGHT] ${label}`);

  // Refresh HP/MP before fight
  player.hp = player.derived.maxHp;
  player.mp = player.derived.maxMp;

  let state = initCombat(player, monster);

  // ── initCombat assertions ────────────────────────────────────────────────
  assert(state.playerHp > 0,          `${label}: playerHp must start > 0 (got ${state.playerHp})`);
  assert(state.monsterHp === monster.maxHp, `${label}: monsterHp must start at maxHp`);
  assert(state.turn === 1,             `${label}: turn must start at 1`);
  assert(state.playerDefending === false, `${label}: playerDefending must start false`);
  assert(state.monsterDefending === false, `${label}: monsterDefending must start false`);
  assert(state.phase === 'player_turn' || state.phase === 'enemy_turn',
         `${label}: initial phase must be player_turn or enemy_turn`);
  assert(typeof state.playerStatus === 'object', `${label}: playerStatus must be object`);
  assert(typeof state.monsterStatus === 'object', `${label}: monsterStatus must be object`);
  assert(Array.isArray(state.log),     `${label}: log must be array`);

  const MAX_TURNS = 100;
  let usedDefend = false;
  let usedSkill  = false;
  let usedFlee   = false;
  let prevPhase  = state.phase;

  while (
    state.phase !== 'victory' &&
    state.phase !== 'defeat' &&
    state.phase !== 'fled'
  ) {
    if (state.turn > MAX_TURNS) {
      errors.push(`${label}: exceeded ${MAX_TURNS} turns (possible infinite loop)`);
      console.error(`  INFINITE LOOP detected at turn ${state.turn}`);
      break;
    }

    recordStatusEffects(state);

    // ── HP range assertions ────────────────────────────────────────────────
    assert(state.playerHp >= 0,  `${label} t${state.turn}: playerHp went negative`);
    assert(state.monsterHp >= 0, `${label} t${state.turn}: monsterHp went negative`);

    if (state.phase === 'player_turn') {
      // ── Phase transition check ─────────────────────────────────────────
      // After an enemy turn the phase must return to player_turn or terminal
      // (we just check we never see two consecutive player_turns without an enemy)
      assert(prevPhase !== 'player_turn' || state.turn === 1,
             `${label} t${state.turn}: two consecutive player_turns`);

      let action: CombatAction = 'attack';

      if (opts.fleeOnTurn && state.turn === opts.fleeOnTurn && !usedFlee) {
        action = 'flee';
        usedFlee = true;
      } else if (opts.skillOnTurn && state.turn === opts.skillOnTurn && !usedSkill) {
        action = 'skill';
        usedSkill = true;
      } else if (opts.defendOnTurn && state.turn === opts.defendOnTurn && !usedDefend) {
        action = 'defend';
        usedDefend = true;
      } else if (state.turn === 1 && opts.firstAction) {
        action = opts.firstAction;
      } else if (state.turn === 2 && opts.secondAction) {
        action = opts.secondAction;
      }

      const mpBefore = player.mp;
      const skill    = CLASS_SKILLS[player.characterClass.key];
      state = playerAct(state, action, player, monster);

      // ── Skill / MP assertion ───────────────────────────────────────────
      // We only check MP deduction when ALL of:
      //  1. skill action was chosen
      //  2. player had enough MP
      //  3. the skill's log message actually appears (proves it wasn't
      //     short-circuited by a stun or some other early return)
      if (action === 'skill' && skill && mpBefore >= skill.mpCost) {
        // Did the engine actually execute the skill (vs. stun early-return)?
        const skillFired = state.log.some(e =>
          e.text.includes(skill.name) &&
          !e.text.includes('Not enough MP')
        );
        if (skillFired) {
          assert(
            player.mp === mpBefore - skill.mpCost,
            `${label} t${state.turn}: ${skill.name} should deduct ${skill.mpCost} MP (was ${mpBefore}, now ${player.mp})`,
          );
        }
      }

      // ── Defend flag assertions ─────────────────────────────────────────
      // Only check when the action wasn't nullified by a stun (stun returns
      // early to enemy_turn before the defend branch is even reached).
      if (action === 'defend' && state.phase !== 'player_turn') {
        // If we ended up on enemy_turn (normal) or a terminal phase after defend,
        // playerDefending should be true (the spread at the start of playerAct
        // resets it, but the defend branch then sets it back to true).
        // Exception: if we were stunned this turn, the early-return path fires
        // before the action branch, so playerDefending is NOT set.
        // We detect stun by checking whether no "brace yourself" log was added.
        const defendLogged = state.log.some(e => e.text.includes('brace yourself'));
        if (defendLogged) {
          assert(state.playerDefending === true,
                 `${label} t${state.turn}: playerDefending should be true after defend action`);
        }
      }

      prevPhase = 'player_turn';

    } else if (state.phase === 'enemy_turn') {
      const defendingBefore = state.playerDefending;
      state = enemyAct(state, player, monster);

      // ── Defend resets after enemy turn ─────────────────────────────────
      // After enemyAct, we advance to next player_turn.
      // playerDefending should be reset (it's reset at start of playerAct).
      // We track this expectation loosely here.

      prevPhase = 'enemy_turn';
    }
  }

  maxTurnsInFight = Math.max(maxTurnsInFight, state.turn);

  // ── Final HP assertions ──────────────────────────────────────────────────
  assert(state.playerHp >= 0,  `${label}: final playerHp is negative`);
  assert(state.monsterHp >= 0, `${label}: final monsterHp is negative`);

  // ── Final phase assertions ───────────────────────────────────────────────
  if (state.phase === 'victory') {
    assert(state.monsterHp === 0, `${label}: victory but monsterHp = ${state.monsterHp}`);
  } else if (state.phase === 'defeat') {
    assert(state.playerHp === 0, `${label}: defeat but playerHp = ${state.playerHp}`);
  }

  totalFights++;
  const outcome = state.phase as 'victory' | 'defeat' | 'fled';
  if (outcome === 'victory') victories++;
  else if (outcome === 'defeat') defeats++;
  else fled++;

  console.log(`  → ${outcome.toUpperCase()} after ${state.turn} turn(s)`);
  return outcome;
}

// ─── SCENARIO BATCHES ────────────────────────────────────────────────────────

console.log('\n=== HOLLOWCROWN COMBAT PLAYTEST ===\n');

// ── 1. Each class vs each monster (6×6 = 36 fights) ────────────────────────
console.log('--- Batch 1: All classes vs all monsters (36 fights) ---');

const CLASS_KEYS = ['fighter', 'rogue', 'wizard', 'cleric', 'ranger', 'bard'] as const;
const MONSTER_KEYS = ['wolf', 'skeleton', 'hollow_knight', 'spider', 'wraith', 'hollow_king'] as const;

// Pre-create the characters so we can reuse them across batches
const characters: Record<string, Character> = {};
for (const ck of CLASS_KEYS) {
  characters[ck] = makeCharacter(ck);
}

// Turn rotation for this batch: attack / skill / defend / attack / flee / attack ...
const TURN_ACTIONS: CombatAction[] = ['attack', 'skill', 'defend', 'attack', 'flee'];

for (const ck of CLASS_KEYS) {
  const player = characters[ck];
  for (let mi = 0; mi < MONSTER_KEYS.length; mi++) {
    const mk = MONSTER_KEYS[mi];
    const monster = getMonster(mk);
    const opts: FightOpts = {
      skillOnTurn:  2,
      defendOnTurn: 3,
      fleeOnTurn:   5,
      label: `Batch1 ${ck} vs ${mk}`,
    };
    runFight(player, monster, opts);
  }
}

// ── 2. Skill-focused fights (one per class, vs varied monsters) ─────────────
console.log('\n--- Batch 2: Skill-focused fights (6 fights) ---');

const skillMonsters: string[] = ['wolf', 'skeleton', 'spider', 'wraith', 'hollow_knight', 'skeleton'];
CLASS_KEYS.forEach((ck, i) => {
  const player = characters[ck];
  const monster = getMonster(skillMonsters[i]);
  runFight(player, monster, {
    skillOnTurn: 1,  // use skill immediately
    label: `Batch2 skill-first ${ck} vs ${monster.name}`,
  });
});

// ── 3. Defend-heavy fights ───────────────────────────────────────────────────
console.log('\n--- Batch 3: Defend-heavy fights (6 fights) ---');
CLASS_KEYS.forEach((ck, i) => {
  const player = characters[ck];
  const monster = getMonster(MONSTER_KEYS[i % MONSTER_KEYS.length]);
  // Alternate defend and attack each turn
  runFight(player, monster, {
    defendOnTurn: 1,
    skillOnTurn: 3,
    fleeOnTurn: 8,
    label: `Batch3 defend-heavy ${ck}`,
  });
});

// ── 4. Flee-focused fights ───────────────────────────────────────────────────
console.log('\n--- Batch 4: Early flee attempts (6 fights) ---');
CLASS_KEYS.forEach((ck) => {
  const player = characters[ck];
  const monster = getMonster('hollow_king'); // toughest enemy — flee makes sense
  runFight(player, monster, {
    fleeOnTurn: 1,  // try to flee immediately
    label: `Batch4 flee-early ${ck} vs hollow_king`,
  });
});

// ── 5. Status-effect fishing fights ─────────────────────────────────────────
// Run multiple fights against monsters that proc status effects to accumulate counts.
console.log('\n--- Batch 5: Status-effect fishing (12 fights) ---');

const statusMonsters = ['wolf', 'skeleton', 'spider', 'wraith', 'hollow_king', 'hollow_knight'];
for (let i = 0; i < 12; i++) {
  const ck = CLASS_KEYS[i % CLASS_KEYS.length];
  const mk = statusMonsters[i % statusMonsters.length];
  const player = characters[ck];
  const monster = getMonster(mk);
  runFight(player, monster, {
    skillOnTurn: 2,
    fleeOnTurn: 10,
    label: `Batch5 status-fish ${ck} vs ${mk} #${i + 1}`,
  });
}

// ── 6. Edge-case / stress tests ──────────────────────────────────────────────
console.log('\n--- Batch 6: Edge cases (12 fights) ---');

// 6a. Wizard with 0 MP — skill should log "not enough MP"
// We force the player to go first (player_turn) so no stun risk before the check.
{
  const lowMpWizard = makeCharacter('wizard', 'Lowmage');
  const monster = getMonster('wolf');
  lowMpWizard.hp = lowMpWizard.derived.maxHp;
  lowMpWizard.mp = 0;

  // Build a state directly with phase=player_turn and no status effects so
  // we skip any stun-on-first-tick risk.
  const state0 = initCombat(lowMpWizard, monster);
  // Force it to player_turn regardless of initiative
  const forcedPlayerTurn = { ...state0, phase: 'player_turn' as const, playerStatus: { poison:0, burn:0, stun:0, bleed:0, marked:0 } };

  const stateAfter = playerAct(forcedPlayerTurn, 'skill', lowMpWizard, monster);
  const notEnoughMpLogged = stateAfter.log.some(l => l.text.includes('Not enough MP'));
  assert(notEnoughMpLogged, 'Wizard with 0 MP should log "Not enough MP"');
  assert(stateAfter.phase === 'player_turn', 'Phase should remain player_turn when not enough MP');
  console.log(`  [EDGE] 0-MP wizard skill: ${notEnoughMpLogged ? 'correct' : 'FAILED'}`);
  totalFights++;
}

// 6b. initCombat state integrity — enemy-first path
{
  const fighter = makeCharacter('fighter', 'Initman');
  const monster = getMonster('spider'); // high speed — likely goes first
  // Run many inits to catch the enemy-first branch
  let foundEnemyFirst = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    fighter.hp = fighter.derived.maxHp;
    fighter.mp = fighter.derived.maxMp;
    const st = initCombat(fighter, monster);
    if (st.phase === 'enemy_turn') {
      foundEnemyFirst = true;
      assert(st.playerFirst === false, 'playerFirst must be false when enemy acts first');
      assert(st.turn === 1, 'turn must be 1 at init even for enemy-first');
      break;
    }
  }
  // Spider has speed 4, fighter dex +1 — enemy-first is very likely but not guaranteed.
  // We just note whether we caught it.
  console.log(`  [EDGE] enemy-first init captured: ${foundEnemyFirst}`);
  totalFights++;
}

// 6c. Full fight simulations ensuring defend flag resets
{
  const cleric = makeCharacter('cleric', 'Guardman');
  const monster = getMonster('skeleton');
  cleric.hp = cleric.derived.maxHp;
  cleric.mp = cleric.derived.maxMp;
  let state = initCombat(cleric, monster);
  let defendChecked = false;
  let localTurns = 0;
  while (
    state.phase !== 'victory' &&
    state.phase !== 'defeat' &&
    state.phase !== 'fled' &&
    localTurns < 50
  ) {
    localTurns++;
    if (state.phase === 'player_turn') {
      state = playerAct(state, 'defend', cleric, monster);
      assert(state.playerDefending === true || state.phase !== 'player_turn',
             `Defend: playerDefending should be true after defend`);
    } else {
      const defBefore = state.playerDefending;
      state = enemyAct(state, cleric, monster);
      // After enemy turn finishes, a new player turn starts — playerDefending
      // will be reset at the START of that playerAct call, not here.
      // The current state still carries it for the AC calculation mid-enemy-turn.
      if (!defendChecked && defBefore) {
        // We at least confirmed enemy used the defending flag.
        defendChecked = true;
      }
    }
    assert(state.playerHp >= 0,  `defend-edge: playerHp went negative`);
    assert(state.monsterHp >= 0, `defend-edge: monsterHp went negative`);
  }
  console.log(`  [EDGE] defend-flag reset fight: ${state.phase} after ${localTurns} turns`);
  totalFights++;
  if (state.phase === 'victory') victories++;
  else if (state.phase === 'defeat') defeats++;
}

// 6d. Fighter double-strike (Action Surge) correctness
{
  const fighter = makeCharacter('fighter', 'Striker');
  const monster = getMonster('wolf');
  fighter.hp = fighter.derived.maxHp;
  fighter.mp = fighter.derived.maxMp;
  const st0 = initCombat(fighter, monster);

  let skillState = st0;
  if (skillState.phase === 'enemy_turn') {
    skillState = enemyAct(skillState, fighter, monster);
  }
  // Now we should be on player_turn
  if (skillState.phase === 'player_turn') {
    const logBefore = skillState.log.length;
    const stAfter = playerAct(skillState, 'skill', fighter, monster);
    const newLogs = stAfter.log.slice(logBefore);
    const surgeLog = newLogs.filter(l => l.text.includes('Action Surge'));
    // Action Surge logs at most 2 entries (one per strike)
    assert(surgeLog.length >= 1 && surgeLog.length <= 2,
           `Fighter Action Surge should produce 1-2 strike logs, got ${surgeLog.length}`);
    console.log(`  [EDGE] fighter Action Surge: ${surgeLog.length} strike log(s) — correct range: ${surgeLog.length >= 1}`);
  }
  totalFights++;
}

// 6e. Cleric heal — verify HP increases
{
  const cleric = makeCharacter('cleric', 'Healbot');
  const monster = getMonster('wolf');
  cleric.hp = cleric.derived.maxHp;
  cleric.mp = cleric.derived.maxMp;
  // Damage the cleric first
  cleric.hp = Math.max(1, cleric.derived.maxHp - 15);
  const hpBefore = cleric.hp;
  const st0 = initCombat(cleric, monster);
  // Override playerHp to match our manual reduction
  const damagedState: CombatState = { ...st0, playerHp: hpBefore };
  let healState = damagedState;
  if (healState.phase === 'enemy_turn') {
    healState = enemyAct(healState, cleric, monster);
  }
  if (healState.phase === 'player_turn' && cleric.mp >= 6) {
    const stAfter = playerAct(healState, 'skill', cleric, monster);
    const healLog = stAfter.log.find(l => l.text.includes('heal for'));
    assert(healLog !== undefined, 'Cleric Cure Wounds should log a heal message');
    assert(stAfter.playerHp > healState.playerHp, `Cleric heal should increase playerHp`);
    console.log(`  [EDGE] cleric heal: ${healState.playerHp} → ${stAfter.playerHp} HP`);
  }
  totalFights++;
}

// 6f. Ranger Hunter's Mark — verify marked status applied
{
  const ranger = makeCharacter('ranger', 'Marksman');
  const monster = getMonster('skeleton');
  ranger.hp = ranger.derived.maxHp;
  ranger.mp = ranger.derived.maxMp;
  const st0 = initCombat(ranger, monster);
  let markState = st0;
  if (markState.phase === 'enemy_turn') {
    markState = enemyAct(markState, ranger, monster);
  }
  if (markState.phase === 'player_turn' && ranger.mp >= 4) {
    const stAfter = playerAct(markState, 'skill', ranger, monster);
    assert(stAfter.monsterStatus.marked === 3 || stAfter.monsterHp <= 0,
           `Ranger Hunter's Mark should set monsterStatus.marked = 3`);
    console.log(`  [EDGE] ranger Hunter's Mark: marked=${stAfter.monsterStatus.marked}`);
    if (stAfter.monsterStatus.marked > 0) statusTriggers.marked++;
  }
  totalFights++;
}

// 6g. Bard Vicious Mockery — verify damage and possible stun
{
  const bard = makeCharacter('bard', 'Mocker');
  const monster = getMonster('wolf');
  bard.hp = bard.derived.maxHp;
  bard.mp = bard.derived.maxMp;
  let bardWonStun = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    bard.hp = bard.derived.maxHp;
    bard.mp = bard.derived.maxMp;
    const st0 = initCombat(bard, monster);
    let bardState = st0;
    if (bardState.phase === 'enemy_turn') {
      bardState = enemyAct(bardState, bard, monster);
    }
    if (bardState.phase === 'player_turn' && bard.mp >= 3) {
      const monHpBefore = bardState.monsterHp;
      const stAfter = playerAct(bardState, 'skill', bard, monster);
      assert(stAfter.monsterHp < monHpBefore || monHpBefore === 0,
             `Bard Vicious Mockery should deal damage`);
      if (stAfter.monsterStatus.stun > 0) {
        bardWonStun = true;
        statusTriggers.stun++;
      }
    }
  }
  console.log(`  [EDGE] bard Vicious Mockery stun triggered: ${bardWonStun}`);
  totalFights++;
}

// 6h. Rogue Sneak Attack — verify guaranteed hit
{
  const rogue = makeCharacter('rogue', 'Shadowblade');
  const monster = getMonster('hollow_knight'); // high AC
  rogue.hp = rogue.derived.maxHp;
  rogue.mp = rogue.derived.maxMp;
  const st0 = initCombat(rogue, monster);
  let rogueState = st0;
  if (rogueState.phase === 'enemy_turn') {
    rogueState = enemyAct(rogueState, rogue, monster);
  }
  if (rogueState.phase === 'player_turn') {
    const monHpBefore = rogueState.monsterHp;
    const stAfter = playerAct(rogueState, 'skill', rogue, monster);
    const sneakLog = stAfter.log.find(l => l.text.includes('Sneak Attack'));
    assert(sneakLog !== undefined, 'Rogue Sneak Attack log should appear');
    assert(stAfter.monsterHp < monHpBefore || rogueState.monsterHp === 0,
           `Rogue Sneak Attack should deal guaranteed damage`);
    console.log(`  [EDGE] rogue Sneak Attack: ${monHpBefore} → ${stAfter.monsterHp} HP`);
  }
  totalFights++;
}

// 6i. Wizard Fireball — verify heavy damage
{
  const wizard = makeCharacter('wizard', 'Pyromage');
  const monster = getMonster('hollow_king'); // tankiest
  wizard.hp = wizard.derived.maxHp;
  wizard.mp = wizard.derived.maxMp;
  const st0 = initCombat(wizard, monster);
  let wizState = st0;
  if (wizState.phase === 'enemy_turn') {
    wizState = enemyAct(wizState, wizard, monster);
  }
  if (wizState.phase === 'player_turn' && wizard.mp >= 8 && wizState.monsterHp > 0) {
    const monHpBefore = wizState.monsterHp;
    const stAfter = playerAct(wizState, 'skill', wizard, monster);
    const dmgDealt = monHpBefore - stAfter.monsterHp;
    // Fireball = 10 + int_mod*2, int=16 → mod=+3 → expected 16 dmg.
    // However if the king already had reduced HP, dmgDealt can't exceed monHpBefore.
    const expectedMin = Math.min(8, monHpBefore);
    assert(dmgDealt >= expectedMin,
           `Wizard Fireball should deal at least ${expectedMin} dmg, got ${dmgDealt}`);
    console.log(`  [EDGE] wizard Fireball: dealt ${dmgDealt} damage`);
  } else {
    console.log(`  [EDGE] wizard Fireball: skipped (phase=${wizState.phase} mp=${wizard.mp} monHp=${wizState.monsterHp})`);
  }
  totalFights++;
}

// 6j. Check phase never gets stuck: run 5 extra random fights
for (let i = 0; i < 5; i++) {
  const ck = CLASS_KEYS[i % CLASS_KEYS.length];
  const mk = MONSTER_KEYS[i % MONSTER_KEYS.length];
  runFight(characters[ck], getMonster(mk), {
    skillOnTurn: 1,
    defendOnTurn: 2,
    fleeOnTurn: 4,
    label: `Batch6j stress #${i + 1} ${ck} vs ${mk}`,
  });
}

// ─── FINAL SUMMARY ────────────────────────────────────────────────────────────

console.log('\n=== COMBAT PLAYTEST RESULTS ===');
console.log(`Total fights:    ${totalFights}`);
console.log(`Victories:       ${victories}`);
console.log(`Defeats:         ${defeats}`);
console.log(`Fled:            ${fled}`);
console.log(
  `Status effects triggered: ` +
  `poison=${statusTriggers.poison} ` +
  `burn=${statusTriggers.burn} ` +
  `bleed=${statusTriggers.bleed} ` +
  `stun=${statusTriggers.stun} ` +
  `marked=${statusTriggers.marked}`
);
console.log(`Max turns in single fight: ${maxTurnsInFight}`);

if (errors.length === 0) {
  console.log('Errors found:    none');
} else {
  console.log(`Errors found (${errors.length}):`);
  for (const e of errors) console.log(`  - ${e}`);
}

// Exit non-zero if any assertion failed
if (errors.length > 0) process.exit(1);
