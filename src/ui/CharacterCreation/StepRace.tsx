import { useCharacterCreationStore } from '../../state/characterCreationStore';
import { ALL_RACES, type Race } from '../../engine/race';
import type { StatBlock, StatKey } from '../../engine/stats';
import { StatLegend } from './StatLegend';

/**
 * Step 2 — pick a race. Grid of all 10. Selecting one shows a detail
 * panel beside the grid with full mechanical info.
 */
export function StepRace() {
  const raceKey = useCharacterCreationStore((s) => s.raceKey);
  const setRace = useCharacterCreationStore((s) => s.setRace);

  const selected = raceKey ? ALL_RACES.find((r) => r.key === raceKey) : null;

  return (
    <section className="cc__step-content">
      <h2 className="cc__title">Choose your race</h2>
      <p className="cc__hint">Each race carries its own gifts, its own troubles, and its own welcome in the world.</p>

      <StatLegend />

      <div className="cc__split">
        <div className="cc__cards cc__cards--five">
          {ALL_RACES.map((r) => (
            <button
              key={r.key}
              type="button"
              className={`cc__card cc__card--small${r.key === raceKey ? ' cc__card--selected' : ''}`}
              onClick={() => setRace(r.key)}
              aria-pressed={r.key === raceKey}
            >
              <h3 className="cc__card-title">{r.name}</h3>
              <p className="cc__card-bonuses">{formatBonuses(r.bonuses)}</p>
            </button>
          ))}
        </div>

        <aside className="cc__detail" aria-live="polite">
          {selected ? <RaceDetail race={selected} /> : <SelectPrompt />}
        </aside>
      </div>
    </section>
  );
}

function SelectPrompt() {
  return (
    <div className="cc__detail-empty">
      <p>Select a race to see its full description.</p>
    </div>
  );
}

function RaceDetail({ race }: { race: Race }) {
  return (
    <div className="cc__detail-body">
      <h3 className="cc__detail-name">{race.name}</h3>
      <p className="cc__detail-flavor">{race.flavor}</p>

      <dl className="cc__detail-list">
        <dt>Stat bonuses</dt>
        <dd>{formatBonusesVerbose(race.bonuses)}</dd>

        <dt>Passive — {race.passive.name}</dt>
        <dd>{race.passive.description}</dd>

        <dt>Active — {race.active.name}</dt>
        <dd>{race.active.description}</dd>

        <dt>World interaction</dt>
        <dd>{race.world}</dd>

        {race.playerChoiceBonuses && (
          <>
            <dt>Extra player-choice bonuses</dt>
            <dd>{race.playerChoiceBonuses.description}</dd>
          </>
        )}
        {race.playerChoiceOption && (
          <>
            <dt>Creation choice</dt>
            <dd>{race.playerChoiceOption.description}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

const STAT_ORDER: StatKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function formatBonuses(b: StatBlock): string {
  const parts = STAT_ORDER.flatMap((k) => {
    const v = b[k];
    if (v === 0) return [];
    return [`${k.toUpperCase()} ${v > 0 ? '+' : ''}${v}`];
  });
  return parts.length ? parts.join(', ') : '—';
}

function formatBonusesVerbose(b: StatBlock): string {
  const parts = STAT_ORDER.map((k) => {
    const v = b[k];
    return `${k.toUpperCase()} ${v >= 0 ? '+' : ''}${v}`;
  });
  return parts.join(', ');
}
