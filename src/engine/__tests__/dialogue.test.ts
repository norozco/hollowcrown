import { describe, it, expect } from 'vitest';
import {
  advance,
  awaitsChoice,
  choose,
  currentNode,
  isTerminal,
  startDialogue,
  type Dialogue,
} from '../dialogue';

const sample: Dialogue = {
  id: 'test',
  start: 'a',
  nodes: {
    a: { id: 'a', speaker: 'brenna', text: 'Line A', next: 'b' },
    b: {
      id: 'b',
      speaker: 'brenna',
      text: 'Pick one',
      choices: [
        { text: 'Option 1', next: 'c' },
        { text: 'Option 2', next: 'd' },
        { text: 'Option 3', next: null },
      ],
    },
    c: { id: 'c', speaker: 'brenna', text: 'You chose 1' },
    d: { id: 'd', speaker: 'brenna', text: 'You chose 2', next: 'c' },
  },
};

describe('startDialogue', () => {
  it('positions at the start node', () => {
    const s = startDialogue(sample);
    expect(s.currentNodeId).toBe('a');
    expect(s.history).toEqual(['a']);
  });

  it('throws if start node is missing', () => {
    expect(() =>
      startDialogue({
        id: 'broken',
        start: 'missing',
        nodes: { other: { id: 'other', speaker: 'x', text: 'ok' } },
      }),
    ).toThrow();
  });
});

describe('currentNode', () => {
  it('returns the node at currentNodeId', () => {
    const s = startDialogue(sample);
    expect(currentNode(sample, s).text).toBe('Line A');
  });

  it('throws if currentNodeId is invalid', () => {
    const s = { dialogueId: 'test', currentNodeId: 'nope', history: [] };
    expect(() => currentNode(sample, s)).toThrow();
  });
});

describe('advance', () => {
  it('moves along a next pointer', () => {
    const s1 = startDialogue(sample);
    const s2 = advance(sample, s1)!;
    expect(s2.currentNodeId).toBe('b');
    expect(s2.history).toEqual(['a', 'b']);
  });

  it('throws when the node has choices', () => {
    const s1 = startDialogue(sample);
    const s2 = advance(sample, s1)!; // now at 'b'
    expect(() => advance(sample, s2)).toThrow();
  });

  it('returns null on terminal node', () => {
    const s1 = startDialogue(sample);
    const s2 = advance(sample, s1)!;
    const s3 = choose(sample, s2, 0)!; // 'c', terminal
    expect(advance(sample, s3)).toBeNull();
  });
});

describe('choose', () => {
  it('follows the selected branch', () => {
    const s1 = startDialogue(sample);
    const s2 = advance(sample, s1)!;
    const s3 = choose(sample, s2, 0)!;
    expect(s3.currentNodeId).toBe('c');
    expect(s3.history).toEqual(['a', 'b', 'c']);
  });

  it('returns null when choice ends dialogue', () => {
    const s1 = startDialogue(sample);
    const s2 = advance(sample, s1)!;
    expect(choose(sample, s2, 2)).toBeNull();
  });

  it('throws on invalid choice index', () => {
    const s1 = startDialogue(sample);
    const s2 = advance(sample, s1)!;
    expect(() => choose(sample, s2, 99)).toThrow();
    expect(() => choose(sample, s2, -1)).toThrow();
  });

  it('throws when node has no choices', () => {
    const s1 = startDialogue(sample);
    expect(() => choose(sample, s1, 0)).toThrow();
  });
});

describe('awaitsChoice / isTerminal', () => {
  it('awaitsChoice is true only on branching nodes', () => {
    const s1 = startDialogue(sample);
    expect(awaitsChoice(sample, s1)).toBe(false);
    const s2 = advance(sample, s1)!;
    expect(awaitsChoice(sample, s2)).toBe(true);
  });

  it('isTerminal detects dead-end nodes', () => {
    const s1 = startDialogue(sample);
    expect(isTerminal(sample, s1)).toBe(false); // has next
    const s2 = advance(sample, s1)!;
    expect(isTerminal(sample, s2)).toBe(false); // has choices
    const s3 = choose(sample, s2, 0)!;
    expect(isTerminal(sample, s3)).toBe(true); // 'c' — no next, no choices
  });
});
