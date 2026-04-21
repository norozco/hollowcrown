import { useEffect, useState } from 'react';
import './Credits.css';

interface Props {
  onClose: () => void;
}

/**
 * Scrolling credits screen — shown from the main menu or after the
 * Crownless One is defeated. Auto-scrolls over ~45 seconds then loops.
 */
export function Credits({ onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="credits" onClick={onClose}>
      <div className={`credits__scroll ${mounted ? 'is-rolling' : ''}`}>
        <h1 className="credits__title">HOLLOWCROWN</h1>
        <p className="credits__subtitle">A Dungeon of the Forgotten Repo</p>

        <div className="credits__section">
          <h2>DESIGN &amp; DEVELOPMENT</h2>
          <p>Nasser Orozco</p>
          <p className="credits__role">Vision · Direction · Playtesting</p>
        </div>

        <div className="credits__section">
          <h2>ENGINEERING</h2>
          <p>Claude (Anthropic)</p>
          <p className="credits__role">Systems · Content · Art Pipeline</p>
        </div>

        <div className="credits__section">
          <h2>ART &amp; AESTHETIC</h2>
          <p>Procedural Pixel Art — Generated in Canvas2D</p>
          <p>NPC Portraits — Pollinations.ai (Flux)</p>
          <p>Visual Direction — Persona 5 · ALTTP · Dark Souls</p>
        </div>

        <div className="credits__section">
          <h2>ENGINE &amp; STACK</h2>
          <p>Phaser 4 — Game Engine</p>
          <p>React 19 — UI Layer</p>
          <p>Zustand — State Management</p>
          <p>Vite 8 — Build Tool</p>
          <p>Web Audio API — Sound Engine</p>
        </div>

        <div className="credits__section">
          <h2>CAST</h2>
          <p>Brenna · Guildmaster of Ashenvale</p>
          <p>Orric · Forester of Greenhollow</p>
          <p>Kael · Blacksmith</p>
          <p>Tomas · Innkeeper of the Whispering Hollow</p>
          <p>Vira · Merchant</p>
          <p>Veyrin · Elven Scholar</p>
          <p>The Hermit · Watcher of the Marsh</p>
          <p>Nessa · Dockmaster of Duskmere</p>
          <p>Torben · Fishmonger</p>
          <p>Mira · Thief</p>
          <p className="credits__role">
            And the many adventurers who did not return.
          </p>
        </div>

        <div className="credits__section">
          <h2>THE FALLEN</h2>
          <p>The Hollow King</p>
          <p>The Drowned Warden</p>
          <p>The Crownless One</p>
          <p>The Forgotten</p>
          <p className="credits__role">Rest, now. It is done.</p>
        </div>

        <div className="credits__section">
          <h2>SPECIAL THANKS</h2>
          <p>Every playtester who died and came back</p>
          <p>Every bug that taught us something</p>
          <p>The Stone Cairn at Mossbarrow, for remembering</p>
        </div>

        <div className="credits__section credits__section--final">
          <p className="credits__quote">
            "The world remembers your name.<br />
            Even if the stones do not."
          </p>
          <h1 className="credits__title credits__title--end">HOLLOWCROWN</h1>
          <p className="credits__copyright">© {new Date().getFullYear()} · All rights reserved</p>
        </div>
      </div>

      <button className="credits__close" onClick={onClose}>
        Close (Esc)
      </button>
    </div>
  );
}
