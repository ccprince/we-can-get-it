import { within, type ContentSet } from './content';
import type { DrawnGalaxy } from './galaxy';
import type { Rng } from './rng';

/**
 * A stage of the draw's cascade that a missed invariant re-rolls (ADR 0008
 * decision 2), named as the failure report names it. A check names the stage
 * its miss re-rolls — the narrowest that could fix it (decision 17).
 */
export type Stage = 'motif selection' | 'kinds pass' | 'goods pass' | 'people pass';

/**
 * A galaxy as far as the cascade has built it, and the generator it left
 * behind. A stage not yet run has filled nothing, so its part is empty.
 */
export type Drawn = { readonly ok: true; readonly galaxy: DrawnGalaxy; readonly rng: Rng };

/**
 * Why one attempt at a stage did not stand: an invariant the galaxy missed, or
 * a stage that could not finish — the reserve running out mid-fill is the
 * second kind. Both re-roll the same way, and the last one is what a failure
 * reports.
 */
export type Miss = {
  /** The invariant missed, as the failure report names it. */
  readonly invariant: string;
  /** Where in the content set that invariant is declared or answered. */
  readonly where: string;
  readonly how: string;
};

/**
 * One attempt at a stage: what it built, or why it could not. Either way the
 * generator moves on, which is what keeps a re-roll inside the deterministic
 * function of the seed (ADR 0008 decision 17). Not a **draw**, which is the one
 * roll at campaign start that all the attempts together make.
 */
export type Attempt = Drawn | { readonly ok: false; readonly miss: Miss; readonly rng: Rng };

/**
 * One check of the **draw-time pass**, over the galaxy as drawn rather than the
 * content set as written (ADR 0008 decision 16). The pass needs to know nothing
 * about what it checks.
 */
export type DrawCheck = {
  /** The stage this check runs after, and re-rolls on a miss. */
  readonly stage: Stage;
  readonly invariant: string;
  readonly where: string;
  /** Null when the galaxy holds the invariant; otherwise how it missed. */
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
    invariant: 'the location-count range',
    where: 'drawParameters.locationCount',
    miss: (galaxy, content) => {
      const range = content.drawParameters.locationCount;
      const placed = galaxy.locations.length;
      return within(placed, range)
        ? null
        : `it placed ${placed} location${placed === 1 ? '' : 's'}, and the content set ` +
            `declared ${range.least} to ${range.most}`;
    },
  },
];
