import { describe, expect, it } from 'vitest';
import { drawGalaxy, drawShape } from '../src/engine';
import {
  aBuyer,
  aTradingGalaxy,
  aVagueWant,
  aWant,
  anElsewhereBuyer,
  loadedContentSet,
} from './support/content';

/**
 * The shape of a drawn galaxy's demand, as lists the harness buckets (#21).
 */
function shapeOf(wants: Record<string, unknown>[], buyerOverrides: Record<string, unknown> = {}) {
  const content = loadedContentSet(
    aTradingGalaxy({ buyers: [aBuyer({ wants, ...buyerOverrides }), anElsewhereBuyer()] }),
  );
  const drawn = drawGalaxy(content, 1);
  if (!drawn.ok) throw new Error('the draw failed');
  return { shape: drawShape(content, drawn.galaxy), galaxy: drawn.galaxy };
}

describe('the shape of a draw', () => {
  it('counts the goods in each usable kind, one entry a kind and ascending', () => {
    const { shape, galaxy } = shapeOf([aVagueWant('cloth')]);

    const perKind = galaxy.kinds
      .map((kind) => galaxy.goods.filter((good) => good.kind === kind).length)
      .filter((goods) => goods >= 2)
      .sort((one, other) => one - other);
    expect(shape.goodsPerUsableKind).toEqual(perKind);
    expect(shape.goodsPerUsableKind.length).toBeGreaterThan(0);
  });

  it('counts the drawn goods that answer each vague want', () => {
    const { shape, galaxy } = shapeOf([aVagueWant('cloth')]);

    const cloth = galaxy.goods.filter((good) => good.kind === 'cloth').length;
    expect(shape.vagueAnswers).toEqual([cloth]);
  });

  it('counts none for a vague want whose kind the buyer refuses', () => {
    const { shape } = shapeOf([aVagueWant('cloth')], { refusalTags: ['cloth'] });

    expect(shape.vagueAnswers).toEqual([0]);
  });

  it('leaves a plain want out', () => {
    const { shape } = shapeOf([aWant()]);

    expect(shape.vagueAnswers).toEqual([]);
  });
});
