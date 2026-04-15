import { describe, it, expect } from 'vitest';
import {
  completeObjective,
  currentObjective,
  startQuest,
  turnInQuest,
  type Quest,
} from '../quest';
import { getQuest, ALL_QUEST_IDS } from '../quests';

const sample: Quest = {
  id: 'sample',
  title: 'Sample Quest',
  summary: 'A test.',
  objectives: [
    { id: 'a', description: 'Do A' },
    { id: 'b', description: 'Do B' },
    { id: 'c', description: 'Do C' },
  ],
};

describe('startQuest', () => {
  it('returns fresh state pointing at the first objective', () => {
    const s = startQuest(sample, 1000);
    expect(s.questId).toBe('sample');
    expect(s.completedObjectiveIds).toEqual([]);
    expect(s.isComplete).toBe(false);
    expect(s.turnedIn).toBe(false);
    expect(s.acceptedAt).toBe(1000);
  });

  it('throws on a quest with zero objectives', () => {
    expect(() =>
      startQuest({ id: 'x', title: 'x', summary: 'x', objectives: [] }),
    ).toThrow();
  });
});

describe('completeObjective', () => {
  it('marks an objective complete', () => {
    const s1 = startQuest(sample);
    const s2 = completeObjective(sample, s1, 'a');
    expect(s2.completedObjectiveIds).toEqual(['a']);
    expect(s2.isComplete).toBe(false);
  });

  it('is idempotent on repeated completion', () => {
    const s1 = startQuest(sample);
    const s2 = completeObjective(sample, s1, 'a');
    const s3 = completeObjective(sample, s2, 'a');
    expect(s3).toBe(s2);
  });

  it('ignores unknown objective ids', () => {
    const s1 = startQuest(sample);
    const s2 = completeObjective(sample, s1, 'nope');
    expect(s2).toBe(s1);
  });

  it('marks the quest complete when every objective is done', () => {
    let s = startQuest(sample);
    s = completeObjective(sample, s, 'a');
    s = completeObjective(sample, s, 'b');
    s = completeObjective(sample, s, 'c');
    expect(s.isComplete).toBe(true);
  });

  it('completes regardless of completion order', () => {
    let s = startQuest(sample);
    s = completeObjective(sample, s, 'c');
    s = completeObjective(sample, s, 'a');
    s = completeObjective(sample, s, 'b');
    expect(s.isComplete).toBe(true);
    expect(s.completedObjectiveIds).toEqual(['c', 'a', 'b']);
  });
});

describe('currentObjective', () => {
  it('returns the first incomplete objective', () => {
    const s1 = startQuest(sample);
    expect(currentObjective(sample, s1)?.id).toBe('a');
    const s2 = completeObjective(sample, s1, 'a');
    expect(currentObjective(sample, s2)?.id).toBe('b');
  });

  it('returns null when the quest is complete', () => {
    let s = startQuest(sample);
    s = completeObjective(sample, s, 'a');
    s = completeObjective(sample, s, 'b');
    s = completeObjective(sample, s, 'c');
    expect(currentObjective(sample, s)).toBeNull();
  });

  it('skips out-of-order completions correctly', () => {
    const s1 = startQuest(sample);
    const s2 = completeObjective(sample, s1, 'b');
    // 'a' is still incomplete — should be the current one.
    expect(currentObjective(sample, s2)?.id).toBe('a');
  });
});

describe('turnInQuest', () => {
  it('throws if quest is not complete', () => {
const s = startQuest(sample);
    expect(() => turnInQuest(s)).toThrow();
  });

  it('marks a completed quest as turned in', () => {
let s = startQuest(sample);
    s = completeObjective(sample, s, 'a');
    s = completeObjective(sample, s, 'b');
    s = completeObjective(sample, s, 'c');
    expect(s.turnedIn).toBe(false);
    const t = turnInQuest(s);
    expect(t.turnedIn).toBe(true);
  });

  it('is idempotent once turned in', () => {
let s = startQuest(sample);
    s = completeObjective(sample, s, 'a');
    s = completeObjective(sample, s, 'b');
    s = completeObjective(sample, s, 'c');
    const t = turnInQuest(s);
    const t2 = turnInQuest(t);
    expect(t2).toBe(t);
  });
});

describe('Quest registry', () => {
  it('loads at least the iron-token quest', () => {
    expect(ALL_QUEST_IDS).toContain('iron-token');
  });

  it('iron-token has the expected shape', () => {
    const q = getQuest('iron-token');
    expect(q.title).toMatch(/Iron Token/);
    expect(q.objectives.length).toBeGreaterThanOrEqual(1);
    expect(q.objectives.every((o) => o.id && o.description)).toBe(true);
  });

  it('throws on unknown quest id', () => {
    expect(() => getQuest('not-a-quest')).toThrow();
  });
});
