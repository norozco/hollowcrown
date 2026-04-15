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
}

const NPCS = npcsData as unknown as Record<string, NPC>;

/** Look up an NPC by key. Returns null for unknown keys (callers may
 *  want to gracefully handle missing NPCs rather than crash). */
export function getNPC(key: string): NPC | null {
  return NPCS[key] ?? null;
}

export const ALL_NPCS: readonly NPC[] = Object.values(NPCS);
