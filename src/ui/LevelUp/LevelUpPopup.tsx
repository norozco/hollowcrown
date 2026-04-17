import { useEffect, useState } from 'react';
import { usePlayerStore } from '../../state/playerStore';
import './LevelUpPopup.css';

/**
 * Level-up celebration popup. Watches for level changes and shows
 * a fanfare overlay with the new level + stat gains.
 */
export function LevelUpPopup() {
  const character = usePlayerStore((s) => s.character);
  const version = usePlayerStore((s) => s.version);
  const [showLevel, setShowLevel] = useState<number | null>(null);
  const [lastLevel, setLastLevel] = useState(0);

  useEffect(() => {
    if (!character) { setLastLevel(0); return; }
    if (lastLevel === 0) { setLastLevel(character.level); return; }
    if (character.level > lastLevel) {
      setShowLevel(character.level);
      setLastLevel(character.level);
      // Auto-dismiss after 3 seconds
      const t = setTimeout(() => setShowLevel(null), 3000);
      return () => clearTimeout(t);
    }
  }, [character, version, lastLevel]);

  if (showLevel === null || !character) return null;

  const d = character.derived;

  // Generate gold sparkle particles
  const particles = Array.from({ length: 18 }, (_, i) => {
    const left = 10 + Math.random() * 80;
    const delay = Math.random() * 1.2;
    const duration = 1.5 + Math.random() * 1.5;
    const size = 3 + Math.random() * 5;
    return (
      <span
        key={i}
        className="lvlup__particle"
        style={{
          left: `${left}%`,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          width: `${size}px`,
          height: `${size}px`,
        }}
      />
    );
  });

  return (
    <div className="lvlup" onClick={() => setShowLevel(null)}>
      {particles}
      <div className="lvlup__box levelup">
        <h2 className="lvlup__title">LEVEL UP!</h2>
        <p className="lvlup__level">Level {showLevel}</p>
        <div className="lvlup__stats">
          <span>Max HP: {d.maxHp}</span>
          {d.maxMp > 0 && <span>Max MP: {d.maxMp}</span>}
          <span>AC: {d.ac}</span>
        </div>
        <p className="lvlup__hint">HP & MP fully restored</p>
        <p className="lvlup__dismiss">Click or wait to dismiss</p>
      </div>
    </div>
  );
}
