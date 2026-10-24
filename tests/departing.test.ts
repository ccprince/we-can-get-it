import { describe, expect, it } from 'vitest';
import { isRejected, startCampaign, takeCommand, view } from '../src/engine';
import type { Campaign, Command, ContentSet, Reason } from '../src/engine';
import { laneBetween } from './support/chart';
import { aGalaxy, aMotifLane, aLocation, aShip, aStart, loadedContentSet } from './support/content';

/**
 * Departing along a **lane**: the **fare** is quoted before departure and paid
 * at departure, nothing accrues afterwards, and **range** is the only gate on
 * the map (ADR 0006 decisions 10 and 14).
 */
const SEED = 20261022;

/**
 * Kestrel, two places a lane from it and one beyond. The campaign opens at the
 * best-connected place the assembly drew (ADR 0006 decision 16), so a test
 * about departing from Kestrel has to make Kestrel that place — here by giving
 * it two lanes, as many as Bellwether, and listing it first so it takes the tie
 * (`aGalaxy`). The Hollow is deliberately not one
 * of them: it is the destination no lane from here reaches.
 */
function aGalaxyOfFour(overrides: Record<string, unknown> = {}): ContentSet {
  return loadedContentSet(
    aGalaxy({
      locations: [
        aLocation(),
        aLocation({ id: 'bellwether', name: 'Bellwether Yards', prose: 'A repair yard.' }),
        aLocation({ id: 'hollow', name: "Grieve's Hollow", prose: 'A cut in a dead moon.' }),
        aLocation({ id: 'shoals', name: 'Thennet Shoals', prose: 'Tenders and tank farms.' }),
      ],
      lanes: [
        // Distance 12 at speed 4: three days, and a fare of 120 at a rate of 10.
        aMotifLane({ ends: ['kestrel', 'bellwether'], distance: 12 }),
        aMotifLane({ ends: ['bellwether', 'hollow'], distance: 8 }),
        aMotifLane({ ends: ['kestrel', 'shoals'], distance: 4 }),
      ],
      ...overrides,
    }),
  );
}

const TO_BELLWETHER: Command = { kind: 'depart', toId: 'bellwether' };

function accepted(campaign: Campaign, command: Command): Campaign {
  const result = takeCommand(campaign, command);
  if (isRejected(result)) {
    throw new Error(`the command was rejected: ${result.rejected.message}`);
  }
  return result.campaign;
}

function refusalOf(campaign: Campaign, command: Command): Reason {
  const result = takeCommand(campaign, command);
  if (!isRejected(result)) throw new Error('the command was accepted');
  return result.rejected;
}

describe('the chart’s departures', () => {
  it('offers a departure along a lane that leaves from here', () => {
    const chart = view(startCampaign(aGalaxyOfFour(), SEED)).chart;

    expect(laneBetween(chart, 'Kestrel Reach', 'Bellwether Yards').depart).toEqual({
      kind: 'depart',
      toId: 'bellwether',
    });
  });

  it('offers none along a lane that does not leave from here', () => {
    const chart = view(startCampaign(aGalaxyOfFour(), SEED)).chart;

    expect(laneBetween(chart, 'Bellwether Yards', "Grieve's Hollow").depart).toBeNull();
  });

  it('offers none along a lane beyond this ship’s range, at any price', () => {
    const content = aGalaxyOfFour({ start: aStart({ ship: aShip({ range: 10 }) }) });

    const chart = view(startCampaign(content, SEED)).chart;
    const toBellwether = laneBetween(chart, 'Kestrel Reach', 'Bellwether Yards');
    expect(toBellwether.withinRange).toBe(false);
    expect(toBellwether.depart).toBeNull();
  });
});

describe('departing', () => {
  it('charges the fare it quoted, at departure', () => {
    const campaign = startCampaign(aGalaxyOfFour({ start: aStart({ credits: 500 }) }), SEED);
    const quoted = laneBetween(view(campaign).chart, 'Kestrel Reach', 'Bellwether Yards').fare;

    const underway = view(accepted(campaign, TO_BELLWETHER));

    expect(quoted).toBe(120);
    expect(underway.credits).toEqual({ credits: 380 });
  });

  it('spends the day it departs on, and ends it with a digest', () => {
    const campaign = startCampaign(aGalaxyOfFour(), SEED);

    const underway = view(accepted(campaign, TO_BELLWETHER));

    expect(underway.today.day).toBe(2);
    expect(underway.digest?.day).toBe(1);
  });

  it('puts the player in transit, out of a place and bound for another', () => {
    const campaign = startCampaign(aGalaxyOfFour(), SEED);

    const underway = view(accepted(campaign, TO_BELLWETHER));

    expect(underway.here).toBeNull();
    expect(underway.transit).toEqual({
      from: 'Kestrel Reach',
      destination: 'Bellwether Yards',
      daysOut: 1,
      daysToRun: 2,
    });
  });

  it('leaves the campaign it was handed untouched', () => {
    const campaign = startCampaign(aGalaxyOfFour(), SEED);
    const before = view(campaign);

    accepted(campaign, TO_BELLWETHER);

    expect(view(campaign)).toEqual(before);
  });

  it('offers no departure at all while underway: the destination is fixed', () => {
    const underway = accepted(startCampaign(aGalaxyOfFour(), SEED), TO_BELLWETHER);

    const chart = view(underway).chart;
    expect(chart.lanes.map((lane) => lane.depart)).toEqual([null, null, null]);
    expect(chart.lanes.map((lane) => lane.destination)).toEqual([null, null, null]);
  });
});

describe('a departure the engine refuses', () => {
  it('refuses a lane beyond the ship’s range, and says so', () => {
    const content = aGalaxyOfFour({ start: aStart({ ship: aShip({ range: 10 }) }) });

    const refusal = refusalOf(startCampaign(content, SEED), TO_BELLWETHER);

    expect(refusal.code).toBe('beyond-range');
    expect(refusal.message).not.toBe('');
  });

  it('refuses a destination no lane from here reaches', () => {
    const campaign = startCampaign(aGalaxyOfFour(), SEED);

    expect(refusalOf(campaign, { kind: 'depart', toId: 'hollow' }).code).toBe('no-such-lane');
  });

  it('refuses a second departure while underway, destination unchanged', () => {
    const underway = accepted(startCampaign(aGalaxyOfFour(), SEED), TO_BELLWETHER);

    const refusal = refusalOf(underway, { kind: 'depart', toId: 'kestrel' });

    expect(refusal.code).toBe('already-underway');
    expect(view(underway).transit?.destination).toBe('Bellwether Yards');
  });

  it('refuses a fare the player cannot pay, since nothing accrues against them', () => {
    const campaign = startCampaign(aGalaxyOfFour({ start: aStart({ credits: 119 }) }), SEED);

    const refusal = refusalOf(campaign, TO_BELLWETHER);

    expect(refusal.code).toBe('cannot-afford-the-fare');
    expect(view(campaign).credits).toEqual({ credits: 119 });
  });
});
