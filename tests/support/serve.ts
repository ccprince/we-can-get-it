import { vi } from 'vitest';

/**
 * Stub `fetch` as the content folder: answer by URL, the manifest and each set
 * by name, and 404 for anything else. Give `sets` to say what the manifest
 * holds, which defaults to every set served: a set can be served and unlisted,
 * or listed and not served.
 */
export function serveSets(files: Record<string, string>, sets: unknown = Object.keys(files)): void {
  vi.stubGlobal('fetch', (url: string) => {
    const body = url === '/sets.json' ? JSON.stringify(sets) : files[url.slice(1, -'.json'.length)];
    return Promise.resolve(
      body === undefined ? new Response('', { status: 404 }) : new Response(body),
    );
  });
}
