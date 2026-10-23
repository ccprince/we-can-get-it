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
  readonly start: Start;
};
