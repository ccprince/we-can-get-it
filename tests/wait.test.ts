import { describe, expect, it } from 'vitest';
import { isRejected, startCampaign, takeCommand, view } from '../src/engine';
import type { Campaign, Command } from '../src/engine';
import { aStart, loadedContentSet } from './support/content';

const SEED = 20261022;
const WAIT: Command = { kind: 'wait' };

function accepted(campaign: Campaign, command: Command): Campaign {
  const result = takeCommand(campaign, command);
  if (isRejected(result)) {
    throw new Error(`the command was rejected: ${result.rejected.message}`);
  }
  return result.campaign;
}

describe('wait', () => {
  it('ends the day, advancing it by one', () => {
    const campaign = startCampaign(loadedContentSet(), SEED);

    const tomorrow = view(accepted(campaign, WAIT));
    expect(tomorrow.today.day).toBe(2);
    expect(tomorrow.today.date.label).toBe('Seconday, 2 Thessaly, year 1');
  });

  it('goes nowhere: the player is where they were', () => {
    const campaign = startCampaign(loadedContentSet(), SEED);

    expect(view(accepted(campaign, WAIT)).here).toEqual(view(campaign).here);
  });

  it('costs nothing: waiting costs only days', () => {
    const campaign = startCampaign(loadedContentSet({ start: aStart({ credits: 42 }) }), SEED);

    expect(view(accepted(campaign, WAIT)).credits).toEqual({ credits: 42 });
  });

  it('produces a digest for the day that ended, which so far says nothing', () => {
    const campaign = startCampaign(loadedContentSet(), SEED);

    expect(view(accepted(campaign, WAIT)).digest).toEqual({
      day: 1,
      date: {
        label: 'Firstday, 1 Thessaly, year 1',
        weekday: 'Firstday',
        dayOfMonth: 1,
        month: 'Thessaly',
        year: 1,
      },
      entries: [],
    });
  });

  it('is chosen one day at a time: two waits are two days, each with its digest', () => {
    const campaign = startCampaign(loadedContentSet(), SEED);

    const third = view(accepted(accepted(campaign, WAIT), WAIT));
    expect(third.today.day).toBe(3);
    expect(third.digest?.day).toBe(2);
  });

  it('leaves the campaign it was handed untouched', () => {
    const campaign = startCampaign(loadedContentSet(), SEED);
    const before = view(campaign);

    accepted(campaign, WAIT);

    expect(view(campaign)).toEqual(before);
  });
});

describe('a rejected command', () => {
  it('returns a reason instead of throwing, and says why', () => {
    const campaign = startCampaign(loadedContentSet(), SEED);

    const result = takeCommand(campaign, { kind: 'depart' } as unknown as Command);

    expect(isRejected(result)).toBe(true);
    if (!isRejected(result)) return;
    expect(result.rejected.code).toBe('not-a-command');
    expect(result.rejected.message).not.toBe('');
  });

  it('leaves the campaign untouched', () => {
    const campaign = startCampaign(loadedContentSet(), SEED);
    const before = view(campaign);

    takeCommand(campaign, undefined as unknown as Command);

    expect(view(campaign)).toEqual(before);
  });
});
