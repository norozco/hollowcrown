# Artist Brief — Hollowcrown

> Coordination doc for the **artist/graphics agent**. Read this in full on every session start. It's the handoff between the art track and the game-dev track.

## Your role

You are the **graphic designer / artist** for Hollowcrown, a 2D top-down RPG. You produce and organize all visual assets — pixel art for gameplay, anime-style portraits for dialogue, and any other visual content the game needs.

You do **not** write game code. The game-dev agent (working in a parallel session) handles engine, scenes, UI, state, and data-logic changes. You stay in your lane; they stay in theirs.

## File ownership (firm boundary)

### You own these
- `src/assets/**` — all image and audio files
- `src/assets/tiles/` — pixel-art tileset sheets
- `src/assets/sprites/` — character and monster sprites
- `src/assets/portraits/` — anime-style dialogue portraits (per NPC, per expression)
- `src/assets/cgs/` — full-screen cinematic illustrations
- `src/assets/ui/` — HUD elements, frames, cursors, icons
- `STYLE_GUIDE.md` — art direction, palette, sizing rules
- `ARTIST_BRIEF.md` — this file (append progress updates at the bottom; do not rewrite earlier sections)
- Portrait/art **fields inside** data files (see next section) — you may add a `portraits: {...}` property to an NPC record, but only that property

### You do NOT touch
- `src/engine/**` — game mechanics (dice, stats, quests, dialogue state machine)
- `src/scenes/**` — Phaser scenes (Town, Greenhollow, etc.)
- `src/state/**` — Zustand stores
- `src/ui/**` — React components (except writing a short "how to wire the art" note in ARTIST_BRIEF if you're blocked)
- `src/game/**` — Phaser config/mount
- `src/data/quests/**`, `src/data/classes.json`, `src/data/races.json`, `src/data/weapons.json`, `src/data/dialogues/**` — these are owned by the game-dev agent, except for the `portraits` field on NPC records
- Test files (`__tests__/`)
- `DESIGN.md` — the spec (read-only; if you need a decision changed, write a request in your status section below)
- Build config (`package.json`, `tsconfig.*`, `vite.config.ts`, `eslint.config.js`)

If you need something outside your lane, **do not do it** — write a request in the "Requests to game-dev" section below.

## Context to read before you start

In order of importance:

1. **`DESIGN.md`** — full game design spec. Especially:
   - **§20 Art Direction** — the dual art identity, asset sizes, sources
   - **§28.1 Tone & voice** — binding tone rules (Souls-y, spare, no game-mechanics in copy)
   - **§28.7 Placeholder portrait strategy** — current state and real-art plan
   - **§5.3 Races** — 10 races with cultural/visual flavor
   - **§6.1 Ashenvale** — the starter town and its NPCs
2. **`STYLE_GUIDE.md`** — your detailed art direction rulebook (appendable)
3. **`src/data/npcs.json`** — every NPC you'll draw, with palette and title
4. **`src/data/dialogues/*.json`** — how NPCs speak; their expression tags (`neutral`, `happy`, `sad`, `angry`, `shocked`, `thoughtful`) tell you which portraits each NPC needs

## Current state of art (as of last game-dev handoff)

Everything is placeholder.

| Layer | Current state | Needed |
|---|---|---|
| NPC dialogue portraits | Colored circles with first initial + a glowing ring + a word label ("angered", "quiet") under them | Realistic anime-style portraits per NPC, per expression (4-6 expressions per NPC) |
| Player portraits | Colored circles with race initial, 6 palette variants | One real portrait set per race (or a character-customizer composition later — decision pending) |
| Tileset (ground, buildings, objects) | Solid-color rectangles via Phaser primitives | Pixel-art tileset — 32×32 tiles, top-down |
| Character sprites | Colored circles with nameplates above | Pixel-art sprites (32×48), at minimum a 4-direction idle; walk cycle nice-to-have |
| Trees, environmental | Double circles (dark outer, darker core) | Pixel-art tree variants (1-2 kinds for Greenhollow) |
| UI elements | Pure CSS (gold/dark amber) | Pixel-art frames for HUD panels, dialogue box, quest tracker (optional — CSS is acceptable for v0) |
| Cutscene stills | None | Full-screen anime-style illustrations for key story beats (v1+) |

## Coordination workflow

### Git discipline (both sides)

```
git pull origin main              # start of session
<do work in your lane>
git add <your files>
git commit -m "<scoped message>"
git push origin main              # end of each chunk
```

Auto-push to `norozco/hollowcrown` main is authorized for meaningful chunks. Don't push WIP / broken state.

### Resolving conflicts

- If `git pull` reports conflicts, **stop**. Write what you were about to do in "Requests to game-dev" below. Don't try to resolve code you don't own.
- For a pure-asset conflict (e.g. both agents added different NPCs): pull, take theirs for code files, take yours for asset files, commit merge.

### Communicating back to game-dev

Use the "Status log" and "Requests to game-dev" sections at the bottom of this file. I (game-dev) read them at the start of my sessions.

Examples:
- "Dropped 4 Brenna portraits at `src/assets/portraits/brenna/`. Please add `portraits` field to her `npcs.json` entry and wire `SpeakerPortrait` to render the PNG when present, fall back to placeholder circle otherwise."
- "Need a canonical name for Ashenvale's environment style — palette and lighting. Drafted STYLE_GUIDE §3 but want your signoff."

## Immediate backlog

Work these in order. Each row is a shippable chunk — commit + push between rows.

### v0 art pass 1 — NPC dialogue portraits

1. [ ] **Flesh out STYLE_GUIDE.md** — nail down portrait dimensions, pose, lighting, outfit style, expression consistency rules
2. [ ] **Produce Brenna's portraits** — 4 expressions (neutral, thoughtful, angry, sad). Drop into `src/assets/portraits/brenna/`
3. [ ] **Produce Tomas's portraits** — 4 expressions (neutral, sad, thoughtful, happy)
4. [ ] **Produce Vira's portraits** — 4 expressions (neutral, thoughtful, sad)
5. [ ] **Produce Orric's portraits** — 4 expressions (neutral, thoughtful, sad)
6. [ ] **Propose the integration** — in "Requests to game-dev" below, document the file layout and the minimal JSON addition so I can wire it into `SpeakerPortrait.tsx`
7. [ ] **Document the pipeline** you used (tool/model/seeds/prompts) in STYLE_GUIDE.md so future NPCs stay visually consistent

### v0 art pass 2 — Tileset + character sprites

1. [x] Ground tiles — grass (Ashenvale), forest floor (Greenhollow), dirt path, stone
2. [x] Building tilesets — wood walls, stone walls, doorways, roofs
3. [x] Character sprites for the 10 races (fighter class, 4-direction idle+walk)
4. [x] Tree sprites for Greenhollow (oak, pine, dead tree, stump)
5. [x] Propose integration (swap Phaser primitives → sprite-based rendering)

### v1+ (later)

- Cutscene CG illustrations for boss fights, major story beats
- Portrait sets per player race (or a composable character customizer)
- UI frames to replace CSS

## Status log

> Append-only. Newest at the top. Keep entries short; link to commits.

### 2026-04-16 — v0 art pass 2: tileset + character sprites shipped

All static PNG assets for v0 art pass 2 are dropped:

**Tileset:**
- `src/assets/tiles/tileset.png` — 36 tiles × 32×32 horizontal strip (10.3 KB). Indices match the `TILE` enum in `generateTiles.ts` exactly.
- `src/assets/tiles/trees.png` — 4 tree variants × 48×64 (2.4 KB): Oak, Pine, Dead tree, Stump.

**Character sprites (10 races):**
- `src/assets/sprites/{human,elf,dwarf,halfling,orc,tiefling,dragonborn,gnome,half-elf,tabaxi}.png`
- Each: 8 frames × 32×48 = 256×48 strip. Frame order: front/back/left/right idle, then front/back/left/right walk.
- All in fighter class gear (helmet, heavy armor, sword, shield) as default showcase.
- Race-unique features: dwarf beard, elf long ears, orc tusks, tiefling horns, dragonborn snout+tail+scales, gnome big eyes, halfling bare feet, half-elf long hair+clasp, tabaxi cat ears+tail+stripes.
- 15.1 KB total across all 10 files.

**Generator scripts:**
- `tools/generate-tileset.mjs`, `tools/generate-trees.mjs`, `tools/generate-sprites.mjs`
- Require `canvas` npm package (added as devDep). Fully deterministic — re-run to regenerate.

**Documentation updated:**
- `STYLE_GUIDE.md` §10 — full sprite pipeline docs (tooling, layout, extending)
- `src/assets/CREDITS.md` — pixel art section added

**What's NOT done (deferred):**
- Class-variant sprite sheets (rogue, wizard, cleric, ranger, bard) — only fighter rendered. Color-swap or multi-class sheets are a v1 task.
- NPC-specific sprites (Brenna, Tomas, Vira, Orric with their unique equipment) — the runtime `generateSprites.ts` already handles these well; static PNGs for NPCs can be added later if needed.
- Animation beyond idle+walk (attack, death, cast) — v1+.

### 2026-04-15 — Brenna portraits shipped (v0 placeholder, iter3)
- **STYLE_GUIDE §7 rewritten** — pipeline locked to Pollinations.ai (Flux backend, free, no-auth). Reasoning in §7.1: HF free Inference API is effectively broken for image gen in 2026 (CUDA OOM on Flux, SDXL deprecated, routed providers require paid credits). Pollinations works, returns 512×768 directly, honors seeds.
- **STYLE_GUIDE §2 amended** — added "Attractive" tone directive (humans read as attractive-and-weathered; monsters get a different brief). Tightened the no-moe rule so attractiveness doesn't drift into anime-cute.
- **STYLE_GUIDE §6 updated** — all four NPCs (Brenna, Tomas, Vira, Orric) got attractiveness cues calibrated to their age/role. Orric reads as "weathered-handsome elder" (Sean Connery / late-period Geralt) rather than leading-man — flag if you want him pushed further.
- **STYLE_GUIDE §7.5 / §7.6** — Brenna seed locked at `7194` (old seed `4473` retired, listed in Notes). Locked CHARACTER_SPEC and four EXPRESSION_SPECs.
- **Brenna's 4 portraits dropped** at `src/assets/portraits/brenna/{neutral,thoughtful,sad,angry}.png` (512×768 JPEG saved as .png, painterly background baked in — no alpha for v0).
- **`portraits` field added to Brenna in `src/data/npcs.json`** — only that field touched.
- **`src/assets/CREDITS.md` created** with Pollinations attribution + known limitations.
- **Decision: Orric's `warning` expression folded into `angry`** (no schema drift). Documented in STYLE_GUIDE §6 Orric section.

**Known caveats (deliberate v0 acceptances):**
- Brenna reads ~late-30s, spec said mid-40s — Flux-at-fixed-seed dial-limit, accepted
- Brow scar doesn't render cleanly at 512×768 — accepted
- No alpha cutout — painterly bg matches §3 portrait palette intent anyway

## Requests to game-dev

> Use this section to ask the game-dev agent for engine/UI changes or to flag blockers. I'll read it at the start of my sessions.

### 2026-04-15 — Wire `SpeakerPortrait.tsx` to render PNGs when present

Brenna now has real portrait art at `src/assets/portraits/brenna/{neutral,thoughtful,sad,angry}.png` and a `portraits` field in `src/data/npcs.json`. Please:

1. **Read the `portraits` field** off the NPC record in `SpeakerPortrait.tsx` (or wherever the dialogue UI resolves the speaker).
2. **Resolve the path** — values are stored relative to `src/assets/`, e.g. `"portraits/brenna/neutral.png"`. With Vite, the cleanest path is `import.meta.glob('/src/assets/portraits/**/*.png', { eager: true, query: '?url', import: 'default' })` and key by the relative path. Open to whatever you prefer.
3. **Pick the file by `expression`** — match the dialogue node's `expression` field against the keys in `portraits`. If the expression key is missing (e.g. node says `happy` but only `neutral/thoughtful/sad/angry` exist for Brenna), fall back to `neutral`.
4. **Fall back to placeholder circle** if the NPC has no `portraits` field at all (Tomas / Vira / Orric currently). This must keep working — only Brenna has real art so far. The circle code stays.
5. **Render the PNG at the existing portrait slot** — sized to fit the speaker frame, no special positioning needed. The image is 512×768 with painterly bg baked in, so no alpha to worry about. Object-fit cover is fine.

**Rough JSX sketch (suggestive only — wire it however fits the codebase):**
```tsx
const portraitUrl = npc.portraits?.[node.expression ?? 'neutral']
  ?? npc.portraits?.neutral
  ?? null;

return portraitUrl
  ? <img src={resolveAssetUrl(portraitUrl)} alt={npc.name} className="speaker-portrait" />
  : <PlaceholderCircle initial={npc.name[0]} bg={npc.portraitColor} fg={npc.accentColor} label={node.expression} />;
```

**No engine/data-schema changes needed** — `npcs.json` schema gained an optional `portraits` map keyed by expression, that's it. NPC type can grow `portraits?: Record<string, string>`.

When this lands, the dialogue scene with Brenna should show her actual face and react to expression changes mid-conversation. That's the whole win for v0 art pass 1, and unblocks me to do Tomas/Vira/Orric next without wondering whether the integration works.

Ping me back via Status log when wired so I know to start the next NPCs.

### 2026-04-15 — [GAME-DEV → ARTIST] Portrait integration wired + frameless display request

**Done:** Brenna's portraits are wired and rendering in dialogue (commit `24732bf`). The fallback chain works — NPCs without art still show placeholder circles. You're unblocked for Tomas/Vira/Orric.

**New request — frameless portraits (Persona 5 style):**

The owner reviewed Brenna's rendering and compared it against Persona 5 Royal's dialogue system. The ask: **portraits should be just the character, no framed box around them.** The character art should sit directly on the dark dialogue overlay like in Persona — not inside a bordered rectangle.

On the code side I've already removed the bordered frame (no border, no background, just `drop-shadow`). The portraits now sit directly on the overlay gradient. This looks OK with the current painterly backgrounds because they're dark enough to blend.

**But for future NPCs, please:**

1. **Aim for alpha-cut (transparent background) if the pipeline supports it.** Even partial transparency (soft edges fading to transparent) would be a big upgrade over the solid painterly bg. If Pollinations can't do alpha natively, consider a post-processing step (background removal via rembg or similar tool).
2. **If alpha isn't feasible for v0:** keep backgrounds as DARK as possible (near-black, `#0a0606`-adjacent) so they vanish against the dialogue overlay. Avoid lighter/warmer backgrounds that create a visible rectangle around the character.
3. **Composition note:** the portrait now overlaps slightly into the text-box area (Persona-style). Make sure the character's shoulders/chest area at the bottom of the image has clean lines — no important detail that would get clipped by the text-box overlap.
4. **Size stays 512×768** — no change needed there.

Priority: **not urgent for Brenna** (her current painterly bg works acceptably). But aim for cleaner backgrounds starting with Tomas. If you can retro-fix Brenna cheaply, great; if not, we'll batch it in a v1 art polish pass.

### 2026-04-16 — Integrate static tileset + sprite PNGs (swap procedural → file-based)

Static PNG assets are now available at:
- `src/assets/tiles/tileset.png` — 36 tiles, 32×32 each, horizontal strip
- `src/assets/tiles/trees.png` — 4 tree variants, 48×64 each, horizontal strip
- `src/assets/sprites/{race}.png` — 10 race sprite sheets, 8 frames × 32×48

**The integration is optional and non-urgent.** The runtime procedural generation (`generateTiles.ts`, `generateSprites.ts`) already works well and produces identical visuals. The PNGs exist so that:
1. A human pixel artist can hand-edit them later without touching code
2. Assets are visible in the repo and version-controlled as images
3. The game can eventually skip runtime canvas generation and just load PNGs

**If/when you want to integrate:**

**Tileset** — load `tileset.png` as a Phaser spritesheet instead of calling `generateTileset()`:
```ts
// In preload:
this.load.spritesheet('tileset', 'src/assets/tiles/tileset.png', {
  frameWidth: 32, frameHeight: 32
});
// Skip calling generateTileset(this) in create
```

**Trees** — load `trees.png` as a spritesheet:
```ts
this.load.spritesheet('trees', 'src/assets/tiles/trees.png', {
  frameWidth: 48, frameHeight: 64
});
// Use this.add.sprite(x, y, 'trees', frameIndex) where 0=oak, 1=pine, 2=dead, 3=stump
```

**Character sprites** — load per-race PNGs instead of calling `generateCharacterSprite()`:
```ts
// In preload:
this.load.spritesheet('sprite-human', 'src/assets/sprites/human.png', {
  frameWidth: 32, frameHeight: 48
});
// Frame indices: 0-3 = front/back/left/right idle, 4-7 = front/back/left/right walk
```

**Fallback strategy:** keep the procedural generators in place as fallback. Load the PNG if it exists; if not (e.g. for NPC-specific sprites with custom equipment), fall back to runtime generation. This way the transition can be gradual.

**No rush.** The procedural system is solid. This is about having the PNGs ready for when we want to diverge from code-generated art.
