import { PhaserGame } from './game/PhaserGame';
import { MainMenu } from './ui/MainMenu';
import { CharacterCreator } from './ui/CharacterCreation/CharacterCreator';
import { InGameOverlay } from './ui/InGameOverlay';
import { useUIStore } from './state/uiStore';
import './App.css';

/**
 * App shell. Layers:
 *   - <PhaserGame> owns the game canvas (bottom)
 *   - <ui-layer> holds React overlays that float above the canvas (top)
 *
 * The specific overlay shown is driven by useUIStore.screen.
 */
function App() {
  const screen = useUIStore((s) => s.screen);

  return (
    <div className="app">
      <PhaserGame />
      <div className="ui-layer">
        {screen === 'menu' && <MainMenu />}
        {screen === 'character-creation' && <CharacterCreator />}
        {screen === 'game' && <InGameOverlay />}
        {/* Future overlays plug in here:
            screen === 'pause' && <PauseMenu />
            etc. */}
      </div>
    </div>
  );
}

export default App;
