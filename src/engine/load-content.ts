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
  type Good,
  type Location,
  type Month,
  type Range,
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
  | { readonly ok: false; readonly problems: readonly Problem[]; readonly reports: readonly Report[] };

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
  const calendar = readCalendar(raw.calendar, problems, reports);
  const locations = readLocations(raw.locations, problems);
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
    calendar === undefined ||
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
    content: { bounds, calendar, locations, tags, goods, buyers, start },
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

function readCalendar(
  raw: unknown,
  problems: Problem[],
  reports: Report[],
): Calendar | undefined {
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

function readLocations(raw: unknown, problems: Problem[]): readonly Location[] | undefined {
  const locations = readEach(raw, 'locations', problems, (entry, where) => {
    const id = readText(entry.id, `${where}.id`, problems);
    const name = readText(entry.name, `${where}.name`, problems);
    const prose = readText(entry.prose, `${where}.prose`, problems);
    if (id === undefined || name === undefined || prose === undefined) return undefined;
    return { id, name, prose };
  });

  // A campaign opens somewhere, so an empty chart is a mistake rather than a
  // content set with nothing in it yet.
  if (locations !== undefined && locations.length === 0) {
    problems.push(fails('locations', 'names no locations'));
    return undefined;
  }
  return locations;
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

function readTagClass(
  value: unknown,
  where: string,
  problems: Problem[],
): TagClass | undefined {
  const named = tagClasses.find((tagClass) => tagClass === value);
  if (named === undefined) {
    problems.push(
      fails(where, `is ${String(value)}, which is not kind, quality, origin or quirk`),
    );
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

  const locationId = readText(raw.locationId, 'start.locationId', problems);
  // Credits are whole numbers, engine-wide (ADR 0009 decision 3).
  const credits = readInteger(raw.credits, 'start.credits', 0, problems);
  const day = readInteger(raw.day, 'start.day', 1, problems);

  if (locationId !== undefined && !locations.some((location) => location.id === locationId)) {
    problems.push(
      fails('start.locationId', `names a location that does not exist: ${locationId}`),
    );
    return undefined;
  }

  if (locationId === undefined || credits === undefined || day === undefined) return undefined;
  return { locationId, credits, day };
}
