import { drawGalaxy, loadContent } from '../src/engine';
import type { ContentSet, DrawnGalaxy } from '../src/engine';
// A content set read off disk reads the same here as it does for the harness,
// and an unreadable path should say the same thing to both (#8). One message
// beats two that drift, and it sits on this side of the line because the
// harness is the throw-away one.
import { readJson } from './files';

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
 * **Every satisfying seed is reported, and the search starts at seed 1.** Both
 * are so that a recorded command is a question with one answer: a report that
 * showed the first few of them, or that began wherever a flag said, would
 * re-find a different seed than the one written down. The bound is the only
 * knob, because it is the only one #13 asks for.
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

/** Where every search starts, so a recorded command has one answer. */
const FIRST_SEED = 1;

const DEFAULT_BOUND = 1000;

/** Seeds per line of the report, so a few hundred of them stay readable. */
const PER_LINE = 12;

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
      const id = oneOf(args[0], 'location id', idsOf(content.locations));
      return (galaxy) => galaxy.startId === id;
    },
  },
  {
    name: 'archetype-placed',
    takes: ['<archetype id>'],
    what: 'at least one location of that archetype was drawn',
    make: (args, content) => {
      const archetype = oneOf(args[0], 'archetype id', idsOf(content.archetypes));
      return (galaxy) => galaxy.locations.some((location) => location.archetype === archetype);
    },
  },
  {
    name: 'kind-goods',
    takes: ['<kind id>', '<least>'],
    what: 'that kind came out of the draw with at least that many goods',
    make: (args, content) => {
      const kinds = content.tags.filter((tag) => tag.class === 'kind');
      const kind = oneOf(args[0], 'kind', idsOf(kinds));
      const least = whole(args[1], 'least', 1);
      return (galaxy) => galaxy.goods.filter((good) => good.kind === kind).length >= least;
    },
  },
  {
    /**
     * Note that the walking skeleton declares `startHub.spurs`, so every seed
     * it draws satisfies this and the search is a formality there. It
     * discriminates on a content set that asks for no spur off the start.
     */
    name: 'spur-off-start',
    takes: [],
    what: 'a lane runs from the start to a location that no other lane touches',
    make: () => (galaxy) => {
      const neighbours = neighboursOf(galaxy);
      return (neighbours.get(galaxy.startId) ?? []).some(
        (neighbour) => (neighbours.get(neighbour) ?? []).length === 1,
      );
    },
  },
];

function idsOf(named: readonly { readonly id: string }[]): readonly string[] {
  return named.map((one) => one.id);
}

/**
 * The locations one lane away from each location the draw placed, by location
 * id, in the order the draw laid the lanes — derived order (ADR 0009
 * decision 3). **Distinct**, so a second lane between the same two places
 * cannot make a leaf look like a junction.
 */
function neighboursOf(galaxy: DrawnGalaxy): Map<string, readonly string[]> {
  const joined = new Map<string, string[]>();
  for (const location of galaxy.locations) joined.set(location.id, []);
  for (const lane of galaxy.lanes) {
    const [one, other] = lane.ends;
    join(joined, one, other);
    join(joined, other, one);
  }
  return joined;
}

function join(joined: Map<string, string[]>, at: string, neighbour: string): void {
  const known = joined.get(at) ?? [];
  if (!known.includes(neighbour)) known.push(neighbour);
  joined.set(at, known);
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
  readonly bound: number;
};

/**
 * The command line, decoded in **one place**: the flags with their values, the
 * content set to search, and the predicate asked for by name with the arguments
 * given to it. Nothing downstream reads a positional word by its index.
 */
type Words = {
  readonly flags: ReadonlyMap<string, string>;
  readonly contentPath: string;
  readonly name: string;
  readonly args: readonly string[];
};

const FLAGS = ['--bound'];

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

  const [contentPath, name, ...args] = rest;
  if (contentPath === undefined || name === undefined) throw new Error(usage());
  return { flags, contentPath, name, args };
}

/**
 * Which predicate was asked for, and whether it was given the arguments it
 * takes. Read before the content set, so a misspelt predicate is answered with
 * the usage rather than with a content set's load notes.
 */
function predicateNamed(words: Words): PredicateKind {
  const named = predicateKinds.find((candidate) => candidate.name === words.name);
  if (named === undefined) {
    throw new Error(`there is no predicate ${words.name}.\n\n${usage()}`);
  }
  if (words.args.length !== named.takes.length) {
    throw new Error(
      `${named.name} takes ${named.takes.length} argument(s), and was given ` +
        `${words.args.length}.\n\n${usage()}`,
    );
  }
  return named;
}

/**
 * The rest of what was asked for, read once the content set is in hand: the
 * predicate built against the reserve, and the bound to search within.
 */
function asking(words: Words, named: PredicateKind, content: ContentSet): Asked {
  const bound = words.flags.get('--bound');
  return {
    predicate: [named.name, ...words.args].join(' '),
    holds: named.make(words.args, content),
    bound: bound === undefined ? DEFAULT_BOUND : whole(bound, '--bound', 1),
  };
}

function usage(): string {
  const lines = predicateKinds.map(
    (kind) => `  ${[kind.name, ...kind.takes].join(' ')}\n      ${kind.what}`,
  );
  return [
    'Usage: npm run seeds -- <content path> <predicate> [argument …] [--bound <seeds>]',
    '',
    `The search runs from seed ${FIRST_SEED} and reports every seed that satisfies the predicate.`,
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

function search(content: ContentSet, asked: Asked): Found {
  const satisfying: number[] = [];
  let undrawable = 0;
  for (let seed = FIRST_SEED; seed < FIRST_SEED + asked.bound; seed += 1) {
    const drawn = drawGalaxy(content, seed);
    if (!drawn.ok) {
      undrawable += 1;
      continue;
    }
    if (asked.holds(drawn.galaxy)) satisfying.push(seed);
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
  const last = FIRST_SEED + asked.bound - 1;
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
      `no seed from ${FIRST_SEED} to ${last} satisfies \`${asked.predicate}\`.${missed}`,
      next,
    ];
  }

  return [
    `seeds satisfying \`${asked.predicate}\` over ${contentPath}, first of them ${satisfying[0]}:`,
    ...inLines(satisfying),
    `${satisfying.length} of the ${asked.bound} seeds from ${FIRST_SEED} satisfy it.${missed}`,
  ];
}

function inLines(seeds: readonly number[]): readonly string[] {
  const lines: string[] = [];
  for (let at = 0; at < seeds.length; at += PER_LINE) {
    lines.push(`  ${seeds.slice(at, at + PER_LINE).join('  ')}`);
  }
  return lines;
}

function main(): void {
  const words = split(process.argv.slice(2));
  const named = predicateNamed(words);

  // The predicate's arguments are checked against the reserve, so the content
  // set is loaded between naming the predicate and building it: `start-is
  // tallow` can only be judged a sound question once there is a reserve.
  const content = contentAt(words.contentPath);
  const asked = asking(words, named, content);

  console.log(report(words.contentPath, asked, search(content, asked)).join('\n'));
}

try {
  main();
} catch (trouble) {
  console.error(`seeds: ${trouble instanceof Error ? trouble.message : String(trouble)}`);
  process.exit(1);
}
