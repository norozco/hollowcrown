import { useState } from 'react';
import { useQuestStore } from '../../state/questStore';
import { usePlayerStore } from '../../state/playerStore';
import { ALL_QUEST_IDS, getQuest } from '../../engine/quests';
import { getCurrentRank, getNextRank } from '../../engine/ranks';
import './QuestBoard.css';

interface Props { onClose: () => void; }

export function QuestBoard({ onClose }: Props) {
  const active = useQuestStore((s) => s.active);
  const accept = useQuestStore((s) => s.accept);
  const character = usePlayerStore((s) => s.character);
  usePlayerStore((s) => s.version);
  const [flash, setFlash] = useState<string | null>(null);

  const questsCompleted = Object.values(active).filter((q) => q.turnedIn).length;
  const rank = getCurrentRank(questsCompleted, character?.level ?? 1);
  const nextRank = getNextRank(rank);

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
        <h2>Quest Board</h2>
        <span className="qb__rank" style={{ color: rank.color }}>
          [{rank.label}] {rank.name}
          {nextRank && (
            <span className="qb__rank-progress" style={{ color: '#8a7a48' }}>
              {' '}— Next: {nextRank.name} ({questsCompleted}/{nextRank.questsRequired} quests, Lvl {character?.level ?? 1}/{nextRank.levelRequired})
            </span>
          )}
        </span>
        <button type="button" className="qb__close" onClick={onClose}>&#10005;</button>
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
