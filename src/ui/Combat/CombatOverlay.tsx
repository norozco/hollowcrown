import { useEffect, useRef } from 'react';
import { useCombatStore } from '../../state/combatStore';
import { usePlayerStore } from '../../state/playerStore';
import { CLASS_SKILLS } from '../../engine/combat';
import './CombatOverlay.css';

/**
 * Combat action bar — slim panel at the bottom of the screen.
 * The Phaser CombatScene renders the visual battlefield above.
 * This overlay handles: combat log + action buttons.
 *
 * Keys: 1=Attack, 2=Defend, 3=Flee, Enter/Space=Continue after end.
 */
export function CombatOverlay() {
  const state = useCombatStore((s) => s.state);
  const monster = useCombatStore((s) => s.monster);
  const act = useCombatStore((s) => s.act);
  const finish = useCombatStore((s) => s.finish);
  const character = usePlayerStore((s) => s.character);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state?.log.length]);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      // Read the CURRENT phase from the store to avoid acting on stale
      // closure state which caused duplicate enemy-turn scheduling.
      const current = useCombatStore.getState().state;
      if (!current) return;
      if (current.phase === 'player_turn') {
        if (e.key === '1') { e.preventDefault(); act('attack'); }
        else if (e.key === '2') { e.preventDefault(); act('skill'); }
        else if (e.key === '3') { e.preventDefault(); act('defend'); }
        else if (e.key === '4') { e.preventDefault(); act('flee'); }
      } else if (current.phase === 'victory' || current.phase === 'defeat' || current.phase === 'fled') {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, act, finish]);

  if (!state || !monster || !character) return null;

  const isOver = state.phase === 'victory' || state.phase === 'defeat' || state.phase === 'fled';
  const isPlayerTurn = state.phase === 'player_turn';

  return (
    <div className="combat">
      <div className="combat__log">
        {state.log.map((entry, i) => (
          <p key={i} className={`combat__log-entry combat__log--${entry.type}`}>
            {entry.text}
          </p>
        ))}
        <div ref={logEndRef} />
      </div>

      <div className="combat__actions">
        {isPlayerTurn && (
          <>
            <button type="button" className="combat__btn" onClick={() => act('attack')}>
              <span className="combat__btn-key">1</span> Attack
            </button>
            {character && CLASS_SKILLS[character.characterClass.key] && (
              <button
                type="button"
                className="combat__btn"
                onClick={() => act('skill')}
                title={CLASS_SKILLS[character.characterClass.key].description}
              >
                <span className="combat__btn-key">2</span>
                {CLASS_SKILLS[character.characterClass.key].name}
                {CLASS_SKILLS[character.characterClass.key].mpCost > 0 && (
                  <span style={{ color: '#80a0e0', fontSize: '0.75rem', marginLeft: '0.3rem' }}>
                    ({CLASS_SKILLS[character.characterClass.key].mpCost} MP)
                  </span>
                )}
              </button>
            )}
            <button type="button" className="combat__btn" onClick={() => act('defend')}>
              <span className="combat__btn-key">3</span> Defend
            </button>
            <button type="button" className="combat__btn combat__btn--flee" onClick={() => act('flee')}>
              <span className="combat__btn-key">4</span> Flee
            </button>
          </>
        )}
        {state.phase === 'enemy_turn' && (
          <p className="combat__waiting">Enemy's turn...</p>
        )}
        {isOver && (
          <div className="combat__result">
            {state.phase === 'victory' && (
              <p className="combat__victory">Victory! +{monster.xpReward} XP, +{monster.goldReward}g</p>
            )}
            {state.phase === 'defeat' && (
              <p className="combat__defeat">
                {character.difficulty === 'hardcore' ? 'Death is final.' : 'You fall. Lost 10% gold.'}
              </p>
            )}
            {state.phase === 'fled' && <p className="combat__fled">You escaped.</p>}
            <button type="button" className="combat__btn combat__btn--end" onClick={finish}>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
