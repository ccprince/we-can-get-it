import { describe, expect, it } from 'vitest';
import { crossProduct, drawGalaxy } from '../src/engine';
import {
  aBounds,
  aBuyer,
  aDrawParameters,
  aGood,
  aGalaxy,
  aTag,
  aLocation,
  aMotif,
  aSlot,
  aTradingGalaxy,
  anArchetype,
  loadedContentSet,
} from './support/content';

/**
 * The cross-product report returns what a writer has written as **data**
 * (ADR 0007 decision 18); a script formats it. Every finding is for a writer
 * to judge and carries that verdict, so a listing combined with the loader's
 * problems never conflates the two.
 */
describe('the cross-product report', () => {
  it('states goods per kind and per role tag as distributions, widest first', () => {
    const report = crossProduct(loadedContentSet(aTradingGalaxy()), null);

    expect(report.asWritten.goodsPerKind).toEqual([
      { goods: 3, tags: ['cloth'] },
      { goods: 2, tags: ['tools'] },
    ]);
    // `warm` is Ilse's bonus tag, carried by the blanket and the quilt.
    expect(report.asWritten.goodsPerRoleTag).toEqual([{ goods: 2, tags: ['warm'] }]);
  });

  it('reports a good whose prose carries none of the tells of a tag it holds', () => {
    const catalogue = aTradingGalaxy();
    const content = loadedContentSet({
      ...catalogue,
      goods: [
        ...(catalogue.goods as Record<string, unknown>[]),
        aGood({ id: 'rug', name: 'Rug', prose: 'Thick underfoot.', tags: ['warm'] }),
      ],
    });

    const { missingTells } = crossProduct(content, null).asWritten;

    expect(missingTells).toEqual([
      {
        verdict: 'judge',
        where: 'goods.rug.prose',
        what: 'carries none of the tells of cloth: woven, bolt',
      },
      {
        verdict: 'judge',
        where: 'goods.rug.prose',
        what: 'carries none of the tells of warm: fleece, quilted',
      },
    ]);
  });

  it('reports a good whose prose carries the tells of a tag it does not hold', () => {
    const catalogue = aTradingGalaxy();
    const content = loadedContentSet({
      ...catalogue,
      goods: [
        ...(catalogue.goods as Record<string, unknown>[]),
        aGood({ id: 'tarp', name: 'Tarp', prose: 'A woven tarp with a fleece lining.' }),
      ],
    });

    const { strayTells, missingTells } = crossProduct(content, null).asWritten;

    expect(strayTells).toEqual([
      {
        verdict: 'judge',
        where: 'goods.tarp.prose',
        what: 'carries the tell fleece of warm, which it does not hold',
      },
    ]);
    expect(missingTells).toEqual([]);
  });

  it('counts the locations that fit each slot, and lists the locations of each archetype', () => {
    const content = loadedContentSet({
      archetypes: [anArchetype({ id: 'market' }), anArchetype({ id: 'yard' })],
      locations: [
        aLocation({ id: 'kestrel', archetype: 'market' }),
        aLocation({ id: 'bellwether', archetype: 'yard' }),
        aLocation({ id: 'tallow', archetype: 'yard' }),
      ],
      motifs: [
        aMotif({
          id: 'pair',
          slots: [aSlot({ id: 'a', archetype: 'yard' }), aSlot({ id: 'b', archetype: null })],
        }),
      ],
    });

    const report = crossProduct(content, null);

    expect(report.slots).toEqual([
      { motif: 'pair', slot: 'a', archetype: 'yard', locations: 2 },
      { motif: 'pair', slot: 'b', archetype: null, locations: 3 },
    ]);
    expect(report.archetypes).toEqual([
      { archetype: 'market', locations: ['kestrel'] },
      { archetype: 'yard', locations: ['bellwether', 'tallow'] },
    ]);
  });

  it('reports a drawn galaxy through the same draw, naming who filled which slot', () => {
    const content = loadedContentSet(aTradingGalaxy());
    const drawn = drawGalaxy(content, 1);
    if (!drawn.ok) throw new Error('the fixture did not draw');

    const { drawn: report } = crossProduct(content, drawn.galaxy);

    expect(report?.goodsPerKind).toEqual([
      { goods: 3, tags: ['cloth'] },
      { goods: 2, tags: ['tools'] },
    ]);
    expect(report?.placed.map(({ location, archetype }) => [location, archetype])).toEqual([
      ['kestrel', 'only-kestrel'],
      ['bellwether', 'only-bellwether'],
    ]);
  });

  it('says how many goods the draw hid, against the rate declared, and which it drew back', () => {
    // Every good is rolled hidden, so every good kept was drawn back: one for
    // cloth's floor of one, and then enough for Ilse's warm to sit on two.
    const content = loadedContentSet({
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
    });
    const drawn = drawGalaxy(content, 1);
    if (!drawn.ok) throw new Error('the fixture did not draw');
    const kept = drawn.galaxy.goods.map((good) => good.id);

    const hiding = crossProduct(content, drawn.galaxy).drawn?.goodsHidden;

    // The floor draws back one good at random; then warm is drawn back to two,
    // its goods in id order, less any the floor already drew back.
    const [first, ...rest] = hiding?.drawnBack ?? [];
    expect(hiding?.declaredPercent).toBe(100);
    expect(hiding?.inCirculation).toBe(3);
    expect(first).toMatchObject({ floor: 'cloth' });
    expect(rest).toEqual(
      ['linen', 'silk']
        .filter((good) => good !== first?.good)
        .map((good) => ({ good, roleTag: 'warm' })),
    );
    expect(hiding?.hidden).toBe(first?.good === 'canvas' ? 0 : 1);
    expect(kept).toEqual(hiding?.drawnBack.map(({ good }) => good).sort());
  });

  it('has nothing drawn to report when no galaxy was drawn', () => {
    const content = loadedContentSet(aGalaxy());

    expect(crossProduct(content, null).drawn).toBeNull();
  });
});
