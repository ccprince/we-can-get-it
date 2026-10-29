import { loadContent, type LoadResult } from '../engine';

/**
 * The page fetches content; the harness reads it off disk. Two loaders are
 * acceptable, two validators are not (ADR 0009 decision 6), so both hand the
 * parsed data to `loadContent`.
 *
 * `content/` is served as-is, so a set's URL is its own file name, and the
 * manifest beside the sets, `sets.json`, is the one list of the sets the page
 * offers. The manifest is not a content set and no loader reads it.
 */
const MANIFEST = '/sets.json';

/** The set a save made before saves named theirs was played on. */
export const DEFAULT_SAVED_SET = 'walking-skeleton';

/**
 * The names of the sets the page offers, in the manifest's order. A manifest
 * that cannot be fetched, is not a list of names, or lists none throws, saying
 * which.
 */
export async function fetchManifest(): Promise<readonly string[]> {
  const response = await fetch(MANIFEST);
  if (!response.ok) throw new Error(`${MANIFEST} answered ${response.status}`);
  const listed: unknown = await response.json();
  if (!Array.isArray(listed) || listed.some((name) => typeof name !== 'string' || name === '')) {
    throw new Error(`${MANIFEST} is not a list of content set names`);
  }
  if (listed.length === 0) throw new Error(`${MANIFEST} lists no content sets`);
  return listed as string[];
}

export async function fetchContent(name: string): Promise<LoadResult> {
  const path = `/${name}.json`;
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path} answered ${response.status}`);
  }
  return loadContent(await response.json());
}

/**
 * The set the URL asks a *new* campaign to start on — `?content=plain-and-vague`
 * — or null. A saved campaign is resumed over it, as it is over a seed.
 */
export function setAskedFor(search: string): string | null {
  return new URLSearchParams(search).get('content');
}
