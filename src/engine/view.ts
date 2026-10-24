import { dateOf, type CalendarDate } from './calendar';
import type { Campaign, DigestEntry } from './campaign';
import { departureTo, offeredCommands, type Command } from './commands';
import type { Lane } from './content';
import { locationNamed, type DrawnGalaxy } from './galaxy';
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

/** Where the player is, when that is a **location**. Null in **transit**. */
export type HereView = {
  readonly name: string;
  readonly prose: string;
};

/**
 * Where the player is, when that is **transit** between two locations. Transit
 * is a place like any other for the purposes of a day, and the crossing is
 * played day by day rather than skipped (ADR 0005 decision 10).
 *
 * The days are converted for the player: how long they have been out, and how
 * much of the **leg** is left to run.
 */
export type TransitView = {
  readonly from: string;
  readonly destination: string;
  readonly daysOut: number;
  readonly daysToRun: number;
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
  /**
   * The two locations it joins, named. A motif's own lane holds them in the
   * order of the slot ids they fill; a lane joining two motifs holds the earlier
   * placement's end first. Derived order, as on the chart (ADR 0009 decision 3).
   */
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
  /**
   * The command that departs along it from here, or null when it is not a
   * departure the player can take: a lane that does not leave from here, one
   * beyond **range**, or any lane at all while underway.
   */
  readonly depart: Command | null;
};

/**
 * One **location** as the chart shows it: what is published about a place,
 * which for now is its name. A published fact about a place joins as a field
 * here when the canon publishes it, rather than as a second list of the same
 * places.
 */
export type LocationView = {
  readonly name: string;
};

/**
 * The chart: which locations exist, what lanes join them and what each costs,
 * which are published facts from day one (ADR 0006 decision 5) — so it carries
 * every lane in the **drawn galaxy** and not only the ones that leave from
 * here. What the draw did not place is **hidden** and is not on the chart at
 * all, greyed or otherwise (ADR 0008 decision 4).
 */
export type ChartView = {
  /**
   * Every location the draw placed, whether or not a lane touches it: the
   * chart says which places exist on its own account, not as whatever happens
   * to sit at the end of a lane. In **placement order**: motif by motif as the
   * draw placed them, and within each motif in the order of its slot ids.
   * That is derived order, from the seed and the content set alone; sorting it
   * for display is the view's (ADR 0009 decisions 3 and 10).
   */
  readonly locations: readonly LocationView[];
  /**
   * In the order the draw laid them: each placed motif's own lanes, motif by
   * motif, then the lanes joining the motifs. Derived order, as above.
   */
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
  /** Exactly one of these two is null: the player is in one place or the other. */
  readonly here: HereView | null;
  readonly transit: TransitView | null;
  readonly chart: ChartView;
  readonly today: TodayView;
  readonly credits: CreditsView;
  readonly digest: DigestView | null;
  readonly menu: MenuView;
};

export function view(campaign: Campaign): View {
  const { calendar } = campaign.content;
  const galaxy = campaign.galaxy;
  const where = campaign.where;

  return {
    here: where.kind === 'at' ? hereAt(galaxy, where.locationId) : null,
    transit:
      where.kind === 'in-transit'
        ? {
            from: nameOf(galaxy, where.leg.fromId),
            destination: nameOf(galaxy, where.leg.toId),
            daysOut: where.leg.daysFlown,
            daysToRun: where.leg.days - where.leg.daysFlown,
          }
        : null,
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
  return {
    locations: campaign.galaxy.locations.map(({ name }) => ({ name })),
    lanes: campaign.galaxy.lanes.map((lane) => laneFor(lane, campaign)),
  };
}

function laneFor(lane: Lane, campaign: Campaign): LaneView {
  const { fareRate } = campaign.content;
  const galaxy = campaign.galaxy;

  // In transit there is no "from here": the destination is fixed and no lane
  // on the chart is a departure (ADR 0005 decision 10).
  const destination =
    campaign.where.kind === 'at' ? otherEnd(lane, campaign.where.locationId) : null;

  return {
    ends: [nameOf(galaxy, lane.ends[0]), nameOf(galaxy, lane.ends[1])],
    destination: destination === null ? null : nameOf(galaxy, destination),
    days: daysToFly(lane, campaign.ship),
    fare: fareToFly(lane, fareRate),
    withinRange: withinRange(lane, campaign.ship),
    depart: destination === null ? null : departFor(campaign, destination),
  };
}

/**
 * The departure along this lane, or null when the rules refuse it — the same
 * reading `takeCommand` makes, so the chart cannot offer what the engine would
 * not take (`departureTo`).
 */
function departFor(campaign: Campaign, toId: string): Command | null {
  return 'rejected' in departureTo(campaign, toId) ? null : { kind: 'depart', toId };
}

/** Every location id in a read model names a location the draw placed. */
function nameOf(galaxy: DrawnGalaxy, locationId: string): string {
  return locationNamed(galaxy, locationId).name;
}

function hereAt(galaxy: DrawnGalaxy, locationId: string): HereView {
  const { name, prose } = locationNamed(galaxy, locationId);
  return { name, prose };
}
