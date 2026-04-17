/**
 * Monster definitions. Each monster has stats for combat resolution
 * using the same D&D-adjacent math as the player (AC, attack bonus,
 * damage, initiative).
 */

export interface Monster {
  key: string;
  name: string;
  maxHp: number;
  ac: number;
  /** Bonus added to d20 attack rolls. */
  attackBonus: number;
  /** Base damage on a hit. */
  baseDamage: number;
  /** Added to initiative roll (higher = acts first). */
  speed: number;
  xpReward: number;
  goldReward: number;
  /** Flavor text shown at combat start. */
  description: string;
  /** Sprite color for procedural rendering. */
  color: string;
  /** Items dropped on defeat — { itemKey, dropChance (0-1) }. */
  loot: Array<{ itemKey: string; chance: number }>;
}

const MONSTERS: Record<string, Monster> = {
  wolf: {
    key: 'wolf',
    name: 'Dire Wolf',
    maxHp: 12,
    ac: 11,
    attackBonus: 3,
    baseDamage: 4,
    speed: 3,
    xpReward: 25,
    goldReward: 5,
    description: 'Grey fur, yellow eyes. It does not growl — it has already decided.',
    color: '#707070',
    loot: [
      { itemKey: 'wolf_pelt', chance: 0.7 },
      { itemKey: 'health_potion', chance: 0.2 },
      { itemKey: 'iron_ore', chance: 0.15 },
    ],
  },
  skeleton: {
    key: 'skeleton',
    name: 'Risen Bones',
    maxHp: 18,
    ac: 13,
    attackBonus: 2,
    baseDamage: 5,
    speed: 0,
    xpReward: 50,
    goldReward: 12,
    description: 'It assembles itself from the cairn floor, one joint at a time. It remembers how to hold a sword.',
    color: '#d0d0c0',
    loot: [
      { itemKey: 'bone_shard', chance: 0.8 },
      { itemKey: 'mana_potion', chance: 0.25 },
      { itemKey: 'shadow_essence', chance: 0.1 },
      { itemKey: 'iron_ore', chance: 0.2 },
    ],
  },
  hollow_knight: {
    key: 'hollow_knight',
    name: 'Hollow Knight',
    maxHp: 40,
    ac: 16,
    attackBonus: 5,
    baseDamage: 8,
    speed: 2,
    xpReward: 150,
    goldReward: 50,
    description: 'Rusted armor, no face behind the visor. It kneels, then stands, then does not kneel again.',
    color: '#506068',
    loot: [
      { itemKey: 'iron_sword', chance: 0.4 },
      { itemKey: 'iron_helm', chance: 0.3 },
      { itemKey: 'health_potion', chance: 0.5 },
      { itemKey: 'shadow_essence', chance: 0.3 },
      { itemKey: 'troll_heart', chance: 0.2 },
    ],
  },
  spider: {
    key: 'spider',
    name: 'Cairn Spider',
    maxHp: 14,
    ac: 10,
    attackBonus: 4,
    baseDamage: 3,
    speed: 4,
    xpReward: 30,
    goldReward: 6,
    description: 'Eight legs, each ending in a barb. It moves without sound.',
    color: '#3a3a2a',
    loot: [
      { itemKey: 'shadow_essence', chance: 0.2 },
      { itemKey: 'health_potion', chance: 0.15 },
      { itemKey: 'spider_silk', chance: 0.5 },
    ],
  },
  wraith: {
    key: 'wraith',
    name: 'Barrow Wraith',
    maxHp: 22,
    ac: 14,
    attackBonus: 4,
    baseDamage: 6,
    speed: 2,
    xpReward: 75,
    goldReward: 20,
    description: 'Cold light where eyes should be. It remembers being angry.',
    color: '#4060a0',
    loot: [
      { itemKey: 'shadow_essence', chance: 0.4 },
      { itemKey: 'mana_potion', chance: 0.3 },
      { itemKey: 'moonpetal', chance: 0.2 },
      { itemKey: 'wraith_dust', chance: 0.35 },
    ],
  },
  boar: {
    key: 'boar',
    name: 'Wild Boar',
    maxHp: 16,
    ac: 12,
    attackBonus: 3,
    baseDamage: 5,
    speed: 2,
    xpReward: 30,
    goldReward: 8,
    description: 'Tusks low, eyes red. It charges without warning.',
    color: '#8a6040',
    loot: [
      { itemKey: 'health_potion', chance: 0.25 },
      { itemKey: 'wolf_pelt', chance: 0.3 },
      { itemKey: 'iron_ore', chance: 0.1 },
    ],
  },
  bandit: {
    key: 'bandit',
    name: 'Forest Bandit',
    maxHp: 20,
    ac: 13,
    attackBonus: 4,
    baseDamage: 5,
    speed: 2,
    xpReward: 45,
    goldReward: 18,
    description: 'A mask, a blade, a grudge. They stopped asking questions long ago.',
    color: '#5a4a3a',
    loot: [
      { itemKey: 'iron_ore', chance: 0.3 },
      { itemKey: 'health_potion', chance: 0.3 },
      { itemKey: 'iron_sword', chance: 0.1 },
      { itemKey: 'leather_cap', chance: 0.15 },
    ],
  },
  hollow_king: {
    key: 'hollow_king',
    name: 'The Hollow King',
    maxHp: 120,
    ac: 18,
    attackBonus: 7,
    baseDamage: 12,
    speed: 1,
    xpReward: 500,
    goldReward: 200,
    description: 'A crown of tarnished iron. No throne — only what remains when a kingdom forgets its name.',
    color: '#282040',
    loot: [
      { itemKey: 'shadow_essence', chance: 1.0 },
      { itemKey: 'troll_heart', chance: 0.8 },
      { itemKey: 'steel_sword', chance: 0.5 },
      { itemKey: 'chainmail', chance: 0.4 },
      { itemKey: 'kings_crown', chance: 0.3 },
    ],
  },
};

export function getMonster(key: string): Monster {
  const m = MONSTERS[key];
  if (!m) throw new Error(`Unknown monster: ${key}`);
  return m;
}

export const ALL_MONSTERS = Object.values(MONSTERS);
