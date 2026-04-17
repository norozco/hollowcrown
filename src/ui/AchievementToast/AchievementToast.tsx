import { useEffect, useState } from 'react';
import { ACHIEVEMENTS } from '../../engine/achievements';
import './AchievementToast.css';

interface Props {
  achievementKey: string | null;
  onDone: () => void;
}

/**
 * Slides in from the right when an achievement unlocks. Auto-dismisses after 3 s.
 */
export function AchievementToast({ achievementKey, onDone }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!achievementKey) { setVisible(false); return; }
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      // Give the slide-out animation time before clearing the key.
      setTimeout(onDone, 400);
    }, 3000);
    return () => clearTimeout(t);
  }, [achievementKey, onDone]);

  if (!achievementKey) return null;

  const achievement = ACHIEVEMENTS.find((a) => a.key === achievementKey);
  if (!achievement) return null;

  return (
    <div className={`ach-toast${visible ? ' ach-toast--visible' : ''}`} role="status" aria-live="polite">
      <span className="ach-toast__icon">{achievement.icon}</span>
      <div className="ach-toast__body">
        <div className="ach-toast__title">Achievement Unlocked</div>
        <div className="ach-toast__name">{achievement.name}</div>
        <div className="ach-toast__desc">{achievement.description}</div>
      </div>
    </div>
  );
}
