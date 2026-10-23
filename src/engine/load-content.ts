import type { Calendar, ContentSet, Location, Month, Start } from './content';

/**
 * A content mistake, named by what it is and where it is. A mistake **fails**
 * the load; a suspicion is **reported for a writer to judge** (ADR 0007
 * decision 18). The two verdicts are different channels here so that they
 * cannot be conflated later.
 */
export type Problem = {
  readonly where: string;
  readonly what: string;
};

/** Something for a writer to look at. Never a reason to fail a load. */
export type Report = {
  readonly where: string;
  readonly what: string;
};

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
    return { ok: false, problems: [{ where: '', what: 'is not an object' }], reports };
  }

  const calendar = readCalendar(raw.calendar, problems, reports);
  const locations = readLocations(raw.locations, problems);
  const start = readStart(raw.start, locations ?? [], problems);

  if (calendar === undefined || locations === undefined || start === undefined || problems.length > 0) {
    return { ok: false, problems, reports };
  }
  return { ok: true, content: { calendar, locations, start }, reports };
}

function readCalendar(
  raw: unknown,
  problems: Problem[],
  reports: Report[],
): Calendar | undefined {
  if (!isObject(raw)) {
    problems.push({ where: 'calendar', what: 'is missing' });
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
    problems.push({
      where: 'calendar.weekdayNames',
      what: `names ${weekdayNames.length} weekdays for a week of ${daysPerWeek} days`,
    });
  }

  if (
    daysPerWeek === undefined ||
    firstYear === undefined ||
    weekdayNames === undefined ||
    months === undefined
  ) {
    return undefined;
  }

  const days = months.reduce((total, month) => total + month.days, 0);
  reports.push({
    where: 'calendar',
    what: `a year is ${months.length} months, ${days / daysPerWeek} weeks, ${days} days`,
  });

  return { daysPerWeek, weekdayNames, months, firstYear };
}

function readMonths(
  raw: unknown,
  daysPerWeek: number | undefined,
  problems: Problem[],
): readonly Month[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    problems.push({ where: 'calendar.months', what: 'names no months' });
    return undefined;
  }

  const months: Month[] = [];
  raw.forEach((entry, index) => {
    const where = `calendar.months[${index}]`;
    if (!isObject(entry)) {
      problems.push({ where, what: 'is not an object' });
      return;
    }
    const name = readText(entry.name, `${where}.name`, problems);
    const days = readInteger(entry.days, `${where}.days`, 1, problems);
    if (name === undefined || days === undefined) return;

    // A month is a whole number of weeks and a year a whole number of months,
    // with no remainders (ADR 0005 decision 2): the divisibility is what makes
    // weekday derivable from the day index alone.
    if (daysPerWeek !== undefined && days % daysPerWeek !== 0) {
      problems.push({
        where,
        what: `${name} is ${days} days, which is not a whole number of ${daysPerWeek}-day weeks`,
      });
      return;
    }
    months.push({ name, days });
  });

  return months.length === raw.length ? months : undefined;
}

function readLocations(raw: unknown, problems: Problem[]): readonly Location[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    problems.push({ where: 'locations', what: 'names no locations' });
    return undefined;
  }

  const locations: Location[] = [];
  const seen = new Set<string>();
  raw.forEach((entry, index) => {
    const where = `locations[${index}]`;
    if (!isObject(entry)) {
      problems.push({ where, what: 'is not an object' });
      return;
    }
    const id = readText(entry.id, `${where}.id`, problems);
    const name = readText(entry.name, `${where}.name`, problems);
    const prose = readText(entry.prose, `${where}.prose`, problems);
    if (id === undefined || name === undefined || prose === undefined) return;

    if (seen.has(id)) {
      problems.push({ where: `${where}.id`, what: `repeats an id already used: ${id}` });
      return;
    }
    seen.add(id);
    locations.push({ id, name, prose });
  });

  return locations.length === raw.length ? locations : undefined;
}

function readStart(
  raw: unknown,
  locations: readonly Location[],
  problems: Problem[],
): Start | undefined {
  if (!isObject(raw)) {
    problems.push({ where: 'start', what: 'is missing' });
    return undefined;
  }

  const locationId = readText(raw.locationId, 'start.locationId', problems);
  // Credits are whole numbers, engine-wide (ADR 0009 decision 3).
  const credits = readInteger(raw.credits, 'start.credits', 0, problems);
  const day = readInteger(raw.day, 'start.day', 1, problems);

  if (locationId !== undefined && !locations.some((location) => location.id === locationId)) {
    problems.push({
      where: 'start.locationId',
      what: `names a location that does not exist: ${locationId}`,
    });
    return undefined;
  }

  if (locationId === undefined || credits === undefined || day === undefined) return undefined;
  return { locationId, credits, day };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readText(value: unknown, where: string, problems: Problem[]): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    problems.push({ where, what: 'is missing or not a line of text' });
    return undefined;
  }
  return value;
}

function readNonEmptyTexts(
  value: unknown,
  where: string,
  problems: Problem[],
): readonly string[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    problems.push({ where, what: 'is missing or empty' });
    return undefined;
  }
  const texts: string[] = [];
  value.forEach((entry, index) => {
    const text = readText(entry, `${where}[${index}]`, problems);
    if (text !== undefined) texts.push(text);
  });
  return texts.length === value.length ? texts : undefined;
}

function readInteger(
  value: unknown,
  where: string,
  least: number,
  problems: Problem[],
): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    problems.push({ where, what: 'is missing or not a whole number' });
    return undefined;
  }
  if (value < least) {
    problems.push({ where, what: `is ${value}, which is less than ${least}` });
    return undefined;
  }
  return value;
}
