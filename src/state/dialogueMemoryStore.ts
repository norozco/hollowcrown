import { create } from 'zustand';

/**
 * Tracks how many times the player has initiated each dialogue, so NPCs
 * can vary their greetings instead of repeating the same opener forever.
 * Counts are bumped in dialogueStore.start() and read by a rewriter that
 * swaps the start-node text for familiar NPCs.
 *
 * Persistence lives alongside the rest of game state via save/load.
 */
interface DialogueMemoryState {
  /** Keyed by dialogue.id — value is the number of times start() has been called. */
  greetingCount: Record<string, number>;
  bump: (dialogueId: string) => void;
  getCount: (dialogueId: string) => number;
  reset: () => void;
  load: (snapshot: Record<string, number>) => void;
  snapshot: () => Record<string, number>;
}

export const useDialogueMemoryStore = create<DialogueMemoryState>((set, get) => ({
  greetingCount: {},
  bump: (dialogueId) =>
    set((s) => ({
      greetingCount: {
        ...s.greetingCount,
        [dialogueId]: (s.greetingCount[dialogueId] ?? 0) + 1,
      },
    })),
  getCount: (dialogueId) => get().greetingCount[dialogueId] ?? 0,
  reset: () => set({ greetingCount: {} }),
  load: (snapshot) => set({ greetingCount: { ...snapshot } }),
  snapshot: () => ({ ...get().greetingCount }),
}));

/**
 * Greeting pools per dialogue. Index 0 = first meeting (left as null to
 * fall through to the authored JSON). 2-3 uses casual, 4+ uses a "still
 * here?" rotation. Each returns the full replacement text for the start
 * node, or null if the authored text should be kept.
 */
interface GreetingPool {
  /** Casual pool used on visits 2-3 (0-indexed count of 1 or 2). */
  casual: string[];
  /** Familiar pool used on visits 4+ (count >= 3). */
  familiar: string[];
  /** Which node id within the Dialogue's `nodes` to rewrite. Usually
   *  the dialogue's `start` node, but guild-greeting uses "brenna-greet"
   *  because "intro" is narrator scene-setting. */
  targetNodeId: string;
}

const GREETING_POOLS: Record<string, GreetingPool> = {
  'guild-greeting': {
    targetNodeId: 'brenna-greet',
    casual: [
      "Back again. The ledger's right where you left it — pick your poison.",
      "You. Good. I was just about to mark you off as lost. What is it?",
    ],
    familiar: [
      "Still breathing, then. Small mercies. Anything for me?",
      "Oh — it's you. I'd recognize that boot-scrape anywhere. Speak.",
      "You know, at this point, I should just hand you the keys.",
    ],
  },
  'orric-greeting': {
    targetNodeId: 'orric-look',
    casual: [
      "You again. Sit if you like. Don't knock over the axe.",
      "Back from the woods in one piece. That's something.",
    ],
    familiar: [
      "You've worn a path to this porch. Say what you came to say.",
      "Still here? Some men never take the hint to keep walking.",
      "You're becoming a regular. I'm not sure that's a compliment.",
    ],
  },
  'kael-greeting': {
    targetNodeId: 'hello',
    casual: [
      "Back at the forge. Bring me something interesting this time?",
      "You again. Hammer's warm if you've got work.",
    ],
    familiar: [
      "Oh, it's you. Let me guess — more ore?",
      "Still haunting my forge. What's the ask?",
      "You spend more time here than I do. Almost.",
    ],
  },
  'veyrin-sanctum': {
    targetNodeId: 'veyrin-speaks',
    casual: [
      "You returned. I was not certain you would. Sit, if you wish.",
      "Again. The pages are quieter when you are here. Strange.",
    ],
    familiar: [
      "Oh — it is you. The book hums differently now. You have changed.",
      "Still walking the paths I cannot. Tell me what you have seen.",
      "You have become a constant. I did not expect constants again.",
    ],
  },
  'tomas-greeting': {
    targetNodeId: 'hello',
    casual: [
      "Back for another pint? The stew's fresh today.",
      "You again. Bed's yours if you need it, same price.",
    ],
    familiar: [
      "Oh, it's you. Your usual?",
      "Still in Ashenvale, eh? The roof hasn't fallen in yet — that's something.",
      "You know, I should just reserve a stool with your name on it.",
    ],
  },
};

/**
 * Given a loaded Dialogue and the current greeting count, return either
 * the original dialogue or a shallow-cloned version with the greeting
 * node's text rewritten. Never mutates the input.
 */
export function applyGreetingMemory<T extends { id: string; nodes: Record<string, { text: string } & Record<string, unknown>> }>(
  dialogue: T,
  count: number,
): T {
  const pool = GREETING_POOLS[dialogue.id];
  if (!pool) return dialogue;
  // count is the number of PRIOR starts, so:
  //   0 → first meeting, use authored text
  //   1-2 → casual
  //   3+ → familiar
  let replacement: string | null = null;
  if (count >= 1 && count <= 2) {
    replacement = pool.casual[(count - 1) % pool.casual.length];
  } else if (count >= 3) {
    replacement = pool.familiar[(count - 3) % pool.familiar.length];
  }
  if (!replacement) return dialogue;
  const node = dialogue.nodes[pool.targetNodeId];
  if (!node) return dialogue;
  return {
    ...dialogue,
    nodes: {
      ...dialogue.nodes,
      [pool.targetNodeId]: { ...node, text: replacement },
    },
  };
}
