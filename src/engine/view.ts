import { dateOf, type CalendarDate } from './calendar';
import type { Campaign, DigestEntry } from './campaign';
import { offeredCommands, type Command } from './commands';
import type { Lane, Location } from './content';
import { daysToFly, fareToFly, otherEnd, withinRange } from './map';

/**
 * Every surface renders a read model handed to it by one engine query, and the
 * view holds only view state (ADR 0009 decision 10). A read model carries
 * converted, player-facing values: if a surface needs a number, the query
 * returns that number.
 *
 * The page and the harness's policy receive this same object, which is what
 * makes what is measured what a player could have seen.
 */

/** Where the player is. */
export type HereView = {
  readonly name: string;
  readonly prose: string;
};

/** The day, as an index the engine counts in and the date the player reads. */
export type TodayView = {
  readonly day: number;
  readonly date: CalendarDate;
};

export type CreditsView = {
  readonly credits: number;
};

export type DigestView = {
  readonly day: number;
  readonly date: CalendarDate;
  readonly entries: readonly DigestEntry[];
};

/**
 * One **lane** as the chart shows it: the numbers already converted for this
 * ship, never the raw **distance** (ADR 0006 decision 20).
 */
export type LaneView = {
  /** The two locations it joins, named, in the order the content set wrote them. */
  readonly ends: readonly [string, string];
  /**
   * Where it would take the player from where they are, or null when it does
   * not leave from here. A lane is symmetric, so this is simply its other end
   * (ADR 0006 decision 7).
   */
  readonly destination: string | null;
  /** Days for this ship: `ceil(distance / speed)`, floored at one. */
  readonly days: number;
  /** The fare in credits, quoted before departure (ADR 0006 decision 10). */
  readonly fare: number;
  /** Whether this ship's range reaches it at all. */
  readonly withinRange: boolean;
};

/**
 * The chart: which locations exist, what lanes join them and what each costs,
 * which are published facts from day one (ADR 0006 decision 5) — so it carries
 * every lane in the galaxy and not only the ones that leave from here.
 */
export type ChartView = {
  readonly lanes: readonly LaneView[];
};

/**
 * What is on offer, which is determined entirely by where the player is
 * (ADR 0005 decision 5). The commands, not their wording: the view words what
 * the engine returns (ADR 0003 decision 4).
 */
export type MenuView = {
  readonly offered: readonly Command[];
};

export type View = {
  readonly here: HereView;
  readonly chart: ChartView;
  readonly today: TodayView;
  readonly credits: CreditsView;
  readonly digest: DigestView | null;
  readonly menu: MenuView;
};

export function view(campaign: Campaign): View {
  const { calendar, locations } = campaign.content;
  const here = locations.find((location) => location.id === campaign.locationId);
  if (here === undefined) {
    throw new Error(
      `the campaign is at ${campaign.locationId}, which the content set does not hold`,
    );
  }

  return {
    here: { name: here.name, prose: here.prose },
    chart: chartFor(campaign),
    today: { day: campaign.day, date: dateOf(calendar, campaign.day) },
    credits: { credits: campaign.credits },
    digest:
      campaign.digest === null
        ? null
        : {
            day: campaign.digest.day,
            date: dateOf(calendar, campaign.digest.day),
            entries: campaign.digest.entries,
          },
    menu: { offered: offeredCommands() },
  };
}

function chartFor(campaign: Campaign): ChartView {
  const { lanes, locations, fareRate } = campaign.content;
  return {
    lanes: lanes.map((lane) => laneFor(lane, campaign, locations, fareRate)),
  };
}

function laneFor(
  lane: Lane,
  campaign: Campaign,
  locations: readonly Location[],
  fareRate: number,
): LaneView {
  const destination = otherEnd(lane, campaign.locationId);
  return {
    ends: [nameOf(locations, lane.ends[0]), nameOf(locations, lane.ends[1])],
    destination: destination === null ? null : nameOf(locations, destination),
    days: daysToFly(lane, campaign.ship),
    fare: fareToFly(lane, fareRate),
    withinRange: withinRange(lane, campaign.ship),
  };
}

/** Every lane end names a location the loader has already checked exists. */
function nameOf(locations: readonly Location[], locationId: string): string {
  const location = locations.find((candidate) => candidate.id === locationId);
  if (location === undefined) {
    throw new Error(`the chart names ${locationId}, which the content set does not hold`);
  }
  return location.name;
}
