import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { crossProduct, drawGalaxy, loadContent, view } from '../src/engine';
import { started } from './support/campaign';

/**
 * The content set the page hand-plays is known to load (ADR 0003 decision 3).
 * The engine never reads a file; the test does, exactly as the harness will.
 */
describe('the walking skeleton content set', () => {
  const raw: unknown = JSON.parse(readFileSync('content/walking-skeleton.json', 'utf8'));

  it('loads, and reports its calendar and its catalogue for a writer to judge', () => {
    const result = loadContent(raw);

    expect(result.ok ? [] : result.problems).toEqual([]);
    expect(result.reports).toEqual([
      { verdict: 'judge', where: 'calendar', what: 'a year is 8 months, 48 weeks, 288 days' },
      { verdict: 'judge', where: 'goods', what: 'goods per kind: 3 goods — cloth, ore, tools' },
    ]);
  });

  it('lays out every motif flat, and reports each lane drawn against its distance', () => {
    // A motif whose lanes cross or crowd a place fails the load, so loading is
    // the crossing-free half (ADR 0011 decision 4).
    const result = loadContent(raw);
    if (!result.ok) throw new Error('the content set did not load');

    const { motifLayouts } = crossProduct(result.content, null);

    expect(motifLayouts.map(({ motif }) => motif).sort()).toEqual(['crossing', 'loop', 'spur']);
    for (const { lanes } of motifLayouts) {
      for (const { drawn } of lanes) expect(drawn).toBeGreaterThan(0);
    }
  });

  /**
   * A seed that opens at Tallow Cross, found by the **seed-finder** rather than
   * by hand (#13). Which place opens a campaign is the draw's answer, so a test
   * that names one needs a seed that produces it, and the command that found it
   * is recorded so the seed can be re-found when the content changes — it is
   * **the first seed reported**:
   *
   *   npm run seeds -- content/walking-skeleton.json start-is tallow
   */
  const OPENS_AT_TALLOW_CROSS = 1;

  it('starts a campaign at the location the seed opens, on a chart with lanes to fly', () => {
    const result = loadContent(raw);
    if (!result.ok) throw new Error('the content set did not load');

    const read = view(started(result.content, OPENS_AT_TALLOW_CROSS));

    expect(read.here?.name).toBe('Tallow Cross');
    // Lanes to fly, which is the other half of the title: a chart whose lanes
    // all left from somewhere else would strand the hand-play this set is for.
    // This half is not what the seed was found for and holds on every seed —
    // the content set declares `startHub.neighbours`, and the map is connected
    // at baseline range — so the recorded command re-finds a seed the whole
    // test passes on.
    const departures = read.chart.lanes.filter((lane) => lane.depart !== null);
    expect(departures.length).toBeGreaterThan(0);
  });

  it('holds every topology check it declares, on every seed tried', () => {
    // The checks run inside the draw, so a seed that draws is a seed whose map
    // held them (ADR 0006 decisions 3, 15 and 16). They are declared to bite:
    // a spur and a chokepoint, a far haul, and a market hub beside a spur.
    const result = loadContent(raw);
    if (!result.ok) throw new Error('the content set did not load');
    const { topology } = result.content;
    const seeds = Array.from({ length: 200 }, (_, at) => at + 1);

    expect(topology.leastPlaced).toMatchObject({ spur: 1, chokepoint: 1 });
    expect(topology.farHaul).toBeGreaterThan(0);
    expect(topology.startHub).toEqual({ archetype: 'market', neighbours: 3, spurs: 1 });
    expect(seeds.filter((seed) => !drawGalaxy(result.content, seed).ok)).toEqual([]);
  });

  it('opens with something on sale, so the page has a shop to buy from', () => {
    const result = loadContent(raw);
    if (!result.ok) throw new Error('the content set did not load');

    expect(view(started(result.content, 20261022)).here?.lots).not.toEqual([]);
  });
});
