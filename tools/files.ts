import { readFileSync } from 'node:fs';

/**
 * Reading a JSON file off disk, named the way a content mistake is named. The
 * seed-finder's content set, the harness's config and every setting's content
 * set all arrive this way, so a mistyped path reads alike wherever it is — and
 * **unreadable** and **unparseable** are two different things to tell someone,
 * neither of them a validator problem: the loader never sees the file.
 *
 * It lives here rather than beside the harness because the harness is a
 * **throw-away instrument** and this is not: the lasting tool holds the shared
 * reader, so `harness/` can be discarded whole without taking it along.
 *
 * `soThat` finishes the sentence — what cannot be done because this file could
 * not be read.
 */
export function readJson(path: string, soThat: string): unknown {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (trouble) {
    throw new Error(`${path} cannot be read, so ${soThat}`, { cause: trouble });
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (trouble) {
    // The parser's own complaint names the line, which is the useful half, so
    // it is said out loud as well as carried as the cause.
    throw new Error(`${path} is not JSON, so ${soThat} — ${reason(trouble)}`, { cause: trouble });
  }
}

function reason(trouble: unknown): string {
  return trouble instanceof Error ? trouble.message : String(trouble);
}
