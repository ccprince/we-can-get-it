import { describe, expect, it } from 'vitest';
import { drawGalaxy, startCampaign } from '../src/engine';
import type { ContentSet, DrawnGalaxy } from '../src/engine';
import {
  aDrawParameters,
  aLocation,
  aMotif,
  aMotifLane,
  aSlot,
  aTopology,
  loadedContentSet,
  type RawObject,
} from './support/content';

/**
 * The checks over the **drawn galaxy's topology** (ADR 0006 decisions 3, 15
 * and 16), each registered into the draw-time pass: whether the map holds the
 * shapes the content set declared, whether it is connected at baseline range,
 * and whether it opens where a campaign must open.
 */
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** The galaxy a seed gives, for a fixture that is meant to draw. */
function drawn(content: ContentSet, seed: number): DrawnGalaxy {
  const result = drawGalaxy(content, seed);
  if (!result.ok) throw new Error(`the fixture did not draw: ${JSON.stringify(result.problems)}`);
  return result.galaxy;
}

function failureOf(content: ContentSet, seed = 1) {
  const result = startCampaign(content, seed);
  if (result.ok) throw new Error('the draw was meant to fail and gave a campaign');
  return result.problems;
}

/** A spur of two untyped slots. */
function aSpur(): RawObject {
  return aMotif({
    id: 'spur',
    shape: 'spur',
    slots: [aSlot({ id: 'junction' }), aSlot({ id: 'dead-end' })],
    lanes: [aMotifLane({ ends: ['junction', 'dead-end'], distance: 9 })],
  });
}

/** A spur and a cluster to draw one of, and four places to fill either. */
function aSpurOrACluster(overrides: RawObject = {}): ContentSet {
  return loadedContentSet({
    locations: [
      aLocation(),
      aLocation({ id: 'bellwether', name: 'Bellwether Yards' }),
      aLocation({ id: 'shoals', name: 'Thennet Shoals' }),
      aLocation({ id: 'hollow', name: "Grieve's Hollow" }),
    ],
    motifs: [
      aSpur(),
      aMotif({
        id: 'trio',
        shape: 'cluster',
        slots: [aSlot({ id: 'a' }), aSlot({ id: 'b' })],
        lanes: [aMotifLane({ ends: ['a', 'b'], distance: 4 })],
      }),
    ],
    ...overrides,
  });
}

describe('the record of what was placed', () => {
  it('names each motif placed, its shape, and the location in each of its slots', () => {
    // A shape is a property of the assembly and not of the lanes, so the
    // galaxy says what it was assembled from. One motif and one location of
    // each archetype, so there is one way to fill it.
    const content = loadedContentSet({
      locations: [aLocation(), aLocation({ id: 'hollow', archetype: 'extractor' })],
      motifs: [
        aMotif({
          id: 'spur',
          shape: 'spur',
          slots: [
            aSlot({ id: 'junction', archetype: 'market' }),
            aSlot({ id: 'dead-end', archetype: 'extractor' }),
          ],
          lanes: [aMotifLane({ ends: ['junction', 'dead-end'], distance: 9 })],
        }),
      ],
    });

    expect(drawn(content, 1).motifs).toEqual([
      {
        motif: 'spur',
        shape: 'spur',
        slots: [
          { slot: 'dead-end', location: 'hollow' },
          { slot: 'junction', location: 'kestrel' },
        ],
      },
    ]);
  });
});

describe('the motif invariants', () => {
  it('re-rolls until the map holds as many of a shape as the content set declares', () => {
    // One motif a campaign, drawn from a spur and a cluster. Left free, some
    // seeds place the cluster; held to one spur, none does (ADR 0006
    // decision 3).
    const free = aSpurOrACluster();
    const held = aSpurOrACluster({ topology: aTopology({ leastPlaced: { spur: 1 } }) });

    const shapesOf = (content: ContentSet, seed: number) =>
      drawn(content, seed).motifs.map((placed) => placed.shape);

    expect(SEEDS.flatMap((seed) => shapesOf(free, seed))).toContain('cluster');
    for (const seed of SEEDS) {
      expect(shapesOf(held, seed)).toEqual(['spur']);
    }
  });

  it('fails loudly when no assembly holds the shapes declared', () => {
    // Two spurs asked of a campaign of one motif can never be met, and the
    // draw does not weaken the invariant to let a galaxy through. The spur is
    // the only motif, so every attempt places exactly one.
    const content = aSpurOrACluster({
      motifs: [aSpur()],
      topology: aTopology({ leastPlaced: { spur: 2 } }),
      drawParameters: aDrawParameters({ rerolls: 3 }),
    });

    expect(failureOf(content)).toEqual([
      {
        verdict: 'fails',
        where: 'topology.leastPlaced.spur',
        what:
          'the motif selection was re-rolled 3 times and still missed the motif invariants: ' +
          'it placed 1 spur, and the content set declared at least 2',
      },
    ]);
  });

  it('re-rolls until some lane between motifs is as long as the far haul declared', () => {
    // The far cluster is a statement about the inter-motif lanes (ADR 0008
    // decision 6). Two motifs joined by a lane of 10 to 20: held to a far haul
    // of 18, the joining lane is never shorter.
    const twoMotifs = { motifsPerCampaign: 2, interMotifDistance: { least: 10, most: 20 } };
    const free = aSpurOrACluster({ drawParameters: aDrawParameters(twoMotifs) });
    const held = aSpurOrACluster({
      drawParameters: aDrawParameters(twoMotifs),
      topology: aTopology({ farHaul: 18 }),
    });

    const joiningLane = (content: ContentSet, seed: number) =>
      Math.max(...drawn(content, seed).lanes.map((lane) => lane.distance));

    expect(SEEDS.map((seed) => joiningLane(free, seed)).some((spans) => spans < 18)).toBe(true);
    for (const seed of SEEDS) {
      expect(joiningLane(held, seed)).toBeGreaterThanOrEqual(18);
    }
  });
});
