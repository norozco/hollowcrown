import { useState } from 'react';
import { PhaserGame } from './game/PhaserGame';
import { MainMenu } from './ui/MainMenu';
import { CharacterCreator } from './ui/CharacterCreation/CharacterCreator';
import { InGameOverlay } from './ui/InGameOverlay';
import { BootSplash } from './ui/BootSplash/BootSplash';
import { useUIStore } from './state/uiStore';
import './App.css';

/**
 * App shell. Layers:
 *   - <PhaserGame> owns the game canvas (bottom)
 *   - <ui-layer> holds React overlays that float above the canvas (top)
 *
 * The specific overlay shown is driven by useUIStore.screen.
 *
 * Boot flow: splash screen → main menu → game. Splash only on first
 * load of the session (sessionStorage flag so it doesn't replay on HMR).
 */
function App() {
  const screen = useUIStore((s) => s.screen);

  // Show boot splash once per browser session.
  const [splashDone, setSplashDone] = useState(() => {
    try { return sessionStorage.getItem('hc_splash_done') === '1'; } catch { return false; }
  });
  const handleSplashDone = () => {
    try { sessionStorage.setItem('hc_splash_done', '1'); } catch { /* noop */ }
    setSplashDone(true);
  };

  return (
    <div className="app">
      <PhaserGame />
      <div className="ui-layer">
        {screen === 'menu' && <MainMenu />}
        {screen === 'character-creation' && <CharacterCreator />}
        {screen === 'game' && <InGameOverlay />}
      </div>
      {!splashDone && <BootSplash onDone={handleSplashDone} />}
    </div>
  );
}

export default App;
