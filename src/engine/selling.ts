import type { Campaign, Cargo } from './campaign';
import type { CommandResult } from './commands';
import type { Buyer, Want } from './content';
import { goodNamed } from './galaxy';
import { matchOf } from './match';

/**
 * Selling a unit of a good to a buyer, against one of their wants. **Trade is
 * not an action** (ADR 0005 decision 6): a sale is a command the engine records
 * and replays, and it spends no part of the day.
 *
 * What the read model offers as a sale and what a sale is refused for read the
 * same match from `matchOf`, so the two cannot drift apart.
 */

/** A want a buyer still has open, with the id a sale names it by. */
export type OpenWant = {
  /** The buyer and the want's place in their wants, which are in want order. */
  readonly id: string;
  readonly buyer: Buyer;
  readonly want: Want;
};

/** The people standing where the player is, in id order: none in **transit**. */
export function peopleHere(campaign: Campaign): readonly Buyer[] {
  const { where } = campaign;
  if (where.kind !== 'at') return [];
  return campaign.galaxy.people.filter((buyer) => buyer.locationId === where.locationId);
}

/**
 * A buyer's wants not yet closed, in want order. A want is named by its place
 * in the buyer's full list, so closing one does not rename the rest.
 */
export function openWants(campaign: Campaign, buyer: Buyer): readonly OpenWant[] {
  return buyer.wants
    .map((want, at): OpenWant => ({ id: `${buyer.id}#${at}`, buyer, want }))
    .filter(({ id }) => !campaign.closedWants.includes(id));
}

/**
 * The campaign a sale leaves, or why it was refused. The buyer pays the offer
 * for one unit, the unit leaves the hold, and the want is **closed**: it is met,
 * or on a grudging sale given up, and either way the buyer is not after it any
 * longer (ADR 0007 decision 11).
 */
export function sell(campaign: Campaign, wantId: string, goodId: string): CommandResult {
  if (campaign.where.kind === 'in-transit') {
    return {
      rejected: {
        code: 'already-underway',
        message: 'You are underway, and there is nobody to sell to in transit.',
      },
    };
  }

  const open = peopleHere(campaign)
    .flatMap((buyer) => openWants(campaign, buyer))
    .find(({ id }) => id === wantId);
  if (open === undefined) {
    return {
      rejected: { code: 'no-such-want', message: 'Nobody here is after that, or not any longer.' },
    };
  }

  const aboard = campaign.cargo.find((cargo) => cargo.goodId === goodId);
  if (aboard === undefined) {
    return { rejected: { code: 'not-in-the-hold', message: 'That is not in your hold.' } };
  }

  const good = goodNamed(campaign.galaxy, goodId);
  const { offer } = matchOf(open.want, open.buyer, good, campaign.content.offers);
  if (offer === null) {
    return { rejected: { code: 'refused-by-the-buyer', message: open.buyer.refusalLine } };
  }

  return {
    campaign: {
      ...campaign,
      credits: campaign.credits + offer,
      cargo: unloaded(campaign.cargo, aboard),
      closedWants: [...campaign.closedWants, wantId],
    },
  };
}

/** The cargo with one unit of a good gone, and the entry with it when it was the last. */
function unloaded(cargo: readonly Cargo[], aboard: Cargo): readonly Cargo[] {
  return cargo.flatMap((each) => {
    if (each !== aboard) return [each];
    return aboard.quantity > 1 ? [{ ...aboard, quantity: aboard.quantity - 1 }] : [];
  });
}
