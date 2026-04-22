import { useEffect, useState } from 'react';
import { useUIStore } from '../state/uiStore';
import { useCharacterCreationStore } from '../state/characterCreationStore';
import { usePlayerStore } from '../state/playerStore';
import { useQuestStore } from '../state/questStore';
import { useInventoryStore } from '../state/inventoryStore';
import { useCombatStore } from '../state/combatStore';
import { useAchievementStore } from '../state/achievementStore';
import { useLoreStore } from '../state/loreStore';
import { useCommissionStore } from '../state/commissionStore';
import { useBountyStore } from '../state/bountyStore';
import { rollRandomCharacter } from '../engine/random-character';
import { loadGame, getSaveSlots, type SaveSlotInfo } from '../engine/saveLoad';
import { Credits } from './Credits/Credits';
import './MainMenu.css';

// Pre-compute ash particle styles at module load so they're stable across
// re-renders and satisfy react-hooks/purity (Math.random isn't called in render).
const ASH_PARTICLES = Array.from({ length: 30 }, () => ({
  left: `${Math.random() * 100}%`,
  animationDelay: `${Math.random() * 8}s`,
  animationDuration: `${8 + Math.random() * 6}s`,
  opacity: 0.2 + Math.random() * 0.4,
}));

/**
 * Main menu overlay. Rendered above the Phaser canvas via the React UI
 * layer. New Game leads into character creation; Random Hero skips the
 * wizard entirely with a sensible random character.
 */
export function MainMenu() {
  const setScreen = useUIStore((s) => s.setScreen);
  const resetCreation = useCharacterCreationStore((s) => s.reset);
  const createPlayer = usePlayerStore((s) => s.create);

  const [loadPanelOpen, setLoadPanelOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [saveSlots, setSaveSlots] = useState<SaveSlotInfo[]>([]);
  const [attractMode, setAttractMode] = useState(false);

  const ashParticles = ASH_PARTICLES;

  // Attract mode: after 30s of no input, fade in a subtle ambient overlay.
  // Any mouse or keyboard activity instantly dismisses it.
  useEffect(() => {
    let lastActivity = Date.now();

    const checkIdle = () => {
      if (Date.now() - lastActivity > 30000) {
        setAttractMode((prev) => (prev ? prev : true));
      }
    };

    const onActivity = () => {
      lastActivity = Date.now();
      setAttractMode((prev) => (prev ? false : prev));
    };

    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('click', onActivity);
    const timer = window.setInterval(checkIdle, 1000);

    return () => {
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('click', onActivity);
      window.clearInterval(timer);
    };
  }, []);

  const gameComplete = typeof localStorage !== 'undefined' && localStorage.getItem('hc_game_complete') === '1';

  const onNewGame = () => {
    resetCreation(); // start with a clean slate
    setScreen('character-creation');
  };

  const onRandomHero = () => {
    try {
      createPlayer(rollRandomCharacter());
      resetCreation();
      setScreen('game');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(`Random roll produced an invalid hero: ${msg}`);
    }
  };

  const onOpenLoadPanel = () => {
    setSaveSlots(getSaveSlots());
    setLoadPanelOpen(true);
  };

  const onLoadSlot = (slot: string) => {
    if (loadGame(slot)) {
      setLoadPanelOpen(false);
      setScreen('game');
    } else {
      alert('Failed to load save.');
    }
  };

  const onNewGamePlus = () => {
    // Load autosave to carry over character progression
    if (!loadGame('autosave')) {
      alert('No autosave found. Complete the game first.');
      return;
    }

    // Keep: character (level, stats, gold), perks, heartPieces, ancientCoins, dungeonItems, equipment
    // Reset: quests, inventory (except equipped), killedEnemies, lore, commissions, bounties
    // Achievements: keep zonesVisited, reset the rest

    // Reset quests
    useQuestStore.getState().reset();

    // Reset inventory but preserve equipped items
    const inv = useInventoryStore.getState();
    const equipped = { ...inv.equipment };
    inv.reset();
    // Re-add equipped items
    for (const item of Object.values(equipped)) {
      if (item) {
        inv.addItem(item.key);
        inv.equip(item.key);
      }
    }

    // Reset killed enemies and quest kill counts
    useCombatStore.getState().killedEnemies.clear();
    useCombatStore.setState({ questKillCounts: {} });

    // Reset lore
    useLoreStore.getState().reset();

    // Reset commissions
    useCommissionStore.getState().reset();

    // Reset bounties
    useBountyStore.getState().reset();

    // Reset achievements but keep zonesVisited
    const achState = useAchievementStore.getState();
    const zonesKept = achState.zonesVisited;
    achState.reset();
    useAchievementStore.setState({ zonesVisited: zonesKept });

    // Set NG+ flag
    usePlayerStore.setState({ newGamePlus: true });

    setScreen('game');
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="main-menu" role="dialog" aria-label="Main menu">
      {attractMode && (
        <div className="main-menu__attract" aria-hidden="true">
          <div className="main-menu__attract-dim" />
          {ashParticles.map((style, i) => (
            <div
              key={i}
              className="main-menu__ash"
              style={style}
            />
          ))}
          <div className="main-menu__shadow-figure" />
        </div>
      )}
      {/* Floating light motes */}
      {['m1','m2','m3','m4','m5','m6','m7','m8'].map((c) => (
        <span key={c} className={`main-menu__mote ${c}`} aria-hidden="true" />
      ))}

      <div className="main-menu__title">
        {/* Glowing golden crown with gem */}
        <svg
          className="main-menu__crown"
          viewBox="0 0 120 80"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="hc-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff2c0" />
              <stop offset="45%" stopColor="#f0c850" />
              <stop offset="100%" stopColor="#8a6018" />
            </linearGradient>
            <radialGradient id="hc-gem" cx="0.5" cy="0.4" r="0.6">
              <stop offset="0%" stopColor="#ffb8c8" />
              <stop offset="50%" stopColor="#d03848" />
              <stop offset="100%" stopColor="#5a0818" />
            </radialGradient>
          </defs>
          {/* Crown body */}
          <path
            d="M10 60 L20 25 L38 45 L60 15 L82 45 L100 25 L110 60 Z"
            fill="url(#hc-gold)"
            stroke="#4a3010"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Base band */}
          <rect x="10" y="58" width="100" height="14" fill="url(#hc-gold)" stroke="#4a3010" strokeWidth="2" rx="2" />
          {/* Band shading stripe */}
          <rect x="12" y="64" width="96" height="2" fill="#8a6018" opacity="0.6" />
          {/* Peak orbs */}
          <circle cx="20" cy="25" r="4" fill="#fff2c0" stroke="#4a3010" strokeWidth="1.5" />
          <circle cx="100" cy="25" r="4" fill="#fff2c0" stroke="#4a3010" strokeWidth="1.5" />
          <circle cx="60" cy="15" r="5" fill="#fff2c0" stroke="#4a3010" strokeWidth="1.5" />
          {/* Central gem */}
          <ellipse cx="60" cy="65" rx="7" ry="5" fill="url(#hc-gem)" stroke="#4a0818" strokeWidth="1.2" />
          <ellipse cx="58" cy="63" rx="2" ry="1.2" fill="#ffd8e0" opacity="0.85" />
        </svg>
        <h1>HOLLOWCROWN</h1>
        <p className="main-menu__subtitle">A Kingdom of Hollow Echoes</p>
      </div>

      {loadPanelOpen ? (
        <div className="main-menu__load-panel" role="region" aria-label="Load game">
          <h2 className="main-menu__load-title">Load Game</h2>
          <div className="main-menu__load-slots">
            {saveSlots.map((s) => (
              <button
                key={s.slot}
                type="button"
                className={`main-menu__load-slot${s.timestamp === null ? ' is-empty' : ''}`}
                disabled={s.timestamp === null}
                onClick={() => onLoadSlot(s.slot)}
              >
                <span className="main-menu__load-slot-label">{s.label}</span>
                {s.timestamp !== null ? (
                  <span className="main-menu__load-slot-info">
                    <span className="main-menu__load-slot-name">{s.characterName}</span>
                    <span className="main-menu__load-slot-detail">
                      Lvl {s.level} · {s.raceName} {s.className}
                      {s.questCount != null && s.questCount > 0 ? ` · ${s.questCount} quests` : ''}
                      {s.dungeonItemCount != null && s.dungeonItemCount > 0 ? ` · ${s.dungeonItemCount} relics` : ''}
                      {s.heartPieces != null && s.heartPieces > 0 ? ` · ${s.heartPieces} hearts` : ''}
                      {s.newGamePlus ? ' · NG+' : ''}
                    </span>
                    <span className="main-menu__load-slot-date">{formatDate(s.timestamp)}</span>
                  </span>
                ) : (
                  <span className="main-menu__load-slot-info main-menu__load-slot-empty-label">
                    — Empty —
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="main-menu__load-back"
            onClick={() => setLoadPanelOpen(false)}
          >
            Back
          </button>
        </div>
      ) : (
        <nav className="main-menu__buttons" aria-label="Main menu actions">
          <button type="button" onClick={onNewGame} autoFocus>
            New Game
          </button>
          <button
            type="button"
            onClick={onRandomHero}
            title="Skip the wizard — roll everything randomly"
          >
            Random Hero
          </button>
          <button type="button" onClick={onOpenLoadPanel}>
            Load Game
          </button>
          {gameComplete && (
            <button type="button" onClick={onNewGamePlus} className="main-menu__ngplus-btn">
              New Game+
            </button>
          )}
          <button
            type="button"
            onClick={() => setCreditsOpen(true)}
          >
            Credits
          </button>
          <button
            type="button"
            onClick={() => {
              window.close();
              alert('Close the browser tab to quit.');
            }}
          >
            Quit
          </button>
        </nav>
      )}

      {creditsOpen && <Credits onClose={() => setCreditsOpen(false)} />}

      <p className="main-menu__version">v0.0.1 — milestone 1</p>
    </div>
  );
}
