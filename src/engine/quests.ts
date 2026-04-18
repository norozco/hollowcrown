import ironToken from '../data/quests/iron-token.json';
import wolfCull from '../data/quests/wolf-cull.json';
import boneCollector from '../data/quests/bone-collector.json';
import herbGathering from '../data/quests/herb-gathering.json';
import spiderNest from '../data/quests/spider-nest.json';
import wraithHunt from '../data/quests/wraith-hunt.json';
import ironDelivery from '../data/quests/iron-delivery.json';
import depthsExplorer from '../data/quests/depths-explorer.json';
import hollowKingSlayer from '../data/quests/hollow-king-slayer.json';
import silkTrader from '../data/quests/silk-trader.json';
import boneRitual from '../data/quests/bone-ritual.json';
import scholarsTrail from '../data/quests/scholars-trail.json';
import drownedSanctum from '../data/quests/drowned-sanctum.json';
import whatRemains from '../data/quests/what-remains.json';
import bogExplorer from '../data/quests/bog-explorer.json';
import wardenSlayer from '../data/quests/warden-slayer.json';
import ashfieldExplorer from '../data/quests/ashfield-explorer.json';
import deepHook from '../data/quests/deep-hook.json';
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
  'spider-nest': spiderNest as unknown as Quest,
  'wraith-hunt': wraithHunt as unknown as Quest,
  'iron-delivery': ironDelivery as unknown as Quest,
  'depths-explorer': depthsExplorer as unknown as Quest,
  'hollow-king-slayer': hollowKingSlayer as unknown as Quest,
  'silk-trader': silkTrader as unknown as Quest,
  'bone-ritual': boneRitual as unknown as Quest,
  'scholars-trail': scholarsTrail as unknown as Quest,
  'drowned-sanctum': drownedSanctum as unknown as Quest,
  'what-remains': whatRemains as unknown as Quest,
  'bog-explorer': bogExplorer as unknown as Quest,
  'warden-slayer': wardenSlayer as unknown as Quest,
  'ashfield-explorer': ashfieldExplorer as unknown as Quest,
  'deep-hook': deepHook as unknown as Quest,
};

export function getQuest(id: string): Quest {
  const q = QUESTS[id];
  if (!q) throw new Error(`Unknown quest: ${id}`);
  return q;
}

export const ALL_QUEST_IDS = Object.keys(QUESTS);
