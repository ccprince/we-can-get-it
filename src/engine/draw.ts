import type { ContentSet } from './content';
import type { DrawnGalaxy } from './galaxy';
import type { Rng } from './rng';

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
 * every other draw from it.
 *
 * The map goes first and everything later is conditioned on what it has fixed
 * (decision 2). Assembling it from motifs is #11's next slice; **kinds, goods
 * and people** are #33, and **patrons** are chunk 6.
 */
export function draw(content: ContentSet, rng: Rng): readonly [DrawnGalaxy, Rng] {
  return [
    {
      locations: content.locations,
      lanes: content.lanes,
      startId: content.start.locationId,
      motifs: [],
    },
    rng,
  ];
}
