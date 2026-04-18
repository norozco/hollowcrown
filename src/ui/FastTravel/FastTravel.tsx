import { useState, useEffect } from 'react';
import { useAchievementStore } from '../../state/achievementStore';
import './FastTravel.css';

const WAYPOINTS: Array<{ sceneKey: string; name: string; spawn: string }> = [
  { sceneKey: 'TownScene', name: 'Ashenvale', spawn: 'default' },
  { sceneKey: 'GreenhollowScene', name: 'Greenhollow Woods', spawn: 'default' },
  { sceneKey: 'MossbarrowScene', name: 'Mossbarrow Cairn', spawn: 'default' },
  { sceneKey: 'AshenmereScene', name: 'Ashenmere Marshes', spawn: 'default' },
  { sceneKey: 'DuskmereScene', name: 'Duskmere Village', spawn: 'default' },
  { sceneKey: 'FrosthollowScene', name: 'Frosthollow Peaks', spawn: 'default' },
];

export function FastTravel({ onClose }: { onClose: () => void }) {
  const visited = useAchievementStore((s) => s.zonesVisited);
  const [currentScene, setCurrentScene] = useState('');

  useEffect(() => {
    const handler = (e: Event) => {
      setCurrentScene((e as CustomEvent).detail.currentScene);
    };
    window.addEventListener('openFastTravel', handler);
    return () => window.removeEventListener('openFastTravel', handler);
  }, []);

  const available = WAYPOINTS.filter(w => visited.has(w.sceneKey) && w.sceneKey !== currentScene);

  return (
    <div className="ft" role="dialog">
      <h3>Waypoint Travel</h3>
      <ul className="ft__list">
        {available.map(w => (
          <li key={w.sceneKey}>
            <button className="ft__btn" onClick={() => {
              window.dispatchEvent(new CustomEvent('fastTravel', { detail: w }));
              onClose();
            }}>
              {w.name}
            </button>
          </li>
        ))}
        {available.length === 0 && <li className="ft__empty">No other waypoints discovered.</li>}
      </ul>
      <button className="ft__close" onClick={onClose}>Cancel</button>
    </div>
  );
}
