/**
 * The **layout**: how the chart draws the map, every lane roughly to its
 * **distance** and no two crossing (ADR 0011). One unit here is one unit of
 * distance (decision 2).
 *
 * It carries no rules and nothing reads it but the chart (decision 7), and it
 * is part of a deterministic draw, so it uses only `+ − × ÷`, `Math.sqrt` and
 * the seeded rng: no trigonometry, which differs between JavaScript engines.
 */

import type { Lane } from './content';

/** A place in the layout, in units of **distance**: **layout coordinates**. */
export type Point = { readonly x: number; readonly y: number };

type LaidOut = { readonly layout: ReadonlyMap<string, Point>; readonly flaw: string | null };

/**
 * Where each of a motif's slots sits, from its lanes' distances alone and with
 * no rng, so the motif is the same shape in every campaign (ADR 0011 decision
 * 4). Lengths are best effort (decision 5): **stress majorization** over the
 * shortest-path distances between slots, from several starting rings, keeping
 * the closest fit `flaw` finds nothing wrong with. With none, the first start's
 * layout is returned with its flaw, for the load to refuse.
 */
export function layOutMotif(
  slots: readonly string[],
  lanes: readonly Lane[],
  minimumGapPercent: number,
): LaidOut {
  const shortest = shortestDistances(slots, lanes);
  const gap = minimumGap(lanes, minimumGapPercent);
  let best: (LaidOut & { readonly stress: number }) | null = null;
  for (const order of ringOrders(slots.length)) {
    const placed = majorized(order, shortest);
    const layout = new Map(slots.map((slot, at) => [slot, placed[at] ?? origin]));
    const tried = { layout, flaw: flaw(layout, lanes, gap), stress: stress(placed, shortest) };
    // A layout with no flaw beats any with one, and then the closer fit wins.
    const rank = (one: LaidOut & { readonly stress: number }) =>
      (one.flaw === null ? 0 : Infinity) + one.stress;
    if (best === null || rank(tried) < rank(best)) best = tried;
  }
  return best ?? { layout: new Map(), flaw: null };
}

/**
 * The **minimum gap**: how near a location may sit to a lane that does not
 * touch it, as a share of the shortest lane (ADR 0011 decision 4).
 */
function minimumGap(lanes: readonly Lane[], minimumGapPercent: number): number {
  const shortest = Math.min(...lanes.map((lane) => lane.distance));
  return lanes.length === 0 ? 0 : (shortest * minimumGapPercent) / 100;
}

/**
 * What is wrong with a layout, said of its motif, or null: two lanes crossing,
 * or a location within the gap of a lane it is not on. Lanes that share a
 * location meet only there; one lying along another puts a location on a lane
 * it is not on, and the gap catches that.
 */
function flaw(
  layout: ReadonlyMap<string, Point>,
  lanes: readonly Lane[],
  gap: number,
): string | null {
  for (const [at, one] of lanes.entries()) {
    for (const other of lanes.slice(at + 1)) {
      if (one.ends.some((end) => other.ends.includes(end))) continue;
      if (crosses(segment(layout, one), segment(layout, other))) {
        return (
          `is laid out with two lanes crossing: ${one.ends[0]} to ${one.ends[1]}, ` +
          `and ${other.ends[0]} to ${other.ends[1]}`
        );
      }
    }
  }
  for (const [location, point] of layout) {
    for (const lane of lanes) {
      const off = distanceToSegment(point, segment(layout, lane));
      // On the lane is too near at any gap, a gap of nothing included.
      if (!lane.ends.includes(location) && (off < gap || off === 0)) {
        return (
          `puts ${location} within the minimum gap of the lane ` +
          `from ${lane.ends[0]} to ${lane.ends[1]}`
        );
      }
    }
  }
  return null;
}

/** How long a lane is drawn: the straight line between its ends in the layout. */
export function drawnLength(layout: ReadonlyMap<string, Point>, lane: Lane): number {
  const [from, to] = segment(layout, lane);
  return length(to.x - from.x, to.y - from.y);
}

/**
 * The largest ratio between a lane's drawn length and its distance, either way
 * round (ADR 0011 decision 5): one for a motif drawn exactly, or with no lanes.
 */
export function worstDistortion(
  layout: ReadonlyMap<string, Point>,
  lanes: readonly Lane[],
): number {
  return lanes.reduce((worst, lane) => {
    const drawn = drawnLength(layout, lane);
    return Math.max(worst, drawn / lane.distance, lane.distance / drawn);
  }, 1);
}

const origin: Point = { x: 0, y: 0 };

type Segment = readonly [Point, Point];

function segment(layout: ReadonlyMap<string, Point>, lane: Lane): Segment {
  return [layout.get(lane.ends[0]) ?? origin, layout.get(lane.ends[1]) ?? origin];
}

function length(dx: number, dy: number): number {
  return Math.sqrt(dx * dx + dy * dy);
}

/** Which side of the line through `a` and `b` the point `c` is on. */
function turn(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/** Whether two segments cross. Touching is the gap's to catch, not this. */
function crosses([a, b]: Segment, [c, d]: Segment): boolean {
  return turn(a, b, c) * turn(a, b, d) < 0 && turn(c, d, a) * turn(c, d, b) < 0;
}

function distanceToSegment(p: Point, [a, b]: Segment): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const span = dx * dx + dy * dy;
  const along = span === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / span;
  const t = Math.max(0, Math.min(1, along));
  return length(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * The shortest-path distance between every two slots, by index. Slots no lanes
 * join are held as far apart as all the lanes laid end to end, which keeps them
 * clear of each other without pulling on anything.
 */
function shortestDistances(slots: readonly string[], lanes: readonly Lane[]): number[][] {
  const shortest = slots.map((_, i) => slots.map((__, j) => (i === j ? 0 : Infinity)));
  for (const { ends, distance } of lanes) {
    const [i, j] = [slots.indexOf(ends[0]), slots.indexOf(ends[1])];
    for (const [from, to] of [
      [i, j],
      [j, i],
    ] as const) {
      const row = shortest[from];
      if (row !== undefined) row[to] = Math.min(row[to] ?? Infinity, distance);
    }
  }
  for (const via of shortest) {
    for (const row of shortest) {
      for (const [j, direct] of row.entries()) {
        row[j] = Math.min(direct, (row[shortest.indexOf(via)] ?? Infinity) + (via[j] ?? Infinity));
      }
    }
  }
  const unjoined = Math.max(
    1,
    lanes.reduce((sum, lane) => sum + lane.distance, 0),
  );
  return shortest.map((row) =>
    row.map((distance) => (distance === Infinity ? unjoined : distance)),
  );
}

/** The pull between two slots: nearer pairs are held to their distance harder. */
function weight(distance: number): number {
  return 1 / (distance * distance);
}

function stress(placed: readonly Point[], shortest: readonly number[][]): number {
  let total = 0;
  for (const [i, p] of placed.entries()) {
    for (const [j, q] of placed.entries()) {
      const target = shortest[i]?.[j] ?? 0;
      if (j > i) total += weight(target) * (length(p.x - q.x, p.y - q.y) - target) ** 2;
    }
  }
  return total;
}

/**
 * How many starting rings to try, and how many passes to make from each. Not
 * numbers of the game: they bound how hard the layout looks for a fit, and a
 * motif is a handful of slots.
 */
const rings = 24;
const passes = 400;

/**
 * The orders to seat the slots around a starting ring in, by index: their own
 * order first, then others with the first slot fixed, since turning a ring
 * changes nothing. Each is a different start, and may settle into a different
 * drawing of the same motif.
 */
function ringOrders(count: number): readonly (readonly number[])[] {
  const orders: number[][] = [];
  const permute = (chosen: readonly number[], left: readonly number[]) => {
    if (orders.length >= rings) return;
    if (left.length === 0) orders.push([...chosen]);
    for (const [at, next] of left.entries()) {
      permute([...chosen, next], [...left.slice(0, at), ...left.slice(at + 1)]);
    }
  };
  if (count > 0)
    permute(
      [0],
      Array.from({ length: count - 1 }, (_, at) => at + 1),
    );
  return orders;
}

/**
 * Stress majorization by local moves: each slot in turn goes where its
 * distances to every other pull it, from a start on a ring. The ring's points
 * are rational points on the circle, `((1−t²)/(1+t²), 2t/(1+t²))`, so the start
 * needs no trigonometry (ADR 0011 decision 7). Returned by slot index.
 */
function majorized(order: readonly number[], shortest: readonly number[][]): readonly Point[] {
  const count = order.length;
  const radius = Math.max(1, ...shortest.flat()) / 2;
  const placed: Point[] = [];
  for (const [seat, slot] of order.entries()) {
    const t = (4 * seat + 2 - 2 * count) / count;
    placed[slot] = { x: (radius * (1 - t * t)) / (1 + t * t), y: (radius * 2 * t) / (1 + t * t) };
  }

  for (let pass = 0; pass < passes; pass += 1) {
    for (const [i, here] of placed.entries()) {
      let x = 0;
      let y = 0;
      let pull = 0;
      for (const [j, there] of placed.entries()) {
        if (i === j) continue;
        const target = shortest[i]?.[j] ?? 0;
        const between = length(here.x - there.x, here.y - there.y);
        const scale = between === 0 ? 0 : target / between;
        x += weight(target) * (there.x + scale * (here.x - there.x));
        y += weight(target) * (there.y + scale * (here.y - there.y));
        pull += weight(target);
      }
      if (pull > 0) placed[i] = { x: x / pull, y: y / pull };
    }
  }
  return placed;
}
