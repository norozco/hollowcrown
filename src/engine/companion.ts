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
};

/** Friendly summary of a companion's combat contribution for the HUD/overlay. */
export function companionBonusLabel(companion: Companion): string {
  const { bonusDamage, healPerTurn, bonusAc } = companion.effect;
  if (bonusDamage) return `+${bonusDamage} DMG`;
  if (healPerTurn) return `+${healPerTurn} HP/turn`;
  if (bonusAc) return `+${bonusAc} AC`;
  return '';
}
