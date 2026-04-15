import { useEffect, useRef, useState } from 'react';
import { useQuestStore } from '../../state/questStore';
import { getQuest } from '../../engine/quests';
import { currentObjective } from '../../engine/quest';
import './QuestTracker.css';

/**
 * In-game quest tracker. Sits in the lower-right corner above the
 * controls hint. Shows every active quest with:
 *   - title
 *   - completed objectives (struck through)
 *   - current objective (with chevron pointer)
 *   - "Quest Complete" tag when isComplete
 *
 * When an objective newly completes (or a quest is newly accepted), the
 * tracker briefly flashes gold so the player notices. Auto-hides if no
 * quests are active.
 */
export function QuestTracker() {
  const active = useQuestStore((s) => s.active);
  const entries = Object.values(active).sort((a, b) => a.acceptedAt - b.acceptedAt);

  // Flash logic — track which quests/objectives we've already shown so
  // we only highlight on actual change.
  const seenRef = useRef<Map<string, string>>(new Map()); // questId → fingerprint
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newlyChanged = new Set<string>();
    for (const s of entries) {
      const fingerprint = `${s.completedObjectiveIds.length}/${s.isComplete}`;
      const prev = seenRef.current.get(s.questId);
      if (prev !== fingerprint) {
        if (prev !== undefined) newlyChanged.add(s.questId);
        seenRef.current.set(s.questId, fingerprint);
      }
    }
    // First-accept also flashes (no prev recorded → still new).
    for (const s of entries) {
      if (!seenRef.current.has(s.questId + ':accepted')) {
        newlyChanged.add(s.questId);
        seenRef.current.set(s.questId + ':accepted', '1');
      }
    }
    if (newlyChanged.size > 0) {
      setFlashIds(newlyChanged);
      const t = setTimeout(() => setFlashIds(new Set()), 1400);
      return () => clearTimeout(t);
    }
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <aside className="qt" aria-label="Active quests">
      <h4 className="qt__heading">Quests</h4>
      <ul className="qt__list">
        {entries.map((s) => {
          const quest = (() => {
            try {
              return getQuest(s.questId);
            } catch {
              return null;
            }
          })();
          if (!quest) return null;
          const flashing = flashIds.has(s.questId);
          const next = currentObjective(quest, s);
          return (
            <li
              key={s.questId}
              className={`qt__quest${flashing ? ' is-flashing' : ''}${s.isComplete ? ' is-complete' : ''}`}
            >
              <div className="qt__title">
                {quest.title}
                {s.isComplete && <span className="qt__badge">✔ Complete</span>}
              </div>
              <ul className="qt__objectives">
                {quest.objectives.map((obj) => {
                  const done = s.completedObjectiveIds.includes(obj.id);
                  const isCurrent = !done && next?.id === obj.id;
                  return (
                    <li
                      key={obj.id}
                      className={`qt__obj${done ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`}
                    >
                      <span className="qt__obj-mark" aria-hidden="true">
                        {done ? '✔' : isCurrent ? '▸' : '·'}
                      </span>
                      <span className="qt__obj-text">{obj.description}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
