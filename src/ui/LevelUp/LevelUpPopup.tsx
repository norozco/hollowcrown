import { useEffect, useState } from 'react';
import { usePlayerStore } from '../../state/playerStore';
import type { Perk } from '../../engine/perks';
import { Sfx } from '../../engine/audio';
import './LevelUpPopup.css';

const SPARKLE_PARTICLES = Array.from({ length: 18 }, () => ({
  left: 10 + Math.random() * 80,
  delay: Math.random() * 1.2,
  duration: 1.5 + Math.random() * 1.5,
  size: 3 + Math.random() * 5,
}));

/**
 * Level-up celebration popup with perk selection. When the player
 * levels up, three random perks are offered — small permanent
 * blessings that accumulate over the course of a playthrough.
 * The popup stays open until the player makes a choice.
 */
export function LevelUpPopup() {
  const character = usePlayerStore((s) => s.character);
  const version = usePlayerStore((s) => s.version);
  const pendingPerks = usePlayerStore((s) => s.pendingPerkChoices);
  const choosePerk = usePlayerStore((s) => s.choosePerk);
  const [showLevel, setShowLevel] = useState<number | null>(null);
  const [lastLevel, setLastLevel] = useState(0);

  useEffect(() => {
    if (!character) { setLastLevel(0); return; }
    if (lastLevel === 0) { setLastLevel(character.level); return; }
    if (character.level > lastLevel) {
      setShowLevel(character.level);
      setLastLevel(character.level);
      Sfx.levelUp();
    }
  }, [character, version, lastLevel]);

  // When there are no pending perks left (player chose one), auto-dismiss after a beat.
  useEffect(() => {
    if (showLevel !== null && !pendingPerks) {
      const t = setTimeout(() => setShowLevel(null), 600);
      return () => clearTimeout(t);
    }
  }, [showLevel, pendingPerks]);

  if (showLevel === null || !character) return null;

  const d = character.derived;

  // Gold sparkle particle positions — generated once at module load so
  // re-renders don't jitter the positions and the purity rule stays quiet.
  const particles = SPARKLE_PARTICLES.map((p, i) => (
    <span
      key={i}
      className="lvlup__particle"
      style={{
        left: `${p.left}%`,
        animationDelay: `${p.delay}s`,
        animationDuration: `${p.duration}s`,
        width: `${p.size}px`,
        height: `${p.size}px`,
      }}
    />
  ));

  const handleChoose = (perk: Perk) => {
    choosePerk(perk.key);
  };

  return (
    <div className="lvlup">
      {particles}
      <div className="lvlup__box levelup">
        <h2 className="lvlup__title">LEVEL UP</h2>
        <p className="lvlup__level">Level {showLevel}</p>
        <div className="lvlup__stats">
          <span>Max HP: {d.maxHp}</span>
          {d.maxMp > 0 && <span>Max MP: {d.maxMp}</span>}
          <span>AC: {d.ac}</span>
        </div>
        <p className="lvlup__hint">HP & MP fully restored</p>

        {pendingPerks && (
          <>
            <p className="lvlup__choose-label">Choose a blessing:</p>
            <div className="lvlup__choices">
              {pendingPerks.map((perk) => (
                <button
                  key={perk.key}
                  className="lvlup__perk"
                  onClick={() => handleChoose(perk)}
                >
                  <span className="lvlup__perk-icon">{perk.icon}</span>
                  <span className="lvlup__perk-name">{perk.name}</span>
                  <span className="lvlup__perk-desc">{perk.description}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {!pendingPerks && (
          <p className="lvlup__dismiss">Blessing received</p>
        )}
      </div>
    </div>
  );
}
