/**
 * Deterministic dice engine. All randomness in gameplay flows through
 * this module so it can be seeded for tests, replays, and (eventually)
 * multiplayer synchronization.
 *
 * Uses Mulberry32 — a small, fast 32-bit PRNG that's good enough for
 * game simulation (not cryptographic).
 */

/** Compute D&D-style ability-score modifier: floor((stat - 10) / 2). */
export function modifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}

export class DiceRoller {
  private rng: () => number;

  /**
   * @param seed  Optional seed. If omitted, uses Math.random (non-deterministic).
   */
  constructor(seed?: number) {
    this.rng = seed !== undefined ? mulberry32(seed) : Math.random;
  }

  /** Roll a single die with `sides` faces. Returns an integer in [1, sides]. */
  d(sides: number): number {
    if (!Number.isInteger(sides) || sides < 1) {
      throw new Error(`Invalid die sides: ${sides}`);
    }
    return Math.floor(this.rng() * sides) + 1;
  }

  /** Roll `count` dice of `sides` each; returns an array of individual results. */
  roll(count: number, sides: number): number[] {
    if (!Number.isInteger(count) || count < 0) {
      throw new Error(`Invalid dice count: ${count}`);
    }
    const out: number[] = [];
    for (let i = 0; i < count; i++) out.push(this.d(sides));
    return out;
  }

  /** Roll `count`d`sides` and return the sum. */
  sum(count: number, sides: number): number {
    return this.roll(count, sides).reduce((a, b) => a + b, 0);
  }

  /** Standard D&D stat roll: 4d6, drop the lowest die. Returns [3, 18]. */
  rollStat(): number {
    const rolls = this.roll(4, 6).sort((a, b) => b - a);
    return rolls[0] + rolls[1] + rolls[2];
  }

  /** Roll six stats (STR/DEX/CON/INT/WIS/CHA order) using rollStat(). */
  rollStatBlock(): number[] {
    return Array.from({ length: 6 }, () => this.rollStat());
  }

  /**
   * Parse standard dice notation: "d20", "2d6", "2d6+3", "1d8-1".
   * Returns the summed result.
   */
  parse(notation: string): number {
    const trimmed = notation.trim().toLowerCase();
    const match = trimmed.match(/^(\d*)d(\d+)([+-]\d+)?$/);
    if (!match) throw new Error(`Invalid dice notation: "${notation}"`);
    const count = match[1] === '' ? 1 : parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    const mod = match[3] ? parseInt(match[3], 10) : 0;
    return this.sum(count, sides) + mod;
  }
}

/**
 * Mulberry32 — a tiny, seedable PRNG. Not cryptographic; perfect for
 * games. Produces the same sequence for the same seed.
 */
function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return function () {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
