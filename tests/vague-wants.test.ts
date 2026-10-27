import { describe, expect, it } from 'vitest';
import { loadContent, startCampaign, view, type ContentSet, type Tier } from '../src/engine';
import {
  aBuyer,
  aContentSet,
  aDrawParameters,
  aGood,
  aLocation,
  aMotif,
  anArchetype,
  aSlot,
  aTag,
  aTradingGalaxy,
  aWant,
  anElsewhereBuyer,
  loadedContentSet,
  type RawObject,
} from './support/content';
import { after, started } from './support/campaign';

/** A vague want: anything of a kind, with no predicate and no plain form. */
function aVagueWant(kind: string, overrides: RawObject = {}): RawObject {
  return { kind, quantity: 1, ...overrides };
}

describe('a vague want', () => {
  /** Ilse is vaguely after cloth; the player holds the silk, a blanket and a spanner. */
  function holdingForIlse(): ReturnType<typeof started> {
    const campaign = started(
      loadedContentSet(
        aTradingGalaxy({
          buyers: [
            aBuyer({ wants: [aVagueWant('cloth')], bonusTags: ['warm'] }),
            anElsewhereBuyer(),
          ],
        }),
      ),
      1,
    );
    return after(
      campaign,
      { kind: 'buy', lot: 'kestrel/silk', quantity: 1 },
      { kind: 'buy', lot: 'kestrel/blanket', quantity: 1 },
    );
  }

  it('is read as vague, and worded as a gesture at its kind', () => {
    const want = view(holdingForIlse()).here?.people[0]?.wants[0];

    expect(want?.register).toBe('vague');
    expect(want?.wording).toBe('is after anything at all in cloth');
  });

  it('reads a plain want as plain', () => {
    const campaign = started(
      loadedContentSet(aTradingGalaxy({ buyers: [aBuyer(), anElsewhereBuyer()] })),
      1,
    );

    expect(view(campaign).here?.people[0]?.wants[0]?.register).toBe('plain');
  });

  it('is met by any good of the kind, and better by one the buyer pays more for', () => {
    const matches = view(holdingForIlse()).here?.people[0]?.wants[0]?.matches ?? [];

    const tiers: Record<string, Tier> = Object.fromEntries(
      matches.map(({ good, tier }) => [good, tier]),
    );
    expect(tiers).toEqual({ 'Bolt of silk': 'acceptable', 'Ship blanket': 'great' });
  });

  it('refuses a good of another kind', () => {
    const campaign = after(
      started(
        loadedContentSet(
          aTradingGalaxy({
            buyers: [aBuyer({ wants: [aVagueWant('tools')] }), anElsewhereBuyer()],
          }),
        ),
        1,
      ),
      { kind: 'buy', lot: 'kestrel/silk', quantity: 1 },
    );

    expect(view(campaign).here?.people[0]?.wants[0]?.matches[0]?.tier).toBe('refused');
  });
});

describe('what a vague want cannot be written as', () => {
  function problemsOf(overrides: RawObject): readonly { where: string; what: string }[] {
    const result = loadContent(aContentSet(aTradingGalaxy(overrides)));
    return result.ok ? [] : result.problems;
  }

  it('one with a plain form', () => {
    const wants = [aVagueWant('cloth', { plainly: 'wants something to wear' })];

    expect(
      problemsOf({ buyers: [aBuyer({ wants }), anElsewhereBuyer()] }).map(({ where }) => where),
    ).toContain('buyers[0].wants[0].plainly');
  });

  it('one that also states a predicate or names a good', () => {
    for (const extra of [{ predicate: [{ tag: 'warm' }] }, { goodId: 'silk' }]) {
      const wants = [aVagueWant('cloth', extra)];

      expect(problemsOf({ buyers: [aBuyer({ wants }), anElsewhereBuyer()] })).not.toEqual([]);
    }
  });

  it('one pointed at a tag that is not a kind', () => {
    const wants = [aVagueWant('warm')];

    expect(
      problemsOf({ buyers: [aBuyer({ wants }), anElsewhereBuyer()] }).map(({ where }) => where),
    ).toContain('buyers[0].wants[0].kind');
  });

  it('one pointed at a kind below the declared floor, naming the kind and its count', () => {
    // Tools is left carrying the spanner alone, against the floor of 2 `aBounds` declares.
    const wants = [aVagueWant('tools')];
    const goods = (aTradingGalaxy().goods as RawObject[]).filter(({ id }) => id !== 'vice');

    const problems = problemsOf({ goods, buyers: [aBuyer({ wants }), anElsewhereBuyer()] });

    expect(problems).toContainEqual({
      verdict: 'fails',
      where: 'buyers[0].wants[0].kind',
      what: expect.stringContaining('tools, which carries 1 good against a usability floor of 2'),
    });
  });

  it('reads the floor from the content set rather than holding one of its own', () => {
    // Cloth carries three goods: usable at a floor of 3, and not at 4.
    const wants = [aVagueWant('cloth')];
    const buyers = [aBuyer({ wants }), anElsewhereBuyer()];
    const floorOf = (usabilityFloor: number) =>
      problemsOf({
        buyers,
        bounds: {
          tagsPerGood: { least: 1, most: 5 },
          goodsPerRoleTag: { least: 2, most: 8 },
          usabilityFloor,
          quirkRation: 2,
        },
      });

    expect(floorOf(3)).toEqual([]);
    expect(floorOf(4).map(({ where }) => where)).toContain('buyers[0].wants[0].kind');
  });
});

describe('a kind usable in the reserve and absent from the draw', () => {
  /**
   * Only the extractor is drawn, and Marta stands at its Hollow vaguely after
   * cloth, which nothing drawn supplies or demands and which carries four
   * goods in the reserve, above the floor of 2. At sixty in a hundred hidden,
   * the draw may drop cloth entire, and with no re-roll to spare a drop is final.
   */
  function aReserveWhereClothMayDrop(): ContentSet {
    return loadedContentSet({
      archetypes: [
        anArchetype({ supplies: ['cloth'] }),
        anArchetype({ id: 'extractor', demands: ['ore'] }),
      ],
      locations: [
        aLocation(),
        aLocation({ id: 'hollow', name: "Grieve's Hollow", archetype: 'extractor' }),
      ],
      motifs: [aMotif({ slots: [aSlot({ archetype: 'extractor' })] })],
      tags: [aTag(), aTag({ id: 'ore', tells: ['ore'] })],
      goods: [
        aGood({ id: 'silk' }),
        aGood({ id: 'linen', name: 'Linen' }),
        aGood({ id: 'canvas', name: 'Canvas' }),
        aGood({ id: 'felt', name: 'Felt' }),
        aGood({ id: 'galena', name: 'Galena', prose: 'Lead ore.', kind: 'ore' }),
      ],
      buyers: [
        aBuyer({
          id: 'marta',
          name: 'Marta',
          locationId: 'hollow',
          wants: [aVagueWant('cloth')],
          bonusTags: [],
        }),
        aBuyer({
          id: 'oskar',
          name: 'Oskar Venn',
          locationId: 'hollow',
          wants: [aWant({ predicate: [{ tag: 'ore' }] })],
          bonusTags: [],
        }),
      ],
      drawParameters: aDrawParameters({ goodsHiddenPercent: 60, rerolls: 0 }),
    });
  }

  // Found with the seed-finder's method: cloth is dropped on 1 and kept on 5.
  const DROPS = 1;
  const KEEPS = 5;

  it('fails the load on a seed that drops the kind, naming the kind and its count', () => {
    const result = startCampaign(aReserveWhereClothMayDrop(), DROPS);

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).toContain(
      'marta is after cloth, which the draw left with 0 goods',
    );
    expect(JSON.stringify(result)).toContain('a usability floor of 2');
  });

  it('loads on a seed that keeps it', () => {
    expect(startCampaign(aReserveWhereClothMayDrop(), KEEPS).ok).toBe(true);
  });
});
