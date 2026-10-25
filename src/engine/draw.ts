import { assembleMap } from './assemble';
import type { ContentSet } from './content';
import { drawChecks, type Stage } from './draw-checks';
import type { DrawnGalaxy } from './galaxy';
import type { Rng } from './rng';
import { fails, type Problem } from './verdicts';

/**
 * What a draw gives: the galaxy and the generator it left behind, or the
 * problem that stopped it. A draw never throws; a content set that cannot be
 * drawn is a content defect reported like any other (ADR 0008 decision 17).
 */
export type DrawResult =
  | { readonly ok: true; readonly galaxy: DrawnGalaxy; readonly rng: Rng }
  | { readonly ok: false; readonly problem: Problem };

/**
 * Why one roll of a stage did not stand: a check it failed, or a stage that
 * could not finish — the reserve running out mid-fill is the second kind. Both
 * re-roll the same way, and the last one is what a failure reports.
 */
export type Miss = {
  readonly check: string;
  readonly where: string;
  readonly how: string;
};

/** One roll of a stage: what it built, or why it could not. Either way, the generator moves on. */
export type Roll =
  | { readonly ok: true; readonly galaxy: DrawnGalaxy; readonly rng: Rng }
  | { readonly ok: false; readonly miss: Miss; readonly rng: Rng };

/**
 * The **draw**: the one roll at campaign start that turns the **reserve** into
 * this campaign's galaxy (ADR 0008 decision 3). It is an ordered cascade —
 * motifs, locations, kinds, goods, people — each stage conditioned on the one
 * above, and this one function owns the cascade: a stage is a step inside it
 * rather than a second entry point (ADR 0008 decision 2).
 *
 * A pure function of the content set and the generator, reading no clock, so a
 * save carries a seed and never a galaxy (ADR 0008 decision 18, ADR 0003
 * decision 1). The generator is threaded in and out rather than held, like
 * every other draw from it — re-rolls included, so the same seed gives the same
 * galaxy, retries and all (decision 17).
 *
 * Decision 18 writes the signature `(content set, seed) -> drawn galaxy`; this
 * takes the generator the seed makes, because a seed is turned into one at the
 * single place a seed enters the engine (`startCampaign`, ADR 0009 decision 3)
 * and the draw has no business doing it twice. **Reporting mode** calls this
 * same function and makes its generator the same way — one code path, two
 * modes, which is the part of decision 18 that matters.
 *
 * The map goes first and everything later is conditioned on what it has fixed
 * (decision 2). **Kinds, goods and people** are the stages after it and are
 * #33; **patrons** are the sixth and are chunk 6. Each will be a step added
 * here, rerolled on its own and reading the galaxy the steps above it have
 * built — which is what keeps a downstream failure from discarding anything
 * upstream of it.
 */
export function draw(content: ContentSet, rng: Rng): DrawResult {
  return rerolled('motif selection', content, rng, (next) => assembleMap(content, next));
}

/**
 * The **draw-time pass** around one stage: roll it, run the checks registered
 * for it, and roll it again on a miss, up to the bound the content set declares
 * (ADR 0008 decision 17). Exhausting the bound fails loudly with the last miss.
 * No check is ever weakened to let a draw through.
 */
function rerolled(
  stage: Stage,
  content: ContentSet,
  rng: Rng,
  roll: (rng: Rng) => Roll,
): DrawResult {
  const { rerolls } = content.drawParameters;
  let rolled = checked(stage, roll(rng), content);
  for (let reroll = 1; !rolled.ok && reroll <= rerolls; reroll += 1) {
    rolled = checked(stage, roll(rolled.rng), content);
  }
  if (rolled.ok) return rolled;

  const { check, where, how } = rolled.miss;
  return {
    ok: false,
    problem: fails(
      where,
      `the ${stage} was re-rolled ${rerolls} times and failed ${check} every time; ` +
        `the last time, ${how}`,
    ),
  };
}

/**
 * A roll with the checks registered for its stage run over it: a roll that
 * built a galaxy missing one of them is a miss like any other. The first check
 * missed is the one reported, in registration order.
 */
function checked(stage: Stage, rolled: Roll, content: ContentSet): Roll {
  if (!rolled.ok) return rolled;
  for (const check of drawChecks) {
    if (check.stage !== stage) continue;
    const how = check.miss(rolled.galaxy, content);
    if (how !== null) {
      return { ok: false, miss: { check: check.check, where: check.where, how }, rng: rolled.rng };
    }
  }
  return rolled;
}
