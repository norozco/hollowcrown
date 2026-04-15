# Dungeon of the Forgotten Repo — Game Design Specification

> **Version:** 0.2 (design decisions locked in)
> **Target medium:** Fully graphical 2D top-down RPG (web-based) with anime-style dialogue portraits
> **Inspirations:** Baldur's Gate 3 (depth/choice), Persona 5 / Octopath Traveler (dual art style), CrossCode (action/feel), classic D&D (rules)
> **Intended use:** Feed this document into Cowork as the authoritative design doc. Cowork should treat it as the source of truth for all game decisions.

---

## 1. Pitch

A 2D top-down RPG where players create a character from 10 distinct races and 6 classes, join an adventurers' guild, accept ranked missions, and grow from Rank-F newbies into heroes who topple world-ending bosses. Deep D&D-inspired mechanics sit under an accessible graphical interface. Gameplay is pixel art; conversations bloom into full-screen anime-style portrait scenes. Humor, heartbreak, romance, puzzles, and hard choices are woven into quests. Persistent world, persistent consequences, optional multiplayer. Dense lore from the land itself down to every race, character, and monster.

## 2. Design pillars (non-negotiable)

1. **Rules are deterministic; narration is flavorful.** Dice and stats are transparent and reproducible. Story text can be hand-written or AI-assisted but never overrides the engine.
2. **Choice has weight.** Major decisions write persistent world flags that gate future quests, dialogue, and endings.
3. **Every race and class is mechanically distinct.** No reskins. Race and class each define how you interact with the world.
4. **Dual art identity.** Gameplay is pixel art; dialogue is realistic anime-style portraits. Both must feel intentional, not inconsistent.
5. **The world is lore-dense.** Geography, history, each race, each major character, and every monster have real backstory — available in-game via codex and hinted at in dialogue.
6. **Ship the loop, then enrich.** Get "create character → accept quest → fight monsters → turn in → buy gear" working end-to-end before adding romance arcs, housing, or multiplayer.

## 3. Tech stack (locked for v0)

| Layer | Choice | Rationale |
|---|---|---|
| Language | **TypeScript 5.x** | Types prevent half the bugs in a game this size |
| Game engine | **Phaser 3** | Mature HTML5 2D engine, active community, good docs |
| Bundler | **Vite** | Fast HMR, simple config, works with Phaser out of the box |
| State (client) | **Zustand** | Minimal, debuggable, persist middleware for saves |
| UI overlays | **React** mounted on top of Phaser canvas | Menus, dialogue boxes, inventory, portrait scenes |
| Dice / rules | Custom `engine/` module, 100% unit-tested | Source of truth for mechanics |
| Pixel art | 32×32 tiles, top-down | Free packs from kenney.nl and itch.io for v0 |
| Anime portraits | 512×768, layered per-expression | AI-generated baseline, artist cleanup later |
| Map editor | **Tiled** (exports JSON) | Industry standard, Phaser-friendly |
| Audio | Howler.js | Simple web audio |
| Save | JSON in `localStorage` (v0) → IndexedDB (v1) → server (v2) | Progressive |
| Tests | Vitest | Fast, Vite-native |

**v1 additions:** Colyseus (Node) for multiplayer rooms, SQLite for server saves.
**v2 additions:** Postgres, Redis, proper auth (GitHub OAuth or magic link).

## 4. Scope phases

### v0 — Playable vertical slice
- Main menu (New Game / Load / Options / Quit)
- **Tutorial sequence** — guided first hour teaching movement, dialogue, combat, inventory, quests
- Difficulty selector at character creation: **Normal** or **Hardcore** (permadeath)
- Character creation (race, class, name, dice-rolled stats)
- Starter town (Guild, Inn, General Store, Blacksmith, empty house plot)
- Guild quest board with 3 starter quests + 1 story quest
- One explorable area outside town (Greenhollow Woods)
- Turn-based tactical combat on a grid
- Inventory & equipment
- Leveling (1 → 5)
- Anime portrait dialogue system for ~5 key NPCs (neutral + happy + sad + angry expressions each)
- **Pause menu with save-anywhere + options (sound, FPS, brightness)**
- Save/load (localStorage)
- Single-player only

### v1 — Content + systems expansion
- 3 more zones, 15+ quests with branching
- Rank progression system (F → S)
- **Factions & reputation** (7 starting factions, see §9)
- **Day/night cycle + weather** — both gate quests and dialogue
- **Crafting via shops** — collect materials in world, bring to craftsmen
- **Fast travel** — unlocked via mage spell OR expensive world portals (no inn teleport)
- House purchase + basic storage
- **Recruitable companions** with approval meters, banter, personal quests
- Romance arcs for romanceable companions
- First final boss ("The Hollow King") + replacement boss mechanic
- Full sound & music per zone
- Achievements + codex (monster lore, race lore, place lore)
- Hardcore mode leaderboards

### v2 — Multiplayer + PvP + polish
- Colyseus-powered 2–4 player co-op
- House-lock system (meaningful in multiplayer)
- **PvP arena** (duels, matchmaking)
- **Guild-vs-guild PvP** (faction war, weekly territory control)
- Server-hosted saves, accounts
- More races/classes/content
- Voice acting (TTS or commissioned) for major NPCs
- Mod support

## 5. Character system

### 5.1 Creation flow

```
  ┌──────────────────────────────────────────┐
  │ Step 0: Difficulty — Normal / Hardcore   │
  ├──────────────────────────────────────────┤
  │ Step 1: Name (max 15 chars, alphanumeric │
  │         + apostrophe/hyphen, no spaces)  │
  ├──────────────────────────────────────────┤
  │ Step 2: Race (10 options, see §5.3)      │
  ├──────────────────────────────────────────┤
  │ Step 3: Class (6 options, see §5.4)      │
  ├──────────────────────────────────────────┤
  │ Step 4: Roll stats                       │
  │   • 4d6 drop lowest, 6 times             │
  │   • Player assigns to STR/DEX/CON/       │
  │     INT/WIS/CHA                          │
  │   • Reroll button (unlimited in v0;      │
  │     could cost gold in v1)               │
  │   • Racial modifiers apply AFTER assign  │
  ├──────────────────────────────────────────┤
  │ Step 5: Starting equipment (class-based) │
  ├──────────────────────────────────────────┤
  │ Step 6: Portrait selection (5–8 per race,│
  │         rendered in anime style)         │
  ├──────────────────────────────────────────┤
  │ Step 7: Confirm → tutorial sequence      │
  └──────────────────────────────────────────┘
```

### 5.2 Base stats

All characters have six stats, 3–20 range (can exceed 20 at higher levels with gear):

| Stat | Short | Governs |
|---|---|---|
| Strength | STR | Melee damage, carry weight, strength checks |
| Dexterity | DEX | Ranged damage, initiative, stealth, AC |
| Constitution | CON | HP, poison/disease resistance |
| Intelligence | INT | Spell power (arcane), lore, crafting |
| Wisdom | WIS | Spell power (divine), perception, willpower |
| Charisma | CHA | Dialogue, prices, charm, leadership |

**Derived stats:**
- HP = `10 + (CON modifier × level) + class HP`
- MP = `5 + (INT or WIS modifier × level) + class MP`
- AC = `10 + DEX modifier + armor`
- Initiative = `DEX modifier + d20 at combat start`
- Modifier formula: `floor((stat - 10) / 2)` — standard D&D

### 5.3 Races (all 10)

Each race has: **stat bonuses** (applied after rolling), a **passive trait** (always on), an **active ability** (usable in/out of combat), and a **world interaction** (unique dialogue / environment option).

#### 1. Human
- **Bonuses:** +1 to all six stats
- **Passive:** *Versatility* — +1 skill point per level
- **Active:** *Second Wind* — once per short rest, heal `1d10 + level` HP
- **World:** Trusted by other humans; +10% prices at human-run shops
- **Flavor:** Generalist baseline. Good for new players.

#### 2. Elf
- **Bonuses:** +2 DEX, +1 INT, +1 WIS
- **Passive:** *Keen Senses* — cannot be surprised; detect hidden doors within 3 tiles
- **Active:** *Moonbeam* — ranged magic attack, `2d6` radiant damage
- **World:** Can read ancient Elvish inscriptions (unlocks lore quests)
- **Flavor:** Graceful, long-lived, detached.

#### 3. Dwarf
- **Bonuses:** +2 CON, +2 STR
- **Passive:** *Stonecunning* — advantage on checks in caves/dungeons; poison resist 50%
- **Active:** *Dwarven Fortitude* — reduce incoming damage by 5 for one turn
- **World:** Dwarven merchants give 15% discount; can identify gemstone value on sight
- **Flavor:** Tough, stubborn, loves gold and ale.

#### 4. Halfling
- **Bonuses:** +2 DEX, +1 CHA, +1 CON
- **Passive:** *Lucky* — once per combat, reroll a failed d20
- **Active:** *Dash* — move 2× this turn, cannot be opportunity-attacked
- **World:** Small size lets you squeeze through gaps other races can't
- **Flavor:** Cheerful, cunning, surprisingly brave.

#### 5. Orc
- **Bonuses:** +3 STR, +2 CON, −1 INT
- **Passive:** *Savage Attacks* — crit range expanded (19–20 instead of just 20)
- **Active:** *Relentless Endurance* — when reduced to 0 HP, drop to 1 HP instead (1× per long rest)
- **World:** Intimidation checks get +5; some NPCs refuse to speak to you
- **Flavor:** Feared outsider. Dialogue paths close but new ones open.

#### 6. Tiefling
- **Bonuses:** +2 CHA, +1 INT, +1 DEX
- **Passive:** *Infernal Legacy* — fire resistance 50%; darkvision
- **Active:** *Hellish Rebuke* — when hit by melee, reflect `2d10` fire damage
- **World:** Some NPCs distrust you; others (occultists, rogues) grant access
- **Flavor:** Outsider with demonic ancestry. Complicated social life.

#### 7. Dragonborn
- **Bonuses:** +2 STR, +1 CHA, +1 CON
- **Passive:** *Draconic Ancestry* — pick an element at creation (fire/cold/lightning/acid/poison); resist that element 50%
- **Active:** *Breath Weapon* — cone attack, `3d6` elemental damage, 30-sec cooldown
- **World:** Respected by other dragon-descended beings; hunted by dragon-slayer factions
- **Flavor:** Proud warriors carrying the blood of dragons.

#### 8. Gnome
- **Bonuses:** +2 INT, +1 DEX, +1 CON
- **Passive:** *Gnome Cunning* — advantage on saves vs magic effects
- **Active:** *Minor Illusion* — create a decoy that distracts enemies for 2 turns
- **World:** Can tinker with mechanical traps and clockwork doors (unlock puzzles)
- **Flavor:** Curious inventors with a weakness for strange contraptions.

#### 9. Half-Elf
- **Bonuses:** +2 CHA, and +1 to any two other stats (player choice)
- **Passive:** *Skill Versatility* — gain proficiency in any two skills
- **Active:** *Fey Charm* — attempt to charm a humanoid for 1 minute (Wisdom save to resist)
- **World:** Accepted in both elven and human towns; no faction hostility
- **Flavor:** Walks between worlds, at home in none.

#### 10. Tabaxi (Catfolk)
- **Bonuses:** +2 DEX, +1 CHA, +1 WIS
- **Passive:** *Feline Agility* — double movement on the first turn of combat
- **Active:** *Claws* — natural weapon, `1d6 + DEX` slashing, always available
- **World:** Can climb smooth walls; unique dialogue with animal-themed NPCs
- **Flavor:** Curious wanderers, easily distracted by shiny things.

### 5.4 Classes (6 starter)

Class determines weapon/armor proficiencies, starting abilities, HP per level, and advancement path.

| Class | Primary Stats | HP/level | Role | Signature ability |
|---|---|---|---|---|
| **Fighter** | STR / CON | +10 | Tank / melee DPS | *Action Surge* — extra attack once per combat |
| **Rogue** | DEX / INT | +6 | Stealth / crit damage | *Sneak Attack* — +1d6 damage per 2 levels when flanking |
| **Wizard** | INT / WIS | +4 | AOE caster | *Fireball* at lvl 3, spellbook grows with levels; **learns Teleport at lvl 9** (fast travel unlock) |
| **Cleric** | WIS / CHA | +8 | Healer / support | *Cure Wounds* + turn undead |
| **Ranger** | DEX / WIS | +8 | Ranged DPS / tracker | *Hunter's Mark* + animal companion at lvl 3 |
| **Bard** | CHA / DEX | +6 | Support / crowd control | *Vicious Mockery*, party buff auras |

**Race/class synergies:** Some combinations are mechanically stronger (Dwarf Fighter, Elf Wizard) but nothing is forbidden.

### 5.5 Skill trees

Each class gets a skill tree that unlocks as they level. At levels 2, 4, 6, 8, 10, 12, 15, 18 the player picks one node. Each class tree has ~15 nodes across 3 branches.

**Example — Fighter tree:**
```
                 [ Fighter lvl 1 ]
                        │
         ┌──────────────┼──────────────┐
     [Berserker]    [Champion]    [Battlemaster]
         │              │              │
     Rage+dmg      Crit range 18+  Maneuvers
         │              │              │
    Reckless Atk    Extra attack   Commander aura
         │              │              │
       ...            ...             ...
```

Full tree definitions for all 6 classes live in `src/data/skillTrees.json`. Branches should produce genuinely different play styles; no "strictly better" path.

### 5.6 Leveling & XP

Level advancement happens automatically when XP threshold is crossed; player is prompted to spend stat points and choose skill-tree nodes.

**XP scaling by monster tier:**

| Tier | Example | XP per kill |
|---|---|---|
| Trivial | Rat, bat | 5 |
| Weak | Wolf, goblin | 15–25 |
| Standard | Orc warrior, skeleton | 50–75 |
| Elite | Ogre, minotaur | 150–250 |
| Boss (sub) | Dungeon boss | 500–1000 |
| Boss (story) | Act boss | 2000–5000 |
| Boss (final) | Hollow King etc. | 10000+ |

**XP scaling by quest type:**

| Quest type | XP range |
|---|---|
| F-rank fetch | 50–100 |
| F-rank hunt | 100–150 |
| E-rank | 200–400 |
| D-rank | 500–800 |
| C-rank | 1000–1500 |
| B-rank | 2000–3000 |
| A-rank | 4000–6000 |
| S-rank | 8000–12000 |
| Story quest | +50% of base |

Exploration milestones also grant XP (first entry to a new zone, first discovery of a landmark).

## 6. World structure

### 6.1 Starter town: **Ashenvale**

The first town every character starts in. Hand-designed, fixed layout.

**Buildings (v0):**
1. **Adventurer's Guild** — central hub, quest board, rank NPC
2. **Whispering Hollow Inn** — sleep (restore HP/MP for 10g), rumors
3. **General Store** — consumables, tools
4. **Ironclad Smithy** — weapons, armor, repair, and **crafting** from player-collected materials
5. **Empty plot** (`[Available: 500g]`) — future player house

**NPCs (v0):** Guildmaster Brenna, Innkeeper Tomas, Merchant Vira, Smith Ogric, Town Crier, 3–5 flavor townsfolk with dialogue trees.

**v1 adds:** Temple (cleric trainer, resurrection), Mage's Tower (wizard trainer, **teleport spell tutor**), Thieves' Guild (hidden), Port (physical travel hub), Alchemist, **Portal Stone** (ancient fast-travel node).

### 6.2 Zones

Each zone is a hand-designed map (Tiled editor → JSON) with encounter tables and quest hooks.

| Zone | Biome | Level range | v0/v1/v2 |
|---|---|---|---|
| Ashenvale Town | Town | — | v0 |
| Greenhollow Woods | Forest | 1–3 | v0 |
| Mossbarrow Ruins | Crypt | 3–5 | v1 |
| Ember Peaks | Mountain | 5–8 | v1 |
| Sunken Isles | Coast | 6–10 | v1 |
| Obsidian Waste | Desert | 10–14 | v2 |
| Voidrift (endgame) | Extraplanar | 15+ | v2 |

### 6.3 Travel

Fast travel is **not free and not universal.** Three ways to cross the world:

1. **Walk** — always available. Zones connect via edge transitions. Encounters and weather events possible en route.
2. **Mage teleport spell** — Wizards learn *Teleport* at level 9. Requires 1 MP per zone. Can teleport to any discovered Portal Stone.
3. **Portal Stones** — ancient magical nodes scattered in key locations. Activating one costs **100g** per jump (breaks down to: 20g attunement fee paid to the local Mage's Guild + 80g raw arcane dust consumed). Non-mages rely on this.

Walking is the default. Speedrunning the world requires planning and economy management.

## 7. Day/Night cycle & weather

### 7.1 Time system
- Full day cycle = 24 real minutes (configurable)
- Time segments: Dawn (6–9), Day (9–18), Dusk (18–21), Night (21–6)
- Visual lighting changes: warm dawn, bright day, orange dusk, blue-black night
- Torches, lanterns, and magical light sources illuminate night scenes

### 7.2 Weather states
Per zone, rolled daily: Clear, Cloudy, Rain, Storm, Fog, Snow (cold zones). Each has mechanical effects:

| Weather | Effects |
|---|---|
| Clear | Baseline |
| Rain | −2 to ranged attacks, −1 to perception |
| Storm | Rain effects + chance of lightning strike in combat |
| Fog | −5 to perception, ambush chance doubled |
| Snow | Half movement speed, cold damage without winter gear |

### 7.3 Quest gates
Some quests activate only under specific conditions:
- "The Midnight Merchant" — Ashenvale market at Night only
- "Sunbeam Covenant ritual" — Dawn only, fails if interrupted by nightfall
- "Track the Mossfiend" — requires rain (tracks wash away otherwise)
- "Ember Peak Summit" — snow-storm version of zone has unique boss

NPCs also follow schedules: shops close at night, some NPCs only appear at certain times.

## 8. Factions & reputation

Each player has a **reputation score** with every faction (−100 to +100). Actions, quests, and dialogue shift these.

### 8.1 Starting factions

| Faction | Description | Rep effect examples |
|---|---|---|
| **Adventurer's Guild** | Your starting faction. Tied to guild rank. | +rep for completing quests; −rep for abandoning them |
| **Crown of Ashenvale** | Local nobility / town government | +rep for lawful acts; −rep for crimes |
| **Circle of Mages** | Arcane scholars | +rep for arcane quests; −rep for destroying knowledge |
| **Church of the Dawn** | Light-aligned religious order | +rep for undead-slaying, almsgiving |
| **Thieves' Guild** | Criminal underground | +rep for heists, −rep for turning thieves in |
| **Verdant Covenant** | Druidic nature faction | +rep for protecting wilds; −rep for deforestation quests |
| **Iron Legion** | Militarist order | +rep for battlefield valor; −rep for banditry |

### 8.2 Consequences

| Rep range | Effect |
|---|---|
| ≥ +50 | "Honored" — access to faction-exclusive quests, equipment, 20% discount at their shops |
| +10 to +49 | "Friendly" — dialogue options unlock, minor discounts |
| −10 to +9 | "Neutral" — baseline |
| −11 to −49 | "Disliked" — prices +20%, some dialogue closed |
| ≤ −50 | "Hostile" — faction NPCs attack on sight, bounty placed, safe zones become unsafe |

Factions interact: helping Thieves' Guild hurts Crown reputation. No path keeps everyone happy. **Alignment is a web, not a line.**

## 9. Guild & rank system

### 9.1 Ranks
**F → E → D → C → B → A → S → SS → SSS**

Each rank gates quests you can see/accept. Higher ranks unlock higher-pay, higher-risk missions.

### 9.2 Ranking up
- F → E: Complete 3 quests
- E → D: Complete 5 more + one E-rank boss
- D → C: Complete 7 more + rank-up trial (combat challenge)
- C and above: Requires guildmaster nomination + trial

### 9.3 Quest board
Dynamic list showing all quests visible at your rank. Each entry:
```
┌──────────────────────────────────────────┐
│ [F] Cull the Wolf Pack        Reward: 50g│
│ The Greenhollow farmer's livestock is    │
│ being picked off. Deal with the wolves.  │
│ Location: Greenhollow Woods              │
│ Objectives: Kill 5 wolves                │
│ XP: 100                                  │
│ Weather: Any / Time: Day preferred       │
│          [ Accept ]  [ Dismiss ]         │
└──────────────────────────────────────────┘
```

### 9.4 Quest types
- **Hunt** — kill X monsters
- **Delivery** — bring item from A to B
- **Escort** — protect an NPC from A to B
- **Investigation** — dialogue-heavy, solve a mystery
- **Fetch** — retrieve an item from a location (often with combat)
- **Bounty** — defeat a named elite enemy
- **Story** — hand-crafted, branching, consequential (rarer, rank-gated)

### 9.5 Story quest emotional notes

Every story quest must hit at least two of these:
- 😂 **Funny** — absurd scenarios, comic NPCs, player-choice humor
- 😢 **Sad** — loss, grief, unwinnable situations
- ⚖️ **Hard decisions** — choose A or B, both cost something
- 🧩 **Puzzles** — sliding blocks, riddles, gear puzzles, mechanical locks
- 💔 **Heartbreak** — betrayal, loss of trust, dark reveals
- 💕 **Romance** — companion approval arcs (v1)

## 10. Combat system

Turn-based tactical combat on a grid. Triggered by walking into enemies on the world map (or ambushed).

### 10.1 Flow
1. Initiative rolled for all combatants (`d20 + DEX mod`)
2. Each turn: move + one action + optional bonus action + free reactions
3. Actions: Attack / Cast / Item / Dodge / Dash / Help / Hide / Flee
4. Combat ends when one side is defeated or flees

### 10.2 Mechanics
- **Grid:** 20×20 max per encounter, 32×32 pixel tiles
- **Attack roll:** `d20 + stat mod + proficiency` vs target AC
- **Damage:** weapon dice + stat mod + bonuses
- **Crits:** natural 20 = double damage dice
- **Conditions:** poisoned, stunned, blinded, prone, grappled, charmed, frightened — each with mechanical effects
- **Line of sight, cover, flanking, high ground** all produce real mechanical bonuses
- **Environmental interactions:** oil puddles ignite, explosive barrels, collapse-able bridges

### 10.3 Enemy AI
Simple priority system per enemy archetype (aggressive, defensive, ranged, support).

## 11. Economy

### 11.1 Currency
Single currency: **gold (g)**.

### 11.2 Income sources
| Source | Amount (v0) |
|---|---|
| Starter quests | 20–100g |
| Monster loot (per kill) | 1–20g |
| Selling found items | 50–70% of buy price |
| Selling crafted items (v1) | Varies |
| Hidden chests | 50–500g |

### 11.3 Spending sinks
- Inn rest: 10g
- Weapons/armor: 50–5000g
- Potions: 10–100g
- Portal Stone fast travel: 100g per jump
- Crafting fees: 10–500g per item
- House purchase: 500g (basic) → 50,000g (mansion)
- House upgrades (v1): 100–10,000g each

### 11.4 Item rarity
`Common` (white) · `Uncommon` (green) · `Rare` (blue) · `Epic` (purple) · `Legendary` (orange).

## 12. Crafting

### 12.1 Flow
1. Player collects **raw materials** from the world (mining nodes, monster parts, gathered herbs, quest rewards)
2. Player brings materials to the **relevant craftsman** (Smith for weapons/armor, Alchemist for potions, Tailor for cloth)
3. Craftsman performs the work for a **gold fee** + materials
4. Crafted item has slightly better stats than equivalent shop purchase, and may have player-chosen modifiers (e.g. elemental damage if using elemental ore)

### 12.2 Material categories
- **Ores**: iron, silver, gold, mithril, adamantine
- **Hides**: wolf pelt, bearskin, dragonhide
- **Monster parts**: orc tusk, troll heart, dragon scale
- **Herbs**: whiteleaf, moonpetal, shadowroot
- **Gems**: quartz, ruby, sapphire, soul-stone
- **Essences**: fire, ice, lightning, shadow (from specific monster kills)

### 12.3 Material-driven customization
Example: bringing 5 iron ore + 1 fire essence to the Smith produces a Flaming Iron Sword (+1d6 fire damage) instead of a plain Iron Sword. Recipe book unlocks as player experiments or finds recipe scrolls.

**v0:** Basic smithing at Ironclad Smithy (3 recipes).
**v1:** Full crafting trees across smith/alchemist/tailor.

## 13. House / base camp system

### 13.1 Purchase
- Empty plot in Ashenvale: 500g
- Signing contract opens the building interior (pre-furnished starter house)

### 13.2 Rooms (v1 upgrades)
- Bedroom (sleep = full HP/MP restore + dream events)
- Storage chest (unlimited item storage)
- Kitchen (cooking = buffs)
- Garden (grow herbs for potions)
- Trophy room (display boss loot, NPCs comment on it)

### 13.3 Lock mechanic (v2 / multiplayer only)

Only meaningful in multiplayer.
- Player clicks "Lock Door" when leaving the house
- If left unlocked at session end → other players can enter and steal N items from the chest
- Mitigations: better locks (buy with gold), guard dogs (hire NPC), alarm runes (magic)

**v0/v1:** house is always safe. v2 introduces the lock system.

## 14. Inventory & equipment

- Grid-based inventory, 30 slots baseline (bag upgrades possible)
- Equipment slots: head, chest, legs, boots, gloves, main hand, off-hand, 2 rings, amulet
- Weapons have class proficiency — you can wield a greatsword as a Wizard but have disadvantage on attacks
- Items have weight; encumbrance slows movement
- Right-click item → Use / Equip / Drop / Sell

## 15. Pause menu, save system & options

### 15.1 Pause menu (press ESC anywhere except during combat animations)
- **Resume**
- **Save Game** (save to any of 3 slots — available anywhere in v0; disabled during combat)
- **Load Game**
- **Options** (see §15.3)
- **Codex** (lore entries unlocked so far — v1)
- **Return to Main Menu**
- **Quit to Desktop**

### 15.2 Save files
- JSON schema, versioned
- 3 save slots (v0) → unlimited named slots (v1)
- Auto-save on zone transition and after combat (overwrites an `autosave` slot)
- **Hardcore mode:** saves are one slot, deleted on death

### 15.3 Options menu

| Option | Values |
|---|---|
| Master Volume | 0–100 |
| Music Volume | 0–100 |
| SFX Volume | 0–100 |
| Voice Volume (v1) | 0–100 |
| FPS Cap | 30 / 60 |
| Brightness | 0–100 |
| UI Scale | 75% / 100% / 125% / 150% |
| Subtitles | On / Off |
| Colorblind filter | None / Protanopia / Deuteranopia / Tritanopia |
| Mouse / Keybind rebinding | Full remap |

Options saved to `localStorage` independently of save slot.

## 16. Death & difficulty

### 16.1 Normal mode
- HP drops to 0 → "Defeated" screen
- Respawn at last inn rested-at OR player's house (if owned)
- **Lose 10% of carried gold** (not stored gold)
- Equipped items are not lost
- 1-hour in-game cooldown on XP gains from kills in the zone you died in (discourages rush-and-die farming)

### 16.2 Hardcore mode
- One life. HP reaches 0 → character **permanently dies**
- Save file converted to a "Memorial" entry shown on the main menu (cause of death, level reached, notable kills)
- No second chances, no resurrection items work
- Unlocks a hardcore-only leaderboard
- Unlocks cosmetic rewards (Hardcore crown skins, title badges) for subsequent characters who survive certain milestones

Difficulty chosen at character creation and **locked** for that character.

## 17. Final bosses

When the player defeats the final boss, a NEW one appears. Framework:

- **Tier 1 boss (level 15–20):** *The Hollow King* — a fallen guildmaster turned lich
- **Tier 2 boss (level 20–25):** *Malixar, the Bound* — an elder demon the Hollow King was keeping sealed
- **Tier 3 boss (level 25+):** *The Void Between* — an entity that existed before reality; killing it fractures the world map and opens Tier 3 zones
- **Endless tier:** procedurally-named voidspawn bosses, each one scaling with player level. Leaderboard-worthy.

Each tier boss has multi-phase combat, a unique arena, a pre-fight anime-style cutscene, and world-altering consequences.

## 18. Tutorial

### 18.1 Opening sequence (post-character creation)
1. **Awakening** — character wakes in Ashenvale Inn. Innkeeper explains "You're a new adventurer, head to the Guild."
   - Teaches: movement (WASD/arrows), interact (E/click)
2. **Street encounter** — a pickpocket snatches a coin pouch
   - Teaches: combat initiation, basic attack, flee option
3. **Guild registration** — Guildmaster Brenna gives dialogue + hands first F-rank quest
   - Teaches: dialogue portraits, quest acceptance, quest log
4. **First quest: Kill 5 Wolves in Greenhollow** — leaving town triggers a brief "How to fight on the grid" overlay
   - Teaches: combat grid, turn order, stat checks, ability use
5. **Loot & return** — player loots wolves, sells pelts, turns in quest
   - Teaches: inventory, selling, quest turn-in, leveling
6. **Tutorial ends** — Brenna suggests checking the quest board for more; player is now free

### 18.2 Contextual tooltips
First-time UI interactions show a one-shot tooltip ("This is your HP bar — if it hits 0, see §16"). Toggle in Options.

## 19. Lore & worldbuilding

### 19.1 World name (placeholder): **Aethermoor**

*Rename if desired — treat as TBD until final.*

Aethermoor is a broken continent where an ancient cataclysm called the **Sundering** fractured the sky and let magic leak into the world in raw, dangerous forms. The Adventurers' Guild exists because kingdoms can no longer afford standing armies to deal with the monstrous fallout.

### 19.2 Lore pillars
Every piece of content must answer:
1. **Why does this exist?** (in-world origin)
2. **What was it before the Sundering?** (historical layer)
3. **How does it interact with the six races?** (cultural lens)

### 19.3 Required lore documents (separate files in `lore/`)
- `lore/world.md` — geography, Sundering event, major kingdoms, calendar, currency origin
- `lore/races/<race>.md` — one file per race: origin myth, cultural values, language, inter-race relations, religious practice
- `lore/factions/<faction>.md` — one file per faction (from §8)
- `lore/monsters/<monster>.md` — one file per monster: habitat, behavior, mythic significance, what makes it a monster vs a creature
- `lore/characters/<npc>.md` — one file per named NPC, including backstory that may never surface in dialogue (but informs writing)
- `lore/timeline.md` — chronological events leading to "now"

### 19.4 In-game codex
Lore entries unlock as players encounter their subject:
- Kill a new monster → codex entry unlocks
- Visit a new zone → zone lore unlocks
- Have a named conversation → character codex unlocks
- Read a scroll / book → fragment unlocks, full entry after X fragments
- Accessed from pause menu → Codex

### 19.5 Tone & voice
- Morally grey factions — no purely good or evil organizations
- Races are cultures, not monoliths — individual variation matters
- Monsters often have tragic origins — the Hollow King was once a loved guildmaster
- Humor exists at the ground level (taverns, companions) but lore itself is serious

### 19.6 Drafting strategy
Lore is expensive to write. Recommended pipeline:
1. **Human outlines** — you write the bullet-point skeleton for each file
2. **LLM drafts** — Claude or similar generates prose from skeletons using a consistent "world bible" prompt
3. **Human pass** — tone correction, factual alignment, punchlines
4. **Linting** — a script checks for internal contradictions (e.g., a character referenced in two places with different ages)

## 20. Art direction

### 20.1 Dual-style identity

| Layer | Style | Details |
|---|---|---|
| **Gameplay (world, combat, UI)** | Pixel art, 32×32 tiles | Warm earthy palette; top-down; 3-frame walk cycles minimum |
| **Dialogue portraits** | Realistic anime | 512×768, 4–6 expressions per major NPC (neutral, happy, sad, angry, shocked, thoughtful) |
| **Cutscenes & key story moments** | Full anime-style CG | 1280×720 single images with overlayed text boxes |
| **Codex illustrations** | Mixed | Pixel-art icons for items; painterly art for lore entries |

Think Persona 5 / Octopath Traveler / Triangle Strategy — gameplay in one style, conversations in another. Tonal contrast is a feature.

### 20.2 Portrait system
- Displayed on left or right edge of screen during dialogue, opposite the text box
- Active speaker scales up slightly; listeners dim and scale down
- Expression changes sync with dialogue beats
- Optional subtle animation: blink (every 3–5 sec), mouth flap on speech, sway

### 20.3 v0 portrait scope
- ~10 key NPCs (Guildmaster, Innkeeper, Merchant, Smith, Town Crier, first 5 quest-givers/story characters)
- 4 expressions each = 40 portraits
- Plus player-character portraits: 10 races × 4 portrait variants × 4 expressions = 160 (ambitious; can trim to "one portrait set per race with palette-swap for customization")

### 20.4 Portrait production pipeline (v0)
1. AI-generate baseline portraits using a consistent style reference and seed control
2. Manual touch-ups for expression consistency (same character across expressions)
3. Export as PNG with transparent background, standardized cropping

### 20.5 Commissioned art (v1+)
Budget for custom artist work on:
- Major story characters (definitive canon portraits)
- Boss cutscene CGs
- Companion romance scene illustrations

### 20.6 Asset sources (v0 free)
- Kenney.nl — tiles, items, UI
- itch.io — various free tilesets, monster sprites
- AI generation for anime portraits (with manual cleanup)

### 20.7 Color / typography
- Color palette: warm earth tones for pixel art, saturated anime palette for portraits (intentional contrast)
- Font: a readable pixel font (e.g. Press Start 2P for headers, m5x7 for body)
- Portrait-scene font can differ (cleaner sans-serif) to reinforce the layer switch

## 21. Audio direction

### 21.1 Music
- **v0:** 4 tracks minimum — main menu, Ashenvale town, Greenhollow Woods, combat
- **v1:** Unique track per zone, dynamic combat music (intensifies as boss phases shift), stingers for level-up / quest complete / death
- **v2:** Fully orchestrated tracks, commissioned composer

### 21.2 SFX
- **v0:** Footsteps (3 surfaces), attack hits (by weapon type), spell casts, menu clicks, level-up, quest complete, currency pickup
- **v1:** Ambient sounds per zone (forest birds, cave drips, town crowd), weather (rain, thunder, wind), crafting SFX
- **v2:** Full Foley library, 3D spatial audio

### 21.3 Voice
- **v0:** None (text only)
- **v1:** Optional TTS for major NPCs
- **v2:** Commissioned voice acting for companions, bosses, story NPCs; TTS remains for everyone else

All volume channels (Master/Music/SFX/Voice) independently controllable via Options (§15.3).

## 22. Multiplayer, PvP & guild vs guild (v2)

### 22.1 Co-op
- 2–4 player parties
- Shared world state (town), separate inventories
- Option: shared gold pot
- Server-authoritative via Colyseus

### 22.2 PvP
- **Arena duels** — queue from any Inn. 1v1 matched by level. Rewards: ranking, cosmetic titles.
- **Open-world PvP zones** — certain zones flagged as contested; players can attack each other inside. Opt-in.
- **Death in PvP** — no gold loss, no permadeath (even in Hardcore — PvP is a special case)

### 22.3 Guild vs Guild
- Players can form **player guilds** (separate from the Adventurer's Guild). Min 5 players, max 50.
- Weekly **Territory War** — guilds declare war, fight in designated PvP zones for control of in-game territories
- Holding territory grants:
  - Shared guild bank gold income
  - Unique quest board for guild members
  - Cosmetic banners in towns
- Guild-vs-guild rankings displayed on a global leaderboard

### 22.4 Anti-grief
- No open-world PvP in starter zones
- House-lock system (§13.3) prevents session-end looting
- Level-gap matchmaking in arenas (±3 levels)

## 23. File structure

```
dungeon-of-the-forgotten-repo/
├── src/
│   ├── main.ts                 # Phaser bootstrap
│   ├── scenes/
│   │   ├── BootScene.ts
│   │   ├── MenuScene.ts
│   │   ├── CharacterCreationScene.ts
│   │   ├── TutorialScene.ts
│   │   ├── TownScene.ts
│   │   ├── DungeonScene.ts
│   │   ├── CombatScene.ts
│   │   ├── DialogueScene.ts    # anime portrait overlay
│   │   └── UIScene.ts          # persistent overlay
│   ├── engine/                 # DETERMINISTIC RULES — 100% tested
│   │   ├── dice.ts
│   │   ├── character.ts
│   │   ├── combat.ts
│   │   ├── stats.ts
│   │   ├── items.ts
│   │   ├── crafting.ts
│   │   ├── reputation.ts
│   │   ├── time.ts             # day/night/weather
│   │   └── __tests__/
│   ├── data/                   # Static game data (JSON)
│   │   ├── races.json
│   │   ├── classes.json
│   │   ├── skillTrees.json
│   │   ├── items.json
│   │   ├── monsters.json
│   │   ├── quests.json
│   │   ├── factions.json
│   │   ├── craftingRecipes.json
│   │   └── zones/
│   │       ├── ashenvale.json
│   │       └── greenhollow.json
│   ├── ui/                     # React components for menus
│   │   ├── MainMenu.tsx
│   │   ├── CharacterCreator.tsx
│   │   ├── PauseMenu.tsx
│   │   ├── OptionsMenu.tsx
│   │   ├── Inventory.tsx
│   │   ├── QuestBoard.tsx
│   │   ├── Codex.tsx
│   │   └── DialoguePortrait.tsx
│   ├── state/                  # Zustand stores
│   │   ├── playerStore.ts
│   │   ├── worldStore.ts
│   │   ├── saveStore.ts
│   │   ├── optionsStore.ts
│   │   └── reputationStore.ts
│   └── assets/
│       ├── tiles/              # pixel art tilesets
│       ├── sprites/            # character + monster sprites
│       ├── portraits/          # anime-style dialogue art
│       ├── cgs/                # cutscene stills
│       ├── audio/
│       │   ├── music/
│       │   └── sfx/
│       └── ui/                 # HUD, menu elements
├── lore/                       # Worldbuilding (§19)
│   ├── world.md
│   ├── timeline.md
│   ├── races/
│   ├── factions/
│   ├── monsters/
│   └── characters/
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 24. v0 milestones (suggested order)

1. **Project setup** — Vite + TS + Phaser + React overlay pattern working
2. **Rules engine** — `dice.ts`, `character.ts`, `stats.ts` with full tests
3. **Main menu scene** — buttons, new game, load save
4. **Character creation scene** — full flow including difficulty choice, persists to `playerStore`
5. **Dialogue/portrait system** — DialogueScene with anime portrait overlay, test with placeholder art
6. **Town scene** — render Ashenvale tilemap, player sprite moves with WASD
7. **Tutorial sequence** — scripted opening, teaches core verbs
8. **NPC dialogue** — real conversations with portraits, branching options
9. **Guild quest board** — list starter quests, accept, track
10. **Zone transition** — walk out of town → load Greenhollow Woods
11. **Combat scene** — grid, initiative, attack/move, win/lose, death handling
12. **Inventory + shop** — equip items, buy/sell
13. **Crafting MVP** — bring ore to smith → get sword
14. **Pause menu + Options + Save/Load** — save anywhere, volume/FPS/brightness sliders
15. **Leveling** — XP bar, level-up screen, skill-tree node pick
16. **Time/weather v0** — day/night visible, one weather type affects one quest
17. **First story quest** — hits 2+ emotional notes from §9.5
18. **Polish pass** — tooltips, tutorial tweaks, bug fix sweep

## 25. Open questions still to answer

Most big decisions are locked. Remaining items:

1. **World name** — "Aethermoor" is placeholder. Confirm or rename.
2. **Monetization** — free/open-source, one-time paid, freemium? Affects v2 server costs.
3. **Art commissioning budget** — confirmed "all of the above" (full art/audio). What's the actual budget and timeline for commissioned work?
4. **Companion roster** — how many recruitable companions total across v1? Suggested: 6 (one per class archetype). Who are they?
5. **First story quest's emotional targets** — I'll default to "sad + hard decision" (escort a pilgrim to a shrine; shrine turns out to be cursed — save or destroy?). Confirm or replace.
6. **Language & localization** — English only for v0/v1? Localization hooks now or later?

## 26. Out of scope (for now)

- 3D graphics
- Open-world seamless streaming (zones are discrete)
- Procedural dungeon generation in v0/v1 (hand-designed first)
- Mod support before v2
- Console/mobile/VR ports
- Crypto / NFT anything

## 27. Glossary

- **v0/v1/v2** — major release phases (§4)
- **BG3** — Baldur's Gate 3, a design inspiration
- **SRD** — System Reference Document, open-licensed D&D 5e rules
- **HMR** — hot module reload, Vite's dev-time feature
- **Colyseus** — multiplayer framework for Node.js
- **Portrait scene** — dialogue moment where the game switches from pixel gameplay to anime-style portraits
- **Portal Stone** — ancient teleport node, paid fast-travel for non-mages (§6.3)
- **Sundering** — the cataclysmic event in Aethermoor's backstory (§19.1)
- **Hardcore mode** — permadeath difficulty (§16.2)

---

## 28. Implementation decisions (v0 build log)

This section records the concrete decisions locked in during v0 implementation. Add to it as new systems ship; don't silently drift.

### 28.1 Tone & voice (binding)

- **No dice notation in player-facing copy** (`2d6 damage` → `damage`, `1d10 + level HP` → `restore HP based on your level`)
- **No exposed grid mechanics** in flavor (`within 3 tiles` → `nearby` or atmospheric alternative)
- **Souls-style prose**: spare, atmospheric, understated — no "Welcome, {name}!" heroism
- Stats shown as **STR/DEX/CON/INT/WIS/CHA** (uppercase abbreviations) in copy; lowercase keys in code
- **Keep deterministic numbers** when they aid build planning (+10 HP/level, +15% dwarf discount)
- Example race flavor: `"Feared on sight, even where they have done no wrong."` (Orc) vs earlier `"Feared outsider. Dialogue paths close, but new ones open."` — meta-mechanics out, in-world voice in

### 28.2 Keyboard navigation (binding)

- **Main menu**: first button autofocuses; `Enter` activates
- **Character creation wizard**: `Enter` advances when `canProceedFromStep()`; `Esc` cancels
- **Confirm step**: Begin Adventure button autofocuses; `Enter` triggers creation
- **Dialogue**: `Space`/`Enter` advances auto-nodes; `1-9` picks choice by index; `Esc` exits
- Handlers don't hijack `Enter` inside `TEXTAREA`/`SELECT`/`INPUT`

### 28.3 Starting weapons (extends §14)

- **Data**: `src/data/weapons.json` — 13 weapons with `{ key, name, handedness, attackStat, damageKind, range, description }`
- **Class config**: each class has `startingWeapons: [{ key, preferStat }]` in `classes.json`
- **Selection** (`pickStartingWeapon`): race-specific override → else option whose `preferStat` is highest → else first listed
- **Race overrides**:
  - Dwarf + Fighter → Battleaxe
  - Dwarf + Cleric → Warhammer
  - Halfling + Fighter → Shortsword
  - Orc + Fighter → Greataxe
- **Character.weapon** auto-computed at construction; mutable later when inventory ships
- Shown on Confirm step Equipment block + HUD ⚔ indicator with description tooltip

### 28.4 Dialogue system (implements parts of §20)

- **Engine** (`src/engine/dialogue.ts`): pure state machine over `Dialogue { id, start, nodes }` where each `DialogueNode` has `speaker + text + (choices | next)`
- **Special speakers**: `narrator` (no portrait), `player` (shows character name)
- **Expressions**: `neutral | happy | sad | angry | shocked | thoughtful` — v0 renders as text label over placeholder portrait; real anime art later
- **Runtime state**: `{ dialogueId, currentNodeId, history[] }` in `useDialogueStore`
- **UI** (`src/ui/Dialogue/DialogueScene`): speaker portrait (large) + player portrait (small, dim) + text box + choices
- **Data**: NPCs in `src/data/npcs.json`, dialogues in `src/data/dialogues/*.json`, registered in `src/engine/dialogues.ts`
- First test dialogue: `guild-greeting` (Brenna at Adventurers' Guild, branching on 3 player responses)

### 28.5 Wizard flow details (extends §5.1)

- **7 steps**: Difficulty → Name → Race → Class → Stats → Portrait → Confirm
- **StatLegend** expandable info panel on Race + Stats steps — 6-card grid explaining what each stat increases
- **Stats step**: auto-rolls on entry (4d6-drop-lowest × 6), per-stat dropdowns for reassignment, racial bonus + final + modifier columns, live derived stats
- **Half-Elf**: inline picker for 2 stats (excluding CHA) for +1 each; `Next` gated until selection complete
- **Dragonborn**: inline element picker (fire/cold/lightning/acid/poison); `Next` gated until picked
- **Confirm**: Stats / Vitals / Equipment / Abilities blocks; Abilities spans full width (grid row 2)

### 28.6 In-game HUD (v0 placeholder)

- Top strip, two blocks:
  - **Left**: character name + `Lvl {n} {Race} {Class}` + `⚠ HC` when hardcore
  - **Right**: `HP a/b`, `MP a/b` (if caster), `XP`, `⚔ WeaponName` (tooltip = description)
- Center area: welcome text (Souls-y) + action buttons (Speak with Brenna, Turn back)
- Currently shows over a placeholder Phaser scene with 32px grid + "PHASER CANVAS ALIVE" label

### 28.7 Placeholder portrait strategy

- Circle with speaker's first initial; bg+fg colors from race/NPC palette
- **Player** palette: 6 pre-set color variants selectable at creation (Step 5)
- **NPCs**: `portraitColor` + `accentColor` in `npcs.json`
- Real anime-art pipeline (per §20.3/20.4) supersedes this when ready

### 28.8 File structure additions (extends §23)

```
src/data/
  weapons.json          (starting weapons)
  npcs.json             (NPC records)
  dialogues/
    guild-greeting.json
src/engine/
  weapons.ts            (pickStartingWeapon + types)
  npcs.ts               (NPC lookup)
  dialogue.ts           (state machine)
  dialogues.ts          (dialogue registry)
src/state/
  dialogueStore.ts
src/ui/
  Dialogue/
    DialogueScene.tsx
    DialogueScene.css
    SpeakerPortrait.tsx
  CharacterCreation/
    StatLegend.tsx
```

### 28.9 Test coverage (current)

- **116 tests** across 5 files (dice, stats, character, weapons, dialogue)
- Engine modules are 100% deterministic; state mutations tested explicitly; data integrity tests verify all races/classes/weapons load and their keys resolve

### 28.10 Milestones completed

- **M1** Project setup — Vite + TS + Phaser 4 + React overlay pattern
- **M2** Rules engine — dice, stats, race, classes, character, XP table to lvl 20
- **M4** Character creation — full 7-step wizard, engine handoff, in-game overlay
- **M5 (chunk 1)** Dialogue system — engine + store + UI + placeholder portraits + test dialogue

### 28.11 Deviations from spec (accepted)

- **M3** (main menu scene) folded into M4 (the wizard IS the main menu wiring)
- **Aethermoor** retained as placeholder world name (flagged for rename pre-lore — see §25)
- **Phaser 4** instead of Phaser 3 (latest; required namespace imports, no breaking impact)
- **Vite 8 / React 19 / TypeScript 6** (latest releases; forces `import * as Phaser from 'phaser'` syntax)

---

**End of spec v0.3.** Ad-hoc deviations without documenting them will lead to drift. When you change a locked-in decision from §28, replace the bullet and add a dated note.
