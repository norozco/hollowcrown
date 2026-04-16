import npcsData from '../data/npcs.json';

export interface NPC {
  key: string;
  name: string;
  title: string;
  /** Background color for the placeholder portrait circle. */
  portraitColor: string;
  /** Foreground/accent color for the portrait initial and name label. */
  accentColor: string;
  description: string;
  /**
   * Optional map from expression key (neutral / happy / sad / angry /
   * shocked / thoughtful) to an asset path RELATIVE to `src/assets/`
   * (e.g. `"portraits/brenna/neutral.png"`). When present, the dialogue
   * UI renders the real portrait; when absent, it falls back to the
   * placeholder colored circle. Partial maps are fine — missing
   * expressions fall back to `neutral`, and a missing `neutral`
   * falls back to the placeholder.
   */
  portraits?: Record<string, string>;
}

const NPCS = npcsData as unknown as Record<string, NPC>;

/** Look up an NPC by key. Returns null for unknown keys (callers may
 *  want to gracefully handle missing NPCs rather than crash). */
export function getNPC(key: string): NPC | null {
  return NPCS[key] ?? null;
}

export const ALL_NPCS: readonly NPC[] = Object.values(NPCS);
