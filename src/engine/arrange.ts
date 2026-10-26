import type { ContentSet, Lane } from './content';
import type { Attempt } from './draw-checks';
import type { DrawnGalaxy, PlacedMotif } from './galaxy';
import { flaw, minimumGap, type Point } from './layout';
import { drawInt, type Rng } from './rng';

/**
 * The draw's last stage: the motifs arranged into the **layout** (ADR 0011
 * decision 6). The first motif sits as it was laid out at load. Each after it
 * goes at the far end of the **inter-motif lane** joining it to the layout so
 * far, turned and flipped, trying the ways of placing it in an order drawn
 * from the rng. A way fits when it places the motif **outward**, away from the
 * layout so far, with no crossing and no breach of the **minimum gap**. When
 * none fits, the lane is drawn longer, step by step, until one does. Motifs are
 * never shrunk or bent: only those lanes stretch.
 *
 * It runs after people even though it reads only the map, so that every
 * earlier stage draws exactly what it drew before there was a layout. It never
 * fails and never re-rolls.
 */
export function arrangeMotifs(galaxy: DrawnGalaxy, content: ContentSet, rng: Rng): Attempt {
  const layout = new Map<string, Point>();
  const laid: Lane[] = [];
  // The gap is a share of a motif's own shortest lane, never a lane between
  // motifs, so the tightest any placed motif allows holds for all of them.
  const inside: Lane[] = [];
  let next = rng;

  for (const [at, placed] of galaxy.motifs.entries()) {
    const shape = shapeOf(placed, content);
    const after = galaxy.motifs[at + 1];
    const onward =
      after === undefined
        ? undefined
        : galaxy.lanes
            .find(
              (lane) =>
                lane.ends.some((end) => shape.has(end)) &&
                lane.ends.some((end) => after.slots.some(({ location }) => location === end)),
            )
            ?.ends.find((end) => shape.has(end));
    const own = galaxy.lanes.filter((lane) => lane.ends.every((end) => shape.has(end)));
    const joining = galaxy.lanes.find(
      (lane) => lane.ends.some((end) => shape.has(end)) && lane.ends.some((end) => layout.has(end)),
    );
    if (joining === undefined) {
      // The first motif, which nothing is joined to yet.
      for (const [location, point] of shape) layout.set(location, point);
    } else {
      const [ways, shuffledFrom] = shuffled(waysToPlace, next);
      next = shuffledFrom;
      const gap = minimumGap([...inside, ...own], content.topology.minimumGapPercent);
      const fitted = fit(layout, shape, [...laid, ...own], { joining, onward }, ways, gap);
      for (const [location, point] of fitted) layout.set(location, point);
      laid.push(joining);
    }
    laid.push(...own);
    inside.push(...own);
  }

  return { ok: true, galaxy: { ...galaxy, layout }, rng: next };
}

/** A placed motif's layout from load, by the location that filled each slot. */
function shapeOf(placed: PlacedMotif, content: ContentSet): ReadonlyMap<string, Point> {
  const motif = content.motifs.find(({ id }) => id === placed.motif);
  return new Map(
    placed.slots.map(({ slot, location }) => [location, motif?.layout.get(slot) ?? origin]),
  );
}

const origin: Point = { x: 0, y: 0 };

/**
 * One way of placing a motif: the direction the joining lane leaves in, how
 * the motif is turned, and whether it is flipped.
 */
type Way = { readonly heading: Point; readonly turn: Point; readonly flipped: boolean };

/**
 * Directions as whole-number steps, made unit length with `Math.sqrt` and no
 * trigonometry (ADR 0011 decision 7): every step of at most `reach` across and
 * up that is not a multiple of a shorter one. A reach of one is the compass of
 * eight. The lane needs the finer set, since a place can sit in a bay that only
 * a narrow range of directions leaves; turning the motif needs only the eight.
 * How fine either is bounds how hard the stage looks, and is not a number of
 * the game.
 */
function directions(reach: number): readonly Point[] {
  const steps: Point[] = [];
  for (let x = -reach; x <= reach; x += 1) {
    for (let y = -reach; y <= reach; y += 1) {
      if (divisor(Math.abs(x), Math.abs(y)) === 1) {
        const length = Math.sqrt(x * x + y * y);
        steps.push({ x: x / length, y: y / length });
      }
    }
  }
  return steps;
}

function divisor(one: number, other: number): number {
  return other === 0 ? one : divisor(other, one % other);
}

const waysToPlace: readonly Way[] = directions(3).flatMap((heading) =>
  directions(1).flatMap((turn) => [false, true].map((flipped) => ({ heading, turn, flipped }))),
);

/**
 * How much longer each step draws the joining lane, as a share of its
 * distance, and how many steps it may take. Not numbers of the game: they bound
 * how far the stage looks for room, and placing outward along a tree finds it.
 */
const stretchStep = 1 / 2;
const stretches = 64;

/**
 * Where the motif's locations go: the first way in the drawn order that fits
 * at the shortest length that fits any. Should none fit at the longest, the
 * first way is taken there, so the stage never fails.
 */
function fit(
  layout: ReadonlyMap<string, Point>,
  shape: ReadonlyMap<string, Point>,
  lanes: readonly Lane[],
  { joining, onward }: { readonly joining: Lane; readonly onward: string | undefined },
  ways: readonly Way[],
  gap: number,
): ReadonlyMap<string, Point> {
  const [from, to] = layout.has(joining.ends[0])
    ? joining.ends
    : [joining.ends[1], joining.ends[0]];
  const anchor = layout.get(from) ?? origin;
  const pivot = shape.get(to) ?? origin;
  const lengthAt = (stretch: number) => joining.distance * (1 + stretch * stretchStep);
  const placedAt = (way: Way, stretch: number) => {
    const length = lengthAt(stretch);
    const end = { x: anchor.x + length * way.heading.x, y: anchor.y + length * way.heading.y };
    return new Map(
      [...shape].map(([location, point]) => {
        const x = point.x - pivot.x;
        const y = way.flipped ? pivot.y - point.y : point.y - pivot.y;
        const turned = { x: x * way.turn.x - y * way.turn.y, y: x * way.turn.y + y * way.turn.x };
        return [location, { x: end.x + turned.x, y: end.y + turned.y }] as const;
      }),
    );
  };

  // Outward, so that no motif folds back into a pocket a later lane would
  // have to leave through: the whole motif beyond its anchor, seen from the
  // middle of the layout so far, and the place the next motif joins from no
  // nearer than the far end of the lane arriving.
  const middle = centreOf(layout);
  const away = { x: anchor.x - middle.x, y: anchor.y - middle.y };
  const ahead = (point: Point, along: Point) =>
    (point.x - anchor.x) * along.x + (point.y - anchor.y) * along.y;
  const outward = (placed: ReadonlyMap<string, Point>, way: Way, stretch: number) => {
    const next = onward === undefined ? undefined : placed.get(onward);
    return (
      [...placed.values()].every((point) => ahead(point, away) > 0) &&
      (next === undefined || ahead(next, way.heading) >= lengthAt(stretch) - gap)
    );
  };

  for (let stretch = 0; stretch <= stretches; stretch += 1) {
    for (const way of ways) {
      const placed = placedAt(way, stretch);
      const whole = new Map([...layout, ...placed]);
      if (outward(placed, way, stretch) && flaw(whole, [...lanes, joining], gap) === null) {
        return placed;
      }
    }
  }
  const [first] = ways;
  return first === undefined ? shape : placedAt(first, stretches);
}

function centreOf(layout: ReadonlyMap<string, Point>): Point {
  const points = [...layout.values()];
  const sum = points.reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y }));
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/** The ways of placing a motif, in an order drawn from the rng. */
function shuffled<T>(items: readonly T[], rng: Rng): readonly [readonly T[], Rng] {
  const order = [...items];
  let next = rng;
  for (let at = order.length - 1; at > 0; at -= 1) {
    const [swap, after] = drawInt(next, at + 1);
    next = after;
    [order[at], order[swap]] = [order[swap] as T, order[at] as T];
  }
  return [order, next];
}
