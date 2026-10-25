import type { StartHub } from './content';
import { locationNamed, type DrawnGalaxy } from './galaxy';
import { flyableFrom } from './map';

/**
 * A drawn location read as a start: its archetype, how many locations a ship
 * of baseline range can fly to from it in one lane, and how many of those are
 * a **spur**'s dead end. Read the same way by the assembly, which picks the
 * start, and by the check, which holds it to the guarantee (ADR 0006
 * decision 16).
 */
export type StartReading = {
  readonly archetype: string;
  readonly neighbours: number;
  readonly spurs: number;
};

/**
 * A neighbour counts as a spur when a motif of that shape placed it and it is
 * a dead end — one lane within range, the one back — since a spur is the shape
 * that must be flown out and back (ADR 0006 decision 3). The motif's other
 * locations are not: a neighbour that leads on is not a spur, whatever placed
 * it.
 *
 * Lanes are counted as neighbours one for one, which holds because the loader
 * refuses a second lane between one pair and inter-motif lanes join distinct
 * motifs.
 */
export function readAsStart(
  galaxy: Pick<DrawnGalaxy, 'locations' | 'lanes' | 'motifs'>,
  locationId: string,
  range: number,
): StartReading {
  const placedBySpurs = new Set(
    galaxy.motifs
      .filter((placed) => placed.shape === 'spur')
      .flatMap((placed) => placed.slots.map(({ location }) => location)),
  );
  const neighbours = flyableFrom(galaxy, locationId, range);
  return {
    archetype: locationNamed(galaxy, locationId).archetype,
    neighbours: neighbours.length,
    spurs: neighbours.filter(
      (there) => placedBySpurs.has(there) && flyableFrom(galaxy, there, range).length === 1,
    ).length,
  };
}

/**
 * Whether a location holds the **start-node guarantee** as the content set
 * declares it: of the archetype named, with at least so many neighbours inside
 * baseline range and at least so many of them spurs. The names and numbers are
 * the content set's (ADR 0007 decision 15).
 */
export function holdsStartHub(reading: StartReading, hub: StartHub): boolean {
  return (
    (hub.archetype === null || reading.archetype === hub.archetype) &&
    reading.neighbours >= hub.neighbours &&
    reading.spurs >= hub.spurs
  );
}
