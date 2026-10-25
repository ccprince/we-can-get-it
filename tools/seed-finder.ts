import { drawGalaxy, loadContent } from '../src/engine';
import type { ContentSet, DrawnGalaxy } from '../src/engine';
// A content set read off disk reads the same here as it does for the harness,
// and an unreadable path should say the same thing to both (#8). One message
// beats two that drift.
import { readJson } from '../harness/files';

/**
 * The **seed-finder**: given a content set, a predicate over a drawn galaxy and
 * a bound to search within, it reports the seeds that satisfy the predicate.
 *
 * A test whose assertion is about a seeded **draw** needs a seed that produces
 * the galaxy the test is about, and hand-searching for one is the kind of chore
 * that quietly stops such tests from being written (findings §5.4). So the
 * search is a command, and the predicate is written down beside the seed it
 * found: when the content changes, the seed is re-found by running the same
 * command again rather than guessed at a second time.
 *
 *   npm run seeds -- content/walking-skeleton.json start-is tallow
 *   npm run seeds -- content/walking-skeleton.json kind-goods ore 3 --bound 2000
 *
 * It draws through the draw's **reporting mode** and never starts a campaign:
 * the galaxy a seed gives is the whole of what a predicate reads, and a report
 * that went through `startCampaign` could disagree with one that did not
 * (ADR 0008 decision 18).
 *
 * Process tooling, like the harness and the frontier query: typechecked and
 * linted, not tested. What is tested is the seam it reads, through the engine's
 * public module (ADR 0003 decision 5, ADR 0009 decision 5).
 */

const DEFAULT_FROM = 1;
const DEFAULT_BOUND = 1000;
const DEFAULT_MOST = 5;

/**
 * One kind of predicate the finder knows, with the arity its arguments give it.
 *
 * `make` is handed the content set as well as the arguments, so an argument
 * that names nothing in the **reserve** — a mistyped location id, a kind that
 * does not exist — is a mistake in the asking and said so. Reporting "no seed
 * satisfies it" for a typo would be an honest sentence about a question nobody
 * meant to ask.
 */
type PredicateKind = {
  readonly name: string;
  /** One entry per argument, for the usage line; its length is the arity. */
  readonly takes: readonly string[];
  readonly what: string;
  readonly make: (args: readonly string[], content: ContentSet) => (galaxy: DrawnGalaxy) => boolean;
};

/**
 * The predicates, each one earned by a search somebody wanted: where the
 * campaign opens, what the catalogue came out at, what was placed, and the
 * shape of the map around the start. A search nobody has needed yet is not
 * here; adding one is a few lines and a line of usage.
 */
const predicateKinds: readonly PredicateKind[] = [
  {
    name: 'start-is',
    takes: ['<location id>'],
    what: 'the campaign opens at that location',
    make: (args, content) => {
      const id = locationId(args[0], content);
      return (galaxy) => galaxy.startId === id;
    },
  },
  {
    name: 'archetype-placed',
    takes: ['<archetype id>'],
    what: 'at least one location of that archetype was drawn',
    make: (args, content) => {
      const archetype = archetypeId(args[0], content);
      return (galaxy) => galaxy.locations.some((location) => location.archetype === archetype);
    },
  },
  {
    name: 'kind-goods',
    takes: ['<kind id>', '<least>'],
    what: 'that kind came out of the draw with at least that many goods',
    make: (args, content) => {
      const kind = kindId(args[0], content);
      const least = whole(args[1], 'least', 1);
      return (galaxy) => galaxy.goods.filter((good) => good.kind === kind).length >= least;
    },
  },
  {
    name: 'spur-off-start',
    takes: [],
    what: 'a lane runs from the start to a location that no other lane touches',
    make: () => (galaxy) => {
      const lanes = lanesPerLocation(galaxy);
      return neighboursOf(galaxy, galaxy.startId).some((neighbour) => lanes.get(neighbour) === 1);
    },
  },
];

/** How many lanes touch each location the draw placed, by location id. */
function lanesPerLocation(galaxy: DrawnGalaxy): Map<string, number> {
  const counted = new Map<string, number>();
  for (const location of galaxy.locations) counted.set(location.id, 0);
  for (const lane of galaxy.lanes) {
    for (const end of lane.ends) counted.set(end, (counted.get(end) ?? 0) + 1);
  }
  return counted;
}

/** The locations one lane away, in the order the draw laid the lanes. */
function neighboursOf(galaxy: DrawnGalaxy, locationId: string): readonly string[] {
  return galaxy.lanes
    .filter((lane) => lane.ends.includes(locationId))
    .map((lane) => (lane.ends[0] === locationId ? lane.ends[1] : lane.ends[0]));
}

function locationId(asked: string | undefined, content: ContentSet): string {
  return oneOf(
    asked,
    'location id',
    content.locations.map((location) => location.id),
  );
}

function archetypeId(asked: string | undefined, content: ContentSet): string {
  return oneOf(
    asked,
    'archetype id',
    content.archetypes.map((archetype) => archetype.id),
  );
}

function kindId(asked: string | undefined, content: ContentSet): string {
  const kinds = content.tags.filter((tag) => tag.class === 'kind');
  return oneOf(
    asked,
    'kind',
    kinds.map((tag) => tag.id),
  );
}

/**
 * An argument that must name something the reserve holds. The alternatives are
 * listed, because the useful half of "there is no such kind" is which kinds
 * there are.
 */
function oneOf(asked: string | undefined, what: string, known: readonly string[]): string {
  if (asked !== undefined && known.includes(asked)) return asked;
  throw new Error(
    `${String(asked)} is not a ${what} the content set holds; it holds ${known.join(', ')}`,
  );
}

function whole(asked: string | undefined, what: string, least: number): number {
  const value = Number(asked);
  if (!Number.isInteger(value) || value < least) {
    throw new Error(`${what} is ${String(asked)}, and not a whole number of ${least} or more`);
  }
  return value;
}

/** What was asked for: the predicate, and the bound to search it within. */
type Asked = {
  /** The predicate's name and arguments as typed, which is what a test records. */
  readonly predicate: string;
  /** The predicate asked for, already built against the content set. */
  readonly holds: (galaxy: DrawnGalaxy) => boolean;
  readonly from: number;
  readonly bound: number;
  readonly most: number;
};

/**
 * The command line split once: the flags with their values, and the positional
 * words in the order they were typed. Split before the content set is read,
 * because the path is positional and the predicate cannot be parsed until the
 * reserve it names things from has loaded.
 */
type Words = {
  readonly flags: ReadonlyMap<string, string>;
  readonly rest: readonly string[];
};

const FLAGS = ['--from', '--bound', '--most'];

function split(argv: readonly string[]): Words {
  const flags = new Map<string, string>();
  const rest: string[] = [];
  for (let at = 0; at < argv.length; at += 1) {
    const arg = argv[at] ?? '';
    if (!arg.startsWith('--')) {
      rest.push(arg);
      continue;
    }
    if (!FLAGS.includes(arg)) {
      throw new Error(`${arg} is not a flag this script takes.\n\n${usage()}`);
    }
    const value = argv[at + 1];
    if (value === undefined) throw new Error(`${arg} was given no value.\n\n${usage()}`);
    flags.set(arg, value);
    at += 1;
  }
  return { flags, rest };
}

/** The content path, which is the first positional word. */
function pathIn(words: Words): string {
  const path = words.rest[0];
  if (path === undefined) throw new Error(usage());
  return path;
}

/**
 * Which predicate was asked for, and whether it was given the arguments it
 * takes. Read before the content set, so a misspelt predicate is answered with
 * the usage rather than with a content set's load notes.
 */
function kindIn(words: Words): PredicateKind {
  const [, name, ...args] = words.rest;
  if (name === undefined) throw new Error(usage());
  const kind = predicateKinds.find((candidate) => candidate.name === name);
  if (kind === undefined) throw new Error(`there is no predicate ${name}.\n\n${usage()}`);
  if (args.length !== kind.takes.length) {
    throw new Error(
      `${kind.name} takes ${kind.takes.length} argument(s), and was given ${args.length}.` +
        `\n\n${usage()}`,
    );
  }
  return kind;
}

/**
 * The rest of what was asked for, read once the content set is in hand: the
 * predicate built against the reserve, and the bound to search within.
 */
function asking(words: Words, kind: PredicateKind, content: ContentSet): Asked {
  const { flags } = words;
  const args = words.rest.slice(2);

  return {
    predicate: [kind.name, ...args].join(' '),
    holds: kind.make(args, content),
    from: flagged(flags, '--from', DEFAULT_FROM, 0),
    bound: flagged(flags, '--bound', DEFAULT_BOUND, 1),
    most: flagged(flags, '--most', DEFAULT_MOST, 1),
  };
}

function flagged(
  flags: ReadonlyMap<string, string>,
  flag: string,
  fallback: number,
  least: number,
): number {
  const given = flags.get(flag);
  return given === undefined ? fallback : whole(given, flag, least);
}

function usage(): string {
  const lines = predicateKinds.map(
    (kind) => `  ${[kind.name, ...kind.takes].join(' ')}\n      ${kind.what}`,
  );
  return [
    'Usage: npm run seeds -- <content path> <predicate> [argument …]' +
      ' [--from <seed>] [--bound <seeds>] [--most <reported>]',
    '',
    'Predicates:',
    ...lines,
  ].join('\n');
}

/**
 * The content set, loaded through the one validator both the page and the
 * harness use (ADR 0009 decision 6). A content set that will not load stops the
 * search: a seed found against content the game would refuse is no answer.
 * Reports are printed, because a search is a thing a designer runs and they are
 * the writer's to judge.
 */
function contentAt(path: string): ContentSet {
  const raw = readJson(path, 'there are no seeds to search');
  const loaded = loadContent(raw);
  for (const report of loaded.reports) console.log(`note: ${report.where}: ${report.what}`);
  if (!loaded.ok) {
    const named = loaded.problems.map((problem) => `  ${problem.where}: ${problem.what}`);
    throw new Error(
      [`${path} will not load, so there are no seeds to search:`, ...named].join('\n'),
    );
  }
  return loaded.content;
}

/**
 * What the search found. A seed whose draw fails is counted rather than
 * ignored: on a content set that re-rolls hard, "none satisfied it" and "most
 * of them never drew" are two different answers.
 */
type Found = {
  readonly satisfying: readonly number[];
  readonly undrawable: number;
};

function search(
  content: ContentSet,
  holds: (galaxy: DrawnGalaxy) => boolean,
  from: number,
  bound: number,
): Found {
  const satisfying: number[] = [];
  let undrawable = 0;
  for (let seed = from; seed < from + bound; seed += 1) {
    const drawn = drawGalaxy(content, seed);
    if (!drawn.ok) {
      undrawable += 1;
      continue;
    }
    if (holds(drawn.galaxy)) satisfying.push(seed);
  }
  return { satisfying, undrawable };
}

/**
 * The report. **A miss is reported as a miss**: no nearest seed, no partial
 * satisfaction, nothing that could be mistaken for an answer. A seed that
 * nearly produces the galaxy a test is about produces a different galaxy, and
 * the test would assert against it.
 */
function report(contentPath: string, asked: Asked, found: Found): readonly string[] {
  const { satisfying, undrawable } = found;
  const last = asked.from + asked.bound - 1;
  const drew = asked.bound - undrawable;
  const missed =
    undrawable === 0 ? '' : ` ${undrawable} of them would not draw at all, so ${drew} were judged.`;

  if (satisfying.length === 0) {
    // Nothing drew at all is a different answer from nothing satisfied it, and
    // widening the bound is no advice for a content set that will not draw.
    const next =
      drew === 0
        ? 'Not one of them drew a galaxy, so the predicate was never asked: ' +
          'the content set is what to look at.'
        : 'Widen the search with --bound, or ask for less.';
    return [
      `no seed from ${asked.from} to ${last} satisfies \`${asked.predicate}\`.${missed}`,
      next,
    ];
  }

  const shown = satisfying.slice(0, asked.most);
  const more =
    satisfying.length > shown.length
      ? ` (the first ${shown.length} of ${satisfying.length}; --most reports more)`
      : '';
  return [
    `seeds satisfying \`${asked.predicate}\` over ${contentPath}${more}:`,
    `  ${shown.join('  ')}`,
    `${satisfying.length} of the ${asked.bound} seeds from ${asked.from} satisfy it.${missed}`,
  ];
}

function main(): void {
  const words = split(process.argv.slice(2));
  const contentPath = pathIn(words);
  const kind = kindIn(words);

  // The predicate's arguments are checked against the reserve, so the content
  // set is loaded between naming the predicate and building it: `start-is
  // tallow` can only be judged a sound question once there is a reserve.
  const content = contentAt(contentPath);
  const asked = asking(words, kind, content);
  const found = search(content, asked.holds, asked.from, asked.bound);

  console.log(report(contentPath, asked, found).join('\n'));
}

try {
  main();
} catch (trouble) {
  console.error(`seeds: ${trouble instanceof Error ? trouble.message : String(trouble)}`);
  process.exit(1);
}
