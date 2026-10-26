import { useState } from 'react';
import type { Command, LaneView, View } from '../engine';
import { buttonChrome } from './chrome';
import { Guide } from './Guide';
import { Hold, People, Shop } from './Trade';

/**
 * The campaign's reading surfaces. Everything shown here comes out of one
 * `view` call (ADR 0009 decision 10); this component decides nothing and only
 * words what the engine returned.
 *
 * Layout and keyboard map are deliberately unspecified in the canon: they are
 * settled by playing (CLAUDE.md). One long page grew too crowded to play, so
 * the surfaces are split the way the prototype split them: a header that is
 * always in view, and tabs for where the player is, the **chart** and the
 * **trade guide**. What the player can do belongs to where they are, so the
 * menu sits on that tab and not on the reference tabs. Which tab is open is
 * view state. Departing goes back to it, since in transit ending the day is
 * the whole of what the player does.
 */
type Tab = 'here' | 'chart' | 'guide';

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
  const [tab, setTab] = useState<Tab>('here');
  const tabs: readonly (readonly [Tab, string])[] = [
    ['here', 'Here'],
    ['chart', 'Chart'],
    ['guide', 'Trade guide'],
  ];

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-stone-700 bg-stone-950 pt-2 pb-4">
        <h1 className="text-xl text-stone-100">
          {view.here === null ? 'In transit' : view.here.name}
        </h1>
        <p className="mt-1 text-sm text-stone-400">
          {view.today.date.label} · {view.credits.credits} credits · hold {view.hold.used} of{' '}
          {view.hold.capacity}
        </p>
        {/* In the header, so a refusal is heard whichever tab the command came from. */}
        {refusal !== null && <p className="mt-2 text-rose-300">{refusal}</p>}
      </header>

      <div role="tablist" className="mt-4 flex gap-1 border-b border-stone-700">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={key === tab}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 text-sm ${
              key === tab
                ? 'border-b-2 border-stone-200 text-stone-100'
                : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={tabs.find(([key]) => key === tab)?.[1]}>
        {tab === 'here' && <Here view={view} onCommand={onCommand} />}
        {tab === 'chart' && (
          <Chart
            view={view}
            onCommand={(command) => {
              onCommand(command);
              setTab('here');
            }}
          />
        )}
        {tab === 'guide' && <Guide entries={view.guide.entries} />}
      </div>

      <footer className="mt-10 border-t border-stone-800 pt-3 font-mono text-xs text-stone-600">
        seed {seed}
      </footer>
    </>
  );
}

type SurfaceProps = { readonly view: View; readonly onCommand: (command: Command) => void };

/** Where the player is: the day's news, the place or the crossing, trade, and the menu. */
function Here({ view, onCommand }: SurfaceProps) {
  return (
    <>
      <Digest view={view} />

      {view.here !== null && (
        <p className="mt-6 leading-relaxed text-stone-300">{view.here.prose}</p>
      )}
      {view.transit !== null && (
        <p className="mt-6 leading-relaxed text-stone-300">
          {days(view.transit.daysOut, 'A day')} out of {view.transit.from}, bound for{' '}
          {view.transit.destination} with {days(view.transit.daysToRun, 'a day')} to run.
        </p>
      )}

      {view.here !== null && <Shop lots={view.here.lots} onCommand={onCommand} />}
      {view.here !== null && <People people={view.here.people} onCommand={onCommand} />}
      <Hold hold={view.hold} />

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
      </section>
    </>
  );
}

function Digest({ view }: { readonly view: View }) {
  return (
    <section className="mt-6">
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
  );
}

/**
 * The **chart**, read from where the player stands: the departures from here
 * first, then every place and the lanes that touch it. It carries the whole
 * galaxy and not only what leaves from here (ADR 0006 decision 5), so each lane
 * appears under both its ends.
 */
function Chart({ view, onCommand }: SurfaceProps) {
  const from = view.here?.name ?? null;
  return (
    <>
      <section className="mt-6">
        <h2 className="text-xs tracking-widest text-stone-500 uppercase">
          {from === null ? 'Departures' : `Departures from ${from}`}
        </h2>
        {from === null ? (
          <p className="mt-2 text-stone-500">There are no departures in transit.</p>
        ) : (
          <Departures
            lanes={view.chart.lanes.filter((lane) => lane.destination !== null)}
            onCommand={onCommand}
          />
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xs tracking-widest text-stone-500 uppercase">Every place</h2>
        {view.chart.lanes.length === 0 && (
          <p className="mt-2 text-stone-500">No lanes are charted.</p>
        )}
        <ul aria-label="Locations" className="mt-2 space-y-3">
          {view.chart.locations.map((location) => (
            <li key={location.name}>
              <p className="text-stone-200">
                {location.name}
                {location.name === from && <span className="text-stone-500"> — you are here</span>}
              </p>
              <ul
                aria-label={`Lanes from ${location.name}`}
                className="ml-4 text-sm text-stone-400"
              >
                {lanesAt(view, location.name).map((lane) => (
                  <li key={lane.ends.join('–')}>
                    to {otherEnd(lane, location.name)}: {days(lane.days, '1 day')}, {lane.fare}{' '}
                    credits
                    {!lane.withinRange && (
                      <>
                        {' — '}
                        <BeyondRange />
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/** The lanes that leave from here, which the engine marks by giving each a destination. */
function Departures({
  lanes,
  onCommand,
}: {
  readonly lanes: readonly LaneView[];
  readonly onCommand: (command: Command) => void;
}) {
  if (lanes.length === 0) return <p className="mt-2 text-stone-500">No lane leaves from here.</p>;
  return (
    <table className="mt-2 w-full text-left text-sm">
      <thead className="text-xs tracking-wide text-stone-500 uppercase">
        <tr>
          <th className="py-1 font-normal">To</th>
          <th className="py-1 text-right font-normal">Days</th>
          <th className="py-1 text-right font-normal">Fare</th>
          <th className="py-1 font-normal" />
        </tr>
      </thead>
      <tbody>
        {lanes.map((lane) => (
          <tr key={lane.ends.join('–')} className="border-t border-stone-800">
            <td className="py-1.5 text-stone-300">{lane.destination}</td>
            <td className="py-1.5 text-right text-stone-300">{days(lane.days, '1 day')}</td>
            <td className="py-1.5 text-right text-stone-300">{lane.fare}</td>
            <td className="py-1.5 pl-3">
              <Departure lane={lane} onCommand={onCommand} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * A departure's last column: the departure the engine offers along the lane, or
 * the reason there is none where the reason is the player's to act on.
 *
 * **Range** is the only gate on the map, and a lane beyond it says so rather
 * than vanishing: it is a wall with a price on it (ADR 0006 decisions 14, 20).
 * The whole-galaxy list says so too, wherever the lane sits, so what the ship
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
  if (!lane.withinRange) return <BeyondRange />;

  // Every lane here leaves from where the player stands, so within range the
  // engine offers a departure; the read model's type still allows none.
  const depart = lane.depart;
  if (depart === null) return null;

  return (
    <button type="button" onClick={() => onCommand(depart)} className={`${buttonChrome} px-2 py-1`}>
      Depart for {lane.destination}
    </button>
  );
}

function BeyondRange() {
  return <span className="text-stone-500">Beyond your range</span>;
}

function lanesAt(view: View, name: string): readonly LaneView[] {
  return view.chart.lanes.filter((lane) => lane.ends.includes(name));
}

function otherEnd(lane: LaneView, name: string): string {
  return lane.ends[0] === name ? lane.ends[1] : lane.ends[0];
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
