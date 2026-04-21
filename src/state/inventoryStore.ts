import { create } from 'zustand';
import {
  type InventorySlot, type Equipment, type EquipSlot,
  EMPTY_EQUIPMENT, getItem,
} from '../engine/items';
import { usePlayerStore } from './playerStore';
import { useQuestStore } from './questStore';
import { getPerkHpBonus, getPerkMpBonus } from '../engine/perks';
import { getHeartPieceHpBonus } from './playerStore';

interface InventoryState {
  /** Player's bag — up to 30 slots. */
  slots: InventorySlot[];
  /** Currently equipped items by slot. */
  equipment: Equipment;
  /** Is the inventory screen open? */
  isOpen: boolean;
  /** Is the shop screen open? */
  isShopOpen: boolean;
  /** Is the crafting screen open? */
  isCraftingOpen: boolean;
  /** Is the cooking screen open? */
  isCookingOpen: boolean;
  /** Item keys marked as favorite (prevents accidental sale/drop). */
  favorites: Set<string>;
  toggleFavorite: (itemKey: string) => void;
  isFavorite: (itemKey: string) => boolean;

  open: () => void;
  close: () => void;
  toggle: () => void;
  openShop: () => void;
  closeShop: () => void;
  openCrafting: () => void;
  closeCrafting: () => void;
  openCooking: () => void;
  closeCooking: () => void;

  /** Add an item (by key) to the bag. Returns false if bag is full. */
  addItem: (itemKey: string, qty?: number) => boolean;
  /** Remove qty of an item. Returns false if not enough. */
  removeItem: (itemKey: string, qty?: number) => boolean;
  /** Use a consumable (apply effect + remove 1). */
  useItem: (itemKey: string) => boolean;
  /** Equip an item from inventory to the appropriate slot. */
  equip: (itemKey: string) => void;
  /** Unequip a slot back to inventory. */
  unequip: (slot: EquipSlot) => void;
  /** Buy an item from a shop (deduct gold, add to inventory). */
  buy: (itemKey: string) => boolean;
  /** Sell an item (remove from inventory, add gold). */
  sell: (itemKey: string) => boolean;
  /** Has at least qty of this item? */
  hasItem: (itemKey: string, qty?: number) => boolean;
  /** Sort the bag by a given criteria. */
  sortBy: (criteria: 'type' | 'rarity' | 'name') => void;
  /** Reset for new game. */
  reset: () => void;
}

const MAX_SLOTS = 30;

/** Collection-based quest objectives: when the player has enough of an item,
 *  auto-complete the matching objective so the turn-in dialogue gate opens. */
const COLLECTION_QUESTS: { questId: string; objectiveId: string; itemKey: string; qty: number }[] = [
  { questId: 'herb-gathering', objectiveId: 'deliver-moonpetals', itemKey: 'moonpetal', qty: 3 },
  { questId: 'iron-delivery', objectiveId: 'deliver-iron', itemKey: 'iron_ore', qty: 3 },
  { questId: 'silk-trader', objectiveId: 'deliver-silk', itemKey: 'spider_silk', qty: 2 },
  { questId: 'bone-ritual', objectiveId: 'deliver-bones', itemKey: 'bone_shard', qty: 3 },
];

function checkCollectionQuests(get: () => InventoryState, addedItemKey?: string): void {
  const questStore = useQuestStore.getState();
  for (const cq of COLLECTION_QUESTS) {
    const qs = questStore.active[cq.questId];
    if (!qs || qs.isComplete) continue;
    const owned = get().slots.find((s) => s.item.key === cq.itemKey)?.quantity ?? 0;
    if (owned >= cq.qty) {
      questStore.completeObjective(cq.questId, cq.objectiveId);
      window.dispatchEvent(new CustomEvent('gameMessage', {
        detail: `Quest ready to turn in: ${cq.questId.replace(/-/g, ' ')}`,
      }));
    } else if (addedItemKey === cq.itemKey && owned > 0) {
      window.dispatchEvent(new CustomEvent('gameMessage', {
        detail: `${getItem(cq.itemKey).name}: ${owned}/${cq.qty}`,
      }));
    }
  }
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  slots: [],
  equipment: { ...EMPTY_EQUIPMENT },
  isOpen: false,
  isShopOpen: false,
  isCraftingOpen: false,
  isCookingOpen: false,
  favorites: new Set<string>(),

  toggleFavorite: (itemKey) => set((s) => {
    const next = new Set(s.favorites);
    if (next.has(itemKey)) next.delete(itemKey);
    else next.add(itemKey);
    return { favorites: next };
  }),
  isFavorite: (itemKey) => get().favorites.has(itemKey),

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, isShopOpen: false, isCraftingOpen: false, isCookingOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen, isShopOpen: false, isCraftingOpen: false, isCookingOpen: false })),
  openShop: () => set({ isShopOpen: true, isOpen: false, isCraftingOpen: false, isCookingOpen: false }),
  closeShop: () => set({ isShopOpen: false }),
  openCrafting: () => set({ isCraftingOpen: true, isOpen: false, isShopOpen: false, isCookingOpen: false }),
  closeCrafting: () => set({ isCraftingOpen: false }),
  openCooking: () => set({ isCookingOpen: true, isOpen: false, isShopOpen: false, isCraftingOpen: false }),
  closeCooking: () => set({ isCookingOpen: false }),

  addItem: (itemKey, qty = 1) => {
    const item = getItem(itemKey);
    const { slots } = get();

    // Stackable: find existing stack
    if (item.stackable) {
      const existing = slots.find((s) => s.item.key === itemKey);
      if (existing) {
        set({ slots: slots.map((s) => s.item.key === itemKey ? { ...s, quantity: s.quantity + qty } : s) });
        checkCollectionQuests(get, itemKey);
        return true;
      }
    }

    if (slots.length >= MAX_SLOTS) return false;
    set({ slots: [...slots, { item, quantity: qty }] });
    checkCollectionQuests(get, itemKey);
    if (['rare', 'epic', 'legendary'].includes(item.rarity)) {
      window.dispatchEvent(new CustomEvent('rareItemFound', {
        detail: { name: item.name, rarity: item.rarity, description: item.description },
      }));
    }
    return true;
  },

  removeItem: (itemKey, qty = 1) => {
    const { slots } = get();
    const idx = slots.findIndex((s) => s.item.key === itemKey);
    if (idx === -1) return false;
    const slot = slots[idx];
    if (slot.quantity < qty) return false;

    if (slot.quantity === qty) {
      set({ slots: slots.filter((_, i) => i !== idx) });
    } else {
      set({ slots: slots.map((s, i) => i === idx ? { ...s, quantity: s.quantity - qty } : s) });
    }
    return true;
  },

  useItem: (itemKey) => {
    const item = getItem(itemKey);
    if (item.type !== 'consumable' || !item.effect) return false;
    if (!get().removeItem(itemKey, 1)) return false;

    const player = usePlayerStore.getState();
    const char = player.character;
    if (!char) return false;

    if (item.effect.healHp) {
      // Perk HP bonus extends the cap beyond derived.maxHp.
      const effectiveMax = char.derived.maxHp + getPerkHpBonus(player.perks) + getHeartPieceHpBonus(player.heartPieces);
      char.hp = Math.min(effectiveMax, char.hp + item.effect.healHp);
    }
    if (item.effect.healMp) {
      const effectiveMaxMp = char.derived.maxMp + getPerkMpBonus(player.perks);
      char.mp = Math.min(effectiveMaxMp, char.mp + item.effect.healMp);
    }
    player.notify();
    return true;
  },

  equip: (itemKey) => {
    const item = getItem(itemKey);
    if (!item.equipSlot) return;
    const { equipment } = get();

    // If something is already in that slot, unequip it first
    const current = equipment[item.equipSlot];
    if (current) get().addItem(current.key);

    // Remove from inventory and equip
    get().removeItem(itemKey, 1);
    set({ equipment: { ...get().equipment, [item.equipSlot]: item } });
  },

  unequip: (slot) => {
    const { equipment } = get();
    const item = equipment[slot];
    if (!item) return;
    if (!get().addItem(item.key)) return; // bag full
    set({ equipment: { ...equipment, [slot]: null } });
  },

  buy: (itemKey) => {
    const item = getItem(itemKey);
    const player = usePlayerStore.getState();
    const char = player.character;
    if (!char || char.gold < item.buyPrice) return false;
    if (!get().addItem(itemKey)) return false;
    char.loseGold(item.buyPrice);
    player.notify();
    return true;
  },

  sell: (itemKey) => {
    // Block sale of favorited items
    if (get().favorites.has(itemKey)) {
      window.dispatchEvent(new CustomEvent('gameMessage', {
        detail: 'This item is favorited. Unlock it first.',
      }));
      return false;
    }
    const item = getItem(itemKey);
    const sellPrice = Math.floor(item.buyPrice * 0.5);
    if (!get().removeItem(itemKey, 1)) return false;
    const player = usePlayerStore.getState();
    const char = player.character;
    if (char) {
      char.addGold(sellPrice);
      player.notify();
    }
    return true;
  },

  hasItem: (itemKey, qty = 1) => {
    const slot = get().slots.find((s) => s.item.key === itemKey);
    return !!slot && slot.quantity >= qty;
  },

  sortBy: (criteria) => {
    const TYPE_ORDER: Record<string, number> = {
      weapon: 0, armor: 1, consumable: 2, material: 3, quest: 4,
    };
    const RARITY_ORDER: Record<string, number> = {
      legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4,
    };
    set((s) => ({
      slots: [...s.slots].sort((a, b) => {
        if (criteria === 'type') {
          const ta = TYPE_ORDER[a.item.type] ?? 99;
          const tb = TYPE_ORDER[b.item.type] ?? 99;
          return ta !== tb ? ta - tb : a.item.name.localeCompare(b.item.name);
        }
        if (criteria === 'rarity') {
          const ra = RARITY_ORDER[a.item.rarity] ?? 99;
          const rb = RARITY_ORDER[b.item.rarity] ?? 99;
          return ra !== rb ? ra - rb : a.item.name.localeCompare(b.item.name);
        }
        // name
        return a.item.name.localeCompare(b.item.name);
      }),
    }));
  },

  reset: () => set({ slots: [], equipment: { ...EMPTY_EQUIPMENT }, isOpen: false, isShopOpen: false, isCraftingOpen: false, isCookingOpen: false, favorites: new Set<string>() }),
}));
