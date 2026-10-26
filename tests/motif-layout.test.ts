import { describe, expect, it } from 'vitest';
import { crossProduct, loadContent } from '../src/engine';
import { aContentSet, aMotif, aSlot, aTopology, loadedContentSet } from './support/content';

/**
 * A **motif's** interior is laid out once, at load, from its authored
 * distances, and draws nothing from the rng (ADR 0011 decision 4). The load
 * refuses a motif whose layout has two lanes crossing, or puts a location
 * within the **minimum gap** of a lane that does not touch it. How far a lane's
 * drawn length strays from its distance is reported, never refused (decision 5).
 */

/** A motif of the named slots, every lane given as `[from, to, distance]`. */
function aShapeOf(
  id: string,
  slots: readonly string[],
  lanes: readonly (readonly [string, string, number])[],
) {
  return aMotif({
    id,
    slots: slots.map((slot) => aSlot({ id: slot })),
    lanes: lanes.map(([from, to, distance]) => ({ ends: [from, to], distance })),
  });
}

/** Every pair of the named slots joined, at one distance. */
function everyPair(slots: readonly string[], distance: number) {
  return slots.flatMap((from, at) =>
    slots.slice(at + 1).map((to) => [from, to, distance] as const),
  );
}

describe('laying out a motif at load', () => {
  it('refuses a motif whose lanes cannot be drawn without two crossing, naming it', () => {
    // Five slots each joined to every other cannot be drawn flat at all.
    const knot = aShapeOf(
      'knot',
      ['a', 'b', 'c', 'd', 'e'],
      everyPair(['a', 'b', 'c', 'd', 'e'], 6),
    );

    const result = loadContent(aContentSet({ motifs: [aMotif(), knot] }));

    expect(result.ok ? [] : result.problems).toEqual([
      expect.objectContaining({ verdict: 'fails', where: 'motifs[1]' }),
    ]);
    expect(result.ok ? '' : result.problems[0]?.what).toMatch(/^knot is laid out with .* crossing/);
  });

  it('refuses a motif that puts a location within the minimum gap of a lane not on it', () => {
    // Five and five make ten, so the middle slot is drawn on the long lane.
    const flat = aShapeOf(
      'flat',
      ['a', 'b', 'c'],
      [
        ['a', 'b', 5],
        ['b', 'c', 5],
        ['a', 'c', 10],
      ],
    );

    const result = loadContent(aContentSet({ motifs: [flat] }));

    expect(result.ok ? [] : result.problems).toEqual([
      expect.objectContaining({ verdict: 'fails', where: 'motifs[0]' }),
    ]);
    expect(result.ok ? '' : result.problems[0]?.what).toMatch(
      /^flat puts b within the minimum gap of the lane from a to c/,
    );
  });

  it('lays a motif out the same however its slots and lanes were written', () => {
    // Where a thing sat in the file never decides an outcome (ADR 0009
    // decision 3), and a motif is one shape in every campaign (ADR 0011).
    const lanes = [
      ['a', 'b', 5],
      ['b', 'c', 7],
      ['c', 'd', 4],
      ['a', 'd', 6],
    ] as const;
    const written = aShapeOf('square', ['a', 'b', 'c', 'd'], lanes);
    const reversed = aShapeOf('square', ['d', 'c', 'b', 'a'], [...lanes].reverse());

    const layoutOf = (motif: ReturnType<typeof aShapeOf>) =>
      loadedContentSet({ motifs: [motif] }).motifs[0]?.layout;

    expect(layoutOf(reversed)).toEqual(layoutOf(written));
  });

  it('measures the minimum gap as the share of the shortest lane the content set declares', () => {
    // A triangle of 6, 6 and 10 draws its apex about 3.3 off the long lane:
    // outside a gap of half the shortest lane, inside one of six tenths.
    const tent = aShapeOf(
      'tent',
      ['a', 'b', 'c'],
      [
        ['a', 'b', 6],
        ['b', 'c', 6],
        ['a', 'c', 10],
      ],
    );
    const withGap = (minimumGapPercent: number) =>
      loadContent(aContentSet({ motifs: [tent], topology: aTopology({ minimumGapPercent }) }));

    expect(withGap(50).ok).toBe(true);
    expect(withGap(60).ok).toBe(false);
  });
});

describe('the motif layouts in the cross-product report', () => {
  it("gives each lane's drawn length against its distance", () => {
    // A right triangle draws exactly, so every lane is drawn to its distance.
    const corner = aShapeOf(
      'corner',
      ['a', 'b', 'c'],
      [
        ['a', 'b', 3],
        ['b', 'c', 4],
        ['a', 'c', 5],
      ],
    );

    const [laidOut] = crossProduct(loadedContentSet({ motifs: [corner] }), null).motifLayouts;

    expect(laidOut?.motif).toBe('corner');
    expect(laidOut?.lanes.map(({ ends, distance }) => [...ends, distance])).toEqual([
      ['a', 'b', 3],
      ['a', 'c', 5],
      ['b', 'c', 4],
    ]);
    for (const { distance, drawn } of laidOut?.lanes ?? []) {
      expect(drawn).toBeCloseTo(distance, 3);
    }
    expect(laidOut?.worstDistortion).toBeCloseTo(1, 3);
  });

  it("gives each motif's worst distortion, worst first, as a distribution", () => {
    // One and one cannot reach five, so something is drawn far from its distance.
    const stretched = aShapeOf(
      'stretched',
      ['a', 'b', 'c'],
      [
        ['a', 'b', 1],
        ['b', 'c', 1],
        ['a', 'c', 5],
      ],
    );
    const straight = aShapeOf('straight', ['a', 'b'], [['a', 'b', 4]]);

    const { motifLayouts } = crossProduct(
      loadedContentSet({
        motifs: [straight, stretched],
        topology: aTopology({ minimumGapPercent: 0 }),
      }),
      null,
    );

    expect(motifLayouts.map(({ motif }) => motif)).toEqual(['stretched', 'straight']);
    expect(motifLayouts[0]?.worstDistortion).toBeGreaterThan(1.5);
    expect(motifLayouts[1]?.worstDistortion).toBeCloseTo(1, 3);
  });

  it('lays out a motif with no lanes, and reports it undistorted', () => {
    const { motifLayouts } = crossProduct(loadedContentSet(), null);

    expect(motifLayouts).toEqual([{ motif: 'lone-berth', lanes: [], worstDistortion: 1 }]);
  });
});
