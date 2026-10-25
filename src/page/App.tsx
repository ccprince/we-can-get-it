import { useEffect, useState } from 'react';
import {
  identify,
  isRejected,
  startCampaign,
  takeCommand,
  view,
  type Campaign,
  type Command,
  type ContentSet,
  type Problem,
} from '../engine';
import { CampaignSurfaces } from './CampaignSurfaces';
import { fetchContent } from './content';
import { readSave, resume, writeSave, type Found, type Save } from './save';
import { seedAskedFor, seedFromUrl } from './seed';

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
  /**
   * A save was found and will not replay. It is shown and kept as it was: a
   * hand-played campaign is never discarded without the player saying so.
   */
  | {
      readonly state: 'unresumable';
      readonly content: ContentSet;
      readonly title: string;
      readonly why: string;
      readonly stored: string;
    }
  | {
      readonly state: 'playing';
      readonly content: ContentSet;
      readonly campaign: Campaign;
      readonly save: Save;
      /** Something about the save the player should hear, or null. */
      readonly notice: string | null;
    };

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
            ? opening(result.content, readSave())
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

    case 'unresumable': {
      const { content } = campaignState;
      return (
        <Frame>
          <Failure title={campaignState.title} lines={[campaignState.why]} />
          <p className="mt-6 text-sm text-stone-400">The save is kept as it was:</p>
          <pre className="mt-2 font-mono text-xs whitespace-pre-wrap text-stone-400">
            {campaignState.stored}
          </pre>
          <NewCampaign onStart={() => setCampaignState(newCampaign(content))} />
        </Frame>
      );
    }

    case 'playing': {
      const { content, campaign, save } = campaignState;
      const take = (command: Command) => {
        const result = takeCommand(campaign, command);
        if (isRejected(result)) {
          setRefusal(result.rejected.message);
          return;
        }
        setRefusal(null);
        // Written after each command, so a reload mid-campaign loses nothing.
        setCampaignState(
          saving(content, result.campaign, {
            content: save.content,
            seed: save.seed,
            commands: [...save.commands, command],
          }),
        );
      };

      return (
        <Frame>
          {campaignState.notice !== null && (
            <p className="mb-6 text-sm text-amber-300">{campaignState.notice}</p>
          )}
          <CampaignSurfaces
            view={view(campaign)}
            seed={campaign.seed}
            refusal={refusal}
            onCommand={take}
          />
          <NewCampaign
            onStart={() => {
              setRefusal(null);
              setCampaignState(newCampaign(content));
            }}
          />
        </Frame>
      );
    }
  }
}

const WILL_NOT_REPLAY = 'The saved campaign will not replay.';

/**
 * The campaign the page opens on: the save it found, replayed, or a new one when
 * there was nothing to find. Opening never starts a new campaign over a save.
 */
function opening(content: ContentSet, found: Found): CampaignState {
  switch (found.kind) {
    case 'none':
      return newCampaign(content);

    case 'not-a-save':
      return {
        state: 'unresumable',
        content,
        title: WILL_NOT_REPLAY,
        why: 'What is stored where the page keeps its save is not a save.',
        stored: found.stored,
      };

    case 'save': {
      const resumed = resume(content, found.save);
      if ('otherContent' in resumed) {
        return {
          state: 'unresumable',
          content,
          title: 'The saved campaign was played on a different content set.',
          why:
            'The content set has changed since this campaign was saved.' +
            ' Restoring the content set it was played on will resume it.',
          stored: found.stored,
        };
      }
      if ('rejected' in resumed) {
        return {
          state: 'unresumable',
          content,
          title: WILL_NOT_REPLAY,
          why:
            `The engine refused command ${resumed.at} of ${resumed.of}:` +
            ` ${resumed.rejected.message}`,
          stored: found.stored,
        };
      }
      const asked = seedAskedFor(location.search);
      return {
        state: 'playing',
        content,
        campaign: resumed.campaign,
        save: found.save,
        notice:
          asked === null || asked === found.save.seed
            ? null
            : `The saved campaign was resumed, so seed ${asked} was not started.` +
              ' Start a new campaign to play it.',
      };
    }
  }
}

/** A new campaign, saved at once so that what is stored is what is in play. */
function newCampaign(content: ContentSet): CampaignState {
  const seed = seedFromUrl(location.search);
  return saving(content, startCampaign(content, seed), {
    content: identify(content),
    seed,
    commands: [],
  });
}

/**
 * The campaign in play, with its save written: the one place a save is written,
 * so it is written after every command and whenever a campaign starts.
 */
function saving(content: ContentSet, campaign: Campaign, save: Save): CampaignState {
  return { state: 'playing', content, campaign, save, notice: writeSave(save) };
}

/**
 * Starting a new campaign saves over the one in progress, so it is asked for
 * twice: once to offer it, once to mean it. Whether the question is open is
 * view state.
 */
function NewCampaign({ onStart }: { readonly onStart: () => void }) {
  const [asking, setAsking] = useState(false);
  const button = 'rounded border border-stone-700 px-3 py-1.5 text-sm hover:border-stone-500';

  if (!asking) {
    return (
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setAsking(true)}
          className={`${button} text-stone-400`}
        >
          Start a new campaign
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 text-sm">
      <p className="text-amber-300">
        This ends the campaign in progress and saves over it, and it cannot be got back.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setAsking(false);
            onStart();
          }}
          className={`${button} text-rose-300`}
        >
          Start it
        </button>
        <button
          type="button"
          onClick={() => setAsking(false)}
          className={`${button} text-stone-200`}
        >
          Keep playing
        </button>
      </div>
    </div>
  );
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
