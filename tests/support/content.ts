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
    archetype: 'market',
    ...overrides,
  };
}

/**
 * What a content set declares about its own **draw**: the **motif count**,
 * which is the one dial (ADR 0008 decision 5), and how far apart the motifs it
 * places are strung. Both are placeholders to be measured.
 */
export function aDraw(overrides: RawObject = {}): RawObject {
  return {
    motifsPerCampaign: 1,
    interMotifDistance: { least: 14, most: 18 },
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
    ship: aShip(),
    ...overrides,
  };
}

/**
 * The baseline ship: **speed** is distance per day and **range** the largest
 * distance it can fly in one leg (ADR 0006 decision 9). Both are placeholders
 * to be measured, and both are chosen here so `aLane`'s distance is within
 * range and takes more than one day — the case a test about travel wants.
 */
export function aShip(overrides: RawObject = {}): RawObject {
  return {
    speed: 4,
    range: 20,
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

/** The trivial content set of #7: one location, no lanes, no goods. */
export function aContentSet(overrides: RawObject = {}): RawObject {
  return {
    bounds: aBounds(),
    // Credits per unit of distance, galaxy-wide (ADR 0006 decision 10). A
    // placeholder, like every number in a fixture.
    fareRate: 10,
    calendar: aCalendar(),
    // The short enumerated list a location is authored with and a slot types
    // against (ADR 0007 decision 17, ADR 0008 decision 1).
    archetypes: ['market', 'extractor', 'processor'],
    draw: aDraw(),
    locations: [aLocation()],
    lanes: [],
    tags: [],
    goods: [],
    buyers: [],
    start: aStart(),
    ...overrides,
  };
}

/** A lane, carrying the one authored number it has (ADR 0006 decision 8). */
export function aLane(overrides: RawObject = {}): RawObject {
  return {
    ends: ['kestrel', 'bellwether'],
    distance: 12,
    ...overrides,
  };
}

/**
 * Two locations and the lane between them: the smallest galaxy that can be
 * flown. Spread over `aContentSet`, which holds one location and no lanes by
 * default — the trivial content set of #7 goes nowhere.
 */
export function aGalaxy(overrides: RawObject = {}): RawObject {
  return {
    locations: [
      aLocation(),
      aLocation({
        id: 'bellwether',
        name: 'Bellwether Yards',
        prose: 'A repair yard that outgrew its own harbour and never admitted it.',
      }),
    ],
    lanes: [aLane()],
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

export function aTag(overrides: RawObject = {}): RawObject {
  return {
    id: 'cloth',
    class: 'kind',
    tells: ['woven', 'bolt'],
    ...overrides,
  };
}

export function aGood(overrides: RawObject = {}): RawObject {
  return {
    id: 'silk',
    name: 'Bolt of silk',
    prose: 'A bolt of woven silk, cool to the hand and no use at all in a draught.',
    kind: 'cloth',
    tags: [],
    worth: 40,
    ...overrides,
  };
}

/** A want stated as a predicate: a conjunction of terms (ADR 0007 decision 6). */
export function aWant(overrides: RawObject = {}): RawObject {
  return {
    predicate: [{ tag: 'cloth' }, { tag: 'warm' }],
    ...overrides,
  };
}

export function aBuyer(overrides: RawObject = {}): RawObject {
  return {
    id: 'ilse',
    name: 'Ilse Vantry',
    wants: [aWant()],
    bonusTags: ['warm'],
    refusalTags: [],
    ...overrides,
  };
}

/**
 * A catalogue small enough to read and large enough to satisfy the bounds
 * `aBounds` declares: `warm` sits on two goods, so it is a learnable pattern
 * as a role tag, and `cloth` carries three, so it is above the usability
 * floor. Spread over `aContentSet`, which holds none of it by default — the
 * trivial content set of #7 has no goods at all.
 */
export function aCatalogue(overrides: RawObject = {}): RawObject {
  return {
    tags: [aTag(), aTag({ id: 'warm', class: 'quality', tells: ['fleece', 'quilted'] })],
    goods: [
      aGood(),
      aGood({
        id: 'blanket',
        name: 'Ship blanket',
        prose: 'A woven blanket with a fleece lining, sold by the gantry crews.',
        tags: ['warm'],
        worth: 25,
      }),
      aGood({
        id: 'quilt',
        name: 'Quilted roll',
        prose: "A quilted bolt of ship's cloth, woven thick against a cold watch.",
        tags: ['warm'],
        worth: 30,
      }),
    ],
    buyers: [aBuyer()],
    ...overrides,
  };
}
