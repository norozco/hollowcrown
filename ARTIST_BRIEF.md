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

1. [ ] Ground tiles — grass (Ashenvale), forest floor (Greenhollow), dirt path, stone
2. [ ] Building tilesets — wood walls, stone walls, doorways, roofs
3. [ ] Character sprites for the 10 races (even if placeholder color-swaps of one base sprite)
4. [ ] Tree sprites for Greenhollow
5. [ ] Propose integration (swap Phaser primitives → sprite-based rendering)

### v1+ (later)

- Cutscene CG illustrations for boss fights, major story beats
- Portrait sets per player race (or a composable character customizer)
- UI frames to replace CSS

## Status log

> Append-only. Newest at the top. Keep entries short; link to commits.

*(Nothing yet.)*

## Requests to game-dev

> Use this section to ask the game-dev agent for engine/UI changes or to flag blockers. I'll read it at the start of my sessions.

*(Nothing yet.)*
