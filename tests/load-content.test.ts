import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/engine';
import { aBounds, aCalendar, aContentSet, aLocation, aStart } from './support/content';

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
      {
        verdict: 'fails',
        where: 'start.locationId',
        what: 'names a location that does not exist: nowhere',
      },
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
        verdict: 'fails',
        where: 'calendar.months[0]',
        what: 'Thessaly is 31 days, which is not a whole number of 6-day weeks',
      },
    ]);
  });

  it('leaves the campaign unstartable by returning problems rather than throwing', () => {
    const result = loadContent({ locations: [aLocation()] });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.map((problem) => problem.where)).toEqual([
      'bounds',
      'calendar',
      'start',
    ]);
  });

  it('reports the derived shape of the calendar for a writer to judge', () => {
    const result = loadContent(aContentSet());

    expect(result.reports).toEqual([
      { verdict: 'judge', where: 'calendar', what: 'a year is 2 months, 10 weeks, 60 days' },
    ]);
  });
});

/**
 * A problem and a report are structurally distinct, so the compiler refuses
 * the mix-up: a suspicion pushed into `problems` would silently fail a
 * writer's load, which is the failure the two verdicts exist to prevent
 * (ADR 0007 decision 18).
 */
describe('the two verdicts', () => {
  it('carries its verdict on every problem and every report', () => {
    const result = loadContent(aContentSet({ start: aStart({ locationId: 'nowhere' }) }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.map((problem) => problem.verdict)).toEqual(['fails']);
    expect(result.reports.map((report) => report.verdict)).toEqual(['judge']);
  });
});

/**
 * A content set declares its own bounds and the validator enforces what was
 * declared; the engine hardcodes none of them (ADR 0007 decision 15).
 */
describe('the declared bounds', () => {
  it('refuses a content set that declares no bounds, since the engine holds none', () => {
    const result = loadContent(aContentSet({ bounds: undefined }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([{ verdict: 'fails', where: 'bounds', what: 'is missing' }]);
  });

  it('refuses a bound whose least is above its most', () => {
    const result = loadContent(
      aContentSet({ bounds: aBounds({ tagsPerGood: { least: 4, most: 2 } }) }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'bounds.tagsPerGood',
        what: 'runs from 4 down to 2, which is no range at all',
      },
    ]);
  });
});
