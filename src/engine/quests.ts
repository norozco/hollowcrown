import ironToken from '../data/quests/iron-token.json';
import wolfCull from '../data/quests/wolf-cull.json';
import boneCollector from '../data/quests/bone-collector.json';
import herbGathering from '../data/quests/herb-gathering.json';
import type { Quest } from './quest';

/**
 * Registry of all authored quests. Add new quest JSON files to
 * `src/data/quests/` and register them here so `getQuest(id)` can
 * find them at runtime.
 */
const QUESTS: Record<string, Quest> = {
  'iron-token': ironToken as unknown as Quest,
  'wolf-cull': wolfCull as unknown as Quest,
  'bone-collector': boneCollector as unknown as Quest,
  'herb-gathering': herbGathering as unknown as Quest,
};

export function getQuest(id: string): Quest {
  const q = QUESTS[id];
  if (!q) throw new Error(`Unknown quest: ${id}`);
  return q;
}

export const ALL_QUEST_IDS = Object.keys(QUESTS);
