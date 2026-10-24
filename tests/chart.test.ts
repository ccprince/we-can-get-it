import { describe, expect, it } from 'vitest';
import { startCampaign, view } from '../src/engine';
import type { ContentSet } from '../src/engine';
import { aGalaxy, aMotifLane, aLocation, aShip, aStart, loadedContentSet } from './support/content';

/**
 * The chart does the arithmetic (ADR 0006 decision 20): it shows the numbers
 * already converted for this ship — days, **fare**, and whether **range**
 * reaches — and never the raw **distance**.
 */
const SEED = 20261022;

/**
 * Kestrel, two places a lane from it and one beyond, so a lane can fail to
 * touch here. The campaign opens at the best-connected place the assembly drew
 * (ADR 0006 decision 16), and Kestrel's second lane is what makes it that
 * place — nothing else has two.
 */
function aFourPlaceGalaxy(overrides: Record<string, unknown> = {}): ContentSet {
  return loadedContentSet(
    aGalaxy({
      locations: [
        aLocation(),
        aLocation({ id: 'bellwether', name: 'Bellwether Yards', prose: 'A repair yard.' }),
        aLocation({ id: 'hollow', name: "Grieve's Hollow", prose: 'A cut in a dead moon.' }),
        aLocation({ id: 'shoals', name: 'Thennet Shoals', prose: 'Tenders and tank farms.' }),
      ],
      lanes: [
        aMotifLane({ ends: ['kestrel', 'bellwether'], distance: 6 }),
        aMotifLane({ ends: ['bellwether', 'hollow'], distance: 16 }),
        aMotifLane({ ends: ['kestrel', 'shoals'], distance: 2 }),
      ],
      ...overrides,
    }),
  );
}

function chartAt(content: ContentSet) {
  return view(startCampaign(content, SEED)).chart;
}

describe('the chart', () => {
  it('converts a lane distance into days for this ship', () => {
    // Speed 4 over a distance of 6: two days, the ceiling rather than one and
    // a half (ADR 0006 decision 9).
    const chart = chartAt(aFourPlaceGalaxy());

    expect(chart.lanes[0]?.days).toBe(2);
    expect(chart.lanes[1]?.days).toBe(4);
  });

  it('never flies a lane in less than a day, however short it is', () => {
    // A zero-day hop is what ADR 0006 decision 6 refuses: a free hop within a
    // system would be a free shopping trip.
    const chart = chartAt(
      aFourPlaceGalaxy({
        lanes: [aMotifLane({ ends: ['kestrel', 'bellwether'], distance: 1 })],
      }),
    );

    expect(chart.lanes[0]?.days).toBe(1);
  });

  it('quotes the fare as the distance times the one galaxy-wide rate', () => {
    const chart = chartAt(aFourPlaceGalaxy({ fareRate: 10 }));

    expect(chart.lanes[0]?.fare).toBe(60);
    expect(chart.lanes[1]?.fare).toBe(160);
  });

  it('cuts days and not fare when the ship is faster', () => {
    // Distance is distance: speed and money are genuinely different purchases
    // (ADR 0006 decision 10).
    const faster = chartAt(aFourPlaceGalaxy({ start: aStart({ ship: aShip({ speed: 6 }) }) }));

    expect(faster.lanes[0]?.days).toBe(1);
    expect(faster.lanes[0]?.fare).toBe(60);
  });

  it('says of every lane whether this ship’s range reaches it at all', () => {
    const chart = chartAt(aFourPlaceGalaxy({ start: aStart({ ship: aShip({ range: 10 }) }) }));

    expect(chart.lanes.map((lane) => lane.withinRange)).toEqual([true, false, true]);
  });

  it('names where a lane would take the player from where they are', () => {
    const chart = chartAt(aFourPlaceGalaxy());

    expect(chart.lanes[0]?.destination).toBe('Bellwether Yards');
  });

  it('shows the lanes that do not touch here, which are common knowledge too', () => {
    // Which locations exist, what lanes join them and what each costs are
    // published facts from day one (ADR 0006 decision 5).
    const chart = chartAt(aFourPlaceGalaxy());

    expect(chart.lanes).toHaveLength(3);
    expect(chart.lanes[1]?.ends).toEqual(['Bellwether Yards', "Grieve's Hollow"]);
    expect(chart.lanes[1]?.destination).toBeNull();
  });

  it('names every location the draw placed', () => {
    const chart = chartAt(aFourPlaceGalaxy());

    expect(namesOf(chart.locations)).toEqual([
      'Bellwether Yards',
      "Grieve's Hollow",
      'Kestrel Reach',
      'Thennet Shoals',
    ]);
  });

  it('names a location no lane touches, because it is a place that exists', () => {
    // The chart says which places exist on its own account (ADR 0006
    // decision 5), not by reading them off the ends of lanes. Caravel is drawn
    // and joined to nothing, and it is on the chart all the same.
    const chart = chartAt(
      loadedContentSet(
        aGalaxy({
          locations: [
            aLocation(),
            aLocation({ id: 'bellwether', name: 'Bellwether Yards' }),
            aLocation({ id: 'caravel', name: 'Caravel Station' }),
          ],
          lanes: [aMotifLane({ ends: ['kestrel', 'bellwether'], distance: 6 })],
        }),
      ),
    );

    expect(chart.lanes.flatMap((lane) => lane.ends)).not.toContain('Caravel Station');
    expect(namesOf(chart.locations)).toEqual([
      'Bellwether Yards',
      'Caravel Station',
      'Kestrel Reach',
    ]);
  });
});

/** The names on the chart, sorted: the order the engine gives them means nothing. */
function namesOf(locations: readonly { readonly name: string }[]): readonly string[] {
  return locations.map((location) => location.name).sort();
}
