import { useEffect, useRef, useState } from 'react';
import { useCombatStore } from '../../state/combatStore';
import { usePlayerStore } from '../../state/playerStore';
import { useInventoryStore } from '../../state/inventoryStore';
import { CLASS_SKILLS, type StatusEffects } from '../../engine/combat';
import { COMPANIONS, companionBonusLabel } from '../../engine/companion';
import { getItem } from '../../engine/items';
import { xpForLevel } from '../../engine/character';
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
  const lastLoot = useCombatStore((s) => s.lastLoot);
  const act = useCombatStore((s) => s.act);
  const finish = useCombatStore((s) => s.finish);
  const useItem = useCombatStore((s) => s.useItem);
  const character = usePlayerStore((s) => s.character);
  usePlayerStore((s) => s.version); // re-render on XP/level changes
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

  // Delay the Continue button: 2.5s on defeat, 1s on victory (let loot screen breathe)
  useEffect(() => {
    if (!state) { setContinueReady(false); return; }
    if (state.phase === 'defeat') {
      setContinueReady(false);
      const t = setTimeout(() => setContinueReady(true), 2500);
      return () => clearTimeout(t);
    } else if (state.phase === 'victory') {
      setContinueReady(false);
      const t = setTimeout(() => setContinueReady(true), 1000);
      return () => clearTimeout(t);
    } else if (state.phase === 'fled') {
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

  const ELEMENT_ICONS: Record<string, string> = {
    fire: '🔥',
    ice: '❄',
    poison: '☠',
    shadow: '🌑',
    physical: '⚔',
  };

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
        <div className="combat__status-enemy-col">
          <StatusSide status={state.monsterStatus} enemy />
          {monster.weakness && (
            <span className="combat__weakness-hint">
              Weak to: {ELEMENT_ICONS[monster.weakness] ?? monster.weakness}
            </span>
          )}
        </div>
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
            {state.phase === 'victory' && (() => {
              const curXp = character.xp;
              const curLevel = character.level;
              const xpFloor = xpForLevel(curLevel);
              const xpCeil = xpForLevel(curLevel + 1);
              const xpInLevel = curXp - xpFloor;
              const xpRange = xpCeil === Infinity ? 1 : xpCeil - xpFloor;
              const barFill = xpCeil === Infinity ? 100 : Math.min(100, Math.round((xpInLevel / xpRange) * 100));
              const gainedFill = xpCeil === Infinity ? 0 : Math.min(100 - barFill, Math.round((monster.xpReward / xpRange) * 100));
              return (
                <div className="combat__results">
                  <h3 className="combat__results-title">VICTORY</h3>
                  <div className="combat__results-xp">
                    <span>+{monster.xpReward} XP</span>
                    <div className="combat__xp-bar-track">
                      <div className="combat__xp-bar-fill" style={{ width: `${barFill}%` }} />
                      <div className="combat__xp-bar-gain" style={{ left: `${barFill}%`, width: `${gainedFill}%` }} />
                    </div>
                    <span className="combat__xp-label">Lv {curLevel} — {curXp}/{xpCeil === Infinity ? 'MAX' : xpCeil} XP</span>
                  </div>
                  <div className="combat__results-gold">&#9670; +{monster.goldReward}g</div>
                  {lastLoot.length > 0 && (
                    <div className="combat__results-loot">
                      <span className="combat__results-loot-label">Loot:</span>
                      {lastLoot.map((key, i) => (
                        <span key={i} className="combat__results-loot-item">{getItem(key).name}</span>
                      ))}
                    </div>
                  )}
                  {continueReady && (
                    <button type="button" className="combat__btn combat__btn--end" onClick={finish}>Continue</button>
                  )}
                </div>
              );
            })()}
            {state.phase === 'defeat' && (
              <p className="combat__defeat">
                {character.difficulty === 'hardcore' ? 'Death is final.' : 'Lost 10% gold. You wake in town.'}
              </p>
            )}
            {state.phase === 'fled' && <p className="combat__fled">You escaped.</p>}
            {(state.phase === 'defeat' || state.phase === 'fled') && (state.phase !== 'defeat' || continueReady) && (
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
