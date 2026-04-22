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
import { CookingScreen } from './Cooking/CookingScreen';
import { LevelUpPopup } from './LevelUp/LevelUpPopup';
import { getPerkHpBonus, getPerkMpBonus } from '../engine/perks';
import { useDungeonItemStore } from '../state/dungeonItemStore';
import { useWorldStateStore } from '../state/worldStateStore';
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
import { WaypointArrow } from './WaypointArrow/WaypointArrow';
import { ItemDiscovery } from './ItemDiscovery/ItemDiscovery';
import { WorldMap } from './WorldMap/WorldMap';
import { FastTravel } from './FastTravel/FastTravel';
import { Ending } from './Ending/Ending';
import { DungeonMap } from './DungeonMap/DungeonMap';
import { useDungeonMapStore } from '../state/dungeonMapStore';
import { DialogueHistory } from './Dialogue/DialogueHistory';
import { useMapMarkerStore } from '../state/mapMarkerStore';
import { useTimeStore, getPhaseIcon } from '../state/timeStore';
import { Sfx, unlockAudio, playMusic } from '../engine/audio';
import { initGamepadSupport } from '../engine/gamepad';
import { useGameStatsStore } from '../state/gameStatsStore';
import { matchesKey, getKey } from '../state/keybindStore';
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
  const cookingOpen = useInventoryStore((s) => s.isCookingOpen);
  const closeCooking = useInventoryStore((s) => s.closeCooking);
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
  const [dialogueHistoryOpen, setDialogueHistoryOpen] = useState(false);
  const [photoMode, setPhotoMode] = useState(false);
  const [endingOpen, setEndingOpen] = useState(false);
  const [gameMsg, setGameMsg] = useState<string | null>(null);
  const [autosaving, setAutosaving] = useState(false);
  const [toastKey, setToastKey] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [healToast, setHealToast] = useState<{ text: string; key: number } | null>(null);
  const [goldMilestone, setGoldMilestone] = useState<{ milestone: number; title: string; key: number } | null>(null);

  // Echo Stone / key-item cooldown (ms epoch when cooldown ends).
  const keyItemCooldownRef = useRef<number>(0);
  const [keyItemCooldownPct, setKeyItemCooldownPct] = useState(0);
  const activeDungeonItem = usePlayerStore((s) => s.activeDungeonItem);
  const lanternLit = usePlayerStore((s) => s.lanternLit);

  const useKeyItem = () => {
    const now = performance.now();
    if (now < keyItemCooldownRef.current) {
      Sfx.echoDenied();
      return;
    }
    const player = usePlayerStore.getState();
    const key = player.activeDungeonItem;
    const hasItem = key ? useDungeonItemStore.getState().has(key) : false;
    if (!key || !hasItem) {
      Sfx.echoDenied();
      return;
    }
    if (key === 'echo_stone') {
      const map = (window as { __currentMap?: { playerX?: number; playerY?: number } }).__currentMap;
      window.dispatchEvent(new CustomEvent('echoStonePulse', {
        detail: { x: map?.playerX ?? 0, y: map?.playerY ?? 0 },
      }));
      // 4 second cooldown.
      keyItemCooldownRef.current = now + 4000;
    } else if (key === 'lantern') {
      // Toggle the lantern ON/OFF. No cooldown, no resource cost.
      const lit = !player.lanternLit;
      player.setLanternLit(lit);
      if (lit) Sfx.lanternLight(); else Sfx.lanternExtinguish();
      window.dispatchEvent(new CustomEvent('lanternToggle', { detail: { lit } }));
    } else if (key === 'water_charm') {
      // Passive item — pressing R just re-affirms the charm is humming.
      Sfx.charmActivate();
      keyItemCooldownRef.current = now + 800;
      window.dispatchEvent(new CustomEvent('gameMessage', {
        detail: 'The Water Charm hums. Shallow water parts at your step.',
      }));
    } else {
      // Other key items don't have an active-press behavior yet; brief lockout.
      keyItemCooldownRef.current = now + 1500;
      Sfx.menuClick();
    }
  };

  /** Cycle to the next owned dungeon key-item. */
  const cycleKeyItem = () => {
    const owned = Array.from(useDungeonItemStore.getState().found);
    if (owned.length === 0) { Sfx.echoDenied(); return; }
    const current = usePlayerStore.getState().activeDungeonItem;
    const idx = current ? owned.indexOf(current) : -1;
    const next = owned[(idx + 1) % owned.length];
    usePlayerStore.getState().setActiveDungeonItem(next);
    if (next === 'water_charm') Sfx.charmActivate();
    else Sfx.menuClick();
    const name = DUNGEON_ITEMS[next]?.name ?? next;
    window.dispatchEvent(new CustomEvent('gameMessage', { detail: `Equipped: ${name}` }));
  };

  // Tick cooldown radial (60 Hz via a timer).
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = performance.now();
      const end = keyItemCooldownRef.current;
      if (end <= now) { setKeyItemCooldownPct(0); return; }
      const total = 4000;
      setKeyItemCooldownPct(Math.max(0, Math.min(1, (end - now) / total)));
    }, 50);
    return () => window.clearInterval(id);
  }, []);

  // Refs mirror React state so the Esc keydown handler (bound once with []
  // deps) can read current values without stale closures.
  const questBoardOpenRef = useRef(questBoardOpen);
  const optionsOpenRef = useRef(optionsOpen);
  const achievementsOpenRef = useRef(achievementsOpen);
  const worldMapOpenRef = useRef(worldMapOpen);
  const bestiaryOpenRef = useRef(bestiaryOpen);
  const journalOpenRef = useRef(journalOpen);
  const statScreenOpenRef = useRef(statScreenOpen);
  const dungeonMapOpenRef = useRef(dungeonMapOpen);
  const dialogueHistoryOpenRef = useRef(dialogueHistoryOpen);
  const photoModeRef = useRef(photoMode);
  const menuOpenRef = useRef(menuOpen);
  const fastTravelOpenRef = useRef(fastTravelOpen);
  const endingOpenRef = useRef(endingOpen);
  useEffect(() => { questBoardOpenRef.current = questBoardOpen; }, [questBoardOpen]);
  useEffect(() => { optionsOpenRef.current = optionsOpen; }, [optionsOpen]);
  useEffect(() => { achievementsOpenRef.current = achievementsOpen; }, [achievementsOpen]);
  useEffect(() => { worldMapOpenRef.current = worldMapOpen; }, [worldMapOpen]);
  useEffect(() => { bestiaryOpenRef.current = bestiaryOpen; }, [bestiaryOpen]);
  useEffect(() => { journalOpenRef.current = journalOpen; }, [journalOpen]);
  useEffect(() => { statScreenOpenRef.current = statScreenOpen; }, [statScreenOpen]);
  useEffect(() => { dungeonMapOpenRef.current = dungeonMapOpen; }, [dungeonMapOpen]);
  useEffect(() => { dialogueHistoryOpenRef.current = dialogueHistoryOpen; }, [dialogueHistoryOpen]);
  useEffect(() => { photoModeRef.current = photoMode; }, [photoMode]);
  useEffect(() => { menuOpenRef.current = menuOpen; }, [menuOpen]);
  useEffect(() => { fastTravelOpenRef.current = fastTravelOpen; }, [fastTravelOpen]);
  useEffect(() => { endingOpenRef.current = endingOpen; }, [endingOpen]);

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
    initGamepadSupport();
  }, []);

  // FPS counter + game time tick loop.
  const [fps, setFps] = useState(60);
  useEffect(() => {
    let lastTick = performance.now();
    let frames = 0;
    let fpsAccum = 0;
    let rafId = 0;
    const loop = (now: number) => {
      const dt = now - lastTick;
      lastTick = now;
      frames++;
      fpsAccum += dt;
      if (fpsAccum >= 500) {
        setFps(Math.round((frames / fpsAccum) * 1000));
        frames = 0;
        fpsAccum = 0;
      }
      // Tick play time (game stats store, paused-aware)
      useGameStatsStore.getState().tick(dt);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Pause when any overlay is open or window loses focus.
  useEffect(() => {
    const anyOverlayOpen =
      menuOpen || inventoryOpen || shopOpen || craftingOpen || cookingOpen ||
      questBoardOpen || optionsOpen || achievementsOpen || worldMapOpen ||
      bestiaryOpen || journalOpen || statScreenOpen || fastTravelOpen ||
      dungeonMapOpen;
    useGameStatsStore.getState().setPaused(anyOverlayOpen);

    // Pause/resume Phaser world scenes so enemies/timers freeze too.
    const game = (window as { __phaserGame?: { scene?: { scenes: { key: string; sys: { isActive: () => boolean; pause: () => void; resume: () => void } }[] } } }).__phaserGame;
    if (game?.scene?.scenes) {
      for (const s of game.scene.scenes) {
        if (!s.sys.isActive()) continue;
        if (s.key === 'CombatScene') continue; // combat runs on its own pacing
        if (anyOverlayOpen) s.sys.pause();
        else s.sys.resume();
      }
    }
  }, [menuOpen, inventoryOpen, shopOpen, craftingOpen, cookingOpen, questBoardOpen,
      optionsOpen, achievementsOpen, worldMapOpen, bestiaryOpen,
      journalOpen, statScreenOpen, fastTravelOpen, dungeonMapOpen]);

  // Gold milestone banner listener.
  useEffect(() => {
    const onMilestone = (e: Event) => {
      const detail = (e as CustomEvent).detail as { milestone: number; title: string };
      setGoldMilestone({ milestone: detail.milestone, title: detail.title, key: Date.now() });
      Sfx.achievement();
      setTimeout(() => setGoldMilestone(null), 3000);
    };
    window.addEventListener('goldMilestone', onMilestone);
    return () => window.removeEventListener('goldMilestone', onMilestone);
  }, []);

  // Autosave indicator listeners.
  useEffect(() => {
    const onStart = () => setAutosaving(true);
    const onEnd = () => setAutosaving(false);
    window.addEventListener('autosaveStart', onStart);
    window.addEventListener('autosaveEnd', onEnd);
    return () => {
      window.removeEventListener('autosaveStart', onStart);
      window.removeEventListener('autosaveEnd', onEnd);
    };
  }, []);

  // Auto-pause on window blur (Steam expectation).
  useEffect(() => {
    const onBlur = () => {
      if (!menuOpen && !dialogueActive && !combatActive) {
        setMenuOpen(true);
      }
    };
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [menuOpen, dialogueActive, combatActive]);

  // F12 screenshot — capture canvas + UI + save as PNG.
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      if (e.key !== getKey('screenshot') && e.key !== 'PrintScreen') return;
      e.preventDefault();
      const canvas = document.querySelector('#phaser-container canvas') as HTMLCanvasElement | null;
      if (!canvas) return;
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        link.download = `hollowcrown-${ts}.png`;
        link.href = dataUrl;
        link.click();
        useGameStatsStore.getState().addScreenshot();
        Sfx.menuClick();
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Screenshot saved.' }));
      } catch {
        // canvas might be tainted; fail silently
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Unlock audio on first user interaction + wire up SFX listeners.
  useEffect(() => {
    const unlock = () => { unlockAudio(); };
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('pointerdown', unlock, { once: true });

    // Game event → SFX mapping
    const onGameMsg = (e: Event) => {
      const msg = String((e as CustomEvent).detail ?? '');
      if (msg.includes('Quest ready') || msg.includes('complete')) Sfx.achievement();
      else if (msg.includes('Found') || msg.includes('Caught')) Sfx.pickup();
      else if (msg.includes('Chest') || msg.includes('crumbles') || msg.includes('unlocked')) Sfx.chestOpen();
      else if (msg.includes('melts') || msg.includes('opens')) Sfx.unlock();
      else if (msg.includes('trap') || msg.includes('Spike')) Sfx.trap();
      else if (msg.includes('Heart Piece')) Sfx.rareItem();
    };
    const onRare = () => Sfx.rareItem();
    const onEnding = () => Sfx.achievement();
    window.addEventListener('gameMessage', onGameMsg);
    window.addEventListener('rareItemFound', onRare);
    window.addEventListener('gameEnding', onEnding);

    return () => {
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('gameMessage', onGameMsg);
      window.removeEventListener('rareItemFound', onRare);
      window.removeEventListener('gameEnding', onEnding);
    };
  }, []);

  // Zone-based music switching
  useEffect(() => {
    const interval = window.setInterval(() => {
      const map = (window as { __currentMap?: { sceneKey?: string } }).__currentMap;
      const scene = map?.sceneKey;
      if (!scene) return;
      const inCombat = useCombatStore.getState().state !== null;
      const monster = useCombatStore.getState().monster;
      if (inCombat) {
        // Boss tracks for named bosses
        const bossKeys = ['hollow_king', 'drowned_warden', 'crownless_one', 'the_forgotten'];
        if (monster && bossKeys.includes(monster.key)) playMusic('boss');
        else playMusic('combat');
      } else if (scene === 'TownScene' || scene === 'DuskmereScene') {
        playMusic('town');
      } else if (scene === 'GreenhollowScene' || scene === 'AshenmereScene') {
        playMusic('forest');
      } else {
        playMusic('dungeon');
      }
    }, 2000);
    return () => window.clearInterval(interval);
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
      Sfx.coin();
    }
    prevGoldRef.current = character.gold;
  }, [character?.gold]);

  // Esc opens/closes the corner menu (but not during dialogue — dialogue
  // owns Esc for its own exit).
  // NOTE: Esc is always hardcoded — it bypasses the rebindable keybind system
  // so players can never accidentally make menus un-closable.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Escape must always be able to close a UI overlay, even if a
      // dialogue/combat somehow started on top. Handle it before the
      // dialogue/combat early returns below.
      if (e.key === 'Escape') {
        e.preventDefault();
        // Read zustand state fresh so we don't rely on stale closure values.
        const inv = useInventoryStore.getState();
        // Close any open overlay first, in priority order
        if (inv.isOpen) { inv.close(); return; }
        if (inv.isShopOpen) { inv.closeShop(); return; }
        if (inv.isCraftingOpen) { inv.closeCrafting(); return; }
        if (inv.isCookingOpen) { inv.closeCooking(); return; }
        if (questBoardOpenRef.current) { setQuestBoardOpen(false); return; }
        if (optionsOpenRef.current) { setOptionsOpen(false); return; }
        if (achievementsOpenRef.current) { setAchievementsOpen(false); return; }
        if (worldMapOpenRef.current) { setWorldMapOpen(false); return; }
        if (bestiaryOpenRef.current) { setBestiaryOpen(false); return; }
        if (statScreenOpenRef.current) { setStatScreenOpen(false); return; }
        if (journalOpenRef.current) { setJournalOpen(false); return; }
        if (dungeonMapOpenRef.current) { setDungeonMapOpen(false); return; }
        if (dialogueHistoryOpenRef.current) { setDialogueHistoryOpen(false); return; }
        if (photoModeRef.current) { setPhotoMode(false); return; }
        // Don't toggle the pause menu while dialogue / combat own Esc.
        if (useDialogueStore.getState().dialogue) return;
        if (useCombatStore.getState().state) return;
        // Nothing open — toggle pause menu
        setMenuOpen((m) => !m);
        return;
      }

      if (useDialogueStore.getState().dialogue) return;
      if (useCombatStore.getState().state) return;
      if (matchesKey(e.key, 'inventory')) {
        e.preventDefault();
        toggleInventory();
      }
      if (matchesKey(e.key, 'quests')) {
        e.preventDefault();
        setQuestBoardOpen((v) => !v);
      }
      if (matchesKey(e.key, 'map')) {
        e.preventDefault();
        setDungeonMapOpen((v) => !v);
      }
      if (matchesKey(e.key, 'dialogueHistory')) {
        e.preventDefault();
        setDialogueHistoryOpen((v) => !v);
      }
      if (matchesKey(e.key, 'photoMode')) {
        e.preventDefault();
        setPhotoMode((v) => !v);
      }
      if (matchesKey(e.key, 'heal')) {
        e.preventDefault();
        // Block when any modal/menu is open (combat is allowed — handled separately)
        const invState = useInventoryStore.getState();
        const anyModalOpen =
          menuOpenRef.current || invState.isOpen || invState.isShopOpen ||
          invState.isCraftingOpen || invState.isCookingOpen ||
          questBoardOpenRef.current || optionsOpenRef.current ||
          achievementsOpenRef.current || worldMapOpenRef.current ||
          bestiaryOpenRef.current || journalOpenRef.current ||
          statScreenOpenRef.current || fastTravelOpenRef.current ||
          dungeonMapOpenRef.current || dialogueHistoryOpenRef.current ||
          photoModeRef.current || endingOpenRef.current;
        if (anyModalOpen) return;

        const inv = useInventoryStore.getState();
        const player = usePlayerStore.getState();
        const char = player.character;
        if (!char) return;

        // Find best healing consumable: prefer cheapest that heals HP; fall
        // back to any consumable with effect.healHp.
        const healSlots = inv.slots
          .map((s) => s.item)
          .filter((it) => it.type === 'consumable' && it.effect?.healHp && it.effect.healHp > 0);
        if (healSlots.length === 0) {
          setHealToast({ text: 'No potions!', key: Date.now() });
          setTimeout(() => setHealToast(null), 1400);
          return;
        }
        // Sort ascending by buyPrice (cheapest first)
        healSlots.sort((a, b) => a.buyPrice - b.buyPrice);
        const chosen = healSlots[0];

        const combat = useCombatStore.getState();
        const inCombat = combat.state !== null;

        if (inCombat) {
          // Only valid on player's turn
          if (combat.state?.phase !== 'player_turn' || combat._enemyActing) return;
          const hpBefore = char.hp;
          combat.useItem(chosen.key);
          // If useItem actually ran, state.phase will have advanced (or HP changed)
          const healed = char.hp - hpBefore;
          if (healed > 0) {
            setHealToast({ text: `+${healed} HP`, key: Date.now() });
            setTimeout(() => setHealToast(null), 1400);
            Sfx.spellHeal();
          }
        } else {
          const hpBefore = char.hp;
          if (!inv.useItem(chosen.key)) return;
          const healed = char.hp - hpBefore;
          setHealToast({ text: `+${healed} HP`, key: Date.now() });
          setTimeout(() => setHealToast(null), 1400);
          Sfx.spellHeal();
        }
      }
      if (matchesKey(e.key, 'keyItem')) {
        e.preventDefault();
        if (e.shiftKey) cycleKeyItem();
        else useKeyItem();
        return;
      }
      if (matchesKey(e.key, 'marker')) {
        e.preventDefault();
        const map = (window as { __currentMap?: { sceneKey?: string; playerX?: number; playerY?: number } }).__currentMap;
        if (map && map.sceneKey) {
          useMapMarkerStore.getState().add(
            map.sceneKey,
            map.playerX ?? 0,
            map.playerY ?? 0,
          );
          Sfx.pickup();
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Pin dropped.' }));
        }
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
    useGameStatsStore.getState().reset();
    resetTime();
    useCommissionStore.getState().reset();
    useDungeonItemStore.getState().reset();
    useWorldStateStore.getState().reset();
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
      Sfx.rankUp();
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
      {typeof window !== 'undefined' && window.__showFps && (
        <div className="ig__fps" aria-hidden="true">
          <span className={fps >= 55 ? 'is-good' : fps >= 30 ? 'is-ok' : 'is-bad'}>{fps}</span> FPS
        </div>
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

      {activeDungeonItem && DUNGEON_ITEMS[activeDungeonItem] && (
        <div
          className="ig__keyitem-slot"
          title={`${DUNGEON_ITEMS[activeDungeonItem].name} — press ${getKey('keyItem').toUpperCase()} to use, Shift+${getKey('keyItem').toUpperCase()} to swap`}
          style={{
            position: 'fixed', top: 78, right: 10,
            width: 48, height: 48,
            background: activeDungeonItem === 'lantern' && lanternLit
              ? 'radial-gradient(circle, rgba(220,140,40,0.55) 0%, rgba(40,20,10,0.85) 100%)'
              : 'rgba(10,6,6,0.75)',
            boxShadow: activeDungeonItem === 'lantern' && lanternLit
              ? '0 0 14px rgba(240,170,60,0.55)' : 'none',
            border: '2px solid #d4a968',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, color: '#f4d488',
            zIndex: 20, userSelect: 'none',
            overflow: 'hidden',
          }}
          onClick={useKeyItem}
        >
          <span style={{ position: 'relative', zIndex: 2 }}>
            {DUNGEON_ITEMS[activeDungeonItem].icon}
          </span>
          {keyItemCooldownPct > 0 && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', left: 0, right: 0, bottom: 0,
                height: `${Math.round(keyItemCooldownPct * 100)}%`,
                background: 'rgba(20,60,90,0.55)',
                pointerEvents: 'none',
              }}
            />
          )}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', bottom: 2, right: 4,
              fontSize: 9, color: '#d4a968', fontFamily: 'Courier New',
            }}
          >
            [{getKey('keyItem').toUpperCase()}]
          </span>
        </div>
      )}

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
      {healToast && (
        <div className="ig__heal-toast" key={healToast.key}>{healToast.text}</div>
      )}
      {goldMilestone && (
        <div className="ig__gold-milestone" key={goldMilestone.key}>
          <div className="ig__gold-milestone-banner">
            <span className="ig__gold-milestone-icon">✦</span>
            <span className="ig__gold-milestone-label">GOLD MILESTONE</span>
            <span className="ig__gold-milestone-icon">✦</span>
          </div>
          <div className="ig__gold-milestone-title">{goldMilestone.title}</div>
          <div className="ig__gold-milestone-amount">{goldMilestone.milestone.toLocaleString()} gold</div>
        </div>
      )}

      {inventoryOpen && <InventoryScreen />}
      {shopOpen && <ShopScreen onClose={closeShop} />}
      {craftingOpen && <CraftingScreen onClose={closeCrafting} />}
      {cookingOpen && <CookingScreen onClose={closeCooking} />}
      {autosaving && (
        <div className="ig__autosave">
          <span className="ig__autosave-spinner">◐</span>
          <span>SAVING…</span>
        </div>
      )}
      {questBoardOpen && <QuestBoard onClose={() => setQuestBoardOpen(false)} />}
      {optionsOpen && <OptionsMenu onClose={() => setOptionsOpen(false)} />}
      {achievementsOpen && <AchievementsScreen onClose={() => setAchievementsOpen(false)} />}
      {worldMapOpen && <WorldMap onClose={() => setWorldMapOpen(false)} />}
      {dungeonMapOpen && <DungeonMap onClose={() => setDungeonMapOpen(false)} />}
      {dialogueHistoryOpen && <DialogueHistory onClose={() => setDialogueHistoryOpen(false)} />}
      {photoMode && (
        <div className="ig__photo-mode" aria-hidden="true">
          <div className="ig__photo-mode-hint">PHOTO MODE · F12 screenshot · F10 or Esc to exit</div>
        </div>
      )}
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
      {!menuOpen && !dialogueActive && !combatActive && !inventoryOpen &&
       !shopOpen && !craftingOpen && !cookingOpen && !questBoardOpen && !optionsOpen &&
       !achievementsOpen && !worldMapOpen && !bestiaryOpen && !journalOpen &&
       !statScreenOpen && !fastTravelOpen && !dungeonMapOpen &&
       !dialogueHistoryOpen && !photoMode && !endingOpen && (
        <WaypointArrow />
      )}
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
