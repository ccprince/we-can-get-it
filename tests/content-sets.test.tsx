/**
 * @vitest-environment jsdom
 *
 * Choosing the content set a campaign is played on (#117). The page learns
 * which sets it offers from a manifest, and a save names its set as well as
 * what it loads to. Tested whole, as the save tests are: `App` over a stubbed
 * `fetch` that answers by URL.
 */
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { identify, loadContent } from '../src/engine';
import { App } from '../src/page/App';
import { serveSets } from './support/serve';

const KEY = 'we-can-get-it/campaign';

const skeleton = readFileSync('content/walking-skeleton.json', 'utf8');

/** The same galaxy under another name, with one place renamed, so it is told apart on screen. */
function revised(prose: string): string {
  const edited = JSON.parse(skeleton) as { locations: { prose: string }[] };
  const [first] = edited.locations;
  if (first === undefined) throw new Error('the walking skeleton has no locations');
  first.prose = prose;
  return JSON.stringify(edited);
}

const other = revised('A yard rewritten for a second set.');

function identityOf(raw: string): string {
  const loaded = loadContent(JSON.parse(raw));
  if (!loaded.ok) throw new Error('the set did not load');
  return identify(loaded.content);
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const campaign = () => screen.findByRole('button', { name: 'End the day' });

function stored() {
  return JSON.parse(localStorage.getItem(KEY) ?? '') as Record<string, unknown>;
}

async function click(name: string | RegExp) {
  fireEvent.click(await screen.findByRole('button', { name }));
}

describe('opening on a content set', () => {
  it("opens on the manifest's first set, and records its name and identity", async () => {
    serveSets({ 'walking-skeleton': skeleton, second: other }, ['second', 'walking-skeleton']);
    render(<App />);
    await campaign();

    expect(stored()).toMatchObject({ set: 'second', identity: identityOf(other) });
  });

  it('opens a new campaign on the set the URL names', async () => {
    serveSets({ 'walking-skeleton': skeleton, second: other }, ['second', 'walking-skeleton']);
    history.replaceState(null, '', '/?content=walking-skeleton&seed=7');
    render(<App />);
    await campaign();

    expect(stored()).toMatchObject({ set: 'walking-skeleton', seed: 7 });
  });

  it('refuses a URL set the manifest does not list, and offers the picker', async () => {
    serveSets({ 'walking-skeleton': skeleton, second: other, draft: other }, [
      'second',
      'walking-skeleton',
    ]);
    history.replaceState(null, '', '/?content=draft');
    render(<App />);

    expect(await screen.findByText(/is not one the page offers/)).toBeDefined();
    expect(localStorage.getItem(KEY)).toBeNull();
    await click('Start a new campaign');
    expect(screen.getByRole('combobox')).toBeDefined();
  });

  it('resumes a save on its own set without asking, and says an ignored URL set was', async () => {
    serveSets({ 'walking-skeleton': skeleton, second: other }, ['second', 'walking-skeleton']);
    localStorage.setItem(
      KEY,
      JSON.stringify({
        set: 'walking-skeleton',
        identity: identityOf(skeleton),
        seed: 20261022,
        commands: [{ kind: 'wait' }],
      }),
    );
    history.replaceState(null, '', '/?content=second');
    render(<App />);
    await campaign();

    expect(screen.getByText('seed 20261022')).toBeDefined();
    expect(screen.getByText(/content set second was not started/)).toBeDefined();
  });

  it('reads a save from before saves named their set as the walking skeleton', async () => {
    serveSets({ 'walking-skeleton': skeleton, second: other }, ['second', 'walking-skeleton']);
    localStorage.setItem(
      KEY,
      JSON.stringify({ content: identityOf(skeleton), seed: 20261022, commands: [] }),
    );
    render(<App />);
    await campaign();

    expect(screen.queryByText(/different content set/)).toBeNull();
    await click('Start a new campaign');
    await click('Start over on seed 20261022');
    expect(stored()).toMatchObject({ set: 'walking-skeleton', identity: identityOf(skeleton) });
  });
});

describe('starting a new campaign on another set', () => {
  it('offers a picker at two sets, and starts the same seed on the other', async () => {
    serveSets({ 'walking-skeleton': skeleton, second: other }, ['walking-skeleton', 'second']);
    render(<App />);
    await campaign();

    await click('Start a new campaign');
    const picker = screen.getByRole<HTMLSelectElement>('combobox');
    expect(picker.value).toBe('walking-skeleton');
    fireEvent.change(picker, { target: { value: 'second' } });
    await click('Start over on seed 20261022');
    await campaign();

    expect(stored()).toMatchObject({ set: 'second', seed: 20261022, commands: [] });
  });

  it('offers no picker when the manifest lists one set', async () => {
    serveSets({ 'walking-skeleton': skeleton, second: other }, ['walking-skeleton']);
    render(<App />);
    await campaign();
    await click('Start a new campaign');

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText(/ends the campaign in progress/)).toBeDefined();
  });
});

describe('a set that cannot be played', () => {
  it('refuses a save on a set revised under the same name, and keeps it', async () => {
    serveSets({ 'walking-skeleton': other }, ['walking-skeleton']);
    const save = JSON.stringify({
      set: 'walking-skeleton',
      identity: identityOf(skeleton),
      seed: 20261022,
      commands: [],
    });
    localStorage.setItem(KEY, save);
    render(<App />);

    expect(await screen.findByText(/played on a different content set/)).toBeDefined();
    expect(localStorage.getItem(KEY)).toBe(save);
  });

  it.each([
    ['unlisted', 'draft'],
    ['listed but not served', 'gone'],
  ])('keeps and shows a save whose set is %s, with the picker offered', async (_, set) => {
    serveSets({ 'walking-skeleton': skeleton, second: other }, [
      'walking-skeleton',
      'second',
      ...(set === 'gone' ? ['gone'] : []),
    ]);
    const save = JSON.stringify({
      set,
      identity: identityOf(skeleton),
      seed: 1,
      commands: [],
    });
    localStorage.setItem(KEY, save);
    render(<App />);

    expect(await screen.findByText('The saved campaign will not replay.')).toBeDefined();
    expect(screen.getByText('The save is kept as it was:')).toBeDefined();
    expect(localStorage.getItem(KEY)).toBe(save);
    await click('Start a new campaign');
    expect(screen.getByRole('combobox')).toBeDefined();
  });

  it('shows the problems of a set that will not load, with the picker offered', async () => {
    serveSets({ 'walking-skeleton': skeleton, broken: '{"locations": []}' }, [
      'broken',
      'walking-skeleton',
    ]);
    render(<App />);

    expect(await screen.findByText('The content set will not load.')).toBeDefined();
    await click('Start a new campaign');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'walking-skeleton' } });
    await click('Start on a new seed');
    await campaign();
  });

  it('reports a set that cannot be fetched as unreachable, with the picker offered', async () => {
    serveSets({ 'walking-skeleton': skeleton }, ['missing', 'walking-skeleton']);
    render(<App />);

    expect(await screen.findByText('The content set could not be fetched.')).toBeDefined();
    await click('Start a new campaign');
    expect(screen.getByRole('combobox')).toBeDefined();
  });
});

describe('a manifest that is broken', () => {
  it.each([
    ['is not a list', { sets: [] }],
    ['is not a list of names', ['walking-skeleton', 3]],
    ['is empty', []],
  ])('names it plainly when it %s, and attempts nothing else', async (_, manifest) => {
    serveSets({ 'walking-skeleton': skeleton }, manifest);
    render(<App />);

    expect(await screen.findByText('The list of content sets could not be had.')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Start a new campaign' })).toBeNull();
  });

  it('names it plainly when it cannot be fetched', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 404 })));
    render(<App />);

    expect(await screen.findByText('The list of content sets could not be had.')).toBeDefined();
  });
});
