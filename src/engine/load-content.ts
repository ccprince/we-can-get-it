import { daysPerYear } from './calendar';
import type { Bounds, Calendar, ContentSet, Location, Month, Range, Start } from './content';
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
  const start = readStart(raw.start, locations ?? [], problems);

  if (
    bounds === undefined ||
    calendar === undefined ||
    locations === undefined ||
    start === undefined ||
    problems.length > 0
  ) {
    return { ok: false, problems, reports };
  }
  return { ok: true, content: { bounds, calendar, locations, start }, reports };
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
