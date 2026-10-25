import type { Range } from './content';

/**
 * The seeded generator. Randomness comes from a generator created in
 * `startCampaign` from the seed and threaded explicitly — never a module-level
 * one, which would make two campaigns in one page load differ (ADR 0009
 * decision 3).
 *
 * It is a value rather than an object with hidden state, so that a campaign
 * stays an immutable value and `takeCommand` can return a new one without
 * cloning discipline. Drawing from it returns the number **and** the generator
 * to use next.
 *
 * Nothing in the walking skeleton draws from it: the first consumer is the
 * draw (#11). It is created and threaded from the first day so that it is
 * never retrofitted, which is what ADR 0009 decision 3 is guarding against.
 */
export type Rng = {
  readonly state: number;
};

export function rngFromSeed(seed: number): Rng {
  // Any 32-bit state will do; the algorithm is mulberry32, and ADR 0009 leaves
  // open whether the choice becomes part of the save format.
  return { state: seed >>> 0 };
}

/** A whole number in `[0, bound)`, with the generator to use next. */
export function drawInt(rng: Rng, bound: number): readonly [number, Rng] {
  if (!Number.isInteger(bound) || bound < 1) {
    throw new Error(`a draw needs a whole bound of at least 1, not ${bound}`);
  }
  const state = (rng.state + 0x6d2b79f5) >>> 0;
  let mixed = state;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  const drawn = (mixed ^ (mixed >>> 14)) >>> 0;
  return [drawn % bound, { state }];
}

/** A whole number inside a declared range, both ends included. */
export function drawWithin(range: Range, rng: Rng): readonly [number, Rng] {
  const [offset, next] = drawInt(rng, range.most - range.least + 1);
  return [range.least + offset, next];
}

/** One of a list, drawn from the generator. The list is never empty. */
export function drawFrom<T>(items: readonly T[], rng: Rng): readonly [T, Rng] {
  const [at, next] = drawInt(rng, items.length);
  const drawn = items[at];
  if (drawn === undefined) {
    throw new Error('a draw from an empty list, which the caller is meant to have ruled out');
  }
  return [drawn, next];
}

/** Whether something is hidden at a chance in whole percent, `0` to `100`. */
export function drawHidden(rng: Rng, percent: number): readonly [boolean, Rng] {
  const [rolled, next] = drawInt(rng, 100);
  return [rolled < percent, next];
}
