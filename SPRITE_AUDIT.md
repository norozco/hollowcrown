# Sprite Combination Audit

> 10 races × 6 classes = 60 base combos + 5 Dragonborn elements = 84 total unique appearances.
> This doc tracks visual distinctness. Mark ⚠️ if two combos look too similar; ✅ when fixed.

## Race Visual Identity

| Race | Height | Width | Skin | Hair | Unique Feature | Status |
|---|---|---|---|---|---|---|
| Human | Standard (48px) | Standard (14w) | Warm tan #e8c090 | Brown #705030 | None — baseline | ✅ |
| Elf | Tall (thin, 12w body) | Narrow | Pale #f0d8b8 | Golden #c0a060 | Pointed ears (2px each side) | ✅ |
| Dwarf | Short (body starts y=24) | Wide (18w) | Ruddy #d0a070 | Auburn #a05020 | Thick beard (8px wide, hangs 6px below chin) | ✅ |
| Halfling | Short (body starts y=24) | Narrow (12w) | Soft tan #e8c8a0 | Sandy #908050 | Small build — ⚠️ too similar to Gnome? | NEEDS WORK |
| Orc | Standard height | Widest (20w) | Green #709060 | Dark #303030 | Tusks (2 white pixels at jaw), widest shoulders | ✅ |
| Tiefling | Standard | Standard (14w) | Reddish #c07060 | Dark purple #201020 | Horns (4px tall above head, pointed tips) | ✅ |
| Dragonborn | Standard | Wide (18w) | Scaled grey-green #708870 | No hair — scale ridges | Snout (wider jaw), no bangs, scale dots on crown | ✅ |
| Gnome | Short | Narrow (12w) | Fair #e8d0a0 | Ginger #d06020 | Big head relative to body — ⚠️ too similar to Halfling? | NEEDS WORK |
| Half-Elf | Between human/elf | Slightly narrow (13w) | Light #e8d0a8 | Light brown #a08050 | Subtle pointed ears — ⚠️ too similar to Human? | NEEDS WORK |
| Tabaxi | Standard | Standard (14w) | Fur #c0a070 | Dark stripes #604020 | Cat ears (triangles above head), tail (6px diagonal from behind) | ✅ |

### Similarity issues to fix:
1. **Halfling vs Gnome**: Both short, similar skin. Fix: Gnome gets BIG round eyes (4px), curly hair poof. Halfling gets rounder face, bare feet instead of boots.
2. **Half-Elf vs Human**: Almost identical build. Fix: Half-Elf gets longer hair (extends down the back), slimmer face, slightly taller.
3. **Dragonborn elements need more than just skin**: Add element-colored glow on chest/fists, spikes/fins unique to element.

## Class Visual Identity

| Class | Headgear | Armor Style | Weapon | Extra | Status |
|---|---|---|---|---|---|
| Fighter | Full helmet + visor | Heavy plate — horizontal bands, wide pauldrons | Sword + shield | Shoulder studs, knee guards | NEEDS MORE DETAIL |
| Rogue | Hood (covers hair) | Dark leather — stitching line, strap across chest | Small dagger | Cape flowing behind, belt pouches | NEEDS MORE DETAIL |
| Wizard | Tall pointed hat + brim | Flowing robes — wider at bottom, star pattern | Staff with glowing orb | Long sleeves, robe hem detail | NEEDS MORE DETAIL |
| Cleric | Golden 3-point crown | Medium — chainmail dots, white tabard overlay | Mace with spiked head | Holy symbol on chest (circle+cross), sash | NEEDS MORE DETAIL |
| Ranger | Leather cowl | Medium — leather bracers, green natural tones | Bow visible from side | Cape, quiver with arrow tips | NEEDS MORE DETAIL |
| Bard | Feathered cap (red plume) | Light — colorful striped tunic, puffy sleeves | Lute visible from side | Performer's sash, pattern detail | NEEDS MORE DETAIL |

### Detail additions needed per class:
- **Fighter**: Add visible knee guards (dark pixels at knee level), shoulder studs (bright pixels on pauldrons), chest emblem (single colored pixel pattern), gauntlet cuffs on hands
- **Rogue**: Add leather strap across chest (diagonal dark line), 2 belt pouches (small rectangles at belt), throwing stars on belt (tiny bright pixels), wrapped hand bindings
- **Wizard**: Add star/rune on chest (bright pattern pixels), sleeve cuffs (wider at wrists), orb glow effect (lighter pixels around staff top), robe sash
- **Cleric**: Add holy symbol on chest (3×3 cross in gold), sash from shoulder to hip (colored diagonal), prayer beads at belt (dots), glowing hands hint
- **Ranger**: Add leather bracers (darker wrist bands), leaf brooch (green pixel on chest), tracking marks on arms (thin lines), nature amulet
- **Bard**: Add striped pattern on tunic (alternating color lines every 2px), puffy sleeve cuffs (wider at elbow), instrument strap across back, small musical note motif

## Dragonborn Element Variants

| Element | Skin Color | Scale Ridge | Extra Visual |
|---|---|---|---|
| Fire | Orange-red #c06030 | Red-brown #a04020 | TODO: ember glow pixels at fists |
| Cold | Icy blue #6090b0 | Blue #4070a0 | TODO: frost crystals at shoulders |
| Lightning | Electric yellow #b0a050 | Yellow-brown #908030 | TODO: spark pixels at extremities |
| Acid | Toxic green #60a040 | Green #408028 | TODO: drip detail at jaw |
| Poison | Dark purple #806080 | Purple #604060 | TODO: miasma wisps at shoulders |

## NPC Distinctness

| NPC | Hair | Outfit | Unique Detail |
|---|---|---|---|
| Brenna | Iron-grey, pulled back | Dark leather jerkin | Scar on brow (lighter pixel) — TODO |
| Tomas | Dark, short | White apron over shirt | Clean-shaven, rolled sleeves — TODO |
| Vira | Near-black, long | Deep burgundy, gold accent | Brooch pixel at collar — TODO |
| Orric | Grey, bearded | Forest green cloak | Axe silhouette nearby — TODO |
