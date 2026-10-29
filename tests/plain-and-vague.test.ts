import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { drawGalaxy, loadContent } from '../src/engine';

/**
 * The content set the milestone measures loads and draws (ADR 0003 decision
 * 3). It is revised all through #22, so this asserts that it loads and draws
 * and pins none of its reports: those are the writer's to read, in the
 * cross-product report.
 */
describe('the plain-and-vague content set', () => {
  const raw: unknown = JSON.parse(readFileSync('content/plain-and-vague.json', 'utf8'));

  it('loads with no problems', () => {
    const result = loadContent(raw);

    expect(result.ok ? [] : result.problems).toEqual([]);
  });

  it('draws a galaxy on every seed tried', () => {
    // The reserve's adequacy per archetype is checked before the draw, and a
    // short archetype fails it by name, so a seed that draws is one the reserve
    // held for (ADR 0008 decision 9).
    const result = loadContent(raw);
    if (!result.ok) throw new Error('the content set did not load');
    const seeds = Array.from({ length: 200 }, (_, at) => at + 1);

    expect(seeds.filter((seed) => !drawGalaxy(result.content, seed).ok)).toEqual([]);
  });
});
