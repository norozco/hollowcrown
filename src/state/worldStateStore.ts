import { create } from 'zustand';

/**
 * World state — persistent per-scene flags for environment objects
 * (lit torches, triggered switches, mined ore veins, picked-up chests
 * and loot bags, etc.) that need to survive scene transitions and saves.
 *
 * Torch IDs are canonicalised as `${sceneKey}:${torchId}` so callers
 * don't have to namespace manually. Mined-object and picked-object IDs
 * follow the same `${sceneKey}:${objectId}` convention.
 */
interface WorldState {
  litTorches: Set<string>;
  /** Pickaxe-mined objects (ore veins, boulders, cracked walls) keyed
   *  as `${sceneKey}:${objectId}`. Once mined, they don't respawn. */
  minedObjects: Set<string>;
  /** One-time pickup objects (chests, loot bags, fairy fountains, ad-hoc
   *  ore nodes) keyed as `${sceneKey}:${objectId}`. Once picked/opened,
   *  they do not respawn on scene re-entry or post-combat return. This
   *  fixes the infinite-farm exploit where chests/loot reappeared after
   *  every battle because `scene.create()` re-ran `layout()`. */
  pickedObjects: Set<string>;
  /** Doors the player has already unlocked with a key, keyed as
   *  `${sceneKey}:${doorId}`. Once unlocked, the door does not respawn
   *  on future scene entries — a second key is never required. */
  unlockedDoors: Set<string>;
  isTorchLit: (sceneKey: string, torchId: string) => boolean;
  igniteTorch: (sceneKey: string, torchId: string) => void;
  isMined: (sceneKey: string, objectId: string) => boolean;
  markMined: (sceneKey: string, objectId: string) => void;
  isPicked: (sceneKey: string, objectId: string) => boolean;
  markPicked: (sceneKey: string, objectId: string) => void;
  isDoorUnlocked: (sceneKey: string, doorId: string) => boolean;
  unlockDoor: (sceneKey: string, doorId: string) => void;
  reset: () => void;
  loadFrom: (litTorches: string[], mined?: string[], picked?: string[], unlockedDoors?: string[]) => void;
  serialize: () => string[];
  serializeMined: () => string[];
  serializePicked: () => string[];
  serializeUnlockedDoors: () => string[];
}

export const useWorldStateStore = create<WorldState>((set, get) => ({
  litTorches: new Set<string>(),
  minedObjects: new Set<string>(),
  pickedObjects: new Set<string>(),
  unlockedDoors: new Set<string>(),
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
  isPicked: (sceneKey, objectId) => get().pickedObjects.has(`${sceneKey}:${objectId}`),
  markPicked: (sceneKey, objectId) => {
    const key = `${sceneKey}:${objectId}`;
    if (get().pickedObjects.has(key)) return;
    set((s) => {
      const next = new Set(s.pickedObjects);
      next.add(key);
      return { pickedObjects: next };
    });
  },
  isDoorUnlocked: (sceneKey, doorId) => get().unlockedDoors.has(`${sceneKey}:${doorId}`),
  unlockDoor: (sceneKey, doorId) => {
    const key = `${sceneKey}:${doorId}`;
    if (get().unlockedDoors.has(key)) return;
    set((s) => {
      const next = new Set(s.unlockedDoors);
      next.add(key);
      return { unlockedDoors: next };
    });
  },
  reset: () => set({
    litTorches: new Set<string>(),
    minedObjects: new Set<string>(),
    pickedObjects: new Set<string>(),
    unlockedDoors: new Set<string>(),
  }),
  loadFrom: (arr, mined, picked, unlockedDoors) => set({
    litTorches: new Set(arr),
    minedObjects: new Set(mined ?? []),
    pickedObjects: new Set(picked ?? []),
    unlockedDoors: new Set(unlockedDoors ?? []),
  }),
  serialize: () => Array.from(get().litTorches),
  serializeMined: () => Array.from(get().minedObjects),
  serializePicked: () => Array.from(get().pickedObjects),
  serializeUnlockedDoors: () => Array.from(get().unlockedDoors),
}));
