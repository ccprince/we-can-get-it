/**
 * The validator's two verdicts, and the primitive reads that issue them.
 *
 * The validator issues two verdicts and never conflates them (ADR 0007
 * decision 18): a **problem** fails the load, a **report** is for a writer to
 * judge. Conflating them is the failure the split exists to prevent — failing
 * a writer's prose would train writers to pad prose with keywords (decision 4).
 *
 * So the two are **structurally** distinct rather than told apart by which
 * array they land in: each carries the verdict it is, which makes a
 * copy-pasted suspicion in `problems` a compiler error rather than a silently
 * failed load, and will let the cross-product report (#28) list the two
 * together without losing which is which.
 */

/** A content mistake, named by what it is and where it is. Fails the load. */
export type Problem = {
  readonly verdict: 'fails';
  readonly where: string;
  readonly what: string;
};

/** Something for a writer to look at. Never a reason to fail a load. */
export type Report = {
  readonly verdict: 'judge';
  readonly where: string;
  readonly what: string;
};

export function fails(where: string, what: string): Problem {
  return { verdict: 'fails', where, what };
}

export function judge(where: string, what: string): Report {
  return { verdict: 'judge', where, what };
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readText(value: unknown, where: string, problems: Problem[]): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    problems.push(fails(where, 'is missing or not a line of text'));
    return undefined;
  }
  return value;
}

export function readNonEmptyTexts(
  value: unknown,
  where: string,
  problems: Problem[],
): readonly string[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    problems.push(fails(where, 'is missing or empty'));
    return undefined;
  }
  return readTexts(value, where, problems);
}

/** A list of lines of text that may be empty, all of them or none of them. */
export function readTexts(
  value: unknown,
  where: string,
  problems: Problem[],
): readonly string[] | undefined {
  if (!Array.isArray(value)) {
    problems.push(fails(where, 'is missing'));
    return undefined;
  }
  const texts: string[] = [];
  value.forEach((entry, index) => {
    const text = readText(entry, `${where}[${index}]`, problems);
    if (text !== undefined) texts.push(text);
  });
  return texts.length === value.length ? texts : undefined;
}

export function readInteger(
  value: unknown,
  where: string,
  least: number,
  problems: Problem[],
): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    problems.push(fails(where, 'is missing or not a whole number'));
    return undefined;
  }
  if (value < least) {
    problems.push(fails(where, `is ${value}, which is less than ${least}`));
    return undefined;
  }
  return value;
}

/**
 * One list of entities, each with an id of its own. Every such list in a
 * content set reads the same way — an object per entry, an id nothing else has
 * used, and all of them or none of them — so the shape is written once here
 * and each list supplies only what makes it itself.
 *
 * All or nothing matters: half a list read is a list a later check would
 * measure against bounds, which is how a count comes out wrong for a reason
 * nobody can see.
 */
export function readEach<T extends { readonly id: string }>(
  raw: unknown,
  where: string,
  problems: Problem[],
  readOne: (entry: Record<string, unknown>, where: string) => T | undefined,
): readonly T[] | undefined {
  if (!Array.isArray(raw)) {
    problems.push(fails(where, 'is missing'));
    return undefined;
  }

  const read: T[] = [];
  const seen = new Set<string>();
  raw.forEach((entry, index) => {
    const at = `${where}[${index}]`;
    if (!isObject(entry)) {
      problems.push(fails(at, 'is not an object'));
      return;
    }
    const one = readOne(entry, at);
    if (one === undefined) return;

    if (seen.has(one.id)) {
      problems.push(fails(`${at}.id`, `repeats an id already used: ${one.id}`));
      return;
    }
    seen.add(one.id);
    read.push(one);
  });

  return read.length === raw.length ? read : undefined;
}
