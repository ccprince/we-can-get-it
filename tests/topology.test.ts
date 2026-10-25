import { describe, expect, it } from 'vitest';
import { drawGalaxy, startCampaign } from '../src/engine';
import type { ContentSet, DrawnGalaxy } from '../src/engine';
import {
  aDrawParameters,
  aGalaxy,
  aLocation,
  aMotif,
  aMotifLane,
  aShip,
  aSlot,
  aStart,
  aTopology,
  loadedContentSet,
  type RawObject,
} from './support/content';

/**
 * The checks over the **drawn galaxy's topology** (ADR 0006 decision 3), each
 * registered into the draw-time pass: whether the map holds the shapes the
 * content set declared and a lane between motifs as long as its far haul,
 * whether it is connected at baseline range, and whether it opens where a
 * campaign must open.
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

describe('connectivity at baseline range', () => {
  /** Kestrel and Bellwether a lane apart, and Caravel joined however a test says. */
  function aThreePlaceGalaxy(lanes: readonly RawObject[], overrides: RawObject = {}) {
    return loadedContentSet(
      aGalaxy({
        locations: [
          aLocation(),
          aLocation({ id: 'bellwether', name: 'Bellwether Yards' }),
          aLocation({ id: 'caravel', name: 'Caravel Station' }),
        ],
        lanes: [aMotifLane({ ends: ['kestrel', 'bellwether'], distance: 6 }), ...lanes],
        drawParameters: aDrawParameters({ rerolls: 2 }),
        ...overrides,
      }),
    );
  }

  it('refuses a drawn location no lane reaches', () => {
    // Everything drawn is visitable (ADR 0006 decision 15), so a place joined
    // to nothing is a campaign opening with an unreachable component.
    expect(failureOf(aThreePlaceGalaxy([]))).toEqual([
      {
        verdict: 'fails',
        where: 'start.ship.range',
        what:
          'the motif selection was re-rolled 2 times and still missed connectivity at baseline ' +
          'range: it left caravel unreachable from kestrel on lanes within the range of 20',
      },
    ]);
  });

  it('refuses a location reached only by a lane beyond baseline range', () => {
    // Range is the only gate on the map (ADR 0006 decision 14), so a place
    // whose every lane is beyond it cannot be flown to at campaign start.
    const content = aThreePlaceGalaxy([
      aMotifLane({ ends: ['bellwether', 'caravel'], distance: 30 }),
    ]);

    expect(failureOf(content)[0]?.what).toMatch(/left caravel unreachable/);
  });

  it('lets a lane run beyond range where the far end is reached some other way', () => {
    // The wall with a price on it (ADR 0006 decision 14) is legal, as long
    // as it is not the only way to the place behind it.
    const content = aThreePlaceGalaxy([
      aMotifLane({ ends: ['bellwether', 'caravel'], distance: 30 }),
      aMotifLane({ ends: ['kestrel', 'caravel'], distance: 8 }),
    ]);

    expect(drawn(content, 1).locations).toHaveLength(3);
  });

  it('measures the range against the baseline ship the content set declares', () => {
    const content = aThreePlaceGalaxy(
      [aMotifLane({ ends: ['bellwether', 'caravel'], distance: 30 })],
      { start: aStart({ ship: aShip({ range: 30 }) }) },
    );

    expect(drawn(content, 1).locations).toHaveLength(3);
  });
});

describe('the start-node guarantee', () => {
  /**
   * One motif, a spur: a market hub with three lanes, one of them out to the
   * dead end, and a works beside it with four. The works is the busier place;
   * the hub is the one a campaign may open at (ADR 0006 decision 16). Each
   * typed slot has one location that fits it.
   */
  function aHubBesideABusierWorks(overrides: RawObject = {}): ContentSet {
    return loadedContentSet({
      locations: [
        aLocation(),
        aLocation({ id: 'hollow', name: "Grieve's Hollow", archetype: 'extractor' }),
        aLocation({ id: 'shoals', name: 'Thennet Shoals', archetype: 'processor' }),
        aLocation({ id: 'bellwether', name: 'Bellwether Yards', archetype: 'extractor' }),
        aLocation({ id: 'caravel', name: 'Caravel Station', archetype: 'extractor' }),
        aLocation({ id: 'lament', name: 'Lamentation', archetype: 'extractor' }),
      ],
      motifs: [
        aMotif({
          id: 'spur',
          shape: 'spur',
          slots: [
            aSlot({ id: 'hub', archetype: 'market' }),
            aSlot({ id: 'works', archetype: 'processor' }),
            aSlot({ id: 'dead-end' }),
            aSlot({ id: 'pit-a' }),
            aSlot({ id: 'pit-b' }),
            aSlot({ id: 'pit-c' }),
          ],
          lanes: [
            aMotifLane({ ends: ['hub', 'dead-end'], distance: 9 }),
            aMotifLane({ ends: ['hub', 'works'], distance: 4 }),
            aMotifLane({ ends: ['hub', 'pit-a'], distance: 4 }),
            aMotifLane({ ends: ['works', 'pit-a'], distance: 4 }),
            aMotifLane({ ends: ['works', 'pit-b'], distance: 4 }),
            aMotifLane({ ends: ['works', 'pit-c'], distance: 4 }),
            // A second way to the dead end, so the map stays connected however
            // short the range a test gives it.
            aMotifLane({ ends: ['pit-a', 'dead-end'], distance: 4 }),
          ],
        }),
      ],
      topology: aTopology({ startHub: { archetype: 'market', neighbours: 3, spurs: 1 } }),
      ...overrides,
    });
  }

  it('opens at a market with enough neighbours, not merely the busiest place', () => {
    for (const seed of SEEDS) {
      expect(drawn(aHubBesideABusierWorks(), seed).startId).toBe('kestrel');
    }
  });

  it('fails loudly when no drawn place can open the campaign', () => {
    // The hub has three neighbours and four are asked of it. The draw does
    // not open somewhere worse instead (ADR 0008 decision 17).
    const content = aHubBesideABusierWorks({
      topology: aTopology({ startHub: { archetype: 'market', neighbours: 4, spurs: 1 } }),
      drawParameters: aDrawParameters({ rerolls: 1 }),
    });

    expect(failureOf(content)).toEqual([
      {
        verdict: 'fails',
        where: 'topology.startHub',
        what:
          'the motif selection was re-rolled 1 times and still missed the start-node guarantee: ' +
          'it opened at shoals, a processor with 4 neighbours within the range of 20, 4 of them ' +
          'in a spur, and the content set declared a market with at least 4, 1 of them in a spur',
      },
    ]);
  });

  it('counts only the neighbours within baseline range', () => {
    // At a range of 8 the hub's lane to the dead end is beyond reach, so the
    // hub has two neighbours to fly to and not three.
    const content = aHubBesideABusierWorks({
      start: aStart({ ship: aShip({ range: 8 }) }),
      drawParameters: aDrawParameters({ rerolls: 0 }),
    });

    // With the hub ruled out, nothing may open and the draw opens at its
    // busiest place, which the guarantee then refuses.
    const what = failureOf(content)[0]?.what;
    expect(what).toMatch(/missed the start-node guarantee: it opened at shoals/);
    expect(what).toContain('within the range of 8');
  });

  it('opens beside a spur, which the record of the assembly says it is', () => {
    // A chokepoint hub of three leaves, and a spur to join it to. Only a hub
    // whose joining lane runs to the spur has a spur among its neighbours, so
    // held to one, every seed opens beside the spur; left free, some do not.
    const reserve = {
      locations: [
        aLocation(),
        aLocation({ id: 'bellwether', name: 'Bellwether Yards', archetype: 'extractor' }),
        aLocation({ id: 'shoals', name: 'Thennet Shoals', archetype: 'extractor' }),
        aLocation({ id: 'hollow', name: "Grieve's Hollow", archetype: 'extractor' }),
        aLocation({ id: 'caravel', name: 'Caravel Station', archetype: 'processor' }),
        aLocation({ id: 'lament', name: 'Lamentation', archetype: 'processor' }),
      ],
      motifs: [
        aMotif({
          id: 'crossing',
          shape: 'chokepoint',
          slots: [
            aSlot({ id: 'gate', archetype: 'market' }),
            aSlot({ id: 'a', archetype: 'extractor' }),
            aSlot({ id: 'b', archetype: 'extractor' }),
          ],
          lanes: [
            aMotifLane({ ends: ['gate', 'a'], distance: 4 }),
            aMotifLane({ ends: ['gate', 'b'], distance: 4 }),
          ],
        }),
        aMotif({
          id: 'spur',
          shape: 'spur',
          slots: [
            aSlot({ id: 'junction', archetype: 'processor' }),
            aSlot({ id: 'dead-end', archetype: 'processor' }),
          ],
          lanes: [aMotifLane({ ends: ['junction', 'dead-end'], distance: 9 })],
        }),
      ],
      drawParameters: aDrawParameters({ motifsPerCampaign: 2, rerolls: 40 }),
      topology: aTopology({ leastPlaced: { spur: 1, chokepoint: 1 } }),
    };
    const held = loadedContentSet({
      ...reserve,
      topology: aTopology({
        leastPlaced: { spur: 1, chokepoint: 1 },
        startHub: { archetype: 'market', neighbours: 3, spurs: 1 },
      }),
    });
    const free = loadedContentSet({
      ...reserve,
      topology: aTopology({
        leastPlaced: { spur: 1, chokepoint: 1 },
        startHub: { archetype: 'market', neighbours: 0, spurs: 0 },
      }),
    });

    const opensBesideTheSpur = (content: ContentSet, seed: number) => {
      const galaxy = drawn(content, seed);
      const spur = galaxy.motifs.find((placed) => placed.shape === 'spur');
      const inTheSpur = new Set(spur?.slots.map(({ location }) => location));
      return galaxy.lanes.some(
        (lane) => lane.ends.includes(galaxy.startId) && lane.ends.some((end) => inTheSpur.has(end)),
      );
    };

    expect(SEEDS.every((seed) => opensBesideTheSpur(free, seed))).toBe(false);
    for (const seed of SEEDS) {
      expect(drawn(held, seed).startId).toBe('kestrel');
      expect(opensBesideTheSpur(held, seed)).toBe(true);
    }
  });
});
