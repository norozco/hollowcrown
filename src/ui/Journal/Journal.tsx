import { useLoreStore, type LoreEntry } from '../../state/loreStore';
import './Journal.css';

interface Props { onClose: () => void; }

export function Journal({ onClose }: Props) {
  const entries = useLoreStore((s) => s.entries);

  // Sort by discovery time (oldest first)
  const sorted = [...entries].sort((a, b) => a.discoveredAt - b.discoveredAt);

  // Group by location
  const groups = new Map<string, LoreEntry[]>();
  for (const entry of sorted) {
    if (!groups.has(entry.location)) groups.set(entry.location, []);
    groups.get(entry.location)!.push(entry);
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="journal" role="dialog" aria-label="Lore Journal">
      <div className="journal__header">
        <h2>Codex</h2>
        <span className="journal__count">
          {entries.length === 0
            ? 'No lore discovered'
            : `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} recorded`}
        </span>
        <button type="button" className="journal__close" onClick={onClose}>&#10005;</button>
      </div>

      <div className="journal__body">
        {entries.length === 0 ? (
          <div className="journal__empty">
            <p>The pages are blank.</p>
            <p>Examine objects, read signs, and explore the world.</p>
            <p>What you find will be remembered here.</p>
          </div>
        ) : (
          Array.from(groups.entries()).map(([location, locationEntries]) => (
            <div key={location} className="journal__location-group">
              <h3 className="journal__location-heading">{location}</h3>
              {locationEntries.map((entry) => (
                <div key={entry.key} className="journal__entry">
                  <h4 className="journal__entry-title">{entry.title}</h4>
                  <p className="journal__entry-text">{entry.text}</p>
                  <span className="journal__entry-time">Discovered {formatTime(entry.discoveredAt)}</span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
