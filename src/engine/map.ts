import type { Lane, Ship } from './content';
import type { DrawnGalaxy } from './galaxy';

/**
 * The rules of the map: what a **lane** costs this ship in days and in
 * **fare**, and whether its **range** reaches at all.
 *
 * All three are derived from the one authored number a lane carries, its
 * **distance** (ADR 0006 decision 8), and all three live here rather than in
 * the view, which only words what it is handed (ADR 0003 decision 4). The
 * chart is the surface that shows them converted (decision 20).
 */

/** `ceil(distance / speed)`, never fewer than one day (ADR 0006 decisions 6, 9). */
export function daysToFly(lane: Lane, ship: Ship): number {
  return Math.max(1, Math.ceil(lane.distance / ship.speed));
}

/**
 * The distance times one galaxy-wide rate (ADR 0006 decision 10). Both are
 * whole numbers the content set declares, so the fare lands on an integer
 * without a rounding rule to state (ADR 0009 decision 3).
 */
export function fareToFly(lane: Lane, fareRate: number): number {
  return lane.distance * fareRate;
}

/**
 * **Range** is the largest distance the ship can fly in one **leg**, and a
 * lane beyond it cannot be flown at any price: it is the only gate on the map
 * (ADR 0006 decision 14).
 */
export function withinRange(lane: Lane, ship: Ship): boolean {
  return lane.distance <= ship.range;
}

/**
 * Where a lane leads from one of its ends. A lane is symmetric, so the end the
 * player is not at is the destination (ADR 0006 decision 7); a lane that does
 * not touch the location leads nowhere from it.
 */
export function otherEnd(lane: Lane, locationId: string): string | null {
  const [from, to] = lane.ends;
  if (from === locationId) return to;
  if (to === locationId) return from;
  return null;
}

/** The lane joining two locations, which is the only way between them. */
export function laneBetween(
  galaxy: Pick<DrawnGalaxy, 'lanes'>,
  locationId: string,
  toId: string,
): Lane | undefined {
  return galaxy.lanes.find((lane) => otherEnd(lane, locationId) === toId);
}

/**
 * The locations one lane within this **range** leads to from a location. A
 * lane beyond range is a wall and leads nowhere (ADR 0006 decision 14).
 */
export function flyableFrom(
  galaxy: Pick<DrawnGalaxy, 'lanes'>,
  locationId: string,
  range: number,
): readonly string[] {
  return galaxy.lanes.flatMap((lane) => {
    const there = otherEnd(lane, locationId);
    return there !== null && lane.distance <= range ? [there] : [];
  });
}

/**
 * The locations a ship of this **range** can fly to from one location, by any
 * number of lanes, the location itself included.
 */
export function reachableFrom(
  galaxy: Pick<DrawnGalaxy, 'lanes'>,
  locationId: string,
  range: number,
): ReadonlySet<string> {
  const reached = new Set([locationId]);
  const frontier = [locationId];
  for (let here = frontier.pop(); here !== undefined; here = frontier.pop()) {
    for (const there of flyableFrom(galaxy, here, range)) {
      if (!reached.has(there)) {
        reached.add(there);
        frontier.push(there);
      }
    }
  }
  return reached;
}
