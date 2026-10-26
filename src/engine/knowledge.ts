import type { Campaign, DigestEntry } from './campaign';
import type { Buyer } from './content';
import { goodNamed, locationNamed } from './galaxy';
import { openWants, peopleHere } from './selling';
import type { Lot } from './stock';
import { lotsHere } from './trade';

/**
 * What the player has seen of a **location**, held as last known with its
 * **as-of date** (ADR 0006 decision 17). A sighting is the tier of the **trade
 * guide** that is discovered: the lots on sale, their prices and quantities, and
 * who was there to want what. It is never edited once taken. A landing takes a
 * new one, and the difference between the two is the correction.
 *
 * Nothing known is dropped for relevance (findings §2.2): a sighting lasts the
 * campaign, and only a later sighting of the same place replaces it.
 */
export type Sighting = {
  readonly locationId: string;
  /** The day the player saw it. */
  readonly asOf: number;
  /** The lots as seen, in good-id order. */
  readonly lots: readonly Lot[];
  /** The people as seen, in id order, with the wants each still had open. */
  readonly people: readonly SeenPerson[];
  /**
   * What the landing that took this sighting found different from the one it
   * replaced; empty for the first sighting of a place, and for any taken on
   * departure.
   */
  readonly corrections: readonly Correction[];
};

export type SeenPerson = {
  readonly buyerId: string;
  /** Each open want by its place in the buyer's wants, and the units still wanted. */
  readonly wants: readonly { readonly at: number; readonly remaining: number }[];
};

/** One thing a landing found other than the player had it. */
export type Correction =
  | { readonly kind: 'lot-changed'; readonly was: Lot; readonly now: Lot }
  | { readonly kind: 'lot-gone'; readonly was: Lot }
  | { readonly kind: 'lot-new'; readonly now: Lot }
  | { readonly kind: 'person-changed'; readonly buyerId: string }
  | { readonly kind: 'person-gone'; readonly buyerId: string }
  | { readonly kind: 'person-new'; readonly buyerId: string };

/**
 * The place the player stands in, as seen today. It reads the same lots and
 * people the shop and the people surfaces do, so a sighting cannot disagree
 * with what was on the screen.
 */
export function sightingHere(campaign: Campaign, corrections: readonly Correction[]): Sighting {
  if (campaign.where.kind !== 'at') {
    throw new Error('there is nothing to see in transit');
  }
  return {
    locationId: campaign.where.locationId,
    asOf: campaign.day,
    lots: lotsHere(campaign),
    people: peopleHere(campaign).map((buyer) => ({
      buyerId: buyer.id,
      wants: openWants(campaign, buyer).map(({ id, remaining }) => ({
        at: Number(id.slice(buyer.id.length + 1)),
        remaining,
      })),
    })),
    corrections,
  };
}

/** The campaign knowing `sighting`, which replaces any earlier one of the same place. */
export function learning(campaign: Campaign, sighting: Sighting): Campaign {
  const known = campaign.known.some(({ locationId }) => locationId === sighting.locationId)
    ? campaign.known.map((each) => (each.locationId === sighting.locationId ? sighting : each))
    : [...campaign.known, sighting];
  return { ...campaign, known };
}

/** The player leaves a place as they last saw it, so that is what is held of it. */
export function learningOnDeparture(campaign: Campaign): Campaign {
  return learning(campaign, sightingHere(campaign, []));
}

/**
 * A landing: the place is seen as it is today, corrected against what was held,
 * and the digest says what was found different. `campaign` is the one that has
 * just landed.
 */
export function learningOnLanding(campaign: Campaign): {
  readonly campaign: Campaign;
  readonly entries: readonly DigestEntry[];
} {
  if (campaign.where.kind !== 'at') throw new Error('a landing is at a location');
  const { locationId } = campaign.where;
  const held = campaign.known.find((each) => each.locationId === locationId);
  const seen = sightingHere(campaign, []);
  const sighting =
    held === undefined ? seen : { ...seen, corrections: correctionsBetween(held, seen) };

  const where = locationNamed(campaign.galaxy, locationId).name;
  return {
    campaign: learning(campaign, sighting),
    entries: sighting.corrections.map((correction) => ({
      text: `${where} — ${wordCorrection(campaign, correction)}`,
    })),
  };
}

function correctionsBetween(was: Sighting, now: Sighting): readonly Correction[] {
  const lots: Correction[] = [];
  for (const lot of was.lots) {
    const found = now.lots.find(({ id }) => id === lot.id);
    if (found === undefined) lots.push({ kind: 'lot-gone', was: lot });
    else if (found.quantity !== lot.quantity || found.price !== lot.price) {
      lots.push({ kind: 'lot-changed', was: lot, now: found });
    }
  }
  for (const lot of now.lots) {
    if (!was.lots.some(({ id }) => id === lot.id)) lots.push({ kind: 'lot-new', now: lot });
  }

  const people: Correction[] = [];
  for (const person of was.people) {
    const found = now.people.find(({ buyerId }) => buyerId === person.buyerId);
    if (found === undefined) people.push({ kind: 'person-gone', buyerId: person.buyerId });
    else if (JSON.stringify(found.wants) !== JSON.stringify(person.wants)) {
      people.push({ kind: 'person-changed', buyerId: person.buyerId });
    }
  }
  for (const person of now.people) {
    if (!was.people.some(({ buyerId }) => buyerId === person.buyerId)) {
      people.push({ kind: 'person-new', buyerId: person.buyerId });
    }
  }
  return [...lots, ...people];
}

/** A correction as a player reads it: what it was, and what it is. */
export function wordCorrection(campaign: Pick<Campaign, 'galaxy'>, correction: Correction): string {
  switch (correction.kind) {
    case 'lot-changed':
      return (
        `${goodOf(campaign, correction.now)}: now ${stocked(correction.now)},` +
        ` was ${stocked(correction.was)}.`
      );
    case 'lot-gone':
      return `${goodOf(campaign, correction.was)}: no longer on sale.`;
    case 'lot-new':
      return `${goodOf(campaign, correction.now)}: now on sale, ${stocked(correction.now)}.`;
    case 'person-changed':
      return `${buyerOf(campaign, correction.buyerId).name}: what they are after has changed.`;
    case 'person-gone':
      return `${buyerOf(campaign, correction.buyerId).name}: no longer here.`;
    case 'person-new':
      return `${buyerOf(campaign, correction.buyerId).name}: now here.`;
  }
}

function stocked({ quantity, price }: Lot): string {
  return `${quantity} at ${price} credits`;
}

function goodOf(campaign: Pick<Campaign, 'galaxy'>, lot: Lot): string {
  return goodNamed(campaign.galaxy, lot.goodId).name;
}

function buyerOf(campaign: Pick<Campaign, 'galaxy'>, buyerId: string): Buyer {
  const buyer = campaign.galaxy.people.find(({ id }) => id === buyerId);
  if (buyer === undefined) throw new Error(`${buyerId} is not a person the drawn galaxy holds`);
  return buyer;
}
