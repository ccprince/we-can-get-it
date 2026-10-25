import type { ContentSet, Good, Range } from './content';
import type { DrawnGalaxy } from './galaxy';
import { drawFrom, drawInt, type Rng } from './rng';

/**
 * A **lot**: a quantity of a good on sale at a shop, finite and depletable
 * (findings §2.1). Nothing about it is authored: its good, its size and its
 * price come from the drawn galaxy and the shop parameters the content set
 * declares (#14).
 *
 * Every drawn location has one shop (ADR 0006 decision 6 rejected the
 * multi-shop location), so a lot is held by the location it is at, and a shop
 * stocks at most one lot of any good.
 */
export type Lot = {
  /** The location and the good, which together name a lot uniquely. */
  readonly id: string;
  readonly locationId: string;
  readonly goodId: string;
  /** Units left. A lot bought out is gone, and never holds none. */
  readonly quantity: number;
  /** Credits a unit, fixed when the shop is stocked. */
  readonly price: number;
};

/**
 * Stock every drawn location's shop at campaign start, with lots of the drawn
 * goods whose **kind** its **archetype** supplies. Stock is campaign state and
 * not part of the galaxy (ADR 0004: what moves within a campaign is state), so
 * this runs after the **draw** and spends the generator the draw left behind.
 *
 * In placement order, and each shop's lots in good-id order: derived order,
 * from the seed and the content set alone (ADR 0009 decision 3).
 */
export function stockShops(
  galaxy: DrawnGalaxy,
  content: ContentSet,
  rng: Rng,
): readonly [readonly Lot[], Rng] {
  const { shops } = content;
  const lots: Lot[] = [];
  let next = rng;

  for (const location of galaxy.locations) {
    const supplies = content.archetypes.find(({ id }) => id === location.archetype)?.supplies;
    const offered = galaxy.goods.filter((good) => supplies?.includes(good.kind));

    const [markup, afterMarkup] = drawWithin(shops.markupPercent, next);
    const [count, afterCount] = drawWithin(shops.lotsPerShop, afterMarkup);
    const [stocked, afterStocked] = drawSome(offered, count, afterCount);
    next = afterStocked;

    for (const good of stocked) {
      const [opening, after] = drawWithin(shops.lotQuantity, next);
      next = after;
      lots.push({
        id: `${location.id}/${good.id}`,
        locationId: location.id,
        goodId: good.id,
        quantity: opening,
        price: priceOf(good, markup, opening, content),
      });
    }
  }

  return [lots, next];
}

/**
 * A unit's price: **worth**, plus the shop's markup, plus what a small lot adds
 * for being scarce. `ceil(worth × (100 + markup + scarcity) / 100)`, where
 * scarcity is `scarcityPercent × (most − opening) / most`.
 *
 * Worked in whole numbers over one denominator and rounded up once, so the
 * price is an integer by a stated rule and never drifts (ADR 0009 decision 3).
 * Rounding up, because a shop does not sell below the price it means.
 */
function priceOf(good: Good, markup: number, opening: number, content: ContentSet): number {
  const { lotQuantity, scarcityPercent } = content.shops;
  const most = lotQuantity.most;
  const percentTimesMost = (100 + markup) * most + scarcityPercent * (most - opening);
  const denominator = 100 * most;
  return Math.floor((good.worth * percentTimesMost + denominator - 1) / denominator);
}

/** A whole number in a declared range, both ends included. */
function drawWithin(range: Range, rng: Rng): readonly [number, Rng] {
  const [offset, next] = drawInt(rng, range.most - range.least + 1);
  return [range.least + offset, next];
}

/**
 * Up to `count` of a list, drawn without repeats and returned in the list's
 * own order — every item, when there are no more of them than that.
 */
function drawSome<T>(items: readonly T[], count: number, rng: Rng): readonly [T[], Rng] {
  const left = [...items];
  const drawn = new Set<T>();
  let next = rng;
  while (drawn.size < count && left.length > 0) {
    const [item, after] = drawFrom(left, next);
    next = after;
    left.splice(left.indexOf(item), 1);
    drawn.add(item);
  }
  return [items.filter((item) => drawn.has(item)), next];
}
