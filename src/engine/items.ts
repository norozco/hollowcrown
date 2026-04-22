/**
 * Item system. Items are typed objects with rarity, stats, and use effects.
 * Equipment slots: head, chest, legs, boots, mainHand, offHand, ring1, ring2, amulet.
 */

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemType = 'weapon' | 'armor' | 'consumable' | 'material' | 'quest';
export type EquipSlot = 'head' | 'chest' | 'legs' | 'boots' | 'mainHand' | 'offHand' | 'ring1' | 'ring2' | 'amulet';

export interface ItemEffect {
  healHp?: number;
  healMp?: number;
  buffAc?: number;
  buffAttack?: number;
  duration?: number; // turns for buffs
}

export interface Item {
  key: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  /** Buy price from shops. Sell price = floor(buyPrice * 0.5). */
  buyPrice: number;
  description: string;
  /** Which slot this equips to (weapons/armor only). */
  equipSlot?: EquipSlot;
  /** Stat bonuses when equipped. */
  statBonus?: { ac?: number; attack?: number; damage?: number; hp?: number; mp?: number };
  /** Use effect (consumables only). */
  effect?: ItemEffect;
  /** Stack limit (consumables/materials). Equipment doesn't stack. */
  stackable?: boolean;
}

export interface InventorySlot {
  item: Item;
  quantity: number;
}

export interface Equipment {
  head: Item | null;
  chest: Item | null;
  legs: Item | null;
  boots: Item | null;
  mainHand: Item | null;
  offHand: Item | null;
  ring1: Item | null;
  ring2: Item | null;
  amulet: Item | null;
}

export const EMPTY_EQUIPMENT: Equipment = {
  head: null, chest: null, legs: null, boots: null,
  mainHand: null, offHand: null, ring1: null, ring2: null, amulet: null,
};

// ─── Item database ────────────────────────────────────────────

const ITEMS: Record<string, Item> = {
  // Consumables
  health_potion: {
    key: 'health_potion', name: 'Health Potion', type: 'consumable', rarity: 'common',
    buyPrice: 25, description: 'Restores a portion of your health.',
    effect: { healHp: 15 }, stackable: true,
  },
  mana_potion: {
    key: 'mana_potion', name: 'Mana Potion', type: 'consumable', rarity: 'common',
    buyPrice: 30, description: 'Restores a portion of your mana.',
    effect: { healMp: 10 }, stackable: true,
  },
  antidote: {
    key: 'antidote', name: 'Antidote', type: 'consumable', rarity: 'common',
    buyPrice: 15, description: 'Cures poison. Tastes worse than the poison.',
    effect: { healHp: 5 }, stackable: true,
  },
  // Armor
  leather_cap: {
    key: 'leather_cap', name: 'Leather Cap', type: 'armor', rarity: 'common',
    buyPrice: 40, description: 'Worn leather. Better than nothing.',
    equipSlot: 'head', statBonus: { ac: 1 },
  },
  iron_helm: {
    key: 'iron_helm', name: 'Iron Helm', type: 'armor', rarity: 'uncommon',
    buyPrice: 120, description: 'Cold iron. Keeps the skull in one piece.',
    equipSlot: 'head', statBonus: { ac: 2 },
  },
  leather_armor: {
    key: 'leather_armor', name: 'Leather Armor', type: 'armor', rarity: 'common',
    buyPrice: 60, description: 'Stiff and cracked. Someone wore it before you.',
    equipSlot: 'chest', statBonus: { ac: 2 },
  },
  chainmail: {
    key: 'chainmail', name: 'Chainmail', type: 'armor', rarity: 'uncommon',
    buyPrice: 200, description: 'Rings of iron, linked by someone patient.',
    equipSlot: 'chest', statBonus: { ac: 4 },
  },
  traveler_boots: {
    key: 'traveler_boots', name: "Traveler's Boots", type: 'armor', rarity: 'common',
    buyPrice: 35, description: 'Well-worn soles. They know the road.',
    equipSlot: 'boots', statBonus: { ac: 1 },
  },
  // Weapons
  iron_sword: {
    key: 'iron_sword', name: 'Iron Sword', type: 'weapon', rarity: 'common',
    buyPrice: 80, description: 'Straight blade. Does what it is asked to do.',
    equipSlot: 'mainHand', statBonus: { attack: 1, damage: 2 },
  },
  steel_sword: {
    key: 'steel_sword', name: 'Steel Sword', type: 'weapon', rarity: 'uncommon',
    buyPrice: 250, description: 'Holds an edge longer than iron. Holds a grudge longer too.',
    equipSlot: 'mainHand', statBonus: { attack: 2, damage: 4 },
  },
  oak_staff: {
    key: 'oak_staff', name: 'Oak Staff', type: 'weapon', rarity: 'common',
    buyPrice: 60, description: 'Hardwood, iron-shod. Channels what you give it.',
    equipSlot: 'mainHand', statBonus: { attack: 1, mp: 5 },
  },
  wooden_shield: {
    key: 'wooden_shield', name: 'Wooden Shield', type: 'armor', rarity: 'common',
    buyPrice: 50, description: 'Planks and iron bands. Will take a hit or two.',
    equipSlot: 'offHand', statBonus: { ac: 2 },
  },
  // Materials (monster drops)
  wolf_pelt: {
    key: 'wolf_pelt', name: 'Wolf Pelt', type: 'material', rarity: 'common',
    buyPrice: 8, description: 'Grey fur, still warm. Someone will want this.',
    stackable: true,
  },
  bone_shard: {
    key: 'bone_shard', name: 'Bone Shard', type: 'material', rarity: 'common',
    buyPrice: 12, description: 'Sharp enough to cut. Old enough to wonder where it came from.',
    stackable: true,
  },
  // More materials
  iron_ore: {
    key: 'iron_ore', name: 'Iron Ore', type: 'material', rarity: 'common',
    buyPrice: 15, description: 'Heavy, dark metal. The smithy knows what to do with it.',
    stackable: true,
  },
  silver_ore: {
    key: 'silver_ore', name: 'Silver Ore', type: 'material', rarity: 'uncommon',
    buyPrice: 50, description: 'Bright veins in grey stone. Cold to the touch, even in sun.',
    stackable: true,
  },
  gold_ore: {
    key: 'gold_ore', name: 'Gold Ore', type: 'material', rarity: 'rare',
    buyPrice: 150, description: 'A king\'s ransom still trapped in rough stone. Heavy as a promise.',
    stackable: true,
  },
  moonpetal: {
    key: 'moonpetal', name: 'Moonpetal', type: 'material', rarity: 'uncommon',
    buyPrice: 25, description: 'A pale flower that only opens at dusk. Alchemists pay well.',
    stackable: true,
  },
  shadow_essence: {
    key: 'shadow_essence', name: 'Shadow Essence', type: 'material', rarity: 'rare',
    buyPrice: 60, description: 'Distilled from things that should not have been alive. Cold to hold.',
    stackable: true,
  },
  troll_heart: {
    key: 'troll_heart', name: 'Troll Heart', type: 'material', rarity: 'uncommon',
    buyPrice: 35, description: 'Still beating, faintly. Do not eat it.',
    stackable: true,
  },
  spider_silk: {
    key: 'spider_silk', name: 'Spider Silk', type: 'material', rarity: 'uncommon',
    buyPrice: 20, description: 'Gossamer threads, stronger than they look. The smithy has ideas.',
    stackable: true,
  },
  wraith_dust: {
    key: 'wraith_dust', name: 'Wraith Dust', type: 'material', rarity: 'rare',
    buyPrice: 45, description: 'Cold residue. Glows faintly when no one is looking.',
    stackable: true,
  },
  kings_crown: {
    key: 'kings_crown', name: "King's Crown", type: 'armor', rarity: 'legendary',
    buyPrice: 0, description: 'Tarnished iron, heavier than it should be. It remembers.',
    equipSlot: 'head', statBonus: { ac: 4, hp: 15, mp: 10 },
  },
  crownless_blade: {
    key: 'crownless_blade', name: 'The Crownless Blade', type: 'weapon', rarity: 'legendary',
    buyPrice: 0, description: 'Forged from twelve ancient coins melted and recast. It remembers every hand that held the pieces. It will not be broken again.',
    equipSlot: 'mainHand', statBonus: { attack: 5, damage: 8 },
  },
  // Ring
  copper_ring: {
    key: 'copper_ring', name: 'Copper Ring', type: 'armor', rarity: 'common',
    buyPrice: 45, description: 'Green with age. Still hums faintly.',
    equipSlot: 'ring1', statBonus: { hp: 5 },
  },
  hunting_bow: {
    key: 'hunting_bow', name: 'Hunting Bow', type: 'weapon', rarity: 'uncommon',
    buyPrice: 180, description: 'Yew and sinew. Sings when the string is drawn.',
    equipSlot: 'mainHand', statBonus: { attack: 2, damage: 3 },
  },
  shadow_dagger: {
    key: 'shadow_dagger', name: 'Shadow Dagger', type: 'weapon', rarity: 'uncommon',
    buyPrice: 160, description: 'Dark iron, thin as a whisper. Finds the gap in any guard.',
    equipSlot: 'mainHand', statBonus: { attack: 3, damage: 2 },
  },
  iron_mace: {
    key: 'iron_mace', name: 'Iron Mace', type: 'weapon', rarity: 'uncommon',
    buyPrice: 150, description: 'Blunt, honest, heavy. The faithful carry these.',
    equipSlot: 'mainHand', statBonus: { attack: 1, damage: 4 },
  },
  runed_staff: {
    key: 'runed_staff', name: 'Runed Staff', type: 'weapon', rarity: 'uncommon',
    buyPrice: 200, description: 'Oak inlaid with moonstone. The runes hum when held.',
    equipSlot: 'mainHand', statBonus: { attack: 2, mp: 8 },
  },
  silver_rapier: {
    key: 'silver_rapier', name: 'Silver Rapier', type: 'weapon', rarity: 'uncommon',
    buyPrice: 190, description: 'Thin, precise, elegant. Words fail where this succeeds.',
    equipSlot: 'mainHand', statBonus: { attack: 2, damage: 3 },
  },
  // ── Kael's Masterwork (commission results) ──
  kael_iron_sword: {
    key: 'kael_iron_sword', name: "Kael's Iron Sword", type: 'weapon', rarity: 'uncommon',
    buyPrice: 120, description: 'Forged with patience. The edge holds longer, cuts deeper.',
    equipSlot: 'mainHand', statBonus: { attack: 2, damage: 3 },
  },
  kael_steel_sword: {
    key: 'kael_steel_sword', name: "Kael's Steel Sword", type: 'weapon', rarity: 'rare',
    buyPrice: 380, description: 'Days at the anvil. The steel remembers every hammer stroke.',
    equipSlot: 'mainHand', statBonus: { attack: 3, damage: 5 },
  },
  kael_hunting_bow: {
    key: 'kael_hunting_bow', name: "Kael's Hunting Bow", type: 'weapon', rarity: 'rare',
    buyPrice: 270, description: 'Yew aged in shadow. The string hums before the arrow flies.',
    equipSlot: 'mainHand', statBonus: { attack: 3, damage: 4 },
  },
  kael_shadow_dagger: {
    key: 'kael_shadow_dagger', name: "Kael's Shadow Dagger", type: 'weapon', rarity: 'rare',
    buyPrice: 240, description: 'Folded dark iron. Finds the gap you did not know was there.',
    equipSlot: 'mainHand', statBonus: { attack: 4, damage: 3 },
  },
  kael_iron_mace: {
    key: 'kael_iron_mace', name: "Kael's Iron Mace", type: 'weapon', rarity: 'rare',
    buyPrice: 230, description: 'Balanced for the faithful. Each blow carries conviction.',
    equipSlot: 'mainHand', statBonus: { attack: 2, damage: 5 },
  },
  kael_runed_staff: {
    key: 'kael_runed_staff', name: "Kael's Runed Staff", type: 'weapon', rarity: 'rare',
    buyPrice: 300, description: 'The runes were carved over three nights. They do not flicker.',
    equipSlot: 'mainHand', statBonus: { attack: 3, mp: 12 },
  },
  kael_silver_rapier: {
    key: 'kael_silver_rapier', name: "Kael's Silver Rapier", type: 'weapon', rarity: 'rare',
    buyPrice: 280, description: 'Perfect balance. It moves before you think to move it.',
    equipSlot: 'mainHand', statBonus: { attack: 3, damage: 4 },
  },
  kael_chainmail: {
    key: 'kael_chainmail', name: "Kael's Chainmail", type: 'armor', rarity: 'rare',
    buyPrice: 300, description: 'Every link tested. It will hold when lesser mail would not.',
    equipSlot: 'chest', statBonus: { ac: 5 },
  },
  kael_leather_armor: {
    key: 'kael_leather_armor', name: "Kael's Leather Armor", type: 'armor', rarity: 'uncommon',
    buyPrice: 90, description: 'Hardened and shaped to fit. Moves with you, not against.',
    equipSlot: 'chest', statBonus: { ac: 3 },
  },
  // ── Quest items ──
  dungeon_key: {
    key: 'dungeon_key', name: 'Rusty Key', type: 'quest', rarity: 'uncommon',
    buyPrice: 0, description: 'Iron, corroded. Opens something below.',
    stackable: true,
  },
  boss_key: {
    key: 'boss_key', name: 'Warden Key', type: 'quest', rarity: 'rare',
    buyPrice: 0, description: 'Heavy iron, warm to the touch. Opens the way to what waits.',
    stackable: false,
  },
  torn_journal: {
    key: 'torn_journal', name: 'Torn Journal Page', type: 'quest', rarity: 'uncommon',
    buyPrice: 0, description: 'Water-stained parchment. The handwriting is precise, Elven. Some words are still legible.',
    stackable: false,
  },
  gallery_key: {
    key: 'gallery_key', name: 'Gallery Key', type: 'quest', rarity: 'uncommon',
    buyPrice: 0, description: 'Tarnished bronze. The handle is shaped like a wave.',
    stackable: false,
  },
  sanctum_key: {
    key: 'sanctum_key', name: 'Sanctum Key', type: 'quest', rarity: 'rare',
    buyPrice: 0, description: 'Green-black iron, cold as the water it sat in. Shaped for a lock that does not want to be opened.',
    stackable: false,
  },
  tower_key: {
    key: 'tower_key', name: 'Tower Key', type: 'quest', rarity: 'uncommon',
    buyPrice: 0, description: 'Black iron, still warm. Opens doors that fire has sealed.',
    stackable: false,
  },
  frost_key: {
    key: 'frost_key', name: 'Frost Key', type: 'quest', rarity: 'uncommon',
    buyPrice: 0, description: 'Blue-white iron, cold enough to burn. It fits a lock sealed by winter itself.',
    stackable: false,
  },
  // ── Duskmere fish consumables ──
  grilled_pike: {
    key: 'grilled_pike', name: 'Grilled Pike', type: 'consumable', rarity: 'common',
    buyPrice: 20, description: 'Crispy skin, tender flesh. Smells of smoke and lake water.',
    effect: { healHp: 20 }, stackable: true,
  },
  smoked_eel: {
    key: 'smoked_eel', name: 'Smoked Eel', type: 'consumable', rarity: 'uncommon',
    buyPrice: 35, description: 'Dark, oily, and strangely satisfying. Restores body and mind.',
    effect: { healHp: 15, healMp: 10 }, stackable: true,
  },
  lake_tonic: {
    key: 'lake_tonic', name: 'Lake Tonic', type: 'consumable', rarity: 'uncommon',
    buyPrice: 40, description: 'Brewed from lakewater and herbs. Clears poison and mends.',
    effect: { healHp: 10, healMp: 15 }, stackable: true,
  },
  golden_carp: {
    key: 'golden_carp', name: 'Golden Carp', type: 'consumable', rarity: 'rare',
    buyPrice: 100, description: 'Scales like coins. Restores everything and then some.',
    effect: { healHp: 50, healMp: 30 }, stackable: true,
  },
  // ── Cooking (Whispering Hollow Inn) ──
  hearty_stew: {
    key: 'hearty_stew', name: 'Hearty Stew', type: 'consumable', rarity: 'uncommon',
    buyPrice: 30, description: 'Warms the blood. +20 HP and a brief stamina boost.',
    effect: { healHp: 20 }, stackable: true,
  },
  bone_broth: {
    key: 'bone_broth', name: 'Bone Broth', type: 'consumable', rarity: 'uncommon',
    buyPrice: 35, description: 'Marrow-rich. +15 MP.',
    effect: { healMp: 15 }, stackable: true,
  },
  fishermans_plate: {
    key: 'fishermans_plate', name: "Fisherman's Plate", type: 'consumable', rarity: 'rare',
    buyPrice: 50, description: 'Balanced meal. +25 HP, +10 MP.',
    effect: { healHp: 25, healMp: 10 }, stackable: true,
  },
  warrior_feast: {
    key: 'warrior_feast', name: "Warrior's Feast", type: 'consumable', rarity: 'rare',
    buyPrice: 70, description: 'Hardens the skin. +30 HP and temporary AC buff.',
    effect: { healHp: 30, buffAc: 2, duration: 10 }, stackable: true,
  },
  // Late-game rare equipment
  void_edge: {
    key: 'void_edge', name: 'Void Edge', type: 'weapon', rarity: 'epic',
    buyPrice: 0, description: 'The blade is not there. The cut is.',
    equipSlot: 'mainHand', statBonus: { attack: 4, damage: 6 },
  },
  frost_plate: {
    key: 'frost_plate', name: 'Frost Plate', type: 'armor', rarity: 'epic',
    buyPrice: 0, description: 'Armor of ice that does not melt. It numbs what it protects.',
    equipSlot: 'chest', statBonus: { ac: 6, hp: 10 },
  },
  ember_crown: {
    key: 'ember_crown', name: 'Ember Crown', type: 'armor', rarity: 'epic',
    buyPrice: 0, description: 'Iron that still glows. It burned the last three people who wore it. The fourth was ready.',
    equipSlot: 'head', statBonus: { ac: 3, mp: 15 },
  },
  warden_shield: {
    key: 'warden_shield', name: "Warden's Shield", type: 'armor', rarity: 'epic',
    buyPrice: 0, description: 'Barnacled iron. The arm that held it did not let go. Neither will yours.',
    equipSlot: 'offHand', statBonus: { ac: 4, hp: 8 },
  },
  shadow_cloak: {
    key: 'shadow_cloak', name: 'Shadow Cloak', type: 'armor', rarity: 'rare',
    buyPrice: 0, description: 'Wraith dust woven into cloth. You are harder to find.',
    equipSlot: 'chest', statBonus: { ac: 3, damage: 2 },
  },
  ring_of_the_deep: {
    key: 'ring_of_the_deep', name: 'Ring of the Deep', type: 'armor', rarity: 'epic',
    buyPrice: 0, description: 'Cold metal. The finger it was on dissolved long ago. The ring endures.',
    equipSlot: 'ring1', statBonus: { hp: 15, mp: 10 },
  },
};

export function getItem(key: string): Item {
  const i = ITEMS[key];
  if (!i) throw new Error(`Unknown item: ${key}`);
  return i;
}

export const ALL_ITEMS = Object.values(ITEMS);

/** Items available for purchase at the General Store. */
export const SHOP_INVENTORY: string[] = [
  'health_potion', 'mana_potion', 'antidote',
  'leather_cap', 'iron_helm', 'leather_armor', 'chainmail',
  'traveler_boots', 'iron_sword', 'steel_sword', 'oak_staff',
  'wooden_shield', 'copper_ring',
  'grilled_pike', 'smoked_eel', 'lake_tonic',
];
