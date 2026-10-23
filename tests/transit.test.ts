import { describe, expect, it } from 'vitest';
import { isRejected, startCampaign, takeCommand, view } from '../src/engine';
import type { Campaign, Command, ContentSet } from '../src/engine';
import { aGalaxy, aLane, aLocation, aShip, aStart, loadedContentSet } from './support/content';

/**
 * **Transit is a place, played day by day**: a multi-day haul is not one
 * atomic act that lands the player later, and a **gate** is an on-ramp rather
 * than a teleport (ADR 0005 decision 10, ADR 0006 decision 11). Each day in
 * the black ends with its own **digest**, and the whole span arrives in the
 * digest of the day the player lands (ADR 0005 decisions 8 and 11).
 */
const SEED = 20261022;
const WAIT: Command = { kind: 'wait' };
const TO_BELLWETHER: Command = { kind: 'depart', toId: 'bellwether' };

/** Kestrel to Bellwether: distance 12 at speed 4, so three days and 120 credits. */
function aGalaxyOfTwo(overrides: Record<string, unknown> = {}): ContentSet {
  return loadedContentSet(
    aGalaxy({
      locations: [
        aLocation(),
        aLocation({ id: 'bellwether', name: 'Bellwether Yards', prose: 'A repair yard.' }),
      ],
      lanes: [aLane({ ends: ['kestrel', 'bellwether'], distance: 12 })],
      start: aStart({ credits: 500 }),
      ...overrides,
    }),
  );
}

function accepted(campaign: Campaign, ...commands: readonly Command[]): Campaign {
  let played = campaign;
  for (const command of commands) {
    const result = takeCommand(played, command);
    if (isRejected(result)) {
      throw new Error(`the command was rejected: ${result.rejected.message}`);
    }
    played = result.campaign;
  }
  return played;
}

describe('a leg flown day by day', () => {
  it('passes each day in the black with its own digest, and lands on the last', () => {
    const campaign = startCampaign(aGalaxyOfTwo(), SEED);

    const first = view(accepted(campaign, TO_BELLWETHER));
    expect(first.transit).toEqual({
      from: 'Kestrel Reach',
      destination: 'Bellwether Yards',
      daysOut: 1,
      daysToRun: 2,
    });
    expect(first.digest?.day).toBe(1);

    const second = view(accepted(campaign, TO_BELLWETHER, WAIT));
    expect(second.transit?.daysToRun).toBe(1);
    expect(second.digest?.day).toBe(2);

    const landed = view(accepted(campaign, TO_BELLWETHER, WAIT, WAIT));
    expect(landed.transit).toBeNull();
    expect(landed.here?.name).toBe('Bellwether Yards');
  });

  it('is not a teleport: the player is still out on the day before arrival', () => {
    const campaign = startCampaign(aGalaxyOfTwo(), SEED);

    const stillOut = view(accepted(campaign, TO_BELLWETHER, WAIT));

    expect(stillOut.here).toBeNull();
    expect(stillOut.today.day).toBe(3);
  });

  it('lands the next day when the lane is a single day long', () => {
    const content = aGalaxyOfTwo({
      lanes: [aLane({ ends: ['kestrel', 'bellwether'], distance: 3 })],
    });
    const campaign = startCampaign(content, SEED);

    const landed = view(accepted(campaign, TO_BELLWETHER));

    expect(landed.here?.name).toBe('Bellwether Yards');
    expect(landed.today.day).toBe(2);
  });

  it('charges nothing more once underway: the fare was paid at departure', () => {
    const campaign = startCampaign(aGalaxyOfTwo(), SEED);

    const landed = view(accepted(campaign, TO_BELLWETHER, WAIT, WAIT));

    expect(landed.credits).toEqual({ credits: 380 });
  });

  it('spends the days the ship’s speed asked for, and no more', () => {
    // Distance 12 at speed 6 is two days rather than three (ADR 0006 d9).
    const content = aGalaxyOfTwo({ start: aStart({ credits: 500, ship: aShip({ speed: 6 }) }) });
    const campaign = startCampaign(content, SEED);

    const landed = view(accepted(campaign, TO_BELLWETHER, WAIT));

    expect(landed.here?.name).toBe('Bellwether Yards');
    expect(landed.today.day).toBe(3);
  });

  it('hands the player the chart’s departures again once landed', () => {
    const campaign = startCampaign(aGalaxyOfTwo(), SEED);

    const landed = view(accepted(campaign, TO_BELLWETHER, WAIT, WAIT));

    expect(landed.chart.lanes[0]?.depart).toEqual({ kind: 'depart', toId: 'kestrel' });
  });
});

describe('the digest of a leg', () => {
  it('says nothing on a day in the black, where nothing reaches the ship', () => {
    // The player is out of contact: galaxy news does not reach them, and
    // arrives as one span on landing (ADR 0005 decision 11).
    const campaign = startCampaign(aGalaxyOfTwo(), SEED);

    expect(view(accepted(campaign, TO_BELLWETHER)).digest?.entries).toEqual([]);
  });

  it('covers the span on the day the player lands', () => {
    const campaign = startCampaign(aGalaxyOfTwo(), SEED);

    const landed = view(accepted(campaign, TO_BELLWETHER, WAIT, WAIT));

    expect(landed.digest?.entries).toEqual([
      { text: '3 days out of Kestrel Reach, you set down at Bellwether Yards.' },
    ]);
  });

  it('counts the span in the days the leg actually took', () => {
    const content = aGalaxyOfTwo({
      lanes: [aLane({ ends: ['kestrel', 'bellwether'], distance: 3 })],
    });

    const landed = view(accepted(startCampaign(content, SEED), TO_BELLWETHER));

    expect(landed.digest?.entries).toEqual([
      { text: '1 day out of Kestrel Reach, you set down at Bellwether Yards.' },
    ]);
  });
});
