import { useCharacterCreationStore } from '../../state/characterCreationStore';
import { ALL_CLASSES, type CharacterClass } from '../../engine/classes';
import { ALL_RACES } from '../../engine/race';

/**
 * Step 3 — pick a class. Shows all 6 in a grid; selecting one opens a
 * detail panel. If the player has already chosen a race, suggested
 * race-class synergies are highlighted (any race whose bonuses include
 * one of the class's primary stats).
 */
export function StepClass() {
  const raceKey = useCharacterCreationStore((s) => s.raceKey);
  const classKey = useCharacterCreationStore((s) => s.classKey);
  const setClass = useCharacterCreationStore((s) => s.setClass);

  const selected = classKey ? ALL_CLASSES.find((c) => c.key === classKey) : null;
  const playerRace = raceKey ? ALL_RACES.find((r) => r.key === raceKey) : null;

  return (
    <section className="cc__step-content">
      <h2 className="cc__title">Choose your class</h2>
      <p className="cc__hint">
        Class defines your role, HP per level, and signature ability. Race + class is your build.
      </p>

      <div className="cc__split">
        <div className="cc__cards cc__cards--three">
          {ALL_CLASSES.map((c) => {
            const isSynergy = playerRace
              ? c.primaryStats.some((s) => playerRace.bonuses[s] > 0)
              : false;
            return (
              <button
                key={c.key}
                type="button"
                className={[
                  'cc__card',
                  'cc__card--small',
                  c.key === classKey ? 'cc__card--selected' : '',
                  isSynergy ? 'cc__card--synergy' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setClass(c.key)}
                aria-pressed={c.key === classKey}
              >
                <h3 className="cc__card-title">{c.name}</h3>
                <p className="cc__card-bonuses">
                  {c.primaryStats.map((s) => s.toUpperCase()).join(' / ')}
                  &nbsp;· +{c.hpPerLevel} HP/lvl
                </p>
                {isSynergy && (
                  <span className="cc__card-badge" title={`${playerRace!.name} synergy`}>
                    ★
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <aside className="cc__detail" aria-live="polite">
          {selected ? <ClassDetail klass={selected} /> : <SelectPrompt />}
        </aside>
      </div>

      {playerRace && (
        <p className="cc__hint cc__hint--small">
          ★ = race/class synergy with {playerRace.name}
        </p>
      )}
    </section>
  );
}

function SelectPrompt() {
  return (
    <div className="cc__detail-empty">
      <p>Select a class to see its full description.</p>
    </div>
  );
}

function ClassDetail({ klass }: { klass: CharacterClass }) {
  return (
    <div className="cc__detail-body">
      <h3 className="cc__detail-name">{klass.name}</h3>
      <p className="cc__detail-flavor">{klass.role}</p>

      <dl className="cc__detail-list">
        <dt>Primary stats</dt>
        <dd>{klass.primaryStats.map((s) => s.toUpperCase()).join(' / ')}</dd>

        <dt>HP per level</dt>
        <dd>+{klass.hpPerLevel} (on top of CON × level)</dd>

        <dt>Spellcasting stat</dt>
        <dd>{klass.mpStat ? klass.mpStat.toUpperCase() : 'None — no MP pool'}</dd>

        <dt>Signature — {klass.signatureAbility.name}</dt>
        <dd>{klass.signatureAbility.description}</dd>
      </dl>
    </div>
  );
}
