import { describe, expect, it } from 'vitest';
import { view, type Campaign } from '../src/engine';
import { aBuyer, anElsewhereBuyer, aTradingGalaxy, loadedContentSet } from './support/content';
import { after, started } from './support/campaign';

/**
 * A good's prose is the only way a player reaches its invisible tags, so every
 * read model that names a good carries it (#144). It belongs to the good, not
 * to a sighting: it never changes, and it carries no as-of date.
 */
const SEED = 20261104;
const BLANKET = 'A woven blanket with a fleece lining, sold by the gantry crews.';

function landed(): Campaign {
  return started(
    loadedContentSet(aTradingGalaxy({ buyers: [aBuyer(), anElsewhereBuyer()] })),
    SEED,
  );
}

function holdingABlanket(): Campaign {
  return after(landed(), { kind: 'buy', lot: 'kestrel/blanket', quantity: 1 });
}

describe("reading a good's prose", () => {
  it('carries the prose on a lot in the shop', () => {
    const lot = view(landed()).here?.lots.find((each) => each.good === 'Ship blanket');

    expect(lot?.prose).toBe(BLANKET);
  });

  it('carries the prose on a good in the hold', () => {
    expect(view(holdingABlanket()).hold.cargo[0]?.prose).toBe(BLANKET);
  });

  it('carries the prose on a known lot in the trade guide', () => {
    const known = view(landed()).guide.entries.find((each) => each.name === 'Kestrel Reach')?.known;
    const lot = known?.lots.find((each) => each.good === 'Ship blanket');

    expect(lot?.prose).toBe(BLANKET);
  });

  it('carries the prose on the match line under a want', () => {
    const match = view(holdingABlanket()).here?.people[0]?.wants[0]?.matches[0];

    expect(match?.good).toBe('Ship blanket');
    expect(match?.prose).toBe(BLANKET);
  });
});
