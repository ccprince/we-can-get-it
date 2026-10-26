import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname } from 'node:path';
import { crossProduct, drawGalaxy, loadContent } from '../src/engine';
import type { CrossProduct, DrawnGalaxy, Problem } from '../src/engine';
import { markdown } from './cross-product-markdown';
import { readJson } from './files';

/**
 * Writes the **cross-product report** (#28): what a writer has actually written
 * rather than what they meant to.
 *
 *   npm run report -- content/walking-skeleton.json
 *   npm run report -- content/walking-skeleton.json --seed 3 --out out/tallow.md
 *
 * It is the loader and the draw in reporting mode (ADR 0007 decision 18, ADR
 * 0008 decision 18): `loadContent` and `drawGalaxy` are the engine's own, and
 * what they return goes through `crossProduct` and a formatter. This file only
 * reads, calls and writes; no rule lives here, and a section is documented in
 * `content/README.md`.
 *
 * The report is written even when the content set will not load, with the
 * problems in it, and the exit is non-zero: a writer wants to read what is
 * wrong, and a script wrapping this wants to know it was.
 */

/** Named for the content set, so reports on two of them sit side by side. */
function defaultOut(contentPath: string): string {
  return `out/${basename(contentPath, extname(contentPath))}-cross-product.md`;
}

function main(): void {
  const asked = parse(process.argv.slice(2));
  const loaded = loadContent(readJson(asked.contentPath, 'there is no content set to report on'));

  let galaxy: DrawnGalaxy | null = null;
  let drawProblems: readonly Problem[] = [];
  if (loaded.ok && asked.seed !== null) {
    const drawn = drawGalaxy(loaded.content, asked.seed);
    if (drawn.ok) galaxy = drawn.galaxy;
    else drawProblems = drawn.problems;
  }

  const report: CrossProduct | null = loaded.ok ? crossProduct(loaded.content, galaxy) : null;
  const problems = loaded.ok ? [] : loaded.problems;

  mkdirSync(dirname(asked.out), { recursive: true });
  writeFileSync(
    asked.out,
    markdown({
      contentPath: asked.contentPath,
      seed: asked.seed,
      problems,
      reports: loaded.reports,
      drawProblems,
      crossProduct: report,
    }),
  );

  const failed = problems.length + drawProblems.length;
  console.log(
    `wrote ${asked.out}` + (failed === 0 ? '' : ` — ${failed} problem${failed === 1 ? '' : 's'}`),
  );
  if (failed > 0) process.exitCode = 1;
}

type Asked = {
  readonly contentPath: string;
  readonly seed: number | null;
  readonly out: string;
};

const USAGE = 'usage: npm run report -- <content set> [--seed <n>] [--out <path>]';

function parse(args: readonly string[]): Asked {
  let contentPath: string | undefined;
  let seed: number | null = null;
  let out: string | undefined;
  for (let at = 0; at < args.length; at += 1) {
    const word = args[at];
    if (word === '--seed') {
      const value = Number(args[(at += 1)]);
      if (!Number.isInteger(value)) throw new Error(`--seed wants a whole number. ${USAGE}`);
      seed = value;
    } else if (word === '--out') {
      const value = args[(at += 1)];
      if (value === undefined) throw new Error(`--out wants a path. ${USAGE}`);
      out = value;
    } else if (word !== undefined && !word.startsWith('--') && contentPath === undefined) {
      contentPath = word;
    } else {
      throw new Error(`${word ?? ''} is not understood. ${USAGE}`);
    }
  }
  if (contentPath === undefined) throw new Error(USAGE);
  return { contentPath, seed, out: out ?? defaultOut(contentPath) };
}

try {
  main();
} catch (trouble) {
  console.error(`report: ${trouble instanceof Error ? trouble.message : String(trouble)}`);
  process.exit(1);
}
