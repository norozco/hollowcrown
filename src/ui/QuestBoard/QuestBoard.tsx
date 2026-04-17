import { useState } from 'react';
import { useQuestStore } from '../../state/questStore';
import { ALL_QUEST_IDS, getQuest } from '../../engine/quests';
import './QuestBoard.css';

interface Props { onClose: () => void; }

export function QuestBoard({ onClose }: Props) {
  const active = useQuestStore((s) => s.active);
  const accept = useQuestStore((s) => s.accept);
  const [flash, setFlash] = useState<string | null>(null);

  const quests = ALL_QUEST_IDS.map((id) => {
    const q = getQuest(id);
    const state = active[id];
    return { quest: q, state };
  });

  const handleAccept = (id: string) => {
    accept(id);
    setFlash(id);
    setTimeout(() => setFlash(null), 1000);
  };

  return (
    <div className="qb" role="dialog" aria-label="Quest Board">
      <div className="qb__header">
        <h2>Quest Board — F Rank</h2>
        <button type="button" className="qb__close" onClick={onClose}>✕</button>
      </div>
      <ul className="qb__list">
        {quests.map(({ quest, state }) => {
          const accepted = !!state;
          const complete = state?.isComplete;
          const turnedIn = state?.turnedIn;
          return (
            <li key={quest.id} className={`qb__quest${flash === quest.id ? ' is-flash' : ''}`}>
              <div className="qb__quest-header">
                <h3>{quest.title}</h3>
                {turnedIn && <span className="qb__tag qb__tag--done">✔ Turned In</span>}
                {complete && !turnedIn && <span className="qb__tag qb__tag--complete">✔ Complete</span>}
                {accepted && !complete && <span className="qb__tag qb__tag--active">Active</span>}
              </div>
              <p className="qb__desc">{quest.summary}</p>
              <div className="qb__footer">
                <span className="qb__reward">
                  {quest.reward?.gold && `${quest.reward.gold}g`}
                  {quest.reward?.xp && ` · ${quest.reward.xp} XP`}
                </span>
                {!accepted && (
                  <button type="button" className="qb__accept" onClick={() => handleAccept(quest.id)}>
                    Accept
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
