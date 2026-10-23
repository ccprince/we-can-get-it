import { goodsCarrying } from './content-checks';
import type { ContentSet, Tag } from './content';
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
export function reportsOn(content: ContentSet): readonly Report[] {
  return [...goodsPerKind(content), ...goodsPerRoleTag(content), ...usability(content), ...tells(content)];
}

/** The chunk's headline number, and the one the lever of findings §2.4 moves. */
function goodsPerKind(content: ContentSet): readonly Report[] {
  const kinds = content.tags.filter((tag) => tag.class === 'kind');
  if (kinds.length === 0) return [];
  return [judge('goods', `goods per kind: ${distribution(content, kinds)}`)];
}

function goodsPerRoleTag(content: ContentSet): readonly Report[] {
  const roles = new Set(
    content.buyers.flatMap((buyer) => [...buyer.bonusTags, ...buyer.refusalTags]),
  );
  const held = content.tags.filter((tag) => roles.has(tag.id));
  if (held.length === 0) return [];
  return [judge('tags', `goods per role tag: ${distribution(content, held)}`)];
}

/**
 * A kind carrying fewer goods than the declared floor is **legal** — it stays
 * available as a location's character or a plain want's subject. What is
 * refused is a **vague** want pointed at one, which is checked against the
 * drawn galaxy rather than here (ADR 0007 decision 5, #16).
 */
function usability(content: ContentSet): readonly Report[] {
  const floor = content.bounds.usabilityFloor;
  const below = content.tags
    .filter((tag) => tag.class === 'kind')
    .map((tag) => ({ tag, goods: goodsCarrying(content, tag).length }))
    .filter((counted) => counted.goods < floor);
  if (below.length === 0) return [];

  const named = below.map((counted) => `${counted.tag.id}, with ${goods(counted.goods)}`);
  return [
    judge(
      'tags',
      `below the usability floor of ${floor}, so no vague want may point at it: ${named.join('; ')}`,
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
 * belongs to the cross-product report (#28).
 */
function tells(content: ContentSet): readonly Report[] {
  return content.goods.flatMap((good, index) => {
    const prose = good.prose.toLowerCase();
    return [good.kind, ...good.tags].flatMap((id) => {
      const tag = content.tags.find((candidate) => candidate.id === id);
      if (tag === undefined) return [];
      if (tag.tells.some((tell) => prose.includes(tell.toLowerCase()))) return [];
      return [
        judge(
          `goods[${index}].prose`,
          `carries none of the tells of ${tag.id}: ${tag.tells.join(', ')}`,
        ),
      ];
    });
  });
}

/**
 * Tags grouped by how many goods carry each, widest group first — a
 * distribution, so a pile of singletons cannot hide behind a healthy average.
 */
function distribution(content: ContentSet, tags: readonly Tag[]): string {
  const counted = new Map<number, string[]>();
  for (const tag of tags) {
    const sits = goodsCarrying(content, tag).length;
    counted.set(sits, [...(counted.get(sits) ?? []), tag.id]);
  }

  return [...counted.entries()]
    .sort(([one], [other]) => other - one)
    .map(([sits, named]) => `${goods(sits)} — ${named.join(', ')}`)
    .join('; ');
}

function goods(count: number): string {
  return count === 1 ? '1 good' : `${count} goods`;
}
