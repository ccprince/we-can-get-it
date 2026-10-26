import type { ContentSet, Lane, Location, Motif, Range, Slot } from './content';
import type { Attempt } from './draw-checks';
import type { DrawnGalaxy, PlacedMotif } from './galaxy';
import { holdsStartHub, readAsStart } from './start-hub';
import { drawFrom, drawWithin, type Rng } from './rng';

/**
 * The first two stages of the cascade: the **motifs** are drawn, and then the
 * **locations** that fill their **slots** (ADR 0008 decision 2). The map is
 * assembled before anything else, because everything later is conditioned on
 * what it has fixed.
 *
 * The one dial is the **motif count**, and the location count follows from it
 * as the sum of the motifs placed, duplicates included (decisions 5 and 7).
 * Nothing here decides whether the result is a *legal* map: that is the
 * draw-time pass's, which re-rolls this whole assembly on a miss — the motif
 * selection is the narrowest stage there is, and the locations are conditioned
 * on it (ADR 0008 decision 17).
 */
export function assembleMap(content: ContentSet, rng: Rng): Attempt {
  const [drawn, afterMotifs] = drawMotifs(content, rng);
  const filled = fillSlots(drawn, content.locations, afterMotifs);
  if (!filled.ok) return filled;
  const { placed, rng: afterSlots } = filled;
  const [joining, afterJoining] = joinMotifs(
    placed,
    content.drawParameters.interMotifDistance,
    afterSlots,
  );

  const map = {
    locations: placed.flatMap((motif) => placedLocations(motif, content.locations)),
    motifs: placed.map(recordOf),
    lanes: [...placed.flatMap(lanesWithin), ...joining],
  };

  return {
    ok: true,
    // The map is the first stage, so nothing below it is filled yet.
    galaxy: {
      ...map,
      startId: hubOf(map, content),
      kinds: [],
      goods: [],
      people: [],
      layout: new Map(),
    },
    rng: afterJoining,
  };
}

/**
 * A motif placed, and which location went into each of its slots. A motif **may
 * appear more than once** in one assembly, so this is an instance: two
 * placements of one motif are two different sets of locations (ADR 0008
 * decision 7).
 */
type Placement = {
  readonly motif: Motif;
  /** Slot id to location id, one entry per slot. */
  readonly filled: ReadonlyMap<string, string>;
};

/**
 * The motif count is the dial, and the motifs are drawn **with replacement**:
 * two spurs filled by different locations is a legible galaxy, and a content
 * set whose only chokepoint shape is needed twice must be able to have it
 * twice (ADR 0008 decision 7).
 */
function drawMotifs(content: ContentSet, rng: Rng): readonly [readonly Motif[], Rng] {
  const drawn: Motif[] = [];
  let next = rng;
  for (let placed = 0; placed < content.drawParameters.motifsPerCampaign; placed += 1) {
    const [motif, after] = drawFrom(content.motifs, next);
    drawn.push(motif);
    next = after;
  }
  return [drawn, next];
}

/**
 * Every slot of every placed motif, filled from the location **reserve** by
 * **archetype**; an **untyped** slot accepts anything (ADR 0006 decision 4). A
 * location is taken out of the reserve once drawn, so **a location belongs to
 * exactly one motif** and no two motifs share one (ADR 0008 decision 6).
 *
 * Typed slots are filled before untyped ones. An untyped slot accepts whatever
 * is left and a typed one does not, so filling the fussy slots first is what
 * stops an untyped slot taking the last `market` and starving a slot that
 * needed it.
 *
 * A reserve with nothing left for a slot is a **miss**, re-rolled like any
 * other. That some location of every typed slot's archetype exists is checked at
 * load; whether there are *enough* of them is the reserve's adequacy, and #27's.
 */
function fillSlots(
  motifs: readonly Motif[],
  reserve: readonly Location[],
  rng: Rng,
):
  | { readonly ok: true; readonly placed: readonly Placement[]; readonly rng: Rng }
  | Extract<Attempt, { ok: false }> {
  const filled = motifs.map(() => new Map<string, string>());
  const taken = new Set<string>();
  let next = rng;

  for (const { at, slot } of typedSlotsFirst(motifs)) {
    const candidates = reserve.filter(
      (location) => !taken.has(location.id) && fits(slot, location),
    );
    if (candidates.length === 0) {
      return {
        ok: false,
        miss: {
          invariant: 'a location for every slot',
          where: 'locations',
          how:
            `the reserve had no ${slot.archetype ?? 'location'} left for the ${slot.id} slot ` +
            `of ${motifs[at]?.id ?? 'a motif'}`,
        },
        rng: next,
      };
    }

    const [location, after] = drawFrom(candidates, next);
    next = after;
    taken.add(location.id);
    filled[at]?.set(slot.id, location.id);
  }

  return {
    ok: true,
    placed: motifs.map((motif, at) => ({ motif, filled: filled[at] ?? new Map() })),
    rng: next,
  };
}

/** Which slots to fill in which order: the typed ones, then the untyped. */
function typedSlotsFirst(
  motifs: readonly Motif[],
): readonly { readonly at: number; readonly slot: Slot }[] {
  const slots = motifs.flatMap((motif, at) => motif.slots.map((slot) => ({ at, slot })));
  return [
    ...slots.filter(({ slot }) => slot.archetype !== null),
    ...slots.filter(({ slot }) => slot.archetype === null),
  ];
}

/** Whether a location may fill a slot. An untyped slot takes anything. */
function fits(slot: Slot, location: Location): boolean {
  return slot.archetype === null || slot.archetype === location.archetype;
}

/**
 * The **inter-motif lanes**, which are how motifs join: between whole motifs
 * and never by sharing a location (ADR 0008 decision 6). Each motif after the
 * first is joined to the one before it, by a lane between one drawn location of
 * each — so the count follows from the dial rather than being a second one, and
 * the assembly is in one piece.
 *
 * The distance is drawn from the range the content set declares. These are
 * where the long hauls live; whether the result is *connected at baseline
 * range* is a draw-time check. Joined in a chain, every one of these lanes is
 * the only way between the motifs it joins, so no ring runs between motifs:
 * a ring is a motif's own shape.
 */
function joinMotifs(
  motifs: readonly Placement[],
  distance: Range,
  rng: Rng,
): readonly [readonly Lane[], Rng] {
  const lanes: Lane[] = [];
  let next = rng;

  for (let at = 1; at < motifs.length; at += 1) {
    const previous = motifs[at - 1];
    const current = motifs[at];
    if (previous === undefined || current === undefined) continue;

    const [from, afterFrom] = drawFrom(locationIdsOf(previous), next);
    const [to, afterTo] = drawFrom(locationIdsOf(current), afterFrom);
    const [spans, afterSpan] = drawWithin(distance, afterTo);
    next = afterSpan;
    lanes.push({ ends: [from, to], distance: spans });
  }

  return [lanes, next];
}

/** What the galaxy keeps of a placement, for the invariants to read. */
function recordOf(placed: Placement): PlacedMotif {
  return {
    motif: placed.motif.id,
    shape: placed.motif.shape,
    slots: placed.motif.slots.flatMap((slot) => {
      const location = placed.filled.get(slot.id);
      return location === undefined ? [] : [{ slot: slot.id, location }];
    }),
  };
}

/** A placed motif's own lanes, with its drawn locations at their ends. */
function lanesWithin(placed: Placement): readonly Lane[] {
  return placed.motif.lanes.flatMap((lane) => {
    const from = placed.filled.get(lane.ends[0]);
    const to = placed.filled.get(lane.ends[1]);
    return from === undefined || to === undefined
      ? []
      : [{ ends: [from, to] as const, distance: lane.distance }];
  });
}

/**
 * The ids of the locations a placed motif holds, in the order of its slots,
 * which the loader has put in id order. Read off the slots rather than off the
 * map's values, whose order is the order the slots happened to be filled in.
 */
function locationIdsOf(placed: Placement): readonly string[] {
  return placed.motif.slots.flatMap((slot) => {
    const drawn = placed.filled.get(slot.id);
    return drawn === undefined ? [] : [drawn];
  });
}

/** The locations a placed motif holds, in the order of its slots. */
function placedLocations(placed: Placement, reserve: readonly Location[]): readonly Location[] {
  return locationIdsOf(placed).flatMap((drawn) => {
    const location = reserve.find((candidate) => candidate.id === drawn);
    return location === undefined ? [] : [location];
  });
}

/**
 * Where the campaign opens: of the drawn locations that hold the **start-node
 * guarantee** (ADR 0006 decision 16), the one the most lanes touch, and the
 * first in placement order when several tie — which is **derived order**, from
 * the seed and the content set alone (ADR 0009 decision 3). Every lane counts
 * toward the ranking, a lane beyond range included: the guarantee has already
 * asked for enough within it, and the ranking is the reading of
 * "best-connected" the assembly made before there was a guarantee.
 *
 * A map with no such location opens at its best-connected one instead, so that
 * the guarantee's check has a start to name when it refuses the map: the
 * selection never weakens the guarantee, it only finds the location that holds
 * it when there is one.
 */
function hubOf(map: Pick<DrawnGalaxy, 'locations' | 'lanes' | 'motifs'>, content: ContentSet) {
  const holding = map.locations.filter((location) =>
    holdsStartHub(
      readAsStart(map, location.id, content.start.ship.range),
      content.topology.startHub,
    ),
  );
  const pool = holding.length > 0 ? holding : map.locations;
  const busiest = pool.reduce((best, location) =>
    lanesAt(map.lanes, location.id) > lanesAt(map.lanes, best.id) ? location : best,
  );
  return busiest.id;
}

function lanesAt(lanes: readonly Lane[], locationId: string): number {
  return lanes.filter((lane) => lane.ends.includes(locationId)).length;
}
