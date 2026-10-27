import type { Campaign, DigestEntry } from './campaign';
import type { CommandResult } from './commands';
import type { Ship } from './content';
import type { DrawnGalaxy } from './galaxy';
import { locationNamed } from './galaxy';
import { daysToFly, fareToFly, otherEnd, withinRange } from './map';

/**
 * **Mail**: the worst-paid **passage work**, on offer at every location and
 * taking no room in the hold, which is what makes it a floor under being broke
 * (ADR 0005 decision 18). Its **advance** is paid on taking it, so a player with
 * no credits can take mail and then pay the fare it was bought to cover; the
 * obligation it creates is a delivery to the other end of the lane. Like any
 * trade, taking mail is not an action (ADR 0005 decision 6).
 *
 * One consignment at a time, so that an advance is an advance on a journey and
 * never a purse to be drawn on while standing still.
 */

/** A consignment on offer: a lane within range from here, and what it pays. */
export type MailOffer = {
  readonly toId: string;
  readonly advance: number;
  readonly days: number;
};

/** What mail pays on a lane of this distance. */
function advanceFor(distance: number, mailRate: number): number {
  return distance * mailRate;
}

/**
 * The offers at a location, one a lane within the baseline ship's range, in
 * lane order. The same reading `takeMail` is refused by.
 */
function mailOffersAt(campaign: Campaign, locationId: string): readonly MailOffer[] {
  return campaign.galaxy.lanes.flatMap((lane) => {
    const toId = otherEnd(lane, locationId);
    if (toId === null || !withinRange(lane, campaign.ship)) return [];
    return [
      {
        toId,
        advance: advanceFor(lane.distance, campaign.content.mailRate),
        days: daysToFly(lane, campaign.ship),
      },
    ];
  });
}

/** What the player is offered here: nothing in **transit**, or while carrying mail. */
export function mailOffersHere(campaign: Campaign): readonly MailOffer[] {
  const { where } = campaign;
  if (where.kind !== 'at' || campaign.mail !== null) return [];
  return mailOffersAt(campaign, where.locationId);
}

/** Take the mail for a lane from here, and be paid its advance. */
export function takeMail(campaign: Campaign, toId: string): CommandResult {
  if (campaign.where.kind === 'in-transit') {
    return {
      rejected: {
        code: 'already-underway',
        message: 'You are underway, and there is no mail to take in transit.',
      },
    };
  }
  if (campaign.mail !== null) {
    return {
      rejected: {
        code: 'already-carrying-mail',
        message: 'You are already carrying mail, and it is not yet delivered.',
      },
    };
  }
  const offer = mailOffersHere(campaign).find((each) => each.toId === toId);
  if (offer === undefined) {
    return {
      rejected: { code: 'no-such-mail', message: 'There is no mail on offer here for there.' },
    };
  }
  return {
    campaign: {
      ...campaign,
      credits: campaign.credits + offer.advance,
      mail: { fromId: campaign.where.locationId, toId },
    },
  };
}

/**
 * The campaign with mail handed over, or lapsed if the player has set down
 * somewhere else, and what the digest says of it. Called on a landing only.
 */
export function deliveringMail(campaign: Campaign): {
  readonly campaign: Campaign;
  readonly entries: readonly DigestEntry[];
} {
  const { mail, where } = campaign;
  if (mail === null || where.kind !== 'at') return { campaign, entries: [] };
  const bound = locationNamed(campaign.galaxy, mail.toId).name;
  // Mail not delivered where the player sets down lapses and its advance is
  // kept: a broke player must never be left holding mail they cannot shed.
  const text =
    where.locationId === mail.toId
      ? `You hand over the mail at ${bound}.`
      : `The mail bound for ${bound} lapses, undelivered.`;
  return { campaign: { ...campaign, mail: null }, entries: [{ text }] };
}

/** The locations whose mail cannot pay its own fare: the invariant's misses, in galaxy order. */
export function locationsWhereMailFallsShort(
  galaxy: Pick<DrawnGalaxy, 'locations' | 'lanes'>,
  ship: Ship,
  fareRate: number,
  mailRate: number,
): readonly string[] {
  return galaxy.locations.flatMap(({ id }) => {
    const flyable = galaxy.lanes.filter(
      (lane) => otherEnd(lane, id) !== null && withinRange(lane, ship),
    );
    // A place with no lane in range has nowhere for mail to go; connectivity is
    // the check that names it.
    const covered = flyable.some(
      (lane) => advanceFor(lane.distance, mailRate) >= fareToFly(lane, fareRate),
    );
    return flyable.length === 0 || covered ? [] : [id];
  });
}
