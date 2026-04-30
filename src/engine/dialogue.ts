/**
 * Dialogue system — deterministic state machine on top of JSON-defined
 * dialogue trees. Nodes are authored content; the runtime walks them.
 *
 * A Dialogue is a graph of DialogueNodes keyed by id. Each node has a
 * speaker, a line of text, and either:
 *   - `choices`: the player picks one; the chosen option names the next
 *     node (or null to end the conversation).
 *   - `next`:    auto-advance to a named next node on Space/click.
 *   - neither:   the dialogue ends when the player advances this node.
 */

/** Special speaker tokens. "narrator" = no portrait; "player" = the PC. */
export type SpeakerKey = 'narrator' | 'player' | string;

export type Expression =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'shocked'
  | 'thoughtful';

/**
 * Conditions on a DialogueChoice that gate its visibility. If any
 * requirement is unmet, the choice is hidden from the player.
 *
 * Quest predicates read against `questStore.active`. The post-quest
 * predicates (level/rank/greeting-count/world-flag) read against the
 * extra `RequirementContext` passed alongside, so authoring stays
 * declarative — the dialogue JSON does not reach into Zustand stores.
 */
export type DialogueRequirement =
  | { type: 'quest-complete'; questId: string }
  | { type: 'quest-active'; questId: string }
  | { type: 'quest-not-started'; questId: string }
  | { type: 'quest-not-turned-in'; questId: string }
  /** Player level >= n (inclusive). */
  | { type: 'min-level'; level: number }
  /** Adventurer rank >= the named tier. Ranks are F < E < D < C < B < A. */
  | { type: 'min-rank'; rank: 'F' | 'E' | 'D' | 'C' | 'B' | 'A' }
  /** Adventurer rank < the named tier — used for "below C" defiant lines. */
  | { type: 'max-rank'; rank: 'F' | 'E' | 'D' | 'C' | 'B' | 'A' }
  /** dialogueMemoryStore.greetingCount[id] >= n (e.g. 3 = "you've earned this line"). */
  | { type: 'min-greeting-count'; dialogueId: string; count: number }
  /** A world-state flag stored either in localStorage or set explicitly. */
  | { type: 'world-flag'; key: string };

export interface DialogueChoice {
  text: string;
  /** The id of the next node, or null to end the dialogue on this choice. */
  next: string | null;
  /** If present, ALL requirements must hold for the choice to be shown. */
  requires?: readonly DialogueRequirement[];
}

/**
 * Side-effects fired by the dialogue runtime when a node is entered.
 * Effects are idempotent — re-entering the same node fires them again,
 * but receivers (e.g. questStore) treat repeated calls as no-ops, so
 * the player can revisit dialogue without breaking progress.
 *
 * For reward effects (give-gold / give-xp), idempotency is enforced at
 * the authoring level: put rewards on a node only reachable via a
 * choice gated with `quest-not-turned-in`, and pair with `turn-in-quest`
 * so the gate flips closed after the first visit.
 */
export type DialogueEffect =
  | { type: 'accept-quest'; questId: string }
  | { type: 'complete-objective'; questId: string; objectiveId: string }
  | { type: 'turn-in-quest'; questId: string }
  | { type: 'give-gold'; amount: number }
  | { type: 'spend-gold'; amount: number }
  | { type: 'give-xp'; amount: number }
  | { type: 'remove-items'; itemKey: string; quantity: number }
  | { type: 'hire-companion'; companionKey: string }
  /** Set a world-state flag (localStorage `key=true`). Read by the
   *  `world-flag` requirement and by scene code that already inspects
   *  the same `hc_*` keys. Idempotent — re-fires safely. */
  | { type: 'set-flag'; key: string };

/**
 * Snapshot of the player + world data that non-quest requirements read
 * against. Kept narrow on purpose so the predicate evaluator stays pure
 * and tests can build minimal fixtures.
 */
export interface RequirementContext {
  /** Player level (1-20). */
  level?: number;
  /** Current adventurer rank key (F | E | D | C | B | A). */
  rank?: 'F' | 'E' | 'D' | 'C' | 'B' | 'A';
  /** Greeting count per dialogue id from dialogueMemoryStore. */
  greetingCounts?: Readonly<Record<string, number>>;
  /** World-state flags. Predicate is true if the key is present + truthy. */
  worldFlags?: Readonly<Record<string, boolean>>;
}

const RANK_ORDER: Record<'F' | 'E' | 'D' | 'C' | 'B' | 'A', number> = {
  F: 0, E: 1, D: 2, C: 3, B: 4, A: 5,
};

/**
 * Pure evaluator — given a map of {questId → {isComplete, turnedIn}}
 * and an optional RequirementContext, return whether the requirement
 * holds. Works on the QuestState shape from questStore.active without
 * importing the store.
 */
export function meetsRequirement(
  req: DialogueRequirement,
  quests: Readonly<Record<string, { isComplete: boolean; turnedIn: boolean }>>,
  ctx?: RequirementContext,
): boolean {
  switch (req.type) {
    case 'quest-complete': {
      const q = quests[req.questId];
      return q !== undefined && q.isComplete;
    }
    case 'quest-active': {
      const q = quests[req.questId];
      return q !== undefined && !q.isComplete;
    }
    case 'quest-not-started': {
      const q = quests[req.questId];
      return q === undefined;
    }
    case 'quest-not-turned-in': {
      const q = quests[req.questId];
      return q !== undefined && !q.turnedIn;
    }
    case 'min-level':
      return (ctx?.level ?? 0) >= req.level;
    case 'min-rank':
      return ctx?.rank !== undefined && RANK_ORDER[ctx.rank] >= RANK_ORDER[req.rank];
    case 'max-rank':
      // Strictly below — "max-rank C" means rank is F/E/D, NOT C.
      return ctx?.rank !== undefined && RANK_ORDER[ctx.rank] < RANK_ORDER[req.rank];
    case 'min-greeting-count':
      return (ctx?.greetingCounts?.[req.dialogueId] ?? 0) >= req.count;
    case 'world-flag':
      return !!ctx?.worldFlags?.[req.key];
  }
}

export function meetsAllRequirements(
  reqs: readonly DialogueRequirement[] | undefined,
  quests: Readonly<Record<string, { isComplete: boolean; turnedIn: boolean }>>,
  ctx?: RequirementContext,
): boolean {
  if (!reqs || reqs.length === 0) return true;
  return reqs.every((r) => meetsRequirement(r, quests, ctx));
}

export interface DialogueNode {
  id: string;
  speaker: SpeakerKey;
  /** Optional emotion/expression hint; defaults to neutral. */
  expression?: Expression;
  text: string;
  /** Player choices. Mutually exclusive with `next`. */
  choices?: DialogueChoice[];
  /** Auto-advance target. Mutually exclusive with `choices`. */
  next?: string;
  /** Side effects that fire when the dialogue runtime ENTERS this node. */
  effects?: DialogueEffect[];
}

export interface Dialogue {
  id: string;
  /** Node id to start at. */
  start: string;
  nodes: Record<string, DialogueNode>;
}

/** Runtime state of an in-progress dialogue. */
export interface DialogueState {
  dialogueId: string;
  currentNodeId: string;
  /** Stack of node ids visited, newest last. Useful for debug/history. */
  history: readonly string[];
}

/** Create a fresh DialogueState positioned at a Dialogue's start node. */
export function startDialogue(dialogue: Dialogue): DialogueState {
  if (!dialogue.nodes[dialogue.start]) {
    throw new Error(
      `Dialogue "${dialogue.id}" has no start node "${dialogue.start}"`,
    );
  }
  return {
    dialogueId: dialogue.id,
    currentNodeId: dialogue.start,
    history: [dialogue.start],
  };
}

/** Look up the current node given the state and the Dialogue source. */
export function currentNode(dialogue: Dialogue, state: DialogueState): DialogueNode {
  const node = dialogue.nodes[state.currentNodeId];
  if (!node) {
    throw new Error(
      `Dialogue "${dialogue.id}" has no node "${state.currentNodeId}"`,
    );
  }
  return node;
}

/**
 * Advance past a node that has a `next` pointer. Throws if the current
 * node expects a choice. Returns null if there's no next (end of line).
 */
export function advance(
  dialogue: Dialogue,
  state: DialogueState,
): DialogueState | null {
  const node = currentNode(dialogue, state);
  if (node.choices && node.choices.length > 0) {
    throw new Error(
      `Cannot auto-advance node "${node.id}" — it requires a choice`,
    );
  }
  if (!node.next) return null;
  return {
    ...state,
    currentNodeId: node.next,
    history: [...state.history, node.next],
  };
}

/**
 * Apply the player's choice at a branching node. Returns null if the
 * choice ends the dialogue; throws if the node has no choices or the
 * index is out of range.
 */
export function choose(
  dialogue: Dialogue,
  state: DialogueState,
  choiceIndex: number,
): DialogueState | null {
  const node = currentNode(dialogue, state);
  if (!node.choices || node.choices.length === 0) {
    throw new Error(`Node "${node.id}" has no choices`);
  }
  const choice = node.choices[choiceIndex];
  if (!choice) {
    throw new Error(
      `Node "${node.id}" has no choice at index ${choiceIndex}`,
    );
  }
  if (choice.next === null) return null;
  return {
    ...state,
    currentNodeId: choice.next,
    history: [...state.history, choice.next],
  };
}

/** Does the current node require the player to pick a choice? */
export function awaitsChoice(
  dialogue: Dialogue,
  state: DialogueState,
): boolean {
  const node = currentNode(dialogue, state);
  return !!(node.choices && node.choices.length > 0);
}

/** Is the current node a terminal (no next, no choices)? */
export function isTerminal(
  dialogue: Dialogue,
  state: DialogueState,
): boolean {
  const node = currentNode(dialogue, state);
  return !node.next && (!node.choices || node.choices.length === 0);
}
