import {
  useCharacterCreationStore,
  computeRolledStats,
} from '../../state/characterCreationStore';
import { usePlayerStore } from '../../state/playerStore';
import { useUIStore } from '../../state/uiStore';
import { getRace } from '../../engine/race';
import { getClass } from '../../engine/classes';
import {
  STAT_KEYS,
  ZERO_STATS,
  addStats,
  computeDerived,
  modifier,
  type StatBlock,
} from '../../engine/stats';
import { pickStartingWeapon } from '../../engine/weapons';

/**
 * Step 6 — confirm. Shows the full character summary built from store
 * state and offers a "Begin Adventure" button that creates the actual
 * Character via the engine, stores it in playerStore, resets this
 * wizard, and transitions the UI to the in-game screen.
 */
export function StepConfirm() {
  const state = useCharacterCreationStore();
  const reset = useCharacterCreationStore((s) => s.reset);
  const createPlayer = usePlayerStore((s) => s.create);
  const setScreen = useUIStore((s) => s.setScreen);

  const { name, raceKey, classKey, difficulty, gender, playerChoice } = state;
  const rolled = computeRolledStats(state);

  if (!raceKey || !classKey || !difficulty || !gender || !rolled) {
    return (
      <section className="cc__step-content">
        <p className="cc__hint">Some required fields are missing — go back and complete them.</p>
      </section>
    );
  }

  const race = getRace(raceKey);
  const klass = getClass(classKey);
  const extra: StatBlock = { ...ZERO_STATS, ...(state.extraBonuses ?? {}) };
  const finalStats = addStats(addStats(rolled, race.bonuses), extra);
  const derived = computeDerived(finalStats, 1, klass.hpPerLevel, klass.mpStat, klass.staminaStat);
  const weapon = pickStartingWeapon(finalStats, raceKey, classKey, klass.startingWeapons);

  const beginAdventure = () => {
    try {
      createPlayer({
        name,
        raceKey,
        classKey,
        rolledStats: rolled,
        difficulty,
        gender,
        extraBonuses: state.extraBonuses ?? undefined,
        playerChoice: playerChoice ?? undefined,
      });
      reset();
      setScreen('game');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`Couldn't create character: ${msg}`);
    }
  };

  return (
    <section className="cc__step-content">
      <h2 className="cc__title">Ready to begin?</h2>
      <p className="cc__hint">Review your character. Once you begin, the difficulty is locked.</p>

      <div className="cc__summary">
        <div className="cc__summary-header">
          <h3>{name}</h3>
          <p>
            {race.name} · {klass.name} · Level 1 · {difficulty === 'hardcore' ? '⚠ Hardcore' : 'Normal'}
          </p>
          {playerChoice && (
            <p className="cc__summary-extra">{race.playerChoiceOption?.field}: {playerChoice}</p>
          )}
        </div>

        <div className="cc__summary-grid">
          <div className="cc__summary-block">
            <h4>Stats</h4>
            <ul>
              {STAT_KEYS.map((s) => {
                const v = finalStats[s];
                const m = modifier(v);
                return (
                  <li key={s}>
                    <span className="cc__stat-label">{s.toUpperCase()}</span>
                    <span>{v}</span>
                    <span className={m >= 0 ? 'is-positive' : 'is-negative'}>
                      {m >= 0 ? `+${m}` : `${m}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="cc__summary-block">
            <h4>Vitals</h4>
            <ul>
              <li><span>Max HP</span><span>{derived.maxHp}</span></li>
              {derived.maxMp > 0 && <li><span>Max MP</span><span>{derived.maxMp}</span></li>}
              <li><span>AC</span><span>{derived.ac}</span></li>
              <li><span>Initiative</span><span>{derived.initiativeBonus >= 0 ? `+${derived.initiativeBonus}` : derived.initiativeBonus}</span></li>
            </ul>
          </div>

          <div className="cc__summary-block">
            <h4>Equipment</h4>
            <div className="cc__weapon-card">
              <div className="cc__weapon-head">
                <strong>{weapon.name}</strong>
                <span className="cc__weapon-tag">
                  {weapon.range === 'ranged' ? 'ranged' : 'melee'} · {weapon.handedness === '2h' ? 'two-handed' : weapon.handedness === 'hands' ? 'natural' : 'one-handed'} · {weapon.attackStat.toUpperCase()}
                </span>
              </div>
              <p className="cc__weapon-desc">{weapon.description}</p>
            </div>
          </div>

          <div className="cc__summary-block cc__summary-block--wide">
            <h4>Abilities</h4>
            <ul className="cc__abilities">
              <li>
                <strong>Passive — {race.passive.name}</strong>
                <p>{race.passive.description}</p>
              </li>
              <li>
                <strong>Active — {race.active.name}</strong>
                <p>{race.active.description}</p>
              </li>
              <li>
                <strong>Class — {klass.signatureAbility.name}</strong>
                <p>{klass.signatureAbility.description}</p>
              </li>
            </ul>
          </div>
        </div>

        <div className="cc__begin">
          <button
            type="button"
            className="cc__btn cc__btn--primary cc__btn--large"
            onClick={beginAdventure}
            autoFocus
          >
            Begin Adventure
          </button>
        </div>
      </div>
    </section>
  );
}
