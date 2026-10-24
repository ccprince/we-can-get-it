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
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isRejected, startCampaign, takeCommand, view } from '../src/engine';
import type { Campaign, Command, ContentSet } from '../src/engine';
import { CampaignSurfaces } from '../src/page/CampaignSurfaces';
import { aGalaxy, aMotifLane, aLocation, aShip, aStart, loadedContentSet } from './support/content';

afterEach(cleanup);

const SEED = 20261022;

function surfaces(
  options: {
    readonly onCommand?: (command: Command) => void;
    readonly campaign?: Campaign;
  } = {},
) {
  const campaign = options.campaign ?? startCampaign(loadedContentSet(), SEED);
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
    const campaign = startCampaign(loadedContentSet(), SEED);
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
 * not. Kestrel's second lane is what opens the campaign there: the assembly
 * starts the player at the place the most lanes touch (ADR 0006 decision 16).
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
      ],
      start: aStart({ credits: 500, ship: aShip({ range: 10 }) }),
      ...overrides,
    }),
  );
}

function flying(content: ContentSet, command: Command): Campaign {
  const result = takeCommand(startCampaign(content, SEED), command);
  if (isRejected(result)) throw new Error(result.rejected.message);
  return result.campaign;
}

describe('the chart on the page', () => {
  it('shows each lane with its days, its fare and where it leads', () => {
    surfaces({ campaign: startCampaign(aGalaxyOfTwo(), SEED) });

    const lane = screen.getByRole('row', { name: /Bellwether Yards/ });
    expect(lane.textContent).toContain('3 days');
    expect(lane.textContent).toContain('120');
  });

  it('shows a lane beyond the ship’s range as unflyable rather than hiding it', () => {
    const content = aGalaxyOfTwo({ start: aStart({ credits: 500, ship: aShip({ range: 10 }) }) });
    surfaces({ campaign: startCampaign(content, SEED) });

    expect(screen.getByText(/beyond your range/i)).toBeDefined();
    expect(screen.queryByRole('button', { name: /Depart for Bellwether Yards/ })).toBeNull();
  });

  it('departs along a lane, handing the engine’s own command back', () => {
    const taken: Command[] = [];
    surfaces({
      campaign: startCampaign(aGalaxyOfTwo(), SEED),
      onCommand: (command) => taken.push(command),
    });

    screen.getByRole('button', { name: /Depart for Bellwether Yards/ }).click();

    expect(taken).toEqual([{ kind: 'depart', toId: 'bellwether' }]);
  });

  it('says a lane is beyond range wherever it sits on the chart, not only from here', () => {
    // The chart carries the whole galaxy (ADR 0006 decision 5), so what the
    // ship cannot reach is readable before the player is standing at its end.
    surfaces({ campaign: startCampaign(aGalaxyOfFour(), SEED) });

    const far = screen.getByRole('row', { name: /Grieve's Hollow/ });
    expect(far.textContent).toContain('Beyond your range');
  });

  it('keeps the range reading while underway, and takes only the departures away', () => {
    surfaces({ campaign: flying(aGalaxyOfFour(), { kind: 'depart', toId: 'bellwether' }) });

    expect(screen.getByText('Beyond your range')).toBeDefined();
    expect(screen.queryByRole('button', { name: /Depart/ })).toBeNull();
  });

  it('lists every place on the chart, including one no lane touches', () => {
    const content = aGalaxyOfTwo({
      locations: [aLocation(), aLocation({ id: 'caravel', name: 'Caravel Station' })],
      lanes: [],
    });
    surfaces({ campaign: startCampaign(content, SEED) });

    const places = screen.getByRole('list', { name: 'Places' });
    expect(places.textContent).toContain('Kestrel Reach');
    expect(places.textContent).toContain('Caravel Station');
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
