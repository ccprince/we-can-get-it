import { loadContent, type LoadResult } from '../engine';

/**
 * The page fetches content; the harness reads it off disk. Two loaders are
 * acceptable, two validators are not (ADR 0009 decision 6), so both hand the
 * parsed data to `loadContent`.
 *
 * `content/` is served as-is, so this path is the file's own name.
 */
const WALKING_SKELETON = '/walking-skeleton.json';

export async function fetchContent(path: string = WALKING_SKELETON): Promise<LoadResult> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`the content set at ${path} could not be fetched: ${response.status}`);
  }
  return loadContent(await response.json());
}
