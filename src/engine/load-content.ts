import { daysPerYear } from './calendar';
import { checkContentSet } from './content-checks';
import { reportsOn } from './content-reports';
import {
  tagClasses,
  within,
  type Bounds,
  type Buyer,
  type Calendar,
  type Archetype,
  type ContentSet,
  type DrawParameters,
  type Good,
  type Location,
  type Motif,
  type MotifLane,
  type Month,
  type Range,
  type Ship,
  type Slot,
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
  const drawParameters = readDrawParameters(raw.drawParameters, problems);
  const archetypes = readArchetypes(raw.archetypes, problems);
  // A location is authored with an archetype and a slot types against one, so
  // an enumeration that did not read leaves both unchecked rather than failing
  // every location and every slot against nothing.
  const locations =
    archetypes === undefined ? undefined : readLocations(raw.locations, archetypes, problems);
  const motifs =
    archetypes === undefined ? undefined : readMotifs(raw.motifs, archetypes, problems);
  const tags = readTags(raw.tags, problems);
  // A good is checked against the tags the content set declares, so a
  // vocabulary that did not read leaves the catalogue unchecked rather than
  // failing every good against an empty one.
  const goods = tags === undefined ? undefined : readGoods(raw.goods, tags, bounds, problems);
  const buyers =
    tags === undefined || goods === undefined
      ? undefined
      : readBuyers(raw.buyers, tags, goods, problems);
  const start = readStart(raw.start, problems);

  // An inter-motif lane beyond the baseline ship's range would be a lane no
  // ship can fly, and a galaxy not flyable end to end. **Range** is the only
  // gate on the map (ADR 0006 decision 14), so this is a content mistake rather
  // than a hard campaign — and it is checkable statically, which ADR 0008
  // decision 16 says to do wherever it can be done. Whether a *drawn* galaxy is
  // connected at baseline range is the draw-time pass's, and is #12's.
  // Only when the draw places more than one motif: with a single motif there is
  // nothing to join and the range is never read.
  if (drawParameters !== undefined && start !== undefined && drawParameters.motifsPerCampaign > 1) {
    const { most } = drawParameters.interMotifDistance;
    if (most > start.ship.range) {
      problems.push(
        fails(
          'drawParameters.interMotifDistance.most',
          `is ${most}, which is beyond the baseline ship's range of ${start.ship.range}: ` +
            'no ship could fly the lane',
        ),
      );
    }
  }

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
    drawParameters === undefined ||
    fareRate === undefined ||
    calendar === undefined ||
    archetypes === undefined ||
    motifs === undefined ||
    locations === undefined ||
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
    content: inIdOrder({
      bounds,
      drawParameters,
      fareRate,
      calendar,
      archetypes,
      motifs,
      locations,
      tags,
      goods,
      buyers,
      start,
    }),
    reports,
  };
}

/**
 * The content set with its **written order** taken out, which is what makes it
 * the `ContentSet` that type describes. The readers check that ids are unique
 * within each collection, so no tie is left for the written order to break.
 * It runs after validation, so a problem still names the position the writer
 * put the mistake at.
 */
function inIdOrder(content: ContentSet): ContentSet {
  return {
    ...content,
    archetypes: sortedById(content.archetypes),
    motifs: sortedById(content.motifs.map(motifInIdOrder)),
    locations: sortedById(content.locations),
    tags: sortedById(content.tags),
    goods: sortedById(content.goods),
    buyers: sortedById(content.buyers),
  };
}

/**
 * A motif's slots by id, and its lanes by their two ends. A lane is symmetric,
 * so which end the writer put first means nothing: each lane's ends are put in
 * id order before the lanes are sorted by them, and no two lanes join the same
 * pair, which the reader checks.
 */
function motifInIdOrder(motif: Motif): Motif {
  const lanes = motif.lanes.map(({ ends, distance }) => ({
    ends: byId(ends[0], ends[1]) <= 0 ? ends : ([ends[1], ends[0]] as const),
    distance,
  }));
  return {
    ...motif,
    slots: sortedById(motif.slots),
    lanes: lanes.sort(
      (one, other) => byId(one.ends[0], other.ends[0]) || byId(one.ends[1], other.ends[1]),
    ),
  };
}

function sortedById<T extends { readonly id: string }>(items: readonly T[]): readonly T[] {
  return [...items].sort((one, other) => byId(one.id, other.id));
}

/** Code-unit order over authored ids, which no locale can change. */
function byId(one: string, other: string): number {
  if (one === other) return 0;
  return one < other ? -1 : 1;
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
  archetypes: readonly Archetype[],
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
 * The parameters the draw reads. There is no default: the engine holds no
 * number of its own (ADR 0007 decision 15), and the motif count is the one dial
 * there is (ADR 0008 decision 5), so a content set that declares none cannot be
 * drawn from at all.
 */
function readDrawParameters(raw: unknown, problems: Problem[]): DrawParameters | undefined {
  if (!isObject(raw)) {
    problems.push(fails('drawParameters', 'is missing'));
    return undefined;
  }

  // A campaign assembled from no motifs has no map, so the dial starts at one.
  const motifsPerCampaign = readInteger(
    raw.motifsPerCampaign,
    'drawParameters.motifsPerCampaign',
    1,
    problems,
  );
  const interMotifDistance = readRange(
    raw.interMotifDistance,
    'drawParameters.interMotifDistance',
    problems,
  );
  if (motifsPerCampaign === undefined || interMotifDistance === undefined) return undefined;

  // An inter-motif lane is a lane, and a lane of no distance would be the
  // zero-day hop ADR 0006 decision 6 refuses.
  if (interMotifDistance.least < 1) {
    problems.push(
      fails(
        'drawParameters.interMotifDistance.least',
        `is ${interMotifDistance.least}, which is less than 1`,
      ),
    );
    return undefined;
  }
  return { motifsPerCampaign, interMotifDistance };
}

/**
 * The enumerated archetypes, authored deliberately rather than emerging as an
 * accident of who got written first (ADR 0007 decision 17). Every location is
 * authored with one, so a content set that enumerates none has nothing its
 * locations can be.
 */
function readArchetypes(raw: unknown, problems: Problem[]): readonly Archetype[] | undefined {
  const archetypes = readEach(raw, 'archetypes', problems, (entry, where) => {
    const id = readText(entry.id, `${where}.id`, problems);
    return id === undefined ? undefined : { id };
  });

  if (archetypes !== undefined && archetypes.length === 0) {
    problems.push(fails('archetypes', 'enumerates no archetypes for a location to be'));
    return undefined;
  }
  return archetypes;
}

/** An archetype id the content set enumerates. */
function readKnownArchetype(
  value: unknown,
  where: string,
  archetypes: readonly Archetype[],
  problems: Problem[],
): string | undefined {
  const name = readText(value, where, problems);
  if (name === undefined) return undefined;

  if (!archetypes.some((archetype) => archetype.id === name)) {
    problems.push(fails(where, `names an archetype that does not exist: ${name}`));
    return undefined;
  }
  return name;
}

/**
 * The motif reserve, from which the map is assembled (ADR 0006 decision 3). A
 * content set with no motifs in it has nothing to assemble a map from, so an
 * empty reserve is a mistake rather than a galaxy with nothing in it yet.
 *
 * Whether the location reserve can actually **fill** every slot of every motif
 * is a different and later question, checked before any draw by #12.
 */
function readMotifs(
  raw: unknown,
  archetypes: readonly Archetype[],
  problems: Problem[],
): readonly Motif[] | undefined {
  const motifs = readEach(raw, 'motifs', problems, (entry, where) => {
    const id = readText(entry.id, `${where}.id`, problems);
    const slots = readSlots(entry.slots, `${where}.slots`, archetypes, problems);
    // A motif's lanes name its own slots, so slots that did not read leave the
    // lanes unread rather than failing every one of them against nothing.
    const lanes =
      slots === undefined
        ? undefined
        : readMotifLanes(entry.lanes, `${where}.lanes`, slots, problems);
    if (id === undefined || slots === undefined || lanes === undefined) return undefined;
    return { id, slots, lanes };
  });

  if (motifs !== undefined && motifs.length === 0) {
    problems.push(fails('motifs', 'names no motifs for the map to be assembled from'));
    return undefined;
  }
  return motifs;
}

/** A motif's slots. A motif with none of them would place no locations. */
function readSlots(
  raw: unknown,
  where: string,
  archetypes: readonly Archetype[],
  problems: Problem[],
): readonly Slot[] | undefined {
  const slots = readEach(raw, where, problems, (entry, at) => {
    const id = readText(entry.id, `${at}.id`, problems);
    // Null is the untyped slot ADR 0006 decision 4 allows deliberately, and is
    // told apart from an archetype nobody declared.
    const archetype =
      entry.archetype === null
        ? null
        : readKnownArchetype(entry.archetype, `${at}.archetype`, archetypes, problems);
    if (id === undefined || archetype === undefined) return undefined;
    return { id, archetype };
  });

  if (slots !== undefined && slots.length === 0) {
    problems.push(fails(where, 'has no slots, so it would place no locations'));
    return undefined;
  }
  return slots;
}

/**
 * The lanes inside one motif, each joining two of that motif's own slots. A
 * lane reaching outside the motif is refused: motifs join by **inter-motif
 * lanes** the assembly adds, never by naming each other (ADR 0008 decision 6).
 */
function readMotifLanes(
  raw: unknown,
  where: string,
  slots: readonly Slot[],
  problems: Problem[],
): readonly MotifLane[] | undefined {
  if (!Array.isArray(raw)) {
    problems.push(fails(where, 'is missing'));
    return undefined;
  }

  const lanes: MotifLane[] = [];
  const joined = new Set<string>();
  raw.forEach((entry, index) => {
    const at = `${where}[${index}]`;
    if (!isObject(entry)) {
      problems.push(fails(at, 'is not an object'));
      return;
    }
    const ends = readSlotEnds(entry.ends, `${at}.ends`, slots, problems);
    const distance = readInteger(entry.distance, `${at}.distance`, 1, problems);
    if (ends === undefined || distance === undefined) return;

    const pair = [...ends].sort().join(' ');
    if (joined.has(pair)) {
      problems.push(
        fails(
          `${at}.ends`,
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

function readSlotEnds(
  value: unknown,
  where: string,
  slots: readonly Slot[],
  problems: Problem[],
): readonly [string, string] | undefined {
  if (!Array.isArray(value) || value.length !== 2) {
    problems.push(fails(where, 'does not name the two slots the lane joins'));
    return undefined;
  }

  const from = readKnownSlot(value[0], `${where}[0]`, slots, problems);
  const to = readKnownSlot(value[1], `${where}[1]`, slots, problems);
  if (from === undefined || to === undefined) return undefined;

  if (from === to) {
    problems.push(fails(where, `joins ${from} to itself, and a lane joins two slots`));
    return undefined;
  }
  return [from, to];
}

/** A slot id naming a slot of the motif the lane belongs to. */
function readKnownSlot(
  value: unknown,
  where: string,
  slots: readonly Slot[],
  problems: Problem[],
): string | undefined {
  const id = readText(value, where, problems);
  if (id === undefined) return undefined;

  if (!slots.some((slot) => slot.id === id)) {
    problems.push(fails(where, `names a slot this motif does not hold: ${id}`));
    return undefined;
  }
  return id;
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

function readStart(raw: unknown, problems: Problem[]): Start | undefined {
  if (!isObject(raw)) {
    problems.push(fails('start', 'is missing'));
    return undefined;
  }

  // Credits are whole numbers, engine-wide (ADR 0009 decision 3).
  const credits = readInteger(raw.credits, 'start.credits', 0, problems);
  const day = readInteger(raw.day, 'start.day', 1, problems);
  const ship = readShip(raw.ship, 'start.ship', problems);

  if (credits === undefined || day === undefined || ship === undefined) return undefined;
  return { credits, day, ship };
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
