import { roleTags, type ContentSet, type Motif, type Tag } from './content';
import {
  holds,
  missingTell,
  proseCarries,
  spread,
  tellsCarried,
  type Spread,
} from './content-reports';
import { locationNamed, type DrawnBack, type DrawnGalaxy } from './galaxy';
import { drawnLength, worstDistortion } from './layout';
import { judge, type Report } from './verdicts';

/**
 * The **cross-product report** (ADR 0007 decision 18): what a writer has
 * actually written rather than what they meant to. It is not a second tool —
 * it reads the content set the loader handed over and, in the draw's reporting
 * mode, the galaxy a seed gives (ADR 0008 decision 18), so it cannot disagree
 * with what the engine believes.
 *
 * It returns **data**. A script formats it; no rule and no judgement lives
 * there. Everything in it is for a writer to judge and nothing is a reason to
 * fail a load, so every finding is a `Report` and carries that verdict, which
 * is what lets a listing combined with the loader's problems keep them apart.
 *
 * Counts are **distributions and never means** (ADR 0007 decision 5): goods per
 * kind foremost, then goods per role tag.
 *
 * Overridden pairings (decision 14) are not here: overrides are outside the
 * first playable milestone, and that clause waits with them (#29).
 */
export type CrossProduct = {
  /** Every **slot** of every motif in the reserve, in motif id then slot id order. */
  readonly slots: readonly SlotFilling[];
  /**
   * Each motif's **layout** against its authored distances, **worst distortion
   * first**: a distribution, so a motif that draws badly is not averaged away
   * (ADR 0011 decision 5). Ties keep motif id order.
   */
  readonly motifLayouts: readonly MotifLayout[];
  /** Each archetype and the reserve locations of it, in archetype id order. */
  readonly archetypes: readonly ArchetypeLocations[];
  /** The content set as written: the whole reserve and catalogue. */
  readonly asWritten: Survey;
  /** The same over what the draw kept, or null when no galaxy was drawn. */
  readonly drawn: Drawn | null;
};

/**
 * How many locations of the reserve can fill one slot, so a motif typed too
 * narrowly shows before a draw exhausts its re-rolls. An untyped slot takes any
 * location at all (ADR 0006 decision 4). Which locations they are is
 * `archetypes`' to say, once per archetype rather than once per slot.
 */
export type SlotFilling = {
  readonly motif: string;
  readonly slot: string;
  /** The archetype the slot is typed to, or null if it is untyped. */
  readonly archetype: string | null;
  readonly locations: number;
};

export type MotifLayout = {
  readonly motif: string;
  /** The motif's lanes, in the order the content set hands them over. */
  readonly lanes: readonly LaneDrawn[];
  /**
   * The largest ratio between a lane's drawn length and its distance, either
   * way round: one for a motif drawn exactly.
   */
  readonly worstDistortion: number;
};

export type LaneDrawn = {
  readonly ends: readonly [string, string];
  readonly distance: number;
  /** How long the layout draws it, in units of distance. */
  readonly drawn: number;
};

export type ArchetypeLocations = {
  readonly archetype: string;
  /** Location ids, in id order. */
  readonly locations: readonly string[];
};

/** What a writer reads off one set of goods and buyers: the reserve, or a draw. */
export type Survey = {
  /** Goods per **kind**, widest group first. */
  readonly goodsPerKind: Spread;
  readonly goodsPerRoleTag: Spread;
  /** Goods whose prose carries none of the tells of a tag they hold. */
  readonly missingTells: readonly Report[];
  /** Goods whose prose carries the tells of a tag they do not hold. */
  readonly strayTells: readonly Report[];
};

export type Drawn = Survey & {
  /** Each placed slot and the location that filled it, in placement order. */
  readonly placed: readonly PlacedSlot[];
  /**
   * Each **inter-motif lane**, drawn against its distance, **most stretched
   * first**: the draw lengthens these, and only these, to fit the motifs
   * together (ADR 0011 decisions 5 and 6). Ties keep the order the draw laid them in.
   */
  readonly interMotifStretch: readonly LaneDrawn[];
  readonly goodsHidden: GoodsHidden;
};

/**
 * How much the draw hid of the goods it could have, against the rate the
 * content set declares, and which goods it drew back after hiding them. Each
 * one drawn back is a good the declared rate would have hidden, so a writer
 * tuning the rate reads this rather than the rate (ADR 0008 decision 11).
 */
export type GoodsHidden = {
  readonly declaredPercent: number;
  /** The goods of the kinds in circulation, in the reserve. */
  readonly inCirculation: number;
  /** How many of those the draw hid. */
  readonly hidden: number;
  /** The same as a whole percentage of those in circulation, rounded. */
  readonly hiddenPercent: number;
  readonly drawnBack: readonly DrawnBack[];
};

export type PlacedSlot = {
  readonly motif: string;
  readonly slot: string;
  readonly location: string;
  readonly archetype: string;
};

export function crossProduct(content: ContentSet, galaxy: DrawnGalaxy | null): CrossProduct {
  return {
    slots: slotFillings(content),
    motifLayouts: content.motifs
      .map(motifLayout)
      .sort((one, other) => other.worstDistortion - one.worstDistortion),
    archetypes: content.archetypes.map(({ id }) => ({
      archetype: id,
      locations: content.locations
        .filter((location) => location.archetype === id)
        .map((location) => location.id),
    })),
    asWritten: survey(content.tags, content),
    drawn:
      galaxy === null
        ? null
        : {
            ...surveyDrawn(content, galaxy),
            placed: placed(galaxy),
            interMotifStretch: interMotifStretch(galaxy),
            goodsHidden: goodsHidden(content, galaxy),
          },
  };
}

function goodsHidden(content: ContentSet, galaxy: DrawnGalaxy): GoodsHidden {
  const inCirculation = content.goods.filter((good) => galaxy.kinds.includes(good.kind)).length;
  return {
    declaredPercent: content.drawParameters.goodsHiddenPercent,
    inCirculation,
    hidden: inCirculation - galaxy.goods.length,
    // A content set may have no goods at all, and then nothing was hidden.
    hiddenPercent:
      inCirculation === 0
        ? 0
        : Math.round((100 * (inCirculation - galaxy.goods.length)) / inCirculation),
    drawnBack: galaxy.drawnBack,
  };
}

function motifLayout(motif: Motif): MotifLayout {
  return {
    motif: motif.id,
    lanes: motif.lanes.map((lane) => ({ ...lane, drawn: drawnLength(motif.layout, lane) })),
    worstDistortion: worstDistortion(motif.layout, motif.lanes),
  };
}

function interMotifStretch(galaxy: DrawnGalaxy): readonly LaneDrawn[] {
  const motifOf = new Map(
    galaxy.motifs.flatMap((motif, at) => motif.slots.map(({ location }) => [location, at])),
  );
  return galaxy.lanes
    .filter((lane) => motifOf.get(lane.ends[0]) !== motifOf.get(lane.ends[1]))
    .map((lane) => ({ ...lane, drawn: drawnLength(galaxy.layout, lane) }))
    .sort((one, other) => other.drawn / other.distance - one.drawn / one.distance);
}

function slotFillings(content: ContentSet): readonly SlotFilling[] {
  return content.motifs.flatMap((motif) =>
    motif.slots.map((slot) => ({
      motif: motif.id,
      slot: slot.id,
      archetype: slot.archetype,
      locations: content.locations.filter(
        (location) => slot.archetype === null || location.archetype === slot.archetype,
      ).length,
    })),
  );
}

/** A kind the draw dropped is hidden, and a hidden thing leaves no trace (ADR 0008 decision 4). */
function surveyDrawn(content: ContentSet, galaxy: DrawnGalaxy): Survey {
  const tags = content.tags.filter((tag) => tag.class !== 'kind' || galaxy.kinds.includes(tag.id));
  return survey(tags, { bounds: content.bounds, goods: galaxy.goods, buyers: galaxy.people });
}

function placed(galaxy: DrawnGalaxy): readonly PlacedSlot[] {
  return galaxy.motifs.flatMap((motif) =>
    motif.slots.map(({ slot, location }) => ({
      motif: motif.motif,
      slot,
      location,
      archetype: locationNamed(galaxy, location).archetype,
    })),
  );
}

function survey(
  tags: readonly Tag[],
  subject: Pick<ContentSet, 'bounds' | 'goods' | 'buyers'>,
): Survey {
  const roles = roleTags(subject);
  return {
    goodsPerKind: spread(
      subject,
      tags.filter((tag) => tag.class === 'kind'),
    ),
    goodsPerRoleTag: spread(
      subject,
      tags.filter((tag) => roles.has(tag.id)),
    ),
    missingTells: subject.goods.flatMap((good) =>
      tags
        .filter((tag) => holds(good, tag) && !proseCarries(good, tag))
        .map((tag) => missingTell(`goods.${good.id}.prose`, tag)),
    ),
    strayTells: subject.goods.flatMap((good) =>
      tags
        .filter((tag) => !holds(good, tag) && tellsCarried(good, tag).length > 0)
        .map((tag) =>
          judge(
            `goods.${good.id}.prose`,
            `carries the tell ${tellsCarried(good, tag).join(', ')} of ${tag.id}, ` +
              'which it does not hold',
          ),
        ),
    ),
  };
}
