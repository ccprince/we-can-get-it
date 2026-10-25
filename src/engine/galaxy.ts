import type { Buyer, Good, Lane, Location } from './content';

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
