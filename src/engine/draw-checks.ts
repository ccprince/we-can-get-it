import { within, type ContentSet } from './content';
import type { DrawnGalaxy } from './galaxy';

/**
 * A stage of the draw's cascade that a failed check re-rolls (ADR 0008
 * decision 2). Named as the failure report names it. The map is one stage for
 * now; kinds, goods and people are #33's, and each becomes a member here.
 */
export type Stage = 'motif selection';

/**
 * One check of the **draw-time pass**, over the galaxy as drawn rather than the
 * content set as written (ADR 0008 decision 16). A check says which stage its
 * failure re-rolls — the narrowest that could fix it (decision 17) — and the
 * pass needs to know nothing else about it.
 */
export type DrawCheck = {
  readonly stage: Stage;
  /** What the check is, as the failure report names it. */
  readonly check: string;
  /** Where in the content set the invariant it enforces is declared. */
  readonly where: string;
  /** Null when the galaxy passes; otherwise how it missed. */
  readonly miss: (galaxy: DrawnGalaxy, content: ContentSet) => string | null;
};

/**
 * Every check the pass runs. A check registers by being listed here, so the
 * topology checks (#45) and the substance checks (#27) add entries and never
 * edit the pass.
 */
export const drawChecks: readonly DrawCheck[] = [
  {
    // A property of the assembly, and its miss re-rolls the motif selection,
    // since nothing downstream has happened yet (ADR 0008 decision 8).
    stage: 'motif selection',
    check: 'the location-count range',
    where: 'drawParameters.locationCount',
    miss: (galaxy, content) => {
      const range = content.drawParameters.locationCount;
      const placed = galaxy.locations.length;
      return within(placed, range)
        ? null
        : `it placed ${placed} location${placed === 1 ? '' : 's'}, and the content set declared ` +
            `${range.least} to ${range.most}`;
    },
  },
];
