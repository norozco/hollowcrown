import guildGreeting from '../data/dialogues/guild-greeting.json';
import tomasGreeting from '../data/dialogues/tomas-greeting.json';
import viraGreeting from '../data/dialogues/vira-greeting.json';
import orricGreeting from '../data/dialogues/orric-greeting.json';
import mossbarrowCairn from '../data/dialogues/mossbarrow-cairn.json';
import kaelGreeting from '../data/dialogues/kael-greeting.json';
import type { Dialogue } from './dialogue';

/**
 * Registry of all authored dialogues. Add new dialogue JSON files to
 * `src/data/dialogues/` and register them here so `getDialogue(id)`
 * can find them at runtime.
 */
const DIALOGUES: Record<string, Dialogue> = {
  'guild-greeting': guildGreeting as unknown as Dialogue,
  'tomas-greeting': tomasGreeting as unknown as Dialogue,
  'vira-greeting': viraGreeting as unknown as Dialogue,
  'orric-greeting': orricGreeting as unknown as Dialogue,
  'mossbarrow-cairn': mossbarrowCairn as unknown as Dialogue,
  'kael-greeting': kaelGreeting as unknown as Dialogue,
};

export function getDialogue(id: string): Dialogue {
  const d = DIALOGUES[id];
  if (!d) throw new Error(`Unknown dialogue: ${id}`);
  return d;
}

export const ALL_DIALOGUE_IDS = Object.keys(DIALOGUES);
