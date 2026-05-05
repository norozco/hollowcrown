# Hollowcrown — Bug Audit

**Audit date:** 2026-05-01
**Tooling:** in-browser state probes (Phaser scene graph + React DOM via accessibility tree) + repo-wide source review. Live screenshots were unreliable because Phaser's WebGL canvas runs with `preserveDrawingBuffer: false`, which causes the headless screenshot tool to time out on running scenes.
**Coverage:** main menu, character creation, town overworld + interiors, all 31 registered scenes (state-probed), HUD, pause menu, options, combat panel, world map, dungeon map, save format, console.

This file is the source-of-truth issue list as of the audit. Cross-reference with `PROJECT_STATUS.md` for shipped systems and `AGENTS_LOG.md` for prior agent work.

---

## Resolution status

The audit was followed by an 8-agent parallel fix pass (2026-05-01). Result:

| ID  | Status     | Commit / note |
|-----|------------|---------------|
| A1  | ✅ Fixed   | `25880b6` HUD (player bars) + `aa6a92a` Combat (multi-enemy adds) |
| A2  | ✅ Fixed   | `7a9ffdb` WorldMap added 9 missing zones |
| A3  | ✅ Fixed   | `7a9ffdb` WorldMap hub-and-branch layout |
| A4  | ⏸ Deferred | Architecture sprite mappings — 3 prior reverts in repo history; needs interactive pixel-verification, not solo agent work |
| A5  | ✅ Fixed   | `b89d594` Tiles grass overhaul |
| B1  | ✅ Fixed   | `25880b6` cheats panel gated to `import.meta.env.DEV` (verified absent from prod bundle) |
| B2  | ✅ Fixed   | `1819a05` `applyStoredOptions` at app boot |
| B3  | ✅ Fixed   | `25880b6` weather span suppressed when icon duplicates time icon |
| B4  | ✅ Fixed   | `25880b6` body overflow lock on every modal |
| B5  | ⏸ Skipped | Phaser internal state, non-bug |
| B6  | ✅ Fixed   | `b89d594` 3 grass variants + variant pool |
| B7  | ✅ Fixed   | `fe7667c` cellHash mixes scene key |
| B8  | ✅ Fixed   | `fe7667c` density cull mixes scene key |
| B9  | ✅ Fixed   | `f7eeabd` `import.meta.hot.dispose` cleanup |
| B10 | ⏸ Deferred | Resume → Main Menu bounce — needs reliable repro |
| B11 | ✅ Fixed   | `25880b6` `new Function` eval branch removed (verified absent from prod bundle) |
| B12 | ✅ Fixed   | `9ee24bd` `normalizeSaveData` + 4 tests |
| B13 | ❌ Wrong   | Audit was incorrect — Tab/Shift+Tab is wired (`aa6a92a` commit message documents) |
| B14 | ⏸ Skipped | Multi-enemy primary panel — design choice, not a bug |
| B15 | ✅ Fixed   | `b89d594` magenta diagonal-stripe marker on unmapped tiles |
| B16 | ✅ Fixed   | `fd7dc82` deleted unused `addAmbientVignette` |
| B17 | ✅ Fixed   | `b89d594` wildflowers redistributed across variants |
| B18 | ⏸ Deferred | UUID texture leak — needs targeted profiling |
| B19 | ✅ Fixed   | PROJECT_STATUS.md row added (separate doc commit) |
| B20 | ✅ Audited | `f7eeabd` — verified no real React-side dependency to defer; comment added |
| C   | ✅ Fixed   | `f7eeabd` `preserveDrawingBuffer: import.meta.env.DEV` |

**Net:** 19 issues fixed across 9 commits, 1 audit error caught, 5 issues deferred or skipped with rationale.

---

## A. Issues the user explicitly called out

### A1. Health bars look wrong
- File: `src/ui/InGameOverlay.tsx:892-944`, `src/ui/InGameOverlay.css:113-150`
- HP, MP, STA share the same container class `ig__hp-bar` (80px wide). When a class has no MP (fighter / rogue / ranger) the MP bar disappears and the row reflows — the HUD layout shifts every time you swap class.
- Stamina fill `#4ca050` and HP-green `#40a060` are nearly identical — at 100% HP both bars look interchangeable.
- HP color steps abruptly at 50% → 25% thresholds (green → yellow → red), no gradient.
- Multi-enemy combat: `combat__extra-hp-fill` (`CombatOverlay.tsx:687-692`) has no color ramp. Add enemies always render solid even at 1% HP. Inconsistent with the primary bar.

### A2. World map missing zones
- File: `src/ui/WorldMap/WorldMap.tsx:19-38`
- `ZONES` has 18 entries; the repo has 9 more scenes that never appear on the map: **IronveilScene, BogDungeonF1/F2/F3, FrosthollowScene, FrozenHollowF1/F2/F3, ForgottenCaveScene**.

### A3. World map grid feels rigid
- Same file. Every overworld zone hard-coded to `y: 120`, dungeons stacked at `y: 210/280/350`. Reads as a perfect grid, not a branching world map.

### A4. Buildings look incoherent
- File: `src/scenes/tiles/tileMap.ts:104-176`
- Verified Kenney sprite mappings cover only ground tiles + path/water edges + floor stone. **All architecture (walls, roofs, doors, windows, columns) falls back to procedural drawing.** Procedural roofs/walls don't share Kenney's palette, so houses don't sit naturally next to Kenney trees and bushes.

### A5. Grass
- Forest base `#4a8830` + blade strokes wired this session. Two latent issues remain:
  - **B6** — every grass tile bakes the same texture once, so the field repeats visibly tile-to-tile.
  - **B17** — wildflower pixels are hard-coded (`px(c,i,12,7,'#fff8e8')` etc.), so identical flowers appear at the same offset in every cell.
- `TILE_VARIANT_POOL` (`tileMap.ts:188-201`) intentionally has no grass variants — that's why the field reads as wallpaper.

---

## B. Issues found during the audit

### B1. Cheat console exposed in production pause menu
- File: `src/ui/InGameOverlay.tsx:1123-1200`
- The "Cheats (Playtest)" panel renders unconditionally — no `import.meta.env.DEV` gate. Any player on the live deploy (`norozco.github.io/hollowcrown`) can give themselves level 20, max gear, infinite gold, beat any boss, teleport.
- Worse: the input runs `new Function('return ' + raw)()` — arbitrary JS eval against any string the player types.

### B2. Volume sliders default to 0%
- Confirmed via accessibility tree. Master / Music / SFX all `value: "0"` on a fresh playthrough.

### B3. Two ☀ symbols in the HUD
- File: `src/ui/InGameOverlay.tsx:884-885`
- One is the time-of-day icon, the other is weather. During clear daytime they both render `☀` — visually redundant.

### B4. Pause menu has page scrollbars
- The pause overlay extends past the viewport — both vertical and horizontal native scrollbars appear when it opens. Modal dialogs should set `overflow: hidden` on `body` while open.

### B5. Inactive scenes report `visible: true`
- All 31 scenes report `visible: true` even when stopped — only `active` differs. Not a render bug today (inactive scenes don't draw) but any future render-by-visibility logic will break.

### B6. Grass tile texture repeats visibly across the field
- Each grass tile is baked once into a 32×32 canvas slot, so the tuft / blade pattern is identical in every cell. Visible as a regular pattern at any 4-tile-wide horizon. Fix needs either multiple `GRASS_*` variants in the pool, or per-cell stamping (the way trees work).

### B7. Tree variant uses `cellHash(x, y)` only
- File: `src/scenes/tiles/decorationOverlays.ts:154-198`
- Same `(x, y)` always picks the same tree variant **across every scene** — a tree at column 5 row 3 of Greenhollow is identical to the same cell in Duskmere. Hash should mix in `scene.scene.key`.

### B8. Density-cull also ignores scene key
- Same file, `shouldRenderTreeHere`. Same hash → identical "55% become trees" pattern in every scene. Players can subconsciously notice the same gaps.

### B9. Phaser game instance leaks during HMR
- Phaser banner logged 12× in a single dev session. Cleanup at `PhaserGame.tsx:342` looks correct on paper, but Vite hot-updates appear to spin up a new game without destroying the old. Memory + canvas count creeps up.

### B10. Resume button bounced to Main Menu
- Reproduced once via accessibility-tree click. Likely a state desync between `useUIStore.screen` and the menu's local `menuOpen` flag.

### B11. Cheat input parses unknown commands as JS eval
- File: `src/ui/InGameOverlay.tsx:1139-1142`
- Even gated to dev, the fallback `new Function('return ' + raw)()` is risky — typos can fire `wipe()` or other irreversible commands.

### B12. Save format has 14+ optional-for-compat fields
- File: `src/engine/saveLoad.ts`
- Any field read with `.length` or `.get` on an old v1 save crashes. Some places use nullish coalescing but the discipline isn't uniform.

### B13. Combat "Tab cycles target" hint shows but key isn't wired
- File: `src/ui/Combat/CombatOverlay.tsx:368-370`
- PROJECT_STATUS.md confirms multi-target keybind is deferred. The hint promises a control that doesn't work.

### B14. Multi-enemy fights bias all UI focus to the first enemy
- File: `src/ui/Combat/CombatOverlay.tsx:651-655`
- Primary enemy gets the full panel (portrait, slash overlay, floating numbers); adds get a "compact" panel. Comment says "camera/visuals focus on the boss" — but for non-boss packs (wolf trios, skeleton pairs) there is no boss, so the choice of "primary" is arbitrary.

### B15. Sprite-load failure produces solid color blocks
- File: `src/scenes/tiles/generateTiles.ts:167-203` (`drawKenneyFallbacks`)
- Each unmapped Kenney tile gets a single solid biome-color fill. If the sheet fails to load mid-game, every tree, fence, lamp, sign etc. becomes a green block — no "broken sprite" fallback that visibly signals the failure.

### B16. Vignette function still lives despite being unhooked
- File: `src/scenes/pseudo3d.ts:80`
- `addAmbientVignette` still defined even though the call was removed in this session's vignette fix. Dead code; safe to delete.

### B17. Fixed-position wildflowers repeat exactly across tiles
- File: `src/scenes/tiles/generateTiles.ts:268, 303`
- Wildflower pixel positions are hard-coded. Across 100 grass tiles, the same flower sits at the same tile-relative spot — visible as a regular grid of pink/white dots in any large field.

### B18. UUID texture keys leak in TownScene
- State probe found 12+ texture keys like `ba71e1c1-...` retained on TownScene's texture cache. Likely procedural canvas textures not being garbage-collected on scene reset.

### B19. PROJECT_STATUS.md is stale on tile re-enable
- Doc claims "4th re-enable" with verified ground tiles only. After this session's grass-base override, the doc no longer reflects the live state of `generateTiles.ts`.

### B20. PlaceholderScene → TownScene transition risks UI desync
- File: `src/game/PhaserGame.tsx:355-358`
- Hard-stops PlaceholderScene before starting TownScene. Anything React-side waiting on a PlaceholderScene event at the swap moment never resolves.

---

## C. Coverage gaps

Visual issues these systems may have were **not** verifiable through this audit because screenshots time out on running scenes:

- Dungeon zones (Mossbarrow Depths, Drowned Sanctum, Ashen Tower, Throne Beneath, Frozen Hollow, etc.) — building / tile / lighting coherence
- Live combat — HP-drain animation, particle effects, skill flashes, screen shake
- Multi-enemy fight UI in motion (B13/B14 confirmation)
- Day / night ambient tint transitions
- Weather particle systems (rain, snow, ash) per zone

To unblock these: temporarily flip `preserveDrawingBuffer: true` in `src/game/config.ts` (or wire a canvas → file capture pipeline) and re-run the audit on each running scene.

---

## D. Already addressed in the session that produced this audit

- Vignette boxes — call removed from `BaseWorldScene`, time-of-day tint preserved.
- Grass base color — overridden post-Kenney with `#4a8830` (medium forest) instead of the bright Kenney emerald.
- Grass texture — replaced random-pixel scatter with deterministic blade strokes (1×2 vertical), plus authored tuft clusters and sparse wildflowers.
