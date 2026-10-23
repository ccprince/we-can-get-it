import type { Command, LaneView, View } from '../src/engine';
import type { RouteRule } from './config';

/**
 * A scripted policy, and the only way a policy drives the engine: it is handed
 * a view and it answers with a command (#6, ADR 0009 consequences).
 *
 * The signature is the whole point of the instrument. A policy receives exactly
 * the read models the page renders and nothing else — no campaign, no content
 * set, no privileged read of the galaxy — so what the harness measures is what a
 * player could have seen rather than a census of the content.
 */
export type Policy = {
  readonly name: string;
  readonly chooseCommand: (read: View) => Command;
};

/**
 * The **tourist**: it reads everything available and flies, without trading. It
 * is first so that the first curves measure exposure with no economic
 * competence mixed into them.
 *
 * Its reading is `harness/csv.ts`, which builds the day's row from every
 * surface the view carries; its choosing is below. It takes its departures from
 * the **chart** rather than naming a destination, so it can only ever fly what
 * where it is makes available (ADR 0005 decision 5, ADR 0006 decision 20) — and
 * it leaves a fare it cannot pay alone, because the engine refuses one and a
 * refused command would stop the run.
 *
 * **How it moves is a knob** (`RouteRule`), not a hardcode: what a player is
 * exposed to depends on how they move, so the route rule is a measurement input
 * a setting declares (#6, #9).
 */
export function touristTaking(route: RouteRule): Policy {
  return {
    name: 'tourist',
    chooseCommand(read) {
      const departure = departureFor(read, route);
      if (departure !== null) return departure;

      // In transit, and on a day with nowhere to go, the whole of the
      // itinerary is ending the day (ADR 0005 decision 7).
      const endTheDay = read.menu.offered.find((command) => command.kind === 'wait');
      if (endTheDay === undefined) {
        throw new Error('the tourist is somewhere that offers it no way to end the day');
      }
      return endTheDay;
    },
  };
}

/**
 * The departure the route rule picks, or null when there is none to pick: in
 * **transit** no lane is a departure, and a lane whose fare is beyond the
 * tourist's credits is one the engine would refuse.
 */
function departureFor(read: View, route: RouteRule): Command | null {
  if (route === 'stay') return null;

  const flyable = read.chart.lanes.filter(
    (lane) => lane.depart !== null && lane.fare <= read.credits.credits,
  );
  const chosen = flyable.reduce<LaneView | null>(
    (best, lane) => (best === null || prefers(route, lane, best) ? lane : best),
    null,
  );
  return chosen?.depart ?? null;
}

/** Fewest days or most, with the chart's own order breaking a tie. */
function prefers(route: RouteRule, lane: LaneView, best: LaneView): boolean {
  return route === 'nearest' ? lane.days < best.days : lane.days > best.days;
}
