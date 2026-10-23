import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/engine';
import {
  aBounds,
  aCalendar,
  aCatalogue,
  aContentSet,
  aGood,
  aLocation,
  aStart,
  aTag,
} from './support/content';

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
      'tags',
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

/**
 * For every invisible tag the **tell** is the tag (ADR 0007 decision 4). A tag
 * declared with no tell at all fails; prose missing its tell words is reported
 * for a writer to judge, because a writer finding a better word than the tag
 * table predicted is the normal case, and failing it would train writers to
 * pad prose with keywords.
 */
describe('tells', () => {
  it('refuses a tag that declares no tell', () => {
    const result = loadContent(
      aContentSet(aCatalogue({ tags: [aTag({ tells: [] }), aTag({ id: 'warm', class: 'quality' })] })),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      { verdict: 'fails', where: 'tags[0].tells', what: 'is missing or empty' },
    ]);
  });

  it('refuses a tag that declares no class the four know', () => {
    const result = loadContent(aContentSet(aCatalogue({ tags: [aTag({ class: 'sort' })] })));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems[0]).toEqual({
      verdict: 'fails',
      where: 'tags[0].class',
      what: 'is sort, which is not kind, quality, origin or quirk',
    });
  });

  it('accepts a catalogue whose prose carries the tells of every tag it holds', () => {
    const result = loadContent(aContentSet(aCatalogue()));

    expect(result.ok ? [] : result.problems).toEqual([]);
  });
});

/**
 * A good carries exactly one kind-tag, mandatory and flat, and one authored
 * **worth** (ADR 0007 decisions 2 and 12). Exactly one kind is what makes "a
 * good belongs somewhere" true by construction.
 */
describe('goods', () => {
  it('refuses a good whose kind names a tag of another class', () => {
    const result = loadContent(aContentSet(aCatalogue({ goods: [aGood({ kind: 'warm' })] })));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems[0]).toEqual({
      verdict: 'fails',
      where: 'goods[0].kind',
      what: 'names warm, which is a quality tag and not a kind',
    });
  });

  it('refuses a good carrying a second kind among its other tags', () => {
    const result = loadContent(
      aContentSet(
        aCatalogue({
          tags: [aTag(), aTag({ id: 'ore', tells: ['seam'] })],
          goods: [aGood({ tags: ['ore'] })],
        }),
      ),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems[0]).toEqual({
      verdict: 'fails',
      where: 'goods[0].tags[0]',
      what: 'names the kind ore, and a good carries exactly one kind',
    });
  });

  it('refuses a good with no worth', () => {
    const result = loadContent(aContentSet(aCatalogue({ goods: [aGood({ worth: undefined })] })));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems[0]).toEqual({
      verdict: 'fails',
      where: 'goods[0].worth',
      what: 'is missing or not a whole number',
    });
  });

  it('refuses a good naming a tag the content set does not declare', () => {
    const result = loadContent(aContentSet(aCatalogue({ goods: [aGood({ tags: ['martian'] })] })));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems[0]).toEqual({
      verdict: 'fails',
      where: 'goods[0].tags[0]',
      what: 'names a tag that does not exist: martian',
    });
  });

  it('refuses a good carrying more tags than the content set declared', () => {
    const result = loadContent(
      aContentSet({
        ...aCatalogue({ goods: [aGood({ tags: ['warm'] })] }),
        bounds: aBounds({ tagsPerGood: { least: 1, most: 1 } }),
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems[0]).toEqual({
      verdict: 'fails',
      where: 'goods[0].tags',
      what: 'carries 2 tags, and the content set declared 1 to 1',
    });
  });
});
