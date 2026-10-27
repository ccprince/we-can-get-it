import type { DrawnGalaxy, KnownView, Register, View } from '../src/engine';

/**
 * One row per day per seed per setting, and the CSV is the output: plotting
 * stays outside the instrument (findings §5.4). What the designer reads is the
 * **curve through a campaign**, never its mean, which is why a row is a day
 * rather than a campaign.
 *
 * Every row carries its seed, so that one odd galaxy cannot be read as a trend,
 * and its setting, so that two settings run over the same seed can be diffed.
 *
 * The columns are documented in `harness/README.md`, where the config is.
 */
export type Row = {
  readonly setting: string;
  readonly seed: number;
  readonly day: number;
  readonly location: string;
  /** Whether the day was spent in **transit** rather than at a landing (#9). */
  readonly inTransit: boolean;
  readonly credits: number;
  /** Locations the **trade guide** holds something seen of, cumulative (#19). */
  readonly placesKnown: number;
  /** Days old the oldest of that is, so the curve shows how stale a run lets knowledge get. */
  readonly oldestKnownDays: number;
  /** Wants the player has seen so far, cumulative, and the registers they split into (#15, #16). */
  readonly wantsSeen: number;
  readonly wantsSeenPlain: number;
  readonly wantsSeenVague: number;
  /** Wants first seen today, and the same split: the curve of exposure, not its total. */
  readonly wantsNew: number;
  readonly wantsNewPlain: number;
  readonly wantsNewVague: number;
  /** Orders seen and still open today, split by register (#17). */
  readonly ordersOpenPlain: number;
  readonly ordersOpenVague: number;
  /** How many of those some lot in stock among those seen answers at acceptable or better. */
  readonly ordersFillable: number;
  /** Lots on sale where the ship landed today; nought in transit (#14). */
  readonly lotsSeen: number;
  /** How many of those answer a want the player has seen anywhere. */
  readonly lotsMatching: number;
};

/**
 * What a campaign has seen, held across its days: a want seen once stays seen
 * after a revisit replaces the sighting that showed it, so "so far" is the
 * harness's to keep. A set of the wants by who wants them and how it is worded.
 */
export type Seen = Map<string, Register>;

/** One campaign's draw, as its own row: the shape the draw gave it (#11, #33). */
export type DrawRow = {
  readonly setting: string;
  readonly seed: number;
  readonly motifs: number;
  readonly locations: number;
  readonly kinds: number;
  readonly goods: number;
};

export function drawRowFor(setting: string, seed: number, galaxy: DrawnGalaxy): DrawRow {
  return {
    setting,
    seed,
    motifs: galaxy.motifs.length,
    locations: galaxy.locations.length,
    kinds: galaxy.kinds.length,
    goods: galaxy.goods.length,
  };
}

/**
 * The day as the tourist found it, read off the view and nothing else. The day
 * index is the one engine value the player never reads (ADR 0005 decision 3);
 * it is kept in the read model for exactly this, because a measurement needs to
 * line two campaigns up day by day.
 */
export function rowFor(setting: string, seed: number, read: View, seen: Seen): Row {
  const known = read.guide.entries.flatMap(({ known: held }) => (held === null ? [] : [held]));
  const ages = known.map(({ daysAgo }) => daysAgo);

  const fresh: Register[] = [];
  for (const { name, wants } of known.flatMap(({ people }) => people)) {
    for (const { wording, register } of wants) {
      const key = `${name}: ${wording}`;
      if (!seen.has(key)) fresh.push(register);
      seen.set(key, register);
    }
  }
  const registers = [...seen.values()];
  const orders = known
    .flatMap(({ people }) => people.flatMap(({ wants }) => wants))
    .filter(({ orderDaysLeft }) => orderDaysLeft !== null && orderDaysLeft >= 0);

  const lots = read.here?.lots ?? [];
  const here = read.guide.entries.find((entry) => entry.name === read.here?.name)?.known;
  return {
    setting,
    seed,
    day: read.today.day,
    // In transit the player is at no location, so the row names where they are
    // bound and the flag beside it says the day was not a landing.
    location: read.here?.name ?? read.transit?.destination ?? 'nowhere',
    inTransit: read.here === null,
    credits: read.credits.credits,
    placesKnown: ages.length,
    oldestKnownDays: Math.max(0, ...ages),
    wantsSeen: registers.length,
    wantsSeenPlain: count(registers, 'plain'),
    wantsSeenVague: count(registers, 'vague'),
    wantsNew: fresh.length,
    wantsNewPlain: count(fresh, 'plain'),
    wantsNewVague: count(fresh, 'vague'),
    ordersOpenPlain: orders.filter(({ register }) => register === 'plain').length,
    ordersOpenVague: orders.filter(({ register }) => register === 'vague').length,
    ordersFillable: orders.filter(({ lotsAnswering }) => lotsAnswering > 0).length,
    lotsSeen: lots.length,
    lotsMatching: lotsMatching(lots.length, here),
  };
}

function count(registers: readonly Register[], register: Register): number {
  return registers.filter((each) => each === register).length;
}

/**
 * The lots on sale here that answer a want, read from the guide's entry for
 * here: that is where the engine says what each lot answers, and the entry for
 * the place the ship stands in is read afresh, so it is today's shop.
 */
function lotsMatching(lotsHere: number, here: KnownView | null | undefined): number {
  if (lotsHere === 0 || here === null || here === undefined) return 0;
  return here.lots.filter(({ wantsAnswered }) => wantsAnswered > 0).length;
}

const COLUMNS = [
  'setting',
  'seed',
  'day',
  'location',
  'inTransit',
  'credits',
  'placesKnown',
  'oldestKnownDays',
  'wantsSeen',
  'wantsSeenPlain',
  'wantsSeenVague',
  'wantsNew',
  'wantsNewPlain',
  'wantsNewVague',
  'ordersOpenPlain',
  'ordersOpenVague',
  'ordersFillable',
  'lotsSeen',
  'lotsMatching',
] as const;

const DRAW_COLUMNS = ['setting', 'seed', 'motifs', 'locations', 'kinds', 'goods'] as const;

/**
 * The CSV, with nothing in it that varies between two runs of the same config:
 * no timestamp, no duration, no path. The same seed run twice produces
 * byte-identical rows, which is the harness's half of the determinism ADR 0003
 * decision 1 requires — and a diff is how a setting's effect is read.
 */
export function toCsv(rows: readonly Row[]): string {
  const lines = [COLUMNS.join(',')];
  for (const row of rows) {
    lines.push(COLUMNS.map((column) => field(row[column])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

/** The per-campaign rows, a file of their own: one row a campaign, not a day. */
export function drawToCsv(rows: readonly DrawRow[]): string {
  const lines = [DRAW_COLUMNS.join(',')];
  for (const row of rows) {
    lines.push(DRAW_COLUMNS.map((column) => field(row[column])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

function field(value: string | number | boolean): string {
  if (typeof value !== 'string') return String(value);
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}
