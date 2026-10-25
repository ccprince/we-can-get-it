import type { StartHub } from './content';
import { locationNamed, type DrawnGalaxy } from './galaxy';
import { otherEnd } from './map';

/**
 * What a drawn place is as a start: its archetype, how many places a ship of
 * baseline range can fly to from it in one lane, and how many of those a
 * **spur** placed. Read the same way by the assembly, which picks the start,
 * and by the check, which holds it to the guarantee (ADR 0006 decision 16).
 */
export type AsAStart = {
  readonly archetype: string;
  readonly neighbours: number;
  readonly spurs: number;
};

export function asAStart(
  galaxy: Pick<DrawnGalaxy, 'locations' | 'lanes' | 'motifs'>,
  locationId: string,
  range: number,
): AsAStart {
  const inASpur = new Set(
    galaxy.motifs
      .filter((placed) => placed.shape === 'spur')
      .flatMap((placed) => placed.slots.map(({ location }) => location)),
  );
  const neighbours = galaxy.lanes.flatMap((lane) => {
    const there = otherEnd(lane, locationId);
    return there !== null && lane.distance <= range ? [there] : [];
  });
  return {
    archetype: locationNamed(galaxy, locationId).archetype,
    neighbours: neighbours.length,
    spurs: neighbours.filter((there) => inASpur.has(there)).length,
  };
}

/**
 * Whether a place may open the campaign: a market hub with three or more
 * neighbours inside baseline range, at least one of them a spur — every one of
 * those words a number or a name the content set declares (ADR 0007
 * decision 15). A start on a spur makes the first decision "fly out, or fly
 * out", and leaves the **outbound fill** unavailable until the player has
 * already learned the game.
 */
export function mayOpen(place: AsAStart, hub: StartHub): boolean {
  return (
    (hub.archetype === null || place.archetype === hub.archetype) &&
    place.neighbours >= hub.neighbours &&
    place.spurs >= hub.spurs
  );
}
