import type { Campaign, DigestEntry } from './campaign';
import type { CommandResult } from './commands';
import { goodNamed } from './galaxy';
import { matchOf } from './match';
import {
  delivered,
  lastDayOf,
  openWants,
  peopleHere,
  unloaded,
  units,
  type OpenWant,
} from './selling';

/**
 * Orders: a want a buyer states **with the price they will pay**. An order is
 * the dependable floor under speculation's ceiling, and dependable both ways:
 * it completes only at **acceptable** or better, a near-miss is declined and
 * leaves the order open and the good in the hold, and it stays open until it is
 * filled or its date passes (ADR 0007 decision 11).
 *
 * Like a sale, accepting and filling are not actions (ADR 0005 decision 6).
 */

/** The open want here that `wantId` names, if the player is somewhere it stands. */
function openHere(campaign: Campaign, wantId: string): OpenWant | undefined {
  return peopleHere(campaign)
    .flatMap((buyer) => openWants(campaign, buyer))
    .find(({ id }) => id === wantId);
}

/** Whether the player has taken this order on. */
export function isAccepted(campaign: Campaign, wantId: string): boolean {
  return campaign.accepted.includes(wantId);
}

/** Take on an order a buyer here states. A speculative want is not one. */
export function accept(campaign: Campaign, wantId: string): CommandResult {
  const open = openHere(campaign, wantId);
  if (open === undefined) {
    return {
      rejected: { code: 'no-such-want', message: 'Nobody here is after that, or not any longer.' },
    };
  }
  if (open.want.order === undefined) {
    return {
      rejected: {
        code: 'not-an-order',
        message: `${open.buyer.name} states no price for that, so there is nothing to accept.`,
      },
    };
  }
  if (isAccepted(campaign, wantId)) {
    return {
      rejected: { code: 'already-accepted', message: 'You have already taken that order on.' },
    };
  }
  return { campaign: { ...campaign, accepted: [...campaign.accepted, wantId] } };
}

/**
 * Fill an accepted order from the hold. It pays the **stated price** for each
 * unit and never a computed offer, and only for a good at **acceptable** or
 * better: a grudging match is declined, and a refused one is turned down in the
 * buyer's own words. A declined fill leaves the campaign untouched, which is what
 * makes a failed attempt cost nothing but time.
 */
export function fill(
  campaign: Campaign,
  wantId: string,
  goodId: string,
  quantity: number,
): CommandResult {
  if (campaign.where.kind === 'in-transit') {
    return {
      rejected: {
        code: 'already-underway',
        message: 'You are underway, and there is nobody to deliver to in transit.',
      },
    };
  }

  const open = openHere(campaign, wantId);
  if (open === undefined) {
    return {
      rejected: { code: 'no-such-want', message: 'Nobody here is after that, or not any longer.' },
    };
  }
  const { order } = open.want;
  if (order === undefined) {
    return {
      rejected: {
        code: 'not-an-order',
        message: `${open.buyer.name} states no price for that, so it is sold to, not filled.`,
      },
    };
  }
  if (!isAccepted(campaign, wantId)) {
    return {
      rejected: { code: 'not-accepted', message: 'You have not taken that order on.' },
    };
  }

  const aboard = campaign.cargo.find((cargo) => cargo.goodId === goodId);
  if (aboard === undefined) {
    return { rejected: { code: 'not-in-the-hold', message: 'That is not in your hold.' } };
  }

  const good = goodNamed(campaign.galaxy, goodId);
  const { tier } = matchOf(open.want, open.buyer, good, campaign.content.offers);
  if (tier === 'refused') {
    return { rejected: { code: 'refused-by-the-buyer', message: open.buyer.refusalLine } };
  }
  if (tier === 'grudging') {
    return {
      rejected: {
        code: 'declined-below-acceptable',
        message: `${open.buyer.name} declines it. The order stands, and wants better.`,
      },
    };
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
      credits: campaign.credits + order.price * quantity,
      cargo: unloaded(campaign.cargo, aboard, quantity),
      delivered: delivered(campaign.delivered, open, quantity),
    },
  };
}

/**
 * The accepted orders whose date has just passed with units still owed, worded
 * for the digest. Read of the campaign as the new day finds it: an order's last
 * day was yesterday.
 */
export function lapsedOrders(campaign: Campaign): readonly DigestEntry[] {
  return campaign.galaxy.people.flatMap((buyer) =>
    buyer.wants.flatMap((want, at): DigestEntry[] => {
      const id = `${buyer.id}#${at}`;
      const owed =
        want.quantity - (campaign.delivered.find((each) => each.want === id)?.units ?? 0);
      const lapsedToday = lastDayOf(campaign, want) === campaign.day - 1;
      if (!lapsedToday || owed <= 0 || !isAccepted(campaign, id)) return [];
      return [{ text: `${buyer.name}'s order has lapsed, with ${units(owed)} unfilled.` }];
    }),
  );
}
