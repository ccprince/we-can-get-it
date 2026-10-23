/**
 * The shape of a content set, after it has been through the loader.
 *
 * Content is data the engine receives and never imports (ADR 0003 decision 2),
 * so nothing here is a constant: every number the engine needs is declared by
 * the content set it is handed.
 */

/** A month names a date and carries no mechanics (ADR 0005 decision 3). */
export type Month = {
  readonly name: string;
  readonly days: number;
};

/**
 * One galaxy-wide reckoning, perfectly regular, so that weekday follows from
 * the day index alone (ADR 0005 decision 2).
 */
export type Calendar = {
  readonly daysPerWeek: number;
  readonly weekdayNames: readonly string[];
  readonly months: readonly Month[];
  readonly firstYear: number;
};

/** A place on the chart, and an atomic node (ADR 0006 decision 6). */
export type Location = {
  readonly id: string;
  readonly name: string;
  readonly prose: string;
};

/**
 * The baseline ship, in the two of its three independent purchases the map
 * feels: **speed** is **distance** per day and **range** the largest distance
 * it can fly in one **leg** (ADR 0006 decision 9). The **hold** is the third,
 * and is #14's. Ship upgrades are outside this milestone, so the ship a
 * campaign opens with is the ship it has.
 */
export type Ship = {
  readonly speed: number;
  readonly range: number;
};

/** Where and when a campaign opens, and what the player opens it with. */
export type Start = {
  readonly locationId: string;
  readonly credits: number;
  readonly day: number;
  readonly ship: Ship;
};

/**
 * The only way between the two **locations** it joins (ADR 0006 decision 1).
 * Symmetric — one cost, the same both ways (decision 7) — and carrying one
 * authored number, its **distance**, from which days and **fare** are both
 * derived (decision 8).
 */
export type Lane = {
  readonly ends: readonly [string, string];
  readonly distance: number;
};

/**
 * The four classes a tag declares itself as (ADR 0007 decision 1). Making the
 * class first-class is what makes *goods per usable kind-tag* — the one number
 * the chunk turns on — a quantity the engine can report rather than a thing in
 * a writer's head.
 *
 * Only a **kind** is public vocabulary; a quality, origin or quirk tag is
 * named nowhere and is reached only through its **tell** (decision 3).
 */
export type TagClass = 'kind' | 'quality' | 'origin' | 'quirk';

export const tagClasses: readonly TagClass[] = ['kind', 'quality', 'origin', 'quirk'];

/** A property of a good that wants match against. A tag means one thing everywhere. */
export type Tag = {
  readonly id: string;
  readonly class: TagClass;
  /**
   * The kind of words a good's prose uses to signal this tag — `alcohol` →
   * brewed, distilled, proof. For every invisible tag the tell *is* the tag,
   * so every tag declares one (ADR 0007 decision 4).
   */
  readonly tells: readonly string[];
};

/**
 * A tradeable item in the catalogue. Carries exactly one **kind** tag, any
 * number of quality, origin and quirk tags within the bound its content set
 * declares, and one **worth** (ADR 0007 decisions 2 and 12).
 */
export type Good = {
  readonly id: string;
  readonly name: string;
  readonly prose: string;
  /** The id of the good's one kind-tag. */
  readonly kind: string;
  /** The ids of its quality, origin and quirk tags. The kind is not among them. */
  readonly tags: readonly string[];
  /**
   * The galaxy-wide anchor an offer is computed against — deliberately not a
   * tag and not a price (ADR 0007 decision 12).
   */
  readonly worth: number;
};

/**
 * One term of a want's predicate: a tag, or a negated tag. Negation stays
 * because a refusal stated in the **want** differs from one attached to the
 * buyer — "something warm, but god not another fur" is the want, not the
 * person (ADR 0007 decision 6).
 */
export type Term = {
  readonly tag: string;
  readonly negated: boolean;
};

/**
 * Something a buyer is after: a conjunction of terms, or one good by identity.
 * There is no disjunction — a want for "brandy or whisky" is a want for the
 * kind above them, which is what flat kinds with many goods each are for
 * (ADR 0007 decision 6).
 */
export type Want =
  | { readonly predicate: readonly Term[] }
  | { readonly goodId: string };

/**
 * Someone who wants something. **Bonus** and **refusal** are roles this buyer
 * holds a tag in rather than classes of tag, so they live here (ADR 0007
 * decision 7).
 */
export type Buyer = {
  readonly id: string;
  readonly name: string;
  readonly wants: readonly Want[];
  /** Tags this buyer pays more for. */
  readonly bonusTags: readonly string[];
  /** Tags that make this buyer say no. */
  readonly refusalTags: readonly string[];
};

/**
 * A bound with two ends, both inclusive. Declared by the content set and
 * enforced by the validator (ADR 0007 decision 15); both ends are expected to
 * widen as the catalogue grows, which is why they are a config edit rather
 * than an argument.
 */
export type Range = {
  readonly least: number;
  readonly most: number;
};

/** Whether a count sits inside a declared bound, both ends included. */
export function within(count: number, range: Range): boolean {
  return count >= range.least && count <= range.most;
}

/**
 * The location an id names. Every location id in a loaded content set names a
 * location the set holds — the loader has already refused the ones that do not
 * — so this is total for any content set that got past it.
 */
export function locationNamed(
  content: Pick<ContentSet, 'locations'>,
  locationId: string,
): Location {
  const location = content.locations.find((candidate) => candidate.id === locationId);
  if (location === undefined) {
    throw new Error(`${locationId} is not a location the content set holds`);
  }
  return location;
}

/**
 * The tags any buyer holds as a **bonus** or a **refusal**. A role is a
 * property of a buyer's relationship to a tag rather than a class of tag
 * (ADR 0007 decision 7), so this is the only way to ask which tags are in a
 * role at all — which both the spread bound and its distribution need.
 */
export function roleTags(content: Pick<ContentSet, 'buyers'>): ReadonlySet<string> {
  return new Set(content.buyers.flatMap((buyer) => [...buyer.bonusTags, ...buyer.refusalTags]));
}

/** How many goods carry a tag, whether as their one kind or among the rest. */
export function goodsCarrying(content: Pick<ContentSet, 'goods'>, tagId: string): number {
  return content.goods.filter((good) => good.kind === tagId || good.tags.includes(tagId)).length;
}

/**
 * What a content set declares about its own shape. The engine hardcodes none
 * of it (ADR 0007 decision 15): what transfers from the prototype is not the
 * numbers but the reason for the lower bound — a role must be a learnable
 * pattern, so more than one good.
 */
export type Bounds = {
  /** Tags on one good, the mandatory kind included. */
  readonly tagsPerGood: Range;
  /** Goods carrying a tag that any buyer uses as a bonus or a refusal. */
  readonly goodsPerRoleTag: Range;
  /** The goods a kind must carry to be **usable** (ADR 0007 decision 5). */
  readonly usabilityFloor: number;
  /** The most quirk tags the galaxy may hold (ADR 0007 decision 8). */
  readonly quirkRation: number;
};

export type ContentSet = {
  readonly bounds: Bounds;
  /**
   * The one galaxy-wide rate a **fare** is the **distance** times (ADR 0006
   * decision 10). Authored per-lane tariffs and regional rates were rejected
   * there, so there is exactly one of these in a galaxy.
   */
  readonly fareRate: number;
  readonly calendar: Calendar;
  readonly locations: readonly Location[];
  readonly lanes: readonly Lane[];
  readonly tags: readonly Tag[];
  readonly goods: readonly Good[];
  readonly buyers: readonly Buyer[];
  readonly start: Start;
};
