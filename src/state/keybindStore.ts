import { create } from 'zustand';

/**
 * Keybind store — maps semantic actions to keyboard keys.
 * Persisted to localStorage under 'hc_keybinds'.
 */
export type KeybindAction =
  | 'inventory'
  | 'quests'
  | 'map'
  | 'heal'
  | 'photoMode'
  | 'screenshot'
  | 'marker'
  | 'dialogueHistory'
  | 'keyItem';

export const DEFAULT_KEYBINDS: Record<KeybindAction, string> = {
  inventory: 'i',
  quests: 'q',
  map: 'm',
  heal: 'h',
  photoMode: 'F10',
  screenshot: 'F12',
  marker: 'l',
  dialogueHistory: 'Tab',
  keyItem: 'r',
};

export const KEYBIND_LABELS: Record<KeybindAction, string> = {
  inventory: 'Inventory',
  quests: 'Quest Board',
  map: 'Dungeon Map',
  heal: 'Quick Heal',
  photoMode: 'Photo Mode',
  screenshot: 'Screenshot',
  marker: 'Drop Marker',
  dialogueHistory: 'Dialogue History',
  keyItem: 'Use Key Item',
};

const STORAGE_KEY = 'hc_keybinds';

function loadKeybinds(): Record<KeybindAction, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_KEYBINDS };
    const parsed = JSON.parse(raw) as Partial<Record<KeybindAction, string>>;
    return { ...DEFAULT_KEYBINDS, ...parsed };
  } catch {
    return { ...DEFAULT_KEYBINDS };
  }
}

function saveKeybinds(binds: Record<KeybindAction, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(binds));
  } catch {
    // ignore quota errors
  }
}

interface KeybindState {
  binds: Record<KeybindAction, string>;
  setKey: (action: KeybindAction, key: string) => void;
  reset: () => void;
}

export const useKeybindStore = create<KeybindState>((set) => ({
  binds: loadKeybinds(),
  setKey: (action, key) =>
    set((s) => {
      const next = { ...s.binds, [action]: key };
      saveKeybinds(next);
      return { binds: next };
    }),
  reset: () => {
    saveKeybinds({ ...DEFAULT_KEYBINDS });
    set({ binds: { ...DEFAULT_KEYBINDS } });
  },
}));

/** Get the current key bound to an action. Safe to call outside React. */
export function getKey(action: KeybindAction): string {
  return useKeybindStore.getState().binds[action];
}

/** Compare an event key against a bound key (case-insensitive for letter keys). */
export function matchesKey(eventKey: string, action: KeybindAction): boolean {
  const bound = getKey(action);
  return eventKey.toLowerCase() === bound.toLowerCase();
}
