# Hollowcrown — Project Status & Collaborator Guide

**For AzuXo + fluffybunnies + future collaborators.** This is the single source of truth for current project state. Everything in SESSION_LOG.md through 2025-04 is historical; everything below is what's actually in `main` right now. Last sweep against `main`: 2026-04-30 (HEAD = `e0022b8`, after the multi-enemy + secret-bosses + weapons + reactive-dialogue parallel-agent drop).

---

## TL;DR — What Hollowcrown Is

2D top-down RPG built in **Vite 8 + TypeScript 6 + Phaser 4 + React 19 + Zustand**. Souls-flavored dark fantasy tone, ALTTP/Pokemon pixel art, Persona 5 UI aesthetic. Public deploy: **https://norozco.github.io/hollowcrown/** (GitHub Pages, auto-deploys from `main`).

- Main menu → character creation → explore overworld → quests → dungeons → bosses → ending
- 27 scenes (5 outdoor overworld zones, 1 town + interiors, 5 dungeons × ~3 floors each, 1 secret cave)
- 3 act story with 4 major bosses (Hollow King, Drowned Warden, Forgotten, Crownless One)
- Full save/load with 3 slots + autosave, persistent world state for consumed pickups/mined ore/unlocked doors/defeated bosses

---

## How to Develop

```bash
git clone https://github.com/norozco/hollowcrown.git
cd hollowcrown
npm install
npm run dev           # http://localhost:5173/hollowcrown/
npm run test          # vitest
npm run typecheck
npm run build         # dist/
npm run fetch-tilesets  # re-download CC0 Kenney sheets (already committed)
```

**Auto-deploy:** any push to `main` triggers GitHub Pages rebuild via Actions. Takes ~60s after push. Players should hard-refresh (Ctrl+Shift+R) after a deploy.

**Commit permission:** both collaborators have write access. Standing permission to commit & push to main; keep commits focused and write descriptive messages with Co-Authored-By lines.

---

## Project Layout

```
src/
  main.tsx                  React entry, mounts App in ErrorBoundary
  App.tsx                   App shell: Phaser canvas + React overlays
  game/
    config.ts               Phaser config (1280×720, pixel-art, smoothStep)
    PhaserGame.tsx          React wrapper + dev store/cheats exposure
  scenes/                   Phaser scenes (one per zone + CombatScene)
    BaseWorldScene.ts       ~2.7kloc — shared world-scene base class
    tiles/
      generateTiles.ts      Procedural tile generation
      tileMap.ts            Kenney sprite overlay map
  ui/                       React overlays (all P5-styled)
    InGameOverlay.tsx       ~1kloc HUD, pause menu, modal management
    Combat/CombatOverlay.tsx
    Dialogue/DialogueScene.tsx
    Inventory/, Crafting/, Cooking/, Shop/
    ... one folder per screen
  engine/                   Deterministic game logic (unit-tested)
    character.ts, combat.ts, dice.ts, items.ts, monster.ts,
    quest.ts, quests.ts, perks.ts, crafting.ts, audio.ts,
    dungeonItems.ts, saveLoad.ts, ranks.ts, cooking.ts
  state/                    Zustand stores
    playerStore, combatStore, questStore, inventoryStore,
    achievementStore, bountyStore, commissionStore, loreStore,
    dungeonItemStore, dungeonMapStore, dialogueStore,
    dialogueHistoryStore, dialogueMemoryStore, gameStatsStore,
    mapMarkerStore, timeStore, worldStateStore, keybindStore
public/
  assets/tilesets/          Kenney Roguelike/RPG + Tiny Dungeon (CC0)
  portraits/                NPC + player portraits (CC0/generated)
scripts/
  fetch-tilesets.mjs        License-verified CC0 downloader
  gen-portraits.mjs         Portrait generator
```

Key architecture notes:
- **Phaser 4**: `import * as Phaser from 'phaser'` (no default export)
- **scene.start()** is the only way to re-run `create()`; `scene.switch()` only resumes
- **Combat infinite-loop prevention**: `_enemyActing` flag + identity check + reading stores fresh in handlers
- **React/Phaser pause sync**: `InGameOverlay.useEffect` tracks all overlay booleans; pauses via SceneManager API (`game.scene.pause(key)`) — NOT `sys.pause()` which zombifies scenes
- **Save format**: `SaveData` v1 with optional post-v1 fields for backward compat; localStorage key `hollowcrown_save_<slot>`

---

## Systems Shipped

### Core gameplay
- **Character creation**: 4 races × 6 classes × difficulty × gender × playerChoice + random-hero skip button, 8 Persona-style SVG portraits (→ `src/assets/portraits/player/`)
- **Combat**: turn-based, 5 actions (attack/skill/defend/flee/item). **3 skills per class × 6 classes = 18 skills** (`src/engine/combat.ts:CLASS_SKILLS`), each keyed by stable `skill.key` + a `cost: { mp?, stamina? }` object + a `visual` block (color/flashMs/shake/particle/target). Skill button opens a submenu picker (mirrors the Item submenu); keys 1/2/3 inside the submenu select skill, Esc closes. Elements + weaknesses/resistances (physical/fire/ice/shadow/poison/radiant/arcane), status effects (stun/burn/bleed/poison/marked/stunImmune), companion heal-per-turn, difficulty scaling on monster HP/damage + gold/XP rewards, phase-2 transitions on 4 bosses (double/triple attacks, status procs).
- **Multi-enemy fights** (NEW): a primary monster + optional `extraEnemies: ExtraEnemy[]` array on `CombatState`. Spawned via `spawnEnemy({ ..., extras: ['wolf', 'wolf'] })` in scene `layout()` — one world sprite triggers a 1+N fight. Primary keeps full bookkeeping (boss phase transitions, special abilities, status procs); extras are simpler (basic attack-only AI, no specials). **AoE skills now have targets**: Cleave / Volley / Fireball / Vicious Mockery / Inspiration iterate every alive enemy via `forEachAliveEnemy`. Single-target attacks/skills auto-target the primary if alive, else the lowest-HP living extra (`pickAutoTarget`). Victory requires all enemies dead. Quest kill counts + bounty + achievement kills credit every fallen enemy in a fight (so wolf-pack kills count for wolf-cull). Two early-game packs seeded: a wolf-pair + wolf-trio in Greenhollow, a skeleton-pair in Mossbarrow Ruins. Tab/cycle target UI is deferred (v0 has no manual target switch); Phaser-side extra sprites are deferred (React panel layer shows them).
- **Two resource pools**:
  - **MP** (caster classes — wizard/cleric/bard, governed by `mpStat: int|wis|cha`). Existing pool, `5 + mpStat × level`. Spent by spell skills.
  - **Stamina** (martial classes — fighter/rogue/ranger, governed by `staminaStat: str|dex`). New pool, `8 + staminaStat × level`. Spent by martial skills (3-6 cost). **Regenerates +2 per player turn** (`STAMINA_REGEN_PER_TURN` in combat.ts) so small skills are usable repeatedly without bottoming out. Ranger flipped from MP-driven to stamina-driven on this drop — old saves with ranger MP are clamped on load (`saveLoad.ts`).
- **Skill list (per class)**:
  - **Fighter** (stamina): Action Surge (4) two strikes — Cleave (6) heavy single hit, bypasses defending — Bulwark (3) heal + guard.
  - **Rogue** (stamina): Sneak Attack (4) shadow dmg — Poison Strike (5) apply poison — Vanish (3) guard up + mark target.
  - **Ranger** (stamina): Hunter's Mark (3) mark + bonus dmg — Volley (6) three rolled arrows — Beast Strike (4) bleed + dmg.
  - **Wizard** (MP): Fireball (8) heavy fire — Ice Lance (6) ice + 25% stun — Arcane Bolt (3) cheap reliable, no roll.
  - **Cleric** (MP): Cure Wounds (6) big heal — Smite (5) radiant, +40% vs shadow-weak — Bless (3) heal + guard.
  - **Bard** (MP): Vicious Mockery (3) shadow + 25% stun — Healing Word (4) small heal — Inspiration (5) heal + mark target.
- **Combat juice**: floating damage numbers, crit star-burst, screen shake, hit flash, slash/starburst overlays, HP-bar drain with P5-style lag trail, all SFX audited (no double-triggers). **Per-skill visual signatures** — each skill carries an authored `visual: { color, flashMs, shake, particle, target }` block; the Phaser scene fires `cameras.main.flash` with the skill color + a particle-bucketed SFX (`spellFire`/`spellIce`/`spellShadow`/`spellArcane`/`spellHeal`/`attackHit`), and the React layer pulses a colored aura on the focus side. Visuals are routed through a `'skill'` `CombatEvent` (skillKey + visual lookup) — **not** text-matching the log, which was the source of incidental SFX false-positives in earlier builds.
- **Quests**: 15+ main + side; persistent `questKillCounts` never cleared on zone exit; evolving NPC greetings via `dialogueMemoryStore` (5 NPCs cycle first-visit/casual/familiar dialogue pools)
- **Inventory**: 30-slot grid, 5 equipment slots, favorites (locked from sale), category filter tabs (All/Weapons/Armor/Consumables/Materials/Quest), NEW ribbon + HUD pulse indicator, sell junk button, full-set smithy recipe with 10% discount + auto-equip
- **Progression**: 20 levels, XP curve "easier 1-10, steep 11-20", 30+ perks (chosen at level-up), 6-tier rank system (F→S) derived from level + quests completed
- **Save/Load**: 3 slots + autosave, trigger on combat start / zone exit / manual; persists every store with Set → Array conversion; New Game+ flag carries perks/heart pieces/ancient coins

### World content
- **4 outdoor zones** (Greenhollow, Mossbarrow, Ashenmere, Duskmere, Ashfields, Frosthollow, Shattered Coast)
- **1 town** (Ashenvale) with 4 building interiors (guild, inn, shop, smithy) + new **Duskmere village** with dockmaster's office, lakeshore inn, fisher's cabin
- **5 dungeons** (Mossbarrow Depths 3F, Drowned Sanctum 2F, Bog Dungeon 3F, Ashen Tower 3F, Frozen Hollow 3F) + Throne Beneath 3F (final)
- **Zone-specific weather particles** (rain/snow/ash/petals/fog/embers)
- **Day/night cycle** via `timeStore` ticking on zone transitions
- **Fast travel** via waypoint stones, `worldStateStore` tracks visited zones
- **NPC arcs**: Brenna, Orric, Kael, Veyrin, Mira, Nessa with dialogue that evolves based on interaction count + quest state
- **Mira theft event**: cutscene on first Duskmere entry (red-cloaked figure dashes in, bumps player, sprints to dock); confront her on the long dock
- **Fishing**: reaction-time minigame at dock ends ("Press E when you see BITE!"), 1.5s window
- **Stew pot** (behind Nessa): trade caught fish for Health Potion + gold

### Dungeon items (Zelda-style world-unlock system)
Four shipped, two more on the roadmap. Each ships with tutorial banner on acquisition + HUD slot + cooldown radial fill. Press `R` to use active item, `Shift+R` to cycle.
- ✅ **Echo Stone** (Mossbarrow Depths boss reward) — emits sonar pulse, reveals hidden walls + invisible enemies
- ✅ **Lantern** (Mossbarrow Depths F1) — lights dark scenes, ignites torches, damages shadow-vulnerable creatures
- ✅ **Pickaxe** (Mossbarrow Depths F2) — mines iron/silver/gold ore veins, breaks boulders + cracked walls
- ✅ **Water Charm** (Drowned Sanctum F2) — wade through shallow water tiles (0.7× speed, ripples), underwater scenes
- 🚧 Mirror Shard, Flame Amulet (planned for Ashen Tower + Frozen Hollow)

### Secrets & collectibles
- **5 secret zone bosses** (NEW) — optional end-of-zone fights, harder than the main boss in each zone, hidden behind discovery conditions:
  - **The Antlered** (Greenhollow) — examine the lightning-split oak at dusk → drops Crown of Bone (epic head, +ac 2/+atk 2/+dmg 3)
  - **The Loom-Mother** (Mossbarrow Depths F1) — Echo Stone reveals a hollow wall in the east alcove → drops Loom-Mother's Eye (rare amulet, +mp 6/+atk 2)
  - **The Dredged** (Drowned Sanctum F1) — examine the half-buried anchor at dusk/night → drops Salt-Eaten Hook (epic mainHand, +atk 4/+dmg 6)
  - **The Last Witness** (Ashen Tower F1) — light all four corner braziers → drops Witness's Veil (epic head, +ac 2/+atk 1/+mp 12)
  - **The Drowned Lord** (Shattered Coast) — examine the tide-pool at night → drops The Drowned Crown (legendary head, +ac 3/+atk 2/+dmg 3/+hp 8/+mp 8)
  - Persistence: defeat marks `secret_<key>_defeated` in `worldStateStore.pickedObjects`. No respawn.
- **Heart Pieces**: scattered across world, +5 max HP each (tracked in `playerStore.heartPiecesCollected`)
- **Ancient Coins**: 12 hidden across world, collecting triggers rewards (tracked in `ancientCoins`)
- **Hollow walls**: cyan-highlighted on Echo Stone pulse, attack to break → hidden rooms with loot/heart pieces/coins
- **Breakable walls / boulders / ore veins**: need Pickaxe, persistent via `worldStateStore.minedObjects`
- **Chests/loot bags/fairy fountains**: one-time pickups persisted via `worldStateStore.pickedObjects` (fixes infinite-respawn exploit)
- **Unlocked doors**: persistent via `worldStateStore.unlockedDoors` (dungeon keys apply forever)
- **Cooking** at Inn hearth: 4 recipes combining 2 ingredients for buffs
- **Bounties**: rotating kill contracts via `bountyStore`
- **Lore entries**: 50+ collected by examining signs/objects

### UI / UX
- **Persona 5 aesthetic** throughout: Impact font, skewed red/black panels, yellow `#ffd43a` accents
- **Typewriter dialogue** with punctuation pauses (`.` = 3× pause, `,` = 2×), caret blink, click-to-skip, pushes to `dialogueHistoryStore` (Tab to review)
- **Boot splash** (NOROZCO STUDIOS presents) + **Credits** scroller (auto-scroll 90s)
- **Error boundary** with "THE WORLD BROKE" recovery screen (reload / recover / copy error / clear saves buttons)
- **FPS counter**, game time display, paused indicator
- **Photo mode** (F10) — hides HUD chrome via CSS `:has()`
- **Screenshot hotkey** (F12) — canvas.toBlob PNG download
- **Custom P5 cursor** via SVG data URI
- **PWA manifest** (red theme, standalone display)
- **World map** — stylized fantasy parchment with hand-drawn SVG icons per zone type (castle/forest/dungeon/mountain/coast/volcano/swamp), compass rose, cloud swirls, fog of war, pulsing current-zone ring, Cinzel serif labels
- **Dungeon map** — auto-drawn room graph of visited floors
- **Waypoint arrow** — directional indicator pointing to next objective
- **NEW item indicator** — pulsing top-right button, tooltip on hover
- **Gold milestone banners** — 6 tiers (100/500/1k/5k/10k/50k)

### Weapons & build identity (NEW)
- **8 new weapons with per-weapon perks** (`src/data/weapons.json` + `src/engine/items.ts` linked via `weaponKey`). The Weapon record gained an optional `perk?: WeaponPerk` discriminated union (`src/engine/weapons.ts`):
  - `on_hit_status` — % chance to apply burn/poison/bleed (Flamebrand 30% burn(2), Blackthorn 25% poison(2))
  - `on_hit_heal` — flat HP per hit (Vampiric Dagger +1)
  - `crit_range_bonus` — widens natural-crit window (Stormpiercer +1, crits on 19-20)
  - `crit_multiplier` — replaces 2× crit damage (Glasscutter 3×)
  - `damage_type` — overrides element so weakness/resist applies (Whisper-Edge → shadow)
  - `damage_bonus_vs_weakness` — multiplier vs a weakness element, compounds with applyElement's 1.5× (Sun-Forged Hammer +40% vs shadow-weak)
  - `flat_damage` — +damage paired with -accuracy (Marauder's Greataxe +3 dmg / -2 attack)
- Combat hook in `playerAct` attack branch (~50 lines). Perks read the TARGETED enemy in multi-enemy fights (a Blackthorn hit on an extra ticks poison onto that extra, not the primary).
- Weapons drop / sell / craft per existing pipelines — not yet placed in shops or boss loot tables (the secret-bosses drop hand-authored items; future drops can wire any of these in).

### Reactive dialogue (NEW)
- **`dialogueMemoryStore` now persists to saves** — NPCs remember how often you've talked to them across reloads. Was a known issue.
- **Reactive dialogue branches** for 6 NPCs (Brenna/Tomas/Vira/Orric/Kael/Veyrin), each gated on level / rank / quest state / greeting count. Authored in JSON via 5 new declarative `requires:` predicates (`min-level`, `min-rank`, `min-greeting-count`, `quest-active`, `world-flag`) — no Zustand reach-ins from JSON.
- **Mira arc continuation** — three new dialogue files (`mira-confront.json`, `mira-backstory.json`, `mira-recruitment.json`) extend the theft cutscene into a real arc:
  1. Confront Mira on the Duskmere dock (rank-aware tone): demand item back / ask why / walk away.
  2. If you ask why, return later for her backstory: lost parents, Duskmere survival.
  3. If you offer to help, find her at the Lakeshore Inn at night → recruit as a companion (entry already existed in `companion.ts`).
- World flags written from dialogue effects use the existing `hc_*` localStorage convention (`hc_mira_recovered`, `hc_mira_asked_why`, `hc_mira_help_offered`, `hc_mira_recruited`).

### Audio
- **Web Audio procedural engine** (`src/engine/audio.ts`) — 7 music tracks (town/forest/dungeon/combat/boss/menu/ending) with drones + arpeggios + crossfade via `musicToken`
- **~25 SFX** (attack/miss/crit/damage/heal/pickup/chest/unlock/trap/footsteps per surface/coin/dialogue tick/etc.)
- **50ms dedup + 16-voice limiter** on all SFX (fixes the combat buzzing bug caused by double-triggers)
- All oscillators and buffer sources properly cleanup via `onended`
- Options-linked master/music/SFX volume

### Controls
- **Keyboard**: WASD/arrows, E = interact, I = inventory, Q = quests, M = map, R = key item, Shift+R = cycle key item, H = quick heal, L = drop map pin, Tab = dialogue history, F10 = photo mode, F12 = screenshot, Esc = close any overlay / pause menu
- **Rebindable** via `keybindStore` (persists to `localStorage.hc_keybinds`)
- **Gamepad** — Xbox/PS standard spec, 30Hz polling, dispatches synthetic keyboard events
- **Touch controls** for mobile (left joystick + action buttons)

### Tiles & art
- **CC0 only** — all assets verified: Kenney Roguelike/RPG Pack (1767 tiles) + Kenney Tiny Dungeon for boss atmospherics
- License docs: `CREDITS.md`, `public/assets/tilesets/LICENSE.md`, `public/assets/tilesets/README.md`, per-pack `License.txt`
- **89 semantic TILE types** mapped to Kenney sprites
- `USE_SPRITE_TILES` flag in `tileMap.ts` toggles sprite overlay ↔ procedural fallback
- **Procedural tile generation** (`generateTiles.ts`) is the fallback — pixel-art painted tile-by-tile, 32×32, 4-8 colors each

---

## Recent Bug Fixes (last 20 commits)

Keep reading this section after pulling new changes. Each line = one commit.

| Commit | What it fixed / shipped |
|---|---|
| _(this drop, parallel-agent run)_ | **Four-feature simultaneous drop** orchestrated across 3 background agents (worktree-isolated) + main session. Pushed as 5 commits + 3 merge commits. Net: ~2700 lines added across combat, world content, items, and dialogue.<br>1. **Multi-enemy fights** (main, `0c367bb`) — `extraEnemies[]` on CombatState, AoE skill iteration, auto-target on attack, group-encounter spawn. Two early packs seeded.<br>2. **Reactive dialogue + persist memoryStore + Mira arc** (agent-dialogue, merged via `ffb2771` + `6d66337`) — 5 new declarative requirement predicates, 6 NPC reactive lines, 3-beat Mira arc with companion recruit. +17 tests.<br>3. **5 secret zone bosses** (agent-bosses, merged via `fb0caaa`) — 5 hidden-trigger bosses with procedural sprites + 5 unique drops, persisted via worldStateStore.pickedObjects.<br>4. **8 weapons + perk system** (agent-weapons, merged via `bfea348` + `e0022b8`) — discriminated-union `WeaponPerk` (on_hit_status, on_hit_heal, crit_range/mult, damage_type, damage_bonus_vs_weakness, flat_damage). Manual conflict resolution in combat.ts attack branch to compose perks with multi-enemy auto-targeting. +3 tests.<br>**Verified**: typecheck clean, **324/324 tests pass** (was 305), `npm run build` green. |
| _(prior drop)_ | **Combat content drop**: 3 skills per class (18 total), Stamina resource for martial classes (fighter/rogue/ranger), skill submenu picker, per-skill colored flash + SFX, +2 stamina regen per turn. Replaces the strictly-better-than-attack 0-MP martial skill spam. Fixes the no-distinct-animation complaint by routing skill visuals through a structured `'skill'` CombatEvent instead of log-text matching. |
| `61248fa` | Fix pseudo3d Y-sort cast — `obj as Transform & Depth` was rejected by `tsc` (TS2352, GameObject doesn't sufficiently overlap). Cast through `unknown` first. **Was blocking `npm run build` since `19ad98a`** — would have failed every deploy on a clean clone. |
| `105c129` | **CRITICAL: TDZ crash on NPC interaction.** `DialogueScene.tsx` deps array referenced `tw` 27 lines before its `useTypewriter` declaration. ReferenceError fired the instant a dialogue mounted → React error boundary → "THE WORLD BROKE" on every NPC click. Introduced by `3d9ab8f` (dialogue-skip rewrite added `tw.skip()` calls in the keyboard effect but didn't move the hook up). Fix: relocate the typewriter hook above the keyboard effect, optional-chain on `node`. |
| `39bac98` | **Music: replace dungeon/interior buzz with stacked detuned sine pads.** Two issues — (1) routing: `InteriorScene` had no music route so guild/inn/shop/smithy played the dungeon drone; (2) texture: drones were single low-pitched osc (tri/saw/sq at 65-110 Hz) which read as "buzz" even with the 1100Hz lowpass. Added a new `interior` track + an optional `pad` field on MusicTrack (array of frequency multipliers spawning sine voices for warm chorus). |
| `3d9ab8f` | Music buzz lowpass + training dummy fix + dialogue skip (saw → tri swap, capture-phase keydown). |
| `0f19b93` | **In-game cheat input on pause menu** (typed shorthand or full JS) |
| `9d789a5` | `window.cheats.*` console cheat object (F12 → type `cheats.help()`) |
| `8b9ecbe` | **Hollow King still rendered after defeat** — was checking `killedEnemies` Set which gets cleared on zone exit. Now checks `achievementStore.bossesKilled` + localStorage flag. Boss + skeleton guards skip spawn when defeated; throne room reads as won-empty |
| `66d7b36` | **Mira cutscene + dock tile**: tileAt() checked `x >= 22 → WATER` before dock override (Mira at col 28 fell in lake); fired only on `!visited` (locked out returning players); cutscene was a toast + dot (no real event). Fixed all three: moved dock checks first, changed guard to `!miraFlag`, proper animated cutscene with sprite, shake, speech bubble, chase |
| `66d7b36` | **Boss stuck — React-side force-transition fallback** in `CombatOverlay.finish()`: 300ms setTimeout forces `game.scene.stop('CombatScene') + start(returnScene)` regardless of Phaser update loop state |
| `4e5aa33` | Boss room dark-lift (thematic tie-in to "curse lifts") |
| `0bf16c7` | **Duskmere buildings enterable** (3 new interiors); **fishing rework** (reaction-time minigame); Nessa stew-pot exchange |
| `4f29a11` | **CRITICAL quests-reset-on-reload**: `loadGame` mutated `questStore.active[id] = state` in place instead of via setState — Zustand subscribers never re-rendered, UI showed empty quests even though data was in memory. Fixed with proper `setState({active: {...data.quests}})`. Rank reset was downstream (derived from quests) — same fix |
| `dacffbe` | **Audio buzzing** (combat events fired SFX twice — `combatStore` state sub + `CombatScene` log handler created phase interference); oscillator lifecycle cleanup; music crossfade token; SFX dedup + voice limiter |
| `dacffbe` | Iron golem stun rate 20%→10% + 2-turn immunity (no chain stuns); ranged +30% damage; Ranger Hunter's Mark 0 MP cost |
| `dacffbe` | Rest animation (moon + Z); evolving NPC greetings; Smithy "Craft Full Set" recipe |
| `dacffbe` | **Exploits fixed**: chests/loot bags/fairy fountains/ore nodes respawning on every battle return (scene.start re-ran `layout()` re-spawning pickups); `worldStateStore.pickedObjects` persistence |
| `dacffbe` | Dungeon keys persistent (unlocked doors stay unlocked forever); Mira positioned on dock; skeletons moved off walls; Duskmere inn radius tightened; Greenhollow signpost + breadcrumbs to Duskmere |
| `ca8cb56` | **fastTravel leaked open React overlays** into destination scene — anyOverlayOpen stayed true → re-paused new scene. Now clears every React overlay flag before scene swap |
| `2333381` | **Waypoint stuck**: `s.sys.pause()` zombified scenes (active:false, paused:true) — resume loop skipped them. Switched to `game.scene.pause(key)` SceneManager API with Phaser status-constant iteration |
| `8fce567` | Waypoint fastTravel rewrite: deferred scene swap via `setTimeout(0)`, store resets, resume post-swap, non-abstract `spawnAt` with fallback, 2s pause-mismatch watchdog |
| `158dfd4` | **Universal stuck-escape-hatch** — Nuclear Esc (force-ends dialogue, calls combat.finish, clears transitionLock, resumes paused scene, zeroes velocity); 500ms input-without-movement watchdog; "Press Esc to unstick" hint after 3s |
| `158dfd4` | Echo Stone + Lantern + Pickaxe + Water Charm shipped |
| `0bf3680` | Echo Stone mechanic (R key pulse, 300px radius, reveals hollow walls + invisible enemies, 4s cooldown) |
| `8980115` | Combat juice pass: floating numbers, shake, flash, crit star burst, HP-bar drain, P5 lag trail. Quest-kill persistent counter (fixes wolf-not-counted). Flee-touch loop fix (2s immunity + push-away). Gate bypass hardening (invisible endcap walls) |

---

## Cheat Console (for playtesting)

**Two ways to use:**

1. **In-game pause menu** (Esc in game): scroll down to "Cheats (Playtest)" section, type a command in the text box, press Enter or click Run. Click "All" for instant max-everything.
2. **Browser console** (F12 → Console tab): type `cheats.help()` for the full list. Same commands as the pause menu (full JS form: `cheats.level(20)`).

| Shorthand | Action |
|---|---|
| `all` | level 20 + full gear + all key items + 10k gold + reveal map |
| `level 20` | level up to N (1-20) |
| `gold 5000` | add gold |
| `heal` | full HP/MP |
| `gear` | full armor + steel sword + 30 potions |
| `keyitems` | grant all 4 dungeon items |
| `tp DepthsFloor3Scene` | fast travel to a scene |
| `beatboss hollow_king` | mark boss defeated (also `drowned_warden`, `crownless_one`) |
| `god` | 999 HP/MP + 999 damage weapon |
| `reveal` | all 27 zones revealed on world map |
| `stats` | print current char stats |
| `scenes` | list all Phaser scenes |
| `wipe` | clear saves/localStorage (confirms first) |

Cheats are **always available** (not dev-gated) so deployed playtesters can use them. All zustand stores also exposed on `window.__playerStore`, `__combatStore`, `__questStore`, `__inventoryStore`, `__achievementStore`, `__dungeonItemStore` for manual debugging.

---

## Known Issues / Open Work

- **NPC portraits**: Mira, Nessa, Torben, Fisher Cabin NPCs may need pass for consistency
- **Mira dialogue**: resolves theft but arc (running ally / Act 3 save) not built
- **Duskmere buildings**: entered but interiors feel thin (fisher's cabin has stash; inn + dockmaster are functional but sparse)
- **Act 3 content**: Crownless One exists but Throne Beneath 3F feels under-polished
- **Mirror Shard + Flame Amulet** (dungeon items 5 & 6): planned for Ashen Tower + Frozen Hollow
- **`dialogueMemoryStore`** (NPC greeting counts): NOT yet persisted to saves — greeting counts reset on reload. Flagged as deferred.
- **Bundle size**: 2.2 MB. Vite warns about 500 KB chunk limit. Code-splitting would help.
- **Audio buzzing**: previously fixed; watch for regression if adding new combat SFX (use the `dedup()` wrapper)
- **Preview iframe FPS**: Claude Code's preview runs at ~3 FPS which made bug reproduction hard; real browsers hit 60. Use the cheat console on deployed site for real testing.
- **Skill balance**: 18 new skills landed. Numbers were chosen to be reasonable, not playtested in depth — if a skill feels too strong (Cleave), too weak (Arcane Bolt), or wastes a turn slot, tune the cost/damage in `CLASS_SKILLS` (`src/engine/combat.ts`). Stamina regen is **+2/turn**; if martials feel resource-starved or spammy, that constant (`STAMINA_REGEN_PER_TURN`) is the dial.
- **No skill unlock progression yet**: all 3 class skills are available from level 1. Originally considered gating to lvl 1/5/10 — deferred. Could be added as a perk node or a level milestone.
- **Per-skill SFX share buckets**: 18 skills route to 9 SFX buckets (by `visual.particle`). Some skills sound identical to each other (e.g. Cure Wounds and Healing Word both use `spellHeal`). Acceptable for v0; budget a unique SFX per skill if playtesters notice the overlap.

---

## Critical Don'ts

- **Don't** use `scene.switch()` — only `stop()` + `start()` triggers `create()`
- **Don't** mutate Zustand store fields directly (`store.active[id] = x`) — always `setState({active: {...}})` so subscribers re-render
- **Don't** call `s.sys.pause()` directly on a Phaser scene — use `game.scene.pause(key)` (SceneManager API). Direct sys.pause zombifies scenes (active:false + paused:true)
- **Don't** push to `main` with a failing `npx vite build`. CI doesn't gate but deploy will serve a broken site
- **Don't** commit non-CC0 art assets. Every asset added must have license verification in `CREDITS.md`
- **Don't** remove the stuck-escape-hatch (Nuclear Esc + 500ms watchdog + 2s pause-mismatch watchdog) — those are belt-and-suspenders for scene transition edge cases
- **Don't** break the save-format backward compat. Every new field in `SaveData` must be optional (`?`) with a safe default on load

---

## Commit Style

- Descriptive imperative subject ≤ 70 chars
- Body explains root cause if fixing a bug, not just the symptom
- Always include `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` on AI-assisted commits
- Prefer **one logical change per commit** over mega-commits
- CRITICAL bug fixes in subject get `CRITICAL:` prefix

---

## Share Link

**https://norozco.github.io/hollowcrown/**

Tell playtesters to **hard-refresh Ctrl+Shift+R** on first visit (or after a new commit) to bypass browser cache.
