import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/engine';
import {
  aBounds,
  aBuyer,
  aCalendar,
  aCatalogue,
  aContentSet,
  anArchetype,
  aDrawParameters,
  aGalaxy,
  aGood,
  aMotifLane,
  aLocation,
  aMotif,
  aSlot,
  aStart,
  aTag,
  aWant,
} from './support/content';

describe('loadContent', () => {
  it('accepts a trivial content set: one location, no goods', () => {
    const result = loadContent(aContentSet());

    expect(result.ok).toBe(true);
  });

  it('hands over every collection in id order, whatever order it was written in', () => {
    // Where a thing sat in the file is written order, and the loader takes it
    // out (ADR 0009 decision 3): collections by id, a motif's lanes by their
    // ends, each lane's ends in id order. The calendar's months are authored
    // order and stay as written.
    const result = loadContent(
      aContentSet({
        calendar: aCalendar({
          months: [
            { name: 'Thaw', days: 24 },
            { name: 'Ashfall', days: 24 },
          ],
        }),
        archetypes: [anArchetype({ id: 'processor' }), anArchetype()],
        locations: [aLocation({ id: 'shoals', name: 'Thennet Shoals' }), aLocation()],
        motifs: [
          aMotif({
            id: 'spur',
            slots: [aSlot({ id: 'pit' }), aSlot({ id: 'dead-end' }), aSlot()],
            lanes: [
              aMotifLane({ ends: ['pit', 'dead-end'], distance: 3 }),
              aMotifLane({ ends: ['pit', 'berth'], distance: 4 }),
            ],
          }),
          aMotif(),
        ],
        ...aCatalogue({
          tags: [aTag({ id: 'warm', class: 'quality', tells: ['fleece', 'quilted'] }), aTag()],
          goods: [...(aCatalogue().goods as unknown[])].reverse(),
          buyers: [aBuyer({ id: 'oskar', name: 'Oskar Fell' }), aBuyer()],
        }),
      }),
    );
    if (!result.ok) throw new Error(JSON.stringify(result.problems));
    const { content } = result;
    const spur = content.motifs.find((motif) => motif.id === 'spur');

    expect(content.calendar.months.map((month) => month.name)).toEqual(['Thaw', 'Ashfall']);
    expect(content.archetypes.map((archetype) => archetype.id)).toEqual(['market', 'processor']);
    expect(content.locations.map((location) => location.id)).toEqual(['kestrel', 'shoals']);
    expect(content.motifs.map((motif) => motif.id)).toEqual(['lone-berth', 'spur']);
    expect(content.tags.map((tag) => tag.id)).toEqual(['cloth', 'warm']);
    expect(content.goods.map((good) => good.id)).toEqual(['blanket', 'quilt', 'silk']);
    expect(content.buyers.map((buyer) => buyer.id)).toEqual(['ilse', 'oskar']);
    expect(spur?.slots.map((slot) => slot.id)).toEqual(['berth', 'dead-end', 'pit']);
    expect(spur?.lanes.map((lane) => lane.ends)).toEqual([
      ['berth', 'pit'],
      ['dead-end', 'pit'],
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
      'fareRate',
      'calendar',
      'drawParameters',
      'archetypes',
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
    const result = loadContent(aContentSet({ start: aStart({ credits: -1 }) }));

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
      aContentSet(
        aCatalogue({ tags: [aTag({ tells: [] }), aTag({ id: 'warm', class: 'quality' })] }),
      ),
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
      aContentSet(aCatalogue({ buyers: [aBuyer({ wants: [aWant({ goodId: 'silk' })] })] })),
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
            aBuyer({
              wants: [aWant({ predicate: [{ tag: 'cloth' }, { tag: 'warm', negated: true }] })],
            }),
          ],
        }),
      ),
    );

    expect(result.ok ? [] : result.problems).toEqual([]);
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
              wants: [
                aWant({ predicate: [{ tag: 'cloth' }] }),
                { predicate: [{ tag: 'blue' }] },
                { predicate: [{ tag: 'gilt' }] },
              ],
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

  it('still states its distributions when the load fails for another reason', () => {
    const result = loadContent({
      ...aContentSet(aCatalogue()),
      calendar: aCalendar({ months: [{ name: 'Thessaly', days: 31 }] }),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.map((problem) => problem.where)).toEqual(['calendar.months[0]']);
    expect(result.reports).toContainEqual({
      verdict: 'judge',
      where: 'goods',
      what: 'goods per kind: 3 goods — cloth',
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

describe('the ship and the fare rate', () => {
  it('refuses a ship with no speed to convert a distance into days', () => {
    const result = loadContent(
      aContentSet(aGalaxy({ start: aStart({ ship: { speed: 0, range: 20 } }) })),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      { verdict: 'fails', where: 'start.ship.speed', what: 'is 0, which is less than 1' },
    ]);
  });

  it('refuses a content set with no fare rate, since the engine holds no rate of its own', () => {
    const result = loadContent(aContentSet(aGalaxy({ fareRate: undefined })));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      { verdict: 'fails', where: 'fareRate', what: 'is missing or not a whole number' },
    ]);
  });
});

describe('the motifs the map is assembled from', () => {
  it('refuses a content set with no motifs, since the map is assembled from them', () => {
    const result = loadContent(aContentSet({ motifs: [] }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'motifs',
        what: 'names no motifs for the map to be assembled from',
      },
    ]);
  });

  it('refuses a motif with no slots, since it would place no locations', () => {
    const result = loadContent(aContentSet({ motifs: [aMotif({ slots: [], lanes: [] })] }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'motifs[0].slots',
        what: 'has no slots, so it would place no locations',
      },
    ]);
  });

  it('accepts a slot that is deliberately untyped, which anything may fill', () => {
    // The occasional illogical place, so a region's grammar has exceptions in
    // it (ADR 0006 decision 4).
    const result = loadContent(aContentSet({ motifs: [aMotif({ slots: [aSlot()] })] }));

    expect(result.ok ? [] : result.problems).toEqual([]);
  });

  it('refuses a slot typed by an archetype the content set does not enumerate', () => {
    const result = loadContent(
      aContentSet({ motifs: [aMotif({ slots: [aSlot({ archetype: 'cathedral' })] })] }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'motifs[0].slots[0].archetype',
        what: 'names an archetype that does not exist: cathedral',
      },
    ]);
  });

  it('refuses a slot no location in the reserve could fill, before any draw', () => {
    // `processor` is enumerated and no location is one, so the slot typed by it
    // could never be filled by any draw (ADR 0006 decision 4).
    const result = loadContent(
      aContentSet({
        motifs: [aMotif({ slots: [aSlot(), aSlot({ id: 'works', archetype: 'processor' })] })],
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'motifs[0].slots[1].archetype',
        what:
          'is processor, and no location in the reserve is one, ' +
          'so the slot can never be filled',
      },
    ]);
  });

  it('names the slot where the writer put it, whatever order it loads in', () => {
    // The loader sorts motifs by id (ADR 0009 decision 3); the problem still
    // points the writer at the position they wrote, which a check run after the
    // sort would get wrong.
    const result = loadContent(
      aContentSet({
        motifs: [
          aMotif({ id: 'zz-works', slots: [aSlot({ archetype: 'processor' })] }),
          aMotif({ id: 'aa-berth' }),
        ],
      }),
    );

    expect(result.ok ? [] : result.problems.map((problem) => problem.where)).toEqual([
      'motifs[0].slots[0].archetype',
    ]);
  });

  it('refuses a location authored with an archetype the content set does not enumerate', () => {
    const result = loadContent(aContentSet({ locations: [aLocation({ archetype: 'cathedral' })] }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'locations[0].archetype',
        what: 'names an archetype that does not exist: cathedral',
      },
    ]);
  });

  it('refuses a motif lane naming a slot that motif does not hold', () => {
    // Motifs join by inter-motif lanes the assembly adds, never by naming each
    // other's slots (ADR 0008 decision 6).
    const result = loadContent(
      aContentSet({
        motifs: [
          aMotif({
            slots: [aSlot(), aSlot({ id: 'pit' })],
            lanes: [aMotifLane({ ends: ['berth', 'gate'] })],
          }),
        ],
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'motifs[0].lanes[0].ends[1]',
        what: 'names a slot this motif does not hold: gate',
      },
    ]);
  });

  it('refuses two motif lanes joining the same pair of slots', () => {
    // One cost, the same both ways (ADR 0006 decision 7), so a lane authored
    // the other way round is the same lane twice.
    const result = loadContent(
      aContentSet({
        motifs: [
          aMotif({
            slots: [aSlot(), aSlot({ id: 'pit' })],
            lanes: [aMotifLane({ ends: ['berth', 'pit'] }), aMotifLane({ ends: ['pit', 'berth'] })],
          }),
        ],
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'motifs[0].lanes[1].ends',
        what: 'joins pit and berth, which a lane already joins: a lane is symmetric',
      },
    ]);
  });

  it('refuses a motif lane carrying no distance, which is the one number it has', () => {
    const result = loadContent(
      aContentSet({
        motifs: [
          aMotif({
            slots: [aSlot(), aSlot({ id: 'pit' })],
            lanes: [aMotifLane({ ends: ['berth', 'pit'], distance: 0 })],
          }),
        ],
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'motifs[0].lanes[0].distance',
        what: 'is 0, which is less than 1',
      },
    ]);
  });

  it('refuses a motif holding the same slot id twice, since its lanes name them', () => {
    // A motif's lanes name its slots, so two slots of one name is a lane with
    // an ambiguous end. Every list of nodes in a content set reads this way.
    const result = loadContent(aContentSet({ motifs: [aMotif({ slots: [aSlot(), aSlot()] })] }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'motifs[0].slots[1].id',
        what: 'repeats an id already used: berth',
      },
    ]);
  });

  it('refuses a motif lane from a slot to itself', () => {
    const result = loadContent(
      aContentSet({
        motifs: [aMotif({ lanes: [aMotifLane({ ends: ['berth', 'berth'] })] })],
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'motifs[0].lanes[0].ends',
        what: 'joins berth to itself, and a lane joins two slots',
      },
    ]);
  });
});

describe('the dial the draw is set by', () => {
  it('refuses a content set that declares no draw, since the engine holds no dial', () => {
    const result = loadContent(aContentSet({ drawParameters: undefined }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      { verdict: 'fails', where: 'drawParameters', what: 'is missing' },
    ]);
  });

  it('refuses a motif count of none, which would assemble no map at all', () => {
    const result = loadContent(
      aContentSet({ drawParameters: aDrawParameters({ motifsPerCampaign: 0 }) }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'drawParameters.motifsPerCampaign',
        what: 'is 0, which is less than 1',
      },
    ]);
  });

  it('refuses an inter-motif distance of nothing, which would be a zero-day hop', () => {
    const result = loadContent(
      aContentSet({
        drawParameters: aDrawParameters({ interMotifDistance: { least: 0, most: 20 } }),
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'drawParameters.interMotifDistance.least',
        what: 'is 0, which is less than 1',
      },
    ]);
  });

  it('refuses joining motifs further than the baseline ship can fly', () => {
    // An inter-motif lane beyond range is a lane no ship can fly, so the galaxy
    // would not be flyable end to end. Range is the only gate on the map
    // (ADR 0006 decision 14), and this much is checkable before any draw.
    const result = loadContent(
      aContentSet({
        drawParameters: aDrawParameters({
          motifsPerCampaign: 2,
          interMotifDistance: { least: 14, most: 40 },
        }),
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'drawParameters.interMotifDistance.most',
        what: "is 40, which is beyond the baseline ship's range of 20: no ship could fly the lane",
      },
    ]);
  });

  it('says nothing about that range when the draw places a single motif', () => {
    // With one motif there is nothing to join, so the range is never read and
    // a wide declaration is not a mistake.
    const result = loadContent(
      aContentSet({
        drawParameters: aDrawParameters({
          motifsPerCampaign: 1,
          interMotifDistance: { least: 14, most: 40 },
        }),
      }),
    );

    expect(result.ok ? [] : result.problems).toEqual([]);
  });

  it('refuses a draw that declares no location-count range, which it is checked against', () => {
    const result = loadContent(
      aContentSet({ drawParameters: aDrawParameters({ locationCount: undefined }) }),
    );

    expect(result.ok ? [] : result.problems).toEqual([
      { verdict: 'fails', where: 'drawParameters.locationCount', what: 'is missing' },
    ]);
  });

  it('refuses a re-roll bound that is not a count, since the retries are counted', () => {
    // Nought is a bound — the first draw has to pass — and less is not.
    const none = loadContent(aContentSet({ drawParameters: aDrawParameters({ rerolls: 0 }) }));
    const less = loadContent(aContentSet({ drawParameters: aDrawParameters({ rerolls: -1 }) }));

    expect(none.ok ? [] : none.problems).toEqual([]);
    expect(less.ok ? [] : less.problems).toEqual([
      { verdict: 'fails', where: 'drawParameters.rerolls', what: 'is -1, which is less than 0' },
    ]);
  });

  it('refuses an archetype enumerated twice, since an id means one thing', () => {
    const result = loadContent(aContentSet({ archetypes: [anArchetype(), anArchetype()] }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'archetypes[1].id',
        what: 'repeats an id already used: market',
      },
    ]);
  });

  it('refuses a content set enumerating no archetypes, which a location is authored with', () => {
    const result = loadContent(aContentSet({ archetypes: [] }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'archetypes',
        what: 'enumerates no archetypes for a location to be',
      },
    ]);
  });
});

/**
 * What the later stages of the **draw** read off the content set: the **kinds**
 * an **archetype** supplies and demands, which decide whether a kind stays in
 * circulation, where each **buyer** stands, and how much of the catalogue and
 * the cast a campaign hides (ADR 0008 decisions 10 and 11).
 */
describe('what the draw fills the map with', () => {
  it('refuses an archetype supplying or demanding anything but a declared kind', () => {
    const result = loadContent(
      aContentSet({
        ...aCatalogue(),
        archetypes: [
          anArchetype({ supplies: ['cloth', 'warm'] }),
          anArchetype({ id: 'extractor', demands: ['ore'] }),
          anArchetype({ id: 'processor' }),
        ],
      }),
    );

    expect(result.ok ? [] : result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'archetypes[0].supplies[1]',
        what: 'names warm, which is a quality tag and not a kind',
      },
      {
        verdict: 'fails',
        where: 'archetypes[1].demands[0]',
        what: 'names a kind that does not exist: ore',
      },
    ]);
  });

  it('reads the kinds an archetype supplies and demands', () => {
    const result = loadContent(
      aContentSet({
        ...aCatalogue(),
        archetypes: [
          anArchetype({ supplies: ['cloth'] }),
          anArchetype({ id: 'extractor', demands: ['cloth'] }),
          anArchetype({ id: 'processor' }),
        ],
      }),
    );

    expect(result.ok ? [] : result.problems).toEqual([]);
  });

  it('refuses a buyer standing nowhere the reserve holds, since a person needs a place', () => {
    // A person stands at a location, and the draw takes them out with it when
    // that location is not drawn (ADR 0008 decision 10).
    const result = loadContent(
      aContentSet({ ...aCatalogue({ buyers: [aBuyer({ locationId: 'atlantis' })] }) }),
    );

    expect(result.ok ? [] : result.problems).toEqual([
      {
        verdict: 'fails',
        where: 'buyers[0].locationId',
        what: 'names a location the reserve does not hold: atlantis',
      },
    ]);
  });

  it('refuses a hiding rate that is not a percentage, and accepts none and all', () => {
    // The rates are declared, galaxy-wide and flat (ADR 0008 decisions 10 and
    // 20), as whole percentages so the draw does no fractional arithmetic.
    const over = loadContent(
      aContentSet({ drawParameters: aDrawParameters({ goodsHiddenPercent: 101 }) }),
    );
    const missing = loadContent(
      aContentSet({ drawParameters: aDrawParameters({ peopleHiddenPercent: undefined }) }),
    );
    const ends = loadContent(
      aContentSet({
        drawParameters: aDrawParameters({ goodsHiddenPercent: 0, peopleHiddenPercent: 100 }),
      }),
    );

    expect(over.ok ? [] : over.problems).toEqual([
      {
        verdict: 'fails',
        where: 'drawParameters.goodsHiddenPercent',
        what: 'is 101, which is more than 100',
      },
    ]);
    expect(missing.ok ? [] : missing.problems).toEqual([
      {
        verdict: 'fails',
        where: 'drawParameters.peopleHiddenPercent',
        what: 'is missing or not a whole number',
      },
    ]);
    expect(ends.ok ? [] : ends.problems).toEqual([]);
  });
});
