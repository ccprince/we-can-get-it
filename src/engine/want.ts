import type { Order, Want } from './content';
import { goodNamed, type DrawnGalaxy } from './galaxy';

/**
 * A want as it is said: a good by its name, a predicate in the buyer's own
 * words, a vague want as a gesture at its kind. A kind is public vocabulary, so
 * naming it gives nothing away (ADR 0007 decision 3). The read model and the
 * cross-product report both word a want with this, so the report shows each
 * want as the player is shown it.
 */
export function wordingOf(galaxy: Pick<DrawnGalaxy, 'goods'>, want: Want): string {
  if ('goodId' in want) return `wants ${goodNamed(galaxy, want.goodId).name}`;
  if ('kind' in want) return `is after anything at all in ${want.kind}`;
  return want.plainly;
}

/** Whether a want is an **order**: the buyer states a price and a date. */
export function isOrder(want: Want): want is Want & { readonly order: Order } {
  return want.order !== undefined;
}
