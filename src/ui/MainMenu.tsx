import { useState } from 'react';
import { useUIStore } from '../state/uiStore';
import { useCharacterCreationStore } from '../state/characterCreationStore';
import { usePlayerStore } from '../state/playerStore';
import { rollRandomCharacter } from '../engine/random-character';
import { loadGame, getSaveSlots, type SaveSlotInfo } from '../engine/saveLoad';
import './MainMenu.css';

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
  const [saveSlots, setSaveSlots] = useState<SaveSlotInfo[]>([]);

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

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
      + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="main-menu" role="dialog" aria-label="Main menu">
      <div className="main-menu__title">
        <h1>HOLLOWCROWN</h1>
        <p className="main-menu__subtitle">A Dungeon of the Forgotten Repo</p>
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
          <button
            type="button"
            onClick={() => alert('Options: coming in Milestone 14')}
          >
            Options
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

      <p className="main-menu__version">v0.0.1 — milestone 1</p>
    </div>
  );
}
