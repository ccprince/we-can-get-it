import { describe, expect, it } from 'vitest';
import { crossProduct, drawGalaxy, view } from '../src/engine';
import type { ContentSet, DrawnGalaxy } from '../src/engine';
import { started } from './support/campaign';
import {
  aDrawParameters,
  aGalaxy,
  aLocation,
  aMotif,
  aSlot,
  aTopology,
  loadedContentSet,
} from './support/content';
import { drawnApart, layoutFaults } from './support/layout';

/**
 * The draw arranges the motifs as its last stage: each motif after the first
 * at the far end of the lane joining it to the layout so far, turned and
 * flipped, and that lane drawn longer until the motif fits (ADR 0011
 * decision 6). Motifs are never shrunk or bent, so each keeps the shape it was
 * laid out in at load.
 */

const SEEDS = Array.from({ length: 60 }, (_, at) => at + 1);

/**
 * Four motifs from a reserve of a triangle and a star, strung together by
 * lanes as short as the shortest of their own: crowded enough that the first
 * way of placing a motif will often not fit.
 */
function aCrowdedMap(): ContentSet {
  const slot = (id: string) => aSlot({ id });
  const lane = (from: string, to: string, distance: number) => ({ ends: [from, to], distance });
  return loadedContentSet({
    locations: Array.from({ length: 16 }, (_, at) =>
      aLocation({ id: `place-${String(at).padStart(2, '0')}`, name: `Place ${at}` }),
    ),
    motifs: [
      aMotif({
        id: 'triangle',
        shape: 'ring',
        slots: ['a', 'b', 'c'].map(slot),
        lanes: [lane('a', 'b', 6), lane('b', 'c', 7), lane('a', 'c', 8)],
      }),
      aMotif({
        id: 'star',
        shape: 'spur',
        slots: ['hub', 'x', 'y', 'z'].map(slot),
        lanes: [lane('hub', 'x', 5), lane('hub', 'y', 6), lane('hub', 'z', 9)],
      }),
    ],
    drawParameters: aDrawParameters({
      motifsPerCampaign: 4,
      interMotifDistance: { least: 4, most: 6 },
    }),
    topology: aTopology({ minimumGapPercent: 20 }),
  });
}

function drawn(content: ContentSet, seed: number): DrawnGalaxy {
  const result = drawGalaxy(content, seed);
  if (!result.ok) throw new Error(`the fixture did not draw: ${JSON.stringify(result.problems)}`);
  return result.galaxy;
}

/** The gap the content set asks for, over the galaxy's shortest motif lane. */
function gapOf(content: ContentSet): number {
  const shortest = Math.min(
    ...content.motifs.flatMap((motif) => motif.lanes.map((l) => l.distance)),
  );
  return (shortest * content.topology.minimumGapPercent) / 100;
}

describe('arranging the motifs', () => {
  it('gives every drawn location layout coordinates', () => {
    const galaxy = drawn(aCrowdedMap(), 1);

    expect([...galaxy.layout.keys()].sort()).toEqual(galaxy.locations.map(({ id }) => id).sort());
  });

  it('draws no two lanes crossing, and no place within the gap of a lane, on any seed', () => {
    const content = aCrowdedMap();

    for (const seed of SEEDS) {
      expect(layoutFaults(drawn(content, seed), gapOf(content)), `seed ${seed}`).toEqual([]);
    }
  });

  it('keeps every placed motif the shape it was laid out in, up to turning and flipping', () => {
    const content = aCrowdedMap();

    for (const seed of SEEDS.slice(0, 20)) {
      const galaxy = drawn(content, seed);
      for (const placed of galaxy.motifs) {
        const motif = content.motifs.find(({ id }) => id === placed.motif);
        for (const one of placed.slots) {
          for (const other of placed.slots) {
            const [p, q] = [motif?.layout.get(one.slot), motif?.layout.get(other.slot)];
            const authored = Math.hypot((p?.x ?? 0) - (q?.x ?? 0), (p?.y ?? 0) - (q?.y ?? 0));
            expect(drawnApart(galaxy, one.location, other.location)).toBeCloseTo(authored, 6);
          }
        }
      }
    }
  });

  it('draws a lane between motifs no shorter than its distance', () => {
    const content = aCrowdedMap();
    const galaxy = drawn(content, 3);
    const inside = new Set(
      galaxy.motifs.flatMap(({ slots }) => {
        const ids = slots.map(({ location }) => location);
        return ids.flatMap((one) => ids.map((other) => `${one} ${other}`));
      }),
    );
    const between = galaxy.lanes.filter((lane) => !inside.has(lane.ends.join(' ')));

    expect(between).toHaveLength(3);
    for (const lane of between) {
      expect(drawnApart(galaxy, ...lane.ends)).toBeGreaterThanOrEqual(lane.distance - 1e-9);
    }
  });

  it('draws the same layout from the same content set and seed', () => {
    const content = aCrowdedMap();

    expect(drawn(content, 7).layout).toEqual(drawn(content, 7).layout);
  });
});

describe('the inter-motif stretch in the cross-product report', () => {
  it('gives each lane between motifs drawn against its distance, most stretched first', () => {
    const content = aCrowdedMap();

    const stretch = crossProduct(content, drawn(content, 3)).drawn?.interMotifStretch ?? [];

    expect(stretch).toHaveLength(3);
    for (const { distance, drawn: length } of stretch) {
      expect(length).toBeGreaterThanOrEqual(distance - 1e-9);
    }
    const ratios = stretch.map(({ distance, drawn: length }) => length / distance);
    expect(ratios).toEqual([...ratios].sort((one, other) => other - one));
  });
});

describe('layout coordinates on the chart', () => {
  it("carries each location's layout coordinates, in units of distance", () => {
    // Kestrel and Bellwether, one lane of 12 apart.
    const chart = view(started(loadedContentSet(aGalaxy()), 1)).chart;

    const [kestrel, bellwether] = chart.locations.map(({ layout }) => layout);
    const apart = Math.hypot(
      (kestrel?.x ?? 0) - (bellwether?.x ?? 0),
      (kestrel?.y ?? 0) - (bellwether?.y ?? 0),
    );
    expect(apart).toBeCloseTo(12, 6);
  });
});
