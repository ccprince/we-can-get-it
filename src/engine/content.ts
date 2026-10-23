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

export type ContentSet = {
  readonly calendar: Calendar;
  readonly locations: readonly Location[];
  readonly start: Start;
};
