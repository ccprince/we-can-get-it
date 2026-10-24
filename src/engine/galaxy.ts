import type { Lane, Location } from './content';

/**
 * The **drawn galaxy**: what the **draw** produced, and the whole of the galaxy
 * as far as the fiction is concerned (ADR 0008 decision 4). A location the
 * **reserve** holds and the draw did not place is **hidden**, and leaves no
 * trace in here at all.
 *
 * It is campaign state rather than a read of the content set because it is
 * rolled per campaign from the seed: the content set holds the reserve, and
 * this holds the part of it this campaign sees.
 */
export type DrawnGalaxy = {
  /** The locations placed, in the order the draw placed them. */
  readonly locations: readonly Location[];
  /** Every lane in the galaxy: a motif's own lanes, and the ones joining motifs. */
  readonly lanes: readonly Lane[];
  /** Where the campaign opens, which is a location the draw placed. */
  readonly startId: string;
  /** Which **motif** each placed location belongs to (ADR 0008 decision 6). */
  readonly motifs: readonly PlacedMotif[];
};

/**
 * A **motif** as this campaign placed it: which motif was drawn, and the
 * locations drawn into its **slots**, in slot order. A motif may be placed more
 * than once, so this is an instance and not the motif (ADR 0008 decision 7).
 */
export type PlacedMotif = {
  readonly motifId: string;
  readonly locationIds: readonly string[];
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
