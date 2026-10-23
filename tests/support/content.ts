import { loadContent } from '../../src/engine';
import type { ContentSet } from '../../src/engine';

/**
 * Fixture builders for purpose-built content sets (ADR 0003 decision 5).
 *
 * The default for a new content field is added **here, once**, so adding a
 * field never means editing every fixture. Each builder owns the defaults for
 * its own node; tests state only the field under test.
 */

export type RawObject = Record<string, unknown>;

/** A calendar whose months are a whole number of weeks (ADR 0005 decision 2). */
export function aCalendar(overrides: RawObject = {}): RawObject {
  return {
    daysPerWeek: 6,
    weekdayNames: ['Firstday', 'Seconday', 'Thirdday', 'Fourthday', 'Fifthday', 'Marketday'],
    months: [
      { name: 'Thessaly', days: 30 },
      { name: 'Ambit', days: 30 },
    ],
    firstYear: 1,
    ...overrides,
  };
}

export function aLocation(overrides: RawObject = {}): RawObject {
  return {
    id: 'kestrel',
    name: 'Kestrel Reach',
    prose: 'A yard town that has outlived three owners and kept all their paperwork.',
    ...overrides,
  };
}

export function aStart(overrides: RawObject = {}): RawObject {
  return {
    locationId: 'kestrel',
    // Placeholder, to be measured. No prototype number is a starting point
    // (CLAUDE.md).
    credits: 180,
    day: 1,
    ...overrides,
  };
}

/**
 * The bounds a content set declares for the validator to enforce (ADR 0007
 * decision 15). Every number here is a placeholder to be measured; the engine
 * holds none of them.
 */
export function aBounds(overrides: RawObject = {}): RawObject {
  return {
    tagsPerGood: { least: 1, most: 5 },
    goodsPerRoleTag: { least: 2, most: 8 },
    usabilityFloor: 2,
    quirkRation: 2,
    ...overrides,
  };
}

/** The trivial content set of #7: one location, no goods. */
export function aContentSet(overrides: RawObject = {}): RawObject {
  return {
    bounds: aBounds(),
    calendar: aCalendar(),
    locations: [aLocation()],
    tags: [],
    goods: [],
    buyers: [],
    start: aStart(),
    ...overrides,
  };
}

/**
 * A loaded content set, for the tests whose subject is the campaign rather
 * than the loader. A fixture that will not load is a broken fixture, so this
 * throws rather than returning a verdict.
 */
export function loadedContentSet(overrides: RawObject = {}): ContentSet {
  const result = loadContent(aContentSet(overrides));
  if (!result.ok) {
    throw new Error(`fixture content set did not load: ${JSON.stringify(result.problems)}`);
  }
  return result.content;
}
