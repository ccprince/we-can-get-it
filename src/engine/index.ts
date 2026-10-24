/**
 * The engine's public seam: one module, one import for the page, the harness,
 * the seed-finder and every test (ADR 0003 decision 1, ADR 0009 decision 1).
 * Nothing reaches inside it, and no rule lives outside it.
 *
 *   loadContent(raw)             -> { ok: true, content, reports }
 *                                  | { ok: false, problems, reports }
 *   startCampaign(content, seed) -> Campaign
 *   takeCommand(campaign, cmd)   -> { campaign } | { rejected: Reason }
 *   view(campaign)               -> View
 */
export { loadContent } from './load-content';
export type { LoadResult, Problem, Report } from './load-content';
export type {
  Bounds,
  Buyer,
  Calendar,
  ContentSet,
  Good,
  Location,
  Month,
  Range,
  Start,
  Tag,
  TagClass,
  Term,
  Want,
} from './content';

export { startCampaign } from './campaign';
export type { Campaign, Digest, DigestEntry } from './campaign';
export type { DrawnGalaxy, PlacedMotif } from './galaxy';

export { isRejected, takeCommand } from './commands';
export type { Command, CommandResult, Reason } from './commands';

export { view } from './view';
export type {
  ChartView,
  CreditsView,
  DigestView,
  HereView,
  LaneView,
  MenuView,
  TodayView,
  TransitView,
  View,
} from './view';
export type { CalendarDate } from './calendar';
