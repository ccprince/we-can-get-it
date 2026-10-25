/**
 * The seed a campaign is started from. It comes from the page rather than the
 * engine, which never has a source of entropy of its own (ADR 0009 decisions 2
 * and 3), and it is read off the URL so that a hand-played campaign can be
 * started again deliberately — `?seed=12345`. A saved campaign is resumed
 * over it (#20): the URL names the seed a *new* campaign starts from.
 */
const DEFAULT_SEED = 20261022;

export function seedFromUrl(search: string): number {
  return seedAskedFor(search) ?? DEFAULT_SEED;
}

/** The seed the URL asks for, or null when it asks for none it can have. */
export function seedAskedFor(search: string): number | null {
  const asked = new URLSearchParams(search).get('seed');
  if (asked === null) return null;

  const seed = Number(asked);
  return Number.isSafeInteger(seed) ? seed : null;
}
