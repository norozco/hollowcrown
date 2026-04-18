export interface Bounty {
  key: string;
  title: string;
  description: string;
  target: { type: 'kill'; monsterKey: string; count: number } | { type: 'collect'; itemKey: string; count: number };
  reward: { gold: number; xp: number };
}

export const BOUNTY_POOL: Bounty[] = [
  { key: 'b_wolves', title: 'Wolf Control', description: 'Thin the wolf population.', target: { type: 'kill', monsterKey: 'wolf', count: 2 }, reward: { gold: 30, xp: 40 } },
  { key: 'b_spiders', title: 'Spider Sweep', description: 'Clear spiders from the depths.', target: { type: 'kill', monsterKey: 'spider', count: 2 }, reward: { gold: 35, xp: 50 } },
  { key: 'b_skeletons', title: 'Bone Patrol', description: 'Put the dead back down.', target: { type: 'kill', monsterKey: 'skeleton', count: 2 }, reward: { gold: 45, xp: 60 } },
  { key: 'b_bandits', title: 'Road Safety', description: 'The paths need clearing.', target: { type: 'kill', monsterKey: 'bandit', count: 2 }, reward: { gold: 50, xp: 70 } },
  { key: 'b_wraiths', title: 'Wraith Watch', description: 'Cold things in cold places.', target: { type: 'kill', monsterKey: 'wraith', count: 1 }, reward: { gold: 55, xp: 80 } },
  { key: 'b_iron', title: 'Iron Run', description: 'The smithy needs ore.', target: { type: 'collect', itemKey: 'iron_ore', count: 3 }, reward: { gold: 25, xp: 30 } },
  { key: 'b_herbs', title: 'Herb Gathering', description: 'The inn needs moonpetals.', target: { type: 'collect', itemKey: 'moonpetal', count: 2 }, reward: { gold: 30, xp: 35 } },
  { key: 'b_silk', title: 'Silk Requisition', description: 'Spider silk for the armorer.', target: { type: 'collect', itemKey: 'spider_silk', count: 2 }, reward: { gold: 35, xp: 40 } },
];

/** Pick a random bounty that isn't the one currently active. */
export function rollBounty(excludeKey?: string): Bounty {
  const pool = excludeKey ? BOUNTY_POOL.filter(b => b.key !== excludeKey) : BOUNTY_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}
