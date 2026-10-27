import { goodsCarrying, roleTags, type ContentSet, type Good, type Tag } from './content';
import { judge, type Report } from './verdicts';

/**
 * The other verdict: what a writer judges rather than what the load refuses
 * (ADR 0007 decision 18). Nothing here can fail a load, which is what lets the
 * tell check be mechanical — a missing tell word is overwhelmingly a writer
 * finding a better word than the tag table predicted, and failing it would
 * train writers to pad prose with keywords (decision 4).
 *
 * Every count is stated as a **distribution and never a mean** (decision 5,
 * CLAUDE.md): eight goods per kind on average while half the kinds are
 * singletons is the prototype's failure with a better mean.
 *
 * This is the content set as written. The same counts over the **drawn galaxy**
 * are the draw's to report, and the surface a writer reads them on is the
 * cross-product report (#28), which formats what this returns.
 */
export function reportsOn(subject: Subject): readonly Report[] {
  return [
    ...goodsPerKind(subject),
    ...goodsPerRoleTag(subject),
    ...usability(subject),
    ...tells(subject),
  ];
}

/** What these reports read; see the same note on the checks. */
type Subject = Pick<ContentSet, 'bounds' | 'tags' | 'goods' | 'buyers'>;

/** The chunk's headline number, and the one the lever of findings §2.4 moves. */
function goodsPerKind(subject: Subject): readonly Report[] {
  const kinds = subject.tags.filter((tag) => tag.class === 'kind');
  if (kinds.length === 0) return [];
  return [judge('goods', `goods per kind: ${distribution(subject, kinds)}`)];
}

function goodsPerRoleTag(subject: Subject): readonly Report[] {
  const roles = roleTags(subject);
  const held = subject.tags.filter((tag) => roles.has(tag.id));
  if (held.length === 0) return [];
  return [judge('tags', `goods per role tag: ${distribution(subject, held)}`)];
}

/**
 * A kind carrying fewer goods than the declared floor is **legal** — it stays
 * available as a location's character or a plain want's subject. What is
 * refused is a **vague** want pointed at one, which the validator fails at
 * load and the draw checks against the drawn galaxy (ADR 0007 decision 5, #16).
 */
function usability(subject: Subject): readonly Report[] {
  const floor = subject.bounds.usabilityFloor;
  const below = subject.tags
    .filter((tag) => tag.class === 'kind')
    .map((tag) => ({ tag, goods: goodsCarrying(subject, tag.id) }))
    .filter((counted) => counted.goods < floor);
  if (below.length === 0) return [];

  const named = below.map((counted) => `${counted.tag.id}, with ${goods(counted.goods)}`);
  return [
    judge(
      'tags',
      `below the usability floor of ${floor}, so no vague want may point at it: ` +
        named.join('; '),
    ),
  ];
}

/**
 * For every invisible tag the tell *is* the tag, so a good whose prose carries
 * none of a tag's tell words is a disagreement between tags and wording — the
 * thing nobody catches by reading at scale (findings §2.4). A tell matches
 * anywhere in the prose and in any case, so a writer may declare a stem and
 * reach every word grown from it.
 *
 * The converse — prose carrying the tells of a tag the good does *not* hold —
 * is the cross-product report's (#28).
 */
function tells(subject: Subject): readonly Report[] {
  return subject.goods.flatMap((good, index) =>
    subject.tags
      .filter((tag) => holds(good, tag) && !proseCarries(good, tag))
      .map((tag) => missingTell(`goods[${index}].prose`, tag)),
  );
}

/** The report for prose carrying none of a held tag's tells; one wording for every surface. */
export function missingTell(where: string, tag: Tag): Report {
  return judge(where, `carries none of the tells of ${tag.id}: ${tag.tells.join(', ')}`);
}

/** Whether a good holds a tag, as its one kind or among the rest. */
export function holds(good: Good, tag: Tag): boolean {
  return tag.id === good.kind || good.tags.includes(tag.id);
}

/** The tell words of a tag that a good's prose carries, in the order the tag declares them. */
export function tellsCarried(good: Good, tag: Tag): readonly string[] {
  const prose = good.prose.toLowerCase();
  return tag.tells.filter((tell) => prose.includes(tell.toLowerCase()));
}

export function proseCarries(good: Good, tag: Tag): boolean {
  return tellsCarried(good, tag).length > 0;
}

/** Tags grouped by how many goods carry each: a distribution, widest group first. */
export type Spread = readonly { readonly goods: number; readonly tags: readonly string[] }[];

/**
 * A distribution, so a pile of singletons cannot hide behind a healthy average:
 * each group ordered by tag id, an explicit sort rather than the order the
 * content happened to be written in (ADR 0009 decision 3).
 */
export function spread(subject: Pick<ContentSet, 'goods'>, tags: readonly Tag[]): Spread {
  const counted = new Map<number, string[]>();
  for (const tag of tags) {
    const sits = goodsCarrying(subject, tag.id);
    counted.set(sits, [...(counted.get(sits) ?? []), tag.id]);
  }

  return [...counted.entries()]
    .sort(([one], [other]) => other - one)
    .map(([sits, named]) => ({ goods: sits, tags: [...named].sort() }));
}

function distribution(subject: Subject, tags: readonly Tag[]): string {
  return spread(subject, tags)
    .map(({ goods: sits, tags: named }) => `${goods(sits)} — ${named.join(', ')}`)
    .join('; ');
}

function goods(count: number): string {
  return count === 1 ? '1 good' : `${count} goods`;
}
