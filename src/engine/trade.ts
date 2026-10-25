import type { Campaign, Cargo } from './campaign';
import type { Reason } from './commands';
import { byId } from './load-content';
import type { Lot } from './stock';

/**
 * Buying a **lot**. **Trade is not an action** (ADR 0005 decision 6): a buy is a
 * command the engine records and replays, and it spends no part of the day.
 *
 * What the shop shows the player as the most they could buy and what a buy is
 * refused for are both read from here, so the two cannot drift apart.
 */

/** Units of cargo aboard, against the **hold**. One unit of any good is one unit of hold. */
export function holdUsed(cargo: readonly Cargo[]): number {
  return cargo.reduce((used, { quantity }) => used + quantity, 0);
}

/** The lots on sale where the player is: none in **transit**, where there is no shop. */
export function lotsHere(campaign: Campaign): readonly Lot[] {
  const { where } = campaign;
  if (where.kind !== 'at') return [];
  return campaign.lots.filter((lot) => lot.locationId === where.locationId);
}

/**
 * The most units of a lot the player could buy now: the fewest of what the lot
 * holds, what the hold has room for, and what the credits cover.
 */
export function mostYouCanBuy(campaign: Campaign, lot: Lot): number {
  const room = campaign.ship.hold - holdUsed(campaign.cargo);
  return Math.min(lot.quantity, room, Math.floor(campaign.credits / lot.price));
}

/**
 * The campaign a buy leaves, or why it was refused. A buy is paid at once, the
 * units go into the hold, and a lot bought out is gone for the rest of the
 * campaign: nothing restocks a shop in this milestone.
 */
export function buy(
  campaign: Campaign,
  lotId: string,
  quantity: number,
): { readonly campaign: Campaign } | { readonly rejected: Reason } {
  const lot = lotsHere(campaign).find(({ id }) => id === lotId);
  if (lot === undefined) {
    return { rejected: { code: 'no-such-lot', message: 'There is no such lot on sale here.' } };
  }
  if (quantity > lot.quantity) {
    return {
      rejected: { code: 'more-than-the-lot-holds', message: `The lot holds ${lot.quantity}.` },
    };
  }

  const room = campaign.ship.hold - holdUsed(campaign.cargo);
  if (quantity > room) {
    return {
      rejected: {
        code: 'hold-is-full',
        message: `That is ${units(quantity)}, and your hold has room for ${room}.`,
      },
    };
  }

  const cost = quantity * lot.price;
  if (cost > campaign.credits) {
    return {
      rejected: {
        code: 'cannot-afford-the-lot',
        message:
          `${units(quantity)} at ${lot.price} credits is ${cost} credits, ` +
          `and you have ${campaign.credits}.`,
      },
    };
  }

  return {
    campaign: {
      ...campaign,
      credits: campaign.credits - cost,
      lots: campaign.lots
        .map((each) => (each === lot ? { ...each, quantity: each.quantity - quantity } : each))
        .filter((each) => each.quantity > 0),
      cargo: loaded(campaign.cargo, lot.goodId, quantity),
    },
  };
}

/** The cargo with more of a good aboard: one entry a good, in good-id order. */
function loaded(cargo: readonly Cargo[], goodId: string, quantity: number): readonly Cargo[] {
  const aboard = cargo.find((each) => each.goodId === goodId)?.quantity ?? 0;
  return [
    ...cargo.filter((each) => each.goodId !== goodId),
    { goodId, quantity: aboard + quantity },
  ].sort((one, other) => byId(one.goodId, other.goodId));
}

function units(quantity: number): string {
  return quantity === 1 ? '1 unit' : `${quantity} units`;
}
