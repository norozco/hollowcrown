import { useCharacterCreationStore } from '../../state/characterCreationStore';

/**
 * Step 5 — pick a portrait. Renders 8 stylized Persona 5-inspired
 * anime portraits drawn as SVG (red halftone backgrounds, heavy black
 * outlines, yellow accents). The SVGs live in src/assets/portraits/player/
 * and are eager-globbed so each button gets a bundled URL.
 */
const PORTRAIT_URLS_MAP = import.meta.glob(
  '/src/assets/portraits/player/player-*.svg',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

const PORTRAIT_URLS: string[] = Object.keys(PORTRAIT_URLS_MAP)
  .sort()
  .map((k) => PORTRAIT_URLS_MAP[k]);

export function StepPortrait() {
  const portraitIndex = useCharacterCreationStore((s) => s.portraitIndex);
  const setPortraitIndex = useCharacterCreationStore((s) => s.setPortraitIndex);

  return (
    <section className="cc__step-content">
      <h2 className="cc__title">Choose your portrait</h2>
      <p className="cc__hint">
        Pick the face your legend will wear.
      </p>

      <div className="cc__portraits">
        {PORTRAIT_URLS.map((url, i) => {
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
              <span className="cc__portrait-circle">
                <img src={url} alt="" className="cc__portrait-img" />
              </span>
              <span className="cc__portrait-label">Portrait {i + 1}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
