import guildGreeting from '../data/dialogues/guild-greeting.json';
import tomasGreeting from '../data/dialogues/tomas-greeting.json';
import viraGreeting from '../data/dialogues/vira-greeting.json';
import orricGreeting from '../data/dialogues/orric-greeting.json';
import mossbarrowCairn from '../data/dialogues/mossbarrow-cairn.json';
import kaelGreeting from '../data/dialogues/kael-greeting.json';
import hermitGreeting from '../data/dialogues/hermit-greeting.json';
import veyrinSanctum from '../data/dialogues/veyrin-sanctum.json';
import nessaGreeting from '../data/dialogues/nessa-greeting.json';
import torbenGreeting from '../data/dialogues/torben-greeting.json';
import miraGreeting from '../data/dialogues/mira-greeting.json';
import miraConfront from '../data/dialogues/mira-confront.json';
import miraBackstory from '../data/dialogues/mira-backstory.json';
import miraRecruitment from '../data/dialogues/mira-recruitment.json';
import brennaRevelation from '../data/dialogues/brenna-revelation.json';
import lyraEncounter from '../data/dialogues/lyra-encounter.json';
import lyraConfess from '../data/dialogues/lyra-confess.json';
import lyraRecruit from '../data/dialogues/lyra-recruit.json';
import halvorEncounter from '../data/dialogues/halvor-encounter.json';
import halvorThesis from '../data/dialogues/halvor-thesis.json';
import halvorRecruit from '../data/dialogues/halvor-recruit.json';
import quillEncounter from '../data/dialogues/quill-encounter.json';
import quillConfess from '../data/dialogues/quill-confess.json';
import quillRecruit from '../data/dialogues/quill-recruit.json';
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
  'hermit-greeting': hermitGreeting as unknown as Dialogue,
  'veyrin-sanctum': veyrinSanctum as unknown as Dialogue,
  'nessa-greeting': nessaGreeting as unknown as Dialogue,
  'torben-greeting': torbenGreeting as unknown as Dialogue,
  'mira-greeting': miraGreeting as unknown as Dialogue,
  'mira-confront': miraConfront as unknown as Dialogue,
  'mira-backstory': miraBackstory as unknown as Dialogue,
  'mira-recruitment': miraRecruitment as unknown as Dialogue,
  'brenna-revelation': brennaRevelation as unknown as Dialogue,
  'lyra-encounter': lyraEncounter as unknown as Dialogue,
  'lyra-confess': lyraConfess as unknown as Dialogue,
  'lyra-recruit': lyraRecruit as unknown as Dialogue,
  'halvor-encounter': halvorEncounter as unknown as Dialogue,
  'halvor-thesis': halvorThesis as unknown as Dialogue,
  'halvor-recruit': halvorRecruit as unknown as Dialogue,
  'quill-encounter': quillEncounter as unknown as Dialogue,
  'quill-confess': quillConfess as unknown as Dialogue,
  'quill-recruit': quillRecruit as unknown as Dialogue,
};

export function getDialogue(id: string): Dialogue {
  const d = DIALOGUES[id];
  if (!d) throw new Error(`Unknown dialogue: ${id}`);
  return d;
}

export const ALL_DIALOGUE_IDS = Object.keys(DIALOGUES);
