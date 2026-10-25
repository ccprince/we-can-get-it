import { describe, expect, it } from 'vitest';
import { view } from '../src/engine';
import { aGalaxy, aMotifLane, aLocation, aStart, loadedContentSet } from './support/content';
import { started } from './support/campaign';

const SEED = 20261022;

describe('startCampaign', () => {
  it('opens the campaign where the content set says, on the day it says', () => {
    const campaign = started(loadedContentSet(), SEED);

    const { here, today, credits } = view(campaign);
    expect(here).toEqual({
      name: 'Kestrel Reach',
      prose: 'A yard town that has outlived three owners and kept all their paperwork.',
    });
    expect(today).toEqual({
      day: 1,
      date: {
        label: 'Firstday, 1 Thessaly, year 1',
        weekday: 'Firstday',
        dayOfMonth: 1,
        month: 'Thessaly',
        year: 1,
      },
    });
    expect(credits).toEqual({ credits: 180 });
  });

  it('converts a day index the player never sees into a date they do', () => {
    // Day 38 of a 6-day week, 30-day month, 60-day year: the 8th of the second
    // month, and the second day of the week.
    const campaign = started(loadedContentSet({ start: aStart({ day: 38 }) }), SEED);

    expect(view(campaign).today).toEqual({
      day: 38,
      date: {
        label: 'Seconday, 8 Ambit, year 1',
        weekday: 'Seconday',
        dayOfMonth: 8,
        month: 'Ambit',
        year: 1,
      },
    });
  });

  it('rolls the year over when the day index runs past its end', () => {
    // Day 61 is the first day of the second year, and the week runs on through
    // the year boundary: 60 days is ten whole weeks.
    const campaign = started(loadedContentSet({ start: aStart({ day: 61 }) }), SEED);

    expect(view(campaign).today.date).toEqual({
      label: 'Firstday, 1 Thessaly, year 2',
      weekday: 'Firstday',
      dayOfMonth: 1,
      month: 'Thessaly',
      year: 2,
    });
  });

  it('offers the player what where they are makes available, and no wording', () => {
    const campaign = started(loadedContentSet(), SEED);

    expect(view(campaign).menu).toEqual({ offered: [{ kind: 'wait' }] });
  });

  it('has no digest before a day has ended', () => {
    const campaign = started(loadedContentSet(), SEED);

    expect(view(campaign).digest).toBeNull();
  });

  it('starts at the best-connected place the assembly drew, not one the content named', () => {
    // A start on a spur makes the first decision "fly out, or fly out"
    // (ADR 0006 decision 16), so the assembly opens the campaign at the place
    // the most lanes touch. Here that is the Ladder, which has two where the
    // other two places have one each — and nothing in the content set says so.
    const content = loadedContentSet(
      aGalaxy({
        locations: [
          aLocation(),
          aLocation({ id: 'ladder', name: "Jacob's Ladder", prose: 'A gantry.' }),
          aLocation({ id: 'hollow', name: "Grieve's Hollow", prose: 'A cut in a dead moon.' }),
        ],
        lanes: [
          aMotifLane({ ends: ['kestrel', 'ladder'], distance: 6 }),
          aMotifLane({ ends: ['ladder', 'hollow'], distance: 8 }),
        ],
      }),
    );

    expect(view(started(content, SEED)).here?.name).toBe("Jacob's Ladder");
  });
});
