import type { Command, LaneView, View } from '../engine';
import { buttonChrome } from './chrome';
import { Hold, People, Shop } from './Trade';

/**
 * The campaign's reading surfaces. Everything shown here comes out of one
 * `view` call (ADR 0009 decision 10); this component decides nothing and only
 * words what the engine returned.
 *
 * Layout and keyboard map are deliberately unspecified in the canon: they are
 * settled by playing (CLAUDE.md), so this is the plainest arrangement that
 * shows where the player is, the day, their credits, what is on sale, the
 * hold, the digest and what they can do.
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
          {days(view.transit.daysOut, 'A day')} out of {view.transit.from}, bound for{' '}
          {view.transit.destination} with {days(view.transit.daysToRun, 'a day')} to run.
        </p>
      )}

      {view.here !== null && <Shop lots={view.here.lots} onCommand={onCommand} />}
      {view.here !== null && <People people={view.here.people} onCommand={onCommand} />}
      <Hold hold={view.hold} />

      <section className="mt-8">
        <h2 className="text-xs tracking-widest text-stone-500 uppercase">The chart</h2>
        <ul aria-label="Locations" className="mt-2 flex flex-wrap gap-x-4 text-sm text-stone-300">
          {view.chart.locations.map((location) => (
            <li key={location.name}>{location.name}</li>
          ))}
        </ul>
        {view.chart.lanes.length === 0 ? (
          <p className="mt-2 text-stone-500">No lanes are charted.</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-xs tracking-wide text-stone-500 uppercase">
              <tr>
                <th className="py-1 font-normal">Lane</th>
                <th className="py-1 text-right font-normal">Days</th>
                <th className="py-1 text-right font-normal">Fare</th>
                <th className="py-1 font-normal" />
              </tr>
            </thead>
            <tbody>
              {view.chart.lanes.map((lane) => (
                <tr key={lane.ends.join('–')} className="border-t border-stone-800">
                  <td className="py-1.5 text-stone-300">
                    {lane.ends[0]} – {lane.ends[1]}
                  </td>
                  <td className="py-1.5 text-right text-stone-300">{days(lane.days, '1 day')}</td>
                  <td className="py-1.5 text-right text-stone-300">{lane.fare}</td>
                  <td className="py-1.5 pl-3">
                    <Departure lane={lane} onCommand={onCommand} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

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
              className={`${buttonChrome} px-3 py-1.5`}
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

/**
 * A lane's last column: the departure the engine offers along it, or the reason
 * there is none where the reason is the player's to act on.
 *
 * **Range** is the only gate on the map, and a lane beyond it says so rather
 * than vanishing: it is a wall with a price on it (ADR 0006 decisions 14, 20).
 * It says so wherever the lane sits on the chart, which carries the whole
 * galaxy and not only what leaves from here (decision 5) — so what the ship
 * cannot reach is readable before the player is standing at its near end, and
 * in **transit** as well, where only the departures go away.
 */
function Departure({
  lane,
  onCommand,
}: {
  readonly lane: LaneView;
  readonly onCommand: (command: Command) => void;
}) {
  if (!lane.withinRange) return <span className="text-stone-500">Beyond your range</span>;

  // Within range, but no departure along it from where the player stands: a
  // lane that does not leave from here, or any lane at all while underway.
  const depart = lane.depart;
  if (depart === null) return null;

  return (
    <button type="button" onClick={() => onCommand(depart)} className={`${buttonChrome} px-2 py-1`}>
      Depart for {lane.destination}
    </button>
  );
}

/**
 * A count of days, worded. The singular reads differently in each place it
 * lands — mid-sentence, or opening one — so the caller says which it wants.
 */
function days(count: number, one: string): string {
  return count === 1 ? one : `${count} days`;
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

    // A buy is worded in the shop, beside the lot it names; the menu never
    // carries one, since trade is not an action (ADR 0005 decision 6).
    case 'buy':
      return 'Buy';

    // A sale is worded under the want it answers, beside the tier and the offer.
    case 'sell':
      return 'Sell';
  }
}
