import { describe, expect, it } from 'vitest';
import { drawGalaxy, isRejected, startCampaign, takeCommand, view } from '../src/engine';
import type { ContentSet } from '../src/engine';
import { aGalaxy, aLocation, aMotifLane, aStart, loadedContentSet } from './support/content';
import { after, started } from './support/campaign';

/**
 * **Mail** is the floor under being broke (ADR 0005 decision 18): on offer at
 * every location, paid in advance, and always enough to pay the fare of the
 * lane it travels (ADR 0006 decision 12).
 */
const SEED = 20261027;

/** Kestrel to Bellwether: distance 12, so a fare of 120 and an advance of 120. */
function aGalaxyOfTwo(overrides: Record<string, unknown> = {}): ContentSet {
  return loadedContentSet(
    aGalaxy({
      locations: [
        aLocation(),
        aLocation({ id: 'bellwether', name: 'Bellwether Yards', prose: 'A repair yard.' }),
      ],
      lanes: [aMotifLane({ ends: ['kestrel', 'bellwether'], distance: 12 })],
      ...overrides,
    }),
  );
}

describe('mail on offer', () => {
  it('is on offer at every location in the galaxy, to each neighbour in range', () => {
    const campaign = started(aGalaxyOfTwo(), SEED);

    expect(view(campaign).here?.mail).toEqual([
      {
        to: 'Bellwether Yards',
        advance: 120,
        days: 3,
        take: { kind: 'take-mail', toId: 'bellwether' },
      },
    ]);
    const there = after(
      campaign,
      { kind: 'take-mail', toId: 'bellwether' },
      { kind: 'depart', toId: 'bellwether' },
      { kind: 'wait' },
      { kind: 'wait' },
    );
    expect(view(there).here?.mail.map((offer) => offer.to)).toEqual(['Kestrel Reach']);
  });

  it('takes no room in the hold', () => {
    const campaign = after(started(aGalaxyOfTwo(), SEED), {
      kind: 'take-mail',
      toId: 'bellwether',
    });

    expect(view(campaign).hold.used).toBe(0);
  });

  it('pays its advance and creates an obligation to the other end, until it is delivered', () => {
    const opening = started(aGalaxyOfTwo(), SEED);
    const taken = after(opening, { kind: 'take-mail', toId: 'bellwether' });

    expect(view(taken).credits.credits).toBe(view(opening).credits.credits + 120);
    expect(view(taken).orders.mailFor).toBe('Bellwether Yards');
    expect(view(taken).here?.mail).toEqual([]);

    const delivered = after(
      taken,
      { kind: 'depart', toId: 'bellwether' },
      { kind: 'wait' },
      { kind: 'wait' },
    );
    expect(view(delivered).orders.mailFor).toBeNull();
    expect(view(delivered).digest?.entries.map((entry) => entry.text)).toContain(
      'You hand over the mail at Bellwether Yards.',
    );
  });

  it('is one consignment at a time, so an advance cannot be drawn on standing still', () => {
    const taken = after(started(aGalaxyOfTwo(), SEED), { kind: 'take-mail', toId: 'bellwether' });

    const again = takeCommand(taken, { kind: 'take-mail', toId: 'bellwether' });

    expect(isRejected(again) && again.rejected.code).toBe('already-carrying-mail');
  });

  it('refuses mail for a place with no lane in range from here', () => {
    const result = takeCommand(started(aGalaxyOfTwo(), SEED), {
      kind: 'take-mail',
      toId: 'nowhere',
    });

    expect(isRejected(result) && result.rejected.code).toBe('no-such-mail');
  });
});

describe('being broke', () => {
  it('costs days and never the campaign: no credits can still take mail and move', () => {
    const broke = started(aGalaxyOfTwo({ start: aStart({ credits: 0 }) }), SEED);
    const stranded = takeCommand(broke, { kind: 'depart', toId: 'bellwether' });
    expect(isRejected(stranded) && stranded.rejected.code).toBe('cannot-afford-the-fare');

    const moving = after(
      broke,
      { kind: 'take-mail', toId: 'bellwether' },
      { kind: 'depart', toId: 'bellwether' },
    );

    expect(view(moving).transit?.destination).toBe('Bellwether Yards');
  });
});

describe('the invariant that mail pays its own fare', () => {
  it('rejects a content set whose mail pays less than the fare, naming the location', () => {
    const result = startCampaign(aGalaxyOfTwo({ mailRate: 9 }), SEED);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(JSON.stringify(result.problems)).toContain('at kestrel, bellwether');
  });

  it('lets a content set whose mail pays exactly the fare draw', () => {
    expect(drawGalaxy(aGalaxyOfTwo({ mailRate: 10 }), SEED).ok).toBe(true);
  });
});
