/**
 * Dungeon items -- Zelda-style key items that unlock world interactions.
 * Found in dungeon chests, permanently kept. Each one opens new paths
 * in the world when used via the overworld interact system.
 */
export interface DungeonItem {
  key: string;
  name: string;
  description: string;
  icon: string;
  /** Which interaction types this item enables in the world. */
  enables: string;
}

export const DUNGEON_ITEMS: Record<string, DungeonItem> = {
  lantern: {
    key: 'lantern',
    name: 'Cairn Lantern',
    description: 'Old brass, warm flame. It remembers the dark and does not fear it.',
    icon: '\uD83D\uDD26',
    enables: 'dark-room',
  },
  pickaxe: {
    key: 'pickaxe',
    name: "Miner's Pickaxe",
    description: 'Worn handle, keen point. It was made to find what stone hides.',
    icon: '\u26CF',
    enables: 'cracked-wall',
  },
  water_charm: {
    key: 'water_charm',
    name: 'Water Charm',
    description: 'A pearl that hums near water. The current parts where you walk.',
    icon: '\uD83C\uDF0A',
    enables: 'shallow-water',
  },
  grapple_hook: {
    key: 'grapple_hook',
    name: 'Grapple Hook',
    description: 'Iron claw on a chain. It reaches where you cannot.',
    icon: '\uD83E\uDE9D',
    enables: 'grapple-point',
  },
  mirror_shard: {
    key: 'mirror_shard',
    name: 'Mirror Shard',
    description: 'A sliver of ancient glass. In its reflection, things hidden become plain.',
    icon: '\uD83E\uDE9E',
    enables: 'invisible',
  },
  flame_amulet: {
    key: 'flame_amulet',
    name: 'Flame Amulet',
    description: 'A ruby that burns without consuming itself. Ice retreats from its warmth.',
    icon: '\uD83D\uDD25',
    enables: 'melt-ice',
  },
};
