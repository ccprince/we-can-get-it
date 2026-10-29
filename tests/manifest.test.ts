import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/engine';

/**
 * The content the page offers is known to load (ADR 0003 decision 3), taken
 * over the manifest rather than file by file. A set in the folder and not in
 * the manifest is allowed: it is a draft, or made only for measurement.
 */
describe('the manifest of content sets', () => {
  const listed: unknown = JSON.parse(readFileSync('content/sets.json', 'utf8'));

  it('lists at least one set', () => {
    expect(Array.isArray(listed) && listed.length > 0).toBe(true);
  });

  it.each(Array.isArray(listed) ? (listed as string[]) : [])(
    'lists %s, which exists and loads with no problems',
    (name) => {
      const file = `content/${name}.json`;
      expect(existsSync(file)).toBe(true);
      const result = loadContent(JSON.parse(readFileSync(file, 'utf8')));
      expect(result.ok ? [] : result.problems).toEqual([]);
    },
  );
});
