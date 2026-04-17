import { useEffect, useRef, useState } from 'react';
import { useQuestStore } from '../../state/questStore';
import { getQuest } from '../../engine/quests';
import { currentObjective } from '../../engine/quest';
import './QuestTracker.css';

/**
 * In-game quest tracker. Shows active quests separated into Main Story
 * and Side Quests, with objective progress and completion flash.
 */
export function QuestTracker() {
  const active = useQuestStore((s) => s.active);
  const entries = Object.values(active).sort((a, b) => a.acceptedAt - b.acceptedAt);

  const seenRef = useRef<Map<string, string>>(new Map());
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

  // Separate main story from side quests
  const mainQuests = entries.filter((s) => {
    try { return (getQuest(s.questId).category ?? 'side') === 'main'; } catch { return false; }
  });
  const sideQuests = entries.filter((s) => {
    try { return (getQuest(s.questId).category ?? 'side') === 'side'; } catch { return true; }
  });

  const renderQuest = (s: typeof entries[0]) => {
    const quest = (() => { try { return getQuest(s.questId); } catch { return null; } })();
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
          {s.isComplete && !s.turnedIn && <span className="qt__badge">✔ Turn in</span>}
          {s.turnedIn && <span className="qt__badge qt__badge--done">✔ Done</span>}
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
  };

  return (
    <aside className="qt" aria-label="Active quests">
      {mainQuests.length > 0 && (
        <>
          <h4 className="qt__heading qt__heading--main">Main Story</h4>
          <ul className="qt__list">{mainQuests.map(renderQuest)}</ul>
        </>
      )}
      {sideQuests.length > 0 && (
        <>
          <h4 className="qt__heading qt__heading--side">Side Quests</h4>
          <ul className="qt__list">{sideQuests.map(renderQuest)}</ul>
        </>
      )}
    </aside>
  );
}
