/**
 * @vitest-environment jsdom
 *
 * Save and resume (#20, #53). A save is a seed, a command sequence and the
 * identity of the content set it was played on, written after each command and
 * replayed through the engine on open (ADR 0009 decision 11).
 * A reload is a render of the page after the last one is gone, with the same
 * `localStorage` underneath it.
 */
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { identify, loadContent } from '../src/engine';
import { App } from '../src/page/App';

/** Where the page keeps its save. Stated here, not imported: it is the save's address. */
const KEY = 'we-can-get-it/campaign';

const walkingSkeleton = readFileSync('content/walking-skeleton.json', 'utf8');

/** The identity a save played on the walking skeleton records. */
const loaded = loadContent(JSON.parse(walkingSkeleton));
if (!loaded.ok) throw new Error('the walking skeleton did not load');
const identity = identify(loaded.content);

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', () => Promise.resolve(new Response(walkingSkeleton)));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Open the page and wait for the campaign to be on it. */
async function open() {
  const page = render(<App />);
  await screen.findByRole('button', { name: 'End the day' });
  return page;
}

/** Close the tab and open the page again. */
async function reload(page: ReturnType<typeof render>) {
  page.unmount();
  return open();
}

/** Close the tab, change the content file the page fetches, and open it again. */
function reopenOn(page: ReturnType<typeof render>, content: unknown) {
  page.unmount();
  vi.stubGlobal('fetch', () => Promise.resolve(new Response(JSON.stringify(content))));
  return render(<App />);
}

async function click(name: string | RegExp) {
  const [button] = await screen.findAllByRole('button', { name });
  if (button === undefined) throw new Error(`nothing on the page is called ${String(name)}`);
  fireEvent.click(button);
}

describe('saving and resuming a campaign', () => {
  it('replays a recorded command sequence into the identical view', async () => {
    const page = await open();
    await click('End the day');
    await click(/^Depart for /);
    await click('End the day');
    const played = page.container.innerHTML;

    const resumed = await reload(page);

    expect(resumed.container.innerHTML).toBe(played);
  });

  it('says plainly when the engine refuses a stored command, and keeps the save', async () => {
    const stored = JSON.stringify({
      content: identity,
      seed: 20261022,
      commands: [{ kind: 'wait' }, { kind: 'depart', toId: 'nowhere-at-all' }],
    });
    localStorage.setItem(KEY, stored);

    render(<App />);

    expect(await screen.findByText('The saved campaign will not replay.')).toBeDefined();
    expect(screen.getByText(/command 2 of 2/)).toBeDefined();
    expect(screen.getByText(/No lane runs from here to there/)).toBeDefined();
    expect(screen.queryByRole('button', { name: 'End the day' })).toBeNull();
    expect(localStorage.getItem(KEY)).toBe(stored);
  });

  it('says plainly when what is stored is not a save at all, and keeps it', async () => {
    localStorage.setItem(KEY, '{"seed": 4, "comm');

    render(<App />);

    expect(await screen.findByText('The saved campaign will not replay.')).toBeDefined();
    expect(screen.getByText(/is not a save/)).toBeDefined();
    expect(localStorage.getItem(KEY)).toBe('{"seed": 4, "comm');
  });

  it('refuses a save played on a different content set, says so, and keeps the save', async () => {
    const page = await open();
    await click('End the day');
    await click(/^Depart for /);
    const stored = localStorage.getItem(KEY);

    // One value changed, prose only: every stored command is still accepted.
    const edited = JSON.parse(walkingSkeleton) as { locations: { prose: string }[] };
    const [first] = edited.locations;
    if (first === undefined) throw new Error('the walking skeleton has no locations');
    first.prose = 'A yard rewritten since the campaign was saved.';
    reopenOn(page, edited);

    expect(
      await screen.findByText('The saved campaign was played on a different content set.'),
    ).toBeDefined();
    expect(screen.getByText(/Restoring the content set it was played on/)).toBeDefined();
    expect(screen.getByText('The save is kept as it was:')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Start a new campaign' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'End the day' })).toBeNull();
    expect(localStorage.getItem(KEY)).toBe(stored);
  });

  it('resumes a save on the same content set written in another order', async () => {
    const page = await open();
    await click('End the day');
    await click(/^Depart for /);
    const played = page.container.innerHTML;

    const reordered = JSON.parse(walkingSkeleton) as { locations: unknown[]; motifs: unknown[] };
    reordered.locations.reverse();
    reordered.motifs.reverse();
    const resumed = reopenOn(page, reordered);
    await screen.findByRole('button', { name: 'End the day' });

    expect(resumed.container.innerHTML).toBe(played);
  });

  it('reports a save from before saves named their content set, and keeps it', async () => {
    const stored = JSON.stringify({ seed: 20261022, commands: [{ kind: 'wait' }] });
    localStorage.setItem(KEY, stored);

    render(<App />);

    expect(await screen.findByText(/is not a save/)).toBeDefined();
    expect(localStorage.getItem(KEY)).toBe(stored);
  });

  it('starts a new campaign only when asked twice, and saves over the old one then', async () => {
    const page = await open();
    await click('End the day');
    const played = page.container.innerHTML;

    await click('Start a new campaign');
    expect(screen.getByText(/ends the campaign in progress/)).toBeDefined();
    await click('Keep playing');
    expect(page.container.innerHTML).toBe(played);

    await click('Start a new campaign');
    await click('Start it');
    expect(screen.getByText('The day has not ended yet.')).toBeDefined();
    expect(JSON.parse(localStorage.getItem(KEY) ?? '')).toEqual({
      content: identity,
      seed: 20261022,
      commands: [],
    });
  });

  it('offers a new campaign beside a save that will not replay, and only when asked', async () => {
    localStorage.setItem(KEY, 'not a save');
    render(<App />);

    await click('Start a new campaign');
    expect(localStorage.getItem(KEY)).toBe('not a save');
    await click('Start it');

    expect(await screen.findByRole('button', { name: 'End the day' })).toBeDefined();
    expect(JSON.parse(localStorage.getItem(KEY) ?? '')).toEqual({
      content: identity,
      seed: 20261022,
      commands: [],
    });
  });

  it('resumes the save rather than the seed a URL asks for, and says so', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ content: identity, seed: 20261022, commands: [{ kind: 'wait' }] }),
    );
    history.replaceState(null, '', '/?seed=7');
    try {
      await open();

      expect(screen.getByText('seed 20261022')).toBeDefined();
      expect(screen.getByText(/seed 7 was not started/)).toBeDefined();
    } finally {
      history.replaceState(null, '', '/');
    }
  });

  it('says so when the campaign cannot be saved, and plays on', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('the quota is spent');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage is blocked');
    });
    try {
      await open();
      expect(screen.getByText(/not being saved, so a reload would lose it/)).toBeDefined();

      await click('End the day');
      expect(screen.getByText(/Seconday, 2 Thessaly, year 1/)).toBeDefined();
    } finally {
      vi.restoreAllMocks();
    }
  });
});
