import type { Point } from './layout';

/**
 * The shape of a content set, after it has been through the loader.
 *
 * Content is data the engine receives and never imports (ADR 0003 decision 2),
 * so nothing here is a constant: every number the engine needs is declared by
 * the content set it is handed.
 */

/** A month names a date and carries no mechanics (ADR 0005 decision 3). */
export type Month = {
  readonly name: string;
  readonly days: number;
};

/**
 * One galaxy-wide reckoning, perfectly regular, so that weekday follows from
 * the day index alone (ADR 0005 decision 2).
 */
export type Calendar = {
  readonly daysPerWeek: number;
  /** In **authored order**: the first is the weekday of day 0, and so on. */
  readonly weekdayNames: readonly string[];
  /** In **authored order**: the year runs through them as written. */
  readonly months: readonly Month[];
  readonly firstYear: number;
};

/**
 * A place on the chart, and an atomic node (ADR 0006 decision 6). A location
 * the **draw** places; the ones it does not are **hidden** and leave no trace
 * (ADR 0008 decision 4), so a content set holds a **reserve** of these larger
 * than one campaign uses.
 *
 * Its identity is authored and its position generated (ADR 0006 decision 2):
 * nothing in here says where it sits, because that is the assembly's answer.
 */
export type Location = {
  readonly id: string;
  readonly name: string;
  readonly prose: string;
  /** What the place is, naming one of the archetypes the content set enumerates. */
  readonly archetype: string;
};

/**
 * What a **location** is, drawn from a short enumerated list the content set
 * declares (ADR 0007 decision 17). A **slot** types against the id and the
 * validator reads it; nobody else does, which is why it is a designer's word
 * for a designer's thing (ADR 0008 decision 1).
 *
 * The **kinds** it **supplies** and **demands** are what the trade guide
 * publishes, and what keeps a kind in circulation: the draw may drop a kind
 * entire only if no drawn archetype supplies or demands it (ADR 0008
 * decision 11). Both are lists of plain values, read for membership only.
 */
export type Archetype = {
  readonly id: string;
  /** Kind ids. */
  readonly supplies: readonly string[];
  /** Kind ids. */
  readonly demands: readonly string[];
};

/**
 * A hole in a **motif**, typed by an **archetype** and filled from the reserve
 * at campaign start. `archetype` is null for a slot that is deliberately
 * **untyped**, which accepts any location at all — so that a region's grammar
 * has exceptions in it (ADR 0006 decision 4).
 */
export type Slot = {
  /** Unique within its motif, and what the motif's own lanes name. */
  readonly id: string;
  readonly archetype: string | null;
};

/**
 * A lane inside a **motif**, joining two of its **slots** rather than two
 * locations: which locations it ends up joining is the assembly's answer. It
 * carries a **distance** like any other lane (ADR 0006 decision 8).
 */
export type MotifLane = {
  readonly ends: readonly [string, string];
  readonly distance: number;
};

/**
 * The named shape a **motif** is authored to have, from the list ADR 0006
 * decision 3 gives: a **spur** that must be flown out and back, a
 * **chokepoint** every route through a region passes, and a ring that offers a
 * long way round. Two clusters a long haul apart is not a shape of one motif
 * but a property of the inter-motif lanes between two of them (ADR 0008
 * decision 6), which is the far-haul invariant's.
 *
 * The motif invariants count placed motifs by this, because a shape is a
 * property of the assembly and cannot be read off a list of lanes. The label is
 * declared and not checked against the motif's lanes: nothing yet says a spur's
 * lanes must make a dead end.
 */
export type Shape = 'spur' | 'chokepoint' | 'ring';

export const shapes: readonly Shape[] = ['spur', 'chokepoint', 'ring'];

/**
 * An authored fragment of topology with typed **slots** (ADR 0006 decision 3).
 * Drawn from a reserve larger than one campaign uses, and a motif **may appear
 * more than once** in one assembly, so what is authored here is a shape and not
 * a region (ADR 0008 decision 7).
 *
 * Motifs join by **lanes** and never by sharing a location, which is why a
 * motif's lanes name its own slots and nothing outside it (decision 6).
 */
export type Motif = {
  readonly id: string;
  readonly shape: Shape;
  readonly slots: readonly Slot[];
  readonly lanes: readonly MotifLane[];
  /**
   * Where each slot sits in the motif's **layout**, by slot id: worked
   * out once at load from the lanes' distances alone, so the motif is drawn
   * the same shape in every campaign it is placed in (ADR 0011 decision 4).
   * Read by the chart and the report, and by nothing with a rule in it.
   */
  readonly layout: ReadonlyMap<string, Point>;
};

/**
 * The baseline ship, in its three independent purchases (ADR 0006 decision
 * 9): **speed** is **distance** per day, **range** the largest distance it can
 * fly in one **leg**, and the **hold** how many units of cargo it carries.
 * Ship upgrades are outside this milestone, so the ship a campaign opens with
 * is the ship it has.
 */
export type Ship = {
  readonly speed: number;
  readonly range: number;
  /**
   * Units of cargo, one to a unit of any good. No good is too small to take
   * room: pocket goods that took none made a speculative buy a bet that could
   * not be lost (findings §2.1).
   */
  readonly hold: number;
};

/**
 * When a campaign opens and what the player opens it with. **Where** is not
 * here: the start is a location the **draw** placed, so it is chosen by the
 * assembly rather than authored (ADR 0006 decision 16, ADR 0008 decision 2).
 */
export type Start = {
  readonly credits: number;
  readonly day: number;
  readonly ship: Ship;
};

/**
 * The only way between the two **locations** it joins (ADR 0006 decision 1).
 * Symmetric — one cost, the same both ways (decision 7) — and carrying one
 * authored number, its **distance**, from which days and **fare** are both
 * derived (decision 8).
 */
export type Lane = {
  readonly ends: readonly [string, string];
  readonly distance: number;
};

/**
 * The four classes a tag declares itself as (ADR 0007 decision 1). Making the
 * class first-class is what makes *goods per usable kind-tag* — the one number
 * the chunk turns on — a quantity the engine can report rather than a thing in
 * a writer's head.
 *
 * Only a **kind** is public vocabulary; a quality, origin or quirk tag is
 * named nowhere and is reached only through its **tell** (decision 3).
 */
export type TagClass = 'kind' | 'quality' | 'origin' | 'quirk';

export const tagClasses: readonly TagClass[] = ['kind', 'quality', 'origin', 'quirk'];

/** A property of a good that wants match against. A tag means one thing everywhere. */
export type Tag = {
  readonly id: string;
  readonly class: TagClass;
  /**
   * The kind of words a good's prose uses to signal this tag — `alcohol` →
   * brewed, distilled, proof. For every invisible tag the tell *is* the tag,
   * so every tag declares one (ADR 0007 decision 4).
   */
  readonly tells: readonly string[];
};

/**
 * A tradeable item in the catalogue. Carries exactly one **kind** tag, any
 * number of quality, origin and quirk tags within the bound its content set
 * declares, and one **worth** (ADR 0007 decisions 2 and 12).
 */
export type Good = {
  readonly id: string;
  readonly name: string;
  readonly prose: string;
  /** The id of the good's one kind-tag. */
  readonly kind: string;
  /** The ids of its quality, origin and quirk tags. The kind is not among them. */
  readonly tags: readonly string[];
  /**
   * The galaxy-wide anchor an offer is computed against — deliberately not a
   * tag and not a price (ADR 0007 decision 12).
   */
  readonly worth: number;
};

/**
 * One term of a want's predicate: a tag, or a negated tag. Negation stays
 * because a refusal stated in the **want** differs from one attached to the
 * buyer — "something warm, but god not another fur" is the want, not the
 * person (ADR 0007 decision 6).
 */
export type Term = {
  readonly tag: string;
  readonly negated: boolean;
};

/**
 * What makes a want an **order**: the buyer states the price they will pay, per
 * unit, and the window the order stays open for. An order is stated plainly with
 * its price, so no premium rides on one and it can be in either desire register
 * (findings §2.1, ADR 0007 decision 11).
 */
export type Order = {
  /** Credits for each unit, whatever the good's **worth**. */
  readonly price: number;
  /**
   * Days the order stays open, counted from the day the player is first shown
   * it, which is the day they are first where the buyer stands: it is open
   * until that day plus `days` has passed, and closes after. "I need this in a
   * week" is true whenever the offer comes up.
   */
  readonly days: number;
};

/**
 * Something a buyer is after: a conjunction of terms, one good by identity, or
 * anything of a kind.
 * There is no disjunction — a want for "brandy or whisky" is a want for the
 * kind above them, which is what flat kinds with many goods each are for
 * (ADR 0007 decision 6).
 */
export type Want = {
  /**
   * How many units the buyer will take in all: a sale may be of any number up
   * to what is still wanted, and the want closes when it has all been sold
   * (ADR 0007 decision 11).
   */
  readonly quantity: number;
  /** Present when the buyer states a price and a date: an order, not a speculative want. */
  readonly order?: Order;
} & (
  | {
      readonly predicate: readonly Term[];
      /**
       * The want said plainly, as the buyer's side of the sentence: "wants
       * something warm to sleep under". Authored, because the player never sees
       * a quality tag and a plain want has to tell them what would satisfy it
       * without naming one (ADR 0007 decision 3). A want naming a good needs
       * none: the good is its wording.
       */
      readonly plainly: string;
    }
  | { readonly goodId: string }
  | {
      /**
       * A **vague** want: whether there is anything at all that fits this
       * kind. It states no predicate and has no plain form — any plain
       * statement of what would do is the working out that is the player's
       * (ADR 0002) — and it may only point at a **usable** kind (ADR 0007
       * decision 5).
       */
      readonly kind: string;
    }
);

/**
 * Someone who wants something. **Bonus** and **refusal** are roles this buyer
 * holds a tag in rather than classes of tag, so they live here (ADR 0007
 * decision 7).
 */
export type Buyer = {
  readonly id: string;
  readonly name: string;
  /**
   * Where this person stands. A person needs a drawn location to stand on, so
   * one whose location is not drawn is **hidden** with it; one whose location
   * is drawn is hidden or not on their own account (ADR 0008 decision 10).
   */
  readonly locationId: string;
  readonly wants: readonly Want[];
  /** Tags this buyer pays more for. */
  readonly bonusTags: readonly string[];
  /** Tags that make this buyer say no. */
  readonly refusalTags: readonly string[];
  /**
   * What this buyer says when a good is refused: their own words, so a refusal
   * reads as theirs and not the engine's. One line a buyer, whichever term the
   * good failed.
   */
  readonly refusalLine: string;
};

/**
 * A bound with two ends, both inclusive. Declared by the content set and
 * enforced by the validator (ADR 0007 decision 15); both ends are expected to
 * widen as the catalogue grows, which is why they are a config edit rather
 * than an argument.
 */
export type Range = {
  readonly least: number;
  readonly most: number;
};

/** Whether a count sits inside a declared bound, both ends included. */
export function within(count: number, range: Range): boolean {
  return count >= range.least && count <= range.most;
}

/**
 * The tags any buyer holds as a **bonus** or a **refusal**. A role is a
 * property of a buyer's relationship to a tag rather than a class of tag
 * (ADR 0007 decision 7), so this is the only way to ask which tags are in a
 * role at all — which both the spread bound and its distribution need.
 */
export function roleTags(content: Pick<ContentSet, 'buyers'>): ReadonlySet<string> {
  return new Set(content.buyers.flatMap((buyer) => [...buyer.bonusTags, ...buyer.refusalTags]));
}

/** How many goods carry a tag, whether as their one kind or among the rest. */
export function goodsCarrying(content: Pick<ContentSet, 'goods'>, tagId: string): number {
  return content.goods.filter((good) => good.kind === tagId || good.tags.includes(tagId)).length;
}

/**
 * What a content set declares about its own shape. The engine hardcodes none
 * of it (ADR 0007 decision 15): what transfers from the prototype is not the
 * numbers but the reason for the lower bound — a role must be a learnable
 * pattern, so more than one good.
 */
export type Bounds = {
  /** Tags on one good, the mandatory kind included. */
  readonly tagsPerGood: Range;
  /** Goods carrying a tag that any buyer uses as a bonus or a refusal. */
  readonly goodsPerRoleTag: Range;
  /** The goods a kind must carry to be **usable** (ADR 0007 decision 5). */
  readonly usabilityFloor: number;
  /** The most quirk tags the galaxy may hold (ADR 0007 decision 8). */
  readonly quirkRation: number;
};

/**
 * The declared content-set parameters the **draw** reads (ADR 0008 decision 20,
 * ADR 0007 decision 15). Named for what it is rather than `Draw`: the draw is
 * the roll itself, which lives in the engine, and this is what a writer hands
 * it.
 */
export type DrawParameters = {
  /**
   * How many motifs a campaign is assembled from, counting duplicates: the
   * dial has to be the thing the location count is a sum of (decision 7).
   */
  readonly motifsPerCampaign: number;
  /**
   * How far apart the **inter-motif lanes** run. These are where the long hauls
   * live, and where ADR 0006 decision 3's far-cluster invariant bites
   * (ADR 0008 decision 6).
   *
   * A declared parameter and **not a second dial**: there is one dial and it is
   * the motif count (decision 5). This says how long a lane the assembly lays
   * between two motifs, which it has to know and cannot invent. The far-cluster
   * invariant's own threshold is `topology.farHaul`, a different number: how
   * long one of these lanes must be, not how long any may be.
   */
  readonly interMotifDistance: Range;
  /**
   * The range the drawn galaxy's location count must land in, checked after
   * assembly (ADR 0008 decision 8). A **validated range and not a dial**: the
   * dial is the motif count, and an assembly outside this re-rolls the motif
   * selection.
   */
  readonly locationCount: Range;
  /**
   * How many times the draw re-rolls a stage that failed a check before it
   * fails loudly (ADR 0008 decision 17). Counted, so that an inadequate reserve
   * surfaces as a content defect rather than hiding behind retries.
   */
  readonly rerolls: number;
  /**
   * The chance, in whole percent, that the draw hides any one **good**. Flat
   * and galaxy-wide, and bounded by the **usability floor**: a kind is never
   * hidden below it (ADR 0008 decision 11).
   *
   * It is also what drops a kind entire, so there is no second rate for that.
   * A kind no drawn archetype supplies or demands is dropped when this rate,
   * rolled over its goods, would take it below its floor — where the draw
   * wants more variation than the floor allows. A kind some drawn archetype
   * supplies or demands is never dropped and keeps its floor instead.
   */
  readonly goodsHiddenPercent: number;
  /**
   * The chance, in whole percent, that the draw hides any one person standing
   * at a drawn location. Per person and independent of the location, so a
   * drawn location is a fresh question about who is there (ADR 0008
   * decision 10).
   */
  readonly peopleHiddenPercent: number;
  /**
   * The fewest people every drawn location carries, checked after the people
   * pass (ADR 0008 decision 12). The hiding rate is flat and galaxy-wide, so
   * this is what stops a location being drawn with nobody on it.
   */
  readonly peopleFloor: number;
  /**
   * How many more locations of an archetype the reserve holds than the most
   * simultaneous slots of it any legal assembly can demand (ADR 0008 decision
   * 9). One number applied to every archetype, and not a ratio of the draw.
   */
  readonly reserveSurplus: number;
};

/**
 * What a content set declares the **drawn galaxy's** topology must hold, which
 * the draw-time pass checks after the map is assembled (ADR 0006 decision 3).
 * The engine hardcodes none of it (ADR 0007 decision 15): every number is a
 * measurement, and a content set states it.
 */
export type Topology = {
  /**
   * The **motif invariants**: at least so many placed motifs of each shape —
   * at least one chokepoint, at least so many spurs. Every shape is declared,
   * nought for one the map need not hold.
   */
  readonly leastPlaced: Readonly<Record<Shape, number>>;
  /**
   * The far cluster no nearer than this: the longest inter-motif lane must be
   * at least this long, since the far-cluster invariant is a statement about
   * those lanes (ADR 0008 decision 6). Nought asks for no far cluster at all.
   *
   * Not a second number for `drawParameters.interMotifDistance`, which says how
   * long a lane between motifs may be; this says how long one of them must be.
   */
  readonly farHaul: number;
  /** Where a campaign may open (ADR 0006 decision 16). */
  readonly startHub: StartHub;
  /**
   * The **minimum gap**, in whole percent of a motif's shortest lane: how near
   * the **layout** may draw a location to a lane that does not touch it. A
   * motif whose layout breaches it is refused at load (ADR 0011 decision 4).
   */
  readonly minimumGapPercent: number;
};

/**
 * The **start-node guarantee**, in the numbers and the name a content set
 * declares for it: the archetype the start must be, how many neighbours inside
 * baseline range it must have, and how many of those a **spur** placed.
 */
export type StartHub = {
  /** An archetype id, or null for a start of any archetype. */
  readonly archetype: string | null;
  readonly neighbours: number;
  readonly spurs: number;
};

/**
 * What a content set declares about its shops (ADR 0007 decision 15): how
 * they are stocked at campaign start, and the two percentages a price is
 * computed from. A price is computed from a good's **worth**, the shop's
 * location and the lot's stock, and is never authored per lot (#14).
 */
export type ShopParameters = {
  /**
   * How many **lots** a shop stocks, drawn per shop. A shop with fewer goods
   * to offer than it draws stocks all of them.
   */
  readonly lotsPerShop: Range;
  /** The units a lot opens with, drawn per lot. A lot is finite and depletable. */
  readonly lotQuantity: Range;
  /**
   * What a shop charges above worth, in whole percent, drawn per location: the
   * part of a price that is where it is sold. Never below worth, and either end
   * may pass 100.
   */
  readonly markupPercent: Range;
  /**
   * The most a lot adds, in whole percent, for being small: a lot opening at
   * `lotQuantity.most` adds nothing, and one opening smaller adds its shortfall's
   * share of this. The part of a price that is stock, and it may pass 100.
   */
  readonly scarcityPercent: number;
};

/**
 * What a buyer pays against a want, as a whole percent of the good's **worth**
 * at each **match tier** that pays at all (ADR 0007 decision 13). A refused
 * good is not paid for, so it has no entry. The offer is worth and tier and
 * never a per-want constant, so this is the only place a tier's pay is stated.
 */
export type OfferParameters = {
  readonly grudgingPercent: number;
  readonly acceptablePercent: number;
  readonly greatPercent: number;
};

/**
 * A content set as the loader hands it over, **in id order**: every collection
 * of things with an authored id (archetypes, motifs, locations, tags, goods and
 * buyers, a motif's slots) is sorted by that id, and a motif's lanes by their
 * two ends, each lane's ends in id order too. Where something sat in the file is
 * **written order**, and it never decides an outcome or reaches the player
 * (ADR 0009 decision 3, iteration order).
 *
 * **Authored order** is kept only where a field says so: the calendar's months
 * and weekday names. The lists of plain values — a tag's tells, a good's tags,
 * a buyer's wants and the terms and tags in them — have no id and are kept as
 * written. Today they are read for membership only. The first of them to decide
 * an outcome or reach the player has to get a canonical order here first.
 *
 * A buyer's **wants** are the exception, since they reach the player: each
 * buyer's come in **want order** (by what they ask for, a good before a
 * conjunction), and a conjunction's terms in tag order.
 */
export type ContentSet = {
  readonly bounds: Bounds;
  readonly drawParameters: DrawParameters;
  readonly topology: Topology;
  readonly shops: ShopParameters;
  readonly offers: OfferParameters;
  /**
   * The one galaxy-wide rate a **fare** is the **distance** times (ADR 0006
   * decision 10). Authored per-lane tariffs and regional rates were rejected
   * there, so there is exactly one of these in a galaxy.
   */
  readonly fareRate: number;
  /**
   * What **mail** pays in advance for each unit of **distance** of the lane it
   * travels, galaxy-wide like the fare it must cover (ADR 0006 decision 12).
   */
  readonly mailRate: number;
  readonly calendar: Calendar;
  /** The short enumerated list a location is authored with. */
  readonly archetypes: readonly Archetype[];
  /** The **motif reserve**, larger than one campaign assembles from. */
  readonly motifs: readonly Motif[];
  /** The **location reserve**, of which one campaign draws a part. */
  readonly locations: readonly Location[];
  readonly tags: readonly Tag[];
  readonly goods: readonly Good[];
  readonly buyers: readonly Buyer[];
  readonly start: Start;
};
