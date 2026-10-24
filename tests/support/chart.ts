import type { ChartView, LaneView } from '../../src/engine';

/**
 * The lane joining two places, whichever end it names first. A lane is
 * symmetric, and where it sits in the chart's list is the draw's business
 * (ADR 0009 decision 3), so a test finds a lane by what it joins.
 */
export function laneBetween(chart: ChartView, one: string, other: string): LaneView {
  const lane = chart.lanes.find((each) => each.ends.includes(one) && each.ends.includes(other));
  if (lane === undefined) throw new Error(`no lane on the chart joins ${one} and ${other}`);
  return lane;
}
