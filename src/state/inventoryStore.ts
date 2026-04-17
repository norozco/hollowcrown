import { create } from 'zustand';
import {
  type InventorySlot, type Equipment, type EquipSlot,
  EMPTY_EQUIPMENT, getItem,
} from '../engine/items';
import { usePlayerStore } from './playerStore';
import { useQuestStore } from './questStore';

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

  open: () => void;
  close: () => void;
  toggle: () => void;
  openShop: () => void;
  closeShop: () => void;
  openCrafting: () => void;
  closeCrafting: () => void;

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

function checkCollectionQuests(get: () => InventoryState): void {
  const questStore = useQuestStore.getState();
  for (const cq of COLLECTION_QUESTS) {
    const qs = questStore.active[cq.questId];
    if (!qs || qs.isComplete) continue;
    if (get().hasItem(cq.itemKey, cq.qty)) {
      questStore.completeObjective(cq.questId, cq.objectiveId);
    }
  }
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  slots: [],
  equipment: { ...EMPTY_EQUIPMENT },
  isOpen: false,
  isShopOpen: false,
  isCraftingOpen: false,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, isShopOpen: false, isCraftingOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen, isShopOpen: false, isCraftingOpen: false })),
  openShop: () => set({ isShopOpen: true, isOpen: false, isCraftingOpen: false }),
  closeShop: () => set({ isShopOpen: false }),
  openCrafting: () => set({ isCraftingOpen: true, isOpen: false, isShopOpen: false }),
  closeCrafting: () => set({ isCraftingOpen: false }),

  addItem: (itemKey, qty = 1) => {
    const item = getItem(itemKey);
    const { slots } = get();

    // Stackable: find existing stack
    if (item.stackable) {
      const existing = slots.find((s) => s.item.key === itemKey);
      if (existing) {
        set({ slots: slots.map((s) => s.item.key === itemKey ? { ...s, quantity: s.quantity + qty } : s) });
        checkCollectionQuests(get);
        return true;
      }
    }

    if (slots.length >= MAX_SLOTS) return false;
    set({ slots: [...slots, { item, quantity: qty }] });
    checkCollectionQuests(get);
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

    if (item.effect.healHp) char.heal(item.effect.healHp);
    if (item.effect.healMp) char.restoreMp(item.effect.healMp);
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

  reset: () => set({ slots: [], equipment: { ...EMPTY_EQUIPMENT }, isOpen: false, isShopOpen: false, isCraftingOpen: false }),
}));
