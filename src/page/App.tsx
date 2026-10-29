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
import { fetchContent, fetchManifest, setAskedFor } from './content';
import { readSave, resume, writeSave, type Found, type Save } from './save';
import { freshSeed, seedAskedFor, seedFromUrl } from './seed';

/**
 * The page holds only view state and renders read models handed to it by one
 * engine query (ADR 0009 decision 10). No rule is decided here: what is on
 * offer, what a day costs and what a date is called all come back from `view`.
 * What the page does is word them.
 */
type CampaignState =
  | { readonly state: 'opening' }
  /** The manifest is the one list of what the page plays: without it, nothing is attempted. */
  | { readonly state: 'no-manifest'; readonly why: string }
  | { readonly state: 'unreachable'; readonly why: string }
  | { readonly state: 'unloadable'; readonly problems: readonly Problem[] }
  /**
   * Nothing can be played as asked. A save that was found is shown and kept as
   * it was: a hand-played campaign is never discarded without the player saying
   * so. Without one, `stored` is null, and what is refused is the URL's set.
   */
  | {
      readonly state: 'refused';
      readonly title: string;
      readonly why: string;
      readonly stored: string | null;
    }
  | {
      readonly state: 'playing';
      readonly set: string;
      readonly content: ContentSet;
      readonly campaign: Campaign;
      readonly save: Save;
      /** Something about the save the player should hear, or null. */
      readonly notice: string | null;
    };

export function App() {
  const [campaignState, setCampaignState] = useState<CampaignState>({ state: 'opening' });
  const [sets, setSets] = useState<readonly string[]>([]);
  const [refusal, setRefusal] = useState<string | null>(null);

  useEffect(() => {
    let abandoned = false;
    void open().then(({ listed, next }) => {
      if (abandoned) return;
      setSets(listed);
      setCampaignState(next);
    });
    return () => {
      abandoned = true;
    };
  }, []);

  /**
   * A new campaign on the set the player chose. A set the page already holds is
   * started on at once; any other is fetched and loaded first, and shown as
   * what went wrong with it if it will not play.
   */
  const startOn = (set: string, seed: number, held: ContentSet | null) => {
    setRefusal(null);
    if (held !== null) {
      setCampaignState(newCampaign(set, held, seed));
      return;
    }
    void fetching(set).then((fetched) => {
      setCampaignState('content' in fetched ? newCampaign(set, fetched.content, seed) : fetched);
    });
  };

  /** What every failure offers: a new campaign on any listed set, so no failure is a dead end. */
  const anyOffer = (
    <NewCampaign
      sets={sets}
      current={null}
      seed={null}
      asked={seedAskedFor(location.search)}
      onStart={(set, seed) => startOn(set, seed, null)}
    />
  );

  switch (campaignState.state) {
    case 'opening':
      return <Frame>Opening the campaign…</Frame>;

    case 'no-manifest':
      return (
        <Frame>
          <Failure title="The list of content sets could not be had." lines={[campaignState.why]} />
        </Frame>
      );

    case 'unreachable':
      return (
        <Frame>
          <Failure title="The content set could not be fetched." lines={[campaignState.why]} />
          {anyOffer}
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
          {anyOffer}
        </Frame>
      );

    case 'refused':
      return (
        <Frame>
          <Failure title={campaignState.title} lines={[campaignState.why]} />
          {campaignState.stored !== null && (
            <>
              <p className="mt-6 text-sm text-stone-400">The save is kept as it was:</p>
              <pre className="mt-2 font-mono text-xs whitespace-pre-wrap text-stone-400">
                {campaignState.stored}
              </pre>
            </>
          )}
          {anyOffer}
        </Frame>
      );

    case 'playing': {
      const { set, content, campaign, save } = campaignState;
      const take = (command: Command) => {
        const result = takeCommand(campaign, command);
        if (isRejected(result)) {
          setRefusal(result.rejected.message);
          return;
        }
        setRefusal(null);
        // Written after each command, so a reload mid-campaign loses nothing.
        setCampaignState(
          saving(set, content, result.campaign, {
            set: save.set,
            identity: save.identity,
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
            sets={sets}
            current={set}
            seed={campaign.seed}
            asked={seedAskedFor(location.search)}
            onStart={(chosen, seed) => startOn(chosen, seed, chosen === set ? content : null)}
          />
        </Frame>
      );
    }
  }
}

const WILL_NOT_REPLAY = 'The saved campaign will not replay.';

/**
 * Open the page, in order: the manifest, the save, the set to fetch — the
 * save's if there is a save, else the one the URL names, else the first listed —
 * and then resume or start. What the manifest listed comes back with the state,
 * because the picker is made of it.
 */
async function open(): Promise<{ listed: readonly string[]; next: CampaignState }> {
  let listed: readonly string[];
  try {
    listed = await fetchManifest();
  } catch (reason) {
    return { listed: [], next: { state: 'no-manifest', why: String(reason) } };
  }

  const found = readSave();
  if (found.kind === 'not-a-save') {
    return {
      listed,
      next: refused(
        found.stored,
        WILL_NOT_REPLAY,
        'What is stored where the page keeps its save is not a save.',
      ),
    };
  }

  const asked = setAskedFor(location.search);
  const set = found.kind === 'save' ? found.save.set : (asked ?? listed[0]);
  if (set === undefined || !listed.includes(set)) {
    const stored = found.kind === 'save' ? found.stored : null;
    return {
      listed,
      next: refused(
        stored,
        found.kind === 'save'
          ? WILL_NOT_REPLAY
          : `The content set ${JSON.stringify(set)} is not one the page offers.`,
        found.kind === 'save'
          ? `The saved campaign was played on ${JSON.stringify(set)}, which is no longer offered.`
          : `The URL asks for it, and the sets on offer are ${listed.join(', ')}.`,
      ),
    };
  }

  const fetched = await fetching(set);
  if (!('content' in fetched)) {
    // A set a save names that cannot be had leaves the save as it is stored.
    return {
      listed,
      next:
        found.kind === 'save' && fetched.state === 'unreachable'
          ? refused(found.stored, WILL_NOT_REPLAY, fetched.why)
          : fetched,
    };
  }
  return {
    listed,
    next:
      found.kind === 'save'
        ? resuming(set, fetched.content, found, asked)
        : newCampaign(set, fetched.content, seedFromUrl(location.search)),
  };
}

/**
 * A set fetched and loaded, or what went wrong with it. A set that cannot be
 * reached is a different failure from one that will not load, and saying so
 * beats sitting on "opening" forever.
 */
async function fetching(
  set: string,
): Promise<
  | { readonly content: ContentSet }
  | (CampaignState & { readonly state: 'unreachable' | 'unloadable' })
> {
  try {
    const result = await fetchContent(set);
    return result.ok
      ? { content: result.content }
      : { state: 'unloadable', problems: result.problems };
  } catch (reason) {
    return { state: 'unreachable', why: String(reason) };
  }
}

/** The save that was found, replayed. Opening never starts a new campaign over a save. */
function resuming(
  set: string,
  content: ContentSet,
  found: Extract<Found, { kind: 'save' }>,
  asked: string | null,
): CampaignState {
  const resumed = resume(content, found.save);
  if ('otherContent' in resumed) {
    return refused(
      found.stored,
      'The saved campaign was played on a different content set.',
      'The content set has changed since this campaign was saved.' +
        ' Restoring the content set it was played on will resume it.',
    );
  }
  if ('problems' in resumed) return { state: 'unloadable', problems: resumed.problems };
  if ('rejected' in resumed) {
    return refused(
      found.stored,
      WILL_NOT_REPLAY,
      `The engine refused command ${resumed.at} of ${resumed.of}:` + ` ${resumed.rejected.message}`,
    );
  }
  const askedSeed = seedAskedFor(location.search);
  const notices = [
    askedSeed === null || askedSeed === found.save.seed ? null : `seed ${askedSeed}`,
    asked === null || asked === set ? null : `content set ${asked}`,
  ].filter((notice) => notice !== null);
  return {
    state: 'playing',
    set,
    content,
    campaign: resumed.campaign,
    save: found.save,
    notice:
      notices.length === 0
        ? null
        : `The saved campaign was resumed, so ${notices.join(' and ')} was not started.` +
          ' Start a new campaign to play it.',
  };
}

/** What cannot be played as asked: a save shown and kept as stored, or a URL's set. */
function refused(stored: string | null, title: string, why: string): CampaignState {
  return { state: 'refused', title, why, stored };
}

/**
 * A new campaign, saved at once so that what is stored is what is in play. A
 * draw that fails is a content set that will not load, and is shown as one.
 */
function newCampaign(set: string, content: ContentSet, seed: number): CampaignState {
  const opened = startCampaign(content, seed);
  if (!opened.ok) return { state: 'unloadable', problems: opened.problems };
  return saving(set, content, opened.campaign, {
    set,
    identity: identify(content),
    seed,
    commands: [],
  });
}

/**
 * The campaign in play, with its save written: the one place a save is written,
 * so it is written after every command and whenever a campaign starts.
 */
function saving(set: string, content: ContentSet, campaign: Campaign, save: Save): CampaignState {
  return { state: 'playing', set, content, campaign, save, notice: writeSave(save) };
}

/**
 * Starting a new campaign saves over the one in progress, so it is asked for
 * twice: once to offer it, once to mean it, and meaning it is a choice of seed:
 * the one in play, the one the URL asks for, or a fresh one, and on a content set
 * when the manifest lists more than one. Whether the question is open is
 * view state.
 */
function NewCampaign({
  sets,
  current,
  seed,
  asked,
  onStart,
}: {
  readonly sets: readonly string[];
  /** The set in play, which the picker opens on, or null when none is. */
  readonly current: string | null;
  readonly seed: number | null;
  readonly asked: number | null;
  readonly onStart: (set: string, seed: number) => void;
}) {
  const [asking, setAsking] = useState(false);
  const [chosen, setChosen] = useState(current ?? sets[0] ?? '');
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
      {sets.length >= 2 && (
        <label className="mt-2 block text-stone-400">
          Content set{' '}
          <select
            value={chosen}
            onChange={(event) => setChosen(event.target.value)}
            className="rounded border border-stone-700 bg-stone-950 px-2 py-1 text-stone-200"
          >
            {sets.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="mt-2 flex gap-2">
        {seed !== null && (
          <button
            type="button"
            onClick={() => {
              setAsking(false);
              onStart(chosen, seed);
            }}
            className={`${button} text-rose-300`}
          >
            Start over on seed {seed}
          </button>
        )}
        {asked !== null && asked !== seed && (
          <button
            type="button"
            onClick={() => {
              setAsking(false);
              onStart(chosen, asked);
            }}
            className={`${button} text-rose-300`}
          >
            Start on seed {asked}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setAsking(false);
            onStart(chosen, freshSeed());
          }}
          className={`${button} text-rose-300`}
        >
          Start on a new seed
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
