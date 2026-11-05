import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { readText } from '../tools/files';

/**
 * Reads a day CSV the harness wrote and prints **the curve through a campaign**: for
 * each setting and chosen day, the p10 / median / p90 of each chosen column
 * across seeds, as the Markdown table a play-test write-up quotes (#156). It
 * reads the file and never runs the harness.
 *
 *   npm run curves -- harness/out/run.csv --columns placesKnown,wantsSeenVague --days 1,5,10
 *   npm run curves -- harness/out/run.csv --typical wantsSeenPlain,placesKnown
 *
 * Never a mean. The columns on offer are the ones the CSV has: a column derived
 * from two is the reader's sum, not this script's.
 *
 * Process tooling, like the harness: typechecked and linted, not tested.
 */

/** How many seeds `--typical` prints beside the most typical one. */
const RUNNERS_UP = 4;

/**
 * Columns of the `.draw` file that hold the draw's shape rather than what is
 * wanted in it. The vague-answer buckets count wants, which a setting is
 * expected to change, so they are not part of the comparison.
 */
const DRAW_SHAPE_COLUMNS = [
  'motifs',
  'locations',
  'kinds',
  'goods',
  'usableKinds',
  'goodsPerUsableKind',
] as const;

type Table = {
  readonly header: readonly string[];
  readonly rows: readonly Record<string, string>[];
};

type Args = {
  readonly path: string;
  readonly columns: readonly string[] | null;
  readonly days: readonly number[] | null;
  readonly typical: readonly string[] | null;
};

function main(): void {
  const args = readArgs(process.argv.slice(2));
  const table = readCsv(args.path);
  for (const needed of ['setting', 'seed', 'day']) {
    if (!table.header.includes(needed)) {
      throw new Error(`${args.path} has no \`${needed}\` column, so it is not a harness day CSV`);
    }
  }

  const settings = distinct(table.rows.map((row) => row.setting ?? ''));
  const days = distinct(table.rows.map((row) => Number(row.day))).sort((a, b) => a - b);

  if (args.columns !== null) {
    const chosenDays = args.days ?? days;
    for (const day of chosenDays) {
      if (!days.includes(day)) throw new Error(`${args.path} has no day ${day}`);
    }
    console.log(
      curves(table, settings, numericColumns(table, args.columns, args.path), chosenDays),
    );
  }
  if (args.typical !== null) {
    const columns = numericColumns(table, args.typical, args.path);
    console.log(typical(table, settings, columns, days[days.length - 1] ?? 0));
  }
  console.log(sameDrawShape(drawPathFor(args.path), settings));
}

const USAGE = 'usage: npm run curves -- <day.csv> [--columns a,b --days 1,5,10] [--typical a,b]';

/**
 * Node's own `parseArgs` owns the command line: unknown flags, a flag with no
 * value and stray words are its to refuse. What is left here is what it cannot
 * know — turning text into lists and days, and which flags need which.
 */
function readArgs(argv: string[]): Args {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        columns: { type: 'string' },
        days: { type: 'string' },
        typical: { type: 'string' },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (trouble) {
    throw new Error(`${trouble instanceof Error ? trouble.message : String(trouble)}\n${USAGE}`, {
      cause: trouble,
    });
  }
  const { values, positionals } = parsed;
  const [path, ...extra] = positionals;
  if (path === undefined) throw new Error(USAGE);
  if (extra.length > 0)
    throw new Error(`one CSV at a time, not ${extra.join(' ')} as well\n${USAGE}`);

  const columns = listOf(values.columns);
  const typicalColumns = listOf(values.typical);
  if (columns === null && typicalColumns === null) {
    throw new Error(`name --columns, --typical or both\n${USAGE}`);
  }
  const days = listOf(values.days)?.map((each) => {
    const day = Number(each);
    if (!Number.isInteger(day)) throw new Error(`--days takes whole days, not ${each}`);
    return day;
  });
  if (days !== undefined && columns === null) {
    throw new Error('--days chooses the cells of the --columns table, so it needs --columns');
  }
  return { path, columns, days: days ?? null, typical: typicalColumns };
}

/** A comma-separated flag as a list, or null when the flag was not given. */
function listOf(value: string | undefined): string[] | null {
  if (value === undefined) return null;
  return value
    .split(',')
    .map((each) => each.trim())
    .filter((each) => each !== '');
}

/**
 * The cells, one per setting and day, each `p10/median/p90` across seeds. A
 * row is a column at a setting, so the settings of one column sit together and
 * read as a diff.
 */
function curves(
  table: Table,
  settings: readonly string[],
  columns: readonly string[],
  days: readonly number[],
): string {
  const lines = [
    `| column | setting | ${days.map((day) => `d${day}`).join(' | ')} |`,
    `|---|---|${days.map(() => '---').join('|')}|`,
  ];
  for (const column of columns) {
    for (const setting of settings) {
      const cells = days.map((day) => {
        const values = valuesOn(table, setting, day, column);
        return [0.1, 0.5, 0.9].map((share) => percentile(values, share)).join('/');
      });
      lines.push(`| \`${column}\` | ${setting} | ${cells.join(' | ')} |`);
    }
  }
  return lines.join('\n');
}

/**
 * The seed closest to the median on the last day, summed across every chosen
 * column at every setting: the seed to hand-play when the question is what a
 * campaign is usually like. Distances are in each column's own units, unweighted.
 */
function typical(
  table: Table,
  settings: readonly string[],
  columns: readonly string[],
  day: number,
): string {
  const lastDay = table.rows.filter((row) => Number(row.day) === day);
  const distance = new Map<number, number>();
  for (const setting of settings) {
    for (const column of columns) {
      const median = percentile(valuesOn(table, setting, day, column), 0.5);
      for (const row of lastDay.filter((each) => each.setting === setting)) {
        const seed = Number(row.seed);
        distance.set(seed, (distance.get(seed) ?? 0) + Math.abs(Number(row[column]) - median));
      }
    }
  }
  const ranked = [...distance.entries()].sort(([a, far], [b, farther]) => far - farther || a - b);
  const [best, ...rest] = ranked;
  if (best === undefined) return 'No seed reaches the last day.';
  const named = ([seed, far]: [number, number]): string => `seed ${seed} (${far})`;
  return [
    `Most typical on day ${day}, by summed distance from the median of ` +
      `${columns.join(', ')} across ${settings.join(', ')}: **${named(best)}**.`,
    `Runners-up: ${rest.slice(0, RUNNERS_UP).map(named).join(', ') || 'none'}.`,
  ].join('\n');
}

/**
 * Whether every setting drew the same galaxy for each seed, read off the
 * `.draw` file beside the day file. A diff between settings is meaningless for
 * a seed that drew two galaxies, so the answer is printed with every run.
 *
 * The draw file holds the draw's shape, not the galaxy, so agreement here is
 * necessary and not sufficient. What it can rule out, it rules out.
 */
function sameDrawShape(drawPath: string, settings: readonly string[]): string {
  if (settings.length < 2) return 'One setting, so there is no draw to compare.';
  if (!existsSync(drawPath)) {
    return `No ${drawPath} beside it, so whether the settings drew the same galaxy is unchecked.`;
  }
  const draws = readCsv(drawPath);
  const compared = DRAW_SHAPE_COLUMNS.filter((column) => draws.header.includes(column));
  const bySeed = new Map<string, Record<string, string>[]>();
  for (const row of draws.rows) {
    const seed = row.seed ?? '';
    bySeed.set(seed, [...(bySeed.get(seed) ?? []), row]);
  }
  const differ: string[] = [];
  for (const [seed, rows] of bySeed) {
    const shapes = rows.map((row) => compared.map((column) => row[column]).join(','));
    if (new Set(shapes).size > 1) {
      const columns = compared.filter((column) => new Set(rows.map((row) => row[column])).size > 1);
      differ.push(`seed ${seed} (${columns.join(', ')})`);
    }
  }
  if (differ.length === 0) {
    return (
      `Every seed had the same draw shape at every setting ` +
      `(${compared.join(', ')} in ${drawPath}).`
    );
  }
  return (
    `**${differ.length} of ${bySeed.size} seeds drew a different galaxy between settings**, ` +
    `so a diff between settings on them is not the setting's effect: ${differ.join('; ')}.`
  );
}

function valuesOn(table: Table, setting: string, day: number, column: string): number[] {
  return table.rows
    .filter((row) => row.setting === setting && Number(row.day) === day)
    .map((row) => Number(row[column]));
}

/**
 * Nearest rank: always a value some seed had, so a count reads as a count and
 * the table never shows a seed with 2.4 places known.
 */
function percentile(values: readonly number[], share: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil(share * sorted.length));
  return sorted[rank - 1] ?? Number.NaN;
}

/** The named columns, each one the CSV has and each one a number on every row. */
function numericColumns(table: Table, columns: readonly string[], path: string): string[] {
  for (const column of columns) {
    if (!table.header.includes(column)) {
      throw new Error(`${path} has no \`${column}\`. It has: ${table.header.join(', ')}`);
    }
    const numeric = (field = ''): boolean => field.trim() !== '' && Number.isFinite(Number(field));
    if (table.rows.some((row) => !numeric(row[column]))) {
      throw new Error(`\`${column}\` in ${path} is not a number on every row`);
    }
  }
  return [...columns];
}

/** `run.csv` has `run.draw.csv` beside it, as the harness writes them. */
function drawPathFor(path: string): string {
  return path.replace(/(\.csv)?$/, '.draw.csv');
}

function distinct<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function readCsv(path: string): Table {
  const text = readText(path, 'nothing can be read off it');
  const [header = [], ...records] = parseCsv(text);
  const rows = records.map((record) =>
    Object.fromEntries(header.map((column, at) => [column, record[at] ?? ''])),
  );
  return { header, rows };
}

/** RFC 4180 as the harness writes it: a field is quoted when it holds a comma, quote or newline. */
function parseCsv(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  for (let at = 0; at < text.length; at += 1) {
    const char = text[at];
    if (quoted) {
      if (char === '"' && text[at + 1] === '"') {
        field += '"';
        at += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      record.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[at + 1] === '\n') at += 1;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
}

try {
  main();
} catch (trouble) {
  console.error(`curves: ${trouble instanceof Error ? trouble.message : String(trouble)}`);
  process.exit(1);
}
