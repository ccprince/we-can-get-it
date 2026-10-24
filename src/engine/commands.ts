import type { Campaign, DigestEntry, Leg, Whereabouts } from './campaign';
import { locationNamed, type DrawnGalaxy } from './galaxy';
import { daysToFly, fareToFly, laneBetween, withinRange } from './map';

/**
 * A command is one entry in the engine's deterministic input log: the engine is
 * deterministic for a given content set, seed and **command sequence**
 * (ADR 0003 decision 1, ADR 0005 decision 19). Every **action** is a command,
 * and so is buying a lot, which is not an action.
 */
export type Command =
  | { readonly kind: 'wait' }
  /** Fly the lane from where the player is to the location named. */
  | { readonly kind: 'depart'; readonly toId: string };

/**
 * Why a command was refused. A rejected command is a read the player gets, not
 * an exception, and it leaves the campaign untouched: no exceptions for player
 * error.
 */
export type Reason = {
  readonly code:
    | 'not-a-command'
    | 'no-such-lane'
    | 'beyond-range'
    | 'already-underway'
    | 'cannot-afford-the-fare';
  readonly message: string;
};

export type CommandResult = { readonly campaign: Campaign } | { readonly rejected: Reason };

export function isRejected(result: CommandResult): result is { readonly rejected: Reason } {
  return 'rejected' in result;
}

/**
 * What the player may do that is not a departure. Where the player is supplies
 * the menu (ADR 0005 decision 5), and both of the places there are — a
 * location, and **transit** with its thin menu — so far offer only ending the
 * day, so the answer does not yet vary and this takes no campaign.
 *
 * **Departures are on the chart, not here.** The chart is the surface that
 * holds a lane's days, fare, whether range reaches and where it leads
 * (ADR 0006 decision 20), which is everything a departure has to be read
 * against, and a second copy of them in the menu would be a second place for
 * what is offered to drift from what is accepted. Both the chart's offer and
 * this module's refusal go through `departureTo` below, which is the one reading
 * of the rules.
 */
export function offeredCommands(): readonly Command[] {
  return [{ kind: 'wait' }];
}

/**
 * A departure as the chart quotes it: the **leg** it would fly, and the
 * **fare** quoted before departure (ADR 0006 decision 10).
 */
export type Departure = {
  readonly leg: Leg;
  readonly fare: number;
};

/**
 * The departure a lane from here would be, or the reason there is none. The
 * chart offers a departure exactly where this answers with one, and
 * `takeCommand` refuses exactly where it answers with a reason — so what is
 * shown and what is accepted are one reading.
 *
 * Affordability is deliberately **not** part of it: **range** is the only gate
 * on the map (ADR 0006 decision 14), so a lane the player cannot currently pay
 * for is still a lane on the chart and is refused at the moment of departure.
 */
export function departureTo(
  campaign: Campaign,
  toId: string,
): { readonly departure: Departure } | { readonly rejected: Reason } {
  if (campaign.where.kind === 'in-transit') {
    return {
      rejected: {
        code: 'already-underway',
        message: 'You are underway, and a destination cannot be changed in transit.',
      },
    };
  }

  const from = campaign.where.locationId;
  const lane = laneBetween(campaign.galaxy, from, toId);
  if (lane === undefined) {
    return {
      rejected: {
        code: 'no-such-lane',
        message: 'No lane runs from here to there, and travel is along lanes and nowhere else.',
      },
    };
  }

  if (!withinRange(lane, campaign.ship)) {
    return {
      rejected: {
        code: 'beyond-range',
        message: 'That lane is beyond your range, and no fare will buy it.',
      },
    };
  }

  return {
    departure: {
      leg: { fromId: from, toId, days: daysToFly(lane, campaign.ship), daysFlown: 0 },
      fare: fareToFly(lane, campaign.content.fareRate),
    },
  };
}

export function takeCommand(campaign: Campaign, command: Command): CommandResult {
  if (!isCommand(command)) {
    return { rejected: { code: 'not-a-command', message: 'That is not a command.' } };
  }

  switch (command.kind) {
    // Waiting is ending the day, chosen one day at a time (ADR 0005 d7).
    case 'wait':
      return { campaign: endTheDay(campaign) };

    case 'depart':
      return depart(campaign, command.toId);
  }
}

/**
 * Whether what arrived is a command at all. A command sequence reaches the
 * engine from a save as well as from the page (ADR 0009 decision 11), so the
 * static type is a claim about the caller rather than a guarantee about the
 * value. A command that exists but is not available where the player is — a
 * departure along a lane that is not there, or one taken in **transit** — is a
 * different refusal, and `departureTo` gives it its own reason.
 */
function isCommand(command: Command): boolean {
  const candidate: unknown = command;
  if (typeof candidate !== 'object' || candidate === null) return false;
  const kind = (candidate as { kind?: unknown }).kind;
  if (kind === 'wait') return true;
  return kind === 'depart' && typeof (candidate as { toId?: unknown }).toId === 'string';
}

/**
 * The fare is quoted before departure and **paid at departure**, so nothing
 * ever accrues against the player and a journey underway charges nothing more
 * (ADR 0006 decision 10). A fare the player cannot pay is refused rather than
 * borrowed: there is no loan in this game (ADR 0005 decision 14), and **mail**
 * is the floor under being broke (#18).
 *
 * Departing spends the day it is taken on, which is the first of the leg's
 * days: time is what the player spends on people and on distance (ADR 0005
 * decision 6), and a **gate** is an on-ramp rather than a teleport (ADR 0006
 * decision 11).
 */
function depart(campaign: Campaign, toId: string): CommandResult {
  const quoted = departureTo(campaign, toId);
  if ('rejected' in quoted) return { rejected: quoted.rejected };

  const { leg, fare } = quoted.departure;
  if (campaign.credits < fare) {
    return {
      rejected: {
        code: 'cannot-afford-the-fare',
        message: `The fare is ${fare} credits, and you have ${campaign.credits}.`,
      },
    };
  }

  return {
    campaign: endTheDay({
      ...campaign,
      credits: campaign.credits - fare,
      where: { kind: 'in-transit', leg },
    }),
  };
}

function endTheDay(campaign: Campaign): Campaign {
  const ended = dayEnds(campaign);
  return {
    ...campaign,
    day: campaign.day + 1,
    where: ended.where,
    // One digest, at every day boundary, whose content varies by where the
    // player is (ADR 0005 decision 8). Beyond a landing nothing reaches them
    // yet: the change budget is out of scope for this milestone.
    digest: { day: campaign.day, entries: ended.entries },
  };
}

/**
 * What the day boundary does to where the player is, and what it hands the
 * digest.
 *
 * **Transit is a place, played day by day** (ADR 0005 decision 10): a day of a
 * **leg** is spent at every boundary, and the leg ends by landing rather than
 * by a separate arrival step. The player is **out of contact** while it runs,
 * so the span arrives all at once on the day they set down (decisions 8 and
 * 11).
 */
function dayEnds(campaign: Campaign): {
  readonly where: Whereabouts;
  readonly entries: readonly DigestEntry[];
} {
  if (campaign.where.kind === 'at') return { where: campaign.where, entries: [] };

  const leg: Leg = { ...campaign.where.leg, daysFlown: campaign.where.leg.daysFlown + 1 };
  if (leg.daysFlown < leg.days) {
    return { where: { kind: 'in-transit', leg }, entries: [] };
  }

  return {
    where: { kind: 'at', locationId: leg.toId },
    entries: [{ text: spanOf(campaign.galaxy, leg) }],
  };
}

/** The leg, as the arrival digest states it: the days it took and its two ends. */
function spanOf(galaxy: DrawnGalaxy, leg: Leg): string {
  const from = locationNamed(galaxy, leg.fromId).name;
  const to = locationNamed(galaxy, leg.toId).name;
  const days = leg.days === 1 ? '1 day' : `${leg.days} days`;
  return `${days} out of ${from}, you set down at ${to}.`;
}
