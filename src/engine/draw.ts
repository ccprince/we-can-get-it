import { assembleMap } from './assemble';
import { drawGoods, drawKinds, drawPeople } from './fill';
import type { ContentSet } from './content';
import { drawChecks, reserveShortfall, type Attempt, type Drawn, type Stage } from './draw-checks';
import type { DrawnGalaxy } from './galaxy';
import { rngFromSeed, type Rng } from './rng';
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
 * (decision 2). **Kinds, goods and people** are the stages after it;
 * **patrons** are the sixth and are chunk 6. Each is a step in `laterStages`,
 * rerolled on its own and reading the galaxy the steps above it have built —
 * which is what keeps a downstream failure from discarding anything upstream
 * of it.
 */
export function draw(content: ContentSet, rng: Rng): DrawResult {
  const short = reserveShortfall(content);
  if (short !== null) return { ok: false, problem: short };
  let made = rerolled('motif selection', content, rng, (next) => assembleMap(content, next));
  for (const [stage, fill] of laterStages) {
    if (!made.ok) return made;
    const { galaxy } = made;
    made = rerolled(stage, content, made.rng, (next) => fill(galaxy, content, next));
  }
  return made;
}

/**
 * The stages after the map, in the order the cascade runs them. Each reads the
 * galaxy the stages above it built and is re-rolled on its own, so a miss in
 * one never discards the map (ADR 0008 decision 17).
 */
const laterStages: readonly (readonly [
  Stage,
  (galaxy: DrawnGalaxy, content: ContentSet, rng: Rng) => Attempt,
])[] = [
  ['kinds pass', drawKinds],
  ['goods pass', drawGoods],
  ['people pass', drawPeople],
];

/** The draw in reporting mode: the galaxy a seed gives, or why it gives none. */
export type DrawReport =
  | { readonly ok: true; readonly galaxy: DrawnGalaxy }
  | { readonly ok: false; readonly problems: readonly Problem[] };

/**
 * The draw's **reporting mode**: the galaxy a content set and seed give,
 * without starting a campaign, for the tools that need drawn galaxies — the
 * seed-finder, the cross-product report and the harness's draw-shape columns.
 * It is this same draw, its generator made from the seed exactly as
 * `startCampaign` makes it, so a report never disagrees with the game (ADR 0008
 * decision 18).
 */
export function drawGalaxy(content: ContentSet, seed: number): DrawReport {
  const drawn = draw(content, rngFromSeed(seed));
  return drawn.ok ? { ok: true, galaxy: drawn.galaxy } : { ok: false, problems: [drawn.problem] };
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
  let made = checked(stage, attempt(rng), content);
  for (let reroll = 1; !made.ok && reroll <= rerolls; reroll += 1) {
    made = checked(stage, attempt(made.rng), content);
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
 * An attempt with the checks its stage re-rolls run over it: an attempt that
 * built a galaxy missing an invariant is a miss like any other. The first check
 * missed is the one reported, in registration order.
 */
function checked(stage: Stage, made: Attempt, content: ContentSet): Attempt {
  if (!made.ok) return made;
  for (const check of drawChecks.filter((registered) => registered.stage === stage)) {
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
