import type { Buyer, Good, Lane, Location, Shape } from './content';
import type { Point } from './layout';

/**
 * The **drawn galaxy**: what the **draw** produced, and the whole of the galaxy
 * as far as the fiction is concerned (ADR 0008 decision 4). A location, kind,
 * good or person the **reserve** holds and the draw did not take is
 * **hidden**, and leaves no trace in here at all.
 *
 * It is campaign state rather than a read of the content set because it is
 * rolled per campaign from the seed: the content set holds the reserve, and
 * this holds the part of it this campaign sees.
 */
export type DrawnGalaxy = {
  /** The locations placed, in the order the draw placed them. */
  readonly locations: readonly Location[];
  /**
   * The motifs the map was assembled from, in placement order, and which
   * location filled each slot. A motif invariant is read off this rather than
   * guessed from the lanes, since "at least one chokepoint" is a property of
   * the assembly and not of the graph (ADR 0006 decision 3).
   */
  readonly motifs: readonly PlacedMotif[];
  /** Every lane in the galaxy, whoever laid it down. */
  readonly lanes: readonly Lane[];
  /** Where the campaign opens, which is a location the draw placed. */
  readonly startId: string;
  /** The **kinds** in circulation, in id order. A kind not among them is hidden. */
  readonly kinds: readonly string[];
  /** The **goods** drawn, in id order: none of a kind out of circulation. */
  readonly goods: readonly Good[];
  /** The people drawn, in id order, each standing at a drawn location. */
  readonly people: readonly Buyer[];
  /**
   * The goods the goods pass rolled hidden and then **drew back**, and what
   * for: kind by kind, those wanted by name and those for the floor, in id
   * order together; then the role tags' tag by tag. They are why fewer goods
   * are hidden than the declared rate (ADR 0008 decision 11). Every one is a
   * drawn good, so nothing hidden leaves a trace here. Read by the
   * cross-product report and by nothing else.
   */
  readonly drawnBack: readonly DrawnBack[];
  /**
   * Each drawn location's **layout coordinates**, by location id: the chart's,
   * and read by nothing else (ADR 0011 decision 7). Rebuilt from the seed with
   * the rest of the galaxy and never saved.
   */
  readonly layout: ReadonlyMap<string, Point>;
};

/**
 * A good the goods pass drew back: because a buyer wants it by name, or to
 * keep the floor of a kind, or the least of a role tag.
 */
export type DrawnBack =
  | { readonly good: string; readonly wantedBy: string }
  | { readonly good: string; readonly floor: string }
  | { readonly good: string; readonly roleTag: string };

/**
 * A motif as placed. One motif may be placed twice, filled by different
 * locations (ADR 0008 decision 7), so this is an instance and not the motif.
 */
export type PlacedMotif = {
  /** The id of the motif placed. */
  readonly motif: string;
  readonly shape: Shape;
  /** Each slot and the location that filled it, in slot id order. */
  readonly slots: readonly { readonly slot: string; readonly location: string }[];
};

/**
 * The location an id names. Every location id in a campaign names a location
 * the **draw** placed — the draw is where ids come from — so this is total for
 * any galaxy the draw produced.
 */
export function locationNamed(
  galaxy: Pick<DrawnGalaxy, 'locations'>,
  locationId: string,
): Location {
  const location = galaxy.locations.find((candidate) => candidate.id === locationId);
  if (location === undefined) {
    throw new Error(`${locationId} is not a location the drawn galaxy holds`);
  }
  return location;
}

/**
 * The good an id names. Every good id in a campaign names a good the **draw**
 * kept — a lot is only ever stocked from those — so this is total for any
 * galaxy the draw produced.
 */
export function goodNamed(galaxy: Pick<DrawnGalaxy, 'goods'>, goodId: string): Good {
  const good = galaxy.goods.find((candidate) => candidate.id === goodId);
  if (good === undefined) throw new Error(`${goodId} is not a good the drawn galaxy holds`);
  return good;
}

/**
 * The person an id names. Every buyer id in a campaign names a person the
 * **draw** kept, so this is total for any galaxy the draw produced.
 */
export function personNamed(galaxy: Pick<DrawnGalaxy, 'people'>, buyerId: string): Buyer {
  const buyer = galaxy.people.find((candidate) => candidate.id === buyerId);
  if (buyer === undefined) throw new Error(`${buyerId} is not a person the drawn galaxy holds`);
  return buyer;
}
