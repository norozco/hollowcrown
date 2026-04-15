import { useCharacterCreationStore } from '../../state/characterCreationStore';
import type { Difficulty } from '../../engine/character';

interface Choice {
  key: Difficulty;
  title: string;
  tagline: string;
  bullets: string[];
}

const CHOICES: Choice[] = [
  {
    key: 'normal',
    title: 'Normal',
    tagline: 'Forgiving. Death sends you back to your last inn or home.',
    bullets: [
      'Respawn at last rested inn or owned house',
      'Lose 10% of carried gold on death (stored gold is safe)',
      'Equipped items are not lost',
      'Brief XP cooldown to discourage rush-and-die farming',
    ],
  },
  {
    key: 'hardcore',
    title: 'Hardcore',
    tagline: 'One life. One memorial. One legend.',
    bullets: [
      'Permanent death — character cannot be resurrected',
      'Save file converted to a Memorial entry on death',
      'Hardcore-only leaderboard rankings',
      'Cosmetic rewards for surviving milestones',
    ],
  },
];

/**
 * Step 0 — pick Normal or Hardcore. Choice is locked for this character
 * (cannot be changed after creation).
 */
export function StepDifficulty() {
  const difficulty = useCharacterCreationStore((s) => s.difficulty);
  const setDifficulty = useCharacterCreationStore((s) => s.setDifficulty);

  return (
    <section className="cc__step-content">
      <h2 className="cc__title">Choose your difficulty</h2>
      <p className="cc__hint">This choice is locked for this character — pick wisely.</p>

      <div className="cc__cards cc__cards--two">
        {CHOICES.map((c) => {
          const selected = difficulty === c.key;
          return (
            <button
              key={c.key}
              type="button"
              className={`cc__card${selected ? ' cc__card--selected' : ''}`}
              onClick={() => setDifficulty(c.key)}
              aria-pressed={selected}
            >
              <h3 className="cc__card-title">{c.title}</h3>
              <p className="cc__card-tagline">{c.tagline}</p>
              <ul className="cc__card-bullets">
                {c.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </section>
  );
}
