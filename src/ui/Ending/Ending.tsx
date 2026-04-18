import { useState, useEffect } from 'react';
import { usePlayerStore } from '../../state/playerStore';
import { useAchievementStore } from '../../state/achievementStore';
import { getCurrentRank } from '../../engine/ranks';
import { useQuestStore } from '../../state/questStore';
import './Ending.css';

interface Props {
  onClose: () => void;
}

const LINES = [
  { text: 'The throne sits empty.', delay: 0 },
  { text: 'It always did.', delay: 2500 },
  { text: '', delay: 4500 },
  { text: 'The crown was never meant to be worn.', delay: 5500 },
  { text: 'It was meant to be forgotten.', delay: 8000 },
  { text: '', delay: 10000 },
  { text: 'You did what no one else could.', delay: 11000 },
  { text: 'Not because you were stronger.', delay: 13500 },
  { text: 'Because you came back.', delay: 15500 },
];

const STATS_DELAY = 18000;
const TITLE_DELAY = 24000;
const EPILOGUE_DELAY = 26000;
const BUTTON_DELAY = 29000;

export function Ending({ onClose }: Props) {
  const character = usePlayerStore((s) => s.character);
  usePlayerStore((s) => s.version);
  const deaths = useAchievementStore((s) => s.totalDeaths);
  const kills = useAchievementStore((s) => s.totalKills);
  const questActive = useQuestStore((s) => s.active);
  const questsCompleted = Object.values(questActive).filter((q) => q.turnedIn).length;

  const [visibleLines, setVisibleLines] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showEpilogue, setShowEpilogue] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Reveal lines one by one
    for (let i = 0; i < LINES.length; i++) {
      timers.push(setTimeout(() => setVisibleLines(i + 1), LINES[i].delay));
    }

    timers.push(setTimeout(() => setShowStats(true), STATS_DELAY));
    timers.push(setTimeout(() => setShowTitle(true), TITLE_DELAY));
    timers.push(setTimeout(() => setShowEpilogue(true), EPILOGUE_DELAY));
    timers.push(setTimeout(() => setShowButton(true), BUTTON_DELAY));

    return () => timers.forEach(clearTimeout);
  }, []);

  if (!character) return null;

  const rank = getCurrentRank(questsCompleted, character.level);

  return (
    <div className="ending">
      {LINES.slice(0, visibleLines).map((line, i) =>
        line.text === '' ? (
          <div key={i} style={{ height: '1.2rem' }} />
        ) : (
          <div
            key={i}
            className="ending__line"
            style={{ animationDelay: '0s' }}
          >
            {line.text}
          </div>
        ),
      )}

      {showStats && (
        <>
          <div className="ending__line ending__line--stats" style={{ animationDelay: '0s' }}>
            {character.name} — {character.race.name} {character.characterClass.name}
          </div>
          <div className="ending__line ending__line--stats" style={{ animationDelay: '0.3s' }}>
            {rank.name} — Level {character.level}
          </div>
          <div className="ending__line ending__line--stats" style={{ animationDelay: '0.6s' }}>
            {deaths} death{deaths !== 1 ? 's' : ''} — {kills} enem{kills !== 1 ? 'ies' : 'y'} felled
          </div>
        </>
      )}

      {showTitle && (
        <div className="ending__line ending__line--title" style={{ animationDelay: '0s' }}>
          HOLLOWCROWN
        </div>
      )}

      {showEpilogue && (
        <>
          <div className="ending__line ending__line--dim" style={{ animationDelay: '0s' }}>
            The world remembers your name.
          </div>
          <div className="ending__line ending__line--dim" style={{ animationDelay: '0.5s' }}>
            Even if the stones do not.
          </div>
        </>
      )}

      {showButton && (
        <button
          type="button"
          className="ending__btn"
          onClick={onClose}
          style={{ animationDelay: '0s' }}
        >
          Continue Playing
        </button>
      )}
    </div>
  );
}
