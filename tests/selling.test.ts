import { describe, expect, it } from 'vitest';
import { isRejected, takeCommand, view, type Campaign, type Command } from '../src/engine';
import {
  aBuyer,
  anElsewhereBuyer,
  aStart,
  aTradingGalaxy,
  aWant,
  anOffers,
  loadedContentSet,
} from './support/content';
import { after, started } from './support/campaign';

const SEED = 20261024;

/**
 * Ilse at Kestrel wants cloth and warm and pays more for warm, at the fixture's
 * offers of 50, 100 and 150 percent of worth. The player holds a silk (40,
 * grudging), a blanket (25, great) and a quilt (30, great), bought in that order.
 */
function holding(buyer: Record<string, unknown> = aBuyer()): Campaign {
  const campaign = started(
    loadedContentSet(aTradingGalaxy({ buyers: [buyer, anElsewhereBuyer()], offers: anOffers() })),
    SEED,
  );
  return after(
    campaign,
    { kind: 'buy', lot: 'kestrel/silk', quantity: 1 },
    { kind: 'buy', lot: 'kestrel/blanket', quantity: 2 },
  );
}

function sellCommand(campaign: Campaign, good: string, quantity = 1): Command {
  const match = view(campaign).here?.people[0]?.wants[0]?.matches.find(
    (each) => each.good === good,
  );
  if (match === undefined) throw new Error(`${good} is not offered for sale`);
  return { kind: 'sell', ...match.sale, quantity };
}

describe('selling against a want', () => {
  it('pays the offer the read model quoted, and takes one unit out of the hold', () => {
    const campaign = holding();
    const quoted = view(campaign).here?.people[0]?.wants[0]?.matches[1]?.offer;

    const sold = after(campaign, sellCommand(campaign, 'Ship blanket'));

    expect(quoted).toBe(37);
    expect(view(sold).credits.credits).toBe(view(campaign).credits.credits + 37);
    expect(view(sold).hold.cargo).toEqual([
      { good: 'Bolt of silk', kind: 'cloth', quantity: 1 },
      { good: 'Ship blanket', kind: 'cloth', quantity: 1 },
    ]);
  });

  it('empties the entry when the last unit goes', () => {
    const campaign = holding();

    const sold = after(campaign, sellCommand(campaign, 'Bolt of silk'));

    expect(view(sold).hold.cargo.map(({ good }) => good)).toEqual(['Ship blanket']);
  });

  it('pays a grudging offer for a near miss, and that closes the want', () => {
    const campaign = holding();

    const sold = after(campaign, sellCommand(campaign, 'Bolt of silk'));

    expect(view(sold).credits.credits).toBe(view(campaign).credits.credits + 20);
    expect(view(sold).here?.people[0]?.wants).toEqual([]);
  });

  it('closes the want for the rest of the campaign, so it cannot be sold to twice', () => {
    const campaign = holding();
    const command = sellCommand(campaign, 'Ship blanket');
    const sold = after(campaign, command);

    expect(view(sold).here?.people[0]?.wants).toEqual([]);
    expect(takeCommand(sold, command)).toMatchObject({ rejected: { code: 'no-such-want' } });
  });

  it('leaves the other wants of the buyer where they were', () => {
    const campaign = holding(
      aBuyer({
        wants: [aWant(), aWant({ predicate: [{ tag: 'cloth' }], plainly: 'wants cloth' })],
      }),
    );
    const first = view(campaign).here?.people[0]?.wants[0];
    const sold = after(campaign, sellCommand(campaign, 'Ship blanket'));

    expect(view(sold).here?.people[0]?.wants.map(({ want }) => want)).toEqual(
      view(campaign)
        .here?.people[0]?.wants.map(({ want }) => want)
        .filter((want) => want !== first?.want),
    );
  });

  it('is not an action, so the day goes on', () => {
    const campaign = holding();

    const sold = after(campaign, sellCommand(campaign, 'Ship blanket'));

    expect(view(sold).today.day).toBe(view(campaign).today.day);
    expect(view(sold).digest).toBeNull();
  });
});

describe('what a sale is refused for', () => {
  it('refuses a refused pairing in the buyer’s own words, and changes nothing', () => {
    const campaign = holding(
      aBuyer({
        wants: [aWant({ predicate: [{ tag: 'warm' }] })],
        refusalLine: 'Silk? In this draught? Take it away.',
      }),
    );

    const result = takeCommand(campaign, sellCommand(campaign, 'Bolt of silk'));

    expect(result).toEqual({
      rejected: {
        code: 'refused-by-the-buyer',
        message: 'Silk? In this draught? Take it away.',
      },
    });
    expect(isRejected(result)).toBe(true);
  });

  it('refuses a good that is not in the hold', () => {
    const campaign = holding();

    expect(
      takeCommand(campaign, { kind: 'sell', want: 'ilse#0', good: 'quilt', quantity: 1 }),
    ).toMatchObject({
      rejected: { code: 'not-in-the-hold' },
    });
  });

  it('refuses a want that belongs to somebody standing elsewhere', () => {
    const campaign = holding();

    expect(
      takeCommand(campaign, { kind: 'sell', want: 'osk#0', good: 'blanket', quantity: 1 }),
    ).toMatchObject({
      rejected: { code: 'no-such-want' },
    });
  });

  it('refuses a sale in transit, where there is nobody to sell to', () => {
    const rich = started(
      loadedContentSet(
        aTradingGalaxy({ buyers: [aBuyer(), anElsewhereBuyer()], start: aStart({ credits: 500 }) }),
      ),
      SEED,
    );
    const underway = after(rich, { kind: 'depart', toId: 'bellwether' });

    expect(
      takeCommand(underway, { kind: 'sell', want: 'ilse#0', good: 'blanket', quantity: 1 }),
    ).toMatchObject({
      rejected: { code: 'already-underway' },
    });
  });

  it('refuses a sale that is not made of two ids', () => {
    for (const command of [
      { kind: 'sell', want: 'ilse#0' },
      { kind: 'sell', good: 'silk' },
    ]) {
      expect(takeCommand(holding(), command as unknown as Command)).toMatchObject({
        rejected: { code: 'not-a-command' },
      });
    }
  });
});

describe('selling more than a unit', () => {
  /** Ilse takes three units of cloth and warm, and the player holds two blankets. */
  function wantingThree(): Campaign {
    return holding(aBuyer({ wants: [aWant({ quantity: 3 })] }));
  }

  it('pays the offer for every unit and takes every unit out of the hold', () => {
    const campaign = wantingThree();

    const sold = after(campaign, sellCommand(campaign, 'Ship blanket', 2));

    expect(view(sold).credits.credits).toBe(view(campaign).credits.credits + 2 * 37);
    expect(view(sold).hold.cargo.map(({ good }) => good)).toEqual(['Bolt of silk']);
  });

  it('leaves the want open for what the buyer still takes', () => {
    const campaign = wantingThree();

    const sold = after(campaign, sellCommand(campaign, 'Ship blanket', 2));

    expect(view(sold).here?.people[0]?.wants.map(({ wanted }) => wanted)).toEqual([1]);
  });

  it('closes the want when the last of it is sold, across more than one sale', () => {
    const campaign = wantingThree();
    const once = after(campaign, sellCommand(campaign, 'Ship blanket'));

    const sold = after(once, sellCommand(once, 'Ship blanket'), sellCommand(once, 'Bolt of silk'));

    expect(view(sold).here?.people[0]?.wants).toEqual([]);
  });

  it('closes the whole want on a grudging sale, whatever was still wanted', () => {
    const campaign = wantingThree();

    const sold = after(campaign, sellCommand(campaign, 'Bolt of silk'));

    expect(view(sold).credits.credits).toBe(view(campaign).credits.credits + 20);
    expect(view(sold).here?.people[0]?.wants).toEqual([]);
  });

  it('refuses more than the hold carries, and says how much it carries', () => {
    const campaign = wantingThree();

    expect(takeCommand(campaign, sellCommand(campaign, 'Ship blanket', 3))).toEqual({
      rejected: {
        code: 'more-than-the-hold-carries',
        message: 'That is 3 units, and your hold carries 2.',
      },
    });
  });

  it('refuses more than the buyer takes, and says how much they take', () => {
    const campaign = holding(aBuyer({ wants: [aWant({ quantity: 1 })] }));

    expect(takeCommand(campaign, sellCommand(campaign, 'Ship blanket', 2))).toEqual({
      rejected: { code: 'more-than-the-buyer-takes', message: 'Ilse Vantry will take 1.' },
    });
  });

  it('says how many the player could sell, by the hold and by the buyer', () => {
    // Two blankets and a silk aboard; the buyer takes three, then one.
    const three = view(wantingThree()).here?.people[0]?.wants[0];
    const one = view(holding(aBuyer({ wants: [aWant({ quantity: 1 })] }))).here?.people[0]
      ?.wants[0];

    expect(three?.matches.map(({ good, mostYouCanSell }) => [good, mostYouCanSell])).toEqual([
      ['Bolt of silk', 1],
      ['Ship blanket', 2],
    ]);
    expect(one?.matches.map(({ mostYouCanSell }) => mostYouCanSell)).toEqual([1, 1]);
  });

  it('offers none of a good the buyer refuses', () => {
    const campaign = holding(aBuyer({ wants: [aWant({ predicate: [{ tag: 'warm' }] })] }));

    expect(view(campaign).here?.people[0]?.wants[0]?.matches[0]).toMatchObject({
      tier: 'refused',
      mostYouCanSell: 0,
    });
  });
});
