import { describe, expect, it } from 'vitest';
import { crossProduct, drawGalaxy } from '../src/engine';
import {
  aGood,
  aGalaxy,
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

  it('has nothing drawn to report when no galaxy was drawn', () => {
    const content = loadedContentSet(aGalaxy());

    expect(crossProduct(content, null).drawn).toBeNull();
  });
});
