import { describe, expect, it } from 'vitest';
import { view } from '../src/engine';
import {
  aDrawParameters,
  aGalaxy,
  aLocation,
  aShopParameters,
  aTradingGalaxy,
  loadedContentSet,
} from './support/content';
import { started } from './support/campaign';

const SEED = 20261024;

describe('the shop where the player is', () => {
  it('stocks lots of the kinds its archetype supplies, and of nothing else', () => {
    const lots = view(started(loadedContentSet(aTradingGalaxy()), SEED)).here?.lots;

    // 180 credits buys every unit of a lot but the silk's, at four.
    expect(lots).toEqual([
      {
        lot: 'kestrel/blanket',
        good: 'Ship blanket',
        kind: 'cloth',
        quantity: 5,
        price: 25,
        mostYouCanBuy: 5,
      },
      {
        lot: 'kestrel/quilt',
        good: 'Quilted roll',
        kind: 'cloth',
        quantity: 5,
        price: 30,
        mostYouCanBuy: 5,
      },
      {
        lot: 'kestrel/silk',
        good: 'Bolt of silk',
        kind: 'cloth',
        quantity: 5,
        price: 40,
        mostYouCanBuy: 4,
      },
    ]);
  });

  it('stocks nothing where the archetype supplies nothing', () => {
    const content = loadedContentSet(
      aTradingGalaxy(aGalaxy({ locations: [aLocation(), aLocation({ id: 'bellwether' })] })),
    );

    expect(view(started(content, SEED)).here?.lots).toEqual([]);
  });

  it('stocks only goods the draw kept, never one it hid', () => {
    // Every good is rolled hidden and the floor of two draws two of the three
    // cloth goods back, so a shop that read the reserve would list three.
    const content = loadedContentSet(
      aTradingGalaxy({ drawParameters: aDrawParameters({ goodsHiddenPercent: 100 }) }),
    );

    expect(view(started(content, SEED)).here?.lots).toHaveLength(2);
  });

  it('stocks as many lots as the shop draws, out of the goods it supplies', () => {
    const content = loadedContentSet(
      aTradingGalaxy({ shops: aShopParameters({ lotsPerShop: { least: 1, most: 1 } }) }),
    );

    const lots = view(started(content, SEED)).here?.lots ?? [];
    expect(lots).toHaveLength(1);
    expect(lots[0]?.kind).toBe('cloth');
  });
});

describe('what a lot costs', () => {
  it("charges the shop's markup on worth, rounded up to a whole credit", () => {
    // A quarter on 25, 30 and 40: 31.25, 37.5 and 50.
    const content = loadedContentSet(
      aTradingGalaxy({ shops: aShopParameters({ markupPercent: { least: 25, most: 25 } }) }),
    );

    const prices = view(started(content, SEED)).here?.lots.map(({ good, price }) => [good, price]);
    expect(prices).toEqual([
      ['Ship blanket', 32],
      ['Quilted roll', 38],
      ['Bolt of silk', 50],
    ]);
  });

  it('adds a share of the scarcity for every unit a lot opens short of full', () => {
    // Lots open between 1 and 10 units, and one opening at 10 adds nothing
    // (shown below, where every lot opens full). At this seed the
    // blanket's lot opens 6 short, so 6/10 of 50% is 30% and 25 becomes 32.5;
    // the quilt's 8 short, 40% on 30 is 42; the silk's 9 short, 45% on 40 is 58.
    const content = loadedContentSet(
      aTradingGalaxy({
        shops: aShopParameters({ lotQuantity: { least: 1, most: 10 }, scarcityPercent: 50 }),
      }),
    );

    const lots = view(started(content, SEED)).here?.lots;
    expect(lots?.map(({ good, quantity, price }) => [good, quantity, price])).toEqual([
      ['Ship blanket', 4, 33],
      ['Quilted roll', 2, 42],
      ['Bolt of silk', 1, 58],
    ]);
  });
});

describe('what a lot costs, all of it together', () => {
  it('draws one markup for the whole shop, and a full lot adds no scarcity', () => {
    // The markup may land anywhere from 10% to 40%. Of those, only 25% prices
    // all three at 32, 38 and 50 (31.25, 37.5 and 50): one draw, for the shop.
    // Every lot opens full at five, so a scarcity of 50% adds nothing.
    const content = loadedContentSet(
      aTradingGalaxy({
        shops: aShopParameters({ markupPercent: { least: 10, most: 40 }, scarcityPercent: 50 }),
      }),
    );

    const prices = view(started(content, SEED)).here?.lots.map(({ good, price }) => [good, price]);
    expect(prices).toEqual([
      ['Ship blanket', 32],
      ['Quilted roll', 38],
      ['Bolt of silk', 50],
    ]);
  });

  it('adds the markup and the scarcity together before rounding, once', () => {
    // The scarcity test's lots, at a 25% markup: 55% on 25 is 38.75, 65% on 30
    // is 49.5 and 70% on 40 is 68. Rounding the markup up first would make the
    // blanket 32, and 30% of its worth on top of that 39.5, so 40.
    const content = loadedContentSet(
      aTradingGalaxy({
        shops: aShopParameters({
          markupPercent: { least: 25, most: 25 },
          lotQuantity: { least: 1, most: 10 },
          scarcityPercent: 50,
        }),
      }),
    );

    const prices = view(started(content, SEED)).here?.lots.map(({ good, price }) => [good, price]);
    expect(prices).toEqual([
      ['Ship blanket', 39],
      ['Quilted roll', 50],
      ['Bolt of silk', 68],
    ]);
  });
});

describe('stocking a shop', () => {
  it('stocks the same shop from the same seed, and a different one from another', () => {
    const content = loadedContentSet(
      aTradingGalaxy({
        shops: aShopParameters({
          lotsPerShop: { least: 1, most: 3 },
          lotQuantity: { least: 1, most: 10 },
          markupPercent: { least: 0, most: 40 },
        }),
      }),
    );
    const lotsAt = (seed: number) => view(started(content, seed)).here?.lots;

    expect(lotsAt(SEED)).toEqual(lotsAt(SEED));
    expect(lotsAt(SEED)).not.toEqual(lotsAt(SEED + 1));
  });
});
