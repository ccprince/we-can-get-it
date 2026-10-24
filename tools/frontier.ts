import { execFileSync } from 'node:child_process';

/**
 * The **frontier query** from `docs/agents/issue-tracker.md`: a parent's open
 * children, minus any with an open blocker or an assignee, in parent order. The
 * first line is the answer to "what's the next thing to build?"; the rest show
 * what else is free (#46).
 *
 *   npm run frontier -- 6            — the frontier of #6
 *   npm run frontier -- 6 --graph    — and a Mermaid diagram of its dependency edges
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
  if (parent.subIssues.totalCount > parent.subIssues.nodes.length) {
    throw new Error(
      `#${parent.number} has ${parent.subIssues.totalCount} sub-issues; ` +
        `this script reads only the first ${MAX_CHILDREN}.`,
    );
  }
  for (const child of parent.subIssues.nodes) {
    if (child.blockedBy.totalCount > child.blockedBy.nodes.length) {
      throw new Error(
        `#${child.number} has ${child.blockedBy.totalCount} blockers; ` +
          `this script reads only the first ${MAX_BLOCKERS}.`,
      );
    }
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

  const outside: IssueRef[] = [];
  const seenOutside = new Set<number>();
  const edges: string[] = [];
  for (const child of children) {
    for (const blocker of child.blockedBy.nodes) {
      const isOutside = !inside.has(blocker.number);
      if (isOutside && blocker.state === 'CLOSED') continue;
      if (isOutside && !seenOutside.has(blocker.number)) {
        seenOutside.add(blocker.number);
        outside.push(blocker);
      }
      edges.push(`  ${nodeId(blocker)} --> ${nodeId(child)}`);
    }
  }

  const styleOf = (child: Child): string =>
    child.state === 'CLOSED' ? 'closed' : free.has(child.number) ? 'frontier' : 'open';

  return [
    '```mermaid',
    'graph LR',
    '  classDef closed fill:#e5e5e5,stroke:#999,color:#777',
    '  classDef frontier fill:#d6f5d6,stroke:#2e8b2e,stroke-width:2px',
    '  classDef open fill:#fff,stroke:#333',
    '  classDef outside fill:#fff4d6,stroke:#c08a00,stroke-dasharray:4 3',
    ...children.map((child) => `  ${nodeId(child)}[${label(child)}]:::${styleOf(child)}`),
    ...outside.map((blocker) => `  ${nodeId(blocker)}[${label(blocker)}]:::outside`),
    ...edges,
    '```',
  ];
}

function parseArgs(argv: readonly string[]): { readonly number: number; readonly graph: boolean } {
  const graph = argv.includes('--graph');
  const rest = argv.filter((arg) => arg !== '--graph');
  const number = Number(rest[0]?.replace(/^#/, ''));
  if (rest.length !== 1 || !Number.isInteger(number) || number <= 0) {
    throw new Error('Usage: npm run frontier -- <parent issue number> [--graph]');
  }
  return { number, graph };
}

function main(): void {
  const { number, graph } = parseArgs(process.argv.slice(2));
  const parent = fetchParent(number);

  if (parent.subIssues.totalCount === 0) {
    console.log(`#${parent.number} has no sub-issues.`);
    return;
  }
  assertComplete(parent);

  const frontier = parent.subIssues.nodes.filter(isFree);
  const lines =
    frontier.length > 0
      ? frontierLines(frontier)
      : [`#${parent.number} has no free children: each is closed, blocked or assigned.`];
  if (graph) lines.push('', ...graphLines(parent, frontier));
  console.log(lines.join('\n'));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
