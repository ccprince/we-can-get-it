import { assembleMap } from './assemble';
import type { ContentSet } from './content';
import { drawChecks, type Attempt, type Drawn, type Stage } from './draw-checks';
import type { Rng } from './rng';
import { fails, type Problem } from './verdicts';

/**
 * What a draw gives: the galaxy and the generator it left behind, or the
 * problem that stopped it. A draw never throws; a content set that cannot be
 * drawn is a content defect reported like any other (ADR 0008 decision 17).
 */
export type DrawResult = Drawn | { readonly ok: false; readonly problem: Problem };

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
 * The **draw-time pass** around one stage: attempt it, run the registered
 * checks, and attempt it again on a miss, up to the bound the content set
 * declares (ADR 0008 decision 17). Exhausting the bound fails loudly with the last miss.
 * No check is ever weakened to let a draw through.
 */
function rerolled(
  stage: Stage,
  content: ContentSet,
  rng: Rng,
  attempt: (rng: Rng) => Attempt,
): DrawResult {
  const { rerolls } = content.drawParameters;
  let made = checked(attempt(rng), content);
  for (let reroll = 1; !made.ok && reroll <= rerolls; reroll += 1) {
    made = checked(attempt(made.rng), content);
  }
  if (made.ok) return made;

  // Only the last miss is named, so the report does not claim that every
  // attempt missed the same invariant: two of them may not have.
  const { invariant, where, how } = made.miss;
  return {
    ok: false,
    problem: fails(
      where,
      `the ${stage} was re-rolled ${rerolls} times and still missed ${invariant}: ${how}`,
    ),
  };
}

/**
 * An attempt with the registered checks run over it: an attempt that built a
 * galaxy missing an invariant is a miss like any other. The first check missed
 * is the one reported, in registration order.
 */
function checked(made: Attempt, content: ContentSet): Attempt {
  if (!made.ok) return made;
  for (const check of drawChecks) {
    const how = check.miss(made.galaxy, content);
    if (how !== null) {
      return {
        ok: false,
        miss: { invariant: check.invariant, where: check.where, how },
        rng: made.rng,
      };
    }
  }
  return made;
}
