import { ALL_MONSTERS } from '../../engine/monster';
import { getItem } from '../../engine/items';
import { useAchievementStore } from '../../state/achievementStore';
import './Bestiary.css';

interface Props { onClose: () => void; }

const ELEMENT_ICONS: Record<string, string> = {
  fire: 'Fire',
  ice: 'Ice',
  poison: 'Poison',
  shadow: 'Shadow',
  physical: 'Physical',
};

export function Bestiary({ onClose }: Props) {
  const encountered = useAchievementStore((s) => s.monstersEncountered);
  const knownCount = Object.keys(encountered).length;

  return (
    <div className="bestiary" role="dialog" aria-label="Bestiary">
      <div className="bestiary__header">
        <h2>Bestiary</h2>
        <span className="bestiary__progress">{knownCount} / {ALL_MONSTERS.length} discovered</span>
        <button type="button" className="bestiary__close" onClick={onClose}>&#10005;</button>
      </div>
      <div className="bestiary__grid">
        {ALL_MONSTERS.map((m) => {
          const entry = encountered[m.key];
          const known = !!entry;
          return (
            <div
              key={m.key}
              className={`bestiary__card${known ? ' bestiary__card--known' : ' bestiary__card--unknown'}`}
              style={known ? { borderLeftColor: m.color } : undefined}
            >
              <h3 className="bestiary__card-name">{known ? m.name : '???'}</h3>
              {known ? (
                <>
                  <div className="bestiary__stats">
                    <span className="bestiary__stat-label">HP</span>
                    <span className="bestiary__stat-value">{m.maxHp}</span>
                    <span className="bestiary__stat-label">AC</span>
                    <span className="bestiary__stat-value">{m.ac}</span>
                    <span className="bestiary__stat-label">XP</span>
                    <span className="bestiary__stat-value">{m.xpReward}</span>
                    <span className="bestiary__stat-label">Gold</span>
                    <span className="bestiary__stat-value">{m.goldReward}g</span>
                  </div>
                  <div className="bestiary__element">
                    {m.element && <span>Element: {ELEMENT_ICONS[m.element] ?? m.element}</span>}
                    {m.weakness && <span> | Weak: {ELEMENT_ICONS[m.weakness] ?? m.weakness}</span>}
                    {m.resistance && <span> | Resist: {ELEMENT_ICONS[m.resistance] ?? m.resistance}</span>}
                  </div>
                  {m.loot.length > 0 && (
                    <div className="bestiary__loot">
                      <span className="bestiary__loot-label">Loot: </span>
                      {m.loot.map((l, i) => {
                        try {
                          const item = getItem(l.itemKey);
                          return (
                            <span key={l.itemKey}>
                              {item.name}{i < m.loot.length - 1 ? ', ' : ''}
                            </span>
                          );
                        } catch {
                          return null;
                        }
                      })}
                    </div>
                  )}
                  <div className="bestiary__kills">
                    Slain: {entry.kills}
                  </div>
                </>
              ) : (
                <div className="bestiary__stats" style={{ opacity: 0.4 }}>
                  <span className="bestiary__stat-label">HP</span>
                  <span className="bestiary__stat-value">?</span>
                  <span className="bestiary__stat-label">AC</span>
                  <span className="bestiary__stat-value">?</span>
                  <span className="bestiary__stat-label">XP</span>
                  <span className="bestiary__stat-value">?</span>
                  <span className="bestiary__stat-label">Gold</span>
                  <span className="bestiary__stat-value">?</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
