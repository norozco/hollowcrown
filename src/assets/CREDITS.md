# Asset Credits — Hollowcrown

External and AI-generated assets used in the project, with provenance and license.

## Portraits (AI-generated)

Generated via [Pollinations.ai](https://pollinations.ai) using its Flux backend (`model=flux`). Pollinations is a free, no-auth wrapper around community-donated GPU time. No watermark embedded (`nologo=true`), but attribution kept here as a courtesy and so future maintainers know provenance. Prompts and seeds are locked in `STYLE_GUIDE.md` §7 — see that file to reproduce or extend.

| NPC | Files | Seed | Locked in |
|---|---|---|---|
| Brenna | `portraits/brenna/{neutral,thoughtful,sad,angry}.png` | 7194 | STYLE_GUIDE §7.6 |

### Status: placeholder-grade

Current portraits are AI-generated v0 placeholders. Known limitations:
- Painterly background baked in (no alpha cutout) — accepted for v0 per STYLE_GUIDE §7.8
- Brenna's age reads ~late-30s rather than spec'd mid-40s — known Flux-at-fixed-seed limitation, accepted for v0
- Brow scar from CHARACTER_SPEC doesn't render cleanly at 512×768 — accepted

These may be replaced by commissioned art in v1.

## Pixel art (procedural, v0)

All tileset and character sprite PNGs are procedurally generated via Node.js scripts in `tools/`. No external assets used — all pixel art is original, drawn pixel-by-pixel in code.

| Asset | Files | Generator | Notes |
|---|---|---|---|
| Tileset | `tiles/tileset.png` (36 tiles × 32×32) | `tools/generate-tileset.mjs` | Ground, walls, doors, furniture, interior architecture |
| Trees | `tiles/trees.png` (4 variants × 48×64) | `tools/generate-trees.mjs` | Oak, pine, dead tree, stump |
| Character sprites | `sprites/{race}.png` (10 races × 8 frames × 32×48) | `tools/generate-sprites.mjs` | Fighter class, 4-direction idle+walk |

### Status: placeholder-grade

These are v0 procedural sprites generated from the same drawing logic as the runtime `generateTiles.ts` / `generateSprites.ts`. They exist as static PNGs so they can be hand-edited, version-controlled, and eventually replaced by a human pixel artist. The generator scripts are reproducible — re-run to regenerate.

## Audio

*(none yet)*
