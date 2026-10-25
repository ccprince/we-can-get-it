import { describe, expect, it } from 'vitest';
import { loadContent, view, type Campaign, type MatchView, type Tier } from '../src/engine';
import {
  aBuyer,
  aContentSet,
  aTradingGalaxy,
  aWant,
  anOffers,
  loadedContentSet,
  type RawObject,
} from './support/content';
import { after, started } from './support/campaign';

const SEED = 20261024;

/** Osk, at Bellwether, keeps every tag in use, so the subject can be the only one at Kestrel. */
const osk = aBuyer({
  id: 'osk',
  name: 'Osk',
  locationId: 'bellwether',
  wants: [
    aWant({
      predicate: [{ tag: 'tools' }, { tag: 'cloth' }, { tag: 'warm' }],
      plainly: 'wants a great deal',
    }),
  ],
  bonusTags: [],
});

/**
 * Kestrel sells cloth: the silk (worth 40), which is cloth and nothing else,
 * and the blanket (25) and the quilt (30), which are cloth and `warm`. The
 * player buys one of each, so the hold is the three goods in that order, and
 * the one buyer standing at Kestrel is the subject.
 */
function holdingClothWith(buyer: RawObject, offers: RawObject = anOffers()): Campaign {
  const campaign = started(
    loadedContentSet(aTradingGalaxy({ buyers: [buyer, osk], offers })),
    SEED,
  );
  return after(
    campaign,
    { kind: 'buy', lot: 'kestrel/silk', quantity: 1 },
    { kind: 'buy', lot: 'kestrel/blanket', quantity: 1 },
    { kind: 'buy', lot: 'kestrel/quilt', quantity: 1 },
  );
}

function matchesFor(campaign: Campaign, want = 0): readonly MatchView[] {
  const person = view(campaign).here?.people[0];
  if (person === undefined) throw new Error('nobody is standing here');
  return person.wants[want]?.matches ?? [];
}

function tiers(campaign: Campaign, want = 0): Record<string, Tier> {
  return Object.fromEntries(matchesFor(campaign, want).map(({ good, tier }) => [good, tier]));
}

const COLD = { good: 'Bolt of silk' };

describe('the tier a good would earn', () => {
  it('is great when every term is met and the buyer pays more for a tag it carries', () => {
    // Ilse wants cloth and warm, and warm is her bonus.
    const campaign = holdingClothWith(aBuyer());

    expect(tiers(campaign)).toEqual({
      'Bolt of silk': 'grudging',
      'Ship blanket': 'great',
      'Quilted roll': 'great',
    });
  });

  it('is acceptable when every term is met and no bonus tag is carried', () => {
    const campaign = holdingClothWith(aBuyer({ bonusTags: [] }));

    expect(tiers(campaign)).toMatchObject({
      'Ship blanket': 'acceptable',
      'Quilted roll': 'acceptable',
    });
  });

  it('is grudging when some of the terms are met but not all', () => {
    // The silk is cloth, and is not warm.
    expect(tiers(holdingClothWith(aBuyer()))).toMatchObject({ 'Bolt of silk': 'grudging' });
  });

  it('is refused when none of the terms are met', () => {
    const campaign = holdingClothWith(
      aBuyer({ wants: [aWant({ predicate: [{ tag: 'warm' }] })], bonusTags: [] }),
    );

    expect(tiers(campaign)).toMatchObject({ 'Bolt of silk': 'refused' });
  });

  it('is refused when a refusal tag is carried, however well the terms are met', () => {
    const campaign = holdingClothWith(
      aBuyer({
        wants: [aWant({ predicate: [{ tag: 'cloth' }] })],
        bonusTags: [],
        refusalTags: ['warm'],
      }),
    );

    expect(tiers(campaign)).toEqual({
      'Bolt of silk': 'acceptable',
      'Ship blanket': 'refused',
      'Quilted roll': 'refused',
    });
  });

  it('is shifted by a bonus tag only up from a fully met want, never from a near miss', () => {
    // The silk meets one of Ilse's two terms and carries no bonus; give her a
    // bonus the silk does carry, and it is still grudging.
    const campaign = holdingClothWith(aBuyer({ bonusTags: ['cloth'] }));

    expect(tiers(campaign)).toMatchObject({ 'Bolt of silk': 'grudging' });
  });

  it('refuses a good carrying a tag the want negates', () => {
    const campaign = holdingClothWith(
      aBuyer({
        wants: [aWant({ predicate: [{ tag: 'cloth' }, { tag: 'warm', negated: true }] })],
        bonusTags: [],
      }),
    );

    expect(tiers(campaign)).toEqual({
      'Bolt of silk': 'acceptable',
      'Ship blanket': 'refused',
      'Quilted roll': 'refused',
    });
  });

  it('matches a want naming one good only that good', () => {
    const campaign = holdingClothWith(aBuyer({ wants: [{ goodId: 'blanket' }], bonusTags: [] }));

    expect(tiers(campaign)).toEqual({
      'Bolt of silk': 'refused',
      'Ship blanket': 'acceptable',
      'Quilted roll': 'refused',
    });
  });
});

describe('what a match is offered', () => {
  it('is a whole number of credits, rounded down', () => {
    // The blanket is worth 25: a half of it is 12.5.
    const campaign = holdingClothWith(
      aBuyer({ wants: [aWant({ predicate: [{ tag: 'warm' }] })], bonusTags: [] }),
      anOffers({ acceptablePercent: 50, greatPercent: 60, grudgingPercent: 40 }),
    );

    expect(matchesFor(campaign).find(({ good }) => good === 'Ship blanket')?.offer).toBe(12);
  });

  it('pays a better tier better, for one good', () => {
    // The silk is worth 40 against the same buyer at three tiers.
    const grudging = holdingClothWith(aBuyer());
    const acceptable = holdingClothWith(
      aBuyer({ wants: [aWant({ predicate: [{ tag: 'cloth' }] })], bonusTags: [] }),
    );
    const great = holdingClothWith(
      aBuyer({ wants: [aWant({ predicate: [{ tag: 'cloth' }] })], bonusTags: ['cloth'] }),
    );

    const silk = (campaign: Campaign) =>
      matchesFor(campaign).find(({ good }) => good === COLD.good)?.offer;
    expect([silk(grudging), silk(acceptable), silk(great)]).toEqual([20, 40, 60]);
  });

  it('is nothing for a refused good, which carries the buyer’s own words instead', () => {
    const campaign = holdingClothWith(
      aBuyer({
        wants: [aWant({ predicate: [{ tag: 'warm' }] })],
        refusalLine: 'Silk? In this draught? Take it away.',
      }),
    );

    const [silk, blanket] = matchesFor(campaign);
    expect(silk).toEqual({
      good: 'Bolt of silk',
      tier: 'refused',
      offer: null,
      reason: 'Silk? In this draught? Take it away.',
    });
    expect(blanket).toMatchObject({ tier: 'great', offer: 37, reason: null });
  });
});

describe('the wants the read model shows', () => {
  it('states each want plainly, or by the good it names', () => {
    const campaign = holdingClothWith(
      aBuyer({
        wants: [aWant({ plainly: 'wants something warm' }), { goodId: 'silk' }],
        bonusTags: [],
      }),
    );

    const person = view(campaign).here?.people[0];
    expect(person?.name).toBe('Ilse Vantry');
    expect(person?.wants.map(({ wording }) => wording).sort()).toEqual([
      'wants Bolt of silk',
      'wants something warm',
    ]);
  });

  it('puts a want naming a good first, whatever order the writer wrote them in', () => {
    const wants = [aWant(), { goodId: 'silk' }, aWant({ predicate: [{ tag: 'cloth' }] })];
    const campaign = holdingClothWith(aBuyer({ wants, bonusTags: [] }));
    const reversed = holdingClothWith(aBuyer({ wants: [...wants].reverse(), bonusTags: [] }));

    const wordings = (each: Campaign) =>
      view(each).here?.people[0]?.wants.map(({ wording }) => wording);
    expect(wordings(campaign)).toEqual(wordings(reversed));
    expect(wordings(campaign)?.[0]).toBe('wants Bolt of silk');
  });

  it('shows no match for a hold that is empty', () => {
    const campaign = started(loadedContentSet(aTradingGalaxy({ buyers: [aBuyer(), osk] })), SEED);

    expect(view(campaign).here?.people[0]?.wants[0]?.matches).toEqual([]);
  });

  it('shows only the people standing where the player is', () => {
    const campaign = started(loadedContentSet(aTradingGalaxy({ buyers: [aBuyer(), osk] })), SEED);

    expect(view(campaign).here?.people.map(({ name }) => name)).toEqual(['Ilse Vantry']);
  });
});

describe('what a want cannot be written as', () => {
  function problemsOf(overrides: RawObject): readonly { where: string }[] {
    const result = loadContent(aContentSet(aTradingGalaxy(overrides)));
    return result.ok ? [] : result.problems;
  }

  it('a disjunction: a term names one tag', () => {
    const problems = problemsOf({
      buyers: [aBuyer({ wants: [aWant({ predicate: [{ anyOf: ['cloth', 'warm'] }] })] }), osk],
    });

    expect(problems.map(({ where }) => where)).toContain('buyers[0].wants[0].predicate[0].tag');
  });

  it('a want that is neither a predicate nor a good, nor both', () => {
    for (const want of [{}, { predicate: [{ tag: 'cloth' }], plainly: 'x', goodId: 'silk' }]) {
      expect(problemsOf({ buyers: [aBuyer({ wants: [want] }), osk] })).not.toEqual([]);
    }
  });

  it('a want with no plain wording, or a buyer with no words of their own', () => {
    const wants = [aWant({ plainly: undefined })];

    expect(problemsOf({ buyers: [aBuyer({ wants }), osk] }).map(({ where }) => where)).toContain(
      'buyers[0].wants[0].plainly',
    );
    expect(
      problemsOf({ buyers: [aBuyer({ refusalLine: undefined }), osk] }).map(({ where }) => where),
    ).toContain('buyers[0].refusalLine');
  });

  it('two wants asking for the same thing', () => {
    expect(problemsOf({ buyers: [aBuyer({ wants: [aWant(), aWant()] }), osk] })).not.toEqual([]);
  });

  it('offers that do not pay a better tier better', () => {
    expect(
      problemsOf({ offers: anOffers({ acceptablePercent: 50 }) }).map(({ where }) => where),
    ).toContain('offers');
  });
});
