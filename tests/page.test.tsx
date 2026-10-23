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
import { startCampaign, view } from '../src/engine';
import type { Command } from '../src/engine';
import { CampaignSurfaces } from '../src/page/CampaignSurfaces';
import { loadedContentSet } from './support/content';

afterEach(cleanup);

const SEED = 20261022;

function surfaces(options: { readonly onCommand?: (command: Command) => void } = {}) {
  const campaign = startCampaign(loadedContentSet(), SEED);
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
