/**
 * @vitest-environment jsdom
 *
 * The page gets tests only for rendering a read model it is handed, and no rule
 * is tested through the DOM: if a rule were reachable only through the page, it
 * would be in the wrong place (ADR 0003 decision 4).
 *
 * The read model here is built through the seam rather than by hand, so this
 * test cannot drift from what the engine actually returns.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isRejected, takeCommand, view } from '../src/engine';
import type { Campaign, Command, ContentSet } from '../src/engine';
import { CampaignSurfaces } from '../src/page/CampaignSurfaces';
import {
  aGalaxy,
  aMotifLane,
  aLocation,
  aShip,
  aStart,
  aTradingGalaxy,
  loadedContentSet,
} from './support/content';
import { after, started } from './support/campaign';

afterEach(cleanup);

const SEED = 20261022;

function surfaces(
  options: {
    readonly onCommand?: (command: Command) => void;
    readonly campaign?: Campaign;
  } = {},
) {
  const campaign = options.campaign ?? started(loadedContentSet(), SEED);
  return render(
    <CampaignSurfaces
      view={view(campaign)}
      seed={campaign.seed}
      refusal={null}
      onCommand={options.onCommand ?? (() => undefined)}
    />,
  );
}

describe('the campaign surfaces', () => {
  it('shows where the player is, the day and their credits', () => {
    surfaces();

    expect(screen.getByRole('heading', { name: 'Kestrel Reach' })).toBeDefined();
    expect(screen.getByText(/Firstday, 1 Thessaly, year 1/)).toBeDefined();
    expect(screen.getByText(/180 credits/)).toBeDefined();
  });

  it('shows the date rather than the day index the engine counts in', () => {
    // "day 214" is an engine artifact, not something a patron says (ADR 0005
    // decision 3). The index stays in the read model, where the harness's
    // per-day rows need it (#8), and off the page.
    surfaces();

    expect(screen.queryByText(/\bday 1\b/)).toBeNull();
  });

  it('offers what the engine says is on offer, and hands the command back', () => {
    const taken: Command[] = [];
    surfaces({ onCommand: (command) => taken.push(command) });

    screen.getByRole('button', { name: 'End the day' }).click();

    expect(taken).toEqual([{ kind: 'wait' }]);
  });

  it('says the day has not ended rather than showing an empty digest', () => {
    surfaces();

    expect(screen.getByText('The day has not ended yet.')).toBeDefined();
  });

  it('shows a refusal in the player’s own terms when the engine gives one', () => {
    const campaign = started(loadedContentSet(), SEED);
    render(
      <CampaignSurfaces
        view={view(campaign)}
        seed={SEED}
        refusal="That is not a command."
        onCommand={vi.fn()}
      />,
    );

    expect(screen.getByText('That is not a command.')).toBeDefined();
  });
});

/** Kestrel to Bellwether: distance 12 at speed 4, so three days and 120 credits. */
function aGalaxyOfTwo(overrides: Record<string, unknown> = {}): ContentSet {
  return loadedContentSet(
    aGalaxy({
      locations: [
        aLocation(),
        aLocation({ id: 'bellwether', name: 'Bellwether Yards', prose: 'A repair yard.' }),
      ],
      lanes: [aMotifLane({ ends: ['kestrel', 'bellwether'], distance: 12 })],
      start: aStart({ credits: 500 }),
      ...overrides,
    }),
  );
}

/**
 * Kestrel, two places a lane from it and one beyond, so a lane can fail to
 * touch here. At range 10 the far lane is out of reach and the near ones are
 * not, and the Shoals' way round to the Hollow keeps the map connected
 * (ADR 0006 decision 15). The assembly starts the player at the place the most
 * lanes touch (decision 16); all four have two each, and Kestrel takes the tie
 * because the fixture lists it first (`aGalaxy`).
 */
function aGalaxyOfFour(overrides: Record<string, unknown> = {}): ContentSet {
  return loadedContentSet(
    aGalaxy({
      locations: [
        aLocation(),
        aLocation({ id: 'bellwether', name: 'Bellwether Yards', prose: 'A repair yard.' }),
        aLocation({ id: 'hollow', name: "Grieve's Hollow", prose: 'A cut in a dead moon.' }),
        aLocation({ id: 'shoals', name: 'Thennet Shoals', prose: 'Tenders and tank farms.' }),
      ],
      lanes: [
        aMotifLane({ ends: ['kestrel', 'bellwether'], distance: 6 }),
        aMotifLane({ ends: ['bellwether', 'hollow'], distance: 16 }),
        aMotifLane({ ends: ['kestrel', 'shoals'], distance: 2 }),
        aMotifLane({ ends: ['shoals', 'hollow'], distance: 9 }),
      ],
      start: aStart({ credits: 500, ship: aShip({ range: 10 }) }),
      ...overrides,
    }),
  );
}

function flying(content: ContentSet, command: Command): Campaign {
  const result = takeCommand(started(content, SEED), command);
  if (isRejected(result)) throw new Error(result.rejected.message);
  return result.campaign;
}

describe('the chart on the page', () => {
  it('shows each lane with its days, its fare and where it leads', () => {
    surfaces({ campaign: started(aGalaxyOfTwo(), SEED) });

    const lane = screen.getByRole('row', { name: /Bellwether Yards/ });
    expect(lane.textContent).toContain('3 days');
    expect(lane.textContent).toContain('120');
  });

  it('shows a lane beyond the ship’s range as unflyable rather than hiding it', () => {
    // Bellwether is twelve away and the range ten, so the Shoals are the way
    // round that keeps it reachable (ADR 0006 decision 15).
    const content = aGalaxyOfTwo({
      locations: [
        aLocation(),
        aLocation({ id: 'bellwether', name: 'Bellwether Yards', prose: 'A repair yard.' }),
        aLocation({ id: 'shoals', name: 'Thennet Shoals', prose: 'Tenders and tank farms.' }),
      ],
      lanes: [
        aMotifLane({ ends: ['kestrel', 'bellwether'], distance: 12 }),
        aMotifLane({ ends: ['kestrel', 'shoals'], distance: 4 }),
        aMotifLane({ ends: ['shoals', 'bellwether'], distance: 8 }),
      ],
      start: aStart({ credits: 500, ship: aShip({ range: 10 }) }),
    });
    surfaces({ campaign: started(content, SEED) });

    expect(screen.getByText(/beyond your range/i)).toBeDefined();
    expect(screen.queryByRole('button', { name: /Depart for Bellwether Yards/ })).toBeNull();
  });

  it('departs along a lane, handing the engine’s own command back', () => {
    const taken: Command[] = [];
    surfaces({
      campaign: started(aGalaxyOfTwo(), SEED),
      onCommand: (command) => taken.push(command),
    });

    screen.getByRole('button', { name: /Depart for Bellwether Yards/ }).click();

    expect(taken).toEqual([{ kind: 'depart', toId: 'bellwether' }]);
  });

  it('says a lane is beyond range wherever it sits on the chart, not only from here', () => {
    // The chart carries the whole galaxy (ADR 0006 decision 5), so what the
    // ship cannot reach is readable before the player is standing at its end.
    surfaces({ campaign: started(aGalaxyOfFour(), SEED) });

    const far = screen
      .getAllByRole('row', { name: /Grieve's Hollow/ })
      .find((row) => row.textContent.includes('Bellwether Yards'));
    expect(far?.textContent).toContain('Beyond your range');
  });

  it('keeps the range reading while underway, and takes only the departures away', () => {
    surfaces({ campaign: flying(aGalaxyOfFour(), { kind: 'depart', toId: 'bellwether' }) });

    expect(screen.getByText('Beyond your range')).toBeDefined();
    expect(screen.queryByRole('button', { name: /Depart/ })).toBeNull();
  });

  it('lists the places on the chart, and says so when no lane is charted', () => {
    // A drawn place no lane touches is refused at the draw (ADR 0006
    // decision 15), so a chart with no lanes is a galaxy of one place.
    const content = aGalaxyOfTwo({ locations: [aLocation()], lanes: [] });
    surfaces({ campaign: started(content, SEED) });

    const places = screen.getByRole('list', { name: 'Locations' });
    expect(places.textContent).toContain('Kestrel Reach');
    expect(screen.getByText('No lanes are charted.')).toBeDefined();
  });

  it('says where the player is while underway, and offers no departure', () => {
    surfaces({ campaign: flying(aGalaxyOfTwo(), { kind: 'depart', toId: 'bellwether' }) });

    expect(screen.getByRole('heading', { name: 'In transit' })).toBeDefined();
    expect(screen.getByText(/out of Kestrel Reach/)).toBeDefined();
    expect(screen.getByText(/bound for Bellwether Yards/)).toBeDefined();
    expect(screen.queryByRole('button', { name: /Depart/ })).toBeNull();
  });
});

describe('the shop and the hold', () => {
  /** Kestrel's shop: lots of five at worth, and a hold of 100. */
  const atKestrel = () => started(loadedContentSet(aTradingGalaxy()), SEED);

  it('lists what is on sale here with its kind, how many are left and the price', () => {
    surfaces({ campaign: atKestrel() });

    const row = screen.getByRole('row', { name: /Bolt of silk/ });
    expect(within(row).getByText('cloth')).toBeDefined();
    expect(within(row).getByText('5')).toBeDefined();
    expect(within(row).getByText('40')).toBeDefined();
    expect(within(row).getByText('up to 4')).toBeDefined();
  });

  it('hands back a buy of the units the player asked for', () => {
    const taken: Command[] = [];
    surfaces({ campaign: atKestrel(), onCommand: (command) => taken.push(command) });

    fireEvent.change(screen.getByLabelText('Units of Ship blanket'), { target: { value: '3' } });
    screen.getByRole('button', { name: 'Buy Ship blanket' }).click();

    expect(taken).toEqual([{ kind: 'buy', lot: 'kestrel/blanket', quantity: 3 }]);
  });

  it('shows the hold, how full it is, and what is in it', () => {
    surfaces({ campaign: after(atKestrel(), { kind: 'buy', lot: 'kestrel/quilt', quantity: 2 }) });

    expect(screen.getByText('2 of 100 units')).toBeDefined();
    expect(screen.getByText('2 × Quilted roll (cloth)')).toBeDefined();
  });

  it('says so when the shop has nothing and the hold is empty', () => {
    surfaces();

    expect(screen.getByText('Nothing is on sale here.')).toBeDefined();
    expect(screen.getByText('The hold is empty.')).toBeDefined();
  });

  it('has no shop while underway', () => {
    surfaces({ campaign: after(atKestrel(), { kind: 'depart', toId: 'bellwether' }) });

    expect(screen.queryByRole('heading', { name: 'For sale' })).toBeNull();
  });
});
