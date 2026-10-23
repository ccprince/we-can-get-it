import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/engine';
import {
  aBounds,
  aBuyer,
  aCalendar,
  aCatalogue,
  aContentSet,
  aGood,
  aLocation,
  aStart,
  aTag,
  aWant,
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

/**
 * A want names a conjunction of tag terms, or one good by identity (ADR 0007
 * decision 6). The validator checks that a named good exists; that it can be
 * reached in the drawn galaxy is the draw-time pass's job (#27).
 */
describe('wants', () => {
  it('refuses a want naming a good the content set does not hold', () => {
    const result = loadContent(
      aContentSet(aCatalogue({ buyers: [aBuyer({ wants: [{ goodId: 'brandy' }] })] })),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems[0]).toEqual({
      verdict: 'fails',
      where: 'buyers[0].wants[0].goodId',
      what: 'names a good that does not exist: brandy',
    });
  });

  it('accepts a want naming a good by identity', () => {
    const result = loadContent(
      aContentSet(
        aCatalogue({
          buyers: [aBuyer({ wants: [aWant(), { goodId: 'silk' }] })],
        }),
      ),
    );

    expect(result.ok ? [] : result.problems).toEqual([]);
  });

  it('refuses a want that names neither a predicate nor a good', () => {
    const result = loadContent(aContentSet(aCatalogue({ buyers: [aBuyer({ wants: [{}] })] })));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems[0]).toEqual({
      verdict: 'fails',
      where: 'buyers[0].wants[0]',
      what: 'names neither a predicate nor a good',
    });
  });

  it('refuses a want that names both a predicate and a good', () => {
    const result = loadContent(
      aContentSet(
        aCatalogue({ buyers: [aBuyer({ wants: [aWant({ goodId: 'silk' })] })] }),
      ),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems[0]).toEqual({
      verdict: 'fails',
      where: 'buyers[0].wants[0]',
      what: 'names both a predicate and a good, and a want is one or the other',
    });
  });

  it('refuses a term naming a tag the content set does not declare', () => {
    const result = loadContent(
      aContentSet(
        aCatalogue({ buyers: [aBuyer({ wants: [aWant({ predicate: [{ tag: 'martian' }] })] })] }),
      ),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems[0]).toEqual({
      verdict: 'fails',
      where: 'buyers[0].wants[0].predicate[0].tag',
      what: 'names a tag that does not exist: martian',
    });
  });

  it('reads a negated term, since a refusal stated in the want is not the buyer refusing', () => {
    const result = loadContent(
      aContentSet(
        aCatalogue({
          buyers: [
            aBuyer({ wants: [aWant({ predicate: [{ tag: 'cloth' }, { tag: 'warm', negated: true }] })] }),
          ],
        }),
      ),
    );

    expect(result.ok ? [] : result.problems).toEqual([]);
  });
});

/**
 * Bonus and refusal are roles a tag plays at one buyer, not classes of tag
 * (ADR 0007 decision 7), so content holds them on the buyer — and one buyer
 * cannot hold the same tag in both roles.
 */
describe('the roles a buyer holds a tag in', () => {
  it('refuses a tag held as both a bonus and a refusal at one buyer', () => {
    const result = loadContent(
      aContentSet(aCatalogue({ buyers: [aBuyer({ refusalTags: ['warm'] })] })),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems[0]).toEqual({
      verdict: 'fails',
      where: 'buyers[0].refusalTags[0]',
      what: 'names warm, which this buyer already pays more for',
    });
  });
});

/**
 * The checks over the content set as a whole. Each is measured against a bound
 * the content set declared, never one the engine holds (ADR 0007 decision 15),
 * and each is a property of the content set *as written* — the same bounds
 * over the drawn galaxy are the draw-time pass's (#27).
 */
describe('the content set as a whole', () => {
  it('refuses a tag no want uses and no buyer holds in a role', () => {
    const result = loadContent(
      aContentSet(
        aCatalogue({
          tags: [
            aTag(),
            aTag({ id: 'warm', class: 'quality', tells: ['fleece', 'quilted'] }),
            aTag({ id: 'martian', class: 'origin', tells: ['red dust'] }),
          ],
        }),
      ),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'tags[2]',
        what: 'martian is used by no want and held in no role, which makes it noise',
      },
    ]);
  });

  it('refuses more quirk tags than the declared ration', () => {
    const result = loadContent(
      aContentSet({
        bounds: aBounds({ quirkRation: 1 }),
        ...aCatalogue({
          tags: [
            aTag(),
            aTag({ id: 'blue', class: 'quirk', tells: ['blue', 'indigo'] }),
            aTag({ id: 'gilt', class: 'quirk', tells: ['gilt'] }),
          ],
          goods: [
            aGood({ prose: 'A bolt of woven silk, blue as deep water.', tags: ['blue'] }),
            aGood({
              id: 'quilt',
              name: 'Quilted roll',
              prose: "A woven bolt of ship's cloth, run through with a gilt thread.",
              tags: ['gilt'],
            }),
          ],
          buyers: [
            aBuyer({
              bonusTags: [],
              wants: [aWant({ predicate: [{ tag: 'cloth' }] }), { predicate: [{ tag: 'blue' }] }, { predicate: [{ tag: 'gilt' }] }],
            }),
          ],
        }),
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'tags',
        what: 'declares 2 quirk tags, and the content set rationed them to 1',
      },
    ]);
  });

  it('refuses a role tag sitting on fewer goods than the declared bound', () => {
    const result = loadContent(
      aContentSet({ ...aCatalogue(), bounds: aBounds({ goodsPerRoleTag: { least: 3, most: 8 } }) }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'tags[1]',
        what: 'warm is held in a role and sits on 2 goods, and the content set declared 3 to 8',
      },
    ]);
  });
});

/**
 * The report is the other verdict: what a writer judges rather than what the
 * load refuses. It states **distributions and never means** (ADR 0007
 * decision 5, CLAUDE.md), because eight goods per kind on average while half
 * the kinds are singletons is the prototype's failure with a better mean.
 */
describe('the report', () => {
  it('states goods per kind as a distribution, and goods per role tag with it', () => {
    const result = loadContent(
      aContentSet(
        aCatalogue({
          tags: [
            aTag(),
            aTag({ id: 'warm', class: 'quality', tells: ['fleece', 'quilted'] }),
            aTag({ id: 'ore', tells: ['seam', 'crushed'] }),
          ],
          goods: [
            aGood(),
            aGood({
              id: 'blanket',
              name: 'Ship blanket',
              prose: 'A woven blanket with a fleece lining.',
              tags: ['warm'],
            }),
            aGood({
              id: 'quilt',
              name: 'Quilted roll',
              prose: "A quilted bolt of ship's cloth, woven thick.",
              tags: ['warm'],
            }),
            aGood({
              id: 'barite',
              name: 'Barite',
              prose: 'Crushed out of a shallow seam and barrelled wet.',
              kind: 'ore',
            }),
          ],
          buyers: [aBuyer({ wants: [aWant(), { predicate: [{ tag: 'ore' }] }] })],
        }),
      ),
    );

    expect(result.reports).toContainEqual({
      verdict: 'judge',
      where: 'goods',
      what: 'goods per kind: 3 goods — cloth; 1 good — ore',
    });
    expect(result.reports).toContainEqual({
      verdict: 'judge',
      where: 'tags',
      what: 'goods per role tag: 2 goods — warm',
    });
  });

  it('reports a kind below the declared usability floor rather than failing it', () => {
    const result = loadContent(
      aContentSet({ ...aCatalogue(), bounds: aBounds({ usabilityFloor: 4 }) }),
    );

    expect(result.ok ? [] : result.problems).toEqual([]);
    expect(result.reports).toContainEqual({
      verdict: 'judge',
      where: 'tags',
      what: 'below the usability floor of 4, so no vague want may point at it: cloth, with 3 goods',
    });
  });

  it('reports prose missing its tell words rather than failing the load', () => {
    const result = loadContent(
      aContentSet(
        aCatalogue({
          goods: [
            aGood(),
            aGood({
              id: 'blanket',
              name: 'Ship blanket',
              prose: 'A woven blanket, good against a cold watch.',
              tags: ['warm'],
            }),
            aGood({
              id: 'quilt',
              name: 'Quilted roll',
              prose: "A quilted bolt of ship's cloth, woven thick.",
              tags: ['warm'],
            }),
          ],
        }),
      ),
    );

    expect(result.ok ? [] : result.problems).toEqual([]);
    expect(result.reports).toContainEqual({
      verdict: 'judge',
      where: 'goods[1].prose',
      what: 'carries none of the tells of warm: fleece, quilted',
    });
  });

  it('states the whole of its reports and nothing else for a clean catalogue', () => {
    const result = loadContent(aContentSet(aCatalogue()));

    expect(result.reports).toEqual([
      { verdict: 'judge', where: 'calendar', what: 'a year is 2 months, 10 weeks, 60 days' },
      { verdict: 'judge', where: 'goods', what: 'goods per kind: 3 goods — cloth' },
      { verdict: 'judge', where: 'tags', what: 'goods per role tag: 2 goods — warm' },
    ]);
  });
});
