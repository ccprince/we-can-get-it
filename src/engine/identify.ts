import type { ContentSet } from './content';

/**
 * The identity of a content set, which a save records so that it is replayed
 * only on the content it was played on (ADR 0009 decision 11). It hashes the
 * content set as loaded, which is in canonical order (decision 3), so
 * reordering a file keeps the identity and any changed value, prose included,
 * changes it. Keys are sorted too, so the loader's own field order is not part
 * of it.
 *
 * FNV-1a, 32 bits: synchronous and the same in the browser and the harness.
 * Identity, not security.
 */
export function identify(content: ContentSet): string {
  const text = canonicalJson(content);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
      .filter(([, field]) => field !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const fields = entries.map(([key, field]) => `${JSON.stringify(key)}:${canonicalJson(field)}`);
    return `{${fields.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
