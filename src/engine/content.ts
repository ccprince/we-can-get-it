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

/** Where and when a campaign opens, and what the player opens it with. */
export type Start = {
  readonly locationId: string;
  readonly credits: number;
  readonly day: number;
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
 * A bound with two ends, both inclusive. Declared by the content set and
 * enforced by the validator (ADR 0007 decision 15); both ends are expected to
 * widen as the catalogue grows, which is why they are a config edit rather
 * than an argument.
 */
export type Range = {
  readonly least: number;
  readonly most: number;
};

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
  readonly calendar: Calendar;
  readonly locations: readonly Location[];
  readonly tags: readonly Tag[];
  readonly goods: readonly Good[];
  readonly start: Start;
};
