import { useEffect, useState } from 'react';
import { usePlayerStore } from '../state/playerStore';
import { useUIStore } from '../state/uiStore';
import { useDialogueStore } from '../state/dialogueStore';
import { useQuestStore } from '../state/questStore';
import { useCombatStore } from '../state/combatStore';
import { DialogueScene } from './Dialogue/DialogueScene';
import { QuestTracker } from './QuestTracker/QuestTracker';
import { CombatOverlay } from './Combat/CombatOverlay';
import './InGameOverlay.css';

/**
 * In-game overlay. The Phaser canvas underneath shows the town / dungeon
 * / wherever the player actually is. This layer provides:
 *   - Top HUD strip: name/level/class, HP/MP/XP, equipped weapon
 *   - Corner menu (Esc or click) for returning to main menu
 *   - Dialogue overlay when a dialogue is active
 */
export function InGameOverlay() {
  const character = usePlayerStore((s) => s.character);
  // Subscribing to `version` forces re-renders when character fields
  // (gold, xp, hp, level, mp) mutate — the object reference stays stable.
  usePlayerStore((s) => s.version);
  const setScreen = useUIStore((s) => s.setScreen);
  const clearPlayer = usePlayerStore((s) => s.clear);
  const dialogueActive = useDialogueStore((s) => s.dialogue !== null);
  const combatActive = useCombatStore((s) => s.state !== null);
  const resetQuests = useQuestStore((s) => s.reset);

  const [menuOpen, setMenuOpen] = useState(false);

  // Esc opens/closes the corner menu (but not during dialogue — dialogue
  // owns Esc for its own exit).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (useDialogueStore.getState().dialogue) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuOpen((m) => !m);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!character) {
    return (
      <div className="ig">
        <div className="ig__center">
          <h2>No character loaded</h2>
          <button
            type="button"
            className="cc__btn cc__btn--primary"
            onClick={() => setScreen('menu')}
          >
            Back to main menu
          </button>
        </div>
      </div>
    );
  }

  const returnToMenu = () => {
    clearPlayer();
    resetQuests();
    setMenuOpen(false);
    setScreen('menu');
  };

  const d = character.derived;

  return (
    <div className="ig">
      <header className="ig__hud">
        <div className="ig__hud-block">
          <span className="ig__name">{character.name}</span>
          <span className="ig__sub">
            Lvl {character.level} {character.race.name} {character.characterClass.name}
            {character.difficulty === 'hardcore' && <span className="ig__hc"> · ⚠ HC</span>}
          </span>
        </div>
        <div className="ig__hud-block ig__bars">
          <span>HP {character.hp}/{d.maxHp}</span>
          {d.maxMp > 0 && <span>MP {character.mp}/{d.maxMp}</span>}
          <span>XP {character.xp}</span>
          <span className="ig__gold" title="Gold">◆ {character.gold}g</span>
          <span className="ig__weapon" title={character.weapon.description}>
            ⚔ {character.weapon.name}
          </span>
          <button
            type="button"
            className="ig__menu-btn"
            onClick={() => setMenuOpen((m) => !m)}
            aria-label="Open menu"
            title="Menu (Esc)"
          >
            ≡
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="ig__menu" role="dialog" aria-label="Pause menu">
          <h3>Paused</h3>
          <button
            type="button"
            className="cc__btn cc__btn--primary"
            onClick={() => setMenuOpen(false)}
            autoFocus
          >
            Resume
          </button>
          <button type="button" className="cc__btn" onClick={returnToMenu}>
            Return to main menu
          </button>
        </div>
      )}

      <QuestTracker />

      <p className="ig__controls-hint">WASD / Arrows to move · E to interact · Esc for menu</p>

      {dialogueActive && <DialogueScene />}
      {combatActive && <CombatOverlay />}
    </div>
  );
}
