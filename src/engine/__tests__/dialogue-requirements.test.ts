import { describe, it, expect } from 'vitest';
import {
  meetsRequirement,
  meetsAllRequirements,
  type DialogueRequirement,
} from '../dialogue';

const qs = (overrides: Record<string, { isComplete?: boolean; turnedIn?: boolean }> = {}) =>
  Object.fromEntries(
    Object.entries(overrides).map(([k, v]) => [
      k,
      { isComplete: v.isComplete ?? false, turnedIn: v.turnedIn ?? false },
    ]),
  );

describe('meetsRequirement', () => {
  describe('quest-not-started', () => {
    const req: DialogueRequirement = { type: 'quest-not-started', questId: 'iron-token' };
    it('true when quest absent', () => {
      expect(meetsRequirement(req, qs())).toBe(true);
    });
    it('false when quest is accepted', () => {
      expect(meetsRequirement(req, qs({ 'iron-token': { isComplete: false } }))).toBe(false);
    });
  });

  describe('quest-active', () => {
    const req: DialogueRequirement = { type: 'quest-active', questId: 'iron-token' };
    it('false when absent', () => {
      expect(meetsRequirement(req, qs())).toBe(false);
    });
    it('true when accepted but incomplete', () => {
      expect(meetsRequirement(req, qs({ 'iron-token': { isComplete: false } }))).toBe(true);
    });
    it('false when complete', () => {
      expect(meetsRequirement(req, qs({ 'iron-token': { isComplete: true } }))).toBe(false);
    });
  });

  describe('quest-complete', () => {
    const req: DialogueRequirement = { type: 'quest-complete', questId: 'iron-token' };
    it('false when absent', () => {
      expect(meetsRequirement(req, qs())).toBe(false);
    });
    it('false when incomplete', () => {
      expect(meetsRequirement(req, qs({ 'iron-token': { isComplete: false } }))).toBe(false);
    });
    it('true when complete (regardless of turnedIn)', () => {
      expect(
        meetsRequirement(req, qs({ 'iron-token': { isComplete: true, turnedIn: false } })),
      ).toBe(true);
      expect(
        meetsRequirement(req, qs({ 'iron-token': { isComplete: true, turnedIn: true } })),
      ).toBe(true);
    });
  });

  describe('quest-not-turned-in', () => {
    const req: DialogueRequirement = { type: 'quest-not-turned-in', questId: 'iron-token' };
    it('false when absent', () => {
      expect(meetsRequirement(req, qs())).toBe(false);
    });
    it('true when present but not turned in', () => {
      expect(
        meetsRequirement(req, qs({ 'iron-token': { isComplete: true, turnedIn: false } })),
      ).toBe(true);
    });
    it('false when turned in', () => {
      expect(
        meetsRequirement(req, qs({ 'iron-token': { isComplete: true, turnedIn: true } })),
      ).toBe(false);
    });
  });
});

describe('meetsAllRequirements', () => {
  it('true when no requirements are listed', () => {
    expect(meetsAllRequirements(undefined, qs())).toBe(true);
    expect(meetsAllRequirements([], qs())).toBe(true);
  });

  it('requires every listed requirement to hold', () => {
    const reqs: DialogueRequirement[] = [
      { type: 'quest-complete', questId: 'iron-token' },
      { type: 'quest-not-turned-in', questId: 'iron-token' },
    ];
    expect(
      meetsAllRequirements(
        reqs,
        qs({ 'iron-token': { isComplete: true, turnedIn: false } }),
      ),
    ).toBe(true);
    expect(
      meetsAllRequirements(
        reqs,
        qs({ 'iron-token': { isComplete: true, turnedIn: true } }),
      ),
    ).toBe(false);
    expect(meetsAllRequirements(reqs, qs())).toBe(false);
  });
});

describe('post-quest predicates', () => {
  describe('min-level', () => {
    const req: DialogueRequirement = { type: 'min-level', level: 10 };
    it('false when player level is below threshold', () => {
      expect(meetsRequirement(req, qs(), { level: 7 })).toBe(false);
    });
    it('true at exactly the threshold', () => {
      expect(meetsRequirement(req, qs(), { level: 10 })).toBe(true);
    });
    it('true above threshold', () => {
      expect(meetsRequirement(req, qs(), { level: 17 })).toBe(true);
    });
    it('false when level is missing from context', () => {
      expect(meetsRequirement(req, qs(), {})).toBe(false);
    });
  });

  describe('min-rank', () => {
    const req: DialogueRequirement = { type: 'min-rank', rank: 'C' };
    it('false at rank E', () => {
      expect(meetsRequirement(req, qs(), { rank: 'E' })).toBe(false);
    });
    it('true at exactly rank C', () => {
      expect(meetsRequirement(req, qs(), { rank: 'C' })).toBe(true);
    });
    it('true at rank A (above)', () => {
      expect(meetsRequirement(req, qs(), { rank: 'A' })).toBe(true);
    });
  });

  describe('max-rank (strict less-than)', () => {
    const req: DialogueRequirement = { type: 'max-rank', rank: 'C' };
    it('true at rank E (below)', () => {
      expect(meetsRequirement(req, qs(), { rank: 'E' })).toBe(true);
    });
    it('false at exactly rank C', () => {
      expect(meetsRequirement(req, qs(), { rank: 'C' })).toBe(false);
    });
    it('false at rank A', () => {
      expect(meetsRequirement(req, qs(), { rank: 'A' })).toBe(false);
    });
  });

  describe('min-greeting-count', () => {
    const req: DialogueRequirement = {
      type: 'min-greeting-count', dialogueId: 'tomas-greeting', count: 3,
    };
    it('false when never greeted', () => {
      expect(meetsRequirement(req, qs(), {})).toBe(false);
    });
    it('false at 2 prior greetings', () => {
      expect(
        meetsRequirement(req, qs(), { greetingCounts: { 'tomas-greeting': 2 } }),
      ).toBe(false);
    });
    it('true once threshold is reached', () => {
      expect(
        meetsRequirement(req, qs(), { greetingCounts: { 'tomas-greeting': 3 } }),
      ).toBe(true);
    });
  });

  describe('world-flag', () => {
    const req: DialogueRequirement = { type: 'world-flag', key: 'hc_mira_recovered' };
    it('false when flag absent', () => {
      expect(meetsRequirement(req, qs(), {})).toBe(false);
    });
    it('true when flag is set truthy', () => {
      expect(
        meetsRequirement(req, qs(), { worldFlags: { hc_mira_recovered: true } }),
      ).toBe(true);
    });
    it('false when flag is set falsy', () => {
      expect(
        meetsRequirement(req, qs(), { worldFlags: { hc_mira_recovered: false } }),
      ).toBe(false);
    });
  });
});
