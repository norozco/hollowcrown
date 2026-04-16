import { useEffect, useRef } from 'react';
import { useCombatStore } from '../../state/combatStore';
import { usePlayerStore } from '../../state/playerStore';
import './CombatOverlay.css';

/**
 * Full-screen combat overlay. Shows the battle log, HP bars for both
 * sides, and action buttons during the player's turn.
 *
 * Keyboard: 1=Attack, 2=Defend, 3=Flee, Enter=End (after victory/defeat).
 */
export function CombatOverlay() {
  const state = useCombatStore((s) => s.state);
  const monster = useCombatStore((s) => s.monster);
  const act = useCombatStore((s) => s.act);
  const finish = useCombatStore((s) => s.finish);
  const character = usePlayerStore((s) => s.character);
  usePlayerStore((s) => s.version);

  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll combat log.
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state?.log.length]);

  // Keyboard controls.
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (state.phase === 'player_turn') {
        if (e.key === '1') { e.preventDefault(); act('attack'); }
        else if (e.key === '2') { e.preventDefault(); act('defend'); }
        else if (e.key === '3') { e.preventDefault(); act('flee'); }
      } else if (state.phase === 'victory' || state.phase === 'defeat' || state.phase === 'fled') {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, act, finish]);

  if (!state || !monster || !character) return null;

  const isOver = state.phase === 'victory' || state.phase === 'defeat' || state.phase === 'fled';
  const isPlayerTurn = state.phase === 'player_turn';
  const monsterHpPct = Math.max(0, state.monsterHp / monster.maxHp * 100);
  const playerHpPct = Math.max(0, state.playerHp / character.derived.maxHp * 100);

  return (
    <div className="combat" role="dialog" aria-label="Combat">
      {/* Enemy info */}
      <div className="combat__enemy">
        <div className="combat__enemy-sprite" style={{ background: monster.color }} />
        <div className="combat__enemy-info">
          <h3>{monster.name}</h3>
          <div className="combat__hp-bar">
            <div className="combat__hp-fill combat__hp-fill--enemy" style={{ width: `${monsterHpPct}%` }} />
            <span>{state.monsterHp}/{monster.maxHp}</span>
          </div>
        </div>
      </div>

      {/* Player info */}
      <div className="combat__player">
        <div className="combat__player-info">
          <h3>{character.name}</h3>
          <div className="combat__hp-bar">
            <div className="combat__hp-fill combat__hp-fill--player" style={{ width: `${playerHpPct}%` }} />
            <span>{state.playerHp}/{character.derived.maxHp}</span>
          </div>
        </div>
      </div>

      {/* Combat log */}
      <div className="combat__log">
        {state.log.map((entry, i) => (
          <p key={i} className={`combat__log-entry combat__log--${entry.type}`}>
            {entry.text}
          </p>
        ))}
        <div ref={logEndRef} />
      </div>

      {/* Actions */}
      <div className="combat__actions">
        {isPlayerTurn && (
          <>
            <button type="button" className="combat__btn" onClick={() => act('attack')}>
              <span className="combat__btn-key">1</span> Attack
            </button>
            <button type="button" className="combat__btn" onClick={() => act('defend')}>
              <span className="combat__btn-key">2</span> Defend
            </button>
            <button type="button" className="combat__btn combat__btn--flee" onClick={() => act('flee')}>
              <span className="combat__btn-key">3</span> Flee
            </button>
          </>
        )}
        {state.phase === 'enemy_turn' && (
          <p className="combat__waiting">Enemy's turn...</p>
        )}
        {isOver && (
          <div className="combat__result">
            {state.phase === 'victory' && (
              <p className="combat__victory">
                Victory! +{monster.xpReward} XP, +{monster.goldReward}g
              </p>
            )}
            {state.phase === 'defeat' && (
              <p className="combat__defeat">
                {character.difficulty === 'hardcore' ? 'Death is final.' : 'You fall. Lost 10% gold.'}
              </p>
            )}
            {state.phase === 'fled' && (
              <p className="combat__fled">You escaped.</p>
            )}
            <button type="button" className="combat__btn combat__btn--end" onClick={finish}>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
