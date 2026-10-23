import type { Command, View } from '../engine';

/**
 * The campaign's reading surfaces. Everything shown here comes out of one
 * `view` call (ADR 0009 decision 10); this component decides nothing and only
 * words what the engine returned.
 *
 * Layout and keyboard map are deliberately unspecified in the canon: they are
 * settled by playing (CLAUDE.md), so this is the plainest arrangement that
 * shows where the player is, the day, their credits, the digest and what they
 * can do.
 */
export function CampaignSurfaces({
  view,
  seed,
  refusal,
  onCommand,
}: {
  readonly view: View;
  readonly seed: number;
  readonly refusal: string | null;
  readonly onCommand: (command: Command) => void;
}) {
  return (
    <>
      <header className="border-b border-stone-700 pb-4">
        <h1 className="text-xl text-stone-100">
          {view.here === null ? 'In transit' : view.here.name}
        </h1>
        <p className="mt-1 text-sm text-stone-400">
          {view.today.date.label} · {view.credits.credits} credits
        </p>
      </header>

      {view.here !== null && (
        <p className="mt-4 leading-relaxed text-stone-300">{view.here.prose}</p>
      )}
      {view.transit !== null && (
        <p className="mt-4 leading-relaxed text-stone-300">
          {view.transit.daysOut === 1 ? 'A day' : `${view.transit.daysOut} days`} out of{' '}
          {view.transit.from}, bound for {view.transit.destination} with{' '}
          {view.transit.daysToRun === 1 ? 'a day' : `${view.transit.daysToRun} days`} to run.
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-xs tracking-widest text-stone-500 uppercase">Digest</h2>
        {view.digest === null ? (
          <p className="mt-2 text-stone-500">The day has not ended yet.</p>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-stone-400">{view.digest.date.label}</p>
            {view.digest.entries.length === 0 ? (
              <p className="mt-1 text-stone-500">Nothing reached you.</p>
            ) : (
              <ul className="mt-1 space-y-1 text-stone-300">
                {view.digest.entries.map((entry) => (
                  <li key={entry.text}>{entry.text}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xs tracking-widest text-stone-500 uppercase">What you can do</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {view.menu.offered.map((command) => (
            <button
              key={command.kind}
              type="button"
              onClick={() => onCommand(command)}
              className="rounded border border-stone-600 px-3 py-1.5 text-stone-200 hover:border-stone-400 hover:bg-stone-800"
            >
              {wordCommand(command)}
            </button>
          ))}
        </div>
        {refusal !== null && <p className="mt-3 text-rose-300">{refusal}</p>}
      </section>

      <footer className="mt-10 border-t border-stone-800 pt-3 font-mono text-xs text-stone-600">
        seed {seed}
      </footer>
    </>
  );
}

/** The view words what the engine returns (ADR 0003 decision 4). */
function wordCommand(command: Command): string {
  switch (command.kind) {
    case 'wait':
      return 'End the day';

    // A departure is worded on the chart, where the lane is named and its days
    // and fare are read beside it; the menu never carries one (#9).
    case 'depart':
      return 'Depart';
  }
}
