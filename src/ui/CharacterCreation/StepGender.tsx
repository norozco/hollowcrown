import { useCharacterCreationStore } from '../../state/characterCreationStore';
import type { Gender } from '../../engine/character';

export function StepGender() {
  const gender = useCharacterCreationStore((s) => s.gender);
  const setGender = useCharacterCreationStore((s) => s.setGender);

  const options: { key: Gender; label: string; desc: string }[] = [
    { key: 'male', label: 'Male', desc: 'Broader build. Shorter hair by default. He/him.' },
    { key: 'female', label: 'Female', desc: 'Narrower shoulders. Longer hair by default. She/her.' },
  ];

  return (
    <section className="cc__step-content">
      <h2 className="cc__title">Choose your character</h2>
      <p className="cc__hint">This affects your sprite's appearance and NPC dialogue references.</p>

      <div className="cc__cards cc__cards--two">
        {options.map((o) => {
          const selected = gender === o.key;
          return (
            <button
              key={o.key}
              type="button"
              className={`cc__card${selected ? ' cc__card--selected' : ''}`}
              onClick={() => setGender(o.key)}
              aria-pressed={selected}
            >
              <h3 className="cc__card-title">{o.label}</h3>
              <p className="cc__card-tagline">{o.desc}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
