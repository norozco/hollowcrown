# Style Guide — Hollowcrown

> The artist's rulebook. Append-only at the section level — if you need to change a binding rule, write a new section and flag the change in `ARTIST_BRIEF.md` → "Requests to game-dev" for reconciliation.

## 1. Dual art identity (binding)

Two distinct visual layers that deliberately don't blend. Like Persona 5, Octopath Traveler, Triangle Strategy — gameplay is one style, conversation is another. The tonal gap is a feature, not a bug.

| Layer | Style | When shown |
|---|---|---|
| **Gameplay** (world, combat, UI) | Pixel art, 32×32 base tile, warm earth palette | Any Phaser scene (Town, Greenhollow, Dungeon, Combat) |
| **Dialogue portraits** | Realistic anime, detailed, expressive | Anytime an NPC speaks via `DialogueScene` |
| **Cutscene CGs** | Anime-style full illustrations, moodier | Boss reveals, act transitions, story beats |
| **Codex / lore art** | Painterly / sketch — softer register | In-game codex entries (later milestone) |

## 2. Tone (binding)

Souls-inspired. Every visual decision leans toward:

- **Weathered** — nothing looks new. Iron is scratched, cloth is worn, paint is chipped.
- **Reserved** — characters don't emote extravagantly. A raised eyebrow is more than a shout.
- **Melancholic** — the world has lost something; it shows in posture, lighting, composition.
- **Dignified** — poverty and age, never slapstick or cartoon. Nothing googly-eyed.
- **Ambiguous** — favor reading "knowing something we don't" over "cheerfully posed."

**Explicit no's:**
- No anime-moe stylization (sparkle-eyes, blush overload, tiny noses), no cutesy-chibi
- No modern-casual outfits (hoodies, sneakers)
- No bright primary colors outside deliberate accents
- No exposed game mechanics in any visual label or sign (no floating numbers, no "HP: 20" tags — these belong to the HUD layer)

## 3. Palette

### Gameplay (pixel art)

Warm, earthy, restrained. Based on the existing CSS palette the React UI already uses.

| Role | Hex | Where |
|---|---|---|
| Deepest shadow | `#0a0606` | background base |
| Wood dark | `#1a0e08` | borders, strokes |
| Wood med | `#3a2818` | building trim |
| Wood warm | `#5a3a1a` | building bodies |
| Amber accent | `#d4a968` | highlights, NPC accents |
| Amber bright | `#f4d488` | key NPC features, selected state |
| Grass dark | `#1a2418` | Ashenvale ground |
| Forest dark | `#0e1a10` | Greenhollow ground |
| Foliage | `#1a3018` | trees |
| Foliage core | `#0e2010` | tree shadows |
| Path worn | `#3a2f1e` | dirt paths |

### Portraits (anime)

Richer, more saturated, but never neon. The contrast is intentional — portraits should feel like a photograph layered over the world, not part of the terrain.

- Skin tones: realistic range, warm mid-values
- Hair: desaturated blacks, browns, whites; accent colors (silver, auburn) are fine but avoid candy pinks/blues
- Clothing: natural fibers — wool, linen, leather, metal. Bright jewel tones only as single accents (a ring, a sash).
- Backgrounds: blurred / painterly, in tones that echo the character's personality. Don't try to match the specific gameplay scene.

## 4. Sizing & technical specs

### Pixel-art gameplay

| Asset | Pixel size | Notes |
|---|---|---|
| Ground tile | 32×32 | Tile-friendly (seamless on edges) |
| Building wall segment | 32×32 or 32×64 | Compose walls from vertical segments |
| Doorway | 32×64 | Single sprite for door+frame |
| Character sprite | 32×48 | Taller than wide — room for hat/hair |
| Tree | 48×64 | Canopy extends above, trunk at bottom |
| Small object (barrel, sign, rock) | 32×32 | |
| Monster sprite | 32×48 or 48×48 | Bigger for bosses |

Renderer is `pixelArt: true` (nearest-neighbor scaling). Keep lines crisp; no sub-pixel detail.

### Anime dialogue portraits

| Aspect | Value |
|---|---|
| Canvas | 512×768 (portrait orientation) |
| Transparency | PNG with alpha — subject isolated, no hard rectangle background |
| Composition | Head + upper torso framed; subject's eyeline roughly at 1/3 from the top |
| Expressions per major NPC | 4–6 variants (see §5) |
| File naming | `src/assets/portraits/<npc-key>/<expression>.png`<br>e.g. `portraits/brenna/thoughtful.png` |

### Cutscene CGs

| Aspect | Value |
|---|---|
| Canvas | 1280×720 (landscape, matches game viewport) |
| Style | Anime illustration, wider shot than portraits, more environment |
| Use case | Boss intros, major reveals, act transitions — not every scene |

## 5. Expression system

Every speaking NPC should have AT LEAST these 4 expressions. More where the character's arc demands it.

| Expression key | Use | Visual cue |
|---|---|---|
| `neutral` | Baseline, listening, narrating facts | Steady eyes, mouth closed/slight set |
| `thoughtful` | Considering, recalling, guarded | Slight head tilt, eyes down or to the side, mouth closed |
| `sad` | Grief, resignation, bad news | Lowered eyes, softer mouth, slightly downturned |
| `angry` | Sharp correction, confrontation | Narrower eyes, jaw set, direct gaze |
| `happy` (opt) | Warmth, welcome, mirth | Subtle — upturned mouth, brighter eyes. Never toothy-grin. |
| `shocked` (opt) | Sudden reveal, alarm | Widened eyes, slight mouth open, body language leaning back |

Match these keys exactly — they correspond to the `expression` field in the dialogue node JSON. The game falls back to `neutral` if a file is missing.

## 6. Character-specific art direction

### Brenna (Guildmaster)
- Human, hard-featured, mid-40s to late-50s
- Practical clothing: leather jerkin over linen shirt, metal-bead necklace, no flourishes
- Greying hair pulled tight; scars acceptable
- Expressions: neutral, thoughtful (her default), angry (when pushed), sad (when speaking about the missing)
- Vibe: a person who has filled out more death certificates than she planned to

### Tomas (Innkeeper)
- Human, slim, late 30s
- Apron over a plain shirt, clean cloth on one shoulder
- Polite face — a professional's mask that doesn't quite reach the eyes
- Expressions: neutral, sad (the dominant mood when speaking of guests who didn't return), thoughtful, happy (warm but subdued — the kind you'd show a returning regular)

### Vira (Merchant)
- Human, early 40s
- Practical dark clothing with one bright accent (a ribbon, a brooch) — she notices detail on others because she trades in it
- Watchful eyes; hands always near the counter
- Expressions: neutral, thoughtful (default — always evaluating), sad (when speaking of the merchants who didn't walk back), angry (rare — when someone wastes her time)

### Orric (Forester of Greenhollow)
- Human, late 60s
- Weathered skin, grey beard, axe never far from him
- Simple forester's clothing — oiled leather, a woolen cloak in cold weather
- Expressions: neutral, sad (when speaking of the woods going quiet), thoughtful (his default), warning (between neutral and angry — when cautioning a stranger)

## 7. AI-generation pipeline (current approach)

v0 portraits are AI-generated; cleanups and final art land later when budget allows a human artist.

### Tooling
- Use whatever model produces consistent results for your pipeline (Flux, SDXL, Midjourney — document what you picked in the Status log)
- **Seed per character** — lock a random seed so all of a character's expression images share underlying facial structure
- **Same style prompt prefix** for every portrait in the game, adjusted only for character-specific details

### Prompt template (draft — refine and document what actually works)

```
<style prefix>: detailed anime illustration, muted painterly backdrop,
soft directional light from upper left, portrait composition, head and
upper torso, Souls-inspired dark fantasy, weathered textures, restrained
expression, no game UI, no text, 512x768

<character spec>: <name> — <race>, <age>, <build>, <hair>, <clothing>,
<defining feature>

<expression spec>: <expression word>, <specific facial cue>
```

### Consistency rules

- Keep the background painterly and non-specific so the same character's portraits work in any scene
- Eye color, hair color, jawline, scars must be identical across expression variants — if not, regenerate
- Avoid overlapping shoulders cut off at the exact same pixel — slight variation is natural, dramatic variation is not

### Post-processing

- Remove stray artifacts / text
- Center-align on the canvas; keep subject eye-line at ~1/3 from top
- Preserve transparency — if the model gives a solid background, isolate the subject

## 8. Placeholder → real art migration plan

The game currently renders placeholder portraits (colored circle + initial) via `SpeakerPortrait.tsx`. When real art lands:

1. Put the PNG at `src/assets/portraits/<npc-key>/<expression>.png`
2. Add a `portraits` field to the NPC record in `src/data/npcs.json`:
   ```json
   "brenna": {
     ...existing fields...,
     "portraits": {
       "neutral": "portraits/brenna/neutral.png",
       "thoughtful": "portraits/brenna/thoughtful.png",
       "sad": "portraits/brenna/sad.png",
       "angry": "portraits/brenna/angry.png"
     }
   }
   ```
3. Write a request in `ARTIST_BRIEF.md` → "Requests to game-dev" asking for the `SpeakerPortrait` rendering upgrade to use PNGs when present, fall back to placeholder otherwise

The fallback is important — partial sets should still work (e.g. only Brenna has real art so far).

## 9. Where to get pixel art (v0)

Free / CC0 sources suitable for placeholder or even production:
- **kenney.nl** — "1-bit pack", "roguelike/RPG pack", "medieval RPG pack" are all solid starting points
- **itch.io** — search "CC0 RPG pixel art", "32x32 tileset"
- **OpenGameArt.org** — deeper library but licensing varies; read per-asset

Document any external asset used with its license and attribution in a new `src/assets/CREDITS.md` (create if missing).
