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

/** An override that is a list of nodes, or nothing if it was not given. */
function asObjects(value: unknown): RawObject[] | undefined {
  return Array.isArray(value) ? (value as RawObject[]) : undefined;
}

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
 * A **slot**, which is **untyped** by default: ADR 0006 decision 4 allows one
 * deliberately, and a fixture about something else should not have to think
 * about what fills its map. A test about typing states the archetype it means.
 */
export function aSlot(overrides: RawObject = {}): RawObject {
  return {
    id: 'berth',
    archetype: null,
    ...overrides,
  };
}

/**
 * The smallest **motif** there is: one slot and no lanes, which is the fragment
 * the trivial content set of #7 assembles its one-place galaxy from.
 */
export function aMotif(overrides: RawObject = {}): RawObject {
  return {
    id: 'lone-berth',
    slots: [aSlot()],
    lanes: [],
    ...overrides,
  };
}

/** An **archetype**, which is what a location is (ADR 0007 decision 17). */
export function anArchetype(overrides: RawObject = {}): RawObject {
  return {
    id: 'market',
    ...overrides,
  };
}

/**
 * The parameters the **draw** reads: the **motif count**, which is the one dial
 * (ADR 0008 decision 5), how far apart the motifs it places are strung, the
 * range the location count must land in and how many re-rolls it may take to
 * land there. All are placeholders to be measured.
 */
export function aDrawParameters(overrides: RawObject = {}): RawObject {
  return {
    motifsPerCampaign: 1,
    interMotifDistance: { least: 14, most: 18 },
    // Wide enough that no fixture about something else lands outside it.
    locationCount: { least: 1, most: 30 },
    rerolls: 8,
    ...overrides,
  };
}

export function aStart(overrides: RawObject = {}): RawObject {
  return {
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
 * to be measured, and both are chosen here so `aMotifLane`'s distance is within
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
    archetypes: [anArchetype(), anArchetype({ id: 'extractor' }), anArchetype({ id: 'processor' })],
    motifs: [aMotif()],
    drawParameters: aDrawParameters(),
    locations: [aLocation()],
    tags: [],
    goods: [],
    buyers: [],
    start: aStart(),
    ...overrides,
  };
}

/**
 * A lane inside a **motif**, carrying the one authored number a lane has
 * (ADR 0006 decision 8). Its **ends are slot ids**, not location ids, which is
 * where a lane is authored now — `aLane` would be the wrong name for it, since
 * a **lane** joins two locations and which locations these are is the draw's
 * answer.
 *
 * In `aGalaxy` a slot is named for the location that fills it, so these read as
 * place names there, which is why most fixtures needed no change.
 */
export function aMotifLane(overrides: RawObject = {}): RawObject {
  return {
    ends: ['kestrel', 'bellwether'],
    distance: 12,
    ...overrides,
  };
}

/**
 * Two locations and the lane between them: the smallest galaxy that can be
 * flown. Spread over `aContentSet`, whose one location and one slot go nowhere
 * — the trivial content set of #7.
 *
 * The assembly it describes is **forced**. Every location is given an archetype
 * of its own and the one motif's slots are named and typed after them, so the
 * draw has exactly one legal way to fill the map: a test about the chart is then
 * about the chart and not about what came up. A test whose subject *is* what
 * came up states its own motifs and lets several locations fit a slot.
 *
 * Lanes are stated between location ids, so a fixture reads the way a chart
 * does, and are rewritten here to the slots those locations fill.
 *
 * **The first location listed opens the campaign** when no place is better
 * connected. The start is the best-connected place, with ties going to the
 * first in placement order, which is the motif's slots in id order (ADR 0009
 * decision 3). So each slot's id is the location's position in this list and
 * then its id, `00-kestrel` before `01-bellwether`, and the order a fixture
 * lists its places in is authored order on purpose, through the ids.
 */
export function aGalaxy(overrides: RawObject = {}): RawObject {
  const { locations, lanes, ...rest } = overrides;
  const places = asObjects(locations) ?? [
    aLocation(),
    aLocation({
      id: 'bellwether',
      name: 'Bellwether Yards',
      prose: 'A repair yard that outgrew its own harbour and never admitted it.',
    }),
  ];

  // One archetype per place, so every slot has exactly one location that fits.
  const placed = places.map((location) => ({
    ...location,
    id: String(location.id),
    archetype: `only-${String(location.id)}`,
  }));

  const slotOf = new Map(
    placed.map((location, at) => [location.id, `${String(at).padStart(2, '0')}-${location.id}`]),
  );

  return {
    archetypes: placed.map((location) => ({ id: location.archetype })),
    locations: placed,
    motifs: [
      {
        id: 'the-whole-map',
        slots: placed.map((location) => ({
          id: slotOf.get(location.id),
          archetype: location.archetype,
        })),
        lanes: (asObjects(lanes) ?? [aMotifLane()]).map((lane) => ({
          ...lane,
          ends: (lane.ends as readonly string[]).map((end) => slotOf.get(end)),
        })),
      },
    ],
    drawParameters: aDrawParameters({ motifsPerCampaign: 1 }),
    ...rest,
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
