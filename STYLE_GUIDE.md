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
- **Attractive** — humans (and humanoids) read as attractive: striking, magnetic, compositionally appealing. This coexists with weathered/reserved — think Witcher 3 Yennefer, Bloodborne's Lady Maria, Disco Elysium's Joyce, Geralt at 60. *Beautiful and worn*, not one or the other. **Monsters and non-humanoids** get a different brief: visually arresting, often unsettling, sometimes intentionally erotic-grotesque (Bloodborne, Berserk, Souls bestiary) — never cute, never neutered.

**Explicit no's:**
- No anime-moe stylization (sparkle-eyes, blush overload, tiny noses), no cutesy-chibi — attractiveness here is the grounded, lived-in kind, not the doe-eyed kind
- No modern-casual outfits (hoodies, sneakers)
- No bright primary colors outside deliberate accents
- No exposed game mechanics in any visual label or sign (no floating numbers, no "HP: 20" tags — these belong to the HUD layer)
- No "ugly NPC" shorthand for moral characterization — a character's worth is in their writing, not their looks. Even villains can be beautiful; even saints can be plain.

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
- Human, **mid-40s** (locked — older drafts read 50s)
- **Striking and attractive in a hard-honed way** — high cheekbones, sharp clear eyes, full mouth, athletic build from years of swordwork; first streaks of grey through dark brown hair, not yet iron
- Practical clothing: fitted leather jerkin over linen shirt opened at the collar, small iron bead necklace, no flourishes
- Hair pulled back tight, loose strands at the temple; thin pale scar through the left brow that adds to her presence rather than detracting
- Expressions: neutral, thoughtful (her default), angry (when pushed — cold fury, never shouting), sad (when speaking about the missing)
- Vibe: a person who has filled out more death certificates than she planned to — and who you'd still follow into a cave

### Tomas (Innkeeper)
- Human, slim and **handsome in a tired way**, late 30s
- Fine bone structure, dark hair, the kind of face that smiles politely without the eyes joining in; clean-shaven or close to it
- Apron over a plain shirt, clean cloth on one shoulder, sleeves rolled to the elbow
- Polite face — a professional's mask
- Expressions: neutral, sad (the dominant mood when speaking of guests who didn't return), thoughtful, happy (warm but subdued — the kind you'd show a returning regular)

### Vira (Merchant)
- Human, early 40s, **striking and watchful** — the kind of beauty that notices you noticing it and prices it accordingly
- Dark hair, sharp eyes, one strong feature (a defined brow line, a small mole near the lip — pick once and lock); unhurried movements
- Practical dark clothing with one bright accent (a ribbon, a brooch) — she notices detail on others because she trades in it
- Hands always near the counter
- Expressions: neutral, thoughtful (default — always evaluating), sad (when speaking of the merchants who didn't walk back), angry (rare — when someone wastes her time)

### Orric (Forester of Greenhollow)
- Human, late 60s, **weathered-handsome elder** — Sean Connery / late-period Geralt — strong features that age has sharpened rather than diminished, clear eyes that still see further than most
- Grey beard kept short and neat, lines around the eyes from decades of looking at distance, broad shoulders that haven't softened
- Simple forester's clothing — oiled leather, a woolen cloak in cold weather, axe never far from him
- Expressions: neutral, sad (when speaking of the woods going quiet), thoughtful (his default), `angry` (used as the "warning" cue — the look he gives a stranger about to do something stupid; cold and quiet, not loud)

## 7. AI-generation pipeline (locked for v0)

v0 portraits are AI-generated. Cleanups and final canon portraits land later when budget allows a human artist or a gated-model run.

### 7.1 Why Pollinations, not Hugging Face

Evaluated 2026-04-15. Hugging Face's free Inference API (`hf-inference` provider) returns CUDA OOM on Flux models due to shared-GPU saturation; SDXL base is deprecated; Animagine-XL is unsupported. Routed providers (fal-ai, Replicate, Together) require prepaid credits — free-tier users have no routable image endpoint. Pollinations.ai wraps a Flux backend, requires no auth, serves 512×768 directly, and honors seed parameters. Until the free HF situation changes or we buy credits, **Pollinations is the pipeline.**

### 7.2 Tooling (locked)

- **Service**: `image.pollinations.ai` (free, unauthenticated, Flux backend)
- **Endpoint**: `GET https://image.pollinations.ai/prompt/<url-encoded-prompt>`
- **Required params**: `model=flux`, `width=512`, `height=768`, `seed=<per-character>`, `nologo=true`, `private=true`, `enhance=false`
- **Output**: JPEG, 512×768, baked-in background (no alpha). We accept the painterly background for v0 (matches §3 portrait palette guidance — backgrounds should echo character personality anyway). Alpha-cut revisit deferred to v1.
- **Rate limits**: effectively none for our volume (<100 portraits). Calls complete in ~2–5s on a warm cache.

### 7.3 Curl recipe

```bash
# Template — substitute $PROMPT, $SEED, $OUTFILE.
# $PROMPT must be URL-encoded (use jq -sRr @uri or printf '%s' "$p" | jq -sRr @uri).
curl -s -o "$OUTFILE" \
  "https://image.pollinations.ai/prompt/${PROMPT_ENCODED}?model=flux&width=512&height=768&seed=${SEED}&nologo=true&private=true&enhance=false"
```

### 7.4 Prompt structure (locked)

Every portrait prompt is assembled as three concatenated blocks, comma-separated, in this order:

```
<STYLE_PREFIX>, <CHARACTER_SPEC>, <EXPRESSION_SPEC>
```

#### STYLE_PREFIX (identical for every NPC portrait)

```
detailed anime illustration meets painterly dark fantasy, muted earth-tone backdrop, soft directional light from upper left, portrait composition showing head and upper torso, subject eyes roughly one third from top of frame, Souls-inspired weathered textures, restrained expression, worn natural-fiber clothing, no text, no UI, no watermark, no borders, no logo
```

Do **not** modify this string once locked. If you think it needs to change, write a new STYLE_PREFIX_V2 and document the switch in the Status log — don't edit in place.

#### CHARACTER_SPEC (one locked paragraph per NPC)

The character spec is written once per NPC and reused across every expression. Any drift in this string means facial features, hair, or clothing will drift between expressions — regenerate if it happens. Character specs live in §6 of this file alongside the art-direction notes for that character. The specs in §6 are the authoritative source; this section just names the structure:

```
<Name>, <Title>: <race>, <age descriptor>, <build>, <face shape / defining feature>, <hair color and style>, <scar or mark if any>, <clothing layer 1>, <clothing layer 2>, <accessory>, <lighting motif>
```

#### EXPRESSION_SPEC (per-expression, short)

One prose sentence describing the face cue — no emoji words, no exclamation, no "very" or "extremely" modifiers. See §7.6 for Brenna's locked four.

### 7.5 Seed discipline

One seed per NPC. All four expressions for that NPC use the same seed so underlying facial structure, hair parting, shoulder line stay constant. Seeds are documented here to prevent accidental reuse across characters (which would give two NPCs the same face):

| NPC | Seed | Model | Notes |
|---|---|---|---|
| Brenna | `7194` | flux | Locked 2026-04-15. Old seed `4473` retired (face read 50s/gaunt; replaced after attractiveness directive added in §2). |
| Tomas | `8211` | flux | |
| Vira | `1629` | flux | |
| Orric | `5902` | flux | |

When adding a new NPC, pick any unused four-digit seed and add a row. Retired seeds stay listed in the Notes column so we don't accidentally reuse them.

### 7.6 Brenna — locked prompts (reference implementation)

**CHARACTER_SPEC:**
```
Brenna, Guildmaster of Ashenvale: human woman in her mid-forties (undeniably mid-forties not younger), athletic and toned build from years of swordwork, striking and compelling features with high cheekbones, full mouth, clear pale grey-green eyes, subtle crow's feet at the outer corners of the eyes, soft laugh lines bracketing the mouth, a thin vertical pale scar clearly bisecting the left eyebrow, dark brown hair with several visible silver strands woven through near the temples pulled back tight with loose strands escaping, fitted dark leather jerkin laced over a linen shirt unbuttoned at the collar, small iron bead necklace resting at the hollow of the throat, clean unblemished warm skin except for the brow scar, amber firelight catching on scratched leather and brass buckles, the lived-in dignity of a woman who has led and survived
```

**EXPRESSION_SPEC by key:**

| Expression | Spec |
|---|---|
| `neutral` | `expression: steady direct gaze, mouth set neither open nor smiling, composed, listening` |
| `thoughtful` | `expression: slight head tilt, eyes cast down and to the left as if reading a ledger, mouth closed, guarded` |
| `sad` | `expression: eyes downcast and visibly glassy with held-back tears, eyelids slightly heavy, mouth softened with corners pulled gently downward, brow lifted in the middle in a small grief furrow, posture a fraction bowed, the look of receiving bad news` |
| `angry` | `expression: brow tightly furrowed inward and downward, eyes hard and narrowed beneath the brow, nostrils slightly flared, jaw clenched with visible muscle, mouth a flat tight line, direct unflinching gaze, the cold fury of a leader who has had enough, no teeth bared` |

### 7.7 Tomas — locked prompts

**CHARACTER_SPEC:**
```
Tomas, Innkeeper of the Whispering Hollow: human man in his late thirties, slim and lean build, handsome in a tired way with fine bone structure, warm brown eyes with shadows beneath them, dark hair kept neat and combed back, clean-shaven with a faint five o'clock shadow along the jaw, plain off-white shirt with sleeves rolled to the elbow under a simple apron, a clean cloth draped over one shoulder, the kind of polite composed face that smiles without the eyes joining in, warm lamplight from below casting soft upward shadows
```

**EXPRESSION_SPEC by key:**

| Expression | Spec |
|---|---|
| `neutral` | `expression: polite composed half-smile, eyes steady and attentive, the professional mask of a man who listens for a living` |
| `thoughtful` | `expression: gaze drifting to one side as if remembering a face, mouth closed, brow slightly drawn, the look of a man counting empty rooms` |
| `sad` | `expression: eyes lowered and softened, mouth loosened from its polite set, the professional mask slipping to show genuine grief underneath, shoulders slightly rounded` |
| `happy` | `expression: a real smile reaching the eyes for once, warmth breaking through the professional composure, subtle crinkle at the corners of the eyes, the look reserved for a returning regular` |

### 7.8 Vira — locked prompts

**CHARACTER_SPEC:**
```
Vira, Merchant of Ashenvale: human woman in her early forties, striking and watchful with sharp dark eyes and a defined brow line, dark hair worn loose past the shoulders with a slight wave, a small beauty mark near the left corner of the mouth, unhurried and composed, practical dark clothing — a fitted dark wool vest over a deep burgundy blouse, one bright accent (a small silver brooch at the collar), hands always suggesting proximity to the counter, warm side-light from a shuttered window catching on the brooch and hair, the beauty of someone who notices you noticing it and prices it accordingly
```

**EXPRESSION_SPEC by key:**

| Expression | Spec |
|---|---|
| `neutral` | `expression: steady measuring gaze, mouth set in a small closed-lip almost-smile, composed, the look of someone who has already decided what you can afford` |
| `thoughtful` | `expression: eyes narrowed slightly in evaluation, head tilted a fraction, lips pressed together as if weighing a price, the default mode of a woman who trades in detail` |
| `sad` | `expression: gaze lowered and to the side, the sharp evaluating look gone soft, mouth loosened, a rare unguarded moment showing the weight of merchants who did not walk back` |
| `angry` | `expression: eyes hard and direct, jaw tightened, one brow raised in cold displeasure, the look of a woman whose time you have just wasted, restrained but unmistakable` |

### 7.9 Orric — locked prompts

**CHARACTER_SPEC:**
```
Orric, Forester of Greenhollow: human man in his late sixties, weathered-handsome elder with strong features that age has sharpened rather than diminished, clear pale blue eyes that still see further than most, short neat grey beard with streaks of white, deep lines around the eyes from decades of watching the tree-line, broad shoulders that have not softened, simple oiled leather vest over a heavy linen shirt, a woolen half-cloak draped over one shoulder, an axe handle just visible resting against him, diffused green-grey forest light filtering through canopy, the imposing quiet dignity of a man who has outlived the woods he tends
```

**EXPRESSION_SPEC by key:**

| Expression | Spec |
|---|---|
| `neutral` | `expression: steady calm gaze, mouth set beneath the beard, patient, the look of a man who has been sitting on this porch longer than you have been alive` |
| `thoughtful` | `expression: eyes cast slightly upward and to the distance as if listening to the woods, brow drawn gently, mouth hidden in the beard, remembering something the trees told him` |
| `sad` | `expression: eyes lowered, the deep lines around them deepening further, mouth soft beneath the beard, shoulders heavy, the look of a man mourning something that used to sing and has gone quiet` |
| `angry` | `expression: eyes hard and narrowed beneath heavy brows, jaw set beneath the beard, direct unflinching gaze, the cold quiet warning of a man who has seen what happens to people who do not listen, no raised voice just weight` |

### 7.10 Consistency rules (binding)

- Keep `STYLE_PREFIX` and `CHARACTER_SPEC` **byte-identical** across expressions for the same NPC. Only `EXPRESSION_SPEC` changes.
- Keep the seed locked per NPC. If an expression comes out with a visibly different face (different hair color, missing scar, changed build), **regenerate** — do not ship.
- Eye color, hair color, jawline, scars, clothing items must be identical across the four expression variants. If the model drifts, adjust `CHARACTER_SPEC` to be more specific rather than fighting the seed.
- Avoid shoulder cutoffs at the exact same pixel — slight natural variation is fine, dramatic variation is not.
- Backgrounds stay muted and non-specific — no gameplay scene details in portraits.

### 7.11 Post-processing

Pollinations returns JPEG with a baked background. For v0:

- Save directly as `<expression>.png` in `src/assets/portraits/<npc-key>/` (we re-encode to PNG to match the file extension contract the game expects, even though the source was JPEG)
- No alpha cut for v0 — accept the painterly background as part of the portrait frame. This is a deliberate deviation from §4 "Transparency: PNG with alpha"; tracked for v1 cleanup.
- Crop only if the subject is off-center. Pollinations generally frames well at 512×768; cropping is rare.
- Remove only obvious generation artifacts (visible watermark, text garbage, floating limbs) — if these appear often at a given seed, change the seed entirely.

### 7.12 Credits

External art or generated art must be documented in `src/assets/CREDITS.md`. Create the file if missing. Entry format:

```
### Portraits (AI-generated via Pollinations.ai, Flux backend)
- Brenna — `portraits/brenna/*.png` — seed 4473, prompts locked in STYLE_GUIDE §7.6
```

No Pollinations watermark is embedded when `nologo=true` is set, but attribution stays in CREDITS.md as a courtesy and so future us remembers the provenance.

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

## 10. Pixel art sprite pipeline (locked for v0)

v0 tileset and character sprites are procedurally generated via Node.js scripts using `node-canvas`. The scripts mirror the runtime drawing logic from `generateTiles.ts` / `generateSprites.ts` but output static PNG files that can be hand-edited, version-controlled, and eventually replaced by human pixel art.

### 10.1 Tooling

- **Package**: `canvas` (npm, node-canvas — server-side Canvas2D)
- **Scripts**: `tools/generate-tileset.mjs`, `tools/generate-trees.mjs`, `tools/generate-sprites.mjs`
- **Output format**: PNG with alpha transparency
- **Regeneration**: `node tools/generate-tileset.mjs && node tools/generate-trees.mjs && node tools/generate-sprites.mjs`

### 10.2 Tileset (`src/assets/tiles/tileset.png`)

- **Layout**: horizontal strip, 36 tiles × 32×32 px = 1152×32 total
- **Tile indices**: match `TILE` enum in `generateTiles.ts` exactly (0=GRASS_DARK through 35=BASEBOARD)
- **Palette**: uses the §3 gameplay palette (warm, earthy, restrained)
- **Dithering**: seeded RNG for organic variation on grass/path tiles; deterministic output

### 10.3 Trees (`src/assets/tiles/trees.png`)

- **Layout**: horizontal strip, 4 variants × 48×64 px = 192×64 total
- **Variants**: 0=Oak (broad canopy), 1=Pine (conifer), 2=Dead tree (leafless), 3=Stump
- **Transparency**: full alpha; trees have transparent background for layering

### 10.4 Character sprites (`src/assets/sprites/{race}.png`)

- **Layout**: horizontal strip, 8 frames × 32×48 px = 256×48 per race
- **Frame order**: `[front-idle, back-idle, left-idle, right-idle, front-walk, back-walk, left-walk, right-walk]`
- **Races**: human, elf, dwarf, halfling, orc, tiefling, dragonborn, gnome, half-elf, tabaxi
- **Equipment**: all sprites show fighter class (helmet, heavy armor, sword, shield) as the default showcase
- **Race features**: each race has unique proportions, facial features (tusks, horns, cat ears, snout, beard, etc.), and skin/hair palettes matching the runtime system
- **Outlines**: 1px dark outline (#1a1008) around all opaque pixels for readability at any scale

### 10.5 Extending

To add a new race or tile:
1. Add the drawing function to the appropriate `tools/generate-*.mjs` script
2. Run the script to regenerate the PNG
3. Update `src/assets/CREDITS.md` with the new entry
4. If the tile index changes, coordinate with game-dev to update the tilemap references
