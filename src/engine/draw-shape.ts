import { goodsCarrying, type ContentSet } from './content';
import type { DrawnGalaxy } from './galaxy';
import { tierOf } from './match';

/**
 * What a drawn galaxy holds of the two numbers the first milestone's question
 * turns on, stated as lists and never as means (CLAUDE.md): a mean of eight
 * goods per kind hides a kind of one (findings §2.4). Bucketing is the
 * reader's, since where "few" ends is a number to be found by measurement.
 */
export type DrawShape = {
  /** Goods in each **usable** kind the draw kept, ascending: one entry a kind. */
  readonly goodsPerUsableKind: readonly number[];
  /**
   * For each vague want held by someone the draw placed, how many drawn goods
   * answer it at acceptable or better, ascending. Zero is a want nothing in
   * this galaxy can meet; one is a lookup rather than a search.
   */
  readonly vagueAnswers: readonly number[];
};

export function drawShape(content: ContentSet, galaxy: DrawnGalaxy): DrawShape {
  const floor = content.bounds.usabilityFloor;
  const goodsPerUsableKind = galaxy.kinds
    .map((kind) => goodsCarrying(galaxy, kind))
    .filter((goods) => goods >= floor);

  const vagueAnswers = galaxy.people.flatMap((buyer) =>
    buyer.wants.flatMap((want) => {
      if (!('kind' in want)) return [];
      return [
        galaxy.goods.filter((good) => {
          const { tier } = tierOf(want, buyer, good);
          return tier === 'acceptable' || tier === 'great';
        }).length,
      ];
    }),
  );

  return {
    goodsPerUsableKind: ascending(goodsPerUsableKind),
    vagueAnswers: ascending(vagueAnswers),
  };
}

function ascending(counts: readonly number[]): readonly number[] {
  return [...counts].sort((one, other) => one - other);
}
