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

function sellCommand(campaign: Campaign, good: string): Command {
  const match = view(campaign).here?.people[0]?.wants[0]?.matches.find(
    (each) => each.good === good,
  );
  if (match === undefined) throw new Error(`${good} is not offered for sale`);
  return match.sell;
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
    const command = first?.matches[1]?.sell;
    if (command === undefined) throw new Error('nothing to sell');

    const sold = after(campaign, command);

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

    expect(takeCommand(campaign, { kind: 'sell', want: 'ilse#0', good: 'quilt' })).toMatchObject({
      rejected: { code: 'not-in-the-hold' },
    });
  });

  it('refuses a want that belongs to somebody standing elsewhere', () => {
    const campaign = holding();

    expect(takeCommand(campaign, { kind: 'sell', want: 'osk#0', good: 'blanket' })).toMatchObject({
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

    expect(takeCommand(underway, { kind: 'sell', want: 'ilse#0', good: 'blanket' })).toMatchObject({
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
