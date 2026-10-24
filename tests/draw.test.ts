import { describe, expect, it } from 'vitest';
import { isRejected, startCampaign, takeCommand, view } from '../src/engine';
import type { ContentSet } from '../src/engine';
import {
  aDrawParameters,
  aMotifLane,
  aLocation,
  aMotif,
  aSlot,
  loadedContentSet,
} from './support/content';

/**
 * The **draw** at campaign start, and its first two stages: the map assembled
 * from **motifs**, and the **locations** drawn into their **slots** (ADR 0008
 * decision 2). Everything here is read through the chart, which is what a
 * player can see of the galaxy they were given.
 */
const SEED = 20261022;

function chartOf(content: ContentSet, seed = SEED) {
  return view(startCampaign(content, seed)).chart;
}

/** Two slots, one lane between them, and two locations to fill them with. */
function aPairedGalaxy(overrides: Record<string, unknown> = {}): ContentSet {
  return loadedContentSet({
    locations: [aLocation(), aLocation({ id: 'bellwether', name: 'Bellwether Yards' })],
    motifs: [
      aMotif({
        id: 'pair',
        slots: [aSlot(), aSlot({ id: 'pit' })],
        lanes: [aMotifLane({ ends: ['berth', 'pit'], distance: 6 })],
      }),
    ],
    ...overrides,
  });
}

describe('the map assembled from motifs', () => {
  it('lays the lanes a placed motif carries, converted for this ship', () => {
    // Distance 6 at speed 4 is two days, and the lane is on the chart because
    // a motif put it there — nothing authored a chart.
    const chart = chartOf(aPairedGalaxy());

    expect(chart.lanes).toHaveLength(1);
    expect(chart.lanes[0]?.days).toBe(2);
    expect(chart.lanes[0]?.fare).toBe(60);
  });

  it('fills a typed slot only with a location whose archetype matches', () => {
    // Two places in the reserve and one slot typed `extractor`: whatever the
    // seed, the Hollow is the only thing that fits (ADR 0006 decision 4).
    const content = loadedContentSet({
      locations: [
        aLocation(),
        aLocation({ id: 'hollow', name: "Grieve's Hollow", archetype: 'extractor' }),
      ],
      motifs: [aMotif({ slots: [aSlot({ archetype: 'extractor' })] })],
    });

    const opened = [1, 2, 3, 4, 5].map((seed) => view(startCampaign(content, seed)).here?.name);

    expect(new Set(opened)).toEqual(new Set(["Grieve's Hollow"]));
  });

  it('fills an untyped slot with anything at all', () => {
    // The deliberate exception, so a region's grammar is not a lookup table
    // (ADR 0006 decision 4). Over five seeds both places turn up.
    const content = loadedContentSet({
      locations: [
        aLocation(),
        aLocation({ id: 'hollow', name: "Grieve's Hollow", archetype: 'extractor' }),
      ],
      motifs: [aMotif({ slots: [aSlot()] })],
    });

    const opened = [1, 2, 3, 4, 5].map((seed) => view(startCampaign(content, seed)).here?.name);

    expect(new Set(opened)).toEqual(new Set(['Kestrel Reach', "Grieve's Hollow"]));
  });

  it('joins two placed motifs by a lane between them, at the declared distance', () => {
    // Motifs join by **inter-motif lanes** and never by sharing a location
    // (ADR 0008 decision 6). Two one-slot motifs, so the only lane there can be
    // is the one joining them.
    const content = loadedContentSet({
      locations: [aLocation(), aLocation({ id: 'bellwether', name: 'Bellwether Yards' })],
      motifs: [aMotif({ slots: [aSlot()] })],
      drawParameters: aDrawParameters({
        motifsPerCampaign: 2,
        interMotifDistance: { least: 14, most: 14 },
      }),
    });

    const chart = chartOf(content);

    expect(chart.lanes).toHaveLength(1);
    expect(chart.lanes[0]?.fare).toBe(140);
    expect(chart.lanes[0]?.ends).toContain('Kestrel Reach');
    expect(chart.lanes[0]?.ends).toContain('Bellwether Yards');
  });

  it('gives a galaxy that can be flown end to end', () => {
    // The assembled map is a map, not a diagram: the lane the assembly laid is
    // a lane the player can depart along and land at the far end of.
    const content = aPairedGalaxy();
    const campaign = startCampaign(content, SEED);
    const departure = view(campaign).chart.lanes[0]?.depart;
    if (departure === undefined || departure === null) {
      throw new Error('the assembled chart offered no departure');
    }

    let flown = takeCommand(campaign, departure);
    while (!isRejected(flown) && view(flown.campaign).transit !== null) {
      flown = takeCommand(flown.campaign, { kind: 'wait' });
    }
    if (isRejected(flown)) throw new Error(flown.rejected.message);

    expect(view(flown.campaign).here?.name).toBe('Bellwether Yards');
    expect(view(flown.campaign).digest?.entries[0]?.text).toContain('you set down at');
  });
});

/**
 * What the draw guarantees, all of it read through the chart: the engine's own
 * record of which motif a location came from is deliberately not there to be
 * asserted on (#6 — no test asserts on internal structure), so these say what
 * a player could see.
 */
describe('what the draw guarantees', () => {
  /** Three motifs of two slots and a reserve of six: room to vary. */
  function aContentSetToDrawFrom(overrides: Record<string, unknown> = {}): ContentSet {
    return loadedContentSet({
      locations: [
        aLocation(),
        aLocation({ id: 'bellwether', name: 'Bellwether Yards' }),
        aLocation({ id: 'shoals', name: 'Thennet Shoals' }),
        aLocation({ id: 'caravel', name: 'Caravel Station' }),
        aLocation({ id: 'hollow', name: "Grieve's Hollow" }),
        aLocation({ id: 'lament', name: 'Lamentation' }),
      ],
      motifs: [
        aMotif({
          id: 'pair',
          slots: [aSlot(), aSlot({ id: 'pit' })],
          lanes: [aMotifLane({ ends: ['berth', 'pit'], distance: 6 })],
        }),
        aMotif({
          id: 'spur',
          slots: [aSlot({ id: 'junction' }), aSlot({ id: 'dead-end' })],
          lanes: [aMotifLane({ ends: ['junction', 'dead-end'], distance: 9 })],
        }),
        aMotif({
          id: 'run',
          slots: [aSlot({ id: 'near' }), aSlot({ id: 'far' })],
          lanes: [aMotifLane({ ends: ['near', 'far'], distance: 3 })],
        }),
      ],
      drawParameters: aDrawParameters({
        motifsPerCampaign: 2,
        interMotifDistance: { least: 14, most: 18 },
      }),
      ...overrides,
    });
  }

  /** Every place on the chart, which is every place the draw placed. */
  function placesOn(content: ContentSet, seed: number): readonly string[] {
    return view(startCampaign(content, seed)).chart.lanes.flatMap((lane) => [...lane.ends]);
  }

  it('gives the same galaxy for the same seed, lane for lane', () => {
    const content = aContentSetToDrawFrom();

    expect(chartOf(content, 4)).toEqual(chartOf(content, 4));
  });

  it('gives the same galaxy when the content set is loaded a second time', () => {
    // A save carries a seed and never a galaxy (ADR 0008 decision 18), so a
    // reload has to rebuild the same one.
    expect(chartOf(aContentSetToDrawFrom(), 4)).toEqual(chartOf(aContentSetToDrawFrom(), 4));
  });

  it('gives different galaxies for different seeds', () => {
    const content = aContentSetToDrawFrom();

    const charts = [1, 2, 3, 4, 5, 6].map((seed) => JSON.stringify(chartOf(content, seed)));

    expect(new Set(charts).size).toBeGreaterThan(1);
  });

  it('places as many locations as the motifs it drew have slots between them', () => {
    // The motif count is the single dial, and the location count follows from
    // it as the sum of those placed (ADR 0008 decisions 5 and 7). Two motifs of
    // two slots is four places, whichever two came up.
    const content = aContentSetToDrawFrom();

    for (const seed of [1, 2, 3, 4, 5, 6]) {
      expect(new Set(placesOn(content, seed)).size).toBe(4);
    }
  });

  it('follows the dial: more motifs, more places', () => {
    const three = aContentSetToDrawFrom({
      drawParameters: aDrawParameters({
        motifsPerCampaign: 3,
        interMotifDistance: { least: 14, most: 18 },
      }),
    });

    expect(new Set(placesOn(three, 4)).size).toBe(6);
  });

  it('never places one location twice, however the motifs fell', () => {
    // A location belongs to exactly one motif and no two motifs share one
    // (ADR 0008 decision 6), so no place is ever on the chart twice over.
    const content = aContentSetToDrawFrom();

    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const places = placesOn(content, seed);
      const laneCount = view(startCampaign(content, seed)).chart.lanes.length;

      // Four places, two motif lanes and the lane joining them: each place is
      // an end of a lane, and no place is repeated beyond those three lanes.
      expect(laneCount).toBe(3);
      expect(places).toHaveLength(6);
      expect(new Set(places).size).toBe(4);
    }
  });

  it('may place one motif twice, filled by different locations', () => {
    // Two spurs filled by different locations is a legible galaxy, and a
    // content set whose only shape is needed twice must be able to have it
    // twice (ADR 0008 decision 7). With one motif in the reserve, both
    // placements are necessarily it.
    const content = aContentSetToDrawFrom({
      motifs: [
        aMotif({
          id: 'pair',
          slots: [aSlot(), aSlot({ id: 'pit' })],
          lanes: [aMotifLane({ ends: ['berth', 'pit'], distance: 6 })],
        }),
      ],
    });

    const chart = chartOf(content, 4);
    const sixes = chart.lanes.filter((lane) => lane.fare === 60);

    expect(new Set(placesOn(content, 4)).size).toBe(4);
    expect(sixes).toHaveLength(2);
  });

  it('leaves what it did not draw out of the galaxy entirely', () => {
    // Hidden content leaves no trace: not greyed on the chart, not unreachable,
    // not hinted at — it does not exist this campaign (ADR 0008 decision 4).
    // Six places in the reserve and four drawn, so two are missing from
    // everything a player can read, and which two moves with the seed.
    const content = aContentSetToDrawFrom();
    const everywhere = [
      'Kestrel Reach',
      'Bellwether Yards',
      'Thennet Shoals',
      'Caravel Station',
      "Grieve's Hollow",
      'Lamentation',
    ];

    const missed = [1, 2, 3, 4, 5, 6].map((seed) => {
      const drawn = new Set(placesOn(content, seed));
      return everywhere.filter((place) => !drawn.has(place));
    });

    for (const hidden of missed) {
      expect(hidden).toHaveLength(2);
    }
    expect(new Set(missed.map((hidden) => hidden.join(' and '))).size).toBeGreaterThan(1);
  });
});
