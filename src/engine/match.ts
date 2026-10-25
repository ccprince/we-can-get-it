import type { Buyer, Good, OfferParameters, Want } from './content';

/**
 * How well a good answers a want, derived by the engine from the good's tags,
 * the want's **predicate** and the buyer's **bonus** and **refusal** tags and
 * never stated in content (ADR 0007 decision 9).
 */
export type Tier = 'refused' | 'grudging' | 'acceptable' | 'great';

/** Whether a good carries a tag, whether as its one kind or among the rest. */
function carries(good: Good, tag: string): boolean {
  return good.kind === tag || good.tags.includes(tag);
}

/**
 * The tier a good earns against one of a buyer's wants. In order:
 *
 * - a refusal tag present, or a negated term violated → `refused`
 * - every positive term satisfied → `great` with a bonus tag, else `acceptable`
 * - some but not all → `grudging`, which only a conjunction of more than one
 *   positive term can reach
 * - none → `refused`
 *
 * A want naming one good is that good or nothing: it is `acceptable` for it,
 * `great` with a bonus tag, and `refused` for any other.
 */
export function tierOf(want: Want, buyer: Buyer, good: Good): Tier {
  if (buyer.refusalTags.some((tag) => carries(good, tag))) return 'refused';
  const bonus = buyer.bonusTags.some((tag) => carries(good, tag));

  if ('goodId' in want) {
    if (good.id !== want.goodId) return 'refused';
    return bonus ? 'great' : 'acceptable';
  }

  if (want.predicate.some((term) => term.negated && carries(good, term.tag))) return 'refused';

  const positive = want.predicate.filter((term) => !term.negated);
  const met = positive.filter((term) => carries(good, term.tag)).length;
  if (met === positive.length) return bonus ? 'great' : 'acceptable';
  return met === 0 ? 'refused' : 'grudging';
}

/**
 * What the buyer pays for the good at that tier: the good's **worth** times the
 * tier's percent, rounded down to a whole credit — a buyer does not pay a
 * fraction, and rounding down is the buyer's side of the rounding a shop's
 * price takes up. `null` for `refused`, which is not paid for at all.
 */
export function offerFor(good: Good, tier: Tier, offers: OfferParameters): number | null {
  if (tier === 'refused') return null;
  const percent = {
    grudging: offers.grudgingPercent,
    acceptable: offers.acceptablePercent,
    great: offers.greatPercent,
  }[tier];
  return Math.floor((good.worth * percent) / 100);
}
