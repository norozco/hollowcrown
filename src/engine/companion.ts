export interface Companion {
  key: string;
  name: string;
  description: string;
  /** Gold cost to hire. */
  hireCost: number;
  /** Bonus applied each player turn. */
  effect: {
    bonusDamage?: number;  // added to all attacks
    healPerTurn?: number;  // heal X HP each turn
    bonusAc?: number;      // +AC while companion is active
  };
}

export const COMPANIONS: Record<string, Companion> = {
  orric: {
    key: 'orric',
    name: 'Orric the Forester',
    description: 'An old woodsman. His axe arm is still strong.',
    hireCost: 50,
    effect: { bonusDamage: 2 },
  },
  kael: {
    key: 'kael',
    name: 'Kael the Smith',
    description: 'Iron-armed and stubborn. He takes hits you cannot.',
    hireCost: 75,
    effect: { bonusAc: 2 },
  },
  tomas: {
    key: 'tomas',
    name: 'Tomas the Innkeeper',
    description: 'Knows field medicine. Patches you between blows.',
    hireCost: 60,
    effect: { healPerTurn: 3 },
  },
  mira: {
    key: 'mira',
    name: 'Mira the Quick',
    description: 'Fast hands, faster feet. What she lacks in honor she makes up in timing.',
    hireCost: 0,
    effect: { bonusDamage: 3 },
  },
  brenna: {
    key: 'brenna',
    name: 'Brenna the Guildmaster',
    description: 'She put down the ledger. She picked up her blade. It remembered her.',
    hireCost: 0,
    effect: { bonusAc: 3, bonusDamage: 2 },
  },
  lyra: {
    key: 'lyra',
    name: 'Lyra Ashen',
    description: 'A guild deserter. The yard wrote one word against her. The cairn wrote nothing.',
    hireCost: 200,
    effect: { bonusDamage: 4 },
  },
  halvor: {
    key: 'halvor',
    name: 'Halvor Trent',
    description: 'A scholar of the Sundering. He carries herbs, bandages, and a thesis the world should rather he forgot.',
    hireCost: 0,
    effect: { healPerTurn: 2 },
  },
  quill: {
    key: 'quill',
    name: 'Quill',
    description: 'A keeper who walked away. The drink took most of his names. The road may yet give some back.',
    hireCost: 0,
    effect: { bonusAc: 2 },
  },
};

/** Friendly summary of a companion's combat contribution for the HUD/overlay. */
export function companionBonusLabel(companion: Companion): string {
  const { bonusDamage, healPerTurn, bonusAc } = companion.effect;
  const parts: string[] = [];
  if (bonusAc) parts.push(`+${bonusAc} AC`);
  if (bonusDamage) parts.push(`+${bonusDamage} DMG`);
  if (healPerTurn) parts.push(`+${healPerTurn} HP/turn`);
  return parts.join(', ') || '';
}
