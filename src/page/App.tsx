import { useEffect, useState } from 'react';
import {
  isRejected,
  startCampaign,
  takeCommand,
  view,
  type Campaign,
  type Command,
  type Problem,
} from '../engine';
import { CampaignSurfaces } from './CampaignSurfaces';
import { fetchContent } from './content';
import { seedFromUrl } from './seed';

/**
 * The page holds only view state and renders read models handed to it by one
 * engine query (ADR 0009 decision 10). No rule is decided here: what is on
 * offer, what a day costs and what a date is called all come back from `view`.
 * What the page does is word them.
 */
type Opening =
  | { readonly state: 'opening' }
  | { readonly state: 'unloadable'; readonly problems: readonly Problem[] }
  | { readonly state: 'playing'; readonly campaign: Campaign };

export function App() {
  const [opening, setOpening] = useState<Opening>({ state: 'opening' });
  const [refusal, setRefusal] = useState<string | null>(null);

  useEffect(() => {
    let abandoned = false;
    void fetchContent().then((result) => {
      if (abandoned) return;
      setOpening(
        result.ok
          ? { state: 'playing', campaign: startCampaign(result.content, seedFromUrl(location.search)) }
          : { state: 'unloadable', problems: result.problems },
      );
    });
    return () => {
      abandoned = true;
    };
  }, []);

  if (opening.state === 'opening') {
    return <Frame>Opening the campaign…</Frame>;
  }

  if (opening.state === 'unloadable') {
    return (
      <Frame>
        <h2 className="text-lg text-rose-300">The content set will not load.</h2>
        <ul className="mt-3 space-y-1 font-mono text-sm text-rose-200">
          {opening.problems.map((problem) => (
            <li key={`${problem.where}: ${problem.what}`}>
              {problem.where === '' ? 'the content set' : problem.where} — {problem.what}
            </li>
          ))}
        </ul>
      </Frame>
    );
  }

  const campaign = opening.campaign;
  const take = (command: Command) => {
    const result = takeCommand(campaign, command);
    if (isRejected(result)) {
      setRefusal(result.rejected.message);
      return;
    }
    setRefusal(null);
    setOpening({ state: 'playing', campaign: result.campaign });
  };

  return (
    <Frame>
      <CampaignSurfaces
        view={view(campaign)}
        seed={campaign.seed}
        refusal={refusal}
        onCommand={take}
      />
    </Frame>
  );
}

function Frame({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-stone-950 text-stone-200">
      <main className="mx-auto max-w-2xl px-4 py-10">{children}</main>
    </div>
  );
}
