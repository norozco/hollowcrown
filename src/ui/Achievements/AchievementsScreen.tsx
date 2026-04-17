import { useAchievementStore } from '../../state/achievementStore';
import { ACHIEVEMENTS } from '../../engine/achievements';
import './AchievementsScreen.css';

interface Props { onClose: () => void; }

export function AchievementsScreen({ onClose }: Props) {
  const unlocked = useAchievementStore((s) => s.unlocked);
  const unlockedCount = unlocked.size;

  return (
    <div className="ach" role="dialog" aria-label="Achievements">
      <div className="ach__header">
        <h2>Achievements</h2>
        <span className="ach__progress">{unlockedCount} / {ACHIEVEMENTS.length} unlocked</span>
        <button type="button" className="ach__close" onClick={onClose}>&#10005;</button>
      </div>
      <ul className="ach__list">
        {ACHIEVEMENTS.map((a) => {
          const done = unlocked.has(a.key);
          return (
            <li key={a.key} className={`ach__item${done ? ' ach__item--unlocked' : ' ach__item--locked'}`}>
              <span className="ach__item-icon">{done ? a.icon : '?'}</span>
              <div className="ach__item-body">
                <div className="ach__item-name">{done ? a.name : '???'}</div>
                <div className="ach__item-desc">{done ? a.description : 'Locked'}</div>
              </div>
              {done && <span className="ach__item-badge">✔</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
