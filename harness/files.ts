import { readFileSync } from 'node:fs';

/**
 * Reading a JSON file off disk, named the way a content mistake is named. The
 * config and every setting's content set both arrive this way, so a mistyped
 * path reads alike wherever it is — and **unreadable** and **unparseable** are
 * two different things to tell someone, neither of them a validator problem:
 * the loader never sees the file.
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
