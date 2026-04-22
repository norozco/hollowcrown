import { create } from 'zustand';

/**
 * World state — persistent per-scene flags for environment objects
 * (lit torches, triggered switches, mined ore veins, etc.) that need
 * to survive scene transitions and saves.
 *
 * Torch IDs are canonicalised as `${sceneKey}:${torchId}` so callers
 * don't have to namespace manually. Mined-object IDs follow the same
 * `${sceneKey}:${objectId}` convention.
 */
interface WorldState {
  litTorches: Set<string>;
  /** Pickaxe-mined objects (ore veins, boulders, cracked walls) keyed
   *  as `${sceneKey}:${objectId}`. Once mined, they don't respawn. */
  minedObjects: Set<string>;
  isTorchLit: (sceneKey: string, torchId: string) => boolean;
  igniteTorch: (sceneKey: string, torchId: string) => void;
  isMined: (sceneKey: string, objectId: string) => boolean;
  markMined: (sceneKey: string, objectId: string) => void;
  reset: () => void;
  loadFrom: (litTorches: string[], mined?: string[]) => void;
  serialize: () => string[];
  serializeMined: () => string[];
}

export const useWorldStateStore = create<WorldState>((set, get) => ({
  litTorches: new Set<string>(),
  minedObjects: new Set<string>(),
  isTorchLit: (sceneKey, torchId) => get().litTorches.has(`${sceneKey}:${torchId}`),
  igniteTorch: (sceneKey, torchId) => {
    const key = `${sceneKey}:${torchId}`;
    if (get().litTorches.has(key)) return;
    set((s) => {
      const next = new Set(s.litTorches);
      next.add(key);
      return { litTorches: next };
    });
  },
  isMined: (sceneKey, objectId) => get().minedObjects.has(`${sceneKey}:${objectId}`),
  markMined: (sceneKey, objectId) => {
    const key = `${sceneKey}:${objectId}`;
    if (get().minedObjects.has(key)) return;
    set((s) => {
      const next = new Set(s.minedObjects);
      next.add(key);
      return { minedObjects: next };
    });
  },
  reset: () => set({ litTorches: new Set<string>(), minedObjects: new Set<string>() }),
  loadFrom: (arr, mined) => set({
    litTorches: new Set(arr),
    minedObjects: new Set(mined ?? []),
  }),
  serialize: () => Array.from(get().litTorches),
  serializeMined: () => Array.from(get().minedObjects),
}));
