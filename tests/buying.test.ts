import { describe, expect, it } from 'vitest';
import { takeCommand, view, type Campaign, type Command } from '../src/engine';
import { aShip, aStart, aTradingGalaxy, loadedContentSet, type RawObject } from './support/content';
import { after, started } from './support/campaign';

const SEED = 20261024;

/**
 * Kestrel's shop, at the fixture defaults: lots of five at worth — the blanket
 * at 25, the quilt at 30 and the silk at 40.
 */
function atKestrel(overrides: RawObject = {}): Campaign {
  return started(loadedContentSet(aTradingGalaxy(overrides)), SEED);
}

function buy(lot: string, quantity: number): Command {
  return { kind: 'buy', lot, quantity };
}

describe('buying a lot', () => {
  it('costs its price a unit, fills the hold, and depletes the lot', () => {
    const campaign = after(atKestrel(), buy('kestrel/blanket', 2));

    const seen = view(campaign);
    expect(seen.credits).toEqual({ credits: 130 });
    expect(seen.hold).toEqual({
      capacity: 100,
      used: 2,
      cargo: [{ good: 'Ship blanket', kind: 'cloth', quantity: 2 }],
    });
    expect(seen.here?.lots[0]).toMatchObject({ good: 'Ship blanket', quantity: 3 });
  });

  it('is not an action, so the day goes on', () => {
    const campaign = after(atKestrel(), buy('kestrel/blanket', 1));

    expect(view(campaign).today.day).toBe(1);
    expect(view(campaign).digest).toBeNull();
  });

  it('lists the hold in the order goods came aboard', () => {
    const campaign = after(atKestrel(), buy('kestrel/silk', 1), buy('kestrel/blanket', 1));

    expect(view(campaign).hold.cargo.map(({ good }) => good)).toEqual([
      'Bolt of silk',
      'Ship blanket',
    ]);
  });

  it('carries two buys of one good as one cargo', () => {
    const campaign = after(atKestrel(), buy('kestrel/silk', 1), buy('kestrel/silk', 2));

    expect(view(campaign).hold.cargo).toEqual([
      { good: 'Bolt of silk', kind: 'cloth', quantity: 3 },
    ]);
  });

  it('takes a lot bought out off the shelf for the rest of the campaign', () => {
    const campaign = after(atKestrel(), buy('kestrel/quilt', 5), { kind: 'wait' });

    expect(view(campaign).here?.lots.map(({ good }) => good)).toEqual([
      'Ship blanket',
      'Bolt of silk',
    ]);
    expect(takeCommand(campaign, buy('kestrel/quilt', 1))).toMatchObject({
      rejected: { code: 'no-such-lot' },
    });
  });
});

describe('what a buy is refused for', () => {
  it('refuses more than the hold has room for, and says how much room there is', () => {
    const campaign = after(
      atKestrel({ start: aStart({ ship: aShip({ hold: 3 }) }) }),
      buy('kestrel/silk', 2),
    );

    expect(takeCommand(campaign, buy('kestrel/blanket', 2))).toEqual({
      rejected: {
        code: 'not-enough-room',
        message: 'That is 2 units, and your hold has room for 1.',
      },
    });
  });

  it('refuses a buy the credits will not cover, and says what it would cost', () => {
    const campaign = atKestrel({ start: aStart({ credits: 70 }) });

    expect(takeCommand(campaign, buy('kestrel/silk', 2))).toEqual({
      rejected: {
        code: 'cannot-afford-the-lot',
        message: '2 units at 40 credits is 80 credits, and you have 70.',
      },
    });
  });

  it('refuses more than the lot holds', () => {
    expect(takeCommand(atKestrel(), buy('kestrel/silk', 6))).toEqual({
      rejected: {
        code: 'more-than-the-lot-holds',
        message: 'The lot holds 5.',
      },
    });
  });

  it('refuses a lot that is not on sale where the player is', () => {
    // Bellwether's shop stocks tools, and the player is at Kestrel.
    expect(takeCommand(atKestrel(), buy('bellwether/spanner', 1))).toMatchObject({
      rejected: { code: 'no-such-lot' },
    });
  });

  it('refuses a buy in transit, where there is no shop', () => {
    const underway = after(atKestrel(), { kind: 'depart', toId: 'bellwether' });

    expect(takeCommand(underway, buy('kestrel/silk', 1))).toEqual({
      rejected: {
        code: 'already-underway',
        message: 'You are underway, and there is no shop in transit.',
      },
    });
  });

  it('refuses a quantity that is not a whole number of units', () => {
    for (const quantity of [0, -1, 1.5]) {
      expect(takeCommand(atKestrel(), buy('kestrel/silk', quantity))).toMatchObject({
        rejected: { code: 'not-a-command' },
      });
    }
  });
});

describe('the hold', () => {
  it('is empty at the start, at the capacity the ship declares', () => {
    expect(view(atKestrel({ start: aStart({ ship: aShip({ hold: 12 }) }) })).hold).toEqual({
      capacity: 12,
      used: 0,
      cargo: [],
    });
  });

  it('says how many of each lot the player could buy, by the lot, the hold and the credits', () => {
    // A hold of 3 and 100 credits, against lots of five: three blankets at 25
    // (the hold binds), three quilts at 30 (both bind), two silks at 40 (the
    // credits bind).
    const campaign = atKestrel({ start: aStart({ credits: 100, ship: aShip({ hold: 3 }) }) });

    expect(
      view(campaign).here?.lots.map(({ good, mostYouCanBuy }) => [good, mostYouCanBuy]),
    ).toEqual([
      ['Ship blanket', 3],
      ['Quilted roll', 3],
      ['Bolt of silk', 2],
    ]);
  });
});
