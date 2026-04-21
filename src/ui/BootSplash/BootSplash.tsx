import { useEffect, useState } from 'react';
import './BootSplash.css';

interface Props {
  onDone: () => void;
}

/**
 * Boot splash — shown for ~2.5 seconds on first load before the main menu.
 * Three phases:
 *   0: fade in studio mark
 *   1: hold + subtle pulse
 *   2: fade out
 */
export function BootSplash({ onDone }: Props) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);
    const t2 = setTimeout(() => setPhase(2), 2000);
    const t3 = setTimeout(() => onDone(), 2600);

    // Skip on any input
    const skip = () => { onDone(); };
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('pointerdown', skip, { once: true });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [onDone]);

  return (
    <div className={`boot-splash phase-${phase}`}>
      <div className="boot-splash__mark">
        <div className="boot-splash__crown">
          <svg viewBox="0 0 100 60" width="180" height="108">
            <path
              d="M10 50 L20 15 L30 35 L50 10 L70 35 L80 15 L90 50 Z"
              fill="#c81e1e"
              stroke="#000"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <circle cx="20" cy="15" r="4" fill="#ffd43a" stroke="#000" strokeWidth="1.5" />
            <circle cx="50" cy="10" r="5" fill="#ffd43a" stroke="#000" strokeWidth="1.5" />
            <circle cx="80" cy="15" r="4" fill="#ffd43a" stroke="#000" strokeWidth="1.5" />
          </svg>
        </div>
        <div className="boot-splash__studio">NOROZCO STUDIOS</div>
        <div className="boot-splash__tagline">presents</div>
      </div>
      <div className="boot-splash__skip">Press any key to skip</div>
    </div>
  );
}
