import { create } from 'zustand';

/**
 * Player-placed markers on the minimap / world map.
 * Press L in-game to drop one at the player's current position.
 */
export interface MapMarker {
  id: string;
  sceneKey: string;
  x: number;
  y: number;
  label: string;
  createdAt: number;
}

interface MapMarkerState {
  markers: MapMarker[];
  /** Add a marker. Keeps a rolling limit of the most recent N. */
  add: (sceneKey: string, x: number, y: number, label?: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Get markers for a specific scene. */
  forScene: (sceneKey: string) => MapMarker[];
}

const MAX_MARKERS = 30;

export const useMapMarkerStore = create<MapMarkerState>((set, get) => ({
  markers: [],
  add: (sceneKey, x, y, label) => {
    const id = `mk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set((s) => {
      const next = [...s.markers, {
        id, sceneKey, x, y,
        label: label ?? `Pin ${s.markers.filter((m) => m.sceneKey === sceneKey).length + 1}`,
        createdAt: Date.now(),
      }];
      if (next.length > MAX_MARKERS) next.shift();
      return { markers: next };
    });
  },
  remove: (id) => set((s) => ({ markers: s.markers.filter((m) => m.id !== id) })),
  clear: () => set({ markers: [] }),
  forScene: (sceneKey) => get().markers.filter((m) => m.sceneKey === sceneKey),
}));
