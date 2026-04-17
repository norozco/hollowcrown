export interface AdventurerRank {
  key: string;
  name: string;
  label: string;
  color: string;
  /** Minimum quests completed to reach this rank. */
  questsRequired: number;
  /** Minimum level to reach this rank. */
  levelRequired: number;
}

export const RANKS: AdventurerRank[] = [
  { key: 'F', name: 'Unranked',   label: 'F', color: '#808080', questsRequired: 0, levelRequired: 1 },
  { key: 'E', name: 'Greenhorn',  label: 'E', color: '#60a060', questsRequired: 2, levelRequired: 2 },
  { key: 'D', name: 'Proven',     label: 'D', color: '#4080c0', questsRequired: 5, levelRequired: 4 },
  { key: 'C', name: 'Seasoned',   label: 'C', color: '#c0a040', questsRequired: 10, levelRequired: 7 },
  { key: 'B', name: 'Veteran',    label: 'B', color: '#c06040', questsRequired: 18, levelRequired: 10 },
  { key: 'A', name: 'Champion',   label: 'A', color: '#a040c0', questsRequired: 30, levelRequired: 15 },
];

export function getCurrentRank(questsCompleted: number, level: number): AdventurerRank {
  let best = RANKS[0];
  for (const rank of RANKS) {
    if (questsCompleted >= rank.questsRequired && level >= rank.levelRequired) {
      best = rank;
    }
  }
  return best;
}

export function getNextRank(current: AdventurerRank): AdventurerRank | null {
  const idx = RANKS.findIndex(r => r.key === current.key);
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}
