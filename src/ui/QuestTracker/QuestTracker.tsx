import { useEffect, useRef, useState } from 'react';
import { useQuestStore } from '../../state/questStore';
import { useBountyStore } from '../../state/bountyStore';
import { useInventoryStore } from '../../state/inventoryStore';
import { getQuest } from '../../engine/quests';
import { currentObjective } from '../../engine/quest';
import './QuestTracker.css';

/**
 * In-game quest tracker. Minimizable panel in the bottom-right.
 * Shows active quests separated into Main Story and Side Quests.
 */
export function QuestTracker() {
  const active = useQuestStore((s) => s.active);
  const bounty = useBountyStore((s) => s.active);
  const bountyKills = useBountyStore((s) => s.killProgress);
  const entries = Object.values(active).sort((a, b) => a.acceptedAt - b.acceptedAt);

  const [minimized, setMinimized] = useState(false);

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
      // Auto-expand on new quest activity
      if (minimized) setMinimized(false);
      const t = setTimeout(() => setFlashIds(new Set()), 1400);
      return () => clearTimeout(t);
    }
  }, [entries]);

  // Bounty progress text
  const bountyLine = (() => {
    if (!bounty) return null;
    if (bounty.target.type === 'kill') {
      return `${bounty.title}: ${bountyKills}/${bounty.target.count}`;
    }
    const inv = useInventoryStore.getState();
    const owned = inv.slots.find(s => s.item.key === bounty.target.itemKey)?.quantity ?? 0;
    return `${bounty.title}: ${Math.min(owned, bounty.target.count)}/${bounty.target.count}`;
  })();

  if (entries.length === 0 && !bounty) return null;

  // Separate main story from side quests
  const mainQuests = entries.filter((s) => {
    try { return (getQuest(s.questId).category ?? 'side') === 'main'; } catch { return false; }
  }).filter(s => !s.turnedIn);
  const sideQuests = entries.filter((s) => {
    try { return (getQuest(s.questId).category ?? 'side') === 'side'; } catch { return true; }
  }).filter(s => !s.turnedIn);

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
          <span className="qt__title-text">{quest.title}</span>
          {s.isComplete && !s.turnedIn && <span className="qt__badge">✔ Turn in</span>}
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

  const activeCount = mainQuests.length + sideQuests.length;

  return (
    <aside className={`qt${minimized ? ' is-minimized' : ''}`} aria-label="Active quests">
      <div className="qt__header" onClick={() => setMinimized(!minimized)}>
        <span className="qt__header-icon">📜</span>
        <span className="qt__header-title">Quests</span>
        {minimized && <span className="qt__header-count">{activeCount}</span>}
        <span className="qt__header-toggle">{minimized ? '▲' : '▼'}</span>
      </div>

      {!minimized && (
        <div className="qt__body">
          {mainQuests.length > 0 && (
            <>
              <h4 className="qt__section-heading qt__section--main">MAIN</h4>
              <ul className="qt__list">{mainQuests.map(renderQuest)}</ul>
            </>
          )}
          {sideQuests.length > 0 && (
            <>
              <h4 className="qt__section-heading qt__section--side">SIDE</h4>
              <ul className="qt__list">{sideQuests.map(renderQuest)}</ul>
            </>
          )}
          {bountyLine && (
            <div className="qt__bounty">
              <span className="qt__bounty-icon" aria-hidden="true">⚔</span> {bountyLine}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
