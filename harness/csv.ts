import type { DrawShape, DrawnGalaxy, KnownView, Register, View } from '../src/engine';

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
  /** Distinct goods among every lot the guide holds that no want seen is after (#21). */
  readonly goodsUnwanted: number;
};

/**
 * What a campaign has seen, held across its days: a want seen once stays seen
 * after a revisit replaces the sighting that showed it, so "so far" is the
 * harness's to keep. Each want by who wants it and how it is worded, with its register.
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
  /** Kinds at or above the usability floor, and goods in each as a spread: `goods:kinds` pairs. */
  readonly usableKinds: number;
  readonly goodsPerUsableKind: string;
  /** Vague wants the draw placed, bucketed by the goods answering each: never averaged (#21). */
  readonly vagueZero: number;
  readonly vagueOne: number;
  readonly vagueFew: number;
  readonly vagueMany: number;
};

/** Where "few" ends: a vague want with up to this many answers is a few, past it many. */
const FEW_ANSWERS = 4;

export function drawRowFor(
  setting: string,
  seed: number,
  galaxy: DrawnGalaxy,
  shape: DrawShape,
): DrawRow {
  const { goodsPerUsableKind, vagueAnswers } = shape;
  return {
    setting,
    seed,
    motifs: galaxy.motifs.length,
    locations: galaxy.locations.length,
    kinds: galaxy.kinds.length,
    goods: galaxy.goods.length,
    usableKinds: goodsPerUsableKind.length,
    goodsPerUsableKind: spreadOf(goodsPerUsableKind),
    vagueZero: vagueAnswers.filter((each) => each === 0).length,
    vagueOne: vagueAnswers.filter((each) => each === 1).length,
    vagueFew: vagueAnswers.filter((each) => each > 1 && each <= FEW_ANSWERS).length,
    vagueMany: vagueAnswers.filter((each) => each > FEW_ANSWERS).length,
  };
}

/** `goods:kinds` pairs, fewest goods first: `3:1 4:2` is one kind of three goods, two of four. */
function spreadOf(counts: readonly number[]): string {
  const kinds = new Map<number, number>();
  for (const goods of counts) kinds.set(goods, (kinds.get(goods) ?? 0) + 1);
  return [...kinds.entries()].map(([goods, held]) => `${goods}:${held}`).join(' ');
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
    .filter(({ orderDaysLeft }) => orderDaysLeft !== null);

  const orderRegisters = orders.map(({ register }) => register);
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
    ordersOpenPlain: count(orderRegisters, 'plain'),
    ordersOpenVague: count(orderRegisters, 'vague'),
    ordersFillable: orders.filter(({ lotsAnswering }) => lotsAnswering > 0).length,
    lotsSeen: lots.length,
    lotsMatching: lotsMatching(here),
    goodsUnwanted: goodsUnwanted(read),
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
function lotsMatching(here: KnownView | null | undefined): number {
  if (here === null || here === undefined) return 0;
  return here.lots.filter(({ wantsAnswered }) => wantsAnswered > 0).length;
}

/**
 * Goods, not lots: the same good on sale in two shops is one good nobody wants.
 * Read from every sighting the guide holds, since a want is wanted by a buyer
 * anywhere, and `wantsAnswered` already counts across everything seen.
 */
function goodsUnwanted(read: View): number {
  const lots = read.guide.entries.flatMap(({ known }) => known?.lots ?? []);
  const wanted = new Set(
    lots.filter(({ wantsAnswered }) => wantsAnswered > 0).map(({ good }) => good),
  );
  return new Set(lots.map(({ good }) => good).filter((good) => !wanted.has(good))).size;
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
  'goodsUnwanted',
] as const;

const DRAW_COLUMNS = [
  'setting',
  'seed',
  'motifs',
  'locations',
  'kinds',
  'goods',
  'usableKinds',
  'goodsPerUsableKind',
  'vagueZero',
  'vagueOne',
  'vagueFew',
  'vagueMany',
] as const;

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
