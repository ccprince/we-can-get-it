import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { isRejected, loadContent, startCampaign, takeCommand, view } from '../src/engine';
import type { ContentSet } from '../src/engine';
import { readConfig, seedsOf, type HarnessConfig, type Setting } from './config';
import { readJson } from './files';
import { rowFor, toCsv, type Row } from './csv';
import { tourist, type Policy } from './policy';

/**
 * The measurement harness: a separate Node entry point with its own config,
 * importing the same engine module the page does (ADR 0009 decision 5). It is a
 * **throw-away instrument** and it has no tests of its own — what is tested is
 * the queries it reads, through the engine's public seam (#8).
 *
 * It is built now, while the engine is nearly empty, on purpose: instrument
 * before redesigning, and report the curve through a run rather than the mean
 * (findings §5.4). Writing it against the seam before the engine's interior
 * exists is what forces the queries to answer in per-day, player-facing terms.
 *
 *   npm run harness                         — the config at harness/harness.config.json
 *   npm run harness -- harness/other.json   — a variant config, for one run
 *
 * It gives counts and shape. It cannot give a verdict; verdicts come from
 * hand-play (#23).
 */

const DEFAULT_CONFIG = 'harness/harness.config.json';

/**
 * A setting with its content set loaded, before a single day is run.
 *
 * Deliberately not called a galaxy: a **drawn galaxy** is what the **draw**
 * produced for one campaign, and this is the **reserve** side of the line —
 * one content set, shared by every seed the run plays.
 */
type LoadedSetting = {
  readonly setting: Setting;
  readonly content: ContentSet;
};

function main(): void {
  const configPath = process.argv[2] ?? DEFAULT_CONFIG;
  const config = readConfig(configPath);
  const policy = tourist;

  // Every content set is loaded up front, so a content mistake stops the run
  // before any of it is measured. Never a measurement against a silently
  // patched galaxy (ADR 0003 decision 3).
  const loaded = config.settings.map(load);

  const rows = measure(config, loaded, policy);
  write(config.out, toCsv(rows));

  console.log(
    `${policy.name}: ${many(seedsOf(config).length, 'seed')} × ${many(config.settings.length, 'setting')}` +
      ` × ${many(config.days, 'day')} = ${many(rows.length, 'row')} -> ${config.out}`,
  );
}

function many(count: number, thing: string): string {
  return `${count} ${thing}${count === 1 ? '' : 's'}`;
}

function load(setting: Setting): LoadedSetting {
  const raw = readJson(setting.contentPath, `${setting.name} cannot be measured`);
  const loaded = loadContent(raw);

  for (const report of loaded.reports) {
    console.log(`note, ${setting.name}: ${report.where}: ${report.what}`);
  }

  if (!loaded.ok) {
    const named = loaded.problems.map((problem) => `  ${problem.where}: ${problem.what}`);
    throw new Error(
      [`${setting.contentPath} will not load, so ${setting.name} cannot be measured:`, ...named].join(
        '\n',
      ),
    );
  }
  return { setting, content: loaded.content };
}

/**
 * Seed-major, so that the same seed at every setting sits together in the CSV:
 * the comparison the method asks for is one seed at two settings, and that
 * wants to be a short diff rather than a join.
 */
function measure(
  config: HarnessConfig,
  loaded: readonly LoadedSetting[],
  policy: Policy,
): readonly Row[] {
  const rows: Row[] = [];
  for (const seed of seedsOf(config)) {
    for (const setting of loaded) {
      rows.push(...measureCampaign(setting, seed, config.days, policy));
    }
  }
  return rows;
}

/**
 * One campaign, independent of every other: it is started from its own seed and
 * the engine's functions are pure, so nothing carries over (ADR 0003
 * decision 1).
 *
 * A row is the day as the policy found it, recorded before the day's command is
 * taken — so `days` days give `days` rows, each one a day somebody lived through
 * rather than the state they left behind.
 */
function measureCampaign(
  loaded: LoadedSetting,
  seed: number,
  days: number,
  policy: Policy,
): readonly Row[] {
  const { setting, content } = loaded;
  const rows: Row[] = [];
  let campaign = startCampaign(content, seed);

  for (let count = 0; count < days; count += 1) {
    const read = view(campaign);
    rows.push(rowFor(setting.name, seed, read));

    const result = takeCommand(campaign, policy.chooseCommand(read));
    if (isRejected(result)) {
      throw new Error(
        `${setting.name}, seed ${seed}: the engine refused ${policy.name}'s command` +
          ` — ${result.rejected.message}`,
      );
    }
    campaign = result.campaign;
  }
  return rows;
}

function write(out: string, csv: string): void {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, csv, 'utf8');
}

try {
  main();
} catch (trouble) {
  console.error(`harness: ${trouble instanceof Error ? trouble.message : String(trouble)}`);
  process.exit(1);
}
