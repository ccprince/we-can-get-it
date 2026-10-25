import type { Campaign, Cargo, Delivery } from './campaign';
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
  /** Units the buyer will still take: the want's quantity less what was sold to it. */
  readonly remaining: number;
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
    .map((want, at): OpenWant => {
      const id = `${buyer.id}#${at}`;
      const sold = campaign.delivered.find((each) => each.want === id)?.units ?? 0;
      return { id, buyer, want, remaining: want.quantity - sold };
    })
    .filter(({ remaining }) => remaining > 0);
}

/**
 * The most units of a good the player could sell against a want now: the fewer
 * of what the hold carries and what the buyer still takes, and none at all of a
 * good the buyer refuses. The same reading a sale is refused by, so the page
 * never offers what would be refused.
 */
export function mostYouCanSell(open: OpenWant, aboard: number, offer: number | null): number {
  return offer === null ? 0 : Math.min(aboard, open.remaining);
}

/**
 * The campaign a sale leaves, or why it was refused. The buyer pays the offer
 * for each unit, the units leave the hold, and the want is sold against: it is
 * **closed** once all of it is sold, and a grudging sale closes it at once,
 * given up with the better price forgone (ADR 0007 decision 11).
 */
export function sell(
  campaign: Campaign,
  wantId: string,
  goodId: string,
  quantity: number,
): CommandResult {
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
  const { tier, offer } = matchOf(open.want, open.buyer, good, campaign.content.offers);
  if (offer === null) {
    return { rejected: { code: 'refused-by-the-buyer', message: open.buyer.refusalLine } };
  }

  if (quantity > aboard.quantity) {
    return {
      rejected: {
        code: 'more-than-the-hold-carries',
        message: `That is ${units(quantity)}, and your hold carries ${aboard.quantity}.`,
      },
    };
  }
  if (quantity > open.remaining) {
    return {
      rejected: {
        code: 'more-than-the-buyer-takes',
        message: `${open.buyer.name} will take ${open.remaining}.`,
      },
    };
  }

  return {
    campaign: {
      ...campaign,
      credits: campaign.credits + offer * quantity,
      cargo: unloaded(campaign.cargo, aboard, quantity),
      delivered: delivered(
        campaign.delivered,
        open,
        tier === 'grudging' ? open.remaining : quantity,
      ),
    },
  };
}

/** The cargo with units of a good gone, and the entry with it when it was the last. */
function unloaded(cargo: readonly Cargo[], aboard: Cargo, quantity: number): readonly Cargo[] {
  return cargo.flatMap((each) => {
    if (each !== aboard) return [each];
    return aboard.quantity > quantity ? [{ ...aboard, quantity: aboard.quantity - quantity }] : [];
  });
}

/** The deliveries with more units sold against a want, in the order wants were first sold to. */
function delivered(
  all: readonly Delivery[],
  { id }: OpenWant,
  quantity: number,
): readonly Delivery[] {
  if (!all.some((each) => each.want === id)) return [...all, { want: id, units: quantity }];
  return all.map((each) => (each.want === id ? { ...each, units: each.units + quantity } : each));
}

function units(quantity: number): string {
  return quantity === 1 ? '1 unit' : `${quantity} units`;
}
