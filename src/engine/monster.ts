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
  },
};

export function getMonster(key: string): Monster {
  const m = MONSTERS[key];
  if (!m) throw new Error(`Unknown monster: ${key}`);
  return m;
}

export const ALL_MONSTERS = Object.values(MONSTERS);
