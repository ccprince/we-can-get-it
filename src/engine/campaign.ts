import type { ContentSet, Ship } from './content';
import { draw } from './draw';
import type { DrawnGalaxy } from './galaxy';
import { learning, sightingHere, type Sighting } from './knowledge';
import { rngFromSeed, type Rng } from './rng';
import { stockShops, type Lot } from './stock';
import type { Problem } from './verdicts';

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
 * One **lane** flown as one departure. Its cost in days and in **fare** is
 * fixed when the player departs and the destination cannot be changed once
 * underway (ADR 0005 decisions 9 and 10, ADR 0006 decision 18).
 */
export type Leg = {
  readonly fromId: string;
  readonly toId: string;
  /** Days the leg takes, fixed at departure. */
  readonly days: number;
  /** Days of it already spent in **transit**. */
  readonly daysFlown: number;
};

/**
 * Where the player is: at a **location**, or in **transit**, which is a place
 * like any other for the purposes of a day (ADR 0005 decision 10). The two are
 * one type rather than two nullable fields so that being in both places at
 * once, or neither, cannot be written down.
 */
export type Whereabouts =
  | { readonly kind: 'at'; readonly locationId: string }
  | { readonly kind: 'in-transit'; readonly leg: Leg };

/** Units sold against one want. */
export type Delivery = {
  readonly want: string;
  readonly units: number;
};

/** Units of one good aboard, in the **hold**. */
export type Cargo = {
  readonly goodId: string;
  readonly quantity: number;
};

/**
 * A campaign is an immutable value and the engine's functions are pure
 * (ADR 0003 decision 1): `takeCommand` returns a new campaign, which is what
 * makes replay, the harness's many-seeds pass and a one-seed-two-settings
 * comparison free of cloning discipline.
 */
export type Campaign = {
  readonly content: ContentSet;
  /**
   * This campaign's galaxy, rolled from the seed at the start and fixed for the
   * campaign's whole length: nothing enters it afterwards (ADR 0008 decision
   * 3). Everywhere the player can be is a location in here.
   */
  readonly galaxy: DrawnGalaxy;
  readonly seed: number;
  readonly rng: Rng;
  readonly day: number;
  readonly where: Whereabouts;
  readonly credits: number;
  /**
   * The ship, which is what converts a **distance** into days and decides
   * whether **range** reaches. It is campaign state rather than a read of the
   * content set because **reach is bought with credits** (ADR 0006 decision 9,
   * ADR 0004 decision 15) — the purchase itself is outside this milestone.
   */
  readonly ship: Ship;
  /**
   * Every lot on sale in the galaxy, shop by shop in placement order. Stocked
   * at the start and depleted by buying; a lot bought out leaves this list for
   * the rest of the campaign.
   */
  readonly lots: readonly Lot[];
  /** What is in the **hold**: one entry a good, in the order each first came aboard. */
  readonly cargo: readonly Cargo[];
  /**
   * Units sold against each want sold to, by the id a sale names it with, in the
   * order each was first sold to. A want whose units reach its quantity is
   * **closed** for the rest of the campaign, and a grudging sale closes it at
   * once, so its entry then holds the whole quantity (ADR 0007 decision 11).
   */
  readonly delivered: readonly Delivery[];
  /**
   * The orders the player has accepted, by the id a sale names a want with, in
   * the order each was accepted. An accepted order stays here once filled or
   * lapsed; whether it can still be filled is read from the want.
   */
  readonly accepted: readonly string[];
  /**
   * What the player has seen of each place they have been, as last known, in
   * the order each was first seen. The **trade guide** reads it with an as-of
   * date on everything (ADR 0006 decision 17); a place never visited has no
   * entry, and nothing is ever removed.
   */
  readonly known: readonly Sighting[];
  /** The day that has just ended. Null until one has. */
  readonly digest: Digest | null;
};

/**
 * A campaign, or the problems that kept one from starting. The shape of
 * `LoadResult`, because a draw that exhausts its bounded re-roll is a content
 * defect like any the loader finds (ADR 0008 decision 17).
 */
export type StartResult =
  | { readonly ok: true; readonly campaign: Campaign }
  | { readonly ok: false; readonly problems: readonly Problem[] };

export function startCampaign(content: ContentSet, seed: number): StartResult {
  // The seed arrives here and nowhere else, and the draw is the first thing it
  // is spent on: the campaign begins at a location the draw placed, so the
  // generator the campaign carries is the one the draw left behind.
  const drawn = draw(content, rngFromSeed(seed));
  if (!drawn.ok) return { ok: false, problems: [drawn.problem] };
  const { galaxy } = drawn;
  const [lots, rng] = stockShops(galaxy, content, drawn.rng);

  const opening: Campaign = {
    content,
    galaxy,
    seed,
    rng,
    day: content.start.day,
    where: { kind: 'at', locationId: galaxy.startId },
    credits: content.start.credits,
    ship: content.start.ship,
    lots,
    cargo: [],
    delivered: [],
    accepted: [],
    known: [],
    digest: null,
  };

  // The player opens somewhere, and sees it.
  return { ok: true, campaign: learning(opening, sightingHere(opening, [])) };
}
