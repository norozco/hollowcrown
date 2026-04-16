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

## Pixel art

*(none yet — will be added when the v0 art pass 2 tileset/sprites land)*

## Audio

*(none yet)*
