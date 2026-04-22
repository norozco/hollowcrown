import { useEffect, useRef, useState } from 'react';
import { useCombatStore, type CombatEvent } from '../../state/combatStore';
import { usePlayerStore } from '../../state/playerStore';
import { useInventoryStore } from '../../state/inventoryStore';
import { CLASS_SKILLS, type StatusEffects } from '../../engine/combat';
import { COMPANIONS, companionBonusLabel } from '../../engine/companion';
import { getItem } from '../../engine/items';
import { xpForLevel } from '../../engine/character';
import { getPerkHpBonus } from '../../engine/perks';
import { getHeartPieceHpBonus } from '../../state/playerStore';
import './CombatOverlay.css';

/**
 * Combat action bar — slim panel at the bottom of the screen.
 * The Phaser CombatScene renders the visual battlefield above.
 * This overlay handles: combat log + action buttons.
 *
 * Keys: 1=Attack, 2=Defend, 3=Flee, Enter/Space=Continue after end.
 */
const DEATH_MESSAGES = [
  'You fall. The darkness takes you.',
  'The world goes quiet.',
  'You tried. The cairn remembers.',
  'Not yet. Not like this.',
  'The ground is cold. You close your eyes.',
];

export function CombatOverlay() {
  const state = useCombatStore((s) => s.state);
  const monster = useCombatStore((s) => s.monster);
  const lastLoot = useCombatStore((s) => s.lastLoot) ?? [];
  const act = useCombatStore((s) => s.act);
  const rawFinish = useCombatStore((s) => s.finish);
  // Wrap finish() so that even if reward application throws (e.g. achievement
  // toast renders badly, quest store mutation error, etc.) we still force the
  // combat state to null so CombatScene.update will transition back to the
  // world scene. Previously an exception mid-finish() left state non-null
  // and the player stuck on the victory screen.
  const finish = () => {
    // eslint-disable-next-line no-console
    console.log('[CombatOverlay] finish() called', { phase: state?.phase, monster: monster?.key });
    try {
      rawFinish();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[CombatOverlay] finish() threw — force-clearing combat state', err);
      useCombatStore.setState({
        state: null, monster: null, _enemyActing: false,
        _pendingEnemyId: '', lastLoot: [], combatEvents: [],
      } as Partial<ReturnType<typeof useCombatStore.getState>>);
    }
  };
  const useItem = useCombatStore((s) => s.useItem);
  const character = usePlayerStore((s) => s.character);
  usePlayerStore((s) => s.version); // re-render on XP/level changes
  const companionKey = usePlayerStore((s) => s.companion);
  const invSlots = useInventoryStore((s) => s.slots);
  const activeCompanion = companionKey ? COMPANIONS[companionKey] : null;

  const combatEvents = useCombatStore((s) => s.combatEvents);
  const clearEvent = useCombatStore((s) => s.clearEvent);

  const logEndRef = useRef<HTMLDivElement>(null);
  const continueReadyRef = useRef(false);
  const [continueReady, setContinueReady] = useState(false);
  const [itemPopupOpen, setItemPopupOpen] = useState(false);
  const deathMsgRef = useRef<string>('');
  const [shake, setShake] = useState(false);
  const [playerHitFlash, setPlayerHitFlash] = useState(0);
  const [enemyHitFlash, setEnemyHitFlash] = useState(0);
  const [playerSlash, setPlayerSlash] = useState<{ id: number; crit: boolean } | null>(null);
  const [enemySlash, setEnemySlash] = useState<{ id: number; crit: boolean } | null>(null);

  // Track which event ids have already been processed so we only react once
  // per emission even when the events array changes for other reasons.
  const seenEventIds = useRef<Set<number>>(new Set());
  useEffect(() => {
    const fresh = combatEvents.filter((e) => !seenEventIds.current.has(e.id));
    if (fresh.length === 0) return;
    for (const ev of fresh) {
      seenEventIds.current.add(ev.id);
      // Shake on heavy hits or crits
      if ((ev.kind === 'damage' && ev.amount >= 10) || ev.kind === 'crit') {
        setShake(false);
        requestAnimationFrame(() => setShake(true));
        window.setTimeout(() => setShake(false), 260);
      }
      // Hit flash + slash/star
      if (ev.kind === 'damage' || ev.kind === 'crit') {
        if (ev.target === 'enemy') {
          setEnemyHitFlash((n) => n + 1);
          setEnemySlash({ id: ev.id, crit: ev.kind === 'crit' });
          window.setTimeout(() => setEnemySlash((s) => (s?.id === ev.id ? null : s)), 220);
        } else {
          setPlayerHitFlash((n) => n + 1);
          setPlayerSlash({ id: ev.id, crit: ev.kind === 'crit' });
          window.setTimeout(() => setPlayerSlash((s) => (s?.id === ev.id ? null : s)), 220);
        }
      }
      // Auto-prune after floating-number animation completes
      window.setTimeout(() => clearEvent(ev.id), 900);
    }
  }, [combatEvents, clearEvent]);

  // Lock in a death message when defeat phase is first reached.
  useEffect(() => {
    if (state?.phase === 'defeat') {
      deathMsgRef.current = DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)];
    }
  }, [state?.phase]);

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

  // Defensive: ensure status objects exist (old saves may not have them)
  const playerStatus = state.playerStatus ?? { poison: 0, burn: 0, stun: 0, bleed: 0, marked: 0 };
  const monsterStatus = state.monsterStatus ?? { poison: 0, burn: 0, stun: 0, bleed: 0, marked: 0 };

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

  // HP bar percentages
  const perkHpB = getPerkHpBonus(usePlayerStore.getState().perks);
  const heartHpB = getHeartPieceHpBonus(usePlayerStore.getState().heartPieces);
  const playerMaxHp = character.derived.maxHp + perkHpB + heartHpB;
  const playerHpPct = Math.max(0, Math.min(100, (state.playerHp / playerMaxHp) * 100));
  const enemyHpPct = Math.max(0, Math.min(100, (state.monsterHp / monster.maxHp) * 100));

  const playerEvents = combatEvents.filter((e) => e.target === 'player');
  const enemyEvents = combatEvents.filter((e) => e.target === 'enemy');

  return (
    <div className={`combat${shake ? ' combat--shake' : ''}`}>
      <div className="combat__battlefield">
        <CombatantPanel
          side="player"
          name={character.name}
          hpPct={playerHpPct}
          hp={state.playerHp}
          maxHp={playerMaxHp}
          flashKey={playerHitFlash}
          events={playerEvents}
          slash={playerSlash}
        />
        <div className="combat__vs">VS</div>
        <CombatantPanel
          side="enemy"
          name={monster.name}
          hpPct={enemyHpPct}
          hp={state.monsterHp}
          maxHp={monster.maxHp}
          flashKey={enemyHitFlash}
          events={enemyEvents}
          slash={enemySlash}
        />
      </div>
      <div className="combat__log">
        {state.log.map((entry, i) => (
          <p key={i} className={`combat__log-entry combat__log--${entry.type}`}>
            {entry.text}
          </p>
        ))}
        <div ref={logEndRef} />
      </div>

      <div className="combat__status">
        <StatusSide status={playerStatus} />
        <div className="combat__status-enemy-col">
          <StatusSide status={monsterStatus} enemy />
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
              <div className="combat__defeat">
                <p className="combat__defeat-msg">{deathMsgRef.current}</p>
                <p className="combat__defeat-penalty">
                  {character.difficulty === 'hardcore' ? 'Death is final.' : 'Lost 10% gold. You wake in town.'}
                </p>
              </div>
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

/**
 * Portrait + HP bar + floating-number layer for one combatant.
 * The HP bar fills are width-transitioned so damage drains smoothly;
 * a brighter "lag bar" sits underneath and trails the real bar.
 */
function CombatantPanel({
  side, name, hpPct, hp, maxHp, flashKey, events, slash,
}: {
  side: 'player' | 'enemy';
  name: string;
  hpPct: number;
  hp: number;
  maxHp: number;
  flashKey: number;
  events: CombatEvent[];
  slash: { id: number; crit: boolean } | null;
}) {
  // "Lag bar" — trails behind the real HP bar on damage for a Persona-5 feel
  const [lagPct, setLagPct] = useState(hpPct);
  useEffect(() => {
    if (hpPct < lagPct) {
      // Delay, then catch up
      const t = window.setTimeout(() => setLagPct(hpPct), 200);
      return () => clearTimeout(t);
    }
    setLagPct(hpPct);
  }, [hpPct, lagPct]);

  return (
    <div className={`combat__panel combat__panel--${side}`}>
      <div className="combat__panel-name">{name}</div>
      <div
        key={flashKey}
        className={`combat__portrait combat__portrait--${side}${
          flashKey > 0 ? ` combat__portrait--hit-${side}` : ''
        }`}
      >
        <span className="combat__portrait-glyph">{side === 'player' ? '\u2020' : '\u2620'}</span>
        {slash && (
          slash.crit ? (
            <span key={slash.id} className="combat__starburst" aria-hidden />
          ) : (
            <span key={slash.id} className="combat__slash" aria-hidden />
          )
        )}
        <div className="combat__floats">
          {events.map((ev) => (
            <FloatingNumber key={ev.id} ev={ev} />
          ))}
        </div>
      </div>
      <div className="combat__hp-wrap">
        <div className="combat__hp-track">
          <div className="combat__hp-lag" style={{ width: `${lagPct}%` }} />
          <div className={`combat__hp-fill combat__hp-fill--${side}`} style={{ width: `${hpPct}%` }} />
        </div>
        <div className="combat__hp-label">{hp} / {maxHp}</div>
      </div>
    </div>
  );
}

function FloatingNumber({ ev }: { ev: CombatEvent }) {
  let cls = 'combat__float';
  let text = String(ev.amount);
  if (ev.kind === 'heal') { cls += ' combat__float--heal'; text = `+${ev.amount}`; }
  else if (ev.kind === 'miss') { cls += ' combat__float--miss'; text = 'MISS'; }
  else if (ev.kind === 'crit') { cls += ' combat__float--crit'; text = `CRIT! ${ev.amount}`; }
  else if (ev.target === 'player') { cls += ' combat__float--player-dmg'; text = `-${ev.amount}`; }
  else { cls += ' combat__float--enemy-dmg'; text = `-${ev.amount}`; }

  // Nudge horizontally so stacked numbers don't overlap perfectly
  const offset = (ev.id % 5) * 12 - 24;
  return (
    <span className={cls} style={{ left: `calc(50% + ${offset}px)` }}>
      {text}
      {ev.kind === 'crit' && <span className="combat__crit-star" aria-hidden />}
    </span>
  );
}
