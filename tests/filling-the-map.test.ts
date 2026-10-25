import { describe, expect, it } from 'vitest';
import { drawGalaxy, view } from '../src/engine';
import type { ContentSet } from '../src/engine';
import {
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
import { started } from './support/campaign';

/**
 * The **draw**'s later stages — **kinds**, **goods** and people — filled into the
 * map, each conditioned on what the map above it has fixed (ADR 0008
 * decision 2). Read through the draw's **reporting mode**, which is the same
 * function a campaign opens on, called without starting one (decision 18).
 */
const SEEDS = Array.from({ length: 24 }, (_, at) => at + 1);

function galaxyOf(content: ContentSet, seed: number) {
  const drawn = drawGalaxy(content, seed);
  if (!drawn.ok) throw new Error(`the draw failed: ${JSON.stringify(drawn.problems)}`);
  return drawn.galaxy;
}

describe('the draw in reporting mode', () => {
  it('gives the galaxy a campaign on the same seed opens on, without starting one', () => {
    const content = loadedContentSet({
      locations: [aLocation(), aLocation({ id: 'hollow', name: "Grieve's Hollow" })],
      motifs: [aMotif({ slots: [aSlot()] })],
      drawParameters: aDrawParameters(),
    });

    for (const seed of [1, 2, 3, 4]) {
      const drawn = galaxyOf(content, seed).locations.map((location) => location.name);
      expect(drawn).toEqual(view(started(content, seed)).chart.locations.map((at) => at.name));
    }
  });
});

/**
 * A reserve of two places and two kinds. The one motif has a single slot, typed
 * by whichever archetype the test names, so the map is forced and the test is
 * about what fills it: Kestrel is the `market`, which supplies `cloth`, and the
 * Hollow the `extractor`, which demands `ore`. `cloth` carries four goods and
 * `ore` one.
 */
function aFilledReserve(slot: string, overrides: RawObject = {}): ContentSet {
  return loadedContentSet({
    archetypes: [
      anArchetype({ supplies: ['cloth'] }),
      anArchetype({ id: 'extractor', demands: ['ore'] }),
      anArchetype({ id: 'processor' }),
    ],
    locations: [
      aLocation(),
      aLocation({ id: 'hollow', name: "Grieve's Hollow", archetype: 'extractor' }),
    ],
    motifs: [aMotif({ slots: [aSlot({ archetype: slot })] })],
    tags: [
      aTag(),
      aTag({ id: 'ore', tells: ['ore'] }),
      aTag({ id: 'warm', class: 'quality', tells: ['fleece'] }),
    ],
    goods: [
      aGood({ id: 'silk', tags: ['warm'] }),
      aGood({ id: 'linen', name: 'Linen', tags: ['warm'] }),
      aGood({ id: 'canvas', name: 'Canvas' }),
      aGood({ id: 'felt', name: 'Felt' }),
      aGood({ id: 'galena', name: 'Galena', prose: 'Lead ore.', kind: 'ore' }),
    ],
    buyers: [
      aBuyer(),
      aBuyer({
        id: 'oskar',
        name: 'Oskar Venn',
        locationId: 'hollow',
        wants: [aWant({ predicate: [{ tag: 'ore' }] })],
      }),
    ],
    drawParameters: aDrawParameters({ goodsHiddenPercent: 50 }),
    ...overrides,
  });
}

describe('kinds, drawn against the map', () => {
  it('keeps a kind some drawn archetype supplies, and may drop one nobody drawn touches', () => {
    // The market is drawn and supplies cloth; the extractor is not, so nothing
    // drawn supplies or demands ore, and ore is the one kind that may be
    // dropped entire (ADR 0008 decision 11).
    const content = aFilledReserve('market');

    const kinds = SEEDS.map((seed) => galaxyOf(content, seed).kinds);

    expect(kinds.every((drawn) => drawn.includes('cloth'))).toBe(true);
    expect(kinds.some((drawn) => drawn.includes('ore'))).toBe(true);
    expect(kinds.some((drawn) => !drawn.includes('ore'))).toBe(true);
  });

  it('keeps a kind a drawn archetype only demands', () => {
    // The extractor demands ore and supplies nothing, and that is enough.
    const content = aFilledReserve('extractor');

    for (const seed of SEEDS) {
      expect(galaxyOf(content, seed).kinds).toContain('ore');
    }
  });
});

describe('goods, hidden within a kind', () => {
  /** The cloth goods a galaxy drew, by id. */
  function clothIn(content: ContentSet, seed: number): readonly string[] {
    return galaxyOf(content, seed)
      .goods.filter((good) => good.kind === 'cloth')
      .map((good) => good.id);
  }

  it('hides goods, and never takes a kind below the floor the content set declares', () => {
    // The market supplies cloth, so it stays; at nine in ten hidden, cloth's
    // four goods would usually fall to none, and the floor of 2 holds them.
    const content = aFilledReserve('market', {
      drawParameters: aDrawParameters({ goodsHiddenPercent: 90 }),
    });

    const drawn = SEEDS.map((seed) => clothIn(content, seed));

    expect(drawn.every((goods) => goods.length >= 2)).toBe(true);
    expect(drawn.some((goods) => goods.length < 4)).toBe(true);
    // Which goods are hidden moves with the seed: findings §2.5's *what*.
    expect(new Set(drawn.map((goods) => goods.join(','))).size).toBeGreaterThan(1);
  });

  it('reads the floor from the content set rather than holding one of its own', () => {
    const content = aFilledReserve('market', {
      bounds: { ...loadedContentSet().bounds, usabilityFloor: 3 },
      drawParameters: aDrawParameters({ goodsHiddenPercent: 100 }),
    });

    for (const seed of SEEDS) {
      expect(clothIn(content, seed)).toHaveLength(3);
    }
  });

  it('drops a kind nothing drawn trades in whole, rather than hiding it below its floor', () => {
    // With only the extractor drawn, nothing supplies or demands cloth. Where
    // the rate wants more of it hidden than the floor allows, the kind goes
    // entire, and its goods with it; where it stays, it keeps its floor.
    const content = aFilledReserve('extractor', {
      drawParameters: aDrawParameters({ goodsHiddenPercent: 60 }),
    });

    const drawn = SEEDS.map((seed) => ({
      kinds: galaxyOf(content, seed).kinds,
      cloth: clothIn(content, seed),
    }));

    expect(drawn.some(({ kinds }) => !kinds.includes('cloth'))).toBe(true);
    expect(drawn.some(({ kinds }) => kinds.includes('cloth'))).toBe(true);
    for (const { kinds, cloth } of drawn) {
      if (kinds.includes('cloth')) expect(cloth.length).toBeGreaterThanOrEqual(2);
      else expect(cloth).toEqual([]);
    }
  });

  it('draws every good when nothing is to be hidden', () => {
    const content = aFilledReserve('extractor', {
      drawParameters: aDrawParameters({ goodsHiddenPercent: 0 }),
    });

    expect(galaxyOf(content, 1).goods.map((good) => good.id)).toEqual([
      'canvas',
      'felt',
      'galena',
      'linen',
      'silk',
    ]);
  });
});

describe('people, hidden per person', () => {
  /** Ilse and Mara both stand at Kestrel, and Oskar at the Hollow. */
  function aCast(slot: string, peopleHiddenPercent: number): ContentSet {
    const content = aFilledReserve(slot);
    return loadedContentSet({
      ...content,
      buyers: [
        ...content.buyers,
        aBuyer({ id: 'mara', name: 'Mara Quist', locationId: 'kestrel' }),
      ],
      drawParameters: aDrawParameters({ peopleHiddenPercent }),
    });
  }

  function peopleIn(content: ContentSet, seed: number): readonly string[] {
    return galaxyOf(content, seed).people.map((person) => person.id);
  }

  it('hides people one at a time, so a drawn location is a fresh question of who is there', () => {
    // Hiding wholesale by location reproduces the prototype's failure verbatim
    // (ADR 0008 decision 10). Two people at the one drawn place, and over the
    // seeds each turns up without the other.
    const content = aCast('market', 50);

    const drawn = SEEDS.map((seed) => peopleIn(content, seed));

    expect(drawn).toContainEqual(['ilse']);
    expect(drawn).toContainEqual(['mara']);
  });

  it('takes the people of an undrawn location with it: they have nowhere to stand', () => {
    // Nothing is hidden, and Oskar is still absent: the Hollow was not drawn.
    const content = aCast('market', 0);

    for (const seed of SEEDS) {
      expect(peopleIn(content, seed)).toEqual(['ilse', 'mara']);
    }
  });
});

describe('the whole cascade, seed for seed', () => {
  /** An untyped slot, so the map moves with the seed as well as what fills it. */
  function aVaryingReserve(): ContentSet {
    const content = aFilledReserve('market');
    return loadedContentSet({
      ...content,
      motifs: [aMotif({ slots: [aSlot()] })],
      drawParameters: aDrawParameters({ goodsHiddenPercent: 50, peopleHiddenPercent: 50 }),
    });
  }

  it('gives the same filled galaxy for the same content set and seed, byte for byte', () => {
    for (const seed of SEEDS) {
      expect(JSON.stringify(galaxyOf(aVaryingReserve(), seed))).toBe(
        JSON.stringify(galaxyOf(aVaryingReserve(), seed)),
      );
    }
  });

  it('gives seeds that differ in who and what was hidden, as well as in the map', () => {
    const content = aVaryingReserve();
    const drawn = SEEDS.map((seed) => galaxyOf(content, seed));
    const distinct = (read: (galaxy: (typeof drawn)[number]) => unknown) =>
      new Set(drawn.map((galaxy) => JSON.stringify(read(galaxy)))).size;

    expect(distinct((galaxy) => galaxy.locations)).toBeGreaterThan(1);
    expect(distinct((galaxy) => galaxy.goods)).toBeGreaterThan(1);
    expect(distinct((galaxy) => galaxy.people)).toBeGreaterThan(1);
  });

  it('gives the same filled galaxy whatever order the content file lists things in', () => {
    // Written order never decides an outcome (ADR 0009 decision 3).
    const written = aVaryingReserve();
    const backwards = loadedContentSet({
      ...written,
      archetypes: [...written.archetypes].reverse(),
      tags: [...written.tags].reverse(),
      goods: [...written.goods].reverse(),
      buyers: [...written.buyers].reverse(),
    });

    for (const seed of SEEDS) {
      expect(galaxyOf(backwards, seed)).toEqual(galaxyOf(written, seed));
    }
  });

  it('leaves hidden goods and hidden people no trace inside the campaign', () => {
    // On the same terms as a hidden location (ADR 0008 decision 4): the
    // campaign holds the galaxy the draw gave and nothing of the reserve
    // beyond it, and nothing a player reads names what was hidden.
    const content = aVaryingReserve();
    let hiddenAtAll = 0;

    for (const seed of SEEDS) {
      const galaxy = galaxyOf(content, seed);
      const campaign = started(content, seed);
      const hidden = [
        ...content.goods.filter((good) => !galaxy.goods.includes(good)),
        ...content.buyers.filter((person) => !galaxy.people.includes(person)),
      ].map((thing) => thing.name);
      const read = JSON.stringify(view(campaign));
      hiddenAtAll += hidden.length;

      expect(campaign.galaxy).toEqual(galaxy);
      expect(hidden.filter((name) => read.includes(name))).toEqual([]);
    }
    // Not vacuous: at a half hidden, the seeds hid something to leave out.
    expect(hiddenAtAll).toBeGreaterThan(0);
  });
});
