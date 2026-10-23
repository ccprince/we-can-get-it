import { readJson } from './files';

/**
 * The harness's own config, read from its own file (ADR 0009 decision 5). It is
 * not content and not engine configuration: it is the shape of a measurement
 * run — which content sets, how many seeds, how many days, and where the CSV
 * lands.
 *
 * Every number in it is a knob for the designer to turn between runs, which is
 * why they live here rather than in the code. None of them is a finding.
 */

/**
 * How the **tourist** moves, which is itself a measurement input: what a
 * player is exposed to depends on how they move (#6), so it is a knob here
 * rather than a hardcode in the policy.
 *
 * - `stay` — never departs. The exposure of one location, and the baseline the
 *   other two are read against.
 * - `nearest` — departs along the flyable lane of fewest days, so a run is
 *   many landings and little time in transit.
 * - `farthest` — departs along the flyable lane of most days, so a run is few
 *   landings and long hauls.
 *
 * All three are stateless reads of the chart, because a policy is handed a view
 * and nothing else. A rule that avoided flying straight back the way it came
 * would need the policy to remember, which is a later knob if a run asks for
 * it.
 */
export const routeRules = ['stay', 'nearest', 'farthest'] as const;

export type RouteRule = (typeof routeRules)[number];

/**
 * One **setting** the run measures. A setting is isolated from the **draw** by
 * running every setting over the same seeds in one pass, which is the method
 * findings §5.4 asks for: one seed played twice at two settings.
 *
 * A setting varies by its content set, where the ratios being tuned live, and
 * by the tourist's **route rule** (#9). Later tickets add the knobs they
 * introduce.
 */
export type Setting = {
  readonly name: string;
  readonly contentPath: string;
  readonly route: RouteRule;
};

export type HarnessConfig = {
  /** Days per campaign. A campaign here stops; it is not won (#6, out of scope). */
  readonly days: number;
  /** Seeds are `firstSeed`, `firstSeed + 1`, … so that a run is reproducible from two numbers. */
  readonly firstSeed: number;
  readonly seedCount: number;
  readonly out: string;
  readonly settings: readonly Setting[];
};

/**
 * Reads and checks the config. A bad config throws, and `run.ts` reports it and
 * stops: a measurement taken against a half-understood config is worse than no
 * measurement.
 */
export function readConfig(path: string): HarnessConfig {
  const raw: unknown = readJson(path, 'there is no run to make');
  if (!isObject(raw)) throw new Error(`${path} is not an object`);

  return {
    days: whole(raw.days, 'days', 1),
    firstSeed: whole(raw.firstSeed, 'firstSeed', 0),
    seedCount: whole(raw.seedCount, 'seedCount', 1),
    out: text(raw.out, 'out'),
    settings: readSettings(raw.settings),
  };
}

export function seedsOf(config: HarnessConfig): readonly number[] {
  return Array.from({ length: config.seedCount }, (_, index) => config.firstSeed + index);
}

function readSettings(raw: unknown): readonly Setting[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('settings names no settings to measure');
  }
  return raw.map((entry, index) => {
    const where = `settings[${index}]`;
    if (!isObject(entry)) throw new Error(`${where} is not an object`);
    return {
      name: text(entry.name, `${where}.name`),
      contentPath: text(entry.contentPath, `${where}.contentPath`),
      route: route(entry.route, `${where}.route`),
    };
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, where: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${where} is missing or not a line of text`);
  }
  return value;
}

function whole(value: unknown, where: string, least: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${where} is missing or not a whole number`);
  }
  if (value < least) throw new Error(`${where} is ${value}, which is less than ${least}`);
  return value;
}

/**
 * The route rule, named rather than defaulted: a measurement taken against a
 * knob nobody set is a measurement nobody can report.
 */
function route(value: unknown, where: string): RouteRule {
  const named = routeRules.find((rule) => rule === value);
  if (named === undefined) {
    throw new Error(`${where} is ${String(value)}, and not one of ${routeRules.join(', ')}`);
  }
  return named;
}
