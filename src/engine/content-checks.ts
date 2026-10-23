import type { ContentSet, Tag } from './content';
import { fails, type Problem } from './verdicts';

/**
 * The checks over the content set **as a whole**, which is the half of the
 * load-time pass that no single node can answer: whether a tag is used
 * anywhere, how many quirks the galaxy holds, how widely a role tag is spread.
 *
 * Every number here is one the content set declared; the engine hardcodes none
 * of them (ADR 0007 decision 15). Every check is a property of the content set
 * *as written* — the same bounds over the **drawn galaxy** are the draw-time
 * pass's job, and both are kept (#27, ADR 0008 decision 16).
 */
export function checkContentSet(content: ContentSet): readonly Problem[] {
  return [...unusedTags(content), ...quirkRation(content), ...roleTagSpread(content)];
}

/**
 * A tag no want anywhere uses fails the load: findings §2.4's "tags no buyer
 * uses are noise", now checkable (ADR 0007 decision 4). A tag a buyer holds as
 * a bonus or a refusal is used — the role *is* a use (decision 7) — so an
 * origin tag no want and no buyer reaches for is exactly the case the check is
 * for, which is how "only where the origin makes a difference" stops being
 * advice.
 */
function unusedTags(content: ContentSet): readonly Problem[] {
  const used = new Set<string>();
  for (const buyer of content.buyers) {
    for (const want of buyer.wants) {
      if ('predicate' in want) {
        for (const term of want.predicate) used.add(term.tag);
      }
    }
    for (const id of buyer.bonusTags) used.add(id);
    for (const id of buyer.refusalTags) used.add(id);
  }

  return content.tags.flatMap((tag, index) =>
    used.has(tag.id)
      ? []
      : [
          fails(
            `tags[${index}]`,
            `${tag.id} is used by no want and held in no role, which makes it noise`,
          ),
        ],
  );
}

/**
 * What makes a quirk idiosyncratic is that one buyer cares about it, so the
 * ration is on the *number of quirk tags* in the galaxy (ADR 0007 decision 8).
 */
function quirkRation(content: ContentSet): readonly Problem[] {
  const quirks = content.tags.filter((tag) => tag.class === 'quirk').length;
  if (quirks <= content.bounds.quirkRation) return [];
  return [
    fails(
      'tags',
      `declares ${quirks} quirk tags, and the content set rationed them to ` +
        `${content.bounds.quirkRation}`,
    ),
  ];
}

/**
 * A tag used in either role must sit on enough goods to be a learnable pattern
 * rather than a one-off answer, quirks included — exempting them would make
 * them the hole through which unlearnable content enters (ADR 0007 decisions 7
 * and 8). A tag used only as a plain kind is exempt.
 */
function roleTagSpread(content: ContentSet): readonly Problem[] {
  const { least, most } = content.bounds.goodsPerRoleTag;
  const roles = new Set(content.buyers.flatMap((buyer) => [...buyer.bonusTags, ...buyer.refusalTags]));

  return content.tags.flatMap((tag, index) => {
    if (!roles.has(tag.id)) return [];
    const sits = goodsCarrying(content, tag).length;
    if (sits >= least && sits <= most) return [];
    return [
      fails(
        `tags[${index}]`,
        `${tag.id} is held in a role and sits on ${sits} goods, and the content set ` +
          `declared ${least} to ${most}`,
      ),
    ];
  });
}

/** The goods carrying a tag, whether as their one kind or among the rest. */
export function goodsCarrying(content: ContentSet, tag: Tag): readonly string[] {
  return content.goods
    .filter((good) => good.kind === tag.id || good.tags.includes(tag.id))
    .map((good) => good.id);
}
