import { execFileSync } from 'node:child_process';

/**
 * The **frontier query** from `docs/agents/issue-tracker.md`: a parent's open
 * children, minus any with an open blocker or an assignee, in parent order. The
 * first line is the answer to "what's the next thing to build?"; the rest show
 * what else is free (#46).
 *
 *   npm run frontier -- 6            — the frontier of #6
 *   npm run frontier -- 6 --graph    — and a Mermaid diagram of its dependency edges
 *   npm run frontier -- 6 --graph-only — the diagram alone, unfenced, for piping to a viewer
 *
 * Everything comes from one GraphQL call to the native sub-issue and dependency
 * edges, through `gh` so that `gh` owns auth and the repository. The output is
 * a view of the tracker, never a second copy of it. Reading the diagram — which
 * ticket is the real gate, which stand free — is not this script's job.
 *
 * Process tooling, like the harness: typechecked and linted, not tested.
 */

const MAX_CHILDREN = 100;
const MAX_BLOCKERS = 50;

type State = 'OPEN' | 'CLOSED';

type IssueRef = { readonly number: number; readonly title: string; readonly state: State };

type Child = IssueRef & {
  readonly assignees: { readonly totalCount: number };
  readonly blockedBy: { readonly totalCount: number; readonly nodes: readonly IssueRef[] };
};

type Parent = {
  readonly number: number;
  readonly title: string;
  readonly subIssues: { readonly totalCount: number; readonly nodes: readonly Child[] };
};

const QUERY = `
query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    issue(number: $number) {
      number
      title
      subIssues(first: ${MAX_CHILDREN}) {
        totalCount
        nodes {
          number
          title
          state
          assignees(first: 1) { totalCount }
          blockedBy(first: ${MAX_BLOCKERS}) { totalCount nodes { number title state } }
        }
      }
    }
  }
}`;

function fetchParent(number: number): Parent {
  // `{owner}` and `{repo}` are filled in by gh from the current checkout.
  const out = execFileSync(
    'gh',
    [
      'api',
      'graphql',
      '-F',
      'owner={owner}',
      '-F',
      'repo={repo}',
      '-F',
      `number=${number}`,
      '-f',
      `query=${QUERY}`,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  );
  const parsed = JSON.parse(out) as { data: { repository: { issue: Parent | null } } };
  const parent = parsed.data.repository.issue;
  if (parent === null) throw new Error(`#${number} is not an issue in this repository.`);
  return parent;
}

/** Refuse to answer from a truncated page rather than answer wrongly. */
function assertComplete(parent: Parent): void {
  assertPage(parent.subIssues, `#${parent.number}`, 'sub-issues', MAX_CHILDREN);
  for (const child of parent.subIssues.nodes) {
    assertPage(child.blockedBy, `#${child.number}`, 'blockers', MAX_BLOCKERS);
  }
}

function assertPage(
  page: { readonly totalCount: number; readonly nodes: readonly unknown[] },
  owner: string,
  what: string,
  max: number,
): void {
  if (page.totalCount > page.nodes.length) {
    throw new Error(
      `${owner} has ${page.totalCount} ${what}; this script reads only the first ${max}.`,
    );
  }
}

/** Open, unassigned, and every blocker closed — inside the parent or not. */
function isFree(child: Child): boolean {
  return (
    child.state === 'OPEN' &&
    child.assignees.totalCount === 0 &&
    child.blockedBy.nodes.every((blocker) => blocker.state === 'CLOSED')
  );
}

function frontierLines(frontier: readonly Child[]): string[] {
  return frontier.map((child) => `#${child.number}  ${child.title}`);
}

/** Mermaid reads `#name;` as an entity and `"` as the end of a label. */
function label(issue: IssueRef): string {
  const text = `#${issue.number} ${issue.title}`;
  return `"${text.replaceAll('#', '#35;').replaceAll('"', '#quot;')}"`;
}

function nodeId(issue: IssueRef): string {
  return `i${issue.number}`;
}

/**
 * Every child is a node, edgeless ones included; every edge into a child is
 * drawn, closed blockers included. A blocker from outside the parent is drawn
 * only while it is open, in its own style.
 */
function graphLines(parent: Parent, frontier: readonly Child[]): string[] {
  const children = parent.subIssues.nodes;
  const inside = new Set(children.map((child) => child.number));
  const free = new Set(frontier.map((child) => child.number));

  // Keyed by number; a Map keeps first-seen order, so the output is stable.
  const outside = new Map<number, IssueRef>();
  const edges: string[] = [];
  for (const child of children) {
    for (const blocker of child.blockedBy.nodes) {
      const isOutside = !inside.has(blocker.number);
      if (isOutside && blocker.state === 'CLOSED') continue;
      if (isOutside) outside.set(blocker.number, blocker);
      edges.push(`  ${nodeId(blocker)} --> ${nodeId(child)}`);
    }
  }

  const styleOf = (child: Child): string =>
    child.state === 'CLOSED' ? 'closed' : free.has(child.number) ? 'frontier' : 'open';

  return [
    'graph TD',
    '  classDef closed fill:#e5e5e5,stroke:#999,color:#777',
    '  classDef frontier fill:#d6f5d6,stroke:#2e8b2e,stroke-width:2px',
    '  classDef open fill:#fff,stroke:#333',
    '  classDef outside fill:#fff4d6,stroke:#c08a00,stroke-dasharray:4 3',
    ...children.map((child) => `  ${nodeId(child)}[${label(child)}]:::${styleOf(child)}`),
    ...[...outside.values()].map((blocker) => `  ${nodeId(blocker)}[${label(blocker)}]:::outside`),
    ...edges,
  ];
}

/** Fenced, so it pastes into a GitHub comment and renders. */
function fenced(lines: readonly string[]): string[] {
  return ['```mermaid', ...lines, '```'];
}

/**
 * `list` is the frontier alone; `graph` adds the fenced diagram; `graph-only`
 * prints the diagram unfenced and nothing else, so it can be piped to a viewer.
 */
type Mode = 'list' | 'graph' | 'graph-only';

const FLAGS: Readonly<Record<string, Mode>> = { '--graph': 'graph', '--graph-only': 'graph-only' };

function parseArgs(argv: readonly string[]): { readonly number: number; readonly mode: Mode } {
  const flags = argv.filter((arg) => arg.startsWith('--'));
  const rest = argv.filter((arg) => !arg.startsWith('--'));
  const number = Number(rest[0]?.replace(/^#/, ''));
  const mode = flags.length === 0 ? 'list' : FLAGS[flags[0] ?? ''];
  if (flags.length > 1 || mode === undefined) throw new Error(USAGE);
  if (rest.length !== 1 || !Number.isInteger(number) || number <= 0) throw new Error(USAGE);
  return { number, mode };
}

const USAGE = 'Usage: npm run frontier -- <parent issue number> [--graph | --graph-only]';

function main(): void {
  const { number, mode } = parseArgs(process.argv.slice(2));
  const parent = fetchParent(number);

  if (parent.subIssues.totalCount === 0) {
    // On stderr when piping, so a viewer is handed nothing rather than prose.
    const say = mode === 'graph-only' ? console.error : console.log;
    say(`#${parent.number} has no sub-issues.`);
    return;
  }
  assertComplete(parent);

  const frontier = parent.subIssues.nodes.filter(isFree);
  if (mode === 'graph-only') {
    console.log(graphLines(parent, frontier).join('\n'));
    return;
  }
  const lines =
    frontier.length > 0
      ? frontierLines(frontier)
      : [`#${parent.number} has no free children: each is closed, blocked or assigned.`];
  if (mode === 'graph') lines.push('', ...fenced(graphLines(parent, frontier)));
  console.log(lines.join('\n'));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
