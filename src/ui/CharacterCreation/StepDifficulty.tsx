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
    key: 'easy',
    title: 'Easy',
    tagline: 'Forgiving. The world yields a little.',
    bullets: [
      'Enemies have 30% less HP',
      'Enemies deal 30% less damage',
      '+20% gold from victories',
      'Recommended for story-focused play',
    ],
  },
  {
    key: 'normal',
    title: 'Normal',
    tagline: 'The intended experience. No hand-holding, no cruelty.',
    bullets: [
      'Balanced enemy stats',
      'Standard gold and XP gains',
      'Death loses 10% carried gold',
      'Equipped items safe',
    ],
  },
  {
    key: 'hard',
    title: 'Hard',
    tagline: 'The cairn watches closer. Every fight matters.',
    bullets: [
      'Enemies have 35% more HP',
      'Enemies deal 25% more damage',
      '-20% gold, +15% XP',
      'For players who want a real challenge',
    ],
  },
  {
    key: 'hardcore',
    title: 'Hardcore',
    tagline: 'One life. One memorial. One legend.',
    bullets: [
      'Permadeath — no resurrection',
      'Hardest enemy scaling',
      'Save becomes a Memorial on death',
      'For the brave — or the stubborn',
    ],
  },
];

/**
 * Step 0 — pick difficulty. Locked for the character's lifetime.
 */
export function StepDifficulty() {
  const difficulty = useCharacterCreationStore((s) => s.difficulty);
  const setDifficulty = useCharacterCreationStore((s) => s.setDifficulty);

  return (
    <section className="cc__step-content">
      <h2 className="cc__title">Choose your difficulty</h2>
      <p className="cc__hint">This choice is locked for this character — pick wisely.</p>

      <div className="cc__cards cc__cards--four">
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
