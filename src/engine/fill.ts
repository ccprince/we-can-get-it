import type { ContentSet, Good } from './content';
import type { Attempt } from './draw-checks';
import type { DrawnGalaxy } from './galaxy';
import { drawFrom, drawHidden, type Rng } from './rng';

/**
 * The stages of the **draw** after the map: **kinds**, **goods** and people,
 * in that order, each conditioned on what the stages above it have fixed (ADR
 * 0008 decision 2). Each is a step the draw's cascade runs and re-rolls on its
 * own; whether what is left is *legal* is the draw-time pass's, and #27's.
 *
 * Everything is walked in id order, which is the order the loader hands the
 * content set over in, so which roll lands on which good or person is decided
 * by the seed and the content set alone (ADR 0009 decision 3).
 */

/**
 * The **kinds** pass. A kind some drawn **archetype** supplies or demands stays
 * in circulation, and the draw cannot know which those are until the map
 * exists. Any other kind may be **dropped entire** (ADR 0008 decision 11), and
 * is dropped where hiding its goods at the declared rate would take it below
 * its floor: the draw wants more variation there than the floor allows, and a
 * kind nothing drawn trades in is the one place it may take it whole.
 *
 * The roll here only decides the drop, and is spent: a kind that stays has its
 * goods rolled afresh by the goods pass, which is the stage that hides them.
 * Kinds are settled before goods because the cascade's order says so (decision
 * 2), and a drop cannot wait for the goods pass to propose it.
 */
export function drawKinds(galaxy: DrawnGalaxy, content: ContentSet, rng: Rng): Attempt {
  const tradedIn = kindsTradedIn(galaxy, content);
  const kinds: string[] = [];
  let next = rng;

  for (const kind of content.tags.filter((tag) => tag.class === 'kind')) {
    if (tradedIn.has(kind.id)) {
      kinds.push(kind.id);
      continue;
    }
    const goods = goodsOfKind(content, kind.id);
    const [hidden, after] = hiddenAmong(goods, content.drawParameters.goodsHiddenPercent, next);
    next = after;
    if (goods.length - hidden.length >= floorOf(goods, content)) kinds.push(kind.id);
  }

  return { ok: true, galaxy: { ...galaxy, kinds }, rng: next };
}

/**
 * The **goods** pass: within each kind in circulation, each good is hidden at
 * the declared rate, and the draw **never takes a kind below its floor** (ADR
 * 0008 decision 11). Where the rolls hide more than that allows, the goods the
 * floor needs are drawn back from among the hidden ones — by the generator,
 * and not by id, which would make the same goods survive every campaign. A
 * kind's goods go with it when it is out of circulation.
 */
export function drawGoods(galaxy: DrawnGalaxy, content: ContentSet, rng: Rng): Attempt {
  const kept = new Set<string>();
  let next = rng;

  for (const kind of galaxy.kinds) {
    const goods = goodsOfKind(content, kind);
    const [rolled, afterRolls] = hiddenAmong(
      goods,
      content.drawParameters.goodsHiddenPercent,
      next,
    );
    const [hidden, afterFloor] = keepingTheFloor(
      rolled,
      goods.length - floorOf(goods, content),
      afterRolls,
    );
    next = afterFloor;
    for (const good of goods) if (!hidden.includes(good)) kept.add(good.id);
  }

  const goods = content.goods.filter((good) => kept.has(good.id));
  return { ok: true, galaxy: { ...galaxy, goods }, rng: next };
}

/** The hidden ones, cut down to at most `mostHidden` by drawing the rest back. */
function keepingTheFloor<T>(
  hidden: readonly T[],
  mostHidden: number,
  rng: Rng,
): readonly [T[], Rng] {
  const still = [...hidden];
  let next = rng;
  while (still.length > mostHidden) {
    const [restored, after] = drawFrom(still, next);
    next = after;
    still.splice(still.indexOf(restored), 1);
  }
  return [still, next];
}

/**
 * The people pass. A person whose location was not drawn has nowhere to stand
 * and goes with it; every other person is hidden at the declared rate **on
 * their own account**, independently of where they stand, so a drawn location
 * is a fresh question about who is there (ADR 0008 decision 10). Hiding
 * wholesale by location would reproduce the prototype's failure verbatim.
 */
export function drawPeople(galaxy: DrawnGalaxy, content: ContentSet, rng: Rng): Attempt {
  const drawn = new Set(galaxy.locations.map((location) => location.id));
  const atDrawnLocations = content.buyers.filter((person) => drawn.has(person.locationId));
  const [hidden, next] = hiddenAmong(
    atDrawnLocations,
    content.drawParameters.peopleHiddenPercent,
    rng,
  );
  const people = atDrawnLocations.filter((person) => !hidden.includes(person));
  return { ok: true, galaxy: { ...galaxy, people }, rng: next };
}

/** The kinds some drawn location's archetype supplies or demands. */
export function kindsTradedIn(galaxy: DrawnGalaxy, content: ContentSet): ReadonlySet<string> {
  const drawn = new Set(galaxy.locations.map((location) => location.archetype));
  return new Set(
    content.archetypes
      .filter((archetype) => drawn.has(archetype.id))
      .flatMap((archetype) => [...archetype.supplies, ...archetype.demands]),
  );
}

/** A kind's goods in the reserve, in id order. */
function goodsOfKind(content: ContentSet, kindId: string): readonly Good[] {
  return content.goods.filter((good) => good.kind === kindId);
}

/**
 * The fewest goods a kind keeps: the **usability floor** the content set
 * declares, or every good it has when it has fewer — a kind is never hidden to
 * nothing while it stays in circulation. The engine hardcodes no floor.
 */
function floorOf(goods: readonly Good[], content: ContentSet): number {
  return Math.min(content.bounds.usabilityFloor, goods.length);
}

/** Each of a list rolled at the same flat rate: the ones it hid. */
function hiddenAmong<T>(items: readonly T[], percent: number, rng: Rng): readonly [T[], Rng] {
  const hidden: T[] = [];
  let next = rng;
  for (const item of items) {
    const [hides, after] = drawHidden(next, percent);
    next = after;
    if (hides) hidden.push(item);
  }
  return [hidden, next];
}
