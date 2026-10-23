import type { Command, View } from '../src/engine';

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
 * The **tourist**: it reads everything available and ends the day, without
 * trading. It is first so that the first curves measure exposure with no
 * economic competence mixed into them.
 *
 * Its reading is `harness/csv.ts`, which builds the day's row from every
 * surface the view carries; its choosing is this function, which takes its
 * command from the menu rather than naming one, so the tourist can only ever do
 * what where it is makes available (ADR 0005 decision 5). Departing along a
 * lane is what travel (#9) gives it; until then ending the day is the whole of
 * the itinerary.
 */
export const tourist: Policy = {
  name: 'tourist',
  chooseCommand(read) {
    const endTheDay = read.menu.offered.find((command) => command.kind === 'wait');
    if (endTheDay === undefined) {
      throw new Error('the tourist is somewhere that offers it no way to end the day');
    }
    return endTheDay;
  },
};
