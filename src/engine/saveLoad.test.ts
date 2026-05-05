import { describe, it, expect } from 'vitest';
import { __test__ } from './saveLoad';

const { normalizeSaveData } = __test__;

/**
 * Reconstruct a minimal v1 save — only fields that existed before the
 * post-v1 optional additions. This represents the on-disk shape a player
 * who hasn't loaded the game in a long time would have in localStorage.
 *
 * Cast to any to side-step the SaveData type's now-current shape; the
 * whole point is this object is missing fields that were added later.
 */
function makeMinimalV1Save(): any {
  return {
    version: 1,
    timestamp: 1700000000000,
    characterInit: {
      name: 'Olde Hero',
      raceKey: 'human',
      classKey: 'warrior',
      rolledStats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      difficulty: 'normal',
      gender: 'male',
      extraBonuses: undefined,
      playerChoice: null,
      level: 1,
      xp: 0,
      gold: 0,
      hp: 10,
      mp: 5,
    },
    quests: {},
    inventory: { slots: [], equipment: {} },
    killedEnemies: [],
    currentScene: 'TownScene',
  };
}

describe('normalizeSaveData', () => {
  it('fills every post-v1 optional field with a safe default for an old v1 save', () => {
    const raw = makeMinimalV1Save();
    const normalized = normalizeSaveData(raw);

    // Arrays default to [] — these are the ones B12 calls out as crash
    // risks (e.g. `save.dungeonItems.length`).
    expect(normalized.perks).toEqual([]);
    expect(normalized.heartPiecesCollected).toEqual([]);
    expect(normalized.ancientCoins).toEqual([]);
    expect(normalized.dungeonItems).toEqual([]);
    expect(normalized.lore).toEqual([]);

    // Records default to {}.
    expect(normalized.questKillCounts).toEqual({});
    expect(normalized.dialogueMemory).toEqual({});

    // Numbers default to 0.
    expect(normalized.heartPieces).toBe(0);
    expect(normalized.playTimeMs).toBe(0);

    // Booleans default to false.
    expect(normalized.lanternLit).toBe(false);
    expect(normalized.newGamePlus).toBe(false);

    // Nullable refs default to null.
    expect(normalized.companion).toBeNull();
    expect(normalized.activeDungeonItem).toBeNull();
    expect(normalized.bounty).toBeNull();

    // Composite empty-state shapes for stores.
    expect(normalized.achievements).toEqual({
      unlocked: [],
      totalKills: 0,
      totalDeaths: 0,
      itemsCrafted: 0,
      chestsOpened: 0,
      bossesKilled: [],
      zonesVisited: [],
      monstersEncountered: {},
    });
    expect(normalized.commissions).toEqual({
      commissions: [],
      transitionCount: 0,
    });
    expect(normalized.worldState).toEqual({
      litTorches: [],
      minedObjects: [],
      pickedObjects: [],
      unlockedDoors: [],
    });
    expect(normalized.time).toEqual({
      phase: 'day',
      transitionsSincePhase: 0,
      weather: 'clear',
    });

    // Reads that B12 specifically calls out should not throw.
    expect(() => normalized.dungeonItems.length).not.toThrow();
    expect(() => normalized.lore.length).not.toThrow();
    expect(() => Object.keys(normalized.dialogueMemory)).not.toThrow();
  });

  it('preserves existing values when post-v1 fields are present', () => {
    const raw = {
      ...makeMinimalV1Save(),
      perks: ['iron-skin', 'sharp-eye'],
      heartPieces: 3,
      heartPiecesCollected: ['hp1', 'hp2', 'hp3'],
      ancientCoins: ['coin-a'],
      companion: 'wolf',
      playTimeMs: 12345,
      dungeonItems: ['lantern', 'compass'],
      activeDungeonItem: 'lantern',
      lanternLit: true,
      newGamePlus: true,
      lore: [{ id: 'l1', title: 't', body: 'b', discoveredAt: 0 } as any],
      dialogueMemory: { 'innkeeper': 2 },
      time: { phase: 'dusk' as const, transitionsSincePhase: 5, weather: 'rain' as const },
    };
    const normalized = normalizeSaveData(raw as any);

    expect(normalized.perks).toEqual(['iron-skin', 'sharp-eye']);
    expect(normalized.heartPieces).toBe(3);
    expect(normalized.heartPiecesCollected).toEqual(['hp1', 'hp2', 'hp3']);
    expect(normalized.ancientCoins).toEqual(['coin-a']);
    expect(normalized.companion).toBe('wolf');
    expect(normalized.playTimeMs).toBe(12345);
    expect(normalized.dungeonItems).toEqual(['lantern', 'compass']);
    expect(normalized.activeDungeonItem).toBe('lantern');
    expect(normalized.lanternLit).toBe(true);
    expect(normalized.newGamePlus).toBe(true);
    expect(normalized.dialogueMemory).toEqual({ 'innkeeper': 2 });
    expect(normalized.time.phase).toBe('dusk');
    expect(normalized.time.weather).toBe('rain');
  });

  it('defaults nested time.weather to "clear" when only weather is missing', () => {
    const raw = {
      ...makeMinimalV1Save(),
      time: { phase: 'night' as const, transitionsSincePhase: 2 },
    };
    const normalized = normalizeSaveData(raw as any);
    expect(normalized.time.weather).toBe('clear');
    expect(normalized.time.phase).toBe('night');
    expect(normalized.time.transitionsSincePhase).toBe(2);
  });

  it('defaults partial worldState fields independently', () => {
    const raw = {
      ...makeMinimalV1Save(),
      worldState: { litTorches: ['torch1'] },
    };
    const normalized = normalizeSaveData(raw as any);
    expect(normalized.worldState.litTorches).toEqual(['torch1']);
    expect(normalized.worldState.minedObjects).toEqual([]);
    expect(normalized.worldState.pickedObjects).toEqual([]);
    expect(normalized.worldState.unlockedDoors).toEqual([]);
  });
});
