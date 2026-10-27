import { describe, expect, it } from 'vitest';
import { view } from '../src/engine';
import {
  aBuyer,
  aTradingGalaxy,
  aVagueWant,
  aWant,
  anElsewhereBuyer,
  anOrder,
  loadedContentSet,
} from './support/content';
import { started } from './support/campaign';

/**
 * What the guide says of the lots and wants the player has seen, so that
 * "could this be filled from what I know?" is answered by the engine and not by
 * the caller matching tags (#36, ADR 0003 decision 4).
 */
const SEED = 20261026;

function seen(wants: Record<string, unknown>[]) {
  const campaign = started(
    loadedContentSet(aTradingGalaxy({ buyers: [aBuyer({ wants }), anElsewhereBuyer()] })),
    SEED,
  );
  const known = view(campaign).guide.entries.find((each) => each.name === 'Kestrel Reach')?.known;
  if (known === undefined || known === null) throw new Error('Kestrel was not seen');
  return known;
}

describe('a lot seen', () => {
  it('counts the seen wants it answers, and none for a lot nobody is after', () => {
    const known = seen([aWant()]);

    const silk = known.lots.find((lot) => lot.good === 'Bolt of silk');
    const blanket = known.lots.find((lot) => lot.good === 'Ship blanket');

    // Ilse wants warm cloth: a blanket answers her and silk does not.
    expect(blanket?.wantsAnswered).toBe(1);
    expect(silk?.wantsAnswered).toBe(0);
  });

  it('counts a vague want for its kind as answered by any good of it', () => {
    const known = seen([aVagueWant('cloth')]);

    expect(known.lots.every((lot) => lot.wantsAnswered === 1)).toBe(true);
  });
});

describe('a want seen', () => {
  it('counts the lots in stock that would answer it', () => {
    const known = seen([aWant()]);

    const answering = known.lots.filter((lot) => lot.good !== 'Bolt of silk').length;

    expect(known.people[0]?.wants[0]?.lotsAnswering).toBe(answering);
  });

  it('is answered by no lot when nothing seen is of its kind', () => {
    const known = seen([aVagueWant('tools')]);

    expect(known.people[0]?.wants[0]?.lotsAnswering).toBe(0);
  });

  it('says the days left of an order, and nothing of a want that is not one', () => {
    const order = seen([aWant({ ...anOrder({ days: 3 }) })]);
    const plain = seen([aWant()]);

    expect(order.people[0]?.wants[0]?.orderDaysLeft).toBe(3);
    expect(plain.people[0]?.wants[0]?.orderDaysLeft).toBeNull();
  });
});
