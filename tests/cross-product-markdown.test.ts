import { describe, expect, it } from 'vitest';
import { crossProduct, drawGalaxy, loadContent } from '../src/engine';
import { markdown } from '../tools/cross-product-markdown';
import { aTradingGalaxy, aContentSet } from './support/content';

/**
 * The formatter only formats, but the report is this ticket's whole interface,
 * so the headings a writer looks for are held in place here.
 */
describe('the cross-product report as Markdown', () => {
  it('lays out each section under its heading, and adds the drawn galaxy on a seed', () => {
    const loaded = loadContent(aContentSet(aTradingGalaxy()));
    if (!loaded.ok) throw new Error('the fixture did not load');
    const drawn = drawGalaxy(loaded.content, 1);
    if (!drawn.ok) throw new Error('the fixture did not draw');

    const text = markdown({
      contentPath: 'fixture.json',
      seed: 1,
      problems: [],
      reports: loaded.reports,
      drawProblems: [],
      crossProduct: crossProduct(loaded.content, drawn.galaxy),
    });

    const headings = text.split('\n').filter((line) => line.startsWith('## '));
    expect(headings).toEqual([
      '## Problems',
      '## Reports from the load',
      '## Motif Slots',
      '## Motif layouts',
      '## As written: goods per kind',
      '## As written: goods per role tag',
      '## As written: prose missing the tells of a tag the good holds',
      '## As written: prose carrying the tells of a tag the good does not hold',
      '## Drawn: goods per kind',
      '## Drawn: goods per role tag',
      '## Drawn: prose missing the tells of a tag the good holds',
      '## Drawn: prose carrying the tells of a tag the good does not hold',
      '## Drawn: goods hidden',
      '## Drawn: slots placed',
      '## Drawn: inter-motif stretch',
    ]);
    expect(text).toContain('- 3 goods: cloth');
    expect(text).toContain('- hidden 0 of 5 (0%), against 0% declared\n- none drawn back');
  });

  it('lists a load problem under Problems, tagged with the verdict it carries', () => {
    const loaded = loadContent({ ...aContentSet(), fareRate: 0 });
    if (loaded.ok) throw new Error('the fixture loaded');

    const text = markdown({
      contentPath: 'fixture.json',
      seed: null,
      problems: loaded.problems,
      reports: loaded.reports,
      drawProblems: [],
      crossProduct: null,
    });

    expect(text).toMatch(/## Problems[\s\S]*- \*\*fails\*\* `fareRate`/);
    expect(text).not.toContain('## Motif Slots');
  });
});
