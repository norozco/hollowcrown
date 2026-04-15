import { STEP_LABELS } from '../../state/characterCreationStore';

interface Props {
  currentStep: number;
}

/**
 * Top-of-screen breadcrumb showing all 7 steps with the current one
 * highlighted. Visual only — clicking does not navigate (use Back/Next).
 */
export function StepperHeader({ currentStep }: Props) {
  return (
    <header className="cc__stepper" aria-label="Character creation progress">
      <ol>
        {STEP_LABELS.map((label, i) => {
          const status =
            i < currentStep ? 'done' : i === currentStep ? 'current' : 'upcoming';
          return (
            <li key={label} className={`cc__step cc__step--${status}`}>
              <span className="cc__step-num">{i + 1}</span>
              <span className="cc__step-label">{label}</span>
            </li>
          );
        })}
      </ol>
    </header>
  );
}
