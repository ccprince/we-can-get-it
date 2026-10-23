/**
 * The seed a campaign is started from. It comes from the page rather than the
 * engine, which never has a source of entropy of its own (ADR 0009 decisions 2
 * and 3), and it is read off the URL so that a hand-played campaign can be
 * started again deliberately — `?seed=12345`. Saving and resuming a campaign
 * is #20.
 */
const DEFAULT_SEED = 20261022;

export function seedFromUrl(search: string): number {
  const asked = new URLSearchParams(search).get('seed');
  if (asked === null) return DEFAULT_SEED;

  const seed = Number(asked);
  return Number.isSafeInteger(seed) ? seed : DEFAULT_SEED;
}
