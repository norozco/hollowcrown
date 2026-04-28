import { useEffect } from 'react';
import {
  useCharacterCreationStore,
  type CharacterCreationState,
} from '../../state/characterCreationStore';
import { ALL_RACES, getRace, type Race } from '../../engine/race';
import { getClass } from '../../engine/classes';
import { StatLegend } from './StatLegend';
import {
  STAT_KEYS,
  ZERO_STATS,
  type StatBlock,
  type StatKey,
  addStats,
  computeDerived,
  modifier,
} from '../../engine/stats';

/**
 * Step 4 — roll & assign the six stats, plus any race-specific player
 * choices (half-elf bonus stats, dragonborn element).
 *
 * Auto-rolls on first entry. Reroll button regenerates and resets
 * assignment to the canonical order. Each stat row has a dropdown that
 * lets the player swap which rolled value lives there.
 */
export function StepStats() {
  const state = useCharacterCreationStore();
  const { rolls, assignment, raceKey, classKey, roll, swap } = state;

  // Auto-roll the first time the player lands on this step.
  useEffect(() => {
    if (!rolls) roll();
  }, [rolls, roll]);

  if (!rolls || !assignment) {
    return (
      <section className="cc__step-content">
        <p className="cc__hint">Rolling…</p>
      </section>
    );
  }

  const race = raceKey ? getRace(raceKey) : null;
  const klass = classKey ? getClass(classKey) : null;

  // Compute final stats with racial + extra bonuses.
  const rolled: StatBlock = { ...ZERO_STATS };
  STAT_KEYS.forEach((stat, statIdx) => {
    rolled[stat] = rolls[assignment[statIdx]];
  });
  const extra: StatBlock = { ...ZERO_STATS, ...(state.extraBonuses ?? {}) };
  const finalStats: StatBlock = race
    ? addStats(addStats(rolled, race.bonuses), extra)
    : addStats(rolled, extra);

  const derived = klass
    ? computeDerived(finalStats, 1, klass.hpPerLevel, klass.mpStat, klass.staminaStat)
    : null;

  return (
    <section className="cc__step-content">
      <h2 className="cc__title">Roll your stats</h2>
      <p className="cc__hint">
        Six values, rolled fresh. Assign each to a stat. Reroll as often as you like.
      </p>

      <StatLegend />

      <div className="cc__rolls-row">
        <span className="cc__rolls-label">Your rolls:</span>
        <div className="cc__rolls">
          {rolls.map((r, i) => (
            <span key={i} className="cc__roll-token">
              {r}
            </span>
          ))}
        </div>
        <button type="button" className="cc__btn cc__btn--small" onClick={roll}>
          ↻ Reroll
        </button>
      </div>

      <div className="cc__stat-table">
        <div className="cc__stat-head">
          <span>Stat</span>
          <span>Rolled</span>
          <span>Racial</span>
          <span>Final</span>
          <span>Modifier</span>
        </div>
        {STAT_KEYS.map((stat, statIdx) => {
          const rollIdx = assignment[statIdx];
          const rolledValue = rolls[rollIdx];
          const racialBonus = race ? race.bonuses[stat] : 0;
          const final = finalStats[stat];
          const mod = modifier(final);
          return (
            <div key={stat} className="cc__stat-row">
              <label className="cc__stat-label">{stat.toUpperCase()}</label>
              <select
                className="cc__select"
                value={rollIdx}
                onChange={(e) => swap(statIdx, parseInt(e.target.value, 10))}
                aria-label={`${stat.toUpperCase()} rolled value`}
              >
                {rolls.map((r, i) => (
                  <option key={i} value={i}>
                    {r}
                  </option>
                ))}
              </select>
              <span className={`cc__stat-bonus${racialBonus > 0 ? ' is-positive' : racialBonus < 0 ? ' is-negative' : ''}`}>
                {fmtSigned(racialBonus)}
              </span>
              <span className="cc__stat-final">{rolledValue + racialBonus + (extra[stat] ?? 0)} </span>
              <span className={`cc__stat-mod${mod > 0 ? ' is-positive' : mod < 0 ? ' is-negative' : ''}`}>
                {fmtSigned(mod)}
              </span>
            </div>
          );
        })}
      </div>

      {derived && (
        <div className="cc__derived">
          <span><strong>Max HP</strong> {derived.maxHp}</span>
          {derived.maxMp > 0 && <span><strong>Max MP</strong> {derived.maxMp}</span>}
          <span><strong>AC</strong> {derived.ac}</span>
          <span><strong>Initiative</strong> {fmtSigned(derived.initiativeBonus)}</span>
        </div>
      )}

      {race?.playerChoiceBonuses && <PlayerChoiceBonuses race={race} state={state} />}
      {race?.playerChoiceOption && <PlayerChoiceOption race={race} state={state} />}
    </section>
  );
}

function fmtSigned(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/** Half-Elf: choose N stats (excluding CHA) for +1 each. */
function PlayerChoiceBonuses({ race, state }: { race: Race; state: CharacterCreationState }) {
  const choice = race.playerChoiceBonuses!;
  const setExtraBonuses = state.setExtraBonuses;
  const current = state.extraBonuses ?? {};
  const excluded = new Set(choice.excludeStats ?? []);
  const eligible = STAT_KEYS.filter((s) => !excluded.has(s));
  const selectedCount = eligible.filter((s) => current[s] === choice.amount).length;

  const toggle = (stat: StatKey) => {
    const next: Partial<StatBlock> = { ...current };
    if (next[stat] === choice.amount) {
      delete next[stat];
    } else if (selectedCount < choice.count) {
      next[stat] = choice.amount;
    }
    setExtraBonuses(Object.keys(next).length ? next : null);
  };

  return (
    <fieldset className="cc__player-choice">
      <legend>Choose {choice.count} more stats for +{choice.amount} each</legend>
      <p className="cc__hint cc__hint--small">{choice.description}</p>
      <div className="cc__pc-options">
        {eligible.map((stat) => {
          const active = current[stat] === choice.amount;
          const disabled = !active && selectedCount >= choice.count;
          return (
            <label
              key={stat}
              className={`cc__pc-pill${active ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}`}
            >
              <input
                type="checkbox"
                checked={active}
                disabled={disabled}
                onChange={() => toggle(stat)}
              />
              <span>{stat.toUpperCase()}</span>
            </label>
          );
        })}
      </div>
      <p className="cc__pc-status">
        Selected {selectedCount}/{choice.count}
      </p>
    </fieldset>
  );
}

/** Dragonborn: pick an element. */
function PlayerChoiceOption({ race, state }: { race: Race; state: CharacterCreationState }) {
  const choice = race.playerChoiceOption!;
  const value = state.playerChoice;

  return (
    <fieldset className="cc__player-choice">
      <legend>{choice.description}</legend>
      <div className="cc__pc-options">
        {choice.options.map((opt) => (
          <label
            key={opt}
            className={`cc__pc-pill${value === opt ? ' is-selected' : ''}`}
          >
            <input
              type="radio"
              name={choice.field}
              value={opt}
              checked={value === opt}
              onChange={() => state.setPlayerChoice(opt)}
            />
            <span>{opt[0].toUpperCase() + opt.slice(1)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Suppress "unused import" when ALL_RACES isn't referenced anymore.
void ALL_RACES;
