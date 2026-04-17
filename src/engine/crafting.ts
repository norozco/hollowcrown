export interface CraftingRecipe {
  key: string;
  name: string;
  description: string;
  ingredients: Array<{ itemKey: string; quantity: number }>;
  resultItemKey: string;
  resultQuantity: number;
  goldCost: number;
  /** Minimum adventurer rank required. */
  requiredRank?: string;
}

export const RECIPES: CraftingRecipe[] = [
  {
    key: 'craft_health_potion',
    name: 'Brew Health Potion',
    description: 'Moonpetal and wolf pelt, ground together.',
    ingredients: [{ itemKey: 'moonpetal', quantity: 1 }, { itemKey: 'wolf_pelt', quantity: 1 }],
    resultItemKey: 'health_potion',
    resultQuantity: 2,
    goldCost: 10,
  },
  {
    key: 'craft_mana_potion',
    name: 'Brew Mana Potion',
    description: 'Moonpetal and shadow essence, distilled.',
    ingredients: [{ itemKey: 'moonpetal', quantity: 1 }, { itemKey: 'shadow_essence', quantity: 1 }],
    resultItemKey: 'mana_potion',
    resultQuantity: 2,
    goldCost: 15,
  },
  {
    key: 'craft_iron_sword',
    name: 'Forge Iron Sword',
    description: 'Three ingots, hammered true.',
    ingredients: [{ itemKey: 'iron_ore', quantity: 3 }],
    resultItemKey: 'iron_sword',
    resultQuantity: 1,
    goldCost: 30,
  },
  {
    key: 'craft_steel_sword',
    name: 'Forge Steel Sword',
    description: 'Iron, bone, and will.',
    ingredients: [{ itemKey: 'iron_ore', quantity: 5 }, { itemKey: 'bone_shard', quantity: 2 }],
    resultItemKey: 'steel_sword',
    resultQuantity: 1,
    goldCost: 80,
    requiredRank: 'E',
  },
  {
    key: 'craft_chainmail',
    name: 'Forge Chainmail',
    description: 'Iron links, spider silk binding.',
    ingredients: [{ itemKey: 'iron_ore', quantity: 4 }, { itemKey: 'spider_silk', quantity: 2 }],
    resultItemKey: 'chainmail',
    resultQuantity: 1,
    goldCost: 60,
    requiredRank: 'E',
  },
  {
    key: 'craft_antidote',
    name: 'Brew Antidote',
    description: 'Moonpetal essence, purified.',
    ingredients: [{ itemKey: 'moonpetal', quantity: 2 }],
    resultItemKey: 'antidote',
    resultQuantity: 3,
    goldCost: 5,
  },
  {
    key: 'craft_hunting_bow',
    name: 'Craft Hunting Bow',
    description: 'Yew wood and spider silk bowstring.',
    ingredients: [{ itemKey: 'iron_ore', quantity: 2 }, { itemKey: 'spider_silk', quantity: 2 }],
    resultItemKey: 'hunting_bow',
    resultQuantity: 1,
    goldCost: 40,
  },
  {
    key: 'craft_shadow_dagger',
    name: 'Forge Shadow Dagger',
    description: 'Dark iron, quenched in shadow.',
    ingredients: [{ itemKey: 'iron_ore', quantity: 2 }, { itemKey: 'shadow_essence', quantity: 1 }],
    resultItemKey: 'shadow_dagger',
    resultQuantity: 1,
    goldCost: 35,
  },
  {
    key: 'craft_iron_mace',
    name: 'Forge Iron Mace',
    description: 'Solid iron head on oak handle.',
    ingredients: [{ itemKey: 'iron_ore', quantity: 3 }, { itemKey: 'bone_shard', quantity: 1 }],
    resultItemKey: 'iron_mace',
    resultQuantity: 1,
    goldCost: 30,
  },
  {
    key: 'craft_runed_staff',
    name: 'Craft Runed Staff',
    description: 'Oak core, moonstone focus, shadow binding.',
    ingredients: [{ itemKey: 'iron_ore', quantity: 1 }, { itemKey: 'moonpetal', quantity: 2 }, { itemKey: 'shadow_essence', quantity: 1 }],
    resultItemKey: 'runed_staff',
    resultQuantity: 1,
    goldCost: 50,
  },
  {
    key: 'craft_silver_rapier',
    name: 'Forge Silver Rapier',
    description: 'Refined iron, spider silk grip, balanced for the stage.',
    ingredients: [{ itemKey: 'iron_ore', quantity: 2 }, { itemKey: 'spider_silk', quantity: 1 }, { itemKey: 'moonpetal', quantity: 1 }],
    resultItemKey: 'silver_rapier',
    resultQuantity: 1,
    goldCost: 45,
  },
  {
    key: 'craft_leather_armor',
    name: 'Tan Leather Armor',
    description: 'Wolf pelts, stitched and hardened.',
    ingredients: [{ itemKey: 'wolf_pelt', quantity: 3 }],
    resultItemKey: 'leather_armor',
    resultQuantity: 1,
    goldCost: 20,
  },
];
