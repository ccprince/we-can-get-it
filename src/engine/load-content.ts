import { daysPerYear } from './calendar';
import { checkContentSet } from './content-checks';
import { reportsOn } from './content-reports';
import {
  tagClasses,
  within,
  type Bounds,
  type Buyer,
  type Calendar,
  type ContentSet,
  type Draw,
  type Good,
  type Lane,
  type Location,
  type Month,
  type Range,
  type Ship,
  type Start,
  type Tag,
  type TagClass,
  type Term,
  type Want,
} from './content';
import {
  fails,
  isObject,
  judge,
  readEach,
  readInteger,
  readNonEmptyTexts,
  readText,
  type Problem,
  type Report,
} from './verdicts';

export type { Problem, Report } from './verdicts';

export type LoadResult =
  | { readonly ok: true; readonly content: ContentSet; readonly reports: readonly Report[] }
  | {
      readonly ok: false;
      readonly problems: readonly Problem[];
      readonly reports: readonly Report[];
    };

/**
 * Content errors surface at load, not mid-play (ADR 0003 decision 3). The
 * loader is handed already-parsed data — the page fetches it and the harness
 * reads it off disk, and both hand it to this one validator (ADR 0009
 * decision 6).
 */
export function loadContent(raw: unknown): LoadResult {
  const problems: Problem[] = [];
  const reports: Report[] = [];

  if (!isObject(raw)) {
    return { ok: false, problems: [fails('', 'is not an object')], reports };
  }

  const bounds = readBounds(raw.bounds, problems);
  // One galaxy-wide rate, declared by the content set because the engine holds
  // no number of its own (ADR 0006 decision 10, ADR 0007 decision 15).
  const fareRate = readInteger(raw.fareRate, 'fareRate', 1, problems);
  const calendar = readCalendar(raw.calendar, problems, reports);
  const draw = readDraw(raw.draw, problems);
  const archetypes = readArchetypes(raw.archetypes, problems);
  // A location is authored with an archetype, so an enumeration that did not
  // read leaves the locations unchecked rather than failing every one of them
  // against nothing.
  const locations =
    archetypes === undefined ? undefined : readLocations(raw.locations, archetypes, problems);
  // A lane names the locations it joins, so a chart that did not read leaves
  // the lanes unread rather than failing every one of them against nothing.
  const lanes = locations === undefined ? undefined : readLanes(raw.lanes, locations, problems);
  const tags = readTags(raw.tags, problems);
  // A good is checked against the tags the content set declares, so a
  // vocabulary that did not read leaves the catalogue unchecked rather than
  // failing every good against an empty one.
  const goods = tags === undefined ? undefined : readGoods(raw.goods, tags, bounds, problems);
  const buyers =
    tags === undefined || goods === undefined
      ? undefined
      : readBuyers(raw.buyers, tags, goods, problems);
  const start = readStart(raw.start, locations ?? [], problems);

  // The whole-set checks and the distributions read the vocabulary, the
  // catalogue, the cast and the bounds, and nothing else — so a content set
  // whose calendar or chart would not read still gets both, which is the half
  // of a writer's output they would otherwise lose to a typo elsewhere.
  if (bounds !== undefined && tags !== undefined && goods !== undefined && buyers !== undefined) {
    const subject = { bounds, tags, goods, buyers };
    problems.push(...checkContentSet(subject));
    reports.push(...reportsOn(subject));
  }

  if (
    bounds === undefined ||
    draw === undefined ||
    fareRate === undefined ||
    calendar === undefined ||
    archetypes === undefined ||
    locations === undefined ||
    lanes === undefined ||
    tags === undefined ||
    goods === undefined ||
    buyers === undefined ||
    start === undefined ||
    problems.length > 0
  ) {
    return { ok: false, problems, reports };
  }

  return {
    ok: true,
    content: {
      bounds,
      draw,
      fareRate,
      calendar,
      archetypes,
      locations,
      lanes,
      tags,
      goods,
      buyers,
      start,
    },
    reports,
  };
}

/**
 * The bounds the validator enforces are the ones the content set declared, so
 * a content set that declares none cannot be checked at all and fails here
 * rather than being checked against numbers the engine invented (ADR 0007
 * decision 15).
 */
function readBounds(raw: unknown, problems: Problem[]): Bounds | undefined {
  if (!isObject(raw)) {
    problems.push(fails('bounds', 'is missing'));
    return undefined;
  }

  const tagsPerGood = readRange(raw.tagsPerGood, 'bounds.tagsPerGood', problems);
  const goodsPerRoleTag = readRange(raw.goodsPerRoleTag, 'bounds.goodsPerRoleTag', problems);
  const usabilityFloor = readInteger(raw.usabilityFloor, 'bounds.usabilityFloor', 1, problems);
  const quirkRation = readInteger(raw.quirkRation, 'bounds.quirkRation', 0, problems);

  if (
    tagsPerGood === undefined ||
    goodsPerRoleTag === undefined ||
    usabilityFloor === undefined ||
    quirkRation === undefined
  ) {
    return undefined;
  }
  return { tagsPerGood, goodsPerRoleTag, usabilityFloor, quirkRation };
}

function readRange(raw: unknown, where: string, problems: Problem[]): Range | undefined {
  if (!isObject(raw)) {
    problems.push(fails(where, 'is missing'));
    return undefined;
  }

  const least = readInteger(raw.least, `${where}.least`, 0, problems);
  const most = readInteger(raw.most, `${where}.most`, 0, problems);
  if (least === undefined || most === undefined) return undefined;

  if (least > most) {
    problems.push(fails(where, `runs from ${least} down to ${most}, which is no range at all`));
    return undefined;
  }
  return { least, most };
}

function readCalendar(raw: unknown, problems: Problem[], reports: Report[]): Calendar | undefined {
  if (!isObject(raw)) {
    problems.push(fails('calendar', 'is missing'));
    return undefined;
  }

  const daysPerWeek = readInteger(raw.daysPerWeek, 'calendar.daysPerWeek', 1, problems);
  const firstYear = readInteger(raw.firstYear, 'calendar.firstYear', 0, problems);
  const weekdayNames = readNonEmptyTexts(raw.weekdayNames, 'calendar.weekdayNames', problems);
  const months = readMonths(raw.months, daysPerWeek, problems);

  if (
    daysPerWeek !== undefined &&
    weekdayNames !== undefined &&
    weekdayNames.length !== daysPerWeek
  ) {
    problems.push(
      fails(
        'calendar.weekdayNames',
        `names ${weekdayNames.length} weekdays for a week of ${daysPerWeek} days`,
      ),
    );
  }

  if (
    daysPerWeek === undefined ||
    firstYear === undefined ||
    weekdayNames === undefined ||
    months === undefined
  ) {
    return undefined;
  }

  const calendar: Calendar = { daysPerWeek, weekdayNames, months, firstYear };
  const days = daysPerYear(calendar);
  reports.push(
    judge(
      'calendar',
      `a year is ${months.length} months, ${days / daysPerWeek} weeks, ${days} days`,
    ),
  );

  return calendar;
}

function readMonths(
  raw: unknown,
  daysPerWeek: number | undefined,
  problems: Problem[],
): readonly Month[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    problems.push(fails('calendar.months', 'names no months'));
    return undefined;
  }

  const months: Month[] = [];
  raw.forEach((entry, index) => {
    const where = `calendar.months[${index}]`;
    if (!isObject(entry)) {
      problems.push(fails(where, 'is not an object'));
      return;
    }
    const name = readText(entry.name, `${where}.name`, problems);
    const days = readInteger(entry.days, `${where}.days`, 1, problems);
    if (name === undefined || days === undefined) return;

    // A month is a whole number of weeks and a year a whole number of months,
    // with no remainders (ADR 0005 decision 2): the divisibility is what makes
    // weekday derivable from the day index alone.
    if (daysPerWeek !== undefined && days % daysPerWeek !== 0) {
      problems.push(
        fails(
          where,
          `${name} is ${days} days, which is not a whole number of ${daysPerWeek}-day weeks`,
        ),
      );
      return;
    }
    months.push({ name, days });
  });

  return months.length === raw.length ? months : undefined;
}

function readLocations(
  raw: unknown,
  archetypes: readonly string[],
  problems: Problem[],
): readonly Location[] | undefined {
  const locations = readEach(raw, 'locations', problems, (entry, where) => {
    const id = readText(entry.id, `${where}.id`, problems);
    const name = readText(entry.name, `${where}.name`, problems);
    const prose = readText(entry.prose, `${where}.prose`, problems);
    // A location is authored with one archetype (ADR 0007 decision 17), which
    // is what a slot types against and what the trade guide expands.
    const archetype = readKnownArchetype(
      entry.archetype,
      `${where}.archetype`,
      archetypes,
      problems,
    );
    if (id === undefined || name === undefined || prose === undefined || archetype === undefined) {
      return undefined;
    }
    return { id, name, prose, archetype };
  });

  // A campaign opens somewhere, so an empty chart is a mistake rather than a
  // content set with nothing in it yet.
  if (locations !== undefined && locations.length === 0) {
    problems.push(fails('locations', 'names no locations'));
    return undefined;
  }
  return locations;
}

/**
 * The lanes, which are the whole of travel: a lane is the only way between the
 * two locations it joins, and travel is along lanes and nowhere else (ADR 0006
 * decision 1). A galaxy with no lanes in it is legal — the trivial content set
 * of #7 is one location and goes nowhere — and whether the drawn map is
 * **connected at baseline range** is the draw-time pass's check (#12).
 */
function readLanes(
  raw: unknown,
  locations: readonly Location[],
  problems: Problem[],
): readonly Lane[] | undefined {
  if (!Array.isArray(raw)) {
    problems.push(fails('lanes', 'is missing'));
    return undefined;
  }

  const lanes: Lane[] = [];
  const joined = new Set<string>();
  raw.forEach((entry, index) => {
    const where = `lanes[${index}]`;
    if (!isObject(entry)) {
      problems.push(fails(where, 'is not an object'));
      return;
    }
    const ends = readEnds(entry.ends, `${where}.ends`, locations, problems);
    // The one authored number a lane carries (ADR 0006 decision 8). A lane of
    // no distance would be the zero-day hop decision 6 rejects.
    const distance = readInteger(entry.distance, `${where}.distance`, 1, problems);
    if (ends === undefined || distance === undefined) return;

    // One cost, the same both ways (ADR 0006 decision 7), so a lane authored
    // the other way round is the same lane twice and the pair is held in a
    // fixed order to catch it.
    const pair = [...ends].sort().join(' ');
    if (joined.has(pair)) {
      problems.push(
        fails(
          `${where}.ends`,
          `joins ${ends[0]} and ${ends[1]}, which a lane already joins: a lane is symmetric`,
        ),
      );
      return;
    }
    joined.add(pair);
    lanes.push({ ends, distance });
  });

  return lanes.length === raw.length ? lanes : undefined;
}

function readEnds(
  value: unknown,
  where: string,
  locations: readonly Location[],
  problems: Problem[],
): readonly [string, string] | undefined {
  if (!Array.isArray(value) || value.length !== 2) {
    problems.push(fails(where, 'does not name the two locations the lane joins'));
    return undefined;
  }

  const from = readKnownLocation(value[0], `${where}[0]`, locations, problems);
  const to = readKnownLocation(value[1], `${where}[1]`, locations, problems);
  if (from === undefined || to === undefined) return undefined;

  if (from === to) {
    problems.push(fails(where, `joins ${from} to itself, and a lane joins two locations`));
    return undefined;
  }
  return [from, to];
}

/** A location id naming a location the content set holds. */
function readKnownLocation(
  value: unknown,
  where: string,
  locations: readonly Location[],
  problems: Problem[],
): string | undefined {
  const id = readText(value, where, problems);
  if (id === undefined) return undefined;

  if (!locations.some((location) => location.id === id)) {
    problems.push(fails(where, `names a location that does not exist: ${id}`));
    return undefined;
  }
  return id;
}

/**
 * What the content set declares about its own draw. There is no default: the
 * engine holds no number of its own (ADR 0007 decision 15), and the motif count
 * is the one dial there is (ADR 0008 decision 5), so a content set that
 * declares none cannot be drawn from at all.
 */
function readDraw(raw: unknown, problems: Problem[]): Draw | undefined {
  if (!isObject(raw)) {
    problems.push(fails('draw', 'is missing'));
    return undefined;
  }

  // A campaign assembled from no motifs has no map, so the dial starts at one.
  const motifsPerCampaign = readInteger(
    raw.motifsPerCampaign,
    'draw.motifsPerCampaign',
    1,
    problems,
  );
  const interMotifDistance = readRange(raw.interMotifDistance, 'draw.interMotifDistance', problems);
  if (motifsPerCampaign === undefined || interMotifDistance === undefined) return undefined;

  // An inter-motif lane is a lane, and a lane of no distance would be the
  // zero-day hop ADR 0006 decision 6 refuses.
  if (interMotifDistance.least < 1) {
    problems.push(
      fails(
        'draw.interMotifDistance.least',
        `is ${interMotifDistance.least}, which is less than 1`,
      ),
    );
    return undefined;
  }
  return { motifsPerCampaign, interMotifDistance };
}

/**
 * The enumerated archetypes. A short list of names, authored deliberately
 * rather than emerging as an accident of who got written first (ADR 0007
 * decision 17) — and every location is authored with one, so a content set that
 * enumerates none has nothing its locations can be.
 */
function readArchetypes(raw: unknown, problems: Problem[]): readonly string[] | undefined {
  const archetypes = readNonEmptyTexts(raw, 'archetypes', problems);
  if (archetypes === undefined) return undefined;

  const named = new Set(archetypes);
  if (named.size !== archetypes.length) {
    problems.push(fails('archetypes', 'names the same archetype twice'));
    return undefined;
  }
  return archetypes;
}

/** An archetype name the content set enumerates. */
function readKnownArchetype(
  value: unknown,
  where: string,
  archetypes: readonly string[],
  problems: Problem[],
): string | undefined {
  const name = readText(value, where, problems);
  if (name === undefined) return undefined;

  if (!archetypes.includes(name)) {
    problems.push(fails(where, `names an archetype that does not exist: ${name}`));
    return undefined;
  }
  return name;
}

function readTags(raw: unknown, problems: Problem[]): readonly Tag[] | undefined {
  return readEach(raw, 'tags', problems, (entry, where) => {
    const id = readText(entry.id, `${where}.id`, problems);
    const tagClass = readTagClass(entry.class, `${where}.class`, problems);
    // A tag declared with no tell at all is what *does* fail the load
    // (ADR 0007 decision 4).
    const tells = readNonEmptyTexts(entry.tells, `${where}.tells`, problems);
    if (id === undefined || tagClass === undefined || tells === undefined) return undefined;
    return { id, class: tagClass, tells };
  });
}

function readTagClass(value: unknown, where: string, problems: Problem[]): TagClass | undefined {
  const named = tagClasses.find((tagClass) => tagClass === value);
  if (named === undefined) {
    problems.push(fails(where, `is ${String(value)}, which is not kind, quality, origin or quirk`));
    return undefined;
  }
  return named;
}

function readGoods(
  raw: unknown,
  tags: readonly Tag[],
  bounds: Bounds | undefined,
  problems: Problem[],
): readonly Good[] | undefined {
  return readEach(raw, 'goods', problems, (entry, where) => {
    const id = readText(entry.id, `${where}.id`, problems);
    const name = readText(entry.name, `${where}.name`, problems);
    const prose = readText(entry.prose, `${where}.prose`, problems);
    const kind = readKind(entry.kind, `${where}.kind`, tags, problems);
    const carried = readCarriedTags(entry.tags, `${where}.tags`, tags, problems);
    // A good's worth is one authored number (ADR 0007 decision 12).
    const worth = readInteger(entry.worth, `${where}.worth`, 1, problems);
    if (
      id === undefined ||
      name === undefined ||
      prose === undefined ||
      kind === undefined ||
      carried === undefined ||
      worth === undefined
    ) {
      return undefined;
    }

    // The kind counts towards the bound: a content set declares its tags per
    // good as one kind plus so many others (ADR 0007 decisions 15 and 16).
    const held = carried.length + 1;
    if (bounds !== undefined && !within(held, bounds.tagsPerGood)) {
      const { least, most } = bounds.tagsPerGood;
      problems.push(
        fails(
          `${where}.tags`,
          `carries ${held} tags, and the content set declared ${least} to ${most}`,
        ),
      );
      return undefined;
    }

    return { id, name, prose, kind, tags: carried, worth };
  });
}

/** A tag id naming a tag the content set declares. */
function readKnownTag(
  value: unknown,
  where: string,
  tags: readonly Tag[],
  problems: Problem[],
): Tag | undefined {
  const id = readText(value, where, problems);
  if (id === undefined) return undefined;

  const tag = tags.find((candidate) => candidate.id === id);
  if (tag === undefined) {
    problems.push(fails(where, `names a tag that does not exist: ${id}`));
    return undefined;
  }
  return tag;
}

/** The kind is mandatory, and names a tag of class kind (ADR 0007 decision 2). */
function readKind(
  value: unknown,
  where: string,
  tags: readonly Tag[],
  problems: Problem[],
): string | undefined {
  const tag = readKnownTag(value, where, tags, problems);
  if (tag === undefined) return undefined;

  if (tag.class !== 'kind') {
    problems.push(fails(where, `names ${tag.id}, which is a ${tag.class} tag and not a kind`));
    return undefined;
  }
  return tag.id;
}

/**
 * The quality, origin and quirk tags a good carries. A second kind here is
 * refused: exactly one kind per good is what makes a breadth list and a slot's
 * supply set well defined (ADR 0007 decision 2).
 */
function readCarriedTags(
  value: unknown,
  where: string,
  tags: readonly Tag[],
  problems: Problem[],
): readonly string[] | undefined {
  if (!Array.isArray(value)) {
    problems.push(fails(where, 'is missing'));
    return undefined;
  }

  const carried: string[] = [];
  value.forEach((entry, index) => {
    const at = `${where}[${index}]`;
    const tag = readKnownTag(entry, at, tags, problems);
    if (tag === undefined) return;

    if (tag.class === 'kind') {
      problems.push(fails(at, `names the kind ${tag.id}, and a good carries exactly one kind`));
      return;
    }
    if (carried.includes(tag.id)) {
      problems.push(fails(at, `repeats a tag the good already carries: ${tag.id}`));
      return;
    }
    carried.push(tag.id);
  });

  return carried.length === value.length ? carried : undefined;
}

function readBuyers(
  raw: unknown,
  tags: readonly Tag[],
  goods: readonly Good[],
  problems: Problem[],
): readonly Buyer[] | undefined {
  return readEach(raw, 'buyers', problems, (entry, where) => {
    const id = readText(entry.id, `${where}.id`, problems);
    const name = readText(entry.name, `${where}.name`, problems);
    const wants = readWants(entry.wants, `${where}.wants`, tags, goods, problems);
    const bonusTags = readRoleTags(entry.bonusTags, `${where}.bonusTags`, tags, problems);
    const refusalTags = readRoleTags(entry.refusalTags, `${where}.refusalTags`, tags, problems);
    if (
      id === undefined ||
      name === undefined ||
      wants === undefined ||
      bonusTags === undefined ||
      refusalTags === undefined
    ) {
      return undefined;
    }
    return { id, name, wants, bonusTags, refusalTags };
  });
}

function readWants(
  raw: unknown,
  where: string,
  tags: readonly Tag[],
  goods: readonly Good[],
  problems: Problem[],
): readonly Want[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    // A buyer is someone who wants something, so one with no wants is noise.
    problems.push(fails(where, 'is missing or empty'));
    return undefined;
  }

  const wants: Want[] = [];
  raw.forEach((entry, index) => {
    const want = readWant(entry, `${where}[${index}]`, tags, goods, problems);
    if (want !== undefined) wants.push(want);
  });

  return wants.length === raw.length ? wants : undefined;
}

function readWant(
  raw: unknown,
  where: string,
  tags: readonly Tag[],
  goods: readonly Good[],
  problems: Problem[],
): Want | undefined {
  if (!isObject(raw)) {
    problems.push(fails(where, 'is not an object'));
    return undefined;
  }

  const statesPredicate = raw.predicate !== undefined;
  const namesGood = raw.goodId !== undefined;
  if (statesPredicate && namesGood) {
    problems.push(
      fails(where, 'names both a predicate and a good, and a want is one or the other'),
    );
    return undefined;
  }
  if (!statesPredicate && !namesGood) {
    problems.push(fails(where, 'names neither a predicate nor a good'));
    return undefined;
  }

  if (namesGood) {
    const goodId = readText(raw.goodId, `${where}.goodId`, problems);
    if (goodId === undefined) return undefined;
    if (!goods.some((good) => good.id === goodId)) {
      problems.push(fails(`${where}.goodId`, `names a good that does not exist: ${goodId}`));
      return undefined;
    }
    return { goodId };
  }

  const predicate = readPredicate(raw.predicate, `${where}.predicate`, tags, problems);
  return predicate === undefined ? undefined : { predicate };
}

function readPredicate(
  raw: unknown,
  where: string,
  tags: readonly Tag[],
  problems: Problem[],
): readonly Term[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    problems.push(fails(where, 'is missing or empty'));
    return undefined;
  }

  const terms: Term[] = [];
  raw.forEach((entry, index) => {
    const at = `${where}[${index}]`;
    if (!isObject(entry)) {
      problems.push(fails(at, 'is not an object'));
      return;
    }
    const tag = readKnownTag(entry.tag, `${at}.tag`, tags, problems);
    if (tag === undefined) return;
    if (entry.negated !== undefined && typeof entry.negated !== 'boolean') {
      problems.push(fails(`${at}.negated`, 'is not yes or no'));
      return;
    }
    terms.push({ tag: tag.id, negated: entry.negated === true });
  });

  return terms.length === raw.length ? terms : undefined;
}

/**
 * The tags a buyer holds in one role. How widely a role tag must be spread is
 * a bound over the whole content set rather than anything this buyer can
 * answer, so it is checked there (ADR 0007 decision 7).
 */
function readRoleTags(
  raw: unknown,
  where: string,
  tags: readonly Tag[],
  problems: Problem[],
): readonly string[] | undefined {
  if (!Array.isArray(raw)) {
    problems.push(fails(where, 'is missing'));
    return undefined;
  }

  const held: string[] = [];
  raw.forEach((entry, index) => {
    const tag = readKnownTag(entry, `${where}[${index}]`, tags, problems);
    if (tag !== undefined) held.push(tag.id);
  });

  return held.length === raw.length ? held : undefined;
}

function readStart(
  raw: unknown,
  locations: readonly Location[],
  problems: Problem[],
): Start | undefined {
  if (!isObject(raw)) {
    problems.push(fails('start', 'is missing'));
    return undefined;
  }

  const locationId = readKnownLocation(raw.locationId, 'start.locationId', locations, problems);
  // Credits are whole numbers, engine-wide (ADR 0009 decision 3).
  const credits = readInteger(raw.credits, 'start.credits', 0, problems);
  const day = readInteger(raw.day, 'start.day', 1, problems);
  const ship = readShip(raw.ship, 'start.ship', problems);

  if (
    locationId === undefined ||
    credits === undefined ||
    day === undefined ||
    ship === undefined
  ) {
    return undefined;
  }
  return { locationId, credits, day, ship };
}

/**
 * The ship the campaign opens with. Both numbers are the content set's, since
 * the engine hardcodes none (ADR 0007 decision 15): a ship with no speed could
 * not convert a distance into days, and one with no range could fly nothing.
 */
function readShip(raw: unknown, where: string, problems: Problem[]): Ship | undefined {
  if (!isObject(raw)) {
    problems.push(fails(where, 'is missing'));
    return undefined;
  }

  const speed = readInteger(raw.speed, `${where}.speed`, 1, problems);
  const range = readInteger(raw.range, `${where}.range`, 1, problems);
  if (speed === undefined || range === undefined) return undefined;
  return { speed, range };
}
