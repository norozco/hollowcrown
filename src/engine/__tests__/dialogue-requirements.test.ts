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
