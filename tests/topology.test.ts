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
 * The checks over the **drawn galaxy's topology** (ADR 0006 decision 3), each
 * registered into the draw-time pass: whether the map holds the shapes the
 * content set declared, and a lane between motifs as long as its far haul.
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

/** A spur and a chokepoint to draw one of, and four places to fill either. */
function aSpurOrAChokepoint(overrides: RawObject = {}): ContentSet {
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
        id: 'pair',
        shape: 'chokepoint',
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
    // One motif a campaign, drawn from a spur and a chokepoint. Left free, some
    // seeds place the chokepoint; held to one spur, none does (ADR 0006
    // decision 3).
    const free = aSpurOrAChokepoint();
    const held = aSpurOrAChokepoint({ topology: aTopology({ leastPlaced: { spur: 1 } }) });

    const shapesOf = (content: ContentSet, seed: number) =>
      drawn(content, seed).motifs.map((placed) => placed.shape);

    expect(SEEDS.flatMap((seed) => shapesOf(free, seed))).toContain('chokepoint');
    for (const seed of SEEDS) {
      expect(shapesOf(held, seed)).toEqual(['spur']);
    }
  });

  it('fails loudly when the draw runs out of re-rolls short of the shapes declared', () => {
    // With no re-rolls the first attempt has to pass, and on a seed whose
    // first motif is the chokepoint it cannot. The draw does not weaken the
    // invariant to let a galaxy through.
    const content = aSpurOrAChokepoint({
      topology: aTopology({ leastPlaced: { spur: 1 } }),
      drawParameters: aDrawParameters({ rerolls: 0 }),
    });
    const free = aSpurOrAChokepoint();
    const missing = SEEDS.find((seed) => drawn(free, seed).motifs[0]?.shape === 'chokepoint');

    expect(failureOf(content, missing)).toEqual([
      {
        verdict: 'fails',
        where: 'topology.leastPlaced.spur',
        what:
          'the motif selection was re-rolled 0 times and still missed the motif invariants: ' +
          'it placed 0 spurs, and the content set declared at least 1',
      },
    ]);
  });

  it('re-rolls until some lane between motifs is as long as the far haul declared', () => {
    // The far cluster is a statement about the inter-motif lanes (ADR 0008
    // decision 6). Two motifs joined by a lane of 10 to 20: held to a far haul
    // of 18, the joining lane is never shorter.
    const twoMotifs = { motifsPerCampaign: 2, interMotifDistance: { least: 10, most: 20 } };
    const free = aSpurOrAChokepoint({ drawParameters: aDrawParameters(twoMotifs) });
    const held = aSpurOrAChokepoint({
      drawParameters: aDrawParameters(twoMotifs),
      topology: aTopology({ farHaul: 18 }),
    });

    // The motifs' own lanes are 9 and 4, so the longest lane on the map is
    // the one joining them.
    const longestLane = (content: ContentSet, seed: number) =>
      Math.max(...drawn(content, seed).lanes.map((lane) => lane.distance));

    expect(SEEDS.map((seed) => longestLane(free, seed)).some((spans) => spans < 18)).toBe(true);
    for (const seed of SEEDS) {
      expect(longestLane(held, seed)).toBeGreaterThanOrEqual(18);
    }
  });
});
