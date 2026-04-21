import { useEffect, useState } from 'react';

/**
 * Typewriter hook — reveals text character-by-character based on the
 * user's "Text Speed" preference (from localStorage via OptionsMenu).
 *
 * Clicking to advance or hitting space while still typing will
 * instantly complete the current line (set speed=0 via `skipRef`).
 */

const SPEED_CHARS_PER_SEC: Record<string, number> = {
  slow: 25,
  normal: 55,
  fast: 120,
};

export function useTypewriter(fullText: string): {
  displayed: string;
  done: boolean;
  skip: () => void;
} {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Read speed preference from localStorage (set by OptionsMenu)
    const speedKey = localStorage.getItem('hc_textSpeed') ?? 'normal';
    // If user has reduce motion on, instantly reveal
    const reduceMotion = (window as { __reduceMotion?: boolean }).__reduceMotion === true;
    const cps = reduceMotion ? 9999 : SPEED_CHARS_PER_SEC[speedKey] ?? 55;

    setDisplayed('');
    setDone(false);

    if (!fullText) {
      setDone(true);
      return;
    }

    const msPerChar = 1000 / cps;
    let i = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      i = Math.min(fullText.length, i + 1);
      setDisplayed(fullText.slice(0, i));
      if (i >= fullText.length) {
        setDone(true);
        return;
      }
      // Punctuation pauses — longer wait after .,!?;:
      const last = fullText[i - 1];
      const pauseMult =
        last === '.' || last === '!' || last === '?' ? 6 :
        last === ',' || last === ';' || last === ':' ? 3 :
        last === '—' ? 4 :
        1;
      window.setTimeout(tick, msPerChar * pauseMult);
    };

    const firstDelay = window.setTimeout(tick, msPerChar);
    return () => {
      cancelled = true;
      window.clearTimeout(firstDelay);
    };
  }, [fullText]);

  const skip = () => {
    setDisplayed(fullText);
    setDone(true);
  };

  return { displayed, done, skip };
}
