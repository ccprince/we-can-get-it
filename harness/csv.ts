import type { View } from '../src/engine';

/**
 * One row per day per seed per setting, and the CSV is the output: plotting
 * stays outside the instrument (findings §5.4). What the designer reads is the
 * **curve through a campaign**, never its mean, which is why a row is a day
 * rather than a campaign.
 *
 * Every row carries its seed, so that one odd galaxy cannot be read as a trend,
 * and its setting, so that two settings run over the same seed can be diffed.
 *
 * The columns are thin because little exists yet. Every later ticket in the
 * milestone extends them — wants seen split plain and vague, lots seen, open
 * orders, goods wanted by nobody (#15 onwards).
 */
export type Row = {
  readonly setting: string;
  readonly seed: number;
  readonly day: number;
  readonly location: string;
  readonly credits: number;
};

/**
 * The day as the tourist found it, read off the view and nothing else. The day
 * index is the one engine value the player never reads (ADR 0005 decision 3);
 * it is kept in the read model for exactly this, because a measurement needs to
 * line two campaigns up day by day.
 */
export function rowFor(setting: string, seed: number, read: View): Row {
  return {
    setting,
    seed,
    day: read.today.day,
    location: read.here.name,
    credits: read.credits.credits,
  };
}

const COLUMNS = ['setting', 'seed', 'day', 'location', 'credits'] as const;

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

function field(value: string | number): string {
  if (typeof value === 'number') return String(value);
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}
