import { describe, expect, it } from 'vitest';
import { crossProduct, drawGalaxy, loadContent } from '../src/engine';
import { markdown } from '../tools/cross-product-markdown';
import {
  aBounds,
  aBuyer,
  aContentSet,
  aDrawParameters,
  aGood,
  aTag,
  aTradingGalaxy,
  aWantForGood,
  anArchetype,
} from './support/content';

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
    expect(text).toContain('- hidden 0 of 5 (0%) against 0% declared; 0 drawn back\n\n');
  });

  it('names each good drawn back and what it was drawn back for', () => {
    // Every cloth is hidden; the floor of one draws one back, and Ilse's warm
    // has the rest of its two drawn back.
    const loaded = loadContent(
      aContentSet({
        archetypes: [anArchetype({ supplies: ['cloth'] })],
        tags: [aTag(), aTag({ id: 'warm', class: 'quality', tells: ['fleece'] })],
        goods: [
          aGood({ id: 'silk', tags: ['warm'] }),
          aGood({ id: 'linen', name: 'Linen', tags: ['warm'] }),
          aGood({ id: 'canvas', name: 'Canvas' }),
        ],
        buyers: [aBuyer()],
        bounds: aBounds({ usabilityFloor: 1 }),
        drawParameters: aDrawParameters({ goodsHiddenPercent: 100 }),
      }),
    );
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

    expect(text).toMatch(/- drawn back: `\w+`, for the floor of cloth\n/);
    expect(text).toMatch(/- drawn back: `(linen|silk)`, for the role tag warm\n/);
  });

  it('names a good drawn back because a buyer wants it by name', () => {
    // Every cloth is hidden, and Osk wants the canvas by name.
    const loaded = loadContent(
      aContentSet({
        archetypes: [anArchetype({ supplies: ['cloth'] })],
        tags: [aTag(), aTag({ id: 'warm', class: 'quality', tells: ['fleece'] })],
        goods: [
          aGood({ id: 'silk', tags: ['warm'] }),
          aGood({ id: 'linen', name: 'Linen', tags: ['warm'] }),
          aGood({ id: 'canvas', name: 'Canvas' }),
        ],
        buyers: [
          aBuyer(),
          aBuyer({ id: 'osk', name: 'Osk', bonusTags: [], wants: [aWantForGood('canvas')] }),
        ],
        bounds: aBounds({ usabilityFloor: 1 }),
        drawParameters: aDrawParameters({ goodsHiddenPercent: 100 }),
      }),
    );
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

    expect(text).toContain('- drawn back: `canvas`, wanted by name by osk\n');
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
