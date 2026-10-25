import {
  goodsCarrying,
  roleTags,
  shapes,
  within,
  type Buyer,
  type ContentSet,
  type Shape,
} from './content';
import { kindsTradedIn } from './fill';
import type { DrawnGalaxy } from './galaxy';
import { reachableFrom } from './map';
import { holdsStartHub, readAsStart } from './start-hub';
import type { Rng } from './rng';

/**
 * A stage of the draw's cascade that a missed invariant re-rolls (ADR 0008
 * decision 2), named as the failure report names it. A check names the stage
 * its miss re-rolls — the narrowest that could fix it (decision 17).
 *
 * A check on what a later pass leaves names that pass when it is the narrowest
 * that could fix the miss: the substance of the goods is the goods pass's, and
 * a kind dropped that should have stayed is the kinds pass's.
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
 * edit the pass. The substance checks (#27) read what the cascade filled in.
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
  // One check per shape, so a miss names the number it fell short of. All of
  // them read the assembly, and re-roll the motif selection (ADR 0006
  // decision 3).
  ...shapes.map(leastPlacedCheck),
  {
    stage: 'motif selection',
    invariant: 'the far haul',
    where: 'topology.farHaul',
    miss: (galaxy, content) => {
      const { farHaul } = content.topology;
      const longest = Math.max(0, ...interMotifLanes(galaxy).map((lane) => lane.distance));
      return longest >= farHaul
        ? null
        : `its longest lane between motifs was ${longest}, and the content set declared at ` +
            `least ${farHaul}`;
    },
  },
  {
    // Checked at campaign start only. Whether a later lane closure may cut a
    // place off is an open question ADR 0006 records, and not this check.
    stage: 'motif selection',
    invariant: 'connectivity at baseline range',
    where: 'start.ship.range',
    miss: (galaxy, content) => {
      const { range } = content.start.ship;
      const reached = reachableFrom(galaxy, galaxy.startId, range);
      const cutOff = galaxy.locations.filter((location) => !reached.has(location.id));
      return cutOff.length === 0
        ? null
        : `it left ${cutOff.map((location) => location.id).join(', ')} unreachable from ` +
            `${galaxy.startId} on lanes within the range of ${range}`;
    },
  },
  {
    // The assembly picks a start that holds this when one exists, so a miss is
    // a map with no such place on it at all (ADR 0006 decision 16).
    stage: 'motif selection',
    invariant: 'the start-node guarantee',
    where: 'topology.startHub',
    miss: (galaxy, content) => {
      const { range } = content.start.ship;
      const { startHub } = content.topology;
      const opened = readAsStart(galaxy, galaxy.startId, range);
      return holdsStartHub(opened, startHub)
        ? null
        : `it opened at ${galaxy.startId}, a ${opened.archetype} with ${opened.neighbours} ` +
            `neighbour${opened.neighbours === 1 ? '' : 's'} within the range of ${range}, ` +
            `${opened.spurs} of them in a spur, and the content set declared ` +
            `${startHub.archetype === null ? 'a start' : `a ${startHub.archetype}`} with at ` +
            `least ${startHub.neighbours}, ${startHub.spurs} of them in a spur`;
    },
  },
  {
    // A kind is dropped entire only if no drawn archetype supplies or demands
    // it (ADR 0008 decision 11).
    stage: 'kinds pass',
    invariant: 'a kind a drawn archetype trades in stays in circulation',
    where: 'archetypes',
    miss: (galaxy, content) => {
      const dropped = [...kindsTradedIn(galaxy, content)].filter(
        (kind) => !galaxy.kinds.includes(kind),
      );
      return dropped.length === 0
        ? null
        : `it dropped ${dropped.join(', ')}, which a drawn archetype supplies or demands`;
    },
  },
  {
    // The draw never takes a usable kind below its floor (ADR 0008 decision
    // 11). A kind the reserve holds fewer goods of than the floor was never
    // usable, and hiding is not what left it short.
    stage: 'goods pass',
    invariant: 'the usability floor',
    where: 'bounds.usabilityFloor',
    miss: (galaxy, content) => {
      const { usabilityFloor } = content.bounds;
      const short = galaxy.kinds.filter((kind) => {
        const held = content.goods.filter((good) => good.kind === kind).length;
        return held >= usabilityFloor && goodsCarrying(galaxy, kind) < usabilityFloor;
      });
      return short.length === 0
        ? null
        : `it left ${short.join(', ')} with fewer goods than the floor of ${usabilityFloor}`;
    },
  },
  {
    // A role tag is a learnable pattern or it is a one-off answer (ADR 0007
    // decision 7). Read over the buyers who could be drawn: the goods pass
    // runs before the people pass, so a tag one of them holds must be spread.
    // A tag no drawn good carries is absent rather than a one-off answer, and
    // the goods pass could not bring it back: its kind was dropped whole.
    stage: 'goods pass',
    invariant: 'the role-tag spread',
    where: 'bounds.goodsPerRoleTag',
    miss: (galaxy, content) => {
      const { least } = content.bounds.goodsPerRoleTag;
      const thin = [...roleTags({ buyers: buyersAtDrawnLocations(galaxy, content) })]
        .filter((tag) => goodsCarrying(galaxy, tag) > 0 && goodsCarrying(galaxy, tag) < least)
        .sort();
      return thin.length === 0
        ? null
        : `${thin.join(', ')} held in a role but sat on fewer than ${least} drawn goods`;
    },
  },
  {
    // The ration is on the number of quirk tags the galaxy holds, and a quirk
    // the reserve rations correctly can be absent from the draw (ADR 0007
    // decision 8, ADR 0008 decision 16).
    stage: 'goods pass',
    invariant: 'the quirk ration',
    where: 'bounds.quirkRation',
    miss: (galaxy, content) => {
      const { quirkRation } = content.bounds;
      const drawn = drawnQuirks(galaxy, content);
      return drawn.length <= quirkRation
        ? null
        : `it drew ${drawn.length} quirk tags, and the content set rationed them to ${quirkRation}`;
    },
  },
  {
    // A quirk is idiosyncratic because one buyer cares, not because one good
    // carries it: it still has to be a pattern a player could have found.
    stage: 'goods pass',
    invariant: 'the quirk spread',
    where: 'bounds.goodsPerRoleTag',
    miss: (galaxy, content) => {
      const { least } = content.bounds.goodsPerRoleTag;
      const thin = drawnQuirks(galaxy, content).filter((tag) => goodsCarrying(galaxy, tag) < least);
      return thin.length === 0
        ? null
        : `${thin.join(', ')} drawn on fewer than ${least} goods, too few to be a pattern`;
    },
  },
  {
    // A want naming a good has to name one the player can find (ADR 0007
    // decision 6): drawn, and supplied by a place that was drawn.
    stage: 'goods pass',
    invariant: 'a named good is reachable',
    where: 'buyers',
    miss: (galaxy, content) => {
      const supplied = kindsSuppliedIn(galaxy, content);
      const unreached = buyersAtDrawnLocations(galaxy, content).flatMap((buyer) =>
        buyer.wants.flatMap((want) => {
          if (!('goodId' in want)) return [];
          const good = galaxy.goods.find((drawn) => drawn.id === want.goodId);
          if (good === undefined) return [`${buyer.id} wants ${want.goodId}, which was hidden`];
          return supplied.has(good.kind)
            ? []
            : [`${buyer.id} wants ${want.goodId}, which no drawn location supplies`];
        }),
      );
      return unreached.length === 0 ? null : unreached.join('; ');
    },
  },
];

/** The buyers who stand at a drawn location, before the people pass hides any. */
function buyersAtDrawnLocations(galaxy: DrawnGalaxy, content: ContentSet): readonly Buyer[] {
  const drawn = new Set(galaxy.locations.map((location) => location.id));
  return content.buyers.filter((buyer) => drawn.has(buyer.locationId));
}

/** The quirk tags some drawn good carries, in id order. */
function drawnQuirks(galaxy: DrawnGalaxy, content: ContentSet): readonly string[] {
  return content.tags
    .filter((tag) => tag.class === 'quirk' && goodsCarrying(galaxy, tag.id) > 0)
    .map((tag) => tag.id);
}

/** The kinds a drawn location's archetype supplies, which is what a shop stocks. */
function kindsSuppliedIn(galaxy: DrawnGalaxy, content: ContentSet): ReadonlySet<string> {
  const drawn = new Set(galaxy.locations.map((location) => location.archetype));
  return new Set(
    content.archetypes
      .filter((archetype) => drawn.has(archetype.id))
      .flatMap((archetype) => archetype.supplies),
  );
}

/** The motif invariant for one shape: at least so many of it placed. */
function leastPlacedCheck(shape: Shape): DrawCheck {
  return {
    stage: 'motif selection',
    invariant: 'the motif invariants',
    where: `topology.leastPlaced.${shape}`,
    miss: (galaxy, content) => {
      const least = content.topology.leastPlaced[shape];
      const placed = galaxy.motifs.filter((motif) => motif.shape === shape).length;
      return placed >= least
        ? null
        : `it placed ${placed} ${shape}${placed === 1 ? '' : 's'}, and the content set ` +
            `declared at least ${least}`;
    },
  };
}

/**
 * The inter-motif lanes: those whose two ends were placed by different motifs,
 * read off the record of the assembly rather than off the lanes.
 *
 * The far haul reads one of these as how far apart two motifs are, which holds
 * because the assembly joins motifs in a chain: every inter-motif lane is the
 * only way between the motifs it joins, so its length is their distance by any
 * route. A joining rule with slack between motifs would have to measure routes.
 */
function interMotifLanes(galaxy: DrawnGalaxy): DrawnGalaxy['lanes'] {
  const placedBy = new Map(
    galaxy.motifs.flatMap((motif, at) => motif.slots.map(({ location }) => [location, at])),
  );
  return galaxy.lanes.filter((lane) => placedBy.get(lane.ends[0]) !== placedBy.get(lane.ends[1]));
}
