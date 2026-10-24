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
