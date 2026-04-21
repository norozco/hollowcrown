import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '../state/playerStore';
import { useUIStore } from '../state/uiStore';
import { useDialogueStore } from '../state/dialogueStore';
import { useQuestStore } from '../state/questStore';
import { useCombatStore } from '../state/combatStore';
import { useInventoryStore } from '../state/inventoryStore';
import { useAchievementStore } from '../state/achievementStore';
import { useLoreStore } from '../state/loreStore';
import { useCommissionStore } from '../state/commissionStore';
import { DialogueScene } from './Dialogue/DialogueScene';
import { QuestTracker } from './QuestTracker/QuestTracker';
import { CombatOverlay } from './Combat/CombatOverlay';
import { InventoryScreen } from './Inventory/InventoryScreen';
import { ShopScreen } from './Inventory/ShopScreen';
import { CraftingScreen } from './Crafting/CraftingScreen';
import { LevelUpPopup } from './LevelUp/LevelUpPopup';
import { getPerkHpBonus, getPerkMpBonus } from '../engine/perks';
import { useDungeonItemStore } from '../state/dungeonItemStore';
import { DUNGEON_ITEMS } from '../engine/dungeonItems';
import { getHeartPieceHpBonus } from '../state/playerStore';
import { QuestBoard } from './QuestBoard/QuestBoard';
import { OptionsMenu, applyStoredOptions } from './OptionsMenu/OptionsMenu';
import { AchievementsScreen } from './Achievements/AchievementsScreen';
import { AchievementToast } from './AchievementToast/AchievementToast';
import { Bestiary } from './Bestiary/Bestiary';
import { Journal } from './Journal/Journal';
import { StatScreen } from './StatScreen/StatScreen';
import { getCurrentRank } from '../engine/ranks';
import { xpForLevel, MAX_LEVEL } from '../engine/character';
import { saveGame } from '../engine/saveLoad';
import { COMPANIONS, companionBonusLabel } from '../engine/companion';
import { TouchControls } from './TouchControls/TouchControls';
import { Minimap } from './Minimap/Minimap';
import { ItemDiscovery } from './ItemDiscovery/ItemDiscovery';
import { WorldMap } from './WorldMap/WorldMap';
import { FastTravel } from './FastTravel/FastTravel';
import { Ending } from './Ending/Ending';
import { DungeonMap } from './DungeonMap/DungeonMap';
import { useDungeonMapStore } from '../state/dungeonMapStore';
import { useTimeStore, getPhaseIcon } from '../state/timeStore';
import './InGameOverlay.css';

/**
 * In-game overlay. The Phaser canvas underneath shows the town / dungeon
 * / wherever the player actually is. This layer provides:
 *   - Top HUD strip: name/level/class, HP/MP/XP, equipped weapon
 *   - Corner menu (Esc or click) for returning to main menu
 *   - Dialogue overlay when a dialogue is active
 */
function getNextObjective(): string | null {
  const quests = useQuestStore.getState().active;
  const character = usePlayerStore.getState().character;
  if (!character) return null;

  // Check main quests in order
  if (!quests['iron-token']) return 'Visit the Adventurers\' Guild';
  if (!quests['iron-token'].isComplete) {
    const state = quests['iron-token'];
    if (!state.completedObjectiveIds.includes('talk-orric')) return 'Speak with Orric in Greenhollow';
    if (!state.completedObjectiveIds.includes('find-cairn')) return 'Find the cairn in Mossbarrow';
    return 'Return to Brenna at the Guild';
  }
  if (!quests['iron-token'].turnedIn) return 'Return to Brenna at the Guild';

  // After iron-token, suggest depths
  if (!quests['depths-explorer']) return 'Ask Brenna about the depths';
  if (!quests['depths-explorer'].isComplete) return 'Reach Floor 3 of Mossbarrow Depths';
  if (!quests['depths-explorer'].turnedIn) return 'Report to Brenna';

  // After depths, suggest hollow king
  if (!quests['hollow-king-slayer']) return 'Ask Brenna about the Hollow King';
  if (!quests['hollow-king-slayer'].isComplete) return 'Defeat the Hollow King in the depths';
  if (!quests['hollow-king-slayer'].turnedIn) return 'Return to Brenna';

  // After hollow king, suggest Ashenmere
  if (!quests['scholars-trail']) return 'Explore Ashenmere Marshes — find the Hermit';
  if (!quests['scholars-trail'].isComplete) return 'Search Ashenmere for Veyrin\'s trail';
  if (!quests['scholars-trail'].turnedIn) return 'Bring the journal to the Hermit';

  // Drowned sanctum
  if (!quests['drowned-sanctum']) return 'Ask the Hermit about the Drowned Sanctum';
  if (!quests['drowned-sanctum'].isComplete) return 'Find Veyrin in the Drowned Sanctum';
  if (!quests['drowned-sanctum'].turnedIn) return 'Find Veyrin';

  // What remains
  if (!quests['what-remains']) return null;
  if (!quests['what-remains'].isComplete) return 'Return to Brenna with Veyrin\'s message';
  if (!quests['what-remains'].turnedIn) return 'Speak with Brenna';

  // The Final Gate / The Crownless One
  if (!quests['the-final-gate']) return 'Speak with Brenna about what stirs beyond the Ashfields';
  if (!quests['the-final-gate'].isComplete) return 'Travel to The Shattered Coast';

  if (!quests['the-crownless-one']) return 'Speak with Brenna';
  if (!quests['the-crownless-one'].isComplete) {
    const state = quests['the-crownless-one'];
    if (!state.completedObjectiveIds.includes('reach-coast')) return 'Reach The Shattered Coast';
    if (!state.completedObjectiveIds.includes('enter-throne-beneath')) return 'Enter The Throne Beneath';
    return 'Defeat The Crownless One';
  }
  if (!quests['the-crownless-one'].turnedIn) return 'Return to Brenna';

  // All main quests done
  return 'All main quests complete. Explore freely.';
}

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
  const nextObjective = getNextObjective();
  const perks = usePlayerStore((s) => s.perks);
  const heartPieces = usePlayerStore((s) => s.heartPieces);
  const dungeonItems = useDungeonItemStore((s) => s.found);
  const newGamePlus = usePlayerStore((s) => s.newGamePlus);

  const checkAchievements = useAchievementStore((s) => s.checkAchievements);
  const resetAchievements = useAchievementStore((s) => s.reset);
  const resetDungeonMap = useDungeonMapStore((s) => s.reset);
  const resetTime = useTimeStore((s) => s.reset);
  const timePhase = useTimeStore((s) => s.phase);
  const resetLore = useLoreStore((s) => s.reset);

  const [menuOpen, setMenuOpen] = useState(false);
  const [questBoardOpen, setQuestBoardOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [worldMapOpen, setWorldMapOpen] = useState(false);
  const [bestiaryOpen, setBestiaryOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [statScreenOpen, setStatScreenOpen] = useState(false);
  const [fastTravelOpen, setFastTravelOpen] = useState(false);
  const [dungeonMapOpen, setDungeonMapOpen] = useState(false);
  const [endingOpen, setEndingOpen] = useState(false);
  const [gameMsg, setGameMsg] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);

  // Damage flash: track previous HP to detect decreases.
  const prevHpRef = useRef<number | null>(null);
  const [isHit, setIsHit] = useState(false);

  // Gold gain indicator: track previous gold to detect increases.
  const prevGoldRef = useRef<number | null>(null);
  const [goldGain, setGoldGain] = useState(0);
  const [goldGainKey, setGoldGainKey] = useState(0);

  // Hide controls hint after 30 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowControls(false), 30000);
    return () => clearTimeout(t);
  }, []);

  // Apply stored options (brightness, volumes, shake intensity, FPS) on mount.
  useEffect(() => {
    applyStoredOptions();
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

    // Game ending: show cinematic ending overlay.
    const endingHandler = () => setEndingOpen(true);
    window.addEventListener('gameEnding', endingHandler);

    // Fast travel: open modal when a waypoint stone is used.
    const ftOpenHandler = () => setFastTravelOpen(true);
    window.addEventListener('openFastTravel', ftOpenHandler);

    // Fast travel: perform the scene transition when a destination is chosen.
    const ftTravelHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { sceneKey: string; spawn: string };
      const game = (window as any).__phaserGame as any;
      if (game) {
        const worldScenes = [
          'TownScene', 'GreenhollowScene', 'MossbarrowScene', 'MossbarrowDepthsScene',
          'DepthsFloor2Scene', 'DepthsFloor3Scene', 'AshenmereScene',
          'DrownedSanctumF1Scene', 'DrownedSanctumF2Scene', 'InteriorScene',
          'AshfieldsScene', 'AshenTowerF1Scene', 'AshenTowerF2Scene', 'AshenTowerF3Scene',
          'ShatteredCoastScene', 'ThroneBeneathF1Scene', 'ThroneBeneathF2Scene', 'ThroneBeneathF3Scene',
        ];
        for (const k of worldScenes) {
          if (game.scene.isActive(k)) game.scene.stop(k);
        }
        game.scene.start(detail.sceneKey, { spawnPoint: detail.spawn });
      }
    };
    window.addEventListener('fastTravel', ftTravelHandler);

    return () => {
      window.removeEventListener('openQuestBoard', handler);
      window.removeEventListener('gameMessage', msgHandler);
      window.removeEventListener('openFastTravel', ftOpenHandler);
      window.removeEventListener('fastTravel', ftTravelHandler);
      window.removeEventListener('gameEnding', endingHandler);
    };
  }, []);

  // Periodically check achievements every 5 seconds.
  useEffect(() => {
    const id = setInterval(() => {
      const key = checkAchievements();
      if (key) setToastKey(key);
    }, 5000);
    return () => clearInterval(id);
  }, [checkAchievements]);

  // Detect HP decrease → trigger damage flash.
  useEffect(() => {
    if (!character) return;
    const prevHp = prevHpRef.current;
    prevHpRef.current = character.hp;
    if (prevHp !== null && character.hp < prevHp) {
      setIsHit(true);
      // Remove class so re-animation can fire on the next hit.
      const id = setTimeout(() => setIsHit(false), 420);
      return () => clearTimeout(id);
    }
  }, [character?.hp]);

  useEffect(() => {
    if (!character) return;
    const prevGold = prevGoldRef.current;
    if (prevGold !== null && character.gold > prevGold) {
      const gained = character.gold - prevGold;
      setGoldGain(gained);
      setGoldGainKey((k) => k + 1);
    }
    prevGoldRef.current = character.gold;
  }, [character?.gold]);

  // Esc opens/closes the corner menu (but not during dialogue — dialogue
  // owns Esc for its own exit).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (useDialogueStore.getState().dialogue) return;
      if (useCombatStore.getState().state) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        // Close any open overlay first, in priority order
        if (inventoryOpen) { toggleInventory(); return; }
        if (shopOpen) { closeShop(); return; }
        if (craftingOpen) { closeCrafting(); return; }
        if (questBoardOpen) { setQuestBoardOpen(false); return; }
        if (optionsOpen) { setOptionsOpen(false); return; }
        if (achievementsOpen) { setAchievementsOpen(false); return; }
        if (worldMapOpen) { setWorldMapOpen(false); return; }
        if (bestiaryOpen) { setBestiaryOpen(false); return; }
        if (statScreenOpen) { setStatScreenOpen(false); return; }
        if (journalOpen) { setJournalOpen(false); return; }
        if (dungeonMapOpen) { setDungeonMapOpen(false); return; }
        // Nothing open — toggle pause menu
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
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setDungeonMapOpen((v) => !v);
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
    resetLore();
    resetDungeonMap();
    resetTime();
    useCommissionStore.getState().reset();
    useDungeonItemStore.getState().reset();
    setMenuOpen(false);
    setScreen('menu');
  };

  const d = character.derived;
  const effectiveMaxHp = d.maxHp + getPerkHpBonus(perks) + getHeartPieceHpBonus(heartPieces);
  const effectiveMaxMp = d.maxMp + getPerkMpBonus(perks);
  const questsCompleted = Object.values(questActive).filter((q) => q.turnedIn).length;
  const rank = getCurrentRank(questsCompleted, character.level);

  // Rank-up fanfare: track previous rank and show celebration when it changes.
  const prevRankRef = useRef<string | null>(null);
  const [rankUpShown, setRankUpShown] = useState<null | { oldRank: string; newRank: string; newName: string }>(null);
  useEffect(() => {
    if (prevRankRef.current && prevRankRef.current !== rank.key) {
      setRankUpShown({
        oldRank: prevRankRef.current,
        newRank: rank.key,
        newName: rank.name,
      });
      const t = setTimeout(() => setRankUpShown(null), 4000);
      prevRankRef.current = rank.key;
      return () => clearTimeout(t);
    }
    prevRankRef.current = rank.key;
  }, [rank.key, rank.name]);

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
      {character.hp > 0 && character.hp / effectiveMaxHp < 0.25 && (
        <div className="ig__low-hp" aria-hidden="true" />
      )}
      <header className="ig__hud">
        <div className="ig__hud-left">
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
              Lv.{character.level} {character.characterClass.name}
              {character.difficulty === 'hardcore' && <span className="ig__hc"> HC</span>}
              {' '}<span className="ig__rank" style={{ color: rank.color }}>{rank.name}</span>
              {newGamePlus && <span className="ig__ngplus">NG+</span>}
              <span className="ig__time" title={`Time: ${timePhase}`}>{getPhaseIcon(timePhase)}</span>
            </span>
          </div>
        </div>
        <div className="ig__hud-right">
          <div className="ig__stat-bars">
            <div className="ig__bar-group">
              <span className={`ig__bar-label${isHit ? ' is-hit' : ''}`}>HP</span>
              <div className="ig__hp-bar">
                <div
                  className="ig__hp-fill"
                  style={{
                    width: `${Math.max(0, (character.hp / effectiveMaxHp) * 100)}%`,
                    background: character.hp / effectiveMaxHp > 0.5
                      ? '#40a060'
                      : character.hp / effectiveMaxHp > 0.25
                        ? '#c0a040'
                        : '#c04040',
                  }}
                />
              </div>
              <span className="ig__bar-val">{character.hp}/{effectiveMaxHp}</span>
            </div>
            {effectiveMaxMp > 0 && (
              <div className="ig__bar-group">
                <span className="ig__bar-label">MP</span>
                <div className="ig__hp-bar">
                  <div
                    className="ig__mp-fill"
                    style={{ width: `${Math.max(0, (character.mp / effectiveMaxMp) * 100)}%` }}
                  />
                </div>
                <span className="ig__bar-val">{character.mp}/{effectiveMaxMp}</span>
              </div>
            )}
            <div className="ig__bar-group">
              <span className="ig__bar-label">XP</span>
              {character.level >= MAX_LEVEL ? (
                <span className="ig__bar-val ig__bar-val--max">MAX</span>
              ) : (
                <>
                  <div className="ig__xp-bar">
                    <span className="ig__xp-fill" style={{ width: `${Math.min(100, ((character.xp - xpForLevel(character.level)) / (xpForLevel(character.level + 1) - xpForLevel(character.level))) * 100)}%` }} />
                  </div>
                  <span className="ig__bar-val">{character.xp - xpForLevel(character.level)}/{xpForLevel(character.level + 1) - xpForLevel(character.level)}</span>
                </>
              )}
            </div>
          </div>
          <span className="ig__gold" title="Gold">
            <span className="ig__gold-icon" />
            {character.gold}
            {goldGain > 0 && (
              <span className="ig__gold-gain" key={goldGainKey}>+{goldGain}</span>
            )}
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

      {companionKey && COMPANIONS[companionKey] && (
        <div className="ig__companion-bar">
          <span className="ig__companion-icon">☻</span>
          {COMPANIONS[companionKey].name.split(' ')[0]}
          <span className="ig__companion-bonus">{companionBonusLabel(COMPANIONS[companionKey])}</span>
        </div>
      )}

      {dungeonItems.size > 0 && (
        <div className="ig__dungeon-items">
          {Array.from(dungeonItems).map(key => {
            const item = DUNGEON_ITEMS[key];
            return item ? <span key={key} className="ig__di" title={item.name}>{item.icon}</span> : null;
          })}
        </div>
      )}

      {nextObjective && (
        <div className="ig__breadcrumb">
          <span className="ig__breadcrumb-arrow">▸</span> {nextObjective}
        </div>
      )}

      {menuOpen && (
        <div className="ig__menu" role="dialog" aria-label="Pause menu">
          <div className="ig__menu-bg" aria-hidden="true" />
          <h3 className="ig__menu-title">Paused</h3>
          <div className="ig__menu-panel">
            <div className="ig__menu-group">
              <div className="ig__menu-group-label">Actions</div>
              <button
                type="button"
                className="ig__menu-btn2 is-primary"
                onClick={() => setMenuOpen(false)}
                autoFocus
              >
                Resume
              </button>
              <button type="button" className="ig__menu-btn2" onClick={() => { saveGame('slot1'); setMenuOpen(false); }}>
                Save — Slot 1
              </button>
              <button type="button" className="ig__menu-btn2" onClick={() => { saveGame('slot2'); setMenuOpen(false); }}>
                Save — Slot 2
              </button>
              <button type="button" className="ig__menu-btn2" onClick={() => { setOptionsOpen(true); setMenuOpen(false); }}>
                Options
              </button>
            </div>
            <div className="ig__menu-group">
              <div className="ig__menu-group-label">Info</div>
              <button type="button" className="ig__menu-btn2" onClick={() => { setStatScreenOpen(true); setMenuOpen(false); }}>
                Stats
              </button>
              <button type="button" className="ig__menu-btn2" onClick={() => { setAchievementsOpen(true); setMenuOpen(false); }}>
                Achievements
              </button>
              <button type="button" className="ig__menu-btn2" onClick={() => { setJournalOpen(true); setMenuOpen(false); }}>
                Journal
              </button>
              <button type="button" className="ig__menu-btn2" onClick={() => { setBestiaryOpen(true); setMenuOpen(false); }}>
                Bestiary
              </button>
              <button type="button" className="ig__menu-btn2" onClick={() => { setWorldMapOpen(true); setMenuOpen(false); }}>
                World Map
              </button>
            </div>
            <div className="ig__menu-group">
              <div className="ig__menu-group-label">Exit</div>
              <button type="button" className="ig__menu-btn2 is-danger" onClick={returnToMenu}>
                Return to Main Menu
              </button>
            </div>
          </div>
          <div className="ig__menu-hint">Press ESC to resume</div>
        </div>
      )}

      <QuestTracker />

      {gameMsg && <div className="ig__game-msg">{gameMsg}</div>}

      {inventoryOpen && <InventoryScreen />}
      {shopOpen && <ShopScreen onClose={closeShop} />}
      {craftingOpen && <CraftingScreen onClose={closeCrafting} />}
      {questBoardOpen && <QuestBoard onClose={() => setQuestBoardOpen(false)} />}
      {optionsOpen && <OptionsMenu onClose={() => setOptionsOpen(false)} />}
      {achievementsOpen && <AchievementsScreen onClose={() => setAchievementsOpen(false)} />}
      {worldMapOpen && <WorldMap onClose={() => setWorldMapOpen(false)} />}
      {dungeonMapOpen && <DungeonMap onClose={() => setDungeonMapOpen(false)} />}
      {bestiaryOpen && <Bestiary onClose={() => setBestiaryOpen(false)} />}
      {journalOpen && <Journal onClose={() => setJournalOpen(false)} />}
      {statScreenOpen && <StatScreen onClose={() => setStatScreenOpen(false)} />}
      {fastTravelOpen && <FastTravel onClose={() => setFastTravelOpen(false)} />}
      {endingOpen && <Ending onClose={() => setEndingOpen(false)} />}
      {dialogueActive && <DialogueScene />}
      {combatActive && <CombatOverlay />}
      <LevelUpPopup />
      <ItemDiscovery />
      <Minimap />
      <TouchControls />
      <AchievementToast achievementKey={toastKey} onDone={() => setToastKey(null)} />
      {rankUpShown && (
        <div className="ig__rankup">
          <div className="ig__rankup-banner">
            <span className="ig__rankup-icon">✦</span>
            <span className="ig__rankup-text">RANK UP</span>
            <span className="ig__rankup-icon">✦</span>
          </div>
          <div className="ig__rankup-change">
            <span className="ig__rankup-old">{rankUpShown.oldRank}</span>
            <span className="ig__rankup-arrow">→</span>
            <span className="ig__rankup-new">{rankUpShown.newRank}</span>
          </div>
          <div className="ig__rankup-name">{rankUpShown.newName}</div>
        </div>
      )}
    </div>
  );
}
