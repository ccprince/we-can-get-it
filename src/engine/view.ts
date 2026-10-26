import { dateOf, type CalendarDate } from './calendar';
import type { Campaign, DigestEntry } from './campaign';
import { departureTo, offeredCommands, type Command } from './commands';
import type { Archetype, Lane, Want } from './content';
import { goodNamed, locationNamed, personNamed, type DrawnGalaxy } from './galaxy';
import { sightingHere, wordCorrection, type Sighting } from './knowledge';
import { daysToFly, fareToFly, otherEnd, withinRange } from './map';
import { matchOf, type Tier } from './match';
import { mostYouCanSell, openWants, peopleHere, type OpenWant } from './selling';
import { holdUsed, lotsHere, mostYouCanBuy } from './trade';

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
  /** What the shop here has on sale, in good-id order. Empty when it has nothing. */
  readonly lots: readonly LotView[];
  /**
   * The people standing here, in id order: derived order, from the draw (ADR
   * 0009 decision 3). The draw may have hidden any of them.
   */
  readonly people: readonly PersonView[];
};

/** Someone standing here, and what they are after. */
export type PersonView = {
  readonly name: string;
  /** In **want order**: a good before a conjunction, each by what it asks for. */
  readonly wants: readonly WantView[];
};

/**
 * One want, said plainly, and what each good in the hold would earn against it.
 * The tier is derived and shown **before** the player commits, so the gap
 * between acceptable and great is something to aim at (#15).
 */
export type WantView = {
  /** What a sale names the want by. */
  readonly want: string;
  /** Units the buyer will still take. */
  readonly wanted: number;
  readonly wording: string;
  /** One line a good aboard, in the order each first came aboard. */
  readonly matches: readonly MatchView[];
};

export type MatchView = {
  readonly good: string;
  readonly tier: Tier;
  /**
   * The tag of the first positive term the good fails; null unless grudging.
   * The engine says which term, a surface says it in the buyer's words.
   */
  readonly failedTerm: string | null;
  /** Credits for one unit; null when refused, which is not paid for. */
  readonly offer: number | null;
  /** The buyer's own words for turning the good down; null unless refused. */
  readonly reason: string | null;
  /**
   * What a sale of this good against the want names: the command is this and
   * the units the player chooses. Handed over even when refused, so the player
   * hears the buyer's reason from the engine rather than never being offered
   * the chance (the way a buy the engine would refuse is).
   */
  readonly sale: { readonly want: string; readonly good: string };
  /**
   * The most units the player could sell now: the fewer of what the hold
   * carries and what the buyer still takes, and none when refused.
   */
  readonly mostYouCanSell: number;
};

/**
 * One **lot** on sale where the player is: the good, how many units are left,
 * and what one costs, in credits. The price is computed from the good's
 * **worth**, the location and the lot's stock, and is never authored (#14).
 */
export type LotView = {
  /** What a command names the lot by. */
  readonly lot: string;
  readonly good: string;
  /** The good's **kind**, which is public vocabulary (ADR 0007 decision 3). */
  readonly kind: string;
  readonly quantity: number;
  readonly price: number;
  /**
   * The most units the player could buy now: the fewest of what the lot holds,
   * what the **hold** has room for, and what the credits cover. The same
   * reading a buy is refused by, so the shop never offers what would be refused.
   */
  readonly mostYouCanBuy: number;
};

/**
 * The **hold**, which is a real constraint and not an advisory number: a buy
 * the room will not take is refused. One unit of any good is one unit of hold.
 */
export type HoldView = {
  readonly capacity: number;
  readonly used: number;
  /** One line a good, in the order each first came aboard. */
  readonly cargo: readonly CargoView[];
};

export type CargoView = {
  readonly good: string;
  readonly kind: string;
  readonly quantity: number;
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
 * The **trade guide**: every drawn location, in placement order, with its
 * **standing character** published from day one and what the player has seen of
 * it held as last known (ADR 0006 decision 17). A location is on it whether or
 * not it has been visited, and nothing is filtered for relevance.
 */
export type GuideView = {
  readonly entries: readonly GuideEntryView[];
};

export type GuideEntryView = {
  readonly name: string;
  /** Published, in the vocabulary of **kind**, and nothing more specific. */
  readonly standing: StandingView;
  /** What the player has seen of it, or null until they have been there. */
  readonly known: KnownView | null;
};

/** The **kinds** a location supplies and demands: where to start looking. */
export type StandingView = {
  readonly supplies: readonly string[];
  readonly demands: readonly string[];
};

/**
 * What the player has seen of a location, as of a date. The place the player
 * stands in is read as of today, so `daysAgo` is the age of the knowledge: zero
 * only for a place being looked at now.
 */
export type KnownView = {
  readonly asOf: CalendarDate;
  readonly daysAgo: number;
  /** In good-id order. */
  readonly lots: readonly KnownLotView[];
  /** In id order. */
  readonly people: readonly KnownPersonView[];
  /** What the landing that last updated this found different; in lots, then people. */
  readonly corrections: readonly CorrectionView[];
};

export type KnownLotView = {
  readonly good: string;
  readonly kind: string;
  readonly quantity: number;
  readonly price: number;
  readonly asOf: CalendarDate;
};

export type KnownPersonView = {
  readonly name: string;
  /** Each want still open when seen, in want order, worded as it is where they stand. */
  readonly wants: readonly { readonly wording: string; readonly wanted: number }[];
  readonly asOf: CalendarDate;
};

/** A difference the landing found, worded: what it is now, and what it was. */
export type CorrectionView = {
  readonly text: string;
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
  readonly guide: GuideView;
  readonly today: TodayView;
  readonly credits: CreditsView;
  readonly hold: HoldView;
  readonly digest: DigestView | null;
  readonly menu: MenuView;
};

export function view(campaign: Campaign): View {
  const { calendar } = campaign.content;
  const galaxy = campaign.galaxy;
  const where = campaign.where;

  return {
    here: where.kind === 'at' ? hereAt(campaign, where.locationId) : null,
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
    guide: guideFor(campaign),
    today: { day: campaign.day, date: dateOf(calendar, campaign.day) },
    credits: { credits: campaign.credits },
    hold: holdFor(campaign),
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

function guideFor(campaign: Campaign): GuideView {
  return {
    entries: campaign.galaxy.locations.map((location) => {
      const archetype = campaign.content.archetypes.find(({ id }) => id === location.archetype);
      return {
        name: location.name,
        standing: standingOf(archetype),
        known: knownAbout(campaign, location.id),
      };
    }),
  };
}

/** The loader refuses a location naming an archetype it does not enumerate. */
function standingOf(archetype: Archetype | undefined): StandingView {
  if (archetype === undefined) throw new Error('a location names an archetype nobody declared');
  return { supplies: archetype.supplies, demands: archetype.demands };
}

/**
 * What is held of a location. The one the player stands in is read afresh, so
 * that it never shows the shop as it was before the player's own trades; the
 * corrections the landing found stay with it.
 */
function knownAbout(campaign: Campaign, locationId: string): KnownView | null {
  const held = campaign.known.find((each) => each.locationId === locationId);
  if (held === undefined) return null;
  const here = campaign.where.kind === 'at' && campaign.where.locationId === locationId;
  return knownView(campaign, here ? sightingHere(campaign, held.corrections) : held);
}

function knownView(campaign: Campaign, sighting: Sighting): KnownView {
  const { galaxy, content } = campaign;
  const asOf = dateOf(content.calendar, sighting.asOf);
  return {
    asOf,
    daysAgo: campaign.day - sighting.asOf,
    lots: sighting.lots.map((lot) => ({
      ...goodAndKind(galaxy, lot.goodId),
      quantity: lot.quantity,
      price: lot.price,
      asOf,
    })),
    people: sighting.people.map(({ buyerId, wants }) => {
      const buyer = personNamed(galaxy, buyerId);
      return {
        name: buyer.name,
        wants: wants.map(({ at, remaining }) => {
          const want = buyer.wants[at];
          if (want === undefined) throw new Error(`${buyerId} has no want ${at}`);
          return { wording: wordingOf(galaxy, want), wanted: remaining };
        }),
        asOf,
      };
    }),
    corrections: sighting.corrections.map((each) => ({ text: wordCorrection(campaign, each) })),
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

function hereAt(campaign: Campaign, locationId: string): HereView {
  const { name, prose } = locationNamed(campaign.galaxy, locationId);
  const lots = lotsHere(campaign).map(
    (lot): LotView => ({
      lot: lot.id,
      ...goodAndKind(campaign.galaxy, lot.goodId),
      quantity: lot.quantity,
      price: lot.price,
      mostYouCanBuy: mostYouCanBuy(campaign, lot),
    }),
  );
  return { name, prose, lots, people: peopleAt(campaign) };
}

function peopleAt(campaign: Campaign): readonly PersonView[] {
  return peopleHere(campaign).map((buyer) => ({
    name: buyer.name,
    wants: openWants(campaign, buyer).map((open) => wantFor(campaign, open)),
  }));
}

function wantFor(campaign: Campaign, open: OpenWant): WantView {
  const { id, buyer, want, remaining } = open;
  const { galaxy, content } = campaign;
  return {
    want: id,
    wanted: remaining,
    wording: wordingOf(galaxy, want),
    matches: campaign.cargo.map(({ goodId, quantity }) => {
      const good = goodNamed(galaxy, goodId);
      const { tier, failedTerm, offer } = matchOf(want, buyer, good, content.offers);
      return {
        good: good.name,
        tier,
        failedTerm,
        offer,
        reason: tier === 'refused' ? buyer.refusalLine : null,
        sale: { want: id, good: goodId },
        mostYouCanSell: mostYouCanSell(open, quantity, offer),
      };
    }),
  };
}

/** A want as it is said: a good by its name, a predicate in the buyer's own words. */
function wordingOf(galaxy: DrawnGalaxy, want: Want): string {
  return 'goodId' in want ? `wants ${goodNamed(galaxy, want.goodId).name}` : want.plainly;
}

function holdFor(campaign: Campaign): HoldView {
  return {
    capacity: campaign.ship.hold,
    used: holdUsed(campaign.cargo),
    cargo: campaign.cargo.map(({ goodId, quantity }) => ({
      ...goodAndKind(campaign.galaxy, goodId),
      quantity,
    })),
  };
}

/** A good as a surface names it: its name, and its **kind**, which is public. */
function goodAndKind(galaxy: DrawnGalaxy, goodId: string): Pick<CargoView, 'good' | 'kind'> {
  const { name, kind } = goodNamed(galaxy, goodId);
  return { good: name, kind };
}
