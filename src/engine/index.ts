/**
 * The engine's public seam: one module, one import for the page, the harness,
 * the seed-finder and every test (ADR 0003 decision 1, ADR 0009 decision 1).
 * Nothing reaches inside it, and no rule lives outside it.
 *
 *   loadContent(raw)             -> { ok: true, content, reports }
 *                                  | { ok: false, problems, reports }
 *   startCampaign(content, seed) -> { ok: true, campaign } | { ok: false, problems }
 *   takeCommand(campaign, cmd)   -> { campaign } | { rejected: Reason }
 *   drawGalaxy(content, seed)    -> { ok: true, galaxy } | { ok: false, problems }
 *   view(campaign)               -> View
 *   identify(content)            -> string
 *   crossProduct(content, galaxy | null) -> CrossProduct
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
  OfferParameters,
  Range,
  Start,
  Tag,
  TagClass,
  Term,
  Want,
} from './content';

export { identify } from './identify';

export { crossProduct } from './cross-product';
export type {
  ArchetypeLocations,
  CrossProduct,
  Drawn,
  LaneDrawn,
  MotifLayout,
  PlacedSlot,
  SlotFilling,
  Survey,
} from './cross-product';
export type { Spread } from './content-reports';

export { drawGalaxy } from './draw';
export type { DrawReport } from './draw';
export type { DrawnGalaxy } from './galaxy';
export type { Point } from './layout';

export { startCampaign } from './campaign';
export type { Campaign, Digest, DigestEntry, StartResult } from './campaign';

export { isRejected, takeCommand } from './commands';
export type { Command, CommandResult, Reason } from './commands';

export { view } from './view';
export type {
  CargoView,
  ChartView,
  CorrectionView,
  CreditsView,
  DigestView,
  GuideEntryView,
  GuideView,
  HereView,
  HoldView,
  KnownLotView,
  KnownPersonView,
  KnownView,
  LaneView,
  LocationView,
  LotView,
  MatchView,
  MenuView,
  PersonView,
  Register,
  StandingView,
  TodayView,
  TransitView,
  View,
  WantView,
} from './view';
export type { Tier } from './match';
export type { CalendarDate } from './calendar';
