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
];
