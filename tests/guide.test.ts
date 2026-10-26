import { describe, expect, it } from 'vitest';
import { view } from '../src/engine';
import type { Campaign, Command } from '../src/engine';
import {
  aGalaxy,
  aLocation,
  aMotifLane,
  aStart,
  aTradingGalaxy,
  loadedContentSet,
} from './support/content';
import { after, started } from './support/campaign';

/**
 * The **trade guide** has two tiers (ADR 0006 decision 17): a location's
 * **standing character**, published from day one, and what the player has
 * actually seen, held as last known with an **as-of date**. Nothing known is
 * dropped, and nothing stale reads as current.
 */
const SEED = 20261025;
const WAIT: Command = { kind: 'wait' };
const TO_BELLWETHER: Command = { kind: 'depart', toId: 'bellwether' };
const TO_KESTREL: Command = { kind: 'depart', toId: 'kestrel' };
const BUY_TWO_BLANKETS: Command = { kind: 'buy', lot: 'kestrel/blanket', quantity: 2 };

/** Kestrel supplies cloth and wants tools; Bellwether the other way round. Three days apart. */
function aGuidedGalaxy() {
  return loadedContentSet(
    aTradingGalaxy({
      ...aGalaxy({
        locations: [
          aLocation({ supplies: ['cloth'], demands: ['tools'] }),
          aLocation({
            id: 'bellwether',
            name: 'Bellwether Yards',
            prose: 'A repair yard.',
            supplies: ['tools'],
            demands: ['cloth'],
          }),
        ],
        lanes: [aMotifLane({ ends: ['kestrel', 'bellwether'], distance: 12 })],
        start: aStart({ credits: 500 }),
      }),
    }),
  );
}

function entry(campaign: Campaign, name: string) {
  const found = view(campaign).guide.entries.find((each) => each.name === name);
  if (found === undefined) throw new Error(`${name} is not on the guide`);
  return found;
}

describe('the standing character, published from day one', () => {
  it('states every location’s kinds before the player has been anywhere', () => {
    const campaign = started(aGuidedGalaxy(), SEED);

    expect(entry(campaign, 'Bellwether Yards')).toEqual({
      name: 'Bellwether Yards',
      standing: { supplies: ['tools'], demands: ['cloth'] },
      known: null,
    });
  });

  it('says where to start looking and never what is in stock or who is there', () => {
    const unseen = entry(started(aGuidedGalaxy(), SEED), 'Bellwether Yards');

    expect(unseen.known).toBeNull();
    expect(Object.keys(unseen.standing).sort()).toEqual(['demands', 'supplies']);
  });
});

describe('what the player has seen, held as last known', () => {
  it('reads the place the player stands in as of today', () => {
    const campaign = started(aGuidedGalaxy(), SEED);

    const known = entry(campaign, 'Kestrel Reach').known;

    expect(known?.asOf).toEqual(view(campaign).today.date);
    expect(known?.daysAgo).toBe(0);
    expect(known?.lots.map((lot) => lot.good)).toEqual(
      view(campaign).here?.lots.map((lot) => lot.good),
    );
  });

  it('carries the as-of date on every lot and every person', () => {
    const known = entry(started(aGuidedGalaxy(), SEED), 'Kestrel Reach').known;

    expect(known?.lots.length).toBeGreaterThan(0);
    expect(known?.people.length).toBeGreaterThan(0);
    for (const item of [...(known?.lots ?? []), ...(known?.people ?? [])]) {
      expect(item.asOf).toEqual(known?.asOf);
    }
  });

  it('holds a place as the player left it, dated the day they left', () => {
    const campaign = started(aGuidedGalaxy(), SEED);
    const leftOn = view(campaign).today.date;
    const blankets = (view(campaign).here?.lots ?? []).find((lot) => lot.good === 'Ship blanket');

    const away = after(campaign, BUY_TWO_BLANKETS, TO_BELLWETHER);

    const known = entry(away, 'Kestrel Reach').known;
    expect(known?.asOf).toEqual(leftOn);
    expect(known?.lots.find((lot) => lot.good === 'Ship blanket')?.quantity).toBe(
      (blankets?.quantity ?? 0) - 2,
    );
  });

  it('shows stale knowledge as older each day rather than as current', () => {
    const campaign = after(started(aGuidedGalaxy(), SEED), TO_BELLWETHER);
    const asOf = entry(campaign, 'Kestrel Reach').known?.asOf;

    const later = after(campaign, WAIT);

    expect(entry(later, 'Kestrel Reach').known?.asOf).toEqual(asOf);
    expect(entry(later, 'Kestrel Reach').known?.daysAgo).toBe(
      (entry(campaign, 'Kestrel Reach').known?.daysAgo ?? 0) + 1,
    );
  });

  it('learns a place on landing, and keeps the one it left', () => {
    const landed = after(started(aGuidedGalaxy(), SEED), TO_BELLWETHER, WAIT, WAIT);

    expect(entry(landed, 'Bellwether Yards').known?.daysAgo).toBe(0);
    expect(entry(landed, 'Kestrel Reach').known?.daysAgo).toBe(3);
    expect(entry(landed, 'Kestrel Reach').known?.lots.length).toBeGreaterThan(0);
  });

  it('never drops a place once known, however far the player goes', () => {
    const home = after(started(aGuidedGalaxy(), SEED), TO_BELLWETHER, WAIT, WAIT, TO_KESTREL);

    expect(entry(home, 'Bellwether Yards').known?.lots.length).toBeGreaterThan(0);
  });
});

/** The world moves while the player is away: nothing does that yet, so the test does. */
function meanwhile(campaign: Campaign, change: (lots: Campaign['lots']) => Campaign['lots']) {
  return { ...campaign, lots: change(campaign.lots) };
}

describe('a landing corrects what was stale', () => {
  const away = () => after(started(aGuidedGalaxy(), SEED), TO_BELLWETHER);

  function returned(change: (lots: Campaign['lots']) => Campaign['lots']) {
    return after(meanwhile(away(), change), WAIT, WAIT, TO_KESTREL, WAIT, WAIT);
  }

  it('shows nothing as corrected when nothing moved', () => {
    expect(
      entry(
        returned((lots) => lots),
        'Kestrel Reach',
      ).known?.corrections,
    ).toEqual([]);
  });

  it('shows a lot that changed as a correction, with what it was', () => {
    const before = (view(away()).guide.entries[0]?.known?.lots ?? []).find(
      (lot) => lot.good === 'Ship blanket',
    );

    const home = returned((lots) =>
      lots.map((lot) =>
        lot.id === 'kestrel/blanket' ? { ...lot, quantity: 1, price: lot.price + 6 } : lot,
      ),
    );

    const known = entry(home, 'Kestrel Reach').known;
    expect(known?.lots.find((lot) => lot.good === 'Ship blanket')?.quantity).toBe(1);
    expect(known?.corrections).toEqual([
      {
        text:
          `Ship blanket: now 1 at ${(before?.price ?? 0) + 6} credits,` +
          ` was ${before?.quantity} at ${before?.price} credits.`,
      },
    ]);
  });

  it('shows a lot that went as a correction rather than silently dropping it', () => {
    const home = returned((lots) => lots.filter((lot) => lot.id !== 'kestrel/quilt'));

    expect(entry(home, 'Kestrel Reach').known?.corrections).toEqual([
      { text: 'Quilted roll: no longer on sale.' },
    ]);
  });

  it('carries the correction in the digest of the day the player lands', () => {
    const home = returned((lots) => lots.filter((lot) => lot.id !== 'kestrel/quilt'));

    expect(view(home).digest?.entries.map((each) => each.text)).toContain(
      'Kestrel Reach — Quilted roll: no longer on sale.',
    );
  });
});
