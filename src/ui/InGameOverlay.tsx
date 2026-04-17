import { useEffect, useState } from 'react';
import { usePlayerStore } from '../state/playerStore';
import { useUIStore } from '../state/uiStore';
import { useDialogueStore } from '../state/dialogueStore';
import { useQuestStore } from '../state/questStore';
import { useCombatStore } from '../state/combatStore';
import { useInventoryStore } from '../state/inventoryStore';
import { useAchievementStore } from '../state/achievementStore';
import { DialogueScene } from './Dialogue/DialogueScene';
import { QuestTracker } from './QuestTracker/QuestTracker';
import { CombatOverlay } from './Combat/CombatOverlay';
import { InventoryScreen } from './Inventory/InventoryScreen';
import { ShopScreen } from './Inventory/ShopScreen';
import { CraftingScreen } from './Crafting/CraftingScreen';
import { LevelUpPopup } from './LevelUp/LevelUpPopup';
import { getPerkHpBonus, getPerkMpBonus } from '../engine/perks';
import { QuestBoard } from './QuestBoard/QuestBoard';
import { OptionsMenu } from './OptionsMenu/OptionsMenu';
import { AchievementsScreen } from './Achievements/AchievementsScreen';
import { AchievementToast } from './AchievementToast/AchievementToast';
import { getCurrentRank } from '../engine/ranks';
import { xpForLevel, MAX_LEVEL } from '../engine/character';
import { saveGame } from '../engine/saveLoad';
import { COMPANIONS, companionBonusLabel } from '../engine/companion';
import { TouchControls } from './TouchControls/TouchControls';
import { Minimap } from './Minimap/Minimap';
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
  const companionKey = usePlayerStore((s) => s.companion);
  const setScreen = useUIStore((s) => s.setScreen);
  const clearPlayer = usePlayerStore((s) => s.clear);
  const dialogueActive = useDialogueStore((s) => s.dialogue !== null);
  const combatActive = useCombatStore((s) => s.state !== null);
  const resetQuests = useQuestStore((s) => s.reset);
  const inventoryOpen = useInventoryStore((s) => s.isOpen);
  const shopOpen = useInventoryStore((s) => s.isShopOpen);
  const toggleInventory = useInventoryStore((s) => s.toggle);
  const closeShop = useInventoryStore((s) => s.closeShop);
  const craftingOpen = useInventoryStore((s) => s.isCraftingOpen);
  const closeCrafting = useInventoryStore((s) => s.closeCrafting);
  const resetInventory = useInventoryStore((s) => s.reset);

  const questActive = useQuestStore((s) => s.active);
  const perks = usePlayerStore((s) => s.perks);

  const checkAchievements = useAchievementStore((s) => s.checkAchievements);
  const resetAchievements = useAchievementStore((s) => s.reset);

  const [menuOpen, setMenuOpen] = useState(false);
  const [questBoardOpen, setQuestBoardOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [gameMsg, setGameMsg] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState<string | null>(null);

  // Apply stored brightness on mount so it persists across reloads.
  useEffect(() => {
    const stored = localStorage.getItem('hc_brightness');
    if (stored) {
      const val = parseFloat(stored);
      if (val !== 1.0) {
        const el = document.getElementById('phaser-container');
        if (el) el.style.filter = `brightness(${val})`;
      }
    }
    // Restore FPS toggle
    const fpsStored = localStorage.getItem('hc_showFps');
    if (fpsStored === 'true') window.__showFps = true;
  }, []);

  useEffect(() => {
    const handler = () => setQuestBoardOpen(true);
    window.addEventListener('openQuestBoard', handler);
    const msgHandler = (e: Event) => {
      const msg = (e as CustomEvent).detail as string;
      setGameMsg(msg);
      setTimeout(() => setGameMsg(null), 3000);
    };
    window.addEventListener('gameMessage', msgHandler);
    return () => { window.removeEventListener('openQuestBoard', handler); window.removeEventListener('gameMessage', msgHandler); };
  }, []);

  // Periodically check achievements every 5 seconds.
  useEffect(() => {
    const id = setInterval(() => {
      const key = checkAchievements();
      if (key) setToastKey(key);
    }, 5000);
    return () => clearInterval(id);
  }, [checkAchievements]);

  // Esc opens/closes the corner menu (but not during dialogue — dialogue
  // owns Esc for its own exit).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (useDialogueStore.getState().dialogue) return;
      if (useCombatStore.getState().state) return;
      if (e.key === 'Escape') {
        if (inventoryOpen) { toggleInventory(); return; }
        e.preventDefault();
        setMenuOpen((m) => !m);
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        toggleInventory();
      }
      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setQuestBoardOpen((v) => !v);
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
    resetInventory();
    resetAchievements();
    setMenuOpen(false);
    setScreen('menu');
  };

  const d = character.derived;
  const effectiveMaxHp = d.maxHp + getPerkHpBonus(perks);
  const effectiveMaxMp = d.maxMp + getPerkMpBonus(perks);
  const questsCompleted = Object.values(questActive).filter((q) => q.turnedIn).length;
  const rank = getCurrentRank(questsCompleted, character.level);

  // Portrait palette derived from the character's race (matches StepPortrait palettes)
  const portraitPalettes: Array<[string, string]> = [
    ['#7a4a30', '#d4a968'],
    ['#3a4a30', '#a8c468'],
    ['#3a3060', '#8868d4'],
    ['#5a3030', '#c46868'],
    ['#306060', '#68c4c4'],
    ['#604030', '#d49868'],
  ];
  // Map race key to a stable palette index
  const racePortraitMap: Record<string, number> = {
    human: 0, elf: 1, 'high-elf': 1, 'wood-elf': 1, dwarf: 2,
    halfling: 3, 'half-elf': 4, 'half-orc': 5, tiefling: 2,
    dragonborn: 5, gnome: 3,
  };
  const paletteIdx = racePortraitMap[character.race.key] ?? 0;
  const [portraitBg, portraitFg] = portraitPalettes[paletteIdx];

  return (
    <div className="ig">
      <header className="ig__hud">
        <div className="ig__hud-block ig__hud-block--identity">
          <div
            className="ig__portrait"
            style={{ background: portraitBg, borderColor: portraitFg, color: portraitFg }}
            title={`${character.race.name} ${character.characterClass.name}`}
          >
            {character.race.name[0].toUpperCase()}
          </div>
          <div className="ig__identity">
            <span className="ig__name">{character.name}</span>
            <span className="ig__sub">
              Lvl {character.level} {character.race.name} {character.characterClass.name}
              {character.difficulty === 'hardcore' && <span className="ig__hc"> · ⚠ HC</span>}
              {' '}<span className="ig__rank" style={{ color: rank.color }}>[{rank.label}] {rank.name}</span>
            </span>
          </div>
        </div>
        <div className="ig__hud-block ig__bars">
          <span>HP {character.hp}/{effectiveMaxHp}</span>
          {effectiveMaxMp > 0 && <span>MP {character.mp}/{effectiveMaxMp}</span>}
          {character.level >= MAX_LEVEL ? (
            <span>XP MAX</span>
          ) : (
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <span>XP {character.xp - xpForLevel(character.level)}/{xpForLevel(character.level + 1) - xpForLevel(character.level)}</span>
              <span className="ig__xp-bar">
                <span className="ig__xp-fill" style={{ width: `${Math.min(100, ((character.xp - xpForLevel(character.level)) / (xpForLevel(character.level + 1) - xpForLevel(character.level))) * 100)}%` }} />
              </span>
            </span>
          )}
          <span className="ig__gold" title="Gold">◆ {character.gold}g</span>
          <span className="ig__weapon" title={character.weapon.description}>
            ⚔ {character.weapon.name}
          </span>
          {companionKey && COMPANIONS[companionKey] && (
            <span className="ig__companion" title={COMPANIONS[companionKey].description}>
              ☻ {COMPANIONS[companionKey].name.split(' ')[0]} ({companionBonusLabel(COMPANIONS[companionKey])})
            </span>
          )}
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
          <button type="button" className="cc__btn" onClick={() => { saveGame('slot1'); setMenuOpen(false); }}>
            Save (Slot 1)
          </button>
          <button type="button" className="cc__btn" onClick={() => { saveGame('slot2'); setMenuOpen(false); }}>
            Save (Slot 2)
          </button>
          <button type="button" className="cc__btn" onClick={() => { setOptionsOpen(true); setMenuOpen(false); }}>
            Options
          </button>
          <button type="button" className="cc__btn" onClick={() => { setAchievementsOpen(true); setMenuOpen(false); }}>
            Achievements
          </button>
          <button type="button" className="cc__btn" onClick={returnToMenu}>
            Return to main menu
          </button>
        </div>
      )}

      <QuestTracker />

      {gameMsg && <div className="ig__game-msg">{gameMsg}</div>}
      <p className="ig__controls-hint">WASD to move · E interact · I inventory · Q quests · Esc menu</p>

      {inventoryOpen && <InventoryScreen />}
      {shopOpen && <ShopScreen onClose={closeShop} />}
      {craftingOpen && <CraftingScreen onClose={closeCrafting} />}
      {questBoardOpen && <QuestBoard onClose={() => setQuestBoardOpen(false)} />}
      {optionsOpen && <OptionsMenu onClose={() => setOptionsOpen(false)} />}
      {achievementsOpen && <AchievementsScreen onClose={() => setAchievementsOpen(false)} />}
      {dialogueActive && <DialogueScene />}
      {combatActive && <CombatOverlay />}
      <LevelUpPopup />
      <Minimap />
      <TouchControls />
      <AchievementToast achievementKey={toastKey} onDone={() => setToastKey(null)} />
    </div>
  );
}
