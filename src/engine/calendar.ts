import type { Calendar, Month } from './content';

/**
 * A day index converted into the date the player reads. Dated things are
 * stated as absolute dates (ADR 0005 decision 4), and "day 214" is an engine
 * artifact rather than something a patron says (ADR 0005 decision 3) — so the
 * conversion is the engine's, not the view's (ADR 0009 decision 10).
 */
export type CalendarDate = {
  readonly label: string;
  readonly weekday: string;
  readonly dayOfMonth: number;
  readonly month: string;
  readonly year: number;
};

/** A year is the sum of its months, with no remainder (ADR 0005 decision 2). */
export function daysPerYear(calendar: Calendar): number {
  return calendar.months.reduce((total, month) => total + month.days, 0);
}

export function dateOf(calendar: Calendar, day: number): CalendarDate {
  const sinceFirstDay = day - 1;
  const inAYear = daysPerYear(calendar);
  const year = calendar.firstYear + Math.floor(sinceFirstDay / inAYear);
  let dayOfYear = sinceFirstDay % inAYear;

  let month: Month | undefined;
  for (const candidate of calendar.months) {
    if (dayOfYear < candidate.days) {
      month = candidate;
      break;
    }
    dayOfYear -= candidate.days;
  }
  if (month === undefined) {
    throw new Error('the calendar has no months, which the loader forbids');
  }

  // A year is a whole number of weeks, so the week runs on through the year
  // boundary and weekday follows from the day index alone (ADR 0005 d2).
  const weekday = calendar.weekdayNames[sinceFirstDay % calendar.daysPerWeek];
  if (weekday === undefined) {
    throw new Error(
      'the calendar names fewer weekdays than its week has days, which the loader forbids',
    );
  }

  const dayOfMonth = dayOfYear + 1;
  return {
    label: `${weekday}, ${dayOfMonth} ${month.name}, year ${year}`,
    weekday,
    dayOfMonth,
    month: month.name,
    year,
  };
}
