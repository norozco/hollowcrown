import { useCharacterCreationStore } from '../../state/characterCreationStore';
import { MAX_NAME_LENGTH, validateName } from '../../engine/character';

/**
 * Step 1 — enter the character's name. Live-validates against the engine's
 * validateName() so the player knows immediately if their name will be
 * rejected by the Character constructor.
 */
export function StepName() {
  const name = useCharacterCreationStore((s) => s.name);
  const setName = useCharacterCreationStore((s) => s.setName);

  const validation = validateName(name);
  const showError = name.length > 0 && !validation.valid;

  return (
    <section className="cc__step-content">
      <h2 className="cc__title">Name your hero</h2>
      <p className="cc__hint">
        1–{MAX_NAME_LENGTH} characters. Letters, digits, apostrophe, hyphen.
        Must start with a letter.
      </p>

      <div className="cc__name-row">
        <input
          className="cc__input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME_LENGTH}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. Aria, D'arvit, Mary-Jane"
          aria-label="Character name"
          aria-invalid={showError}
        />
        <span className="cc__char-count">
          {name.length}/{MAX_NAME_LENGTH}
        </span>
      </div>

      {showError && validation.reason && (
        <p className="cc__input-error" role="alert">
          {validation.reason}
        </p>
      )}
      {!showError && name.length > 0 && (
        <p className="cc__input-ok">Valid name ✓</p>
      )}
    </section>
  );
}
