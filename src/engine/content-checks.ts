import { goodsCarrying, roleTags, within, type ContentSet } from './content';
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
export function checkContentSet(subject: Subject): readonly Problem[] {
  return [
    ...unusedTags(subject),
    ...quirkRation(subject),
    ...roleTagSpread(subject),
    ...vagueWantsAtUsableKinds(subject),
  ];
}

/**
 * What these checks read, which is narrower than a whole content set on
 * purpose: the calendar and the map are nothing to do with them, so a content
 * set whose calendar did not read still gets everything here.
 */
type Subject = Pick<ContentSet, 'bounds' | 'tags' | 'goods' | 'buyers'>;

/**
 * A tag no want anywhere uses fails the load: findings §2.4's "tags no buyer
 * uses are noise", now checkable (ADR 0007 decision 4). A tag a buyer holds as
 * a bonus or a refusal is used — the role *is* a use (decision 7), and failing
 * a tag somebody actively pays more for would be a false alarm — so what the
 * check catches is a tag nobody reaches for at all, which is how "only where
 * the origin makes a difference" stops being advice.
 */
function unusedTags(subject: Subject): readonly Problem[] {
  const used = new Set(roleTags(subject));
  for (const buyer of subject.buyers) {
    for (const want of buyer.wants) {
      if ('predicate' in want) {
        for (const term of want.predicate) used.add(term.tag);
      } else if ('kind' in want) {
        used.add(want.kind);
      }
    }
  }

  return subject.tags.flatMap((tag, index) =>
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
 * A vague want may only point at a **usable** kind: "is there anything at all
 * that fits?" asked of a kind with one good has one answer (ADR 0007 decision
 * 5). This reads the reserve; a kind usable there can still be dropped from the
 * drawn galaxy, or left short in it, which the draw-time pass checks (#16).
 */
function vagueWantsAtUsableKinds(subject: Subject): readonly Problem[] {
  const floor = subject.bounds.usabilityFloor;
  return subject.buyers.flatMap((buyer, at) =>
    buyer.wants.flatMap((want, index) => {
      if (!('kind' in want)) return [];
      const held = goodsCarrying(subject, want.kind);
      return held >= floor
        ? []
        : [
            fails(
              `buyers[${at}].wants[${index}].kind`,
              `is a vague want at ${want.kind}, which carries ${held} ` +
                `good${held === 1 ? '' : 's'} against a usability floor of ${floor}`,
            ),
          ];
    }),
  );
}

/**
 * What makes a quirk idiosyncratic is that one buyer cares about it, so the
 * ration is on the *number of quirk tags* in the galaxy (ADR 0007 decision 8).
 */
function quirkRation(subject: Subject): readonly Problem[] {
  const quirks = subject.tags.filter((tag) => tag.class === 'quirk').length;
  if (quirks <= subject.bounds.quirkRation) return [];
  return [
    fails(
      'tags',
      `declares ${quirks} quirk tags, and the content set rationed them to ` +
        `${subject.bounds.quirkRation}`,
    ),
  ];
}

/**
 * A tag used in either role must sit on enough goods to be a learnable pattern
 * rather than a one-off answer, quirks included — exempting them would make
 * them the hole through which unlearnable content enters (ADR 0007 decisions 7
 * and 8). A tag used only as a plain kind is exempt.
 */
function roleTagSpread(subject: Subject): readonly Problem[] {
  const roles = roleTags(subject);
  const { least, most } = subject.bounds.goodsPerRoleTag;

  return subject.tags.flatMap((tag, index) => {
    if (!roles.has(tag.id)) return [];
    const sits = goodsCarrying(subject, tag.id);
    if (within(sits, subject.bounds.goodsPerRoleTag)) return [];
    return [
      fails(
        `tags[${index}]`,
        `${tag.id} is held in a role and sits on ${sits} goods, and the content set ` +
          `declared ${least} to ${most}`,
      ),
    ];
  });
}
