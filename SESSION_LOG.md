# Hollowcrown — Full Session Log

Everything built in this project from start to current state. Use this to resume work if the session disconnects.

## Project Overview

**Hollowcrown** — a 2D top-down RPG with Souls-flavored tone, ALTTP/Pokemon pixel art gameplay, and anime dialogue portraits (Persona 5 style). Built with **Vite 8 + TypeScript 6 + Phaser 4 + React 19 + Zustand**.

**Repo:** `norozco/hollowcrown` on GitHub (private). Auto-push to main is authorized.

**Collaborator:** `fluffybunnies` invited for playtesting.

---

## Tech Stack & Key Patterns

- `import * as Phaser from 'phaser'` (Phaser 4 has no default export)
- Phaser 4 `addSpriteSheet` doesn't accept canvas — use `addCanvas` + manual `tex.add(i, ...)` frame registration
- `scene.start()` calls `create()` (use this, NOT `scene.switch()` which only resumes)
- Zustand for state: playerStore, questStore, inventoryStore, combatStore, dialogueStore, characterCreationStore, uiStore
- Procedural pixel art via Canvas2D (tiles, sprites, monsters, items)
- AI portraits via Pollinations.ai (Flux backend, seed-locked per NPC)
- `_enemyActing` flag in combatStore prevents duplicate enemy turns
- Identity check `if (next === state) return` prevents no-op state sets from triggering enemy turns
- Keyboard handler reads `useCombatStore.getState().state` directly to avoid stale closures

---

## Architecture

### Scenes (Phaser)
| Scene | File | Purpose |
|-------|------|---------|
| BootScene | `scenes/BootScene.ts` | Asset loading |
| PlaceholderScene | `scenes/PlaceholderScene.ts` | Menu background |
| TownScene | `scenes/TownScene.ts` | Ashenvale — starter town |
| GreenhollowScene | `scenes/GreenhollowScene.ts` | Forest zone with wolves, boars, bandits |
| MossbarrowScene | `scenes/MossbarrowScene.ts` | Cairn zone with skeletons |
| MossbarrowDepthsScene | `scenes/MossbarrowDepthsScene.ts` | Dungeon Floor 1 — Spider Cavern |
| DepthsFloor2Scene | `scenes/DepthsFloor2Scene.ts` | Dungeon Floor 2 — The Catacombs |
| DepthsFloor3Scene | `scenes/DepthsFloor3Scene.ts` | Dungeon Floor 3 — The Hollow Throne (boss) |
| InteriorScene | `scenes/InteriorScene.ts` | Generic building interiors (Guild, Inn, Shop, Smithy, Orric's Cabin) |
| CombatScene | `scenes/CombatScene.ts` | Visual battle scene |

### State Stores (Zustand)
| Store | File | Purpose |
|-------|------|---------|
| playerStore | `state/playerStore.ts` | Active character, gold, XP, HP mutations |
| combatStore | `state/combatStore.ts` | Active battle state, enemy tracking, finish rewards |
| inventoryStore | `state/inventoryStore.ts` | Bag slots, equipment, shop, crafting toggles |
| questStore | `state/questStore.ts` | Quest tracking, objectives, turn-in |
| dialogueStore | `state/dialogueStore.ts` | Active dialogue tree navigation |
| uiStore | `state/uiStore.ts` | Screen state (menu/creation/game) |
| characterCreationStore | `state/characterCreationStore.ts` | Wizard steps |

### Engine Modules
| Module | File | Purpose |
|--------|------|---------|
| character.ts | `engine/character.ts` | Character class, XP table, level up |
| combat.ts | `engine/combat.ts` | Turn-based combat state machine |
| monster.ts | `engine/monster.ts` | Monster definitions (8 types) |
| items.ts | `engine/items.ts` | Item database (25+ items) |
| crafting.ts | `engine/crafting.ts` | Crafting recipes (11 recipes) |
| ranks.ts | `engine/ranks.ts` | Adventurer rank progression (F-A) |
| stats.ts | `engine/stats.ts` | D&D stat system, modifiers, derived stats |
| weapons.ts | `engine/weapons.ts` | Starting weapon selection |
| race.ts | `engine/race.ts` | 10 races with stat bonuses |
| classes.ts | `engine/classes.ts` | 6 classes with skills |
| dialogue.ts | `engine/dialogue.ts` | Dialogue tree types |
| dialogues.ts | `engine/dialogues.ts` | Dialogue registry |
| saveLoad.ts | `engine/saveLoad.ts` | localStorage save/load (3 slots + autosave) |

### UI Components (React)
| Component | Purpose |
|-----------|---------|
| InGameOverlay | HUD, pause menu, orchestrates all overlays |
| CombatOverlay | Combat actions, log, status effects, item use |
| InventoryScreen | Equipment + bag grid with tooltips + comparison |
| ShopScreen | Buy/sell items |
| CraftingScreen | Crafting with ingredient checks |
| QuestBoard | Full quest list with rank display |
| QuestTracker | Sidebar quest tracker |
| DialogueScene | NPC dialogue with portraits |
| LevelUpPopup | Level up celebration with particles |
| OptionsMenu | FPS, brightness, text speed |
| CharacterCreator | 7-step character creation wizard |

---

## Monsters (8 types)

| Monster | HP | AC | XP | Zone | Status Effects |
|---------|----|----|----|----|----------------|
| Dire Wolf | 12 | 11 | 25 | Greenhollow | 30% bleed |
| Wild Boar | 16 | 12 | 30 | Greenhollow | 25% stun |
| Forest Bandit | 20 | 13 | 45 | Greenhollow | 20% bleed |
| Risen Bones | 18 | 13 | 50 | Mossbarrow | 25% poison |
| Cairn Spider | 14 | 10 | 30 | Depths F1 | 40% poison |
| Barrow Wraith | 22 | 14 | 75 | Depths F2 | 35% burn |
| Hollow Knight | 40 | 16 | 150 | Mossbarrow | 20% stun |
| The Hollow King | 120 | 18 | 500 | Depths F3 (BOSS) | Multi-effect, phase 2 at 50% |

---

## Quests (10 total)

| Quest | Giver | Type | Objective |
|-------|-------|------|-----------|
| wolf-cull | Brenna | Kill | Kill 3 wolves |
| bone-collector | Brenna | Kill | Kill 2 skeletons |
| spider-nest | Brenna | Kill | Kill 3 spiders |
| wraith-hunt | Brenna | Kill | Kill 2 wraiths |
| depths-explorer | Brenna | Explore | Reach Floor 3 |
| hollow-king-slayer | Brenna | Kill | Defeat the Hollow King |
| herb-gathering | Tomas | Collect | 3 moonpetals |
| iron-delivery | Kael | Collect | 3 iron ore |
| silk-trader | Vira | Collect | 2 spider silk |
| bone-ritual | Orric | Collect | 3 bone shards |

---

## XP Curve (rebalanced)

| Level | XP Required | Approx. Effort |
|-------|-------------|-----------------|
| 2 | 50 | 2 wolves |
| 3 | 150 | A few more fights |
| 5 | 600 | Cleared some skeletons |
| 7 | 1600 | Dungeon Floor 2 |
| 10 | 6000 | Ready for the boss |
| 11+ | 9000+ | Steep climb |

---

## Features Implemented (chronological)

### Core Systems
- [x] Character creation (10 races, 6 classes, gender, stats, difficulty)
- [x] Procedural pixel-art sprites (84 race x class combinations)
- [x] Procedural tileset (44 tiles — terrain, furniture, dungeon hazards)
- [x] Turn-based combat (D&D-adjacent: d20 + modifier vs AC)
- [x] Class skills (Action Surge, Sneak Attack, Fireball, Cure Wounds, Hunter's Mark, Vicious Mockery)
- [x] Status effects (poison, burn, bleed, stun, marked) with tick processing
- [x] Inventory system (30-slot bag, 9 equipment slots, use/equip/sell)
- [x] Equipment stat bonuses wired into combat (attack, damage, AC)
- [x] Equipment comparison tooltips (green/red stat diffs)
- [x] Quest system with dialogue-driven acceptance and turn-in
- [x] Dialogue system with JSON trees, portraits, effects, quest gating
- [x] Save/load (3 manual slots + autosave on zone transitions)
- [x] Rank progression (F through A, based on quests + level)

### Combat
- [x] Souls-y combat log (no dice notation, atmospheric text)
- [x] "YOU DIED" death screen with red flash + large text + delayed continue
- [x] Combat item use (health/mana potions, antidotes mid-fight)
- [x] Weapon-specific attack animations (sword, bow, staff, dagger, mace, axe)
- [x] Enemy lunge animation
- [x] Damage numbers (float up and fade)
- [x] Status effect indicators (UI badges + Phaser colored dots)
- [x] Boss phases (Hollow King phase 2 at 50%: heals, clears debuffs, double attacks)

### World
- [x] 6 overworld/dungeon zones + building interiors
- [x] Walking animation (2-frame cycle)
- [x] Zone name reveal (Souls-style fade in/out)
- [x] Building signs in town (General Store, Guild, Smithy)
- [x] Shop/Forge labels inside interiors
- [x] Material pickup nodes (ore veins, herb patches, silk bundles, essence orbs)
- [x] Random loot bags (30-45% spawn chance, random items + gold)
- [x] Enemy patrol (side-to-side + sine bobbing)
- [x] Combat immunity after flee (1.2s timer)
- [x] Autosave on zone transitions and combat entry

### Dungeon (3 floors)
- [x] Floor 1: Spider Cavern (acid pools, cobwebs, mossy stone, green torches)
- [x] Floor 2: The Catacombs (bones, chains, blood stone, water, sarcophagi, spectral wisps)
- [x] Floor 3: The Hollow Throne (lava rivers, dark energy, throne with crown, fallen banners)
- [x] 8 dungeon-specific tiles (lava, acid, cracked floor, bones, cobweb, chains, moss stone, blood stone)
- [x] Top-to-bottom flow (stairs up at top, stairs down at bottom)

### Crafting (11 recipes)
- [x] Health Potion, Mana Potion, Antidote (alchemy)
- [x] Iron Sword, Steel Sword (basic weapons)
- [x] Hunting Bow, Shadow Dagger, Iron Mace, Runed Staff, Silver Rapier (class weapons)
- [x] Leather Armor, Chainmail (armor)
- [x] Rank-gated recipes (Steel Sword, Chainmail require rank E)

### UI/UX
- [x] XP progress bar (fraction display: "XP 45/300" with fill bar)
- [x] Quest log accessible via Q key
- [x] Options menu (FPS, brightness with persistence, text speed)
- [x] Level up fanfare (gold glow animation + sparkle particles)
- [x] Controls hint strip (WASD, E, I, Q, Esc)
- [x] Combat victory results screen (XP bar fill animation, loot drops listed)
- [x] Inventory sorting (by type, rarity, name) + rarity-colored borders
- [x] Equippable item gold pulse indicator
- [x] Minimap overlay (canvas in top-right, shows player/enemies/exits)
- [x] Character portrait badge in HUD (race initial, race-colored)
- [x] Load Game slot browser in main menu (shows name/level/class/date)
- [x] Mobile touch controls (virtual joystick + E/I/Q buttons)
- [x] Achievement toast notifications (slide-in on unlock)
- [x] Achievements screen (accessible from pause menu)

### Content (Post-initial batch)
- [x] Tutorial intro (first-time arrow pointing at Guild + controls hint)
- [x] Dungeon traps (spike traps on all 3 floors, scaling damage)
- [x] Locked doors with keys (Rusty Key for F1→F2, Warden Key for F2→F3)
- [x] Treasure chests across all zones (6 total with guaranteed loot)
- [x] Ashenmere Marshes — new post-boss region (marsh, fog, fireflies, hermit NPC)
- [x] NPC companion system (hire Orric/Kael/Tomas for combat bonuses)
- [x] Better combat animations (enemy death, Fireball, Cure Wounds, Sneak Attack, level-up)
- [x] Environmental lore objects (13 gravestones, notes, ruins across all zones)
- [x] Random world events (merchant encounters, ambushes, flavor text per zone)
- [x] Achievement system (12 achievements tracking kills, crafts, exploration, bosses)
- [x] Elemental weakness/resistance system (fire/ice/poison/shadow/physical)

### Act 2 Main Quest
- [x] "The Scholar's Trail" — find Veyrin's journal in Ashenmere
- [x] "The Drowned Sanctum" — new 2-floor dungeon beneath Ashenmere
- [x] "What Remains" — find Veyrin at the altar, return his message to Brenna
- [x] Drowned Sanctum Floor 1 — flooded ruins with wraiths, spiders, locked door
- [x] Drowned Sanctum Floor 2 — sanctum heart with Veyrin NPC and altar
- [x] Veyrin NPC with full dialogue (explains the seal, the wardens, the deeper threat)
- [x] Brenna's Act 2 turn-in dialogue (hints at Act 3)

### Combat Depth
- [x] Enemy special abilities (8 unique: Lunge, Gore, Cheap Shot, Bone Throw, Web Spit, Soul Drain, Shield Bash, Dark Command)
- [x] Boss phase 2 (Hollow King heals, clears debuffs, double attacks at 50% HP)
- [x] Elemental weakness display in combat UI ("Weak to: fire")
- [x] Combat item use (potions mid-fight via Item button)
- [x] Equipment stat bonuses wired into combat calculations
- [x] Companion combat bonuses (+DMG, +AC, or heal/turn)

### Progression
- [x] Perk system on level up (choose 1 of 3 random perks: stats, HP, MP, ATK, DMG)
- [x] Perks saved/loaded with save files
- [x] Perk bonuses wired into combat and HUD

---

## Known Issues / Future Work

- Sound/music not yet implemented (user deferred)
- NPC portraits use Pollinations.ai — may need local fallbacks
- Act 3 content not yet built (Brenna's dialogue hints at it)
- Eastern Ashenmere exit is a "coming soon" teaser
- Class-specific perk enhancements not yet designed
- AC perk not in the perk list (could be added)
- `gainXp` HP/MP refill gets overwritten by `character.hp = state.playerHp` in combat finish

---

## Critical Technical Notes

1. **Phaser 4**: `import * as Phaser from 'phaser'` — no default export
2. **scene.start() vs scene.switch()**: Only `start()` calls `create()`. Always use `stop()` + `start()` for combat transitions.
3. **Combat infinite loop prevention**: `_enemyActing` flag + identity check on state reference + reading store state directly in keyboard handlers
4. **Vite bundler**: Interfaces must use `type` import (`import { type Foo }`) or the build fails
5. **Tileset caching**: `generateTileset()` bails if texture exists — TILE_COUNT must match the total tile count or new tiles won't render
6. **Enemy IDs**: Format is `SceneName-monsterKey-x-y` — the monsterKey is required for quest kill tracking
7. **Combat immunity**: 1.2s timer after returning from any combat prevents flee-loop
