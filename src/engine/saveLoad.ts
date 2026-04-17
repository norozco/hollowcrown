/**
 * Save/Load system — serializes game state to localStorage.
 * 3 save slots + 1 autosave slot.
 */

import { usePlayerStore } from '../state/playerStore';
import { useQuestStore } from '../state/questStore';
import { useInventoryStore } from '../state/inventoryStore';
import { useCombatStore } from '../state/combatStore';
import type { CharacterInit, Gender } from './character';
import type { QuestState } from './quest';
import { ALL_PERKS } from './perks';
// Item types used in SaveData shape (inlined below).


interface SaveData {
  version: 1;
  timestamp: number;
  characterInit: CharacterInit & { level: number; xp: number; gold: number; hp: number; mp: number; gender: Gender };
  quests: Record<string, QuestState>;
  inventory: { slots: Array<{ itemKey: string; qty: number }>; equipment: Record<string, string | null> };
  killedEnemies: string[];
  currentScene: string;
  /** Perk keys chosen across level-ups (added post-v1, optional for compat). */
  perks?: string[];
}

const SAVE_PREFIX = 'hollowcrown_save_';

export function saveGame(slot: string, currentScene = 'TownScene'): boolean {
  const char = usePlayerStore.getState().character;
  if (!char) return false;

  const data: SaveData = {
    version: 1,
    timestamp: Date.now(),
    characterInit: {
      name: char.name,
      raceKey: char.race.key as CharacterInit['raceKey'],
      classKey: char.characterClass.key as CharacterInit['classKey'],
      rolledStats: char.rolledStats,
      difficulty: char.difficulty,
      gender: char.gender,
      extraBonuses: undefined,
      playerChoice: char.playerChoice,
      level: char.level,
      xp: char.xp,
      gold: char.gold,
      hp: char.hp,
      mp: char.mp,
    },
    quests: { ...useQuestStore.getState().active },
    inventory: {
      slots: useInventoryStore.getState().slots.map((s) => ({ itemKey: s.item.key, qty: s.quantity })),
      equipment: Object.fromEntries(
        Object.entries(useInventoryStore.getState().equipment).map(([k, v]) => [k, v?.key ?? null]),
      ),
    },
    killedEnemies: Array.from(useCombatStore.getState().killedEnemies),
    currentScene,
    perks: usePlayerStore.getState().perks,
  };

  try {
    localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(slot: string): boolean {
  try {
    const raw = localStorage.getItem(SAVE_PREFIX + slot);
    if (!raw) return false;
    const data: SaveData = JSON.parse(raw);
    if (data.version !== 1) return false;

    // Restore character
    const init = data.characterInit;
    usePlayerStore.getState().create({
      name: init.name,
      raceKey: init.raceKey,
      classKey: init.classKey,
      rolledStats: init.rolledStats,
      difficulty: init.difficulty,
      gender: init.gender ?? 'male',
      playerChoice: init.playerChoice,
      level: init.level,
      xp: init.xp,
      gold: init.gold,
    });

    const char = usePlayerStore.getState().character;
    if (char) {
      char.hp = init.hp;
      char.mp = init.mp;
      // Restore perks — re-apply stat mutations (stat-boost perks modify
      // the character's stats directly, so we replay them on load).
      const savedPerks = data.perks ?? [];
      if (savedPerks.length > 0) {
        for (const pk of savedPerks) {
          const perk = ALL_PERKS.find((p) => p.key === pk);
          if (perk) perk.apply(char);
        }
        usePlayerStore.setState({ perks: savedPerks });
      }
      usePlayerStore.getState().notify();
    }

    // Restore quests
    const questStore = useQuestStore.getState();
    questStore.reset();
    for (const [id, state] of Object.entries(data.quests)) {
      (questStore as unknown as { active: Record<string, QuestState> }).active[id] = state;
    }

    // Restore inventory
    const inv = useInventoryStore.getState();
    inv.reset();
    for (const s of data.inventory.slots) {
      inv.addItem(s.itemKey, s.qty);
    }
    for (const [slot, itemKey] of Object.entries(data.inventory.equipment)) {
      if (itemKey) inv.equip(itemKey);
      void slot;
    }

    // Restore killed enemies
    const combat = useCombatStore.getState();
    combat.killedEnemies.clear();
    for (const id of data.killedEnemies) {
      combat.killedEnemies.add(id);
    }

    return true;
  } catch {
    return false;
  }
}

export interface SaveSlotInfo {
  slot: string;
  label: string;
  timestamp: number | null;
  characterName: string | null;
  level: number | null;
  className: string | null;
  raceName: string | null;
}

export function getSaveSlots(): SaveSlotInfo[] {
  const slots = ['slot1', 'slot2', 'slot3', 'autosave'];
  return slots.map((slot) => {
    const label = slot === 'autosave' ? 'Autosave' : `Slot ${slot.slice(-1)}`;
    try {
      const raw = localStorage.getItem(SAVE_PREFIX + slot);
      if (!raw) return { slot, label, timestamp: null, characterName: null, level: null, className: null, raceName: null };
      const data: SaveData = JSON.parse(raw);
      // Derive human-readable class/race names from keys (capitalize first letter of each word)
      const toTitle = (key: string) =>
        key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        slot,
        label,
        timestamp: data.timestamp,
        characterName: data.characterInit.name,
        level: data.characterInit.level,
        className: toTitle(data.characterInit.classKey),
        raceName: toTitle(data.characterInit.raceKey),
      };
    } catch {
      return { slot, label, timestamp: null, characterName: null, level: null, className: null, raceName: null };
    }
  });
}

export function deleteSave(slot: string): void {
  localStorage.removeItem(SAVE_PREFIX + slot);
}
