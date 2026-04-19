import { create } from 'zustand';

/**
 * Tracks which tiles the player has visited in each dungeon scene.
 * Used by the DungeonMap UI to show explored rooms.
 */
interface DungeonMapState {
  /** Tiles visited per scene key. Map of sceneKey -> Set of "x,y" tile coords. */
  visited: Record<string, Set<string>>;

  /** Record a tile as visited. */
  visit: (sceneKey: string, tileX: number, tileY: number) => void;
  /** Get visited tiles for a specific scene. */
  getVisited: (sceneKey: string) => Set<string>;
  reset: () => void;
}

export const useDungeonMapStore = create<DungeonMapState>((set, get) => ({
  visited: {},

  visit: (sceneKey, tileX, tileY) => {
    const key = `${tileX},${tileY}`;
    const existing = get().visited[sceneKey] ?? new Set<string>();
    if (existing.has(key)) return;
    const next = new Set(existing);
    next.add(key);
    set({ visited: { ...get().visited, [sceneKey]: next } });
  },

  getVisited: (sceneKey) => get().visited[sceneKey] ?? new Set<string>(),
  reset: () => set({ visited: {} }),
}));
