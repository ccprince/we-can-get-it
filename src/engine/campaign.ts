import type { ContentSet, Ship } from './content';
import { rngFromSeed, type Rng } from './rng';

/** An entry in a day's digest: one piece of change that reached the player. */
export type DigestEntry = {
  readonly text: string;
};

/** What the day boundary hands the player (ADR 0005 decision 8). */
export type Digest = {
  readonly day: number;
  readonly entries: readonly DigestEntry[];
};

/**
 * A campaign is an immutable value and the engine's functions are pure
 * (ADR 0003 decision 1): `takeCommand` returns a new campaign, which is what
 * makes replay, the harness's many-seeds pass and a one-seed-two-settings
 * comparison free of cloning discipline.
 */
export type Campaign = {
  readonly content: ContentSet;
  readonly seed: number;
  readonly rng: Rng;
  readonly day: number;
  readonly locationId: string;
  readonly credits: number;
  /**
   * The ship, which is what converts a **distance** into days and decides
   * whether **range** reaches. It is campaign state rather than a read of the
   * content set because **reach is bought with credits** (ADR 0006 decision 9,
   * ADR 0004 decision 15) — the purchase itself is outside this milestone.
   */
  readonly ship: Ship;
  /** The day that has just ended. Null until one has. */
  readonly digest: Digest | null;
};

export function startCampaign(content: ContentSet, seed: number): Campaign {
  return {
    content,
    seed,
    rng: rngFromSeed(seed),
    day: content.start.day,
    locationId: content.start.locationId,
    credits: content.start.credits,
    ship: content.start.ship,
    digest: null,
  };
}
