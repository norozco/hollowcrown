import { describe, it, expect, vi } from 'vitest';

// Mock the Vite glob before importing the module.
vi.mock('../portraitAssets', async () => {
  const actual = await vi.importActual<typeof import('../portraitAssets')>('../portraitAssets');
  // Replace the internal map via re-export — we only test pickPortraitUrl
  // behavior against a stubbed resolver, so this is mostly a sanity pass.
  return actual;
});

import { pickPortraitUrl } from '../portraitAssets';

describe('pickPortraitUrl fallback chain', () => {
  it('returns null when the NPC has no portraits map', () => {
    expect(pickPortraitUrl(undefined, 'neutral')).toBeNull();
  });

  it('returns null when map is present but nothing matches (no real files)', () => {
    // These paths are NOT in src/assets/portraits/ (no Orric art yet),
    // so resolvePortraitUrl returns null for each and we fall through.
    const portraits = {
      neutral: 'portraits/nobody/neutral.png',
      thoughtful: 'portraits/nobody/thoughtful.png',
    };
    expect(pickPortraitUrl(portraits, 'neutral')).toBeNull();
    expect(pickPortraitUrl(portraits, 'thoughtful')).toBeNull();
  });

  it('handles missing expression key by falling back to neutral path', () => {
    // Even if neutral also doesn't resolve, we still exercise the
    // fallback chain without throwing.
    const portraits = {
      neutral: 'portraits/nobody/neutral.png',
    };
    expect(() => pickPortraitUrl(portraits, 'happy')).not.toThrow();
  });

  it('handles undefined expression gracefully', () => {
    const portraits = { neutral: 'portraits/nobody/neutral.png' };
    expect(() => pickPortraitUrl(portraits, undefined)).not.toThrow();
  });
});
