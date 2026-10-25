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

/** A list of plain values, or an empty one if it was not given. */
function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
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
 * the trivial content set of #7 assembles its one-place galaxy from. Labelled a
 * **chokepoint**, which no default motif invariant asks for: a test about
 * shapes states the shape it means.
 */
export function aMotif(overrides: RawObject = {}): RawObject {
  return {
    id: 'lone-berth',
    shape: 'chokepoint',
    slots: [aSlot()],
    lanes: [],
    ...overrides,
  };
}

/**
 * An **archetype**, which is what a location is (ADR 0007 decision 17). It
 * supplies and demands no **kind** by default, so it anchors nothing and a
 * fixture about the catalogue states the kinds it means.
 */
export function anArchetype(overrides: RawObject = {}): RawObject {
  return {
    id: 'market',
    supplies: [],
    demands: [],
    ...overrides,
  };
}

/**
 * The parameters the **draw** reads: the **motif count**, which is the one dial
 * (ADR 0008 decision 5), how far apart the motifs it places are strung, the
 * range the location count must land in, how many re-rolls it may take to land
 * there, and how much of the catalogue and the cast it hides. All are
 * placeholders to be measured.
 */
export function aDrawParameters(overrides: RawObject = {}): RawObject {
  return {
    motifsPerCampaign: 1,
    interMotifDistance: { least: 14, most: 18 },
    // Wide enough that no fixture about something else lands outside it.
    locationCount: { least: 1, most: 30 },
    rerolls: 8,
    // Nothing hidden, so a fixture about something else draws the whole
    // catalogue and cast. A test about hiding states the rate it means.
    goodsHiddenPercent: 0,
    peopleHiddenPercent: 0,
    // No floor and no surplus, so a fixture about something else is never
    // refused for a cast or a reserve it did not mean to write.
    peopleFloor: 0,
    reserveSurplus: 0,
    ...overrides,
  };
}

/**
 * What the drawn galaxy's topology must hold (ADR 0006 decisions 3 and 16):
 * nothing, by default, so a fixture about something else is never re-rolled for a shape
 * it has no motif of. A test about an invariant states the one it means, and
 * names only the shapes it asks for.
 */
export function aTopology(overrides: RawObject = {}): RawObject {
  const { leastPlaced, startHub, ...rest } = overrides;
  return {
    leastPlaced: {
      spur: 0,
      chokepoint: 0,
      ring: 0,
      ...(leastPlaced as RawObject | undefined),
    },
    farHaul: 0,
    // Any place may open, so a fixture's start is its best-connected place.
    startHub: { archetype: null, neighbours: 0, spurs: 0, ...(startHub as RawObject | undefined) },
    ...rest,
  };
}

/**
 * What the content set declares about its shops: how many **lots** one stocks,
 * how large a lot opens, and the two percentages a price is computed from on
 * top of a good's **worth** — the shop's markup, and the most a small lot adds
 * for being scarce. All placeholders to be measured; the engine holds none.
 *
 * Fixed, so a fixture about something else knows what it will find: every
 * supplied good stocked, in lots of five, at worth. A test about pricing or
 * stocking states the numbers it means.
 */
export function aShopParameters(overrides: RawObject = {}): RawObject {
  return {
    lotsPerShop: { least: 99, most: 99 },
    lotQuantity: { least: 5, most: 5 },
    markupPercent: { least: 0, most: 0 },
    scarcityPercent: 0,
    ...overrides,
  };
}

/**
 * What each tier pays, as a percent of worth. Round numbers on purpose, so a
 * test can say the offer it expects without working it out; a test about
 * rounding states the numbers it means.
 */
export function anOffers(overrides: RawObject = {}): RawObject {
  return { grudgingPercent: 50, acceptablePercent: 100, greatPercent: 150, ...overrides };
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
    // Room enough that a fixture about something else never fills it. A test
    // about the hold states the hold it means.
    hold: 100,
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
    topology: aTopology(),
    shops: aShopParameters(),
    offers: anOffers(),
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
  // A place may say which kinds it `supplies`, which its archetype declares.
  const placed = places.map(({ supplies, ...location }) => ({
    location: { ...location, id: String(location.id), archetype: `only-${String(location.id)}` },
    supplies: asStrings(supplies),
  }));

  const slotOf = new Map(
    placed.map(({ location }, at) => [
      location.id,
      `${String(at).padStart(2, '0')}-${location.id}`,
    ]),
  );

  return {
    archetypes: placed.map(({ location, supplies }) =>
      anArchetype({ id: location.archetype, supplies }),
    ),
    locations: placed.map(({ location }) => location),
    motifs: [
      {
        id: 'the-whole-map',
        shape: 'chokepoint',
        slots: placed.map(({ location }) => ({
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
    plainly: 'wants something warm to sleep under',
    ...overrides,
  };
}

export function aBuyer(overrides: RawObject = {}): RawObject {
  return {
    id: 'ilse',
    name: 'Ilse Vantry',
    // The location `aLocation` is, so a fixture about something else has
    // somewhere for its buyer to stand.
    locationId: 'kestrel',
    wants: [aWant()],
    bonusTags: ['warm'],
    refusalTags: [],
    refusalLine: 'That is not what I asked for.',
    ...overrides,
  };
}

/**
 * Osk, at Bellwether, who wants a great deal and so keeps every tag in use: the
 * rest of a fixture's cast can then be the one buyer at Kestrel a test is about.
 */
export function anElsewhereBuyer(overrides: RawObject = {}): RawObject {
  return aBuyer({
    id: 'osk',
    name: 'Osk',
    locationId: 'bellwether',
    wants: [
      aWant({
        predicate: [{ tag: 'tools' }, { tag: 'cloth' }, { tag: 'warm' }],
        plainly: 'wants a great deal',
      }),
    ],
    bonusTags: [],
    ...overrides,
  });
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

/**
 * The smallest galaxy with something to trade, and somewhere to fly it. Kestrel
 * supplies cloth and Bellwether supplies tools: two kinds, so that a shop
 * stocking the wrong one has something wrong to stock. `aCatalogue`'s cloth,
 * and two tools a buyer wants so the vocabulary is used.
 */
export function aTradingGalaxy(overrides: RawObject = {}): RawObject {
  const catalogue = aCatalogue();
  return {
    ...catalogue,
    ...aGalaxy({
      locations: [
        aLocation({ supplies: ['cloth'] }),
        aLocation({
          id: 'bellwether',
          name: 'Bellwether Yards',
          prose: 'A repair yard.',
          supplies: ['tools'],
        }),
      ],
    }),
    tags: [...(catalogue.tags as RawObject[]), aTag({ id: 'tools', tells: ['forged'] })],
    goods: [
      ...(catalogue.goods as RawObject[]),
      aGood({ id: 'spanner', name: 'Spanner', prose: 'Forged.', kind: 'tools', worth: 12 }),
      aGood({ id: 'vice', name: 'Bench vice', prose: 'Forged iron.', kind: 'tools', worth: 60 }),
    ],
    buyers: [
      aBuyer(),
      aBuyer({
        id: 'osk',
        name: 'Osk',
        wants: [aWant({ predicate: [{ tag: 'tools' }] })],
        bonusTags: [],
      }),
    ],
    ...overrides,
  };
}
