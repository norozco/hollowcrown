# Hollowcrown — Agent Work Log

Documentation of every sub-agent spawned during development, what they did, and key details for resuming their work.

---

## Agent 1: Status Effects + Monsters + Boss + Items
**Task:** Wire status effects into combat engine, add new monsters (spider, wraith, hollow_king), generate their sprites, add new items.

**Files modified:**
- `src/engine/combat.ts` — Added `tickStatus()`, status effect processing in `playerAct()`/`enemyAct()`, monster attack status procs (wolf→bleed, skeleton→poison, spider→poison, wraith→burn, hollow_knight→stun, hollow_king→multi)
- `src/engine/monster.ts` — Added spider, wraith, hollow_king monsters
- `src/scenes/sprites/generateMonsters.ts` — Added `drawSpider()`, `drawWraith()`, `drawHollowKing()` pixel art
- `src/engine/items.ts` — Added spider_silk, wraith_dust, kings_crown items

**Key decisions:**
- Status ticks happen at START of each turn (before action)
- Stun skips the entire turn
- Marked status adds bonus damage for X turns
- Wolf/skeleton status procs roll after a successful hit

---

## Agent 2: Combat UI (Status Indicators)
**Task:** Add status effect display to CombatOverlay (React) and CombatScene (Phaser).

**Files modified:**
- `src/ui/Combat/CombatOverlay.tsx` — Added StatusSide component showing badges (poison=skull, burn=fire, etc.)
- `src/ui/Combat/CombatOverlay.css` — Status badge styles with per-effect colors
- `src/scenes/CombatScene.ts` — Added `statusIconsGfx` graphics, `drawStatusIcons()` method, status damage color detection in log

**Key details:**
- StatusEffects imported as `type` import for Vite compatibility
- Status icons drawn as filled + outlined circles below HP bars

---

## Agent 3: Dungeon Zone (MossbarrowDepthsScene)
**Task:** Create the initial dungeon zone beneath Mossbarrow Cairn.

**Files created:**
- `src/scenes/MossbarrowDepthsScene.ts`

**Files modified:**
- `src/scenes/MossbarrowScene.ts` — Added stairway entrance + exit to depths
- `src/game/config.ts` — Registered new scene
- `src/game/PhaserGame.tsx` — Added to worldScenes array

**Later overhauled:** Restructured into 3 separate floor scenes with Floor 2 and Floor 3 added.

---

## Agent 4: Crafting + Ranks + Options Menu
**Task:** Build crafting system, rank progression, and options menu.

**Files created:**
- `src/engine/crafting.ts` — 6 initial recipes (later expanded to 11)
- `src/engine/ranks.ts` — F through A ranks with quest/level requirements
- `src/ui/Crafting/CraftingScreen.tsx` + `.css`
- `src/ui/OptionsMenu/OptionsMenu.tsx` + `.css`

**Files modified:**
- `src/state/inventoryStore.ts` — Added isCraftingOpen, openCrafting, closeCrafting
- `src/scenes/InteriorScene.ts` — Added `__craft__` interactable handler, smithy interior layout
- `src/scenes/TownScene.ts` — Added smithy building with door exit
- `src/ui/InGameOverlay.tsx` — Wired crafting screen, rank display, options menu
- `src/data/npcs.json` — Added Kael NPC
- `src/data/dialogues/kael-greeting.json` — Created
- `src/engine/dialogues.ts` — Registered kael-greeting

---

## Agent 5: Dungeon Visual Overhaul
**Task:** Add 8 new dungeon tiles and overhaul all 3 floors with unique themes.

**Files modified:**
- `src/scenes/tiles/generateTiles.ts` — Added LAVA, ACID, FLOOR_CRACKED, BONES, COBWEB, CHAINS, MOSS_STONE, BLOOD_STONE (tiles 36-43). TILE_COUNT = 44.
- `src/scenes/MossbarrowDepthsScene.ts` — Spider Cavern theme (acid pools, cobwebs, green torches, egg sacs, dripping particles)
- `src/scenes/DepthsFloor2Scene.ts` — Catacombs theme (bones, chains, blood stone, sarcophagi, spectral wisps, candelabras)
- `src/scenes/DepthsFloor3Scene.ts` — Hollow Throne theme (lava rivers, dark energy tendrils, enhanced throne, fallen banners, bone arena border)

**Key details:**
- LAVA and ACID are SOLID (player can't walk through)
- Each floor has a SOLID_TILES set for collision
- Spectral wisps and dark energy use Phaser tweens for animation

---

## Agent 6: Material Nodes + Signs + Stairway Fix
**Task:** Add interactable material pickups, building signs, interior labels, fix stairway visual.

**Files modified:**
- `src/scenes/GreenhollowScene.ts` — 2 moonpetal patches, 1 iron ore vein
- `src/scenes/MossbarrowScene.ts` — 1 iron ore, 1 bone shard, stairway visual replaced with stone-bordered pit
- `src/scenes/MossbarrowDepthsScene.ts` — 2 iron ore, 1 spider silk
- `src/scenes/DepthsFloor2Scene.ts` — 2 moonpetals, 1 shadow essence, 1 bone shard
- `src/scenes/DepthsFloor3Scene.ts` — 1 shadow essence, 1 iron ore
- `src/scenes/TownScene.ts` — Signposts outside Guild, Store, Smithy
- `src/scenes/InteriorScene.ts` — "Shop" and "Forge" labels above interactables

---

## Agent 7: Quest Log + XP Bar + Weapons + XP Curve
**Task:** Add Q hotkey for quests, XP progress fraction, class-specific weapons, XP rebalance.

**Files modified:**
- `src/ui/InGameOverlay.tsx` — Q key toggles quest board, XP shows as fraction with bar
- `src/ui/InGameOverlay.css` — XP bar styles
- `src/engine/items.ts` — Added hunting_bow, shadow_dagger, iron_mace, runed_staff, silver_rapier
- `src/engine/crafting.ts` — Added 6 new recipes (class weapons + leather armor)
- `src/engine/character.ts` — Replaced XP_TABLE with gentler curve (50/150/350/600/1000/1600/2500/4000/6000...)

---

## Agent 8: Quests + NPC Reactions + Post-Boss
**Task:** Add 8 new quests, update NPC dialogues with quest-aware branches, post-boss victory content.

**Files created:**
- `src/data/quests/spider-nest.json`, `wraith-hunt.json`, `iron-delivery.json`, `depths-explorer.json`, `hollow-king-slayer.json`, `silk-trader.json`, `bone-ritual.json`, `herb-gathering.json`

**Files modified:**
- `src/engine/quests.ts` — Registered all 7 new quests
- `src/state/combatStore.ts` — Kill tracking for spider-nest, wraith-hunt, hollow-king-slayer
- `src/state/inventoryStore.ts` — `checkCollectionQuests()` for collection-based quests
- `src/scenes/DepthsFloor3Scene.ts` — Depths-explorer quest completion on entering Floor 3
- `src/engine/dialogue.ts` — Added `remove-items` effect type
- `src/state/dialogueStore.ts` — Handle `remove-items` effect
- All 5 NPC dialogue JSON files updated with quest-giving and turn-in branches

---

## Agent 9: Combat Text + Death Screen + Potions
**Task:** Souls-y combat log, YOU DIED screen, combat item use.

**Files modified:**
- `src/engine/combat.ts` — All log messages rewritten to atmospheric tone (no dice notation). Random hit/miss text variations.
- `src/scenes/CombatScene.ts` — Added `deathScreenShown` flag, red flash + "YOU DIED" 64px text with fade-in on defeat
- `src/state/combatStore.ts` — Added `useItem(itemKey)` method for mid-combat item use
- `src/ui/Combat/CombatOverlay.tsx` — Item button (key 5) with popup listing consumables, 2.5s delayed continue on defeat
- `src/ui/Combat/CombatOverlay.css` — Item popup styles

---

## Agent 10: Equipment Wiring + Comparison Tooltips
**Task:** Wire equipped item stat bonuses into combat, add inventory comparison tooltips.

**Files modified:**
- `src/engine/combat.ts` — Added `getEquipmentBonuses()` helper, applied attack/damage/AC bonuses in playerAct/enemyAct
- `src/ui/Inventory/InventoryScreen.tsx` — Added `renderComparison()` showing green/red stat diffs vs equipped item
- `src/ui/Inventory/InventoryScreen.css` — Comparison tooltip styles

---

## Agent 11: Autosave + Zone Indicator + Enemies + Boss Phases + Level Up
**Task:** Autosave, Souls-style zone name, boar/bandit monsters, boss phases, level up fanfare.

**Files modified:**
- `src/scenes/BaseWorldScene.ts` — `saveGame('autosave')` in checkExits/checkEnemyContact, `getZoneName()` override system with fade-in/out text
- `src/engine/monster.ts` — Added boar, bandit
- `src/scenes/sprites/generateMonsters.ts` — Added `drawBoar()`, `drawBandit()` pixel art
- `src/scenes/GreenhollowScene.ts` — Spawned 2 boars, 2 bandits
- `src/engine/combat.ts` — Boss phase 2 for hollow_king (heal, clear debuffs, double attacks), boar/bandit status procs, `bossPhase2` field in CombatState
- `src/ui/LevelUp/LevelUpPopup.tsx` + CSS — Gold glow animation, 18 sparkle particles
- All zone scenes — Added `getZoneName()` overrides

---

## Agent 12: Combat Playtest (80 fights)
**Task:** Automated combat testing across all 6 classes and 6 monster types.

**Results:** 80 fights, 0 engine bugs. Status effects triggered correctly. No infinite loops. Max 12 turns per fight.

**File created then deleted:** `src/test-combat.ts` (removed after testing)

---

## Agent 13: Verification (Crafting, Ranks, Options, Dungeons)
**Task:** Code review and coordinate verification for all new features.

**Findings:**
- All recipe ingredient/result item keys valid
- All spawn points verified on walkable tiles
- All exit zones wired correctly between floors
- 2 bugs found and fixed: FPS not persisted to localStorage, brightness not applied on startup
