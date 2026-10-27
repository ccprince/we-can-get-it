import { describe, expect, it } from 'vitest';
import {
  isRejected,
  loadContent,
  takeCommand,
  view,
  type Campaign,
  type Command,
} from '../src/engine';
import {
  aBuyer,
  aContentSet,
  anElsewhereBuyer,
  anOffers,
  anOrder,
  aShip,
  aStart,
  aTradingGalaxy,
  aVagueWant,
  aWant,
  loadedContentSet,
} from './support/content';
import { after, started } from './support/campaign';

const SEED = 20261024;

/**
 * Ilse at Kestrel states an order, at the fixture's offers of 50, 100 and 150
 * percent of worth. The player holds a silk (40, which is cloth but not warm) and
 * two blankets (25, warm cloth), so the silk is a near-miss and a blanket is a
 * match. The order's last day is day 4.
 */
function holding(want: Record<string, unknown> = aWant({ ...anOrder() })): Campaign {
  const buyer = aBuyer({ wants: [want] });
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

function orderId(campaign: Campaign): string {
  const id = view(campaign).here?.people[0]?.wants[0]?.want;
  if (id === undefined) throw new Error('nobody here states an order');
  return id;
}

function accepted(campaign: Campaign): Campaign {
  return after(campaign, { kind: 'accept', want: orderId(campaign) });
}

function code(campaign: Campaign, command: Parameters<typeof takeCommand>[1]): string | undefined {
  const result = takeCommand(campaign, command);
  return isRejected(result) ? result.rejected.code : undefined;
}

describe('orders', () => {
  it('pays the stated price for each unit, not a computed offer', () => {
    const campaign = accepted(holding());
    const before = view(campaign).credits.credits;

    const filled = after(campaign, {
      kind: 'fill',
      want: orderId(campaign),
      good: 'blanket',
      quantity: 1,
    });

    // The blanket's worth is 25 and a great match would offer 37.
    expect(view(filled).credits.credits).toBe(before + 90);
  });

  it('is filled in a vague register too, by any good of the kind', () => {
    const campaign = accepted(holding(aVagueWant('cloth', { ...anOrder({ price: 70 }) })));
    const before = view(campaign).credits.credits;

    const filled = after(campaign, {
      kind: 'fill',
      want: orderId(campaign),
      good: 'silk',
      quantity: 1,
    });

    expect(view(filled).credits.credits).toBe(before + 70);
  });

  it('is not filled until it is accepted', () => {
    const campaign = holding();

    expect(
      code(campaign, { kind: 'fill', want: orderId(campaign), good: 'blanket', quantity: 1 }),
    ).toBe('not-accepted');
  });

  it('declines a near-miss and leaves the order open and the good in the hold', () => {
    const campaign = accepted(holding());
    const fill = { kind: 'fill', want: orderId(campaign), good: 'silk', quantity: 1 } as const;

    expect(code(campaign, fill)).toBe('declined-below-acceptable');
    // A declined fill changes nothing, so the order can be filled with the right good.
    expect(view(campaign).hold.cargo.map(({ good }) => good)).toContain('Bolt of silk');
    expect(after(campaign, { ...fill, good: 'blanket' }).accepted).toContain(orderId(campaign));
  });

  it('is not sold to, and a speculative want is not accepted', () => {
    const order = holding();
    const speculative = holding(aWant());

    expect(code(order, { kind: 'sell', want: orderId(order), good: 'blanket', quantity: 1 })).toBe(
      'is-an-order',
    );
    expect(code(speculative, { kind: 'accept', want: orderId(speculative) })).toBe('not-an-order');
  });

  it('cannot be accepted twice', () => {
    const campaign = accepted(holding());

    expect(code(campaign, { kind: 'accept', want: orderId(campaign) })).toBe('already-accepted');
  });

  it('stays open through its last day, whatever was tried, and closes after it', () => {
    const campaign = accepted(holding());
    const id = orderId(campaign);

    const lastDay = after(campaign, { kind: 'wait' }, { kind: 'wait' }, { kind: 'wait' });
    expect(view(lastDay).today.day).toBe(4);
    expect(code(lastDay, { kind: 'fill', want: id, good: 'blanket', quantity: 1 })).toBeUndefined();

    const lapsed = after(lastDay, { kind: 'wait' });
    expect(code(lapsed, { kind: 'fill', want: id, good: 'blanket', quantity: 1 })).toBe(
      'no-such-want',
    );
    expect(view(lapsed).here?.people[0]?.wants).toEqual([]);
  });

  it('says in the digest when an accepted order lapses, and only then', () => {
    const campaign = accepted(holding());
    const lastDay = after(campaign, { kind: 'wait' }, { kind: 'wait' }, { kind: 'wait' });

    const lapsed = after(lastDay, { kind: 'wait' });

    expect(view(lastDay).digest?.entries).toEqual([]);
    expect(view(lapsed).digest?.entries).toEqual([
      { text: "Ilse Vantry's order has lapsed, with 1 unit unfilled." },
    ]);
    expect(view(after(lapsed, { kind: 'wait' })).digest?.entries).toEqual([]);
  });

  it('does not report an order that was filled before its date', () => {
    const campaign = accepted(holding());
    const filled = after(campaign, {
      kind: 'fill',
      want: orderId(campaign),
      good: 'blanket',
      quantity: 1,
    });

    const later = after(
      filled,
      { kind: 'wait' },
      { kind: 'wait' },
      { kind: 'wait' },
      { kind: 'wait' },
    );

    expect(view(later).digest?.entries).toEqual([]);
  });
});

describe('reading orders', () => {
  it('states the price and the last day on the want, in either register', () => {
    for (const want of [aWant({ ...anOrder() }), aVagueWant('cloth', { ...anOrder() })]) {
      const stated = view(holding(want)).here?.people[0]?.wants[0];

      expect(stated?.order).toMatchObject({ price: 90, daysLeft: 3, accepted: false });
      expect(stated?.order?.accept).toEqual({ kind: 'accept', want: 'ilse#0' });
    }
  });

  it('quotes the stated price as the offer, and no offer for a near-miss', () => {
    const matches = view(holding()).here?.people[0]?.wants[0]?.matches;

    expect(matches?.map(({ good, offer }) => [good, offer])).toEqual([
      ['Bolt of silk', null],
      ['Ship blanket', 90],
    ]);
  });

  it('lists an accepted order on its own, with where and by when, until it is filled', () => {
    const campaign = accepted(holding());

    expect(view(holding()).orders.accepted).toEqual([]);
    expect(view(campaign).orders.accepted).toMatchObject([
      { buyer: 'Ilse Vantry', where: 'Kestrel Reach', price: 90, wanted: 1, daysLeft: 3 },
    ]);
    expect(view(campaign).here?.people[0]?.wants[0]?.order?.accept).toBeNull();

    const filled = after(campaign, {
      kind: 'fill',
      want: orderId(campaign),
      good: 'blanket',
      quantity: 1,
    });
    expect(view(filled).orders.accepted).toEqual([]);
  });

  it('drops an accepted order from the list once its date has passed', () => {
    const lapsed = after(accepted(holding()), ...Array<Command>(4).fill({ kind: 'wait' }));

    expect(view(lapsed).orders.accepted).toEqual([]);
  });
});

describe('the window of an order', () => {
  /** Osk at Bellwether states an order good for two days, whenever it comes up. */
  function distant(): Campaign {
    const osk = anElsewhereBuyer({
      wants: [aWant({ predicate: [{ tag: 'tools' }], ...anOrder({ days: 2 }) })],
    });
    return started(
      loadedContentSet(
        aTradingGalaxy({
          buyers: [aBuyer(), osk],
          start: aStart({ credits: 500, ship: aShip({ speed: 1 }) }),
        }),
      ),
      SEED,
    );
  }

  it('runs from the day the player first reaches the buyer, however long they took', () => {
    const departed = after(distant(), { kind: 'depart', toId: 'bellwether' });
    let underway = departed;
    while (view(underway).transit !== null) underway = after(underway, { kind: 'wait' });

    const wants = view(underway).here?.people[0]?.wants;
    expect(view(underway).today.day).toBeGreaterThan(3);
    expect(wants?.[0]?.order).toMatchObject({ daysLeft: 2 });
  });

  it('runs from the first sighting and not again on a second visit', () => {
    const arrived = (campaign: Campaign) => {
      let underway = campaign;
      while (view(underway).transit !== null) underway = after(underway, { kind: 'wait' });
      return underway;
    };
    const first = arrived(after(distant(), { kind: 'depart', toId: 'bellwether' }));
    const waited = after(first, { kind: 'wait' });
    const back = arrived(after(waited, { kind: 'depart', toId: 'kestrel' }));
    const again = arrived(after(back, { kind: 'depart', toId: 'bellwether' }));

    expect(view(again).here?.people[0]?.wants).toEqual([]);
  });
});

describe('loading an order', () => {
  const loading = (want: Record<string, unknown>) =>
    loadContent(
      aContentSet(aTradingGalaxy({ buyers: [aBuyer({ wants: [want] }), anElsewhereBuyer()] })),
    );

  it('takes a whole price and a whole window', () => {
    expect(loading(aWant({ ...anOrder() })).ok).toBe(true);
  });

  it.each([{ price: 0 }, { days: 0 }, { price: 1.5 }])('refuses an order with %o', (bad) => {
    expect(loading(aWant({ ...anOrder(bad) })).ok).toBe(false);
  });
});
