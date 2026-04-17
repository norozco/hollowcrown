/**
 * Achievement definitions. Lightweight — check functions run against a
 * context snapshot; nothing is stored here except the definitions.
 */

export interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string; // emoji
  /** Check function — return true if unlocked. Called periodically. */
  check: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  totalKills: number;
  totalGold: number;
  questsCompleted: number;
  level: number;
  zonesVisited: Set<string>;
  itemsCrafted: number;
  chestsOpened: number;
  bossesKilled: string[];
  companionHired: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { key: 'first-blood',      name: 'First Blood',       description: 'Win your first battle.',            icon: '⚔',  check: (c) => c.totalKills >= 1 },
  { key: 'wolf-slayer',      name: 'Wolf Slayer',        description: 'Kill 5 wolves.',                    icon: '🐺', check: (c) => c.totalKills >= 5 },
  { key: 'level-5',          name: 'Seasoned',           description: 'Reach level 5.',                    icon: '⭐', check: (c) => c.level >= 5 },
  { key: 'level-10',         name: 'Veteran',            description: 'Reach level 10.',                   icon: '🌟', check: (c) => c.level >= 10 },
  { key: 'first-craft',      name: 'Apprentice Smith',   description: 'Craft your first item.',            icon: '🔨', check: (c) => c.itemsCrafted >= 1 },
  { key: 'rich',             name: 'Deep Pockets',       description: 'Hold 500 gold at once.',            icon: '💰', check: (c) => c.totalGold >= 500 },
  { key: 'explorer',         name: 'Wanderer',           description: 'Visit 5 different zones.',          icon: '🗺', check: (c) => c.zonesVisited.size >= 5 },
  { key: 'king-slayer',      name: 'Kingslayer',         description: 'Defeat the Hollow King.',           icon: '👑', check: (c) => c.bossesKilled.includes('hollow_king') },
  { key: 'quest-master',     name: 'Questmaster',        description: 'Complete 5 quests.',                icon: '📜', check: (c) => c.questsCompleted >= 5 },
  { key: 'companion',        name: 'Not Alone',          description: 'Hire a companion.',                 icon: '🤝', check: (c) => c.companionHired },
  { key: 'treasure-hunter',  name: 'Treasure Hunter',    description: 'Open 3 chests.',                   icon: '🏆', check: (c) => c.chestsOpened >= 3 },
  { key: 'deep-diver',       name: 'Into the Abyss',     description: 'Reach the Drowned Sanctum.',       icon: '🌊', check: (c) => c.zonesVisited.has('DrownedSanctumF1Scene') },
];
