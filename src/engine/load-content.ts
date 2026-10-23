import { daysPerYear } from './calendar';
import { checkContentSet } from './content-checks';
import {
  tagClasses,
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
  readInteger,
  readNonEmptyTexts,
  readText,
  type Problem,
  type Report,
} from './verdicts';

export type { Finding, Problem, Report } from './verdicts';

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
  // The whole-set checks run over a content set whose every node read
  // cleanly, because a tag that did not read cannot be counted.
  const content: ContentSet = { bounds, calendar, locations, tags, goods, buyers, start };
  const whole = checkContentSet(content);
  if (whole.length > 0) return { ok: false, problems: [...whole], reports };

  return { ok: true, content, reports };
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
  if (!Array.isArray(raw) || raw.length === 0) {
    problems.push(fails('locations', 'names no locations'));
    return undefined;
  }

  const locations: Location[] = [];
  const seen = new Set<string>();
  raw.forEach((entry, index) => {
    const where = `locations[${index}]`;
    if (!isObject(entry)) {
      problems.push(fails(where, 'is not an object'));
      return;
    }
    const id = readText(entry.id, `${where}.id`, problems);
    const name = readText(entry.name, `${where}.name`, problems);
    const prose = readText(entry.prose, `${where}.prose`, problems);
    if (id === undefined || name === undefined || prose === undefined) return;

    if (seen.has(id)) {
      problems.push(fails(`${where}.id`, `repeats an id already used: ${id}`));
      return;
    }
    seen.add(id);
    locations.push({ id, name, prose });
  });

  return locations.length === raw.length ? locations : undefined;
}

function readTags(raw: unknown, problems: Problem[]): readonly Tag[] | undefined {
  if (!Array.isArray(raw)) {
    problems.push(fails('tags', 'is missing'));
    return undefined;
  }

  const tags: Tag[] = [];
  const seen = new Set<string>();
  raw.forEach((entry, index) => {
    const where = `tags[${index}]`;
    if (!isObject(entry)) {
      problems.push(fails(where, 'is not an object'));
      return;
    }
    const id = readText(entry.id, `${where}.id`, problems);
    const tagClass = readTagClass(entry.class, `${where}.class`, problems);
    // A tag declared with no tell at all is what *does* fail the load
    // (ADR 0007 decision 4).
    const tells = readNonEmptyTexts(entry.tells, `${where}.tells`, problems);
    if (id === undefined || tagClass === undefined || tells === undefined) return;

    if (seen.has(id)) {
      problems.push(fails(`${where}.id`, `repeats an id already used: ${id}`));
      return;
    }
    seen.add(id);
    tags.push({ id, class: tagClass, tells });
  });

  return tags.length === raw.length ? tags : undefined;
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
  if (!Array.isArray(raw)) {
    problems.push(fails('goods', 'is missing'));
    return undefined;
  }

  const goods: Good[] = [];
  const seen = new Set<string>();
  raw.forEach((entry, index) => {
    const where = `goods[${index}]`;
    if (!isObject(entry)) {
      problems.push(fails(where, 'is not an object'));
      return;
    }
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
      return;
    }

    if (seen.has(id)) {
      problems.push(fails(`${where}.id`, `repeats an id already used: ${id}`));
      return;
    }
    seen.add(id);

    // The kind counts towards the bound: a content set declares its tags per
    // good as one kind plus so many others (ADR 0007 decisions 15 and 16).
    const held = carried.length + 1;
    if (bounds !== undefined && (held < bounds.tagsPerGood.least || held > bounds.tagsPerGood.most)) {
      problems.push(
        fails(
          `${where}.tags`,
          `carries ${held} tags, and the content set declared ` +
            `${bounds.tagsPerGood.least} to ${bounds.tagsPerGood.most}`,
        ),
      );
      return;
    }

    goods.push({ id, name, prose, kind, tags: carried, worth });
  });

  return goods.length === raw.length ? goods : undefined;
}

/** The kind is mandatory, and names a tag of class kind (ADR 0007 decision 2). */
function readKind(
  value: unknown,
  where: string,
  tags: readonly Tag[],
  problems: Problem[],
): string | undefined {
  const id = readText(value, where, problems);
  if (id === undefined) return undefined;

  const tag = tags.find((candidate) => candidate.id === id);
  if (tag === undefined) {
    problems.push(fails(where, `names a tag that does not exist: ${id}`));
    return undefined;
  }
  if (tag.class !== 'kind') {
    problems.push(fails(where, `names ${id}, which is a ${tag.class} tag and not a kind`));
    return undefined;
  }
  return id;
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
    const id = readText(entry, at, problems);
    if (id === undefined) return;

    const tag = tags.find((candidate) => candidate.id === id);
    if (tag === undefined) {
      problems.push(fails(at, `names a tag that does not exist: ${id}`));
      return;
    }
    if (tag.class === 'kind') {
      problems.push(fails(at, `names the kind ${id}, and a good carries exactly one kind`));
      return;
    }
    if (carried.includes(id)) {
      problems.push(fails(at, `repeats a tag the good already carries: ${id}`));
      return;
    }
    carried.push(id);
  });

  return carried.length === value.length ? carried : undefined;
}

function readBuyers(
  raw: unknown,
  tags: readonly Tag[],
  goods: readonly Good[],
  problems: Problem[],
): readonly Buyer[] | undefined {
  if (!Array.isArray(raw)) {
    problems.push(fails('buyers', 'is missing'));
    return undefined;
  }

  const buyers: Buyer[] = [];
  const seen = new Set<string>();
  raw.forEach((entry, index) => {
    const where = `buyers[${index}]`;
    if (!isObject(entry)) {
      problems.push(fails(where, 'is not an object'));
      return;
    }
    const id = readText(entry.id, `${where}.id`, problems);
    const name = readText(entry.name, `${where}.name`, problems);
    const wants = readWants(entry.wants, `${where}.wants`, tags, goods, problems);
    const bonusTags = readRoleTags(entry.bonusTags, `${where}.bonusTags`, tags, [], problems);
    const refusalTags = readRoleTags(
      entry.refusalTags,
      `${where}.refusalTags`,
      tags,
      bonusTags ?? [],
      problems,
    );
    if (
      id === undefined ||
      name === undefined ||
      wants === undefined ||
      bonusTags === undefined ||
      refusalTags === undefined
    ) {
      return;
    }

    if (seen.has(id)) {
      problems.push(fails(`${where}.id`, `repeats an id already used: ${id}`));
      return;
    }
    seen.add(id);
    buyers.push({ id, name, wants, bonusTags, refusalTags });
  });

  return buyers.length === raw.length ? buyers : undefined;
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
    const tag = readText(entry.tag, `${at}.tag`, problems);
    if (tag === undefined) return;
    if (!tags.some((candidate) => candidate.id === tag)) {
      problems.push(fails(`${at}.tag`, `names a tag that does not exist: ${tag}`));
      return;
    }
    if (entry.negated !== undefined && typeof entry.negated !== 'boolean') {
      problems.push(fails(`${at}.negated`, 'is not yes or no'));
      return;
    }
    terms.push({ tag, negated: entry.negated === true });
  });

  return terms.length === raw.length ? terms : undefined;
}

/**
 * The tags a buyer holds in one role. A tag held in both roles at one buyer is
 * a contradiction rather than the two-way ideal of findings §2.4, which is one
 * tag as a bonus at one buyer and a refusal at *another*.
 */
function readRoleTags(
  raw: unknown,
  where: string,
  tags: readonly Tag[],
  otherRole: readonly string[],
  problems: Problem[],
): readonly string[] | undefined {
  if (!Array.isArray(raw)) {
    problems.push(fails(where, 'is missing'));
    return undefined;
  }

  const held: string[] = [];
  raw.forEach((entry, index) => {
    const at = `${where}[${index}]`;
    const id = readText(entry, at, problems);
    if (id === undefined) return;
    if (!tags.some((candidate) => candidate.id === id)) {
      problems.push(fails(at, `names a tag that does not exist: ${id}`));
      return;
    }
    if (otherRole.includes(id)) {
      problems.push(fails(at, `names ${id}, which this buyer already pays more for`));
      return;
    }
    held.push(id);
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
