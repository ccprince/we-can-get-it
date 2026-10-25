import { describe, expect, it } from 'vitest';
import { drawGalaxy } from '../src/engine';
import type { ContentSet, DrawnGalaxy } from '../src/engine';
import { drawChecks } from '../src/engine/draw-checks';
import {
  aBounds,
  aBuyer,
  aDrawParameters,
  aGood,
  aLocation,
  aMotif,
  anArchetype,
  aSlot,
  aTag,
  aWant,
  loadedContentSet,
  type RawObject,
} from './support/content';

/**
 * The **substance checks** of the draw-time pass (ADR 0008 decision 16): what
 * the cascade filled into the map, read against the bounds the content set
 * declares. Each is shown the way the topology checks are — with no re-rolls
 * the first attempt has to pass and a seed trips it, and with the content set's
 * own re-rolls the same seeds all draw.
 */
const SEEDS = Array.from({ length: 24 }, (_, at) => at + 1);

/** What each seed's draw failed with, or null where it drew. */
function failures(content: ContentSet): readonly (string | null)[] {
  return SEEDS.map((seed) => {
    const result = drawGalaxy(content, seed);
    return result.ok ? null : (result.problems[0]?.what ?? null);
  });
}

function galaxyOf(content: ContentSet, seed: number): DrawnGalaxy {
  const result = drawGalaxy(content, seed);
  if (!result.ok) throw new Error(`the draw failed: ${JSON.stringify(result.problems)}`);
  return result.galaxy;
}

/**
 * A registered check, by the invariant it names. Reaches past the seam on
 * purpose, for the three checks no content set can trip through it: the draw
 * and the static validator already guarantee them, and these are what catch
 * either one drifting.
 */
function checkNamed(invariant: string) {
  const check = drawChecks.find((registered) => registered.invariant === invariant);
  if (check === undefined) throw new Error(`no check is registered for ${invariant}`);
  return check;
}

/**
 * One place, a market that supplies cloth, and three cloths of which `warm` is
 * on two and `blue` on two. Half the goods are hidden, so a draw may leave
 * either tag on one good: the floor of two keeps cloth in circulation and says
 * nothing about a tag.
 */
function aClothReserve(overrides: RawObject = {}): ContentSet {
  return loadedContentSet({
    archetypes: [anArchetype({ supplies: ['cloth'] })],
    tags: [
      aTag(),
      aTag({ id: 'warm', class: 'quality', tells: ['fleece'] }),
      aTag({ id: 'blue', class: 'quirk', tells: ['indigo'] }),
    ],
    goods: [
      aGood({ id: 'silk', tags: ['warm', 'blue'] }),
      aGood({ id: 'linen', name: 'Linen', tags: ['warm', 'blue'] }),
      aGood({ id: 'canvas', name: 'Canvas' }),
    ],
    buyers: [aBuyer({ bonusTags: ['warm'] }), aBobWhoWants(['blue'])],
    drawParameters: aDrawParameters({ goodsHiddenPercent: 50 }),
    ...overrides,
  });
}

/** A buyer whose want uses these tags and who holds none of them in a role. */
function aBobWhoWants(tags: readonly string[]): RawObject {
  return aBuyer({
    id: 'bob',
    name: 'Bob',
    wants: [aWant({ predicate: tags.map((tag) => ({ tag })) })],
    bonusTags: [],
  });
}

const noRerolls = aDrawParameters({ goodsHiddenPercent: 50, rerolls: 0 });

describe('the role-tag spread, in the drawn galaxy', () => {
  it('re-rolls a draw that left a role tag on one good, and draws it on none or enough', () => {
    const failed = failures(aClothReserve({ drawParameters: noRerolls }));

    expect(failed.some((what) => what?.includes('the role-tag spread'))).toBe(true);
    expect(failed.find((what) => what?.includes('the role-tag spread'))).toContain(
      'warm held in a role but sat on fewer than 2 drawn goods',
    );
    for (const seed of SEEDS) {
      expect(goodsCarryingIn(galaxyOf(aClothReserve(), seed), 'warm')).not.toBe(1);
    }
  });
});

function goodsCarryingIn(galaxy: DrawnGalaxy, tag: string): number {
  return galaxy.goods.filter((good) => good.tags.includes(tag)).length;
}

describe('the quirk, in the drawn galaxy', () => {
  it('re-rolls a draw that left a quirk on one good, a pattern nobody could have found', () => {
    // No buyer holds `blue` in a role, so only the quirk spread can see it.
    const content = aClothReserve({
      buyers: [aBuyer({ bonusTags: [] }), aBobWhoWants(['blue'])],
      drawParameters: noRerolls,
    });

    const failed = failures(content).filter((what) => what !== null);

    expect(failed.length).toBeGreaterThan(0);
    expect(failed.every((what) => what.includes('the quirk spread'))).toBe(true);
    expect(failed[0]).toContain('blue drawn on fewer than 2 goods');
  });

  it('holds the ration over the quirks the draw kept', () => {
    // The static ration bounds the reserve, and hiding only subtracts, so a
    // real draw cannot exceed it; the check is for a bound that stops being
    // static. Shown on a galaxy that has been given a second quirk.
    const content = aClothReserve({
      tags: [
        aTag(),
        aTag({ id: 'warm', class: 'quality', tells: ['fleece'] }),
        aTag({ id: 'blue', class: 'quirk', tells: ['indigo'] }),
        aTag({ id: 'torn', class: 'quirk', tells: ['frayed'] }),
      ],
      goods: [
        aGood({ id: 'silk', tags: ['warm', 'blue', 'torn'] }),
        aGood({ id: 'linen', name: 'Linen', tags: ['warm', 'blue', 'torn'] }),
      ],
      buyers: [aBuyer({ bonusTags: [] }), aBobWhoWants(['blue', 'torn'])],
      bounds: aBounds({ quirkRation: 2 }),
      drawParameters: aDrawParameters(),
    });
    const galaxy = galaxyOf(content, 1);

    expect(checkNamed('the quirk ration').miss(galaxy, content)).toBeNull();
    const rationed = { ...content, bounds: { ...content.bounds, quirkRation: 1 } };
    expect(checkNamed('the quirk ration').miss(galaxy, rationed)).toBe(
      'it drew 2 quirk tags, and the content set rationed them to 1',
    );
  });
});

describe('a named good, in the drawn galaxy', () => {
  it('re-rolls a draw that hid a good a buyer asks for by name', () => {
    const named = {
      buyers: [
        aBuyer({ bonusTags: [], wants: [{ goodId: 'silk' }] }),
        aBobWhoWants(['cloth', 'warm']),
      ],
      // Every cloth is warm and none is blue, so no other check can miss first.
      tags: [aTag(), aTag({ id: 'warm', class: 'quality', tells: ['fleece'] })],
      goods: [
        aGood({ id: 'silk', tags: ['warm'] }),
        aGood({ id: 'linen', name: 'Linen', tags: ['warm'] }),
        aGood({ id: 'canvas', name: 'Canvas', tags: ['warm'] }),
      ],
    };

    const failed = failures(aClothReserve({ ...named, drawParameters: noRerolls })).filter(
      (what) => what !== null,
    );

    expect(failed.length).toBeGreaterThan(0);
    expect(failed[0]).toContain('a named good is reachable: ilse wants silk, which was hidden');
    for (const seed of SEEDS) {
      const kept = galaxyOf(aClothReserve(named), seed);
      expect(kept.goods.map((good) => good.id)).toContain('silk');
    }
  });

  it('fails loudly where no drawn location supplies the good, whatever it re-rolls', () => {
    // Either place may fill the one slot. Galena is an ore, which only the
    // extractor supplies, so a draw that took the market names a good nobody
    // can sell: the goods pass cannot put a supplier on the map.
    const content = loadedContentSet({
      archetypes: [
        anArchetype({ supplies: ['cloth'] }),
        anArchetype({ id: 'extractor', supplies: ['ore'] }),
      ],
      locations: [
        aLocation(),
        aLocation({ id: 'hollow', name: "Grieve's Hollow", archetype: 'extractor' }),
      ],
      motifs: [aMotif({ slots: [aSlot()] })],
      tags: [aTag(), aTag({ id: 'ore', tells: ['ore'] })],
      goods: [aGood(), aGood({ id: 'galena', name: 'Galena', kind: 'ore' })],
      buyers: [
        aBuyer({ bonusTags: [], wants: [{ goodId: 'galena' }] }),
        aBobWhoWants(['cloth', 'ore']),
      ],
    });

    const failed = failures(content);

    expect(failed.some((what) => what === null)).toBe(true);
    expect(failed.find((what) => what !== null)).toContain(
      'ilse wants galena, which no drawn location supplies',
    );
  });
});

describe('the goods the draw keeps', () => {
  it('never takes a usable kind below its floor, whichever seed', () => {
    const content = aClothReserve();

    for (const seed of SEEDS) {
      const kept = galaxyOf(content, seed).goods.filter((good) => good.kind === 'cloth');
      expect(kept.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('misses a galaxy that left a usable kind below the floor', () => {
    const content = aClothReserve();
    const galaxy = galaxyOf(content, 1);
    const hidden = { ...galaxy, goods: galaxy.goods.slice(0, 1) };

    expect(checkNamed('the usability floor').miss(hidden, content)).toBe(
      'it left cloth with fewer goods than the floor of 2',
    );
  });

  it('misses a galaxy that dropped a kind a drawn archetype supplies', () => {
    const content = aClothReserve();
    const galaxy = galaxyOf(content, 1);

    expect(
      checkNamed('a kind a drawn archetype trades in stays in circulation').miss(
        { ...galaxy, kinds: [] },
        content,
      ),
    ).toBe('it dropped cloth, which a drawn archetype supplies or demands');
  });
});

describe('the people floor, in the drawn galaxy', () => {
  /** Two people at the one place, each hidden half the time and a person apiece wanted. */
  function aCastAtOnePlace(overrides: RawObject = {}): ContentSet {
    return aClothReserve({
      buyers: [
        aBuyer({ bonusTags: ['warm'] }),
        aBuyer({
          id: 'mara',
          name: 'Mara Quist',
          wants: [aWant({ predicate: [{ tag: 'blue' }] })],
        }),
      ],
      ...overrides,
    });
  }

  it('re-rolls the people pass when a drawn location is left with nobody on it', () => {
    const bare = failures(
      aCastAtOnePlace({
        drawParameters: aDrawParameters({ peopleHiddenPercent: 50, peopleFloor: 1, rerolls: 0 }),
      }),
    );
    const rerolled = aCastAtOnePlace({
      drawParameters: aDrawParameters({ peopleHiddenPercent: 50, peopleFloor: 1 }),
    });

    expect(bare.find((what) => what !== null)).toContain(
      'the per-location people floor: kestrel carried fewer than 1 people',
    );
    for (const seed of SEEDS) {
      expect(galaxyOf(rerolled, seed).people.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('is declared, and a floor of nought lets a location stand empty', () => {
    const content = aCastAtOnePlace({
      drawParameters: aDrawParameters({ peopleHiddenPercent: 100, peopleFloor: 0 }),
    });

    expect(galaxyOf(content, 1).people).toEqual([]);
  });
});

describe('the reserve surplus, per archetype', () => {
  /**
   * Two motifs of one slot, a market and an extractor, and two drawn a campaign:
   * an assembly can demand two of either. The reserve holds three markets and
   * two extractors.
   */
  function aReserveOfTwoKinds(reserveSurplus: number): ContentSet {
    const place = (id: string, archetype: string) =>
      aLocation({ id, name: `The ${id}`, archetype });
    return loadedContentSet({
      locations: [
        place('kestrel', 'market'),
        place('bellwether', 'market'),
        place('shoals', 'market'),
        place('hollow', 'extractor'),
        place('lament', 'extractor'),
      ],
      motifs: [
        aMotif({ id: 'stall', slots: [aSlot({ archetype: 'market' })] }),
        aMotif({ id: 'pit', slots: [aSlot({ archetype: 'extractor' })] }),
      ],
      drawParameters: aDrawParameters({ motifsPerCampaign: 2, reserveSurplus }),
    });
  }

  it('draws when every archetype holds the most an assembly can demand, plus the surplus', () => {
    for (const seed of SEEDS) {
      expect(drawGalaxy(aReserveOfTwoKinds(0), seed).ok).toBe(true);
    }
  });

  it('fails loudly naming the first archetype that is short, on every seed', () => {
    // One surplus, applied to each: the markets hold three of the three they
    // need and the extractors two of the three, so it is the extractors named.
    for (const seed of SEEDS) {
      expect(drawGalaxy(aReserveOfTwoKinds(1), seed)).toEqual({
        ok: false,
        problems: [
          {
            verdict: 'fails',
            where: 'drawParameters.reserveSurplus',
            what:
              'the reserve holds 2 extractor locations, and an assembly of 2 motifs can ' +
              'demand 2 of them, which with the surplus of 1 needs 3',
          },
        ],
      });
    }
  });
});
