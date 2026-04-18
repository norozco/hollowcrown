import { useState } from 'react';
import { useQuestStore } from '../../state/questStore';
import { usePlayerStore } from '../../state/playerStore';
import { useBountyStore } from '../../state/bountyStore';
import { useInventoryStore } from '../../state/inventoryStore';
import { ALL_QUEST_IDS, getQuest } from '../../engine/quests';
import { getCurrentRank, getNextRank } from '../../engine/ranks';
import './QuestBoard.css';

interface Props { onClose: () => void; }

export function QuestBoard({ onClose }: Props) {
  const active = useQuestStore((s) => s.active);
  const accept = useQuestStore((s) => s.accept);
  const character = usePlayerStore((s) => s.character);
  usePlayerStore((s) => s.version);
  const bounty = useBountyStore((s) => s.active);
  const bountyKills = useBountyStore((s) => s.killProgress);
  const bountyTotal = useBountyStore((s) => s.totalCompleted);
  const bountyAccept = useBountyStore((s) => s.accept);
  const bountyCheck = useBountyStore((s) => s.checkCompletion);
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

  const handleClaimBounty = () => {
    if (!bounty || !character) return;
    // For collection bounties, verify inventory at claim time
    if (bounty.target.type === 'collect') {
      const inv = useInventoryStore.getState();
      const owned = inv.slots.find(s => s.item.key === bounty.target.itemKey)?.quantity ?? 0;
      if (owned < bounty.target.count) return;
      inv.removeItem(bounty.target.itemKey, bounty.target.count);
    }
    character.addGold(bounty.reward.gold);
    character.gainXp(bounty.reward.xp);
    usePlayerStore.getState().notify();
    useBountyStore.setState((s) => ({ totalCompleted: s.totalCompleted + 1 }));
    bountyAccept(); // roll a new bounty
    window.dispatchEvent(new CustomEvent('gameMessage', {
      detail: `Bounty complete. +${bounty.reward.gold}g, +${bounty.reward.xp} XP`,
    }));
  };

  // Determine bounty progress
  const getBountyProgress = (): { current: number; needed: number } | null => {
    if (!bounty) return null;
    if (bounty.target.type === 'kill') {
      return { current: bountyKills, needed: bounty.target.count };
    }
    const inv = useInventoryStore.getState();
    const owned = inv.slots.find(s => s.item.key === bounty.target.itemKey)?.quantity ?? 0;
    return { current: Math.min(owned, bounty.target.count), needed: bounty.target.count };
  };

  const bountyProgress = getBountyProgress();
  const bountyDone = bounty
    ? bounty.target.type === 'kill'
      ? bountyCheck()
      : (bountyProgress?.current ?? 0) >= (bountyProgress?.needed ?? 1)
    : false;

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
      <div className="qb__bounty">
        <h3 className="qb__bounty-heading">Bounty Board <span className="qb__bounty-count">{bountyTotal} completed</span></h3>
        {!bounty ? (
          <div className="qb__bounty-empty">
            <p className="qb__desc">Repeatable tasks. Gold and experience, no questions asked.</p>
            <button type="button" className="qb__accept" onClick={bountyAccept}>Accept Bounty</button>
          </div>
        ) : (
          <div className="qb__bounty-active">
            <div className="qb__quest-header">
              <h3>{bounty.title}</h3>
              {bountyDone && <span className="qb__tag qb__tag--complete">Ready</span>}
              {!bountyDone && <span className="qb__tag qb__tag--active">Active</span>}
            </div>
            <p className="qb__desc">{bounty.description}</p>
            {bountyProgress && (
              <p className="qb__bounty-progress">
                {bounty.target.type === 'kill' ? 'Kill' : 'Collect'}{' '}
                {bountyProgress.current}/{bountyProgress.needed}
              </p>
            )}
            <div className="qb__footer">
              <span className="qb__reward">{bounty.reward.gold}g · {bounty.reward.xp} XP</span>
              {bountyDone && (
                <button type="button" className="qb__accept" onClick={handleClaimBounty}>Claim Reward</button>
              )}
            </div>
          </div>
        )}
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
