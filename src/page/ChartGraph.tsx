import type { ChartView, Point } from '../engine';

/**
 * The **chart** drawn as a graph: each place where its **layout coordinates**
 * put it, and each lane a straight line labelled with its days for this ship
 * (ADR 0011). Read-only. The engine hands the coordinates over in units of
 * distance; scaling them to fit and placing the labels are the page's, and
 * nothing here reads a distance off them.
 *
 * Where the player is, is marked. A lane beyond **range** is dashed rather than
 * left out, since range is a wall with a price on it (ADR 0006 decision 14).
 */
export function ChartGraph({
  chart,
  here,
}: {
  readonly chart: ChartView;
  readonly here: string | null;
}) {
  const at = fitted(chart);
  const placeOf = (name: string) => at.get(name) ?? { x: 0, y: 0 };

  return (
    <svg
      role="img"
      aria-label="Chart"
      viewBox={`0 0 ${width} ${heightOf(at)}`}
      className="mt-6 h-auto w-full max-w-xl"
    >
      {chart.lanes.map((lane) => {
        const [from, to] = [placeOf(lane.ends[0]), placeOf(lane.ends[1])];
        const label = laneLabelAt(from, to);
        return (
          <g key={lane.ends.join('–')} aria-label={`${lane.ends[0]} to ${lane.ends[1]}`}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className={lane.withinRange ? 'stroke-stone-500' : 'stroke-stone-700'}
              strokeWidth={1.5}
              strokeDasharray={lane.withinRange ? undefined : '6 4'}
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-stone-400 text-[11px]"
            >
              {lane.days === 1 ? '1 day' : `${lane.days} days`}
            </text>
          </g>
        );
      })}
      {chart.locations.map(({ name }) => {
        const place = placeOf(name);
        const current = name === here;
        const label = placeLabelAt(name, chart, placeOf);
        return (
          <g key={name} aria-current={current ? 'location' : undefined}>
            <circle
              cx={place.x}
              cy={place.y}
              r={current ? 6 : 4}
              className={current ? 'fill-amber-300' : 'fill-stone-300'}
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor={label.anchor}
              dominantBaseline="middle"
              className={`text-[12px] ${current ? 'fill-amber-200' : 'fill-stone-200'}`}
            >
              {name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** The drawing's width in its own units; the page scales the whole to fit. */
const width = 480;
/** The tallest the drawing grows before a tall map is scaled down to fit it. */
const tallest = 720;
/**
 * Room round the edge for the labels that sit beyond the outermost places:
 * wider at the sides, where a name runs out level with its place.
 */
const margin = 32;
const sideMargin = 100;

/**
 * Each place in drawing units: the layout scaled evenly, so lanes keep their
 * proportions, to span the drawing's width unless that would make it taller
 * than the tallest. A galaxy of one place has nothing to scale. Screen y runs
 * down.
 */
function fitted(chart: ChartView): ReadonlyMap<string, Point> {
  const points = chart.locations.map(({ layout }) => layout);
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const [left, top] = [Math.min(...xs), Math.min(...ys)];
  const across = Math.max(...xs) - left;
  const down = Math.max(...ys) - top;
  const scale = Math.min(
    across === 0 ? Infinity : (width - 2 * sideMargin) / across,
    down === 0 ? Infinity : (tallest - 2 * margin) / down,
  );
  return new Map(
    chart.locations.map(({ name, layout }) => [
      name,
      {
        x: sideMargin + (layout.x - left) * (scale === Infinity ? 0 : scale),
        y: margin + (layout.y - top) * (scale === Infinity ? 0 : scale),
      },
    ]),
  );
}

function heightOf(at: ReadonlyMap<string, Point>): number {
  return Math.max(...[...at.values()].map(({ y }) => y), 0) + margin;
}

/**
 * A place's name: on the side away from its lanes, so it sits in the open
 * rather than across them. A dead end's name reads off its far end, and a hub's
 * off the side its lanes leave least.
 */
function placeLabelAt(
  name: string,
  chart: ChartView,
  placeOf: (name: string) => Point,
): Point & { readonly anchor: 'start' | 'middle' | 'end' } {
  const here = placeOf(name);
  const pull = chart.lanes
    .filter((lane) => lane.ends.includes(name))
    .map((lane) => placeOf(lane.ends[0] === name ? lane.ends[1] : lane.ends[0]))
    .reduce(
      (sum, there) => {
        const length = Math.hypot(there.x - here.x, there.y - here.y) || 1;
        return { x: sum.x + (there.x - here.x) / length, y: sum.y + (there.y - here.y) / length };
      },
      { x: 0, y: 0 },
    );
  const length = Math.hypot(pull.x, pull.y);
  // With no lanes, or lanes pulling every way at once, the name goes above.
  const away = length < 0.1 ? { x: 0, y: -1 } : { x: -pull.x / length, y: -pull.y / length };
  const offset = 12;
  return {
    x: here.x + away.x * offset,
    y: here.y + away.y * offset,
    anchor: away.x > 0.4 ? 'start' : away.x < -0.4 ? 'end' : 'middle',
  };
}

/** A lane's label: beside its middle, off to one side so the line stays clear. */
function laneLabelAt(from: Point, to: Point): Point {
  const [dx, dy] = [to.x - from.x, to.y - from.y];
  const length = Math.hypot(dx, dy) || 1;
  const offset = 9;
  return {
    x: (from.x + to.x) / 2 - (dy / length) * offset,
    y: (from.y + to.y) / 2 + (dx / length) * offset,
  };
}
