import { useUIStore } from '../state/uiStore';
import { useCharacterCreationStore } from '../state/characterCreationStore';
import { usePlayerStore } from '../state/playerStore';
import { rollRandomCharacter } from '../engine/random-character';
import './MainMenu.css';

/**
 * Main menu overlay. Rendered above the Phaser canvas via the React UI
 * layer. New Game leads into character creation; Random Hero skips the
 * wizard entirely with a sensible random character. Load / Options are
 * stubs for later milestones.
 */
export function MainMenu() {
  const setScreen = useUIStore((s) => s.setScreen);
  const resetCreation = useCharacterCreationStore((s) => s.reset);
  const createPlayer = usePlayerStore((s) => s.create);

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

  return (
    <div className="main-menu" role="dialog" aria-label="Main menu">
      <div className="main-menu__title">
        <h1>HOLLOWCROWN</h1>
        <p className="main-menu__subtitle">A Dungeon of the Forgotten Repo</p>
      </div>

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
        <button
          type="button"
          onClick={() => alert('Load game: coming in Milestone 14')}
        >
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
            // window.close() only succeeds for script-opened windows; for
            // user-opened tabs it silently no-ops. Inform the user either
            // way — if the tab closes, they never see the alert.
            window.close();
            alert('Close the browser tab to quit.');
          }}
        >
          Quit
        </button>
      </nav>

      <p className="main-menu__version">v0.0.1 — milestone 1</p>
    </div>
  );
}
