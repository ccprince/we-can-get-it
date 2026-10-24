import { describe, expect, it } from 'vitest';
import { startCampaign, view } from '../src/engine';
import type { ContentSet } from '../src/engine';
import { aGalaxy, aLane, aLocation, aShip, aStart, loadedContentSet } from './support/content';

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
        aLane({ ends: ['kestrel', 'bellwether'], distance: 6 }),
        aLane({ ends: ['bellwether', 'hollow'], distance: 16 }),
        aLane({ ends: ['kestrel', 'shoals'], distance: 2 }),
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
        lanes: [aLane({ ends: ['kestrel', 'bellwether'], distance: 1 })],
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
});
