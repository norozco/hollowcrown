import { useEffect, useRef, useState } from 'react';
import { useCombatStore } from '../../state/combatStore';
import { usePlayerStore } from '../../state/playerStore';
import { useInventoryStore } from '../../state/inventoryStore';
import { CLASS_SKILLS, type StatusEffects } from '../../engine/combat';
import { COMPANIONS, companionBonusLabel } from '../../engine/companion';
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
  const useItem = useCombatStore((s) => s.useItem);
  const character = usePlayerStore((s) => s.character);
  const companionKey = usePlayerStore((s) => s.companion);
  const invSlots = useInventoryStore((s) => s.slots);
  const activeCompanion = companionKey ? COMPANIONS[companionKey] : null;

  const logEndRef = useRef<HTMLDivElement>(null);
  const continueReadyRef = useRef(false);
  const [continueReady, setContinueReady] = useState(false);
  const [itemPopupOpen, setItemPopupOpen] = useState(false);

  // Keep ref in sync with state for keydown handler
  useEffect(() => { continueReadyRef.current = continueReady; }, [continueReady]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state?.log.length]);

  // Delay the Continue button on defeat by 2.5s (to let death screen play)
  useEffect(() => {
    if (!state) { setContinueReady(false); return; }
    if (state.phase === 'defeat') {
      setContinueReady(false);
      const t = setTimeout(() => setContinueReady(true), 2500);
      return () => clearTimeout(t);
    } else if (state.phase === 'victory' || state.phase === 'fled') {
      setContinueReady(true);
    } else {
      setContinueReady(false);
    }
  }, [state?.phase]);

  // Close item popup when leaving player turn
  useEffect(() => {
    if (state?.phase !== 'player_turn') setItemPopupOpen(false);
  }, [state?.phase]);

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
        else if (e.key === '5') { e.preventDefault(); setItemPopupOpen((v) => !v); }
      } else if (current.phase === 'victory' || current.phase === 'fled') {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); }
      } else if (current.phase === 'defeat') {
        // Only allow continue after the delay
        if ((e.key === 'Enter' || e.key === ' ') && continueReadyRef.current) { e.preventDefault(); finish(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, act, finish]);

  if (!state || !monster || !character) return null;

  const STATUS_ICONS: Record<keyof StatusEffects, string> = {
    poison: '☠',
    burn: '🔥',
    bleed: '🩸',
    stun: '⚡',
    marked: '🎯',
  };

  function StatusSide({ status, enemy }: { status: StatusEffects; enemy?: boolean }) {
    const entries = (Object.entries(status) as [keyof StatusEffects, number][]).filter(([, v]) => v > 0);
    return (
      <div className={`combat__status-side${enemy ? ' combat__status-side--enemy' : ''}`}>
        {entries.map(([name, turns]) => (
          <span key={name} className={`combat__status-badge combat__status--${name}`}>
            {STATUS_ICONS[name]} {turns}
          </span>
        ))}
      </div>
    );
  }

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

      <div className="combat__status">
        <StatusSide status={state.playerStatus} />
        <StatusSide status={state.monsterStatus} enemy />
      </div>

      {activeCompanion && (
        <div className="combat__companion">
          Companion: {activeCompanion.name} ({companionBonusLabel(activeCompanion)})
        </div>
      )}

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
            <div className="combat__item-wrapper">
              <button
                type="button"
                className="combat__btn combat__btn--item"
                onClick={() => setItemPopupOpen(!itemPopupOpen)}
              >
                <span className="combat__btn-key">5</span> Item
              </button>
              {itemPopupOpen && (
                <div className="combat__item-popup">
                  {invSlots
                    .filter((s) => s.item.type === 'consumable')
                    .map((s) => (
                      <button
                        key={s.item.key}
                        type="button"
                        className="combat__item-option"
                        onClick={() => {
                          useItem(s.item.key);
                          setItemPopupOpen(false);
                        }}
                      >
                        {s.item.name} x{s.quantity}
                      </button>
                    ))}
                  {invSlots.filter((s) => s.item.type === 'consumable').length === 0 && (
                    <p className="combat__item-empty">No items.</p>
                  )}
                </div>
              )}
            </div>
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
                {character.difficulty === 'hardcore' ? 'Death is final.' : 'Lost 10% gold. You wake in town.'}
              </p>
            )}
            {state.phase === 'fled' && <p className="combat__fled">You escaped.</p>}
            {(state.phase !== 'defeat' || continueReady) && (
              <button type="button" className="combat__btn combat__btn--end" onClick={finish}>
                Continue
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
