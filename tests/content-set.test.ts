import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadContent, startCampaign, view } from '../src/engine';

/**
 * The content set the page hand-plays is known to load (ADR 0003 decision 3).
 * The engine never reads a file; the test does, exactly as the harness will.
 */
describe('the walking skeleton content set', () => {
  const raw: unknown = JSON.parse(readFileSync('content/walking-skeleton.json', 'utf8'));

  it('loads, and reports its calendar for a writer to judge', () => {
    const result = loadContent(raw);

    expect(result.ok ? [] : result.problems).toEqual([]);
    expect(result.reports).toEqual([
      { verdict: 'judge', where: 'calendar', what: 'a year is 8 months, 48 weeks, 288 days' },
    ]);
  });

  it('starts a campaign at the location it names, on a chart with lanes to fly', () => {
    const result = loadContent(raw);
    if (!result.ok) throw new Error('the content set did not load');

    expect(view(startCampaign(result.content, 20261022)).here?.name).toBe('Bellwether Yards');
  });
});
