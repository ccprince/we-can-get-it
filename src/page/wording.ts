import type { LaneView } from '../engine';

/**
 * A count of days, worded. The singular reads differently in each place it
 * lands — mid-sentence, or opening one — so the caller says which it wants.
 */
export function days(count: number, one: string): string {
  return count === 1 ? one : `${count} days`;
}

/** Where a lane leads from one of its ends, both named as the chart names them. */
export function otherEnd(lane: LaneView, name: string): string {
  return lane.ends[0] === name ? lane.ends[1] : lane.ends[0];
}
