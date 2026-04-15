import { useCharacterCreationStore } from '../../state/characterCreationStore';
import { getRace } from '../../engine/race';

/**
 * Step 5 — pick a portrait. v0 placeholder: 6 colored circles tagged with
 * the race's first letter. Real anime-style portraits arrive when the
 * art pipeline is ready (see spec §20).
 */
export function StepPortrait() {
  const raceKey = useCharacterCreationStore((s) => s.raceKey);
  const portraitIndex = useCharacterCreationStore((s) => s.portraitIndex);
  const setPortraitIndex = useCharacterCreationStore((s) => s.setPortraitIndex);

  const race = raceKey ? getRace(raceKey) : null;
  const initial = race ? race.name[0] : '?';

  // 6 placeholder color schemes — would map to real portrait variants per race.
  const palettes: Array<[string, string]> = [
    ['#7a4a30', '#d4a968'],
    ['#3a4a30', '#a8c468'],
    ['#3a3060', '#8868d4'],
    ['#5a3030', '#c46868'],
    ['#306060', '#68c4c4'],
    ['#604030', '#d49868'],
  ];

  return (
    <section className="cc__step-content">
      <h2 className="cc__title">Choose your portrait</h2>
      <p className="cc__hint">
        v0 placeholder portraits — final anime-style art arrives when the asset pipeline is ready.
      </p>

      <div className="cc__portraits">
        {palettes.map(([bg, fg], i) => {
          const selected = i === portraitIndex;
          return (
            <button
              key={i}
              type="button"
              className={`cc__portrait${selected ? ' is-selected' : ''}`}
              onClick={() => setPortraitIndex(i)}
              aria-pressed={selected}
              aria-label={`Portrait ${i + 1}`}
            >
              <span
                className="cc__portrait-circle"
                style={{ background: bg, color: fg }}
              >
                {initial}
              </span>
              <span className="cc__portrait-label">Portrait {i + 1}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
