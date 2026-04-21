export interface Recipe {
  key: string;
  name: string;
  description: string;
  ingredients: [string, string]; // exactly 2 item keys
  resultItemKey: string;
  goldCost: number;
}

export const COOKING_RECIPES: Recipe[] = [
  {
    key: 'cook_hearty_stew',
    name: 'Hearty Stew',
    description: 'Wolf meat and mushrooms. Warms the blood.',
    ingredients: ['wolf_pelt', 'moonpetal'],
    resultItemKey: 'hearty_stew',
    goldCost: 5,
  },
  {
    key: 'cook_bone_broth',
    name: 'Bone Broth',
    description: 'Marrow-rich. Restores mana.',
    ingredients: ['bone_shard', 'moonpetal'],
    resultItemKey: 'bone_broth',
    goldCost: 5,
  },
  {
    key: 'cook_fisherman_plate',
    name: "Fisherman's Plate",
    description: 'Grilled pike over seaweed. A balanced meal.',
    ingredients: ['grilled_pike', 'moonpetal'],
    resultItemKey: 'fishermans_plate',
    goldCost: 8,
  },
  {
    key: 'cook_warrior_feast',
    name: "Warrior's Feast",
    description: 'Iron-seared meat with spider-silk garnish. Hardens skin.',
    ingredients: ['wolf_pelt', 'spider_silk'],
    resultItemKey: 'warrior_feast',
    goldCost: 15,
  },
];
