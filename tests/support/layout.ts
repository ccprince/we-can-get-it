import type { ContentSet, DrawnGalaxy, Point } from '../../src/engine';

/**
 * The checks a test makes of a drawn **layout**, worked out here from the
 * galaxy's own lanes and layout coordinates rather than asked of the engine:
 * a test that asked the layout code whether its own layout was sound could
 * never disagree with it.
 */

/**
 * The tightest **minimum gap** any motif in the content set allows: its share
 * of the shortest lane inside a motif. A lane between motifs sets no gap.
 */
export function tightestGap(content: ContentSet): number {
  const shortest = Math.min(
    ...content.motifs.flatMap(({ lanes }) => lanes.map(({ distance }) => distance)),
  );
  return (shortest * content.topology.minimumGapPercent) / 100;
}

function at(galaxy: DrawnGalaxy, location: string): Point {
  const point = galaxy.layout.get(location);
  if (point === undefined) throw new Error(`${location} has no layout coordinates`);
  return point;
}

/** How far apart two locations are drawn. */
export function drawnApart(galaxy: DrawnGalaxy, one: string, other: string): number {
  const [p, q] = [at(galaxy, one), at(galaxy, other)];
  return Math.hypot(p.x - q.x, p.y - q.y);
}

function side(a: Point, b: Point, c: Point): number {
  return Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x));
}

function nearest(p: Point, a: Point, b: Point): number {
  const [dx, dy] = [b.x - a.x, b.y - a.y];
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

/**
 * Every pair of lanes with no location in common that cross, and every
 * location drawn nearer than `gap` to a lane it is not on, worded.
 */
export function layoutFaults(galaxy: DrawnGalaxy, gap: number): readonly string[] {
  const faults: string[] = [];
  const { lanes } = galaxy;
  lanes.forEach((one, index) => {
    for (const other of lanes.slice(index + 1)) {
      if (one.ends.some((end) => other.ends.includes(end))) continue;
      const [a, b] = one.ends.map((end) => at(galaxy, end)) as [Point, Point];
      const [c, d] = other.ends.map((end) => at(galaxy, end)) as [Point, Point];
      if (side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0) {
        faults.push(`${one.ends.join('-')} crosses ${other.ends.join('-')}`);
      }
    }
  });
  for (const location of galaxy.locations) {
    for (const lane of lanes) {
      if (lane.ends.includes(location.id)) continue;
      const [a, b] = lane.ends.map((end) => at(galaxy, end)) as [Point, Point];
      if (nearest(at(galaxy, location.id), a, b) < gap) {
        faults.push(`${location.id} is within the gap of ${lane.ends.join('-')}`);
      }
    }
  }
  return faults;
}
