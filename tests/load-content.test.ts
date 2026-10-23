import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/engine';
import { aCalendar, aContentSet, aLocation, aStart } from './support/content';

describe('loadContent', () => {
  it('accepts a trivial content set: one location, no goods', () => {
    const result = loadContent(aContentSet());

    expect(result.ok).toBe(true);
  });

  it('refuses a start that names a location the content set does not have', () => {
    const result = loadContent(aContentSet({ start: aStart({ locationId: 'nowhere' }) }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      { where: 'start.locationId', what: 'names a location that does not exist: nowhere' },
    ]);
  });

  it('refuses a month that is not a whole number of weeks', () => {
    const result = loadContent(
      aContentSet({
        calendar: aCalendar({ months: [{ name: 'Thessaly', days: 31 }] }),
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        where: 'calendar.months[0]',
        what: 'Thessaly is 31 days, which is not a whole number of 6-day weeks',
      },
    ]);
  });

  it('leaves the campaign unstartable by returning problems rather than throwing', () => {
    const result = loadContent({ locations: [aLocation()] });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.map((problem) => problem.where)).toEqual(['calendar', 'start']);
  });

  it('reports the derived shape of the calendar for a writer to judge', () => {
    const result = loadContent(aContentSet());

    expect(result.reports).toEqual([
      { where: 'calendar', what: 'a year is 2 months, 10 weeks, 60 days' },
    ]);
  });
});
