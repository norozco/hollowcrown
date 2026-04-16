# Sprite Combination Audit

> 10 races x 6 classes = 60 base combos + 5 Dragonborn elements x 6 classes = 84 total unique appearances.
> This doc tracks visual distinctness. Mark each combo as distinct or flag similarity issues.

## Race Visual Identity

| Race | Height | Width | Skin | Hair | Unique Feature | Status |
|---|---|---|---|---|---|---|
| Human | Standard (48px) | Standard (14w) | Warm tan #e8c090 | Brown #705030 | None -- baseline | PASS |
| Elf | Tall (thin, 12w body) | Narrow | Pale silvery #f0e0d0 | Bright gold #b8a848 | Long pointed ears (3px each side), tallest ear tips | PASS |
| Dwarf | Short (body starts y=24) | Wide (18w) | Ruddy #d0a070 | Auburn #a05020 | Thick beard (8px wide, hangs 6px below chin) | PASS |
| Halfling | Short (body starts y=24) | Narrow (11w) | Warm tan #e0b888 | Sandy-olive #706028 | Bare hairy feet with toe detail, warmer skin | PASS |
| Orc | Standard height | Widest (20w) | Saturated green #589050 | Dark #303030 | Tusks (2 white pixels at jaw), widest shoulders | PASS |
| Tiefling | Standard | Standard (14w) | Saturated red #c06058 | Dark purple #201020 | Horns (4px tall, poke through headgear) | PASS |
| Dragonborn | Standard | Wide (18w) | Scaled grey-green #708870 | No hair -- scale ridges | Snout, tail, scales, spines, claws, element glow | PASS |
| Gnome | Short | Narrow body (11w), BIG head (15w) | Pale yellow #f0e0b0 | Ginger #d06020 | Big 3px eyes, curly hair poof on top | PASS |
| Half-Elf | Between human/elf | Slightly narrow (13w) | Olive-muted #d8c8a0 | Dark brown #785830 | Subtle pointed ears, long hair, silver neck clasp | PASS |
| Tabaxi | Standard-tall | Standard (14w) | Tawny fur #c0a070 | Dark stripes #604020 | Cat ears (triangles), tail, fur stripe markings | PASS |

## Class Visual Identity

| Class | Headgear | Armor Style | Weapon | Extra | Status |
|---|---|---|---|---|---|
| Fighter | Full helmet + visor + crest | Heavy plate -- horizontal bands, wide pauldrons, shoulder studs | Sword + shield | Knee guards, gauntlet cuffs, plate emblem on chest | PASS |
| Rogue | Hood (covers hair) | Dark leather -- stitching, diagonal chest strap | Small dagger | Cape, 2 belt pouches, throwing star pixels | PASS |
| Wizard | Tall pointed hat + brim + gem | Flowing robes -- wider at bottom, hem detail | Staff with glowing orb | Star rune on chest, wide sleeve cuffs, robe sash | PASS |
| Cleric | Golden 3-point crown + jewel | Medium -- chainmail dot pattern, tabard | Mace with spiked head | Gold cross on chest, sash | PASS |
| Ranger | Leather cowl with front lacing | Medium -- leather, natural green tones | Bow visible from side | Cape, quiver with arrow tips, leaf brooch | PASS |
| Bard | Feathered cap (red plume) | Light -- vertical striped tunic | Lute visible from side | Stripe pattern, colorful red tunic | PASS |

## Dragonborn Element Variants

| Element | Skin Color | Scale Ridge | Extra Visual | Status |
|---|---|---|---|---|
| Fire | Orange-red #c06030 | Red-brown #a04020 | Ember glow at fists + chest | PASS |
| Cold | Icy blue #6090b0 | Blue #4070a0 | Glow at fists + chest (blue tint) | PASS |
| Lightning | Electric yellow #b0a050 | Yellow-brown #908030 | Glow at fists + chest (yellow) | PASS |
| Acid | Toxic green #60a040 | Green #408028 | Glow at fists + chest (green) | PASS |
| Poison | Dark purple #806080 | Purple #604060 | Glow at fists + chest (purple) | PASS |

## Pairwise Similarity Audit (All 84 Combos)

### Race Pair Analysis

Each race pair was checked across all 6 classes. A pair is flagged if ANY class combo between the two races could be confused.

| Race Pair | Differentiators | Risk | Status |
|---|---|---|---|
| **Human vs Elf** | Elf taller/thinner (12w vs 14w), long pointed ears, paler silvery skin, golden hair | Low | PASS |
| **Human vs Dwarf** | Dwarf much shorter + wider (18w), huge beard, ruddy skin, auburn hair | None | PASS |
| **Human vs Halfling** | Halfling shorter + narrower (11w), bare hairy feet, different skin tone | Low | PASS |
| **Human vs Orc** | Orc widest (20w), green skin, tusks, dark hair | None | PASS |
| **Human vs Tiefling** | Same build but Tiefling has saturated red skin + horns (poke through headgear) | Medium -- FIXED | PASS |
| **Human vs Dragonborn** | Dragonborn wider (18w), snout, tail, scales, claws, grey-green skin | None | PASS |
| **Human vs Gnome** | Gnome shorter, oversized head (15w on 11w body), big eyes, curly poof, pale yellow skin | None | PASS |
| **Human vs Half-Elf** | Half-Elf has olive-muted skin (was too close), darker hair, long hair, pointed ears, neck clasp | Medium -- FIXED | PASS |
| **Human vs Tabaxi** | Tabaxi has cat ears, tail, fur stripes, tawny fur color | None | PASS |
| **Elf vs Dwarf** | Opposite builds (tall thin vs short wide), completely different features | None | PASS |
| **Elf vs Halfling** | Elf tall/thin, Halfling short/narrow, bare feet vs long ears | None | PASS |
| **Elf vs Orc** | Completely different silhouette and color | None | PASS |
| **Elf vs Tiefling** | Elf thinner/taller, pale vs red skin, ears vs horns | None | PASS |
| **Elf vs Dragonborn** | Elf thinnest, Dragonborn wide with snout/tail | None | PASS |
| **Elf vs Gnome** | Elf tall/thin, Gnome short with big head/eyes | None | PASS |
| **Elf vs Half-Elf** | Both have pointed ears BUT Elf has long ears (3px), brighter gold hair, paler skin; Half-Elf has long hair, darker brown hair, olive skin, neck clasp | Medium -- FIXED | PASS |
| **Elf vs Tabaxi** | Elf thinner, pointed ears vs cat ears + tail | Low | PASS |
| **Dwarf vs Halfling** | Both short BUT Dwarf much wider (18w vs 11w), huge beard, different skin | Low | PASS |
| **Dwarf vs Orc** | Both wide but Orc taller, green skin vs ruddy, tusks vs beard | Low | PASS |
| **Dwarf vs Tiefling** | Dwarf short/wide, Tiefling standard with horns | None | PASS |
| **Dwarf vs Dragonborn** | Same width (18w) but Dwarf shorter, beard vs snout/tail | Low | PASS |
| **Dwarf vs Gnome** | Both short but Dwarf wide (18w) with beard, Gnome narrow (11w) with big eyes | Low | PASS |
| **Dwarf vs Half-Elf** | Dwarf short/wide/bearded, Half-Elf tall/slim | None | PASS |
| **Dwarf vs Tabaxi** | Dwarf short/wide, Tabaxi standard with cat features | None | PASS |
| **Halfling vs Orc** | Completely different size and color | None | PASS |
| **Halfling vs Tiefling** | Halfling short, Tiefling standard with horns + red skin | None | PASS |
| **Halfling vs Dragonborn** | Completely different size and features | None | PASS |
| **Halfling vs Gnome** | Both short + narrow (11w) BUT: Halfling has warm tan skin + bare feet + sandy hair; Gnome has pale yellow skin + big eyes + ginger curly poof + bigger head (15w). Hair color is strongest differentiator. | Medium -- FIXED | PASS |
| **Halfling vs Half-Elf** | Halfling short, Half-Elf tall, different features | None | PASS |
| **Halfling vs Tabaxi** | Halfling short, Tabaxi has cat features | None | PASS |
| **Orc vs Tiefling** | Orc wider + green, Tiefling red with horns | None | PASS |
| **Orc vs Dragonborn** | Both wide, but Orc green vs Dragonborn grey-green. Orc widest (20w) with tusks, Dragonborn (18w) with snout/tail. Orc skin now more saturated green. | Low -- FIXED | PASS |
| **Orc vs Gnome** | Completely different size | None | PASS |
| **Orc vs Half-Elf** | Orc wide/green, Half-Elf slim/olive | None | PASS |
| **Orc vs Tabaxi** | Orc wider + green, Tabaxi tawny with cat features | None | PASS |
| **Tiefling vs Dragonborn** | Tiefling standard (14w) with horns, Dragonborn wide (18w) with snout/tail/scales | None | PASS |
| **Tiefling vs Gnome** | Tiefling standard red, Gnome short with big eyes | None | PASS |
| **Tiefling vs Half-Elf** | Tiefling red skin + horns, Half-Elf olive + long hair + ears | None | PASS |
| **Tiefling vs Tabaxi** | Tiefling red + horns, Tabaxi tawny + cat ears + tail | Low | PASS |
| **Dragonborn vs Gnome** | Completely different size and features | None | PASS |
| **Dragonborn vs Half-Elf** | Dragonborn wide with reptilian features, Half-Elf slim with elven features | None | PASS |
| **Dragonborn vs Tabaxi** | Both have tails but Dragonborn thick/reptilian, Tabaxi thin/feline. Different silhouettes. | Low | PASS |
| **Gnome vs Half-Elf** | Gnome short with big eyes/head, Half-Elf tall with ears/long hair | None | PASS |
| **Gnome vs Tabaxi** | Gnome short, Tabaxi standard with cat features | None | PASS |
| **Half-Elf vs Tabaxi** | Half-Elf has elf ears + long hair, Tabaxi has cat ears + tail + stripes | Low | PASS |

### Class Pair Analysis

Each class pair was checked across all 10 races (+ elements).

| Class Pair | Differentiators | Risk | Status |
|---|---|---|---|
| **Fighter vs Rogue** | Heavy plate vs dark leather, helmet vs hood, sword+shield vs dagger+cape | None | PASS |
| **Fighter vs Wizard** | Plate+helmet vs robes+wizhat, sword vs staff | None | PASS |
| **Fighter vs Cleric** | Both have metal elements BUT Fighter has helmet + plate bands, Cleric has crown + chainmail dots + gold cross | Low | PASS |
| **Fighter vs Ranger** | Heavy plate vs medium leather, helmet vs cowl, sword+shield vs bow+quiver+cape | None | PASS |
| **Fighter vs Bard** | Heavy metal vs light colorful, helmet vs feather cap, sword vs lute | None | PASS |
| **Rogue vs Wizard** | Hood+dark leather vs wizhat+robes, dagger vs staff | None | PASS |
| **Rogue vs Cleric** | Dark leather vs white-gold medium, hood vs crown | None | PASS |
| **Rogue vs Ranger** | Both have capes BUT Rogue has hood+dark colors (#383840), Ranger has cowl with lacing+green (#408048). Rogue has dagger, Ranger has bow+quiver. | Medium -- FIXED (cowl lacing) | PASS |
| **Rogue vs Bard** | Both light armor BUT Rogue dark (#383840)+hood, Bard red (#a04050)+feather. Very different color. | Low | PASS |
| **Wizard vs Cleric** | Robes+wizhat vs medium+crown, staff vs mace, purple vs white-gold | None | PASS |
| **Wizard vs Ranger** | Robes+wizhat vs medium+cowl+cape, staff vs bow | None | PASS |
| **Wizard vs Bard** | Tall wizhat vs feather cap, robes vs light stripes, staff vs lute | Low | PASS |
| **Cleric vs Ranger** | Crown+white-gold vs cowl+green, mace vs bow, chainmail vs leather | None | PASS |
| **Cleric vs Bard** | Crown+white-gold vs feather+red, mace vs lute | None | PASS |
| **Ranger vs Bard** | Green cowl+bow+cape vs red feather+lute, very different colors | None | PASS |

## Fixes Applied (This Audit)

### Color Adjustments
1. **Elf skin** #f0d8b8 -> #f0e0d0 (more pale/silvery, further from Half-Elf)
2. **Elf hair** #c0a060 -> #b8a848 (brighter gold, distinguishes from Half-Elf brown)
3. **Halfling skin** #e8c8a0 -> #e0b888 (warmer/darker, further from Gnome pale yellow)
4. **Gnome skin** #e8d0a0 -> #f0e0b0 (more yellow/fair, further from Halfling warm tan)
5. **Orc skin** #709060 -> #589050 (more saturated green, further from Dragonborn grey-green)
6. **Tiefling skin** #c07060 -> #c06058 (more saturated red, stands out more in dark outfits)
7. **Half-Elf skin** #e8d0a8 -> #d8c8a0 (more olive/muted, further from Human warm tan)
8. **Half-Elf hair** #906838 -> #785830 (darker brown, distinguishes from both Human and Elf)

### Feature Additions
9. **Elf longEars flag** -- Elf ears now extend 3px (was 2px), clearly taller than Half-Elf 2px ears
10. **Gnome curly hair poof** -- Puffy curls on top of head in front view (ginger highlight)
11. **Half-Elf neck clasp** -- Silver pixel at throat in front view (racial identifier)
12. **Tiefling horns through headgear** -- Horn tips visible above any hat/hood/helmet
13. **Ranger cowl lacing** -- Front-facing lace pixels on cowl to distinguish from Rogue hood

## NPC Distinctness

| NPC | Hair | Outfit | Unique Detail |
|---|---|---|---|
| Brenna | Iron-grey, pulled back | Dark leather jerkin | Scar on brow (lighter pixel) -- TODO |
| Tomas | Dark, short | White apron over shirt | Clean-shaven, rolled sleeves -- TODO |
| Vira | Near-black, long | Deep burgundy, gold accent | Brooch pixel at collar -- TODO |
| Orric | Grey, bearded | Forest green cloak | Axe silhouette nearby -- TODO |

## Summary

All 84 race x class combinations (60 base + 24 dragonborn element variants) have been audited. Previously flagged issues (Halfling/Gnome, Human/Half-Elf, Elf/Half-Elf) are now resolved through color shifts, feature additions, and structural differentiation. No remaining combos are at high risk of visual confusion.
