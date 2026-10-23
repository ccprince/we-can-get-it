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
type CampaignState =
  | { readonly state: 'opening' }
  | { readonly state: 'unreachable'; readonly why: string }
  | { readonly state: 'unloadable'; readonly problems: readonly Problem[] }
  | { readonly state: 'playing'; readonly campaign: Campaign };

export function App() {
  const [campaignState, setCampaignState] = useState<CampaignState>({ state: 'opening' });
  const [refusal, setRefusal] = useState<string | null>(null);

  useEffect(() => {
    let abandoned = false;
    void fetchContent()
      .then((result) => {
        if (abandoned) return;
        setCampaignState(
          result.ok
            ? {
                state: 'playing',
                campaign: startCampaign(result.content, seedFromUrl(location.search)),
              }
            : { state: 'unloadable', problems: result.problems },
        );
      })
      .catch((reason: unknown) => {
        if (abandoned) return;
        // A content set that cannot be reached is a different failure from one
        // that will not load, and saying so beats sitting on "opening" forever.
        setCampaignState({ state: 'unreachable', why: String(reason) });
      });
    return () => {
      abandoned = true;
    };
  }, []);

  switch (campaignState.state) {
    case 'opening':
      return <Frame>Opening the campaign…</Frame>;

    case 'unreachable':
      return (
        <Frame>
          <Failure title="The content set could not be fetched." lines={[campaignState.why]} />
        </Frame>
      );

    case 'unloadable':
      return (
        <Frame>
          <Failure
            title="The content set will not load."
            lines={campaignState.problems.map(
              (problem) =>
                `${problem.where === '' ? 'the content set' : problem.where} — ${problem.what}`,
            )}
          />
        </Frame>
      );

    case 'playing': {
      const campaign = campaignState.campaign;
      const take = (command: Command) => {
        const result = takeCommand(campaign, command);
        if (isRejected(result)) {
          setRefusal(result.rejected.message);
          return;
        }
        setRefusal(null);
        setCampaignState({ state: 'playing', campaign: result.campaign });
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
  }
}

function Failure({ title, lines }: { readonly title: string; readonly lines: readonly string[] }) {
  return (
    <>
      <h2 className="text-lg text-rose-300">{title}</h2>
      <ul className="mt-3 space-y-1 font-mono text-sm text-rose-200">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </>
  );
}

function Frame({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-stone-950 text-stone-200">
      <main className="mx-auto max-w-2xl px-4 py-10">{children}</main>
    </div>
  );
}
