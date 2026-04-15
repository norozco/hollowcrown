import { create } from 'zustand';

/**
 * UI-layer state: which React overlay is currently showing on top of the
 * Phaser canvas. The Phaser scene graph is independent; this store only
 * controls React DOM overlays (menus, dialogs, HUD panels).
 */
export type Screen =
  | 'menu'
  | 'character-creation'
  | 'tutorial'
  | 'game'
  | 'pause';

interface UIState {
  screen: Screen;
  setScreen: (s: Screen) => void;
}

export const useUIStore = create<UIState>((set) => ({
  screen: 'menu',
  setScreen: (screen) => set({ screen }),
}));
