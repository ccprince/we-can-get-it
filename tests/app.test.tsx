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
    serve(walkingSkeleton);
    render(<App />);
    const depart = await screen.findByRole('button', { name: 'Depart for Thennet Shoals' });

    fireEvent.click(depart);

    expect(
      await screen.findByText('1 day out of Bellwether Yards, you set down at Thennet Shoals.'),
    ).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Thennet Shoals' })).toBeDefined();
    expect(screen.getByText(/370 credits/)).toBeDefined();
  });

  it('says so when the content set cannot be fetched at all', async () => {
    serve('', false);
    render(<App />);

    expect(await screen.findByText('The content set could not be fetched.')).toBeDefined();
  });

  it('says plainly when the content set will not load, naming what and where', async () => {
    // Archetypes enough to read the locations against, so the problem the page
    // shows is the empty chart and not the missing enumeration above it.
    serve(JSON.stringify({ archetypes: ['market'], locations: [] }));
    render(<App />);

    expect(await screen.findByText('The content set will not load.')).toBeDefined();
    expect(screen.getByText(/locations — names no locations/)).toBeDefined();
  });
});
