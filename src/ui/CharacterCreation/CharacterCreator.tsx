import { useEffect } from 'react';
import { useUIStore } from '../../state/uiStore';
import {
  canProceedFromStep,
  STEP_LABELS,
  useCharacterCreationStore,
} from '../../state/characterCreationStore';
import { StepperHeader } from './StepperHeader';
import { StepDifficulty } from './StepDifficulty';
import { StepGender } from './StepGender';
import { StepName } from './StepName';
import { StepRace } from './StepRace';
import { StepClass } from './StepClass';
import { StepStats } from './StepStats';
import { StepPortrait } from './StepPortrait';
import { StepConfirm } from './StepConfirm';
import './CharacterCreator.css';

/**
 * Full-screen character-creation overlay. Shown when uiStore.screen ===
 * 'character-creation'. Renders the current step's component plus the
 * stepper header and navigation footer.
 *
 * Steps 4-6 (Stats, Portrait, Confirm) are placeholders for the next
 * chunk of work — they render a "coming soon" panel.
 */
export function CharacterCreator() {
  const setScreen = useUIStore((s) => s.setScreen);
  const state = useCharacterCreationStore();
  const { step, nextStep, prevStep, reset } = state;

  const canProceed = canProceedFromStep(state, step);
  const isFirst = step === 0;
  const isLast = step === STEP_LABELS.length - 1;

  const cancel = () => {
    reset();
    setScreen('menu');
  };

  // Keyboard nav: Enter advances when allowed; Escape cancels.
  // The Confirm step (step 6) is special — its Begin Adventure button
  // is autoFocused, so Enter activates it natively. We don't double-fire.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      // Don't hijack Enter/Esc inside multi-line text inputs (none yet, but future-proof).
      if (tag === 'TEXTAREA') return;

      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // On Confirm step, the focused Begin button handles Enter natively.
        if (step === STEP_LABELS.length - 1) return;
        // SELECT elements use Enter to open/commit; let them handle it.
        if (tag === 'SELECT') return;
        if (canProceed) {
          e.preventDefault();
          nextStep();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, canProceed, nextStep]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="cc" role="dialog" aria-label="Character creation">
      <StepperHeader currentStep={step} />

      <main className="cc__body">
        {step === 0 && <StepDifficulty />}
        {step === 1 && <StepGender />}
        {step === 2 && <StepName />}
        {step === 3 && <StepRace />}
        {step === 4 && <StepClass />}
        {step === 5 && <StepStats />}
        {step === 6 && <StepPortrait />}
        {step === 7 && <StepConfirm />}
      </main>

      <footer className="cc__nav">
        <button type="button" className="cc__btn cc__btn--ghost" onClick={cancel}>
          Cancel
        </button>
        <div className="cc__nav-spacer" />
        <button
          type="button"
          className="cc__btn"
          onClick={prevStep}
          disabled={isFirst}
        >
          ← Back
        </button>
        <button
          type="button"
          className="cc__btn cc__btn--primary"
          onClick={nextStep}
          disabled={!canProceed || isLast}
        >
          Next →
        </button>
      </footer>
    </div>
  );
}
