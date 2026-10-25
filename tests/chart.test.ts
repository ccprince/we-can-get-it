import { describe, expect, it } from 'vitest';
import { view } from '../src/engine';
import type { ContentSet } from '../src/engine';
import { laneBetween } from './support/chart';
import {
  aGalaxy,
  aMotif,
  aMotifLane,
  aLocation,
  aShip,
  aSlot,
  aStart,
  loadedContentSet,
} from './support/content';
import { started } from './support/campaign';

/**
 * The chart does the arithmetic (ADR 0006 decision 20): it shows the numbers
 * already converted for this ship — days, **fare**, and whether **range**
 * reaches — and never the raw **distance**.
 */
const SEED = 20261022;

/**
 * Kestrel, two places a lane from it and one beyond, so a lane can fail to
 * touch here. The Shoals have a short way round to the Hollow, so the map is
 * connected at any range of 9 or more (ADR 0006 decision 15). The campaign
 * opens at the best-connected place the assembly drew (decision 16). All four
 * have two lanes each, and Kestrel takes the tie because the fixture lists it
 * first (`aGalaxy`).
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
        aMotifLane({ ends: ['shoals', 'hollow'], distance: 9 }),
      ],
      ...overrides,
    }),
  );
}

function chartAt(content: ContentSet) {
  return view(started(content, SEED)).chart;
}

describe('the chart', () => {
  it('converts a lane distance into days for this ship', () => {
    // Speed 4 over a distance of 6: two days, the ceiling rather than one and
    // a half (ADR 0006 decision 9).
    const chart = chartAt(aFourPlaceGalaxy());

    expect(laneBetween(chart, 'Kestrel Reach', 'Bellwether Yards').days).toBe(2);
    expect(laneBetween(chart, 'Bellwether Yards', "Grieve's Hollow").days).toBe(4);
  });

  it('never flies a lane in less than a day, however short it is', () => {
    // A zero-day hop is what ADR 0006 decision 6 refuses: a free hop within a
    // system would be a free shopping trip.
    const chart = chartAt(
      aFourPlaceGalaxy({
        locations: [aLocation(), aLocation({ id: 'bellwether', name: 'Bellwether Yards' })],
        lanes: [aMotifLane({ ends: ['kestrel', 'bellwether'], distance: 1 })],
      }),
    );

    expect(chart.lanes[0]?.days).toBe(1);
  });

  it('quotes the fare as the distance times the one galaxy-wide rate', () => {
    const chart = chartAt(aFourPlaceGalaxy({ fareRate: 10 }));

    expect(laneBetween(chart, 'Kestrel Reach', 'Bellwether Yards').fare).toBe(60);
    expect(laneBetween(chart, 'Bellwether Yards', "Grieve's Hollow").fare).toBe(160);
  });

  it('cuts days and not fare when the ship is faster', () => {
    // Distance is distance: speed and money are genuinely different purchases
    // (ADR 0006 decision 10).
    const faster = chartAt(aFourPlaceGalaxy({ start: aStart({ ship: aShip({ speed: 6 }) }) }));

    const toBellwether = laneBetween(faster, 'Kestrel Reach', 'Bellwether Yards');
    expect(toBellwether.days).toBe(1);
    expect(toBellwether.fare).toBe(60);
  });

  it('says of every lane whether this ship’s range reaches it at all', () => {
    const chart = chartAt(aFourPlaceGalaxy({ start: aStart({ ship: aShip({ range: 10 }) }) }));

    expect(laneBetween(chart, 'Kestrel Reach', 'Bellwether Yards').withinRange).toBe(true);
    expect(laneBetween(chart, 'Bellwether Yards', "Grieve's Hollow").withinRange).toBe(false);
    expect(laneBetween(chart, 'Kestrel Reach', 'Thennet Shoals').withinRange).toBe(true);
  });

  it('names where a lane would take the player from where they are', () => {
    const chart = chartAt(aFourPlaceGalaxy());

    expect(laneBetween(chart, 'Kestrel Reach', 'Bellwether Yards').destination).toBe(
      'Bellwether Yards',
    );
  });

  it('shows the lanes that do not touch here, which are common knowledge too', () => {
    // Which locations exist, what lanes join them and what each costs are
    // published facts from day one (ADR 0006 decision 5).
    const chart = chartAt(aFourPlaceGalaxy());

    expect(chart.lanes).toHaveLength(4);
    expect(laneBetween(chart, 'Bellwether Yards', "Grieve's Hollow").destination).toBeNull();
  });

  it('names every location in placement order: by slot id, not location id', () => {
    // Placement order is derived from the seed and the content set, and it is
    // what the chart states (ADR 0009 decision 3). The slots are written `b`
    // then `a`, and the places are Zenith in `a` and Ash in `b`: by slot id
    // Zenith comes first, which neither the file's order nor the location ids
    // would give.
    const chart = chartAt(
      loadedContentSet({
        locations: [
          aLocation({ id: 'ash', name: 'Ash Landing', archetype: 'processor' }),
          aLocation({ id: 'zenith', name: 'Zenith Spire', archetype: 'extractor' }),
        ],
        motifs: [
          aMotif({
            slots: [
              aSlot({ id: 'b', archetype: 'processor' }),
              aSlot({ id: 'a', archetype: 'extractor' }),
            ],
            lanes: [aMotifLane({ ends: ['b', 'a'], distance: 6 })],
          }),
        ],
      }),
    );

    expect(chart.locations.map((location) => location.name)).toEqual([
      'Zenith Spire',
      'Ash Landing',
    ]);
  });
});
