/**
 * @vitest-environment jsdom
 *
 * The thinnest complete path through every layer: the page fetches a content
 * set, hands it to the one validator, starts a campaign, renders the read
 * models and sends a command back to the engine.
 *
 * This is a test of the wiring, not of a rule — every rule it leans on is
 * asserted at the seam, where it can be reached without a DOM (ADR 0003
 * decision 4).
 */
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/page/App';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function serve(body: string, ok = true) {
  vi.stubGlobal('fetch', () => Promise.resolve(new Response(body, { status: ok ? 200 : 404 })));
}

const walkingSkeleton = readFileSync('content/walking-skeleton.json', 'utf8');

describe('the page', () => {
  it('opens a campaign from the content set it fetched', async () => {
    serve(walkingSkeleton);
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Bellwether Yards' })).toBeDefined();
    expect(screen.getByText(/Firstday, 1 Thessaly, year 1/)).toBeDefined();
    expect(screen.getByText(/400 credits/)).toBeDefined();
  });

  it('sends a command to the engine and renders the campaign that comes back', async () => {
    serve(walkingSkeleton);
    render(<App />);
    const wait = await screen.findByRole('button', { name: 'End the day' });

    fireEvent.click(wait);

    expect(await screen.findByText(/Seconday, 2 Thessaly, year 1/)).toBeDefined();
    expect(screen.getByText('Nothing reached you.')).toBeDefined();
  });

  it('departs along a lane and lands, with the span in the digest', async () => {
    // The galaxy is drawn from the seed now, so which places this campaign got
    // is neither the page's business nor this test's: it takes the first
    // departure the chart offers and checks that flying it lands the player
    // there, with the span in the digest.
    serve(walkingSkeleton);
    render(<App />);
    const departures = await screen.findAllByRole('button', { name: /^Depart for / });
    const depart = departures[0];
    if (depart === undefined) throw new Error('the chart offered no departure');
    const destination = depart.textContent?.replace('Depart for ', '') ?? '';

    fireEvent.click(depart);
    // A leg is flown day by day, and how many days depends on the lane this
    // campaign happened to be dealt (ADR 0005 decision 10).
    while (screen.queryByRole('heading', { name: destination }) === null) {
      fireEvent.click(await screen.findByRole('button', { name: 'End the day' }));
    }

    expect(screen.getByText(new RegExp(`you set down at ${destination}`))).toBeDefined();
    expect(screen.getByRole('heading', { name: destination })).toBeDefined();
  });

  it('says so when the content set cannot be fetched at all', async () => {
    serve('', false);
    render(<App />);

    expect(await screen.findByText('The content set could not be fetched.')).toBeDefined();
  });

  it('says plainly when the content set will not load, naming what and where', async () => {
    // Archetypes enough to read the locations against, so the problem the page
    // shows is the empty chart and not the missing enumeration above it.
    serve(JSON.stringify({ archetypes: [{ id: 'market' }], locations: [] }));
    render(<App />);

    expect(await screen.findByText('The content set will not load.')).toBeDefined();
    expect(screen.getByText(/locations — names no locations/)).toBeDefined();
  });
});
