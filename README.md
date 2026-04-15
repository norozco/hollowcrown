# Hollowcrown

> A 2D top-down RPG — pixel art gameplay, anime-style dialogue portraits, D&D-inspired mechanics under the hood.
> See `../DUNGEON_GAME_SPEC.md` for the full design document.

## Quick start

```bash
npm install
npm run dev        # start dev server (http://localhost:5173)
npm run test       # run unit tests once
npm run test:watch # tests in watch mode
npm run typecheck  # TypeScript type check
npm run build      # production build
```

## Project layout

```
src/
  main.tsx                React entry
  App.tsx                 App shell: mounts Phaser + overlays
  App.css / index.css     Global styles
  game/
    config.ts             Phaser game config (locked to 1280x720, pixel-art)
    PhaserGame.tsx        React wrapper around Phaser.Game
  scenes/                 Phaser scenes (BootScene, PlaceholderScene, ...)
  ui/                     React overlays (MainMenu, PauseMenu, Inventory, ...)
  engine/                 Deterministic rules - 100% unit-tested
    dice.ts
    __tests__/
  state/                  Zustand stores (uiStore, playerStore, ...)
  data/                   Static game data (races, classes, items, ...)
  assets/                 Tiles, sprites, portraits, audio
lore/                     Worldbuilding notes
```

## Milestone progress

- [x] **1. Project setup** - Vite + TS + Phaser + React overlay renders
- [x] **2. Rules engine** - dice / stats / race / classes / character (89 tests)
- [ ] 3. Main menu wiring (transition to character creation)
- [ ] 4. Character creation
- [ ] 5. Dialogue/portrait system
- ...see spec section 24 for full list.

## Design pillars

1. Rules deterministic, narration flavorful.
2. Choice has weight.
3. Every race and class mechanically distinct.
4. Dual art identity (pixel + anime).
5. Lore-dense world.
6. Ship the loop, then enrich.
